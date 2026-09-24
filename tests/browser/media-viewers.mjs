import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
const require=createRequire(process.env.BROWSER_PACKAGE+'/package.json');
const {chromium,webkit}=require('playwright');
const origin='http://127.0.0.1:4173';
await mkdir('test-results',{recursive:true});
execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=0x41622a:s=640x360:d=5','-f','lavfi','-i','sine=frequency=220:duration=5','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','test-results/viewer.mp4'],{stdio:'ignore'});
const movie=await readFile('test-results/viewer.mp4');
function pdf() {
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>'];
 for(let i=0;i<2;i++) {
  const content='0.2 0.35 0.1 rg 30 620 530 100 re f\nBT /F1 24 Tf 30 570 Td (Bandanize - Page '+(i+1)+') Tj ET';
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents '+(4+i*2)+' 0 R >>');
  objects.push('<< /Length '+Buffer.byteLength(content)+' >>\nstream\n'+content+'\nendstream');
 }
 objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 let result='%PDF-1.4\n',offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(result));result+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const start=Buffer.byteLength(result);
 result+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
 result+='trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF';
 return Buffer.from(result);
}
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const owner={id:'1',username:'owner',name:'Owner',email:'owner@example.test'};
 const files=[{name:'Rehearsal.mp4',type:'video/mp4',url:'/api/uploads/videos/viewer.mp4'},
 {name:'Valerie - Guitar.pdf',type:'application/octet-stream',url:'/api/uploads/files/score.pdf'},
 {name:'Broken.pdf',type:'application/pdf',url:'/api/uploads/files/broken.pdf'}];
 const band={id:1,name:'Rehearsal',ownerId:1,members:[owner],chatMessages:[],songLists:[{id:11,name:'Setlist',songs:[{id:21,name:'Valerie',files,tablatures:[]}]}]};
 await context.addInitScript(owner=>{
  localStorage.setItem('token','fixture');localStorage.setItem('currentUser',JSON.stringify(owner));
  localStorage.setItem('welcome_seen_1','true');localStorage.setItem('i18nextLng','es');
 },owner);
 await context.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('.pdf'))return route.fulfill({contentType:'application/pdf',headers:{'X-Frame-Options':'DENY'},body:path.endsWith('broken.pdf')?Buffer.from('Not a PDF'):pdf()});
  if(path.endsWith('.mp4')){
   const range=route.request().headers()['range']?.match(/bytes=(\d+)-(\d*)/);
   if(range){const start=Number(range[1]),end=Math.min(movie.length-1,range[2]?Number(range[2]):movie.length-1);
    return route.fulfill({status:206,contentType:'video/mp4',headers:{'accept-ranges':'bytes','content-range':'bytes '+start+'-'+end+'/'+movie.length},body:movie.subarray(start,end+1)});}
   return route.fulfill({contentType:'video/mp4',body:movie});
  }
  let body=[];
  if(path.endsWith('/auth/me')||path.endsWith('/users/1'))body=owner;
  else if(path.endsWith('/bands/my-bands'))body=[band];
  else if(path.endsWith('/heartbeat'))body={onlineCount:1};
  else if(path.includes('unread-count'))body=0;
  else if(path.includes('unread'))body=false;
  await route.fulfill({json:body});
 });
 try {
  await page.goto(origin+'/project/1?tab=songs&listId=11&songId=21');
  const cookie=page.getByRole('button',{name:'Entendido',exact:true});if(await cookie.isVisible())await cookie.click();
  await page.getByRole('button',{name:/^Rehearsal.mp4/}).click();
  const video=page.locator('[data-media-video]');
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
  assert.equal(await video.locator('video').getAttribute('controls'),null);
  await video.getByRole('button',{name:'Reproducir',exact:true}).first().click();
  await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.1);
  await video.getByRole('button',{name:'Pausar',exact:true}).click();
  assert(await video.locator('video').evaluate(v=>v.paused));
  await video.getByRole('button',{name:'Silenciar',exact:true}).click();
  assert(await video.locator('video').evaluate(v=>v.muted));
  const capture=async label=>{
   const png=await page.screenshot({path:'test-results/viewer-'+name+'-'+label+'.png'});
   if(name==='chromium')console.log('VISUAL_IMAGE viewer-'+label+' '+png.toString('base64'));
  };
  await capture('video-desktop');
  if(name==='chromium') {
   await video.getByRole('button',{name:'Pantalla completa',exact:true}).click();
   await page.waitForFunction(()=>!!document.fullscreenElement);
   await video.getByRole('button',{name:'Salir de pantalla completa',exact:true}).click();
   await page.waitForFunction(()=>!document.fullscreenElement);
  }
  await page.getByRole('button',{name:/^Valerie - Guitar.pdf/}).click();
  const dialog=page.getByRole('dialog'),pdfViewer=page.locator('[data-pdf-viewer]');
  await page.waitForFunction(()=>document.querySelector('[data-pdf-viewer] [aria-busy]')?.getAttribute('aria-busy')==='false');
  assert.equal(await dialog.locator('iframe').count(),0);
  assert(await pdfViewer.locator('canvas').evaluate(canvas=>{
   const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   for(let i=0;i<data.length;i+=4)if(data[i+1]>data[i]+15)return true;return false;
  }),'Actual PDF pixels render despite X-Frame-Options DENY');
  await capture('pdf-desktop');
  await pdfViewer.getByRole('button',{name:'Página siguiente'}).click();
  await page.waitForFunction(()=>document.querySelector('canvas[data-pdf-page="2"]')&&document.querySelector('[data-pdf-viewer] [aria-busy]')?.getAttribute('aria-busy')==='false');
  await pdfViewer.getByRole('button',{name:'Acercar',exact:true}).click();
  await pdfViewer.getByText('125%',{exact:true}).waitFor();
  await pdfViewer.getByRole('button',{name:'Ajustar al ancho'}).click();
  await page.setViewportSize({width:320,height:844});
  await page.waitForFunction(()=>document.querySelector('[data-pdf-viewer] [aria-busy]')?.getAttribute('aria-busy')==='false');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const bounds=await pdfViewer.boundingBox();assert(bounds.x>=0 && bounds.x+bounds.width<=320);
  await capture('pdf-mobile');
  await page.keyboard.press('Escape');
  await capture('video-mobile');
  await page.getByRole('button',{name:/^Broken.pdf/}).click();
  await page.getByRole('alert').filter({hasText:'No se pudo mostrar este PDF'}).waitFor();
  assert(await page.getByRole('link',{name:'Abrir original',exact:true}).isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS '+name+' custom video play/pause/mute/fullscreen, PDF blocked-iframe regression, pages/zoom/mobile and corrupt-file fallback');
 } finally {await context.close();await browser.close();}
}
