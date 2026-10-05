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
    .visual{height:280px;border-radius:22px;border:1px solid #7683d02b;background:
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
    .library{max-width:1040px;margin:18px auto}.library-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}.project-card{background:linear-gradient(155deg,rgba(20,28,51,.94),rgba(9,14,28,.96));border:1px solid var(--line);border-radius:18px;padding:10px;box-shadow:0 16px 42px #0005;min-width:0}.project-preview{position:relative;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 18%,#694dff38,transparent 36%),#070b14;aspect-ratio:9/12;border:1px solid #7280c128}.project-preview video{width:100%;height:100%;object-fit:cover;display:block;background:#05070d}.project-preview:after{content:"";position:absolute;inset:auto 0 0;height:40%;background:linear-gradient(transparent,#050811dd);pointer-events:none}.library-count{position:absolute;left:8px;top:38px;right:auto;z-index:2;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid #ffffff22;background:#070a13cc;backdrop-filter:blur(8px);border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900}.library-status{position:absolute;left:8px;top:8px;right:auto;z-index:2;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid #ffffff22;background:#070a13dd;backdrop-filter:blur(8px);border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900;color:#b9c5df}.library-status.live{color:#9ee8ff;border-color:#35d7ff55}.library-status.done{color:#8ef0bd;border-color:#4de59b55}.library-status.fail{color:#ff9bb1;border-color:#ff668855}.project-body{padding:10px 3px 2px}.project-name{font-size:14px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.015em}.project-meta{color:#7f8ba6;font-size:10px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.project-actions{display:grid;grid-template-columns:1fr 38px;gap:7px;margin-top:10px}.view-project{border:1px solid #6270b44d;background:#101a34;color:#edf1ff;border-radius:11px;padding:9px 10px;font-size:11px;font-weight:900;cursor:pointer}.danger{border:1px solid #ff6f8b4a;background:#2a111a;color:#ff98ad;border-radius:11px;padding:8px;font-size:0;cursor:pointer}.danger:before{content:"⌫";font-size:15px}.empty{grid-column:1/-1;border:1px dashed #58668755;border-radius:22px;padding:36px;text-align:center;color:#8792ac;background:#0b1222}
    .helper{text-align:center;color:#7f8ba5;font-size:12px;margin-top:12px}.magic-strip{margin-top:12px;border:1px solid #746dff36;background:linear-gradient(135deg,#171b38,#0e1428);border-radius:14px;padding:11px 12px;color:#9da8c2;font-size:11px;line-height:1.45}.magic-strip b{color:#eeeaff}.magic-summary{border:1px solid #7a68ff33;background:linear-gradient(145deg,#151a36,#0b1224);border-radius:14px;padding:11px 12px;margin:11px 0}.magic-summary strong{display:block;font-size:11px;color:#d9d5ff;letter-spacing:.02em}.magic-summary span{display:block;color:#8e9bb7;font-size:10px;line-height:1.45;margin-top:5px}.magic-badge{flex:none;border:1px solid #775cff44;background:#151538;border-radius:999px;padding:7px 9px;font-size:10px;font-weight:900;color:#cfc4ff}.refine{margin-top:9px;border:1px solid #5361813d;border-radius:13px;background:#0b1222;overflow:hidden}.refine summary{list-style:none;cursor:pointer;padding:11px 12px;font-size:11px;font-weight:900;color:#cdd5e9;display:flex;justify-content:space-between}.refine summary::-webkit-details-marker{display:none}.refine summary:after{content:'＋';color:#8e99b5}.refine[open] summary:after{content:'−'}.refine .clip-actions{padding:0 10px 10px;margin:0}.editorial-note{margin-top:8px;color:#8793ad;font-size:10px}.editorial-note summary{cursor:pointer}.editorial-note p{line-height:1.5}.clip-update-status{display:none;align-items:center;gap:8px;margin:10px 0 0;border:1px solid #5a6a9c42;background:#0d1528;border-radius:12px;padding:10px 11px;font-size:11px;font-weight:850;color:#b9c7e5}.clip-update-status.show{display:flex}.clip-update-status.updating{color:#a9ddff;border-color:#3f98d955}.clip-update-status.done{color:#a8efc8;border-color:#49b97b55}.clip-update-status .dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}.clip-update-status.updating .dot{animation:pulseDot 1s ease-in-out infinite}@keyframes pulseDot{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1.2)}}.trust{margin-top:13px;border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:center;color:#9ba7c0;font-size:12px}.shield{width:34px;height:34px;border-radius:12px;background:#334cff22;color:#9bb2ff;display:grid;place-items:center;font-size:18px}
    .process-wrap{max-width:720px;margin:32px auto}.section-title{text-align:center;font-size:30px;margin:14px 0 6px;letter-spacing:-.03em}.section-sub{text-align:center;color:var(--muted);margin:0 0 26px}
    .process-card{border-radius:30px;padding:24px}.file-orbit{min-height:235px;border-radius:24px;border:1px solid #6573c02d;background:radial-gradient(circle at 50% 30%,#774dff32,transparent 38%),#0c1327;display:grid;place-items:center;text-align:center;padding:22px}
    .ring{--p:10;width:122px;height:122px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(from 180deg,var(--cyan) 0 calc(var(--p)*1%),var(--violet) calc(var(--p)*1%) calc(var(--p)*1% + 8%),#222c4c 0);position:relative;box-shadow:0 0 35px #6c50ff3d}
    .ring:after{content:"";position:absolute;inset:10px;border-radius:50%;background:#0a1020}.ring strong{z-index:1;font-size:26px}
    .filename{font-weight:850;margin-top:13px;max-width:100%;width:100%;padding:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}.upload-meta{font-size:12px;color:#8792ad;margin-top:5px;max-width:100%;line-height:1.45;text-align:center}.ios-note{margin-top:12px;padding:11px 13px;border-radius:14px;border:1px solid #5f6fa72e;background:#0c1428;color:#8f9ab5;font-size:12px;line-height:1.45;text-align:left}.ios-note b{color:#cdd5ea}
    .batch-queue{margin-top:16px;display:grid;gap:7px}.batch-item{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 11px;border:1px solid #56648738;background:#0a1223;border-radius:12px}.batch-index{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#18223d;color:#cbd5ee;font-size:10px;font-weight:900}.batch-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:800;color:#d9e0f1}.batch-state{font-size:10px;color:#8794af;font-weight:850}.batch-item.active{border-color:#6b65ff66;background:#101733}.batch-item.done .batch-index{background:#183426;color:#8ff0bd}.batch-item.fail{border-color:#ff668844}.batch-item.fail .batch-index{background:#35131e;color:#ff9fb3}.batch-note{margin-top:8px;color:#7f8ca8;font-size:10px;line-height:1.4}
    .steps{margin-top:25px;display:grid;gap:6px}.step{display:grid;grid-template-columns:34px 1fr auto;gap:11px;align-items:center;padding:11px 8px;color:#69758f}.step .dot{width:28px;height:28px;border-radius:50%;border:2px solid #344364;display:grid;place-items:center}.step b{display:block;color:#74809a}.step small{color:#65708a}.step.active{color:#cfc7ff}.step.active .dot{border-color:#a75cff;box-shadow:0 0 18px #a15aff66}.step.active b{color:#fff}.step.done .dot{background:linear-gradient(145deg,#9a55ff,#556cff);border:0;color:#fff}.step.done b{color:#e8ebf6}
    .results{max-width:980px;margin:22px auto}.result-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:14px}.result-head h2{font-size:36px;letter-spacing:-.045em;margin:0}.result-head p{margin:7px 0 0;color:var(--muted)}.result-summary{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px}.summary-pill{border:1px solid #5c6da23d;background:#0d1528;border-radius:999px;padding:8px 10px;color:#cbd4ea;font-size:11px;font-weight:850}.summary-pill strong{color:#fff}
    .clips{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:22px}.result-card{border-radius:25px;padding:13px;overflow:hidden}.preview-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}.preview-tabs{display:inline-flex;gap:3px;padding:3px;border:1px solid #5261843d;background:#090f1d;border-radius:11px}.preview-tab,.preview-safe{border:0;background:transparent;color:#8f9ab4;border-radius:8px;padding:7px 10px;font-size:10px;font-weight:900;cursor:pointer}.preview-tab.active{background:#1a2440;color:#f4f6ff;box-shadow:inset 0 0 0 1px #7280b73b}.preview-safe{border:1px solid #5361813d;background:#0c1426;color:#b8c3da}.preview-safe.active{border-color:#a45fff66;color:#e1c9ff;background:#21153a}.video-shell{position:relative;border-radius:19px;overflow:hidden;background:#000;box-shadow:0 15px 45px #0008}.video-shell video{display:block;width:100%;aspect-ratio:9/16;background:#000}.badge{position:absolute;top:12px;padding:7px 9px;border-radius:10px;background:#090c14bb;border:1px solid #ffffff22;backdrop-filter:blur(8px);font-size:11px;font-weight:850;z-index:4}.badge.left{left:12px}.badge.right{right:12px}.video-shell.platform-preview .badge{display:none}.platform-overlay{position:absolute;inset:0;z-index:3;pointer-events:none;opacity:0;transition:opacity .16s ease;color:#fff;text-shadow:0 1px 3px #000}.video-shell.platform-preview .platform-overlay{opacity:1}.tk-search{position:absolute;top:2.1%;left:17%;right:17%;height:5.4%;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:999px;background:#0b0b0fd9;border:1px solid #ffffff20;font-size:10px;font-weight:800;backdrop-filter:blur(8px)}.tk-search:before{content:'⌕';font-size:14px}.tk-right{position:absolute;right:2.8%;bottom:18%;display:flex;flex-direction:column;align-items:center;gap:13px}.tk-action{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9px;font-weight:850}.tk-icon{width:31px;height:31px;border-radius:50%;display:grid;place-items:center;font-size:18px;color:#fff;background:#0a0a0a35;text-shadow:0 1px 4px #000}.tk-avatar{width:34px;height:34px;border-radius:50%;border:2px solid #fff;background:linear-gradient(145deg,#9b61ff,#2d7dff);box-shadow:0 2px 8px #0008}.tk-bottom{position:absolute;left:4%;right:19%;bottom:3.6%;font-size:10px;line-height:1.28}.tk-user{font-weight:950;margin-bottom:5px}.tk-caption{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:650}.tk-audio{margin-top:6px;font-size:9px;opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.safe-layer{position:absolute;inset:0;z-index:5;pointer-events:none;display:none}.video-shell.show-safe .safe-layer{display:block}.safe-mask{position:absolute;background:#ff4d6d28;border-color:#ff789155;border-style:solid}.safe-mask.top{left:0;right:0;top:0;height:12.5%;border-width:0 0 1px}.safe-mask.right{right:0;top:12.5%;bottom:22.4%;width:20.4%;border-width:0 0 0 1px}.safe-mask.bottom{left:0;right:0;bottom:0;height:22.4%;border-width:1px 0 0}.safe-mask.left{left:0;top:12.5%;bottom:22.4%;width:6.7%;border-width:0 1px 0 0}.safe-label{position:absolute;top:14%;left:9%;padding:5px 7px;border-radius:8px;background:#07101ddb;border:1px solid #63dda866;color:#9af2c2;font-size:9px;font-weight:900}.preflight-bar{display:flex;align-items:center;gap:8px;margin:9px 2px 0;padding:9px 10px;border-radius:12px;border:1px solid #53618136;background:#0b1324;color:#99a6bf;font-size:10px;font-weight:800}.preflight-dot{width:7px;height:7px;border-radius:50%;background:#7c879f;flex:none}.preflight-bar.pass{border-color:#4de59b35;color:#a7eac7}.preflight-bar.pass .preflight-dot{background:#4de59b}.preflight-bar.warn{border-color:#ffb35c4c;color:#ffd09a;background:#21170d}.preflight-bar.warn .preflight-dot{background:#ffb35c}
    .details{padding:16px 7px 7px}.title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0}.details h3{flex:1;min-width:0;font-size:18px;line-height:1.18;margin:0;letter-spacing:-.025em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}.details h3.title-medium{font-size:16px;line-height:1.22}.details h3.title-long{font-size:14px;line-height:1.28}.score-badge{flex:none;border:1px solid #426aff44;background:#111a33;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800}.score-badge em{font-style:normal;color:var(--green)}
    .meta-row{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0}.meta{border:1px solid #54617d3d;border-radius:999px;background:#0d1427;padding:7px 9px;color:#c5cde0;font-size:11px;font-weight:720}.why{border-top:1px solid var(--line);padding-top:13px}.why b{font-size:12px}.why p{color:#929db5;font-size:13px;line-height:1.5;margin:7px 0 14px}.download{text-decoration:none;display:block;text-align:center}.publish-pack{margin:12px 0;border:1px solid #6e62ff35;background:linear-gradient(150deg,#111a33,#0b1020);border-radius:15px;padding:12px}.pack-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.pack-label{font-size:10px;font-weight:950;letter-spacing:.08em;color:#bca8ff}.copy-pack{border:1px solid #7784b83b;background:#17203a;color:#e9edfb;border-radius:9px;padding:6px 8px;font-size:10px;font-weight:850;cursor:pointer}.hook-line{font-size:13px;font-weight:900;line-height:1.35;margin-top:9px;color:#f1f3ff}.caption-copy{font-size:11px;line-height:1.45;color:#96a2bb;margin-top:7px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hashtags{font-size:10px;color:#7ea7ff;margin-top:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.clip-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}.clip-action{border:1px solid #5d6b9442;background:#0c1427;color:#dfe5f7;border-radius:11px;padding:9px 7px;font-size:10px;font-weight:900;cursor:pointer}.clip-action:hover{background:#131e39}.clip-action:disabled{opacity:.45;cursor:wait}
    .secondary{margin-top:9px;width:100%;background:#0c1426;border:1px solid #5361814d;color:#e7eaf5;border-radius:15px;padding:14px;font-weight:800;cursor:pointer}.result-actions{display:flex;gap:8px;flex-wrap:wrap}.result-actions .secondary{width:auto;margin-top:0;padding-inline:14px}.modal[hidden]{display:none}.modal{position:fixed;inset:0;z-index:50;background:#02050ccd;backdrop-filter:blur(12px);display:grid;place-items:center;padding:18px}.modal-card{width:min(760px,100%);max-height:88vh;display:flex;flex-direction:column;background:linear-gradient(155deg,#141c33,#090f1e);border:1px solid #7c89bd35;border-radius:24px;box-shadow:0 30px 100px #000a;padding:18px}.modal-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.modal-head h3{margin:0;font-size:20px}.modal-head p{margin:5px 0 0;color:#8996b1;font-size:12px}.modal-close{border:0;background:#172038;color:#dfe6f8;width:34px;height:34px;border-radius:10px;font-size:18px;cursor:pointer}.transcript-video{width:100%;max-height:300px;aspect-ratio:9/16;object-fit:contain;background:#03050a;border:1px solid #6978ac35;border-radius:16px;margin-top:14px}.transcript-help{margin-top:10px;color:#8794af;font-size:11px;line-height:1.5}.transcript-help b{color:#cbd5ee}.transcript-area{width:100%;min-height:28vh;max-height:42vh;resize:vertical;margin-top:10px;border:1px solid #64729d45;border-radius:15px;background:#080e1b;color:#f1f4ff;padding:14px;font:inherit;font-size:15px;line-height:1.65;outline:none}.transcript-area:focus{border-color:#8069ff88;box-shadow:0 0 0 3px #6a54ff18}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.modal-actions .secondary,.modal-actions .primary{width:auto;margin:0;padding:12px 16px}.transcript-status{min-height:18px;margin-top:8px;color:#8fa0bd;font-size:11px}
    .error{margin:18px auto 0;max-width:720px;background:#35151f;border:1px solid #ff6d8a42;color:#ffa9b9;border-radius:16px;padding:13px 15px;white-space:pre-wrap}.footer{text-align:center;color:#626e88;font-size:12px;margin-top:48px}
    @media(max-width:820px){.app{padding:16px 14px 54px}.topbar{padding-bottom:15px}.status-pill{display:none}.hero{grid-template-columns:1fr;min-height:auto;gap:18px}.hero-copy{padding-top:8px}h1{font-size:clamp(42px,12vw,60px);margin-bottom:16px}.lead{font-size:16px}.upload-card{display:flex;flex-direction:column;padding:15px}.file-trigger{order:1;margin-top:0}.magic-strip{order:2}.visual{order:3;height:145px;margin-top:12px}.helper{order:4}.play-glass{width:76px;height:76px;border-radius:22px}.play-glass:after{border-top-width:14px;border-bottom-width:14px;border-left-width:22px}.chips{margin:18px 0 4px}.result-head{align-items:flex-start;flex-direction:column}.result-head h2{font-size:30px}.library-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.project-card{padding:8px;border-radius:16px}.project-preview{border-radius:12px;aspect-ratio:9/11}.project-name{font-size:12px}.project-meta{font-size:9px}.project-actions{grid-template-columns:1fr 34px;gap:6px}.view-project{padding:8px 6px;font-size:10px}.nav-btn{padding:8px 10px;font-size:12px}.brand{font-size:17px;gap:9px}.logo{width:30px;height:30px}.library .result-head{margin-bottom:14px}.result-actions{width:100%}.result-actions .secondary{flex:1}.modal{padding:10px}.modal-card{border-radius:18px;padding:14px}.transcript-video{max-height:260px}.transcript-area{min-height:30vh;font-size:16px}.modal-actions{display:grid;grid-template-columns:1fr 1fr}.modal-actions .secondary,.modal-actions .primary{width:100%}}
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
        <span class="eyebrow">✦ MAGIC EDIT · DE VIDEO A CONTENIDO</span>
        <h1>Sube tus videos. Hydra te devuelve contenido <span class="grad">listo para publicar.</span></h1>
        <p class="lead">Encuentra los mejores momentos, elimina pausas muertas, mejora voz y color, enfatiza ideas clave y prepara el copy. Sin abrir un editor.</p>
        <div class="chips"><span class="chip">✦ Magic Edit</span><span class="chip">🎙 Audio pulido</span><span class="chip">↗ Copy listo</span></div>
      </div>
      <div>
        <div class="upload-card">
          <div class="visual"><div class="play-glass"></div></div>
          <label id="pick" class="primary file-trigger">
            <span>⇧ &nbsp; Seleccionar hasta 3 videos &nbsp; →</span>
            <input id="file" class="native-file" type="file" multiple accept="video/*,.mp4,.mov,.webm">
          </label>
          <div class="magic-strip"><b>Hydra edita por ti:</b> selección · ritmo · captions semánticos · framing · audio · color · copy</div>
          <div class="helper">Hasta 3 videos · 1 GB por lote · MP4, MOV o WEBM · máximo 30 min por video</div>
        </div>
        <div class="trust"><span class="shield">✓</span><span><b style="color:#d8dff0">Tu archivo va directo a almacenamiento privado.</b><br>HydraReel procesa únicamente el contenido que tú subes.</span></div>
      </div>
    </section>

    <section id="processing" hidden class="process-wrap">
      <h2 class="section-title">Hydra está editando por ti</h2>
      <p class="section-sub">Entendiendo el contenido y convirtiéndolo en piezas publicables.</p>
      <div class="process-card">
        <div class="file-orbit">
          <div class="ring" id="ring"><strong id="percent">0%</strong></div>
          <div class="filename" id="filename">VIDEO.MP4</div>
          <div class="upload-meta" id="uploadMeta">Preparando archivo…</div>
        </div>
        <div id="batchQueue" class="batch-queue" hidden></div>
        <div class="steps">
          <div class="step" data-state="UPLOADING"><span class="dot">1</span><span><b>Preparando video</b><small>Subiendo el original de forma segura</small></span><span></span></div>
          <div class="step" data-state="TRANSCRIBING"><span class="dot">2</span><span><b>Entendiendo contenido</b><small>Detectando ideas, contexto y momentos importantes</small></span><span></span></div>
          <div class="step" data-state="ANALYZING"><span class="dot">3</span><span><b>Eligiendo momentos</b><small>Buscando piezas que funcionen sin contexto adicional</small></span><span></span></div>
          <div class="step" data-state="RENDERING"><span class="dot">4</span><span><b>Magic Edit</b><small>Ritmo, framing, audio, color y captions semánticos</small></span><span></span></div>
        </div>
      </div>
      <div class="server-note"><b>Hydra trabaja en cola, no en paralelo.</b> Cuando terminen las subidas, puedes salir: los videos cargados seguirán procesándose uno por uno aunque cierres esta pestaña.</div>
    </section>

    <section id="results" hidden class="results">
      <div class="result-head"><div><span class="eyebrow">✦ LISTO PARA PUBLICAR</span><h2 style="margin-top:12px">Tu contenido está listo</h2><p id="resultCopy">Hydra terminó la edición.</p></div><div class="result-actions"><button id="again" class="secondary">↻ Crear otro</button></div></div>
      <div id="resultSummary" class="result-summary"></div>
      <div id="clips" class="clips"></div>
    </section>

    <section id="library" hidden class="library">
      <div class="result-head"><div><span class="eyebrow">✦ BIBLIOTECA</span><h2 style="margin-top:12px">Mis clips</h2><p>Proyectos generados en este navegador.</p></div></div>
      <div id="libraryGrid" class="library-grid"></div>
    </section>

    <div id="transcriptModal" class="modal" hidden>
      <div class="modal-card">
        <div class="modal-head">
          <div><h3>Corregir texto del clip</h3><p id="transcriptClipLabel">Reproduce el clip y corrige todo lo que Hydra entendió mal.</p></div>
          <button id="transcriptClose" class="modal-close" aria-label="Cerrar">×</button>
        </div>
        <video id="transcriptVideo" class="transcript-video" controls playsinline preload="metadata"></video>
        <div class="transcript-help">Puedes reproducir y pausar mientras editas. <b>Hydra no renderiza mientras escribes.</b></div>
        <textarea id="transcriptArea" class="transcript-area" spellcheck="true"></textarea>
        <div id="transcriptStatus" class="transcript-status"></div>
        <div class="modal-actions">
          <button id="transcriptCancel" class="secondary">Cancelar</button>
          <button id="transcriptSave" class="primary">Guardar y actualizar clip</button>
        </div>
      </div>
    </div>

    <div id="error" class="error" hidden></div>
    <div class="footer">Procesa únicamente contenido propio o que tengas derecho a utilizar.</div>
  </main>

<script>
const input=document.getElementById('file'),pick=document.getElementById('pick'),home=document.getElementById('home'),processing=document.getElementById('processing'),results=document.getElementById('results'),library=document.getElementById('library'),libraryGrid=document.getElementById('libraryGrid'),clips=document.getElementById('clips'),err=document.getElementById('error'),ring=document.getElementById('ring'),percent=document.getElementById('percent'),filenameEl=document.getElementById('filename'),uploadMeta=document.getElementById('uploadMeta'),resultCopy=document.getElementById('resultCopy'),resultSummary=document.getElementById('resultSummary'),again=document.getElementById('again'),transcriptModal=document.getElementById('transcriptModal'),transcriptVideo=document.getElementById('transcriptVideo'),transcriptClipLabel=document.getElementById('transcriptClipLabel'),transcriptArea=document.getElementById('transcriptArea'),transcriptStatus=document.getElementById('transcriptStatus'),transcriptSave=document.getElementById('transcriptSave'),transcriptCancel=document.getElementById('transcriptCancel'),transcriptClose=document.getElementById('transcriptClose'),navCreate=document.getElementById('navCreate'),navLibrary=document.getElementById('navLibrary'),batchQueue=document.getElementById('batchQueue');
let pickerOpenedAt=0;
let pickerDeliveredFile=false;
let wakeLock=null;
let processingActive=false;
let activeResult=null;
let currentSection='home';
const clipUiState=new Map();
function clipUiKey(jobId,index){return jobId+':'+index}
function setClipUiState(jobId,index,type,text){
  const key=clipUiKey(jobId,index);
  if(type)clipUiState.set(key,{type,text});else clipUiState.delete(key);
  const node=document.querySelector('[data-clip-status="'+CSS.escape(key)+'"]');
  if(node){
    node.className='clip-update-status'+(type?' show '+type:'');
    node.querySelector('.clip-status-text').textContent=text||'';
  }
}
function markClipUpdating(jobId,index,text='Actualizando video…'){setClipUiState(jobId,index,'updating',text)}
function markClipUpdated(jobId,index){
  setClipUiState(jobId,index,'done','✓ Video actualizado');
  setTimeout(()=>setClipUiState(jobId,index,null,''),3500);
}
const JOB_KEY='hydrareel-active-job';
const BATCH_KEY='hydrareel-active-batch';
const MAX_BATCH_FILES=3;
const MAX_BATCH_BYTES=1024*1024*1024;
const CLIENT_KEY='hydrareel-client-id';
function clientId(){let id=localStorage.getItem(CLIENT_KEY);if(!id){id=crypto.randomUUID();localStorage.setItem(CLIENT_KEY,id)}return id}

function formatEta(seconds){if(!Number.isFinite(seconds)||seconds<0)return '';const s=Math.ceil(seconds);const m=Math.floor(s/60);const r=s%60;return m?m+'m '+r+'s':r+'s'}
function mediaTime(seconds){if(!Number.isFinite(seconds)||seconds<=0)return '—';const s=Math.round(seconds);const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const r=s%60;return h?h+':'+String(m).padStart(2,'0')+':'+String(r).padStart(2,'0'):m+':'+String(r).padStart(2,'0')}
function totalClipSeconds(list){return (list||[]).reduce((sum,c)=>sum+Number(c.durationSeconds||0),0)}
async function keepScreenAwake(){processingActive=true;if(!('wakeLock' in navigator)||document.visibilityState!=='visible')return;try{wakeLock=await navigator.wakeLock.request('screen')}catch{}}
async function releaseScreen(){processingActive=false;try{await wakeLock?.release()}catch{}wakeLock=null}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&processingActive&&!wakeLock)void keepScreenAwake()});
const order=['UPLOADING','TRANSCRIBING','ANALYZING','RENDERING','COMPLETED'];
const pct={UPLOADING:12,UPLOADED:23,TRANSCRIBING:42,ANALYZING:67,RENDERING:86,COMPLETED:100,FAILED:100};
function show(section){currentSection=section;home.hidden=section!=='home';processing.hidden=section!=='processing';results.hidden=section!=='results';library.hidden=section!=='library';navCreate.classList.toggle('active',section==='home'||section==='processing'||section==='results');navLibrary.classList.toggle('active',section==='library')}
function setProgress(state,value){const p=value??pct[state]??5;ring.style.setProperty('--p',p);percent.textContent=Math.round(p)+'%';const effective=state==='UPLOADED'?'TRANSCRIBING':state;const idx=order.indexOf(effective);document.querySelectorAll('.step').forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('done',i<idx);const dot=el.querySelector('.dot');if(i<idx)dot.textContent='✓'})}
function setPickerBusy(busy){pick.classList.toggle('busy',busy);input.disabled=busy}
function friendlyError(message){const raw=String(message||'');if(/ffmpeg|exited null|SIGKILL|Internal server error|statusCode|^\s*\{/i.test(raw))return 'No pudimos terminar esta edición. Tu video original quedó guardado para volver a intentarlo.';return raw||'No pudimos completar el procesamiento.'}
function fail(message){err.hidden=false;err.textContent=friendlyError(message);localStorage.removeItem(JOB_KEY);localStorage.removeItem(BATCH_KEY);void releaseScreen();setPickerBusy(false);show('home')}
function uploadWithProgress(url,headers,file){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();const started=performance.now();xhr.open('PUT',url);Object.entries(headers||{}).forEach(([k,v])=>xhr.setRequestHeader(k,v));xhr.upload.onprogress=e=>{if(e.lengthComputable){const p=Math.max(3,Math.round(e.loaded/e.total*18));setProgress('UPLOADING',p);const elapsed=Math.max(.25,(performance.now()-started)/1000);const bytesPerSecond=e.loaded/elapsed;const speed=bytesPerSecond/1048576;const eta=bytesPerSecond>0?(e.total-e.loaded)/bytesPerSecond:NaN;uploadMeta.textContent=(e.loaded/1048576).toFixed(1)+' MB de '+(e.total/1048576).toFixed(1)+' MB · '+speed.toFixed(1)+' MB/s'+(Number.isFinite(eta)?' · ~'+formatEta(eta):'')}};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Upload S3 falló: '+xhr.status));xhr.onerror=()=>reject(new Error('La subida se interrumpió. Verifica tu conexión e intenta de nuevo.'));xhr.send(file)})}
function packText(c){const tags=(c.hashtags||[]).join(' ');return [c.socialCaption||'',tags].filter(Boolean).join('\n\n')}
async function copyPack(c,button){try{await navigator.clipboard.writeText(packText(c));const old=button.textContent;button.textContent='✓ Copiado';setTimeout(()=>button.textContent=old,1200)}catch{alert('No pudimos copiar el texto.')}}
const preparedVideoShares=new Map();
async function fallbackDownloadClip(jobId,c,button,old){
  const r=await fetch('/api/library/'+jobId+'/clips/'+c.index+'/download',{headers:{'x-hydra-client-id':clientId()}});
  if(!r.ok)throw new Error('No pudimos preparar la descarga.');
  const data=await r.json();
  if(!data.url)throw new Error('No pudimos preparar la descarga.');
  window.location.assign(data.url);
  button.textContent='✓ Descarga iniciada';
  setTimeout(()=>button.textContent=old,1400);
}
async function saveClipToPhotos(jobId,c,button){
  if(!jobId){alert('Este clip aún no está disponible para guardar.');return}
  const old=button.dataset.defaultLabel||button.textContent;
  const cacheKey=jobId+':'+c.index+':'+c.key;
  button.disabled=true;
  try{
    let file=preparedVideoShares.get(cacheKey);
    if(!file){
      button.textContent='Preparando video…';
      const r=await fetch('/api/library/'+jobId+'/clips/'+c.index+'/file',{headers:{'x-hydra-client-id':clientId()}});
      if(!r.ok)throw new Error('No pudimos preparar el video.');
      const blob=await r.blob();
      file=new File([blob],'hydrareel-clip-'+String(c.index).padStart(2,'0')+'.mp4',{type:'video/mp4'});
      preparedVideoShares.set(cacheKey,file);
    }

    const shareData={files:[file],title:'HydraReel'};
    const canShareFiles=!!navigator.share&&(!navigator.canShare||navigator.canShare(shareData));
    if(canShareFiles){
      try{
        await navigator.share(shareData);
        button.textContent='✓ Video listo';
        setTimeout(()=>button.textContent=old,1400);
        return;
      }catch(e){
        if(e&&e.name==='AbortError'){
          button.textContent=old;
          return;
        }
        if(e&&e.name==='NotAllowedError'){
          button.textContent='⇧ Guardar en Fotos';
          button.dataset.defaultLabel='⇧ Guardar en Fotos';
          return;
        }
        throw e;
      }
    }

    await fallbackDownloadClip(jobId,c,button,old);
  }catch(e){
    button.textContent=old;
    alert(friendlyError(e.message||e));
  }finally{
    button.disabled=false;
  }
}
async function libraryProject(jobId){try{const r=await fetch('/api/library',{headers:{'x-hydra-client-id':clientId()}});if(!r.ok)return null;const projects=await r.json();return projects.find(p=>p.id===jobId)||null}catch{return null}}
async function waitForClipChanges(jobId,oldKeys,expected,timeoutMs=180000){const started=Date.now();while(Date.now()-started<timeoutMs){await new Promise(r=>setTimeout(r,3000));const p=await libraryProject(jobId);if(!p)continue;const changedClips=(p.clips||[]).filter(clip=>oldKeys[String(clip.index)]&&oldKeys[String(clip.index)]!==clip.key);if(changedClips.length>=expected){for(const clip of changedClips)clipUiState.set(clipUiKey(jobId,clip.index),{type:'done',text:'✓ Video actualizado'});if(currentSection==='library')await loadLibrary();else if(currentSection==='results')openLibraryProject(p);for(const clip of changedClips)setTimeout(()=>setClipUiState(jobId,clip.index,null,''),3500);return p}}return null}
let transcriptContext=null;
let transcriptDirty=false;
let transcriptInitial='';
async function openClipTranscriptEditor(jobId,clip){
  transcriptContext={jobId,clip};
  transcriptDirty=false;
  transcriptInitial='';
  transcriptArea.value='';
  transcriptStatus.textContent='Cargando texto…';
  transcriptClipLabel.textContent='Clip '+clip.index+' · '+Math.round(clip.durationSeconds)+'s';
  transcriptVideo.src=clip.url;
  transcriptModal.hidden=false;
  try{
    const r=await fetch('/api/library/'+jobId+'/clips/'+clip.index+'/transcript',{headers:{'x-hydra-client-id':clientId()}});
    if(!r.ok)throw new Error('No pudimos cargar el texto de este clip.');
    const data=await r.json();
    transcriptInitial=data.text||'';
    transcriptArea.value=transcriptInitial;
    transcriptStatus.textContent='Escucha y corrige todo lo necesario. Se renderiza una sola vez al guardar.';
  }catch(e){
    transcriptStatus.textContent=friendlyError(e.message||e);
  }
}
function closeTranscriptEditor(force=false){
  if(transcriptDirty&&!force&&!confirm('¿Descartar las correcciones que aún no guardaste?'))return;
  try{transcriptVideo.pause()}catch{}
  transcriptVideo.removeAttribute('src');
  transcriptVideo.load();
  transcriptModal.hidden=true;
  transcriptStatus.textContent='';
  transcriptContext=null;
  transcriptDirty=false;
  transcriptInitial='';
}
transcriptArea.addEventListener('input',()=>{
  transcriptDirty=transcriptArea.value.trim()!==transcriptInitial.trim();
  transcriptStatus.textContent=transcriptDirty?'Cambios pendientes · se aplicarán juntos al guardar.':'Sin cambios pendientes.';
});
async function saveClipTranscript(){
  if(!transcriptContext)return;
  const text=transcriptArea.value.trim();
  if(!text){transcriptStatus.textContent='El texto del clip no puede quedar vacío.';return}
  const {jobId,clip}=transcriptContext;
  if(!transcriptDirty){closeTranscriptEditor(true);return}
  const oldKey=clip.key;
  const old=transcriptSave.textContent;
  transcriptSave.disabled=true;
  transcriptSave.textContent='Guardando…';
  try{
    const r=await fetch('/api/library/'+jobId+'/clips/'+clip.index+'/transcript',{
      method:'PUT',
      headers:{'Content-Type':'application/json','x-hydra-client-id':clientId()},
      body:JSON.stringify({text})
    });
    if(!r.ok){
      let message='No pudimos guardar la corrección.';
      try{const body=await r.json();if(body.message)message=body.message}catch{}
      throw new Error(message);
    }
    const data=await r.json();
    transcriptDirty=false;
    transcriptInitial=text;
    transcriptStatus.textContent=data.updatingVideo?'✓ Guardado. Actualizando el video en el servidor…':'✓ Guardado.';
    transcriptSave.textContent='✓ Guardado';
    resultCopy.textContent=data.updatingVideo?'Hydra está actualizando el clip '+clip.index+' con tus correcciones…':resultCopy.textContent;
    if(data.updatingVideo)markClipUpdating(jobId,clip.index,'⟳ Actualizando video…');
    setTimeout(()=>closeTranscriptEditor(true),700);
    if(data.updatingVideo)void waitForClipChanges(jobId,{[String(clip.index)]:oldKey},1);
  }catch(e){
    transcriptStatus.textContent=friendlyError(e.message||e);
    transcriptSave.textContent=old;
  }finally{
    transcriptSave.disabled=false;
    setTimeout(()=>{transcriptSave.textContent=old},1000);
  }
}
transcriptCancel.onclick=()=>closeTranscriptEditor();
transcriptClose.onclick=()=>closeTranscriptEditor();
transcriptSave.onclick=()=>void saveClipTranscript();
transcriptModal.addEventListener('click',e=>{if(e.target===transcriptModal)closeTranscriptEditor()});
async function regenerateClip(jobId,c,mode,button){if(!jobId){alert('Este clip aún no está disponible para ajustar.');return}const old=button.textContent;const oldKey=c.key;button.disabled=true;button.textContent='Enviando…';try{const r=await fetch('/api/library/'+jobId+'/clips/'+c.index+'/regenerate',{method:'POST',headers:{'Content-Type':'application/json','x-hydra-client-id':clientId()},body:JSON.stringify({mode})});if(!r.ok){let message='No pudimos ajustar este clip.';try{const body=await r.json();if(body.message)message=body.message}catch{}throw new Error(message)}const response=await r.json();if(response.accepted){button.textContent='Procesando en servidor…';markClipUpdating(jobId,c.index,'⟳ Actualizando video…');const done=await waitForClipChanges(jobId,{[String(c.index)]:oldKey},1,180000);if(!done){setClipUiState(jobId,c.index,null,'');throw new Error('Hydra no terminó este ajuste a tiempo.')}return}if(activeResult){const idx=activeResult.clips.findIndex(x=>x.index===c.index);if(idx>=0)activeResult.clips[idx]=response;render(activeResult)}}catch(e){alert(friendlyError(e.message||e))}finally{button.disabled=false;button.textContent=old}}
function captionPolicyLabel(policy){if(policy==='FULL')return 'Subtítulos completos';if(policy==='REDUCED')return 'Subtítulos ligeros';if(policy==='KEY_MOMENTS')return 'Solo momentos clave';if(policy==='HOOK_ONLY')return 'Solo hook';if(policy==='NONE')return 'Sin subtítulos';return 'Captions adaptativos'}
function createPlatformOverlay(c){
  const overlay=document.createElement('div');overlay.className='platform-overlay';overlay.setAttribute('aria-hidden','true');
  const search=document.createElement('div');search.className='tk-search';search.textContent='Buscar';
  const rail=document.createElement('div');rail.className='tk-right';
  const avatar=document.createElement('div');avatar.className='tk-avatar';rail.appendChild(avatar);
  [['♥','1.2K'],['●','86'],['▣','24'],['↗','Compartir']].forEach(([icon,label])=>{const action=document.createElement('div');action.className='tk-action';const i=document.createElement('span');i.className='tk-icon';i.textContent=icon;const l=document.createElement('span');l.textContent=label;action.append(i,l);rail.appendChild(action)});
  const bottom=document.createElement('div');bottom.className='tk-bottom';const user=document.createElement('div');user.className='tk-user';user.textContent='@tu_cuenta';const caption=document.createElement('div');caption.className='tk-caption';caption.textContent=c.socialCaption||c.reason||'Tu descripción aparecerá aquí';const audio=document.createElement('div');audio.className='tk-audio';audio.textContent='♫ sonido original · tu_cuenta';bottom.append(user,caption,audio);
  overlay.append(search,rail,bottom);
  return overlay;
}
function createSafeLayer(){
  const layer=document.createElement('div');layer.className='safe-layer';layer.setAttribute('aria-hidden','true');
  ['top','right','bottom','left'].forEach(side=>{const mask=document.createElement('div');mask.className='safe-mask '+side;layer.appendChild(mask)});
  const label=document.createElement('div');label.className='safe-label';label.textContent='ZONA SEGURA';layer.appendChild(label);
  return layer;
}
function addClip(c,total,jobId,fallbackGeneratedAt){
  const card=document.createElement('article');card.className='result-card';
  const toolbar=document.createElement('div');toolbar.className='preview-toolbar';
  const tabs=document.createElement('div');tabs.className='preview-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Vista del clip');
  const tiktokTab=document.createElement('button');tiktokTab.type='button';tiktokTab.className='preview-tab active';tiktokTab.textContent='TikTok';tiktokTab.setAttribute('aria-pressed','true');
  const cleanTab=document.createElement('button');cleanTab.type='button';cleanTab.className='preview-tab';cleanTab.textContent='Limpio';cleanTab.setAttribute('aria-pressed','false');
  tabs.append(tiktokTab,cleanTab);
  const safeButton=document.createElement('button');safeButton.type='button';safeButton.className='preview-safe';safeButton.textContent='◎ Zonas';safeButton.setAttribute('aria-pressed','false');
  toolbar.append(tabs,safeButton);

  const shell=document.createElement('div');shell.className='video-shell platform-preview';
  const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src=c.url;
  const left=document.createElement('span');left.className='badge left';left.textContent='#'+c.index+' de '+total;
  const right=document.createElement('span');right.className='badge right';right.textContent=Math.round(c.durationSeconds)+'s';
  const platformOverlay=createPlatformOverlay(c);const safeLayer=createSafeLayer();
  shell.append(video,platformOverlay,safeLayer,left,right);

  function setPreviewMode(mode){
    const isPlatform=mode==='tiktok';
    shell.classList.toggle('platform-preview',isPlatform);
    if(!isPlatform){shell.classList.remove('show-safe');safeButton.classList.remove('active');safeButton.setAttribute('aria-pressed','false')}
    safeButton.hidden=!isPlatform;
    tiktokTab.classList.toggle('active',isPlatform);cleanTab.classList.toggle('active',!isPlatform);
    tiktokTab.setAttribute('aria-pressed',String(isPlatform));cleanTab.setAttribute('aria-pressed',String(!isPlatform));
  }
  tiktokTab.onclick=()=>setPreviewMode('tiktok');
  cleanTab.onclick=()=>setPreviewMode('clean');
  safeButton.onclick=()=>{const next=!shell.classList.contains('show-safe');shell.classList.toggle('show-safe',next);safeButton.classList.toggle('active',next);safeButton.setAttribute('aria-pressed',String(next))};

  const preflight=document.createElement('div');const pf=c.preflight;preflight.className='preflight-bar '+(pf?.status==='PASS'?'pass':pf?.status==='WARN'?'warn':'');const pfDot=document.createElement('span');pfDot.className='preflight-dot';const pfText=document.createElement('span');pfText.textContent=pf?.status==='PASS'?'Vista TikTok verificada · texto fuera de la interfaz':pf?.status==='WARN'?'Revisa la vista TikTok antes de publicar':'Vista TikTok disponible · este clip es anterior al preflight';preflight.append(pfDot,pfText);

  const details=document.createElement('div');details.className='details';const clipStatus=document.createElement('div');const stateKey=clipUiKey(jobId,c.index);const state=clipUiState.get(stateKey);clipStatus.dataset.clipStatus=stateKey;clipStatus.className='clip-update-status'+(state?' show '+state.type:'');const statusDot=document.createElement('span');statusDot.className='dot';const statusText=document.createElement('span');statusText.className='clip-status-text';statusText.textContent=state?.text||'';clipStatus.append(statusDot,statusText);const titleRow=document.createElement('div');titleRow.className='title-row';const h=document.createElement('h3');h.textContent=c.title;h.className=c.title.length>78?'title-long':c.title.length>48?'title-medium':'';const magicBadge=document.createElement('span');magicBadge.className='magic-badge';magicBadge.textContent='✦ Magic Edit';titleRow.append(h,magicBadge);
  const meta=document.createElement('div');meta.className='meta-row';const generatedAt=c.generatedAt||fallbackGeneratedAt;const metaItems=['◷ '+Math.round(c.durationSeconds)+'s','▣ 9:16','Aa '+captionPolicyLabel(c.captionPolicy)];if(generatedAt)metaItems.unshift('◷ Generado '+formatDate(generatedAt));metaItems.forEach(t=>{const m=document.createElement('span');m.className='meta';m.textContent=t;meta.appendChild(m)});
  const me=c.magicEdit||{};const magic=document.createElement('div');magic.className='magic-summary';const ms=document.createElement('strong');ms.textContent='✦ Edición aplicada automáticamente';const mv=document.createElement('span');const facts=[];if((me.silenceCuts||0)>0)facts.push(me.silenceCuts+' pausas ajustadas'+((me.removedSeconds||0)>.2?' · '+Number(me.removedSeconds).toFixed(1)+'s eliminados':''));if((me.punchIns||0)>0)facts.push(me.punchIns+' énfasis de cámara');if((c.emphasisTerms||[]).length)facts.push((c.emphasisTerms||[]).length+' conceptos destacados');facts.push('voz + color optimizados');mv.textContent=facts.join(' · ');magic.append(ms,mv);
  const pack=document.createElement('div');pack.className='publish-pack';const packTop=document.createElement('div');packTop.className='pack-top';const packLabel=document.createElement('span');packLabel.className='pack-label';packLabel.textContent='PUBLICACIÓN PREPARADA';const copy=document.createElement('button');copy.className='copy-pack';copy.textContent='Copiar publicación';copy.onclick=()=>copyPack(c,copy);packTop.append(packLabel,copy);const hook=document.createElement('div');hook.className='hook-line';hook.textContent='“'+(c.hook||c.title)+'”';const caption=document.createElement('div');caption.className='caption-copy';caption.textContent=c.socialCaption||c.reason;const tags=document.createElement('div');tags.className='hashtags';tags.textContent=(c.hashtags||[]).join(' ');pack.append(packTop,hook,caption,tags);
  const download=document.createElement('button');download.className='primary download';download.type='button';const nativeShare=!!navigator.share;download.textContent=nativeShare?'⇧ Guardar en Fotos':'↓ Descargar clip listo';download.dataset.defaultLabel=download.textContent;download.onclick=()=>void saveClipToPhotos(jobId,c,download);
  const correct=document.createElement('button');correct.className='secondary';correct.textContent='✎ Corregir texto';correct.onclick=()=>void openClipTranscriptEditor(jobId,c);
  const refine=document.createElement('details');refine.className='refine';const summary=document.createElement('summary');summary.textContent='Quiero ajustar este clip';const actions=document.createElement('div');actions.className='clip-actions';[['Más corto','shorter'],['Más largo','longer'],['Otro momento','alternative'],['Cambiar estilo','restyle']].forEach(([label,mode])=>{const b=document.createElement('button');b.className='clip-action';b.textContent=label;b.onclick=()=>regenerateClip(jobId,c,mode,b);actions.appendChild(b)});refine.append(summary,actions);
  const editorial=document.createElement('details');editorial.className='editorial-note';const es=document.createElement('summary');es.textContent='Por qué Hydra eligió este momento';const ep=document.createElement('p');ep.textContent=c.reason;editorial.append(es,ep);
  details.append(clipStatus,titleRow,meta,magic,pack,download,correct);if(!activeResult?.status||activeResult.status==='COMPLETED')details.append(refine);details.append(editorial);card.append(toolbar,shell,preflight,details);clips.appendChild(card)
}
function render(job){activeResult={...job,clips:[...(job.clips||[])]};clips.innerHTML='';resultSummary.innerHTML='';const list=activeResult.clips;const ready=totalClipSeconds(list);resultCopy.textContent=(activeResult.sourceDuration?mediaTime(activeResult.sourceDuration)+' original → ':'')+list.length+' '+(list.length===1?'clip':'clips')+' → '+mediaTime(ready)+' listos';const summaryItems=[];if(activeResult.sourceDuration)summaryItems.push(['Original',mediaTime(activeResult.sourceDuration)]);summaryItems.push(['Clips',String(list.length)]);if(ready>0)summaryItems.push(['Contenido listo',mediaTime(ready)]);if(activeResult.timings?.totalDurationMs)summaryItems.push(['Procesado en',mediaTime(activeResult.timings.totalDurationMs/1000)]);for(const [label,value] of summaryItems){const pill=document.createElement('span');pill.className='summary-pill';pill.innerHTML=label+' <strong>'+value+'</strong>';resultSummary.appendChild(pill)}const generatedFallback=activeResult.completedAt||activeResult.updatedAt||activeResult.createdAt;list.forEach(c=>addClip(c,list.length,activeResult.id,generatedFallback));show('results')}
function queueStateLabel(status){
  if(status==='UPLOADING')return 'Subiendo';
  if(status==='UPLOADED')return 'En cola';
  if(status==='TRANSCRIBING')return 'Entendiendo';
  if(status==='ANALYZING')return 'Analizando';
  if(status==='RENDERING')return 'Editando';
  if(status==='COMPLETED')return '✓ Listo';
  if(status==='FAILED')return 'Error';
  return 'Pendiente';
}
function renderBatchQueue(items){
  batchQueue.innerHTML='';
  batchQueue.hidden=items.length<2;
  if(items.length<2)return;
  items.forEach((item,index)=>{
    const row=document.createElement('div');
    const active=['TRANSCRIBING','ANALYZING','RENDERING'].includes(item.status);
    row.className='batch-item '+(item.status==='COMPLETED'?'done':item.status==='FAILED'?'fail':active?'active':'');
    const num=document.createElement('span');num.className='batch-index';num.textContent=item.status==='COMPLETED'?'✓':String(index+1);
    const name=document.createElement('span');name.className='batch-name';name.textContent=item.name||item.originalFileName||('Video '+(index+1));
    const state=document.createElement('span');state.className='batch-state';state.textContent=queueStateLabel(item.status);
    row.append(num,name,state);batchQueue.appendChild(row);
  });
  const note=document.createElement('div');note.className='batch-note';note.textContent='Hydra procesa un solo video a la vez. Los demás esperan sin consumir procesamiento en paralelo.';batchQueue.appendChild(note);
}
async function fetchJob(id){
  try{const r=await fetch('/api/jobs/'+id);if(!r.ok)return null;return await r.json()}catch{return null}
}
async function pollBatch(ids,initialItems=[]){
  const names=new Map(initialItems.map(item=>[item.id,item.name]));
  for(;;){
    const jobs=(await Promise.all(ids.map(fetchJob))).filter(Boolean);
    if(!jobs.length){await new Promise(r=>setTimeout(r,2200));continue}
    const items=ids.map((id,index)=>{
      const job=jobs.find(j=>j.id===id);
      return job?{...job,name:names.get(id)||job.originalFileName}:{id,name:names.get(id)||('Video '+(index+1)),status:'UPLOADED'};
    });
    renderBatchQueue(items);
    const current=items.find(item=>!['COMPLETED','FAILED','UPLOADED'].includes(item.status))||items.find(item=>item.status==='UPLOADED');
    if(current){
      filenameEl.textContent=current.name||current.originalFileName||'Video en proceso';
      setProgress(current.status);
      uploadMeta.textContent=current.status==='UPLOADED'?'En cola · Hydra lo procesará automáticamente':current.status==='TRANSCRIBING'?'Entendiendo todo lo que se dice…':current.status==='ANALYZING'?'Eligiendo momentos que funcionan por sí solos…':current.status==='RENDERING'?'Aplicando Magic Edit…':'Procesando…';
    }
    const terminal=items.every(item=>item.status==='COMPLETED'||item.status==='FAILED');
    if(terminal){
      localStorage.removeItem(BATCH_KEY);localStorage.removeItem(JOB_KEY);
      await releaseScreen();setPickerBusy(false);
      const completed=items.filter(item=>item.status==='COMPLETED');
      if(items.length===1&&completed.length===1&&currentSection!=='library'){render(completed[0]);return}
      await loadLibrary();return;
    }
    await new Promise(r=>setTimeout(r,2200));
  }
}
async function handleSelectedFiles(fileList){
  const files=Array.from(fileList||[]);
  if(!files.length)return;
  if(files.length>MAX_BATCH_FILES){alert('Puedes seleccionar máximo 3 videos por lote.');input.value='';return}
  const totalBytes=files.reduce((sum,file)=>sum+file.size,0);
  if(totalBytes>MAX_BATCH_BYTES){alert('El lote supera 1 GB. Reduce el tamaño o selecciona menos videos.');input.value='';return}
  pickerDeliveredFile=true;err.hidden=true;setPickerBusy(true);show('processing');void keepScreenAwake();
  const batchItems=files.map((file,index)=>({name:file.name,status:index===0?'UPLOADING':'PENDING'}));
  renderBatchQueue(batchItems);
  const ids=[];
  const serverItems=[];
  try{
    for(let index=0;index<files.length;index++){
      const f=files[index];
      filenameEl.textContent=f.name;
      setProgress('UPLOADING',3);
      batchItems[index].status='UPLOADING';renderBatchQueue(batchItems);
      const sizeMb=f.size/1048576;
      uploadMeta.textContent='Subiendo '+(index+1)+' de '+files.length+' · '+sizeMb.toFixed(1)+' MB';
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const r=await fetch('/api/jobs/upload-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:f.name,contentType:f.type||'application/octet-stream',clientId:clientId()})});
      if(!r.ok)throw new Error(await r.text());
      const u=await r.json();
      ids.push(u.jobId);
      serverItems.push({id:u.jobId,name:f.name,status:'UPLOADING'});
      localStorage.setItem(BATCH_KEY,JSON.stringify(ids));
      await uploadWithProgress(u.uploadUrl,u.headers,f);
      const p=await fetch('/api/jobs/'+u.jobId+'/uploaded',{method:'POST'});
      if(!p.ok)throw new Error(await p.text());
      batchItems[index].status='UPLOADED';renderBatchQueue(batchItems);
    }
    uploadMeta.textContent=files.length>1?'Todos los videos están cargados · Hydra los procesará uno por uno':'Upload completo · iniciando procesamiento…';
    await pollBatch(ids,serverItems);
  }catch(e){fail(e.message||String(e))}
}
again.onclick=()=>{input.value='';pickerDeliveredFile=false;err.hidden=true;localStorage.removeItem(JOB_KEY);localStorage.removeItem(BATCH_KEY);batchQueue.hidden=true;batchQueue.innerHTML='';void releaseScreen();setPickerBusy(false);show('home')};
input.addEventListener('click',()=>{pickerOpenedAt=Date.now();pickerDeliveredFile=false;err.hidden=true});
input.addEventListener('change',()=>void handleSelectedFiles(input.files));

function formatDate(value){try{return new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return value}}
function projectTitle(p){const raw=(p.originalFileName||'').replace(/\.[^.]+$/,'').trim();const ugly=/^[0-9a-f-]{24,}$/i.test(raw)||/^v?\d{10,}/i.test(raw);return ugly?(p.clips?.[0]?.title||'Proyecto HydraReel'):raw}
function openLibraryProject(p){if(p.status!=='COMPLETED'&&!(p.clips||[]).length){localStorage.setItem(JOB_KEY,p.id);void resumeActiveJob(true);return}render({id:p.id,status:p.status,sourceDuration:p.sourceDuration,createdAt:p.createdAt,updatedAt:p.updatedAt,completedAt:p.completedAt,processingDurationMs:p.processingDurationMs,timings:p.processingDurationMs?{totalDurationMs:p.processingDurationMs}:undefined,clips:p.clips||[]})}
function statusLabel(status){if(status==='COMPLETED')return '✓ Listo';if(status==='FAILED')return 'Error';if(status==='UPLOADING')return 'Subiendo';return '● Procesando'}
function statusProgress(status){return pct[status]??(status==='UPLOADED'?23:10)}
async function loadLibrary(){show('library');libraryGrid.innerHTML='<div class="empty">Cargando tus proyectos…</div>';try{const r=await fetch('/api/library',{headers:{'x-hydra-client-id':clientId()}});if(!r.ok)throw new Error('No pudimos cargar tu biblioteca');const projects=await r.json();libraryGrid.innerHTML='';if(!projects.length){libraryGrid.innerHTML='<div class="empty"><b>Aún no tienes proyectos.</b><br>Los trabajos en proceso y los clips terminados aparecerán aquí.</div>';return}for(const p of projects){const card=document.createElement('article');card.className='project-card';const preview=document.createElement('div');preview.className='project-preview';const first=p.clips&&p.clips[0];if(first){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='metadata';v.src=first.url;preview.appendChild(v)}const state=document.createElement('span');state.className='library-status '+(p.status==='COMPLETED'?'done':p.status==='FAILED'?'fail':'live');state.textContent=statusLabel(p.status);preview.appendChild(state);const count=document.createElement('span');count.className='library-count';const clipCount=p.clips?.length||0;count.textContent=p.status==='COMPLETED'?(clipCount+' '+(clipCount===1?'clip':'clips')):(clipCount+' '+(clipCount===1?'listo':'listos')+' · '+statusProgress(p.status)+'%');preview.appendChild(count);const body=document.createElement('div');body.className='project-body';const name=document.createElement('div');name.className='project-name';name.textContent=projectTitle(p);const meta=document.createElement('div');meta.className='project-meta';const readySeconds=totalClipSeconds(p.clips||[]);const parts=[];const generatedProjectAt=p.completedAt||p.updatedAt||p.createdAt;if(generatedProjectAt)parts.push('Generado '+formatDate(generatedProjectAt));if(p.sourceDuration)parts.push(mediaTime(p.sourceDuration)+' original');if(p.status==='COMPLETED')parts.push((p.clips?.length||0)+' '+((p.clips?.length||0)===1?'clip':'clips'));if(readySeconds>0)parts.push(mediaTime(readySeconds)+' listos');meta.textContent=parts.join(' · ');const actions=document.createElement('div');actions.className='project-actions';const view=document.createElement('button');view.className='view-project';view.textContent=p.status==='COMPLETED'?'Ver clips':(p.clips?.length?'Ver '+p.clips.length+' listos':'Ver progreso');view.onclick=()=>openLibraryProject(p);actions.append(view);if(p.status==='COMPLETED'){const del=document.createElement('button');del.className='danger';del.title='Borrar proyecto';del.setAttribute('aria-label','Borrar proyecto');del.onclick=async()=>{if(!confirm('¿Eliminar este proyecto y todos sus clips? Esta acción no se puede deshacer.'))return;del.disabled=true;const dr=await fetch('/api/library/'+p.id,{method:'DELETE',headers:{'x-hydra-client-id':clientId()}});if(!dr.ok){del.disabled=false;alert('No pudimos borrar el proyecto.');return}card.remove();if(!libraryGrid.children.length)libraryGrid.innerHTML='<div class="empty">No tienes proyectos guardados.</div>'};actions.append(del)}body.append(name,meta,actions);card.append(preview,body);libraryGrid.append(card)}}catch(e){libraryGrid.innerHTML='<div class="empty">'+friendlyError(e.message||e)+'</div>'}}
async function resumeActiveJob(showProgress){
  let ids=[];
  try{ids=JSON.parse(localStorage.getItem(BATCH_KEY)||'[]')}catch{ids=[]}
  if(!Array.isArray(ids)||!ids.length){
    const legacy=localStorage.getItem(JOB_KEY);
    if(legacy)ids=[legacy];
  }
  if(!ids.length){if(showProgress)show('home');return false}
  const jobs=(await Promise.all(ids.map(fetchJob))).filter(Boolean);
  if(!jobs.length){localStorage.removeItem(JOB_KEY);localStorage.removeItem(BATCH_KEY);if(showProgress)show('home');return false}
  const terminal=jobs.every(j=>j.status==='COMPLETED'||j.status==='FAILED');
  if(terminal){
    localStorage.removeItem(JOB_KEY);localStorage.removeItem(BATCH_KEY);
    const completed=jobs.filter(j=>j.status==='COMPLETED');
    if(showProgress&&jobs.length===1&&completed.length===1)render(completed[0]);else if(showProgress)await loadLibrary();
    return true;
  }
  setPickerBusy(true);if(showProgress)show('processing');void keepScreenAwake();
  renderBatchQueue(jobs.map(j=>({id:j.id,name:j.originalFileName,status:j.status})));
  void pollBatch(ids,jobs.map(j=>({id:j.id,name:j.originalFileName,status:j.status})));
  return true;
}
navCreate.onclick=()=>void resumeActiveJob(true);
navLibrary.onclick=()=>void loadLibrary();

(async()=>{await resumeActiveJob(true)})();
</script>
</body>
</html>`;

@Controller()
export class WebController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string { return html; }
}
