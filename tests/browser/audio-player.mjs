// Real media playback, exclusively on the GitHub runner. No production data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(process.env.BROWSER_PACKAGE + '/package.json');
const { chromium, webkit } = require('playwright');
const origin = 'http://127.0.0.1:4173';
await mkdir('test-results', { recursive: true });
const owner = {id:'1',name:'Owner',username:'owner',email:'owner@example.test'};
const file = (name,url) => ({name,url,type:'audio/wav'});
const trackA = file('Demo del ensayo.wav','/api/uploads/audio/demo.wav');
const trackB = file('Bajo — nueva toma.wav','/api/uploads/audio/bass.wav');
const attachment = file('Idea del estribillo.wav','/api/uploads/audio/comment.wav');
const broken = file('Audio pendiente.wav','/api/uploads/audio/missing.wav');
const band = {id:1,name:'Rehearsal',ownerId:1,members:[owner],description:'Audio fixture',chatMessages:[],
 songLists:[{id:11,name:'Setlist',songs:[{id:21,name:'First song',originalBand:'The Sodawaves',files:[trackA,broken],
 tablatures:[{id:31,name:'Guitar',content:'Am C G\nUna melodía para volver',instrument:'Guitar',files:[trackB],commentCount:1}]}]}]};
function wav(seconds=15) {
 const samples=8000*seconds, buffer=Buffer.alloc(44+samples*2);
 buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);
 buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
 buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);
 buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++)buffer.writeInt16LE(Math.round(500*Math.sin(2*Math.PI*220*i/8000)),44+i*2);
 return buffer;
}
for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 let fail=true;const audioRequests=[];
 await context.addCookies([{name:'i18next',value:'es',url:origin}]);
 await context.addInitScript(owner=>{
  localStorage.setItem('token','fixture');localStorage.setItem('currentUser',JSON.stringify(owner));
  localStorage.setItem('welcome_seen_1','true');localStorage.setItem('i18nextLng','es');localStorage.setItem('vite-ui-theme','dark');
 },owner);
 await context.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path.endsWith('.wav')) {
   audioRequests.push(path);
   if(path.endsWith('missing.wav')&&fail)return route.fulfill({status:404,body:'Unavailable'});
   const audio=wav();const range=request.headers()['range']?.match(/bytes=(\d+)-(\d*)/);
   if(range){
    const start=Number(range[1]),end=Math.min(audio.length-1,range[2]?Number(range[2]):audio.length-1);
    return route.fulfill({status:206,contentType:'audio/wav',headers:{'accept-ranges':'bytes','content-range':'bytes '+start+'-'+end+'/'+audio.length},body:audio.subarray(start,end+1)});
   }
   return route.fulfill({contentType:'audio/wav',headers:{'accept-ranges':'bytes'},body:audio});
  }
  let body=[];
  if(path.endsWith('/auth/me')||path.endsWith('/users/1'))body=owner;
  else if(path.endsWith('/bands/my-bands'))body=[band];
  else if(path.endsWith('/heartbeat'))body={onlineCount:1};
  else if(path.endsWith('/comments'))body=[{id:1,sender:owner,message:'Escuchad esta idea',timestamp:new Date().toISOString(),attachments:[attachment]}];
  else if(path.includes('unread-count'))body=0;
  else if(path.includes('unread'))body=false;
  await route.fulfill({json:body});
 });
 try {
  await page.goto(origin+'/project/1?tab=songs&listId=11&songId=21&tabId=31');
  const cookie=page.getByRole('button',{name:'Entendido',exact:true});if(await cookie.isVisible())await cookie.click();
  await page.getByRole('button',{name:'Demo del ensayo.wav Audio',exact:true}).waitFor();
  assert.equal(await page.locator('.floating-audio-player').count(),0);
  assert.equal(audioRequests.length,0,'Never load or autoplay audio before a user asks');
  await page.getByRole('button',{name:'Demo del ensayo.wav Audio',exact:true}).click();
  const panel=page.getByRole('region',{name:'Reproductor',exact:true});
  await page.locator('.floating-audio-player[data-playback="playing"]').waitFor();
  await page.waitForFunction(()=>document.querySelector('[data-global-audio]').currentTime>0.1);
  assert.equal(await page.locator('audio').count(),1);
  assert.equal(await panel.locator('[data-mascot="playing"]').count(),1);
  await panel.locator('.audio-mascot-strip').evaluate(async img=>{await img.decode();});
  const pose = await panel.locator('.audio-mascot-strip').evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(150);
  assert.notEqual(await panel.locator('.audio-mascot-strip').evaluate(el=>getComputedStyle(el).transform),pose,'Playing sprite advances through frames');
  await page.evaluate(()=>window.scrollTo(0,0));
  const capture=async name=>{
   const png=await page.screenshot({path:'test-results/'+name+'.png',animations:'disabled'});
   if(engineName==='chromium')console.log('VISUAL_IMAGE '+name+' '+png.toString('base64'));
  };
  await capture('player-playing-desktop');
  await panel.getByRole('button',{name:'Pausar',exact:true}).click();
  await panel.locator('[data-mascot="waiting"]').waitFor();
  assert(await page.locator('[data-global-audio]').evaluate(a=>a.paused));
  await panel.locator('.audio-mascot-waiting').evaluate(async img=>{await img.decode();});
  await capture('player-waiting-desktop');
  const pausedTime=await page.locator('[data-global-audio]').evaluate(a=>a.currentTime);
  await page.waitForTimeout(300);
  assert.equal(await page.locator('[data-global-audio]').evaluate(a=>a.currentTime),pausedTime);
  await panel.getByRole('button',{name:'Reproducir',exact:true}).click();
  await page.locator('.floating-audio-player[data-playback="playing"]').waitFor();
  // Navigate within the SPA while the originating library unmounts.
  await page.getByRole('tab',{name:/Resumen|Overview/,exact:true}).click();
  assert.equal(await panel.getByText(trackA.name,{exact:true}).count(),1);
  assert(await page.locator('[data-global-audio]').evaluate(a=>!a.paused));
  await page.getByRole('tab',{name:'Canciones',exact:true}).click();
  await page.getByRole('button',{name:trackB.name+' Audio',exact:true}).click();
  await page.locator('.floating-audio-player[data-playback="playing"]').waitFor();
  assert.equal(await panel.getByText(trackB.name,{exact:true}).count(),1);
  assert.equal(await page.locator('audio').count(),1);
  assert(await page.locator('[data-global-audio]').evaluate(a=>a.src.endsWith('/bass.wav')));
  // Seek with the actual range control.
  await panel.getByRole('slider',{name:'Posición del audio'}).focus();
  await page.keyboard.press('End');
  await page.waitForFunction(()=>document.querySelector('[data-global-audio]').ended);
  await page.locator('.floating-audio-player[data-playback="ended"]').waitFor();
  assert.equal(await panel.locator('[data-mascot="waiting"]').count(),1);
  await panel.getByRole('button',{name:'Reproducir',exact:true}).click();
  await page.locator('.floating-audio-player[data-playback="playing"]').waitFor();
  await panel.getByRole('button',{name:'Silenciar',exact:true}).click();
  assert(await page.locator('[data-global-audio]').evaluate(a=>a.muted));
  await panel.getByRole('button',{name:'Activar sonido',exact:true}).click();
  assert(!(await page.locator('[data-global-audio]').evaluate(a=>a.muted)));
  await panel.getByRole('slider',{name:'Volumen',exact:true}).focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator('[data-global-audio]').evaluate(a=>a.volume),0);
  await page.keyboard.press('End');
  assert.equal(await page.locator('[data-global-audio]').evaluate(a=>a.volume),1);
  await page.getByRole('button',{name:attachment.name+' Audio',exact:true}).click();
  await page.locator('.floating-audio-player[data-playback="playing"]').waitFor();
  assert.equal(await panel.getByText(attachment.name,{exact:true}).count(),1);
  await panel.getByRole('button',{name:'Minimizar reproductor'}).click();
  assert(!(await panel.getByRole('slider',{name:'Posición del audio'}).isVisible()));
  await panel.getByRole('button',{name:'Ampliar reproductor'}).click();
  for(const width of [390,320]) {
   await page.setViewportSize({width,height:844});
   const box=await panel.boundingBox();
   assert(box.x>=0 && box.x+box.width<=width && box.y+box.height<=844);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await capture('player-mobile-'+width);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await panel.locator('.audio-mascot-strip').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await panel.getByRole('button',{name:'Cerrar reproductor'}).click();
  assert.equal(await panel.count(),0);
  assert(await page.locator('[data-global-audio]').evaluate(a=>a.paused&&!a.hasAttribute('src')));
  await page.getByRole('button',{name:broken.name+' Audio',exact:true}).click();
  await page.locator('.floating-audio-player[data-playback="error"]').waitFor();
  assert.equal(await panel.locator('[data-mascot="waiting"]').count(),1);
  fail=false;
  await panel.getByRole('button',{name:'Reintentar audio'}).click();
  await page.locator('.floating-audio-player[data-playback="playing"]').waitFor();
  // Logout remounts the session provider and releases its source.
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:'Mi cuenta',exact:true}).click();
  await page.getByRole('menuitem',{name:/Cerrar sesión|Log out|Logout/}).click();
  await page.waitForURL(/login/);
  assert.equal(await page.locator('.floating-audio-player').count(),0);
  assert(await page.locator('[data-global-audio]').evaluate(a=>a.paused&&!a.hasAttribute('src')));
  assert.deepEqual(errors,[]);
  console.log('PASS '+engineName+' real audio, playing/paused mascot, SPA navigation, single source, seeking/end/replay, mute, attachments, mobile, reduced motion, retry and logout');
 } catch(error) {
  const png=await page.screenshot({path:'test-results/player-failure-'+engineName+'.png'});
  console.log('VISUAL_IMAGE player-failure-'+engineName+' '+png.toString('base64'));
  throw error;
 } finally {await context.close();await browser.close();}
}
