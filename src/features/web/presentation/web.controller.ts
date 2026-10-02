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
    .nav-actions{display:flex;gap:8px;align-items:center}.nav-btn{border:1px solid var(--line);background:#10172a;color:#cbd4ea;border-radius:12px;padding:9px 12px;font-weight:800;cursor:pointer}.nav-btn.active{background:linear-gradient(105deg,#713cf0,#315fff);color:#fff;border-color:#8b79ff55}
    .library{max-width:1040px;margin:18px auto}.library-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}.project-card{background:linear-gradient(155deg,rgba(20,28,51,.94),rgba(9,14,28,.96));border:1px solid var(--line);border-radius:18px;padding:10px;box-shadow:0 16px 42px #0005;min-width:0}.project-preview{position:relative;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 18%,#694dff38,transparent 36%),#070b14;aspect-ratio:9/12;border:1px solid #7280c128}.project-preview video{width:100%;height:100%;object-fit:cover;display:block;background:#05070d}.project-preview:after{content:"";position:absolute;inset:auto 0 0;height:40%;background:linear-gradient(transparent,#050811dd);pointer-events:none}.library-count{position:absolute;right:8px;top:8px;z-index:2;border:1px solid #ffffff22;background:#070a13cc;backdrop-filter:blur(8px);border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900}.project-body{padding:10px 3px 2px}.project-name{font-size:14px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.015em}.project-meta{color:#7f8ba6;font-size:10px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.project-actions{display:grid;grid-template-columns:1fr 38px;gap:7px;margin-top:10px}.view-project{border:1px solid #6270b44d;background:#101a34;color:#edf1ff;border-radius:11px;padding:9px 10px;font-size:11px;font-weight:900;cursor:pointer}.danger{border:1px solid #ff6f8b4a;background:#2a111a;color:#ff98ad;border-radius:11px;padding:8px;font-size:0;cursor:pointer}.danger:before{content:"⌫";font-size:15px}.empty{grid-column:1/-1;border:1px dashed #58668755;border-radius:22px;padding:36px;text-align:center;color:#8792ac;background:#0b1222}
    .helper{text-align:center;color:#7f8ba5;font-size:12px;margin-top:12px}.trust{margin-top:13px;border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:center;color:#9ba7c0;font-size:12px}.shield{width:34px;height:34px;border-radius:12px;background:#334cff22;color:#9bb2ff;display:grid;place-items:center;font-size:18px}
    .process-wrap{max-width:720px;margin:32px auto}.section-title{text-align:center;font-size:30px;margin:14px 0 6px;letter-spacing:-.03em}.section-sub{text-align:center;color:var(--muted);margin:0 0 26px}
    .process-card{border-radius:30px;padding:24px}.file-orbit{min-height:235px;border-radius:24px;border:1px solid #6573c02d;background:radial-gradient(circle at 50% 30%,#774dff32,transparent 38%),#0c1327;display:grid;place-items:center;text-align:center;padding:22px}
    .ring{--p:10;width:122px;height:122px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(from 180deg,var(--cyan) 0 calc(var(--p)*1%),var(--violet) calc(var(--p)*1%) calc(var(--p)*1% + 8%),#222c4c 0);position:relative;box-shadow:0 0 35px #6c50ff3d}
    .ring:after{content:"";position:absolute;inset:10px;border-radius:50%;background:#0a1020}.ring strong{z-index:1;font-size:26px}
    .filename{font-weight:850;margin-top:13px;max-width:100%;width:100%;padding:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}.upload-meta{font-size:12px;color:#8792ad;margin-top:5px;max-width:100%;line-height:1.45;text-align:center}.ios-note{margin-top:12px;padding:11px 13px;border-radius:14px;border:1px solid #5f6fa72e;background:#0c1428;color:#8f9ab5;font-size:12px;line-height:1.45;text-align:left}.ios-note b{color:#cdd5ea}
    .steps{margin-top:25px;display:grid;gap:6px}.step{display:grid;grid-template-columns:34px 1fr auto;gap:11px;align-items:center;padding:11px 8px;color:#69758f}.step .dot{width:28px;height:28px;border-radius:50%;border:2px solid #344364;display:grid;place-items:center}.step b{display:block;color:#74809a}.step small{color:#65708a}.step.active{color:#cfc7ff}.step.active .dot{border-color:#a75cff;box-shadow:0 0 18px #a15aff66}.step.active b{color:#fff}.step.done .dot{background:linear-gradient(145deg,#9a55ff,#556cff);border:0;color:#fff}.step.done b{color:#e8ebf6}
    .results{max-width:980px;margin:22px auto}.result-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px}.result-head h2{font-size:36px;letter-spacing:-.045em;margin:0}.result-head p{margin:7px 0 0;color:var(--muted)}
    .clips{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:22px}.result-card{border-radius:25px;padding:13px;overflow:hidden}.video-shell{position:relative;border-radius:19px;overflow:hidden;background:#000;box-shadow:0 15px 45px #0008}.video-shell video{display:block;width:100%;aspect-ratio:9/16;background:#000}.badge{position:absolute;top:12px;padding:7px 9px;border-radius:10px;background:#090c14bb;border:1px solid #ffffff22;backdrop-filter:blur(8px);font-size:11px;font-weight:850;z-index:2}.badge.left{left:12px}.badge.right{right:12px}
    .details{padding:16px 7px 7px}.title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.details h3{font-size:20px;line-height:1.15;margin:0;letter-spacing:-.025em}.score-badge{flex:none;border:1px solid #426aff44;background:#111a33;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800}.score-badge em{font-style:normal;color:var(--green)}
    .meta-row{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0}.meta{border:1px solid #54617d3d;border-radius:999px;background:#0d1427;padding:7px 9px;color:#c5cde0;font-size:11px;font-weight:720}.why{border-top:1px solid var(--line);padding-top:13px}.why b{font-size:12px}.why p{color:#929db5;font-size:13px;line-height:1.5;margin:7px 0 14px}.download{text-decoration:none;display:block;text-align:center}.publish-pack{margin:12px 0;border:1px solid #6e62ff35;background:linear-gradient(150deg,#111a33,#0b1020);border-radius:15px;padding:12px}.pack-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.pack-label{font-size:10px;font-weight:950;letter-spacing:.08em;color:#bca8ff}.copy-pack{border:1px solid #7784b83b;background:#17203a;color:#e9edfb;border-radius:9px;padding:6px 8px;font-size:10px;font-weight:850;cursor:pointer}.hook-line{font-size:13px;font-weight:900;line-height:1.35;margin-top:9px;color:#f1f3ff}.caption-copy{font-size:11px;line-height:1.45;color:#96a2bb;margin-top:7px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hashtags{font-size:10px;color:#7ea7ff;margin-top:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.clip-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}.clip-action{border:1px solid #5d6b9442;background:#0c1427;color:#dfe5f7;border-radius:11px;padding:9px 7px;font-size:10px;font-weight:900;cursor:pointer}.clip-action:hover{background:#131e39}.clip-action:disabled{opacity:.45;cursor:wait}
    .secondary{margin-top:9px;width:100%;background:#0c1426;border:1px solid #5361814d;color:#e7eaf5;border-radius:15px;padding:14px;font-weight:800;cursor:pointer}
    .error{margin:18px auto 0;max-width:720px;background:#35151f;border:1px solid #ff6d8a42;color:#ffa9b9;border-radius:16px;padding:13px 15px;white-space:pre-wrap}.footer{text-align:center;color:#626e88;font-size:12px;margin-top:48px}
    @media(max-width:820px){.app{padding:16px 14px 54px}.topbar{padding-bottom:15px}.status-pill{display:none}.hero{grid-template-columns:1fr;min-height:auto;gap:24px}.hero-copy{padding-top:18px}h1{font-size:clamp(46px,14vw,68px)}.lead{font-size:17px}.visual{height:270px}.play-glass{width:105px;height:105px}.result-head{align-items:flex-start;flex-direction:column}.result-head h2{font-size:30px}.library-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.project-card{padding:8px;border-radius:16px}.project-preview{border-radius:12px;aspect-ratio:9/11}.project-name{font-size:12px}.project-meta{font-size:9px}.project-actions{grid-template-columns:1fr 34px;gap:6px}.view-project{padding:8px 6px;font-size:10px}.nav-btn{padding:8px 10px;font-size:12px}.brand{font-size:17px;gap:9px}.logo{width:30px;height:30px}.library .result-head{margin-bottom:14px}}
  </style>
</head>
<body>
  <main class="app">
    <header class="topbar">
      <div class="brand"><span class="logo"></span><b>HYDRAREEL</b></div>
      <div class="nav-actions"><button id="navCreate" class="nav-btn active">Crear</button><button id="navLibrary" class="nav-btn">Mis clips</button></div>
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
          <div class="helper">MP4, MOV o WEBM · máximo 30 min · HydraReel genera tantos clips buenos como encuentre</div>
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

    <section id="library" hidden class="library">
      <div class="result-head"><div><span class="eyebrow">✦ BIBLIOTECA</span><h2 style="margin-top:12px">Mis clips</h2><p>Proyectos generados en este navegador.</p></div></div>
      <div id="libraryGrid" class="library-grid"></div>
    </section>

    <div id="error" class="error" hidden></div>
    <div class="footer">Procesa únicamente contenido propio o que tengas derecho a utilizar.</div>
  </main>

<script>
const input=document.getElementById('file'),pick=document.getElementById('pick'),home=document.getElementById('home'),processing=document.getElementById('processing'),results=document.getElementById('results'),library=document.getElementById('library'),libraryGrid=document.getElementById('libraryGrid'),clips=document.getElementById('clips'),err=document.getElementById('error'),ring=document.getElementById('ring'),percent=document.getElementById('percent'),filenameEl=document.getElementById('filename'),uploadMeta=document.getElementById('uploadMeta'),resultCopy=document.getElementById('resultCopy'),again=document.getElementById('again'),navCreate=document.getElementById('navCreate'),navLibrary=document.getElementById('navLibrary');
let pickerOpenedAt=0;
let pickerDeliveredFile=false;
let wakeLock=null;
let processingActive=false;
let activeResult=null;
const JOB_KEY='hydrareel-active-job';
const CLIENT_KEY='hydrareel-client-id';
function clientId(){let id=localStorage.getItem(CLIENT_KEY);if(!id){id=crypto.randomUUID();localStorage.setItem(CLIENT_KEY,id)}return id}

function formatEta(seconds){if(!Number.isFinite(seconds)||seconds<0)return '';const s=Math.ceil(seconds);const m=Math.floor(s/60);const r=s%60;return m?m+'m '+r+'s':r+'s'}
async function keepScreenAwake(){processingActive=true;if(!('wakeLock' in navigator)||document.visibilityState!=='visible')return;try{wakeLock=await navigator.wakeLock.request('screen')}catch{}}
async function releaseScreen(){processingActive=false;try{await wakeLock?.release()}catch{}wakeLock=null}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&processingActive&&!wakeLock)void keepScreenAwake()});
const order=['UPLOADING','TRANSCRIBING','ANALYZING','RENDERING','COMPLETED'];
const pct={UPLOADING:12,UPLOADED:23,TRANSCRIBING:42,ANALYZING:67,RENDERING:86,COMPLETED:100,FAILED:100};
function show(section){home.hidden=section!=='home';processing.hidden=section!=='processing';results.hidden=section!=='results';library.hidden=section!=='library';navCreate.classList.toggle('active',section==='home'||section==='processing'||section==='results');navLibrary.classList.toggle('active',section==='library')}
function setProgress(state,value){const p=value??pct[state]??5;ring.style.setProperty('--p',p);percent.textContent=Math.round(p)+'%';const effective=state==='UPLOADED'?'TRANSCRIBING':state;const idx=order.indexOf(effective);document.querySelectorAll('.step').forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('done',i<idx);const dot=el.querySelector('.dot');if(i<idx)dot.textContent='✓'})}
function setPickerBusy(busy){pick.classList.toggle('busy',busy);input.disabled=busy}
function fail(message){err.hidden=false;err.textContent=message||'No pudimos completar el procesamiento.';localStorage.removeItem(JOB_KEY);void releaseScreen();setPickerBusy(false);show('home')}
function uploadWithProgress(url,headers,file){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();const started=performance.now();xhr.open('PUT',url);Object.entries(headers||{}).forEach(([k,v])=>xhr.setRequestHeader(k,v));xhr.upload.onprogress=e=>{if(e.lengthComputable){const p=Math.max(3,Math.round(e.loaded/e.total*18));setProgress('UPLOADING',p);const elapsed=Math.max(.25,(performance.now()-started)/1000);const bytesPerSecond=e.loaded/elapsed;const speed=bytesPerSecond/1048576;const eta=bytesPerSecond>0?(e.total-e.loaded)/bytesPerSecond:NaN;uploadMeta.textContent=(e.loaded/1048576).toFixed(1)+' MB de '+(e.total/1048576).toFixed(1)+' MB · '+speed.toFixed(1)+' MB/s'+(Number.isFinite(eta)?' · ~'+formatEta(eta):'')}};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Upload S3 falló: '+xhr.status));xhr.onerror=()=>reject(new Error('La subida se interrumpió. Verifica tu conexión e intenta de nuevo.'));xhr.send(file)})}
function packText(c){const tags=(c.hashtags||[]).join(' ');return [c.socialCaption||'',tags].filter(Boolean).join('\n\n')}
async function copyPack(c,button){try{await navigator.clipboard.writeText(packText(c));const old=button.textContent;button.textContent='✓ Copiado';setTimeout(()=>button.textContent=old,1200)}catch{alert('No pudimos copiar el texto.')}}
async function regenerateClip(jobId,c,mode,button){if(!jobId){alert('Este clip aún no está disponible para regenerar.');return}const old=button.textContent;button.disabled=true;button.textContent='Generando…';try{const r=await fetch('/api/library/'+jobId+'/clips/'+c.index+'/regenerate',{method:'POST',headers:{'Content-Type':'application/json','x-hydra-client-id':clientId()},body:JSON.stringify({mode})});if(!r.ok)throw new Error(await r.text());const updated=await r.json();if(activeResult){const idx=activeResult.clips.findIndex(x=>x.index===c.index);if(idx>=0)activeResult.clips[idx]=updated;render(activeResult)}}catch(e){alert('No pudimos regenerar este clip. '+(e.message||''))}finally{button.disabled=false;button.textContent=old}}
function addClip(c,total,jobId){const card=document.createElement('article');card.className='result-card';const shell=document.createElement('div');shell.className='video-shell';const video=document.createElement('video');video.controls=true;video.preload='metadata';video.src=c.url;const left=document.createElement('span');left.className='badge left';left.textContent='#'+c.index+' de '+total;const right=document.createElement('span');right.className='badge right';right.textContent=Math.round(c.durationSeconds)+'s';shell.append(video,left,right);const details=document.createElement('div');details.className='details';const titleRow=document.createElement('div');titleRow.className='title-row';const h=document.createElement('h3');h.textContent=c.title;const score=document.createElement('span');score.className='score-badge';score.innerHTML='Score <em>'+Math.round(c.score)+'</em>';titleRow.append(h,score);const meta=document.createElement('div');meta.className='meta-row';['◷ '+Math.round(c.durationSeconds)+'s','▣ 9:16','✦ '+(c.framing==='subject-safe'?'Auto frame':'Vertical'),'Aa '+(c.captionStyle||'pulse')].forEach(t=>{const m=document.createElement('span');m.className='meta';m.textContent=t;meta.appendChild(m)});
const pack=document.createElement('div');pack.className='publish-pack';const packTop=document.createElement('div');packTop.className='pack-top';const packLabel=document.createElement('span');packLabel.className='pack-label';packLabel.textContent='LISTO PARA PUBLICAR';const copy=document.createElement('button');copy.className='copy-pack';copy.textContent='Copiar copy';copy.onclick=()=>copyPack(c,copy);packTop.append(packLabel,copy);const hook=document.createElement('div');hook.className='hook-line';hook.textContent='“'+(c.hook||c.title)+'”';const caption=document.createElement('div');caption.className='caption-copy';caption.textContent=c.socialCaption||c.reason;const tags=document.createElement('div');tags.className='hashtags';tags.textContent=(c.hashtags||[]).join(' ');pack.append(packTop,hook,caption,tags);
const actions=document.createElement('div');actions.className='clip-actions';[['Más corto','shorter'],['Más largo','longer'],['Otro corte','alternative'],['Cambiar estilo','restyle']].forEach(([label,mode])=>{const b=document.createElement('button');b.className='clip-action';b.textContent=label;b.onclick=()=>regenerateClip(jobId,c,mode,b);actions.appendChild(b)});
const why=document.createElement('div');why.className='why';const wb=document.createElement('b');wb.textContent='✦ Por qué este clip';const wp=document.createElement('p');wp.textContent=c.reason;const a=document.createElement('a');a.className='primary download';a.href=c.url;a.download='hydrareel-clip-'+String(c.index).padStart(2,'0')+'.mp4';a.textContent='↓  Descargar clip  →';why.append(wb,wp,a);details.append(titleRow,meta,pack,actions,why);card.append(shell,details);clips.appendChild(card)}
function render(job){activeResult={...job,clips:[...(job.clips||[])]};clips.innerHTML='';const list=activeResult.clips;resultCopy.textContent=list.length===1?'1 clip listo para publicar.':list.length+' clips listos para publicar.';list.forEach(c=>addClip(c,list.length,activeResult.id));show('results')}
async function poll(id){for(;;){await new Promise(r=>setTimeout(r,2200));const r=await fetch('/api/jobs/'+id);if(!r.ok){if(r.status===404){fail('El procesamiento anterior ya no está disponible. Vuelve a subir el video.');return}throw new Error('No pudimos consultar el estado del procesamiento')}const j=await r.json();setProgress(j.status);uploadMeta.textContent=j.status==='TRANSCRIBING'?'Transcribiendo el audio completo…':j.status==='ANALYZING'?'La IA está revisando sentido, inicio y cierre…':j.status==='RENDERING'?'Renderizando solo los mejores fragmentos…':j.status;if(j.status==='FAILED'){fail(j.error||'Job falló');return}if(j.status==='COMPLETED'){localStorage.removeItem(JOB_KEY);await releaseScreen();render(j);setPickerBusy(false);return}}}
async function handleSelectedFile(f){if(!f)return;pickerDeliveredFile=true;err.hidden=true;setPickerBusy(true);filenameEl.textContent=f.name;show('processing');setProgress('UPLOADING',3);void keepScreenAwake();const sizeMb=f.size/1048576;uploadMeta.textContent='Video recibido · '+sizeMb.toFixed(1)+' MB · preparando subida…';await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));try{const r=await fetch('/api/jobs/upload-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:f.name,contentType:f.type||'application/octet-stream',clientId:clientId()})});if(!r.ok)throw new Error(await r.text());const u=await r.json();await uploadWithProgress(u.uploadUrl,u.headers,f);setProgress('UPLOADED',22);uploadMeta.textContent='Upload completo · iniciando procesamiento…';localStorage.setItem(JOB_KEY,u.jobId);const p=await fetch('/api/jobs/'+u.jobId+'/uploaded',{method:'POST'});if(!p.ok)throw new Error(await p.text());await poll(u.jobId)}catch(e){fail(e.message||String(e))}}
again.onclick=()=>{input.value='';pickerDeliveredFile=false;err.hidden=true;localStorage.removeItem(JOB_KEY);void releaseScreen();setPickerBusy(false);show('home')};
input.addEventListener('click',()=>{pickerOpenedAt=Date.now();pickerDeliveredFile=false;err.hidden=true});
input.addEventListener('change',()=>handleSelectedFile(input.files&&input.files[0]));

function formatDate(value){try{return new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return value}}
function projectTitle(p){const raw=(p.originalFileName||'').replace(/\.[^.]+$/,'').trim();const ugly=/^[0-9a-f-]{24,}$/i.test(raw)||/^v?\d{10,}/i.test(raw);return ugly?(p.clips?.[0]?.title||'Proyecto HydraReel'):raw}
function openLibraryProject(p){render({id:p.id,clips:p.clips||[]})}
async function loadLibrary(){show('library');libraryGrid.innerHTML='<div class="empty">Cargando tus clips…</div>';try{const r=await fetch('/api/library',{headers:{'x-hydra-client-id':clientId()}});if(!r.ok)throw new Error('No pudimos cargar tu biblioteca');const projects=await r.json();libraryGrid.innerHTML='';if(!projects.length){libraryGrid.innerHTML='<div class="empty"><b>Aún no tienes clips guardados.</b><br>Genera tu primer proyecto y aparecerá aquí.</div>';return}for(const p of projects){const card=document.createElement('article');card.className='project-card';const preview=document.createElement('div');preview.className='project-preview';const first=p.clips&&p.clips[0];if(first){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='metadata';v.src=first.url;preview.appendChild(v)}const count=document.createElement('span');count.className='library-count';count.textContent=(p.clips?.length||0)+' clips';preview.appendChild(count);const body=document.createElement('div');body.className='project-body';const name=document.createElement('div');name.className='project-name';name.textContent=projectTitle(p);const meta=document.createElement('div');meta.className='project-meta';meta.textContent=formatDate(p.completedAt)+' · '+Math.max(1,Math.round((p.sourceDuration||0)/60))+' min';const actions=document.createElement('div');actions.className='project-actions';const view=document.createElement('button');view.className='view-project';view.textContent='Ver clips';view.onclick=()=>openLibraryProject(p);const del=document.createElement('button');del.className='danger';del.title='Borrar proyecto';del.setAttribute('aria-label','Borrar proyecto');del.onclick=async()=>{if(!confirm('¿Eliminar este proyecto y todos sus clips? Esta acción no se puede deshacer.'))return;del.disabled=true;const dr=await fetch('/api/library/'+p.id,{method:'DELETE',headers:{'x-hydra-client-id':clientId()}});if(!dr.ok){del.disabled=false;alert('No pudimos borrar el proyecto.');return}card.remove();if(!libraryGrid.children.length)libraryGrid.innerHTML='<div class="empty">No tienes clips guardados.</div>'};actions.append(view,del);body.append(name,meta,actions);card.append(preview,body);libraryGrid.append(card)}}catch(e){libraryGrid.innerHTML='<div class="empty">'+(e.message||'No pudimos cargar tu biblioteca')+'</div>'}}
navCreate.onclick=()=>show('home');
navLibrary.onclick=()=>void loadLibrary();

(async()=>{const id=localStorage.getItem(JOB_KEY);if(!id)return;try{const r=await fetch('/api/jobs/'+id);if(!r.ok){localStorage.removeItem(JOB_KEY);return}const j=await r.json();if(j.status==='COMPLETED'){localStorage.removeItem(JOB_KEY);render(j);return}if(j.status==='FAILED'){localStorage.removeItem(JOB_KEY);return}filenameEl.textContent=j.originalFileName||'Video en proceso';show('processing');setPickerBusy(true);setProgress(j.status);uploadMeta.textContent='Retomando procesamiento…';void keepScreenAwake();void poll(id)}catch{}})();
</script>
</body>
</html>`;

@Controller()
export class WebController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string { return html; }
}
