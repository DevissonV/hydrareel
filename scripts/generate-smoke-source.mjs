import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const out = process.env.SMOKE_SOURCE ?? path.resolve('fixtures/hydrareel-smoke-source.mp4');
const dir = path.dirname(out);
mkdirSync(dir, { recursive: true });
const text = `HydraReel smoke test. Primer momento. Durante años editar videos largos significaba revisar horas de material. La idea útil es simple: encontrar una historia completa, no solo una frase llamativa. Cuando una historia tiene contexto, tensión y un cierre, funciona mejor como clip independiente. Este es el primer bloque y termina con una conclusión clara.\n\nSegundo momento. Una herramienta de inteligencia artificial no debería inventar timestamps. Debe usar la transcripción real y cortar cerca de límites de frases. Eso hace que el resultado sea verificable y evita clips que comienzan a mitad de una idea. Esta es una lección técnica concreta y autocontenida.\n\nTercer momento. El objetivo de un producto mínimo no es construir una empresa completa en el primer día. Es demostrar una cadena real de valor. En HydraReel esa cadena es un video real, una transcripción real, una selección real y tres archivos MP4 verticales descargables. Si esa cadena funciona, entonces tenemos algo que vale la pena mejorar.`;
const txt = path.join(dir, 'smoke-script.txt');
const wav = path.join(dir, 'smoke-voice.wav');
writeFileSync(txt, text, 'utf8');
try {
  execFileSync('espeak-ng', ['-s', '132', '-v', 'es', '-f', txt, '-w', wav], { stdio: 'inherit' });
} catch {
  try { execFileSync('espeak', ['-s', '132', '-v', 'es', '-f', txt, '-w', wav], { stdio: 'inherit' }); }
  catch { throw new Error('Instala espeak-ng o define SMOKE_SOURCE con un video propio que contenga voz.'); }
}
execFileSync('ffmpeg', ['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x15203a:s=1280x720:r=30','-i',wav,'-shortest','-vf',"drawtext=text='HydraReel MVP-001 Smoke':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=(h-text_h)/2",'-c:v','libx264','-preset','veryfast','-crf','28','-c:a','aac','-b:a','128k','-movflags','+faststart',out], { stdio: 'inherit' });
console.log(out);
