import { Controller, Get, Header } from '@nestjs/common';

const html = String.raw`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="theme-color" content="#070b16" />
  <title>HydraReel — Clips que impactan</title>
  <style>
    :root{
      font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      color:#f8f9ff;background:#070b16;color-scheme:dark;
      --bg:#070b16;--panel:rgba(15,21,39,.78);--line:rgba(145,161,209,.18);
      --muted:#939db8;--violet:#b04cff;--blue:#337cff;--cyan:#35d7ff;--green:#4de59b;
    }
    *{box-sizing:border-box}html{background:var(--bg)}body{margin:0;min-height:100vh;overflow-x:hidden;background:
      radial-gradient(circle at 15% -10%,rgba(67,91,255,.24),transparent 34%),
      radial-gradient(circle at 90% 20%,rgba(176,76,255,.16),transparent 32%),
      linear-gradient(180deg,#090e1d 0%,#060910 58%,#05070d 100%)}
    body:before{content:"";position:fixed;inset:auto -20% -22% -20%;height:38vh;pointer-events:none;background:
      radial-gradient(ellipse at center,rgba(65,81,255,.17),transparent 55%);filter:blur(28px)}
    button,a{font:inherit}.app{width:min(1120px,100%);margin:auto;padding:24px clamp(18px,4vw,42px) 64px}
    .topbar{display:flex;align-items:center;justify-content:space-between;padding:6px 0 30px}
    .brand{display:flex;align-items:center;gap:12px;font-weight:950;letter-spacing:.08em;font-size:20px}
    .brand b{background:linear-gradient(100deg,#fff 10%,#c3c9ff 45%,#d15cff 80%);-webkit-background-clip:text;color:transparent}
    .logo{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(145deg,#cb55ff,#2d7dff);box-shadow:0 0 30px #674dff66;transform:rotate(-8deg)}
    .logo:after{content:"";width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:11px solid white;margin-left:3px}
    .status-pill{font-size:12px;color:#bac4dd;border:1px solid var(--line);background:#11172a99;border-radius:999px;padding:8px 11px}
    section[hidden]{display:none!important}
    .hero{display:grid;grid-template-columns:1.05fr .95fr;gap:42px;align-items:center;min-height:620px}
    .eyebrow{display:inline-flex;gap:8px;align-items:center;border:1px solid #7383d633;background:#101936aa;border-radius:999px;padding:8px 12px;color:#b7c5ff;font-size:13px;font-weight:750}
    h1{font-size:clamp(50px,7.5vw,88px);line-height:.94;letter-spacing:-.065em;margin:20px 0 22px;max-width:780px}
    h1 .grad{background:linear-gradient(100deg,#b9bfff,#d45bff);-webkit-background-clip:text;color:transparent}
    .lead{color:#a9b3ca;font-size:clamp(17px,2vw,21px);line-height:1.55;max-width:640px}
    .chips{display:flex;gap:9px;flex-wrap:wrap;margin:26px 0}.chip{display:inline-flex;gap:8px;align-items:center;padding:9px 12px;border-radius:999px;background:#111a31;border:1px solid #6d7ab027;color:#dce3f7;font-size:13px;font-weight:720}
    .upload-card,.process-card,.result-card,.trust{background:linear-gradient(155deg,rgba(20,28,51,.9),rgba(10,15,30,.92));border:1px solid var(--line);box-shadow:0 28px 80px #0008,inset 0 1px 0 #ffffff08}
    .upload-card{border-radius:30px;padding:22px;position:relative;overflow:hidden}
    .upload-card:before{content:"";position:absolute;width:260px;height:260px;border-radius:50%;background:#644cff30;filter:blur(45px);right:-110px;top:-110px}
    .visual{height:340px;border-radius:22px;border:1px solid #7683d02b;background:
      radial-gradient(circle at 50% 38%,#805dff38,transparent 32%),
      linear-gradient(160deg,#101937,#080c18 62%);position:relative;overflow:hidden;display:grid;place-items:center}
    .visual:before,.visual:after{content:"";position:absolute;width:130%;height:90px;border-radius:50%;border-top:1px solid #6a74ff99;filter:blur(.1px);transform:rotate(-8deg)}
    .visual:before{bottom:32px;left:-20%;box-shadow:0 -8px 40px #315cff66}.visual:after{bottom:4px;left:-2%;border-color:#bf55ff88}
    .play-glass{width:130px;height:130px;border-radius:31px;display:grid;place-items:center;background:linear-gradient(145deg,#7f5dff40,#1e3fae30);border:1px solid #c9cfff7a;backdrop-filter:blur(18px);box-shadow:0 18px 60px #4e59ff6b,inset 0 0 30px #ffffff16;z-index:1}
    .play-glass:after{content:"";width:0;height:0;border-top:22px solid transparent;border-bottom:22px solid transparent;border-left:34px solid white;margin-left:9px;filter:drop-shadow(0 0 12px #ae6cff)}
    .primary{width:100%;border:0;border-radius:17px;padding:17px 20px;color:#fff;font-weight:900;font-size:16px;cursor:pointer;background:linear-gradient(105deg,#c348f5,#555cff 48%,#168bff);box-shadow:0 10px 32px #674dff48,0 0 0 1px #ffffff26 inset;transition:.18s transform,.18s filter}
    .primary:hover{transform:translateY(-1px);filter:brightness(1.08)}.primary:disabled{opacity:.5;cursor:default;transform:none}
    .file-trigger{position:relative;display:flex;align-items:center;justify-content:center;margin-top:16px;overflow:hidden;user-select:none;-webkit-user-select:none}
    .native-file{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:100px}
    .file-trigger.busy{opacity:.5;pointer-events:none}
    .helper{text-align:center;color:#7f8ba5;font-size:12px;margin-top:12px}.trust{margin-top:13px;border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:center;color:#9ba7c0;font-size:12px}.shield{width:34px;height:34px;border-radius:12px;background:#334cff22;color:#9bb2ff;display:grid;place-items:center;font-size:18px}
    .process-wrap{max-width:720px;margin:32px auto}.section-title{text-align:center;font-size:30px;margin:14px 0 6px;letter-spacing:-.03em}.section-sub{text-align:center;color:var(--muted);margin:0 0 26px}
    .process-card{border-radius:30px;padding:24px}.file-orbit{min-height:235px;border-radius:24px;border:1px solid #6573c02d;background:radial-gradient(circle at 50% 30%,#774dff32,transparent 38%),#0c1327;display:grid;place-items:center;text-align:center;padding:22px}
    .ring{--p:10;width:122px;height:122px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(from 180deg,var(--cyan) 0 calc(var(--p)*1%),var(--violet) calc(var(--p)*1%) calc(var(--p)*1% + 8%),#222c4c 0);position:relative;box-shadow:0 0 35px #6c50ff3d}
    .ring:after{content:"";position:absolute;inset:10px;border-radius:50%;background:#0a1020}.ring strong{z-index:1;font-size:26px}
    .filename{font-weight:850;margin-top:13px}.upload-meta{font-size:12px;color:#8792ad;margin-top:5px}
    .steps{margin-top:25px;display:grid;gap:6px}.step{display:grid;grid-template-columns:34px 1fr auto;gap:11px;align-items:center;padding:11px 8px;color:#69758f}.step .dot{width:28px;height:28px;border-radius:50%;border:2px solid #344364;display:grid;place-items:center}.step b{display:block;color:#74809a}.step small{color:#65708a}.step.active{color:#cfc7ff}.step.active .dot{border-color:#a75cff;box-shadow:0 0 18px #a15aff66}.step.active b{color:#fff}.step.done .dot{background:linear-gradient(145deg,#9a55ff,#556cff);border:0;color:#fff}.step.done b{color:#e8ebf6}
    .results{max-width:980px;margin:22px auto}.result-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px}.result-head h2{font-size:36px;letter-spacing:-.045em;margin:0}.result-head p{margin:7px 0 0;color:var(--muted)}
    .clips{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:22px}.result-card{border-radius:25px;padding:13px;overflow:hidden}.video-shell{position:relative;border-radius:19px;overflow:hidden;background:#000;box-shadow:0 15px 45px #0008}.video-shell video{display:block;width:100%;aspect-ratio:9/16;background:#000}.badge{position:absolute;top:12px;padding:7px 9px;border-radius:10px;background:#090c14bb;border:1px solid #ffffff22;backdrop-filter:blur(8px);font-size:11px;font-weight:850;z-index:2}.badge.left{left:12px}.badge.right{right:12px}
    .details{padding:16px 7px 7px}.title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.details h3{font-size:20px;line-height:1.15;margin:0;letter-spacing:-.025em}.score-badge{flex:none;border:1px solid #426aff44;background:#111a33;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800}.score-badge em{font-style:normal;color:var(--green)}
    .meta-row{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0}.meta{border:1px solid #54617d3d;border-radius:999px;background:#0d1427;padding:7px 9px;color:#c5cde0;font-size:11px;font-weight:720}.why{border-top:1px solid var(--line);padding-top:13px}.why b{font-size:12px}.why p{color:#929db5;font-size:13px;line-height:1.5;margin:7px 0 14px}.download{text-decoration:none;display:block;text-align:center}
    .secondary{margin-top:9px;width:100%;background:#0c1426;border:1px solid #5361814d;color:#e7eaf5;border-radius:15px;padding:14px;font-weight:800;cursor:pointer}
    .error{margin:18px auto 0;max-width:720px;background:#35151f;border:1px solid #ff6d8a42;color:#ffa9b9;border-radius:16px;padding:13px 15px;white-space:pre-wrap}.footer{text-align:center;color:#626e88;font-size:12px;margin-top:48px}
    @media(max-width:820px){.app{padding-top:16px}.topbar{padding-bottom:15px}.status-pill{display:none}.hero{grid-template-columns:1fr;min-height:auto;gap:24px}.hero-copy{padding-top:18px}h1{font-size:clamp(46px,14vw,68px)}.lead{font-size:17px}.visual{height:270px}.play-glass{width:105px;height:105px}.result-head{align-items:flex-start;flex-direction:column}.result-head h2{font-size:30px}}
  </style>
</head>
<body>
  <main class="app">
    <header class="topbar">
      <div class="brand"><span class="logo"></span><b>HYDRAREEL</b></div>
      <span class="status-pill">AI CLIP STUDIO · MVP</span>
    </header>

    <section id="home" class="hero">
      <div class="hero-copy">
        <span class="eyebrow">✦ IA editorial + cortes naturales</span>
        <h1>Convierte videos largos en clips que <span class="grad">sí impactan.</span></h1>
        <p class="lead">HydraReel encuentra los momentos que valen la pena, valida que cada idea tenga sentido y los convierte en clips verticales listos para compartir.</p>
        <div class="chips"><span class="chip">⚡ Automático</span><span class="chip">◷ Rápido</span><span class="chip">✦ Calidad creator</span></div>
      </div>
      <div>
        <div class="upload-card">
          <div class="visual"><div class="play-glass"></div></div>
          <label id="pick" class="primary file-trigger">
            <span>⇧ &nbsp; Seleccionar video &nbsp; →</span>
            <input id="file" class="native-file" type="file" accept="video/*,.mp4,.mov,.webm">
          </label>
          <div class="helper">MP4, MOV o WEBM · máximo 30 min · un job a la vez</div>
        </div>
        <div class="trust"><span class="shield">✓</span><span><b style="color:#d8dff0">Tu archivo va directo a almacenamiento privado.</b><br>HydraReel procesa únicamente el contenido que tú subes.</span></div>
      </div>
    </section>

    <section id="processing" hidden class="process-wrap">
      <h2 class="section-title">Procesando video</h2>
      <p class="section-sub">Buscando momentos completos, cortes naturales y una edición limpia.</p>
      <div class="process-card">
        <div class="file-orbit">
          <div class="ring" id="ring"><strong id="percent">0%</strong></div>
          <div class="filename" id="filename">VIDEO.MP4</div>
          <div class="upload-meta" id="uploadMeta">Preparando archivo…</div>
        </div>
        <div class="steps">
          <div class="step" data-state="UPLOADING"><span class="dot">1</span><span><b>Subiendo video</b><small>Enviando el archivo de forma segura</small></span><span></span></div>
          <div class="step" data-state="TRANSCRIBING"><span class="dot">2</span><span><b>Transcribiendo</b><small>Convirtiendo audio en texto con timestamps</small></span><span></span></div>
          <div class="step" data-state="ANALYZING"><span class="dot">3</span><span><b>Analizando + QA editorial</b><small>Validando que el clip empiece y termine con sentido</small></span><span></span></div>
          <div class="step" data-state="RENDERING"><span class="dot">4</span><span><b>Renderizando</b><small>Generando formato 9:16 y subtítulos creator-grade</small></span><span></span></div>
        </div>
      </div>
    </section>

    <section id="results" hidden class="results">
      <div class="result-head"><div><span class="eyebrow">🎉 LISTO</span><h2 style="margin-top:12px">Tu clip está listo</h2><p id="resultCopy">Encontramos un momento que vale la pena.</p></div><button id="again" class="secondary" style="width:auto;padding-inline:18px">↻ Crear otro</button></div>
      <div id="clips" class="clips"></div>
    </section>

    <div id="error" class="error" hidden></div>
    <div class="footer">Procesa únicamente contenido propio o que tengas derecho a utilizar.</div>
  </main>

<script>
const input=document.getElementById('file'),pick=document.getElementById('pick'),home=document.getElementById('home'),processing=document.getElementById('processing'),results=document.getElementById('results'),clips=document.getElementById('clips'),err=document.getElementById('error'),ring=document.getElementById('ring'),percent=document.getElementById('percent'),filenameEl=document.getElementById('filename'),uploadMeta=document.getElementById('uploadMeta'),resultCopy=document.getElementById('resultCopy'),again=document.getElementById('again');
const order=['UPLOADING','TRANSCRIBING','ANALYZING','RENDERING','COMPLETED'];
const pct={UPLOADING:12,UPLOADED:23,TRANSCRIBING:42,ANALYZING:67,RENDERING:86,COMPLETED:100,FAILED:100};
function show(section){home.hidden=section!=='home';processing.hidden=section!=='processing';results.hidden=section!=='results'}
function setProgress(state,value){const p=value??pct[state]??5;ring.style.setProperty('--p',p);percent.textContent=Math.round(p)+'%';const effective=state==='UPLOADED'?'TRANSCRIBING':state;const idx=order.indexOf(effective);document.querySelectorAll('.step').forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('done',i<idx);const dot=el.querySelector('.dot');if(i<idx)dot.textContent='✓'})}
function setPickerBusy(busy){pick.classList.toggle('busy',busy);input.disabled=busy}
function fail(message){err.hidden=false;err.textContent=message||'No pudimos completar el procesamiento.';setPickerBusy(false);show('home')}
function uploadWithProgress(url,headers,file){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',url);Object.entries(headers||{}).forEach(([k,v])=>xhr.setRequestHeader(k,v));xhr.upload.onprogress=e=>{if(e.lengthComputable){const p=Math.max(3,Math.round(e.loaded/e.total*18));setProgress('UPLOADING',p);uploadMeta.textContent=(e.loaded/1048576).toFixed(1)+' MB de '+(e.total/1048576).toFixed(1)+' MB'}};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Upload S3 falló: '+xhr.status));xhr.onerror=()=>reject(new Error('No se pudo subir el video'));xhr.send(file)})}
function addClip(c,total){const card=document.createElement('article');card.className='result-card';const shell=document.createElement('div');shell.className='video-shell';const video=document.createElement('video');video.controls=true;video.preload='metadata';video.src=c.url;const left=document.createElement('span');left.className='badge left';left.textContent='#'+c.index+' de '+total;const right=document.createElement('span');right.className='badge right';right.textContent=Math.round(c.durationSeconds)+'s';shell.append(video,left,right);const details=document.createElement('div');details.className='details';const titleRow=document.createElement('div');titleRow.className='title-row';const h=document.createElement('h3');h.textContent=c.title;const score=document.createElement('span');score.className='score-badge';score.innerHTML='Score <em>'+Math.round(c.score)+'</em>';titleRow.append(h,score);const meta=document.createElement('div');meta.className='meta-row';['◷ '+Math.round(c.durationSeconds)+'s','▣ 9:16','✦ Corte validado'].forEach(t=>{const m=document.createElement('span');m.className='meta';m.textContent=t;meta.appendChild(m)});const why=document.createElement('div');why.className='why';const wb=document.createElement('b');wb.textContent='✦ Por qué este clip';const wp=document.createElement('p');wp.textContent=c.reason;const a=document.createElement('a');a.className='primary download';a.href=c.url;a.download='hydrareel-clip-'+String(c.index).padStart(2,'0')+'.mp4';a.textContent='↓  Descargar clip  →';why.append(wb,wp,a);details.append(titleRow,meta,why);card.append(shell,details);clips.appendChild(card)}
function render(job){clips.innerHTML='';const list=job.clips||[];resultCopy.textContent=list.length===1?'Encontramos 1 momento con sentido completo.':'Encontramos '+list.length+' momentos con sentido completo.';list.forEach(c=>addClip(c,list.length));show('results')}
async function poll(id){for(;;){await new Promise(r=>setTimeout(r,2200));const r=await fetch('/api/jobs/'+id);const j=await r.json();setProgress(j.status);uploadMeta.textContent=j.status==='ANALYZING'?'La IA está revisando sentido, inicio y cierre…':j.status==='RENDERING'?'Aplicando formato vertical y subtítulos…':j.status;if(j.status==='FAILED'){fail(j.error||'Job falló');return}if(j.status==='COMPLETED'){render(j);setPickerBusy(false);return}}}
again.onclick=()=>{input.value='';err.hidden=true;setPickerBusy(false);show('home')};
input.addEventListener('change',async()=>{const f=input.files&&input.files[0];if(!f)return;err.hidden=true;setPickerBusy(true);filenameEl.textContent=f.name;show('processing');setProgress('UPLOADING',3);try{const r=await fetch('/api/jobs/upload-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:f.name,contentType:f.type||'application/octet-stream'})});if(!r.ok)throw new Error(await r.text());const u=await r.json();await uploadWithProgress(u.uploadUrl,u.headers,f);setProgress('UPLOADED',22);const p=await fetch('/api/jobs/'+u.jobId+'/uploaded',{method:'POST'});if(!p.ok)throw new Error(await p.text());await poll(u.jobId)}catch(e){fail(e.message||String(e))}});
</script>
</body>
</html>`;

@Controller()
export class WebController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string { return html; }
}
