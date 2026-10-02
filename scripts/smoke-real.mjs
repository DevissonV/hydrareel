import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const base = (process.env.HYDRAREEL_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const source = process.env.SMOKE_SOURCE ?? path.resolve('fixtures/hydrareel-smoke-source.mp4');
const outDir = path.resolve('smoke-output');
mkdirSync(outDir, { recursive: true });

function probe(file) {
  const raw = execFileSync('ffprobe', ['-v','error','-show_streams','-show_format','-of','json',file], { encoding: 'utf8' });
  const j = JSON.parse(raw); const v=j.streams.find(s=>s.codec_type==='video'); const a=j.streams.find(s=>s.codec_type==='audio');
  return { duration:Number(j.format.duration), width:Number(v?.width), height:Number(v?.height), videoCodec:v?.codec_name, audioCodec:a?.codec_name };
}
function line(name, pass, detail='') { console.log(`${name}: ${pass?'PASS':'FAIL'}${detail?` (${detail})`:''}`); if(!pass) throw new Error(name); }
async function json(url, init) { const r=await fetch(url,init); const t=await r.text(); if(!r.ok) throw new Error(`${r.status} ${t}`); return t?JSON.parse(t):{}; }

let failed=false;
try {
  const srcMeta=probe(source); line('SOURCE_VIDEO', srcMeta.duration>0, `${srcMeta.duration.toFixed(2)}s`);
  const create=await json(`${base}/api/jobs/upload-url`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:path.basename(source),contentType:'video/mp4'})});
  const bytes=readFileSync(source); const put=await fetch(create.uploadUrl,{method:'PUT',headers:create.headers,body:bytes}); line('UPLOAD_S3',put.ok,String(put.status));
  line('FFPROBE',srcMeta.videoCodec==='h264' && Boolean(srcMeta.audioCodec),`${srcMeta.width}x${srcMeta.height}`);
  await json(`${base}/api/jobs/${create.jobId}/uploaded`,{method:'POST'});
  let job; const deadline=Date.now()+20*60*1000;
  while(Date.now()<deadline){ await new Promise(r=>setTimeout(r,3000)); job=await json(`${base}/api/jobs/${create.jobId}`); process.stdout.write(`\rJOB_STATUS: ${job.status}   `); if(job.status==='COMPLETED'||job.status==='FAILED') break; }
  console.log('');
  if(!job||job.status!=='COMPLETED') throw new Error(`Job final: ${job?.status}; ${job?.error??'timeout'}`);
  line('TRANSCRIPTION_REAL',job.timings?.transcriptionDurationMs>0);
  line('CLIP_SELECTION_REAL',job.timings?.analysisDurationMs>0);
  line('FFMPEG_RENDER',job.timings?.renderDurationMs>0);
  line('CLIPS_CREATED',job.clips?.length===3,String(job.clips?.length));
  let captions=true, downloadable=true;
  for(const clip of job.clips){
    const r=await fetch(clip.url); if(!r.ok){downloadable=false;continue;} const file=path.join(outDir,`clip-${String(clip.index).padStart(2,'0')}.mp4`); writeFileSync(file,Buffer.from(await r.arrayBuffer())); const m=probe(file);
    if(!(m.width===1080&&m.height===1920&&m.videoCodec==='h264'&&m.audioCodec==='aac')) throw new Error(`Clip ${clip.index} media contract failed: ${JSON.stringify(m)}`);
    if(!(clip.captionCueCount>0)) captions=false;
  }
  line('CAPTIONS',captions);
  line('DOWNLOADABLE',downloadable);
  console.log('HYDRAREEL_MVP_E2E: PASS');
} catch(e) { failed=true; console.error(`SMOKE_ERROR: ${e instanceof Error?e.message:String(e)}`); console.log('HYDRAREEL_MVP_E2E: FAIL'); }
if(failed) process.exitCode=1;
