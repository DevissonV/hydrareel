import { Controller, Get, Header } from '@nestjs/common';

const html = String.raw`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>HydraReel</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#f5f7fb;background:#0b0d12}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 20% 0,#1c2440 0,#0b0d12 42%)}main{max-width:1050px;margin:auto;padding:56px 22px 80px}.hero{text-align:center;padding:42px 0}.brand{font-size:clamp(42px,8vw,76px);font-weight:900;letter-spacing:-.06em}.tag{color:#a9b0c0;font-size:20px;margin:12px 0 32px}.panel{background:#121620;border:1px solid #252b38;border-radius:22px;padding:26px;box-shadow:0 20px 60px #0006}.pick{display:inline-flex;padding:14px 22px;border-radius:13px;background:#eef2ff;color:#111827;font-weight:800;cursor:pointer;border:0}.pick:disabled{opacity:.5}.fine{color:#798294;font-size:13px;margin-top:14px}.status{margin:22px 0 4px;font-weight:700}.bar{height:8px;background:#252b38;border-radius:999px;overflow:hidden;margin-top:10px}.bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#92a7ff,#d0a6ff);transition:.35s}.clips{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-top:28px}.card{background:#121620;border:1px solid #252b38;border-radius:18px;padding:14px}video{width:100%;aspect-ratio:9/16;background:#000;border-radius:12px}.score{font-weight:800}.reason{color:#a9b0c0;font-size:14px;min-height:42px}.download{display:block;text-align:center;text-decoration:none;color:#111827;background:#eef2ff;border-radius:10px;padding:11px;font-weight:800;margin-top:10px}.error{color:#ff9aa9;white-space:pre-wrap}
  </style>
</head>
<body><main><section class="hero"><div class="brand">HYDRAREEL</div><div class="tag">Convierte un video largo en clips verticales.</div></section>
<section class="panel"><input id="file" type="file" accept="video/mp4,video/quicktime,video/webm" hidden><button id="pick" class="pick">SELECCIONAR VIDEO</button><div class="fine">MP4, MOV o WEBM · máximo 30 min por defecto · un job a la vez</div><div id="status" class="status">Listo.</div><div class="bar"><i id="bar"></i></div><div id="error" class="error"></div></section><section id="clips" class="clips"></section><div class="fine" style="text-align:center;margin-top:28px">Procesa únicamente contenido propio o que tengas derecho a utilizar.</div></main>
<script>
const input=document.getElementById('file'),pick=document.getElementById('pick'),statusEl=document.getElementById('status'),bar=document.getElementById('bar'),clips=document.getElementById('clips'),err=document.getElementById('error');
const progress={UPLOADING:12,UPLOADED:24,TRANSCRIBING:42,ANALYZING:60,RENDERING:82,COMPLETED:100,FAILED:100};
function setStatus(s){statusEl.textContent=s;bar.style.width=(progress[s]||5)+'%'}
function render(job){clips.innerHTML='';for(const c of job.clips||[]){const el=document.createElement('article');el.className='card';el.innerHTML='<video controls preload="metadata" src="'+c.url+'"></video><h3></h3><div class="score"></div><p class="reason"></p><a class="download">DESCARGAR</a>';el.querySelector('h3').textContent=c.title;el.querySelector('.score').textContent=Math.round(c.durationSeconds)+'s · score heurístico '+c.score;el.querySelector('.reason').textContent=c.reason;const a=el.querySelector('a');a.href=c.url;a.download='clip-'+String(c.index).padStart(2,'0')+'.mp4';clips.appendChild(el)}}
async function poll(id){for(;;){await new Promise(r=>setTimeout(r,2500));const r=await fetch('/api/jobs/'+id);const j=await r.json();setStatus(j.status);if(j.status==='FAILED'){err.textContent=j.error||'Job falló';pick.disabled=false;return}if(j.status==='COMPLETED'){statusEl.textContent=(j.clipsGenerated||0)+' clips generados';render(j);pick.disabled=false;return}}}
pick.onclick=()=>input.click();input.onchange=async()=>{const f=input.files[0];if(!f)return;err.textContent='';clips.innerHTML='';pick.disabled=true;try{setStatus('UPLOADING');const r=await fetch('/api/jobs/upload-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:f.name,contentType:f.type||'application/octet-stream'})});if(!r.ok)throw new Error(await r.text());const u=await r.json();const put=await fetch(u.uploadUrl,{method:'PUT',headers:u.headers,body:f});if(!put.ok)throw new Error('Upload S3 falló: '+put.status);const p=await fetch('/api/jobs/'+u.jobId+'/uploaded',{method:'POST'});if(!p.ok)throw new Error(await p.text());setStatus('UPLOADED');await poll(u.jobId)}catch(e){err.textContent=e.message||String(e);pick.disabled=false}};
</script></body></html>`;

@Controller()
export class WebController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string { return html; }
}
