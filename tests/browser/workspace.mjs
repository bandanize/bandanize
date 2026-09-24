import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const require = createRequire(process.env.BROWSER_PACKAGE + '/package.json');
const { chromium } = require('playwright');
const origin = process.env.BROWSER_ORIGIN || 'http://127.0.0.1:4173';
fs.mkdirSync('test-results', {recursive:true});
(async()=>{
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || undefined,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'es-ES',serviceWorkers:'block'});
const owner={id:'1',name:'Marina',username:'marina',email:'marina@example.test'};
const content='Am              C\nUna melodía para volver\nG               F\nCuando se encienden las luces\n\nESTRIBILLO\nC               G\nSeguimos el ritmo de la ciudad\nAm              F\nY el escenario nos vuelve a llamar\n\ne|---0---3---5---3---|\nB|---1---1---1---1---|\nG|---2---0---2---0---|';
const band={id:1,name:'The Sodawaves',description:'Canciones, ensayos y directos.',photo:'/api/uploads/images/round.svg',ownerId:1,members:[owner,{id:2,name:'Alex',username:'alex',email:'alex@example.test'},{id:3,name:'Jules',username:'jules',email:'jules@example.test'}],songLists:[{id:11,name:'Próximo directo',songs:[{id:21,name:'Luces de la ciudad',originalBand:'The Sodawaves',bpm:112,songKey:'Am',files:[{name:'Demo del ensayo.wav',type:'audio/wav',url:'/api/uploads/audio/demo.wav'},{name:'Directo.mp4',type:'video/mp4',url:'/api/uploads/videos/live.mp4'},{name:'Letra.pdf',type:'application/pdf',url:'/api/uploads/files/lyrics.pdf'},{name:'Notas.txt',type:'text/plain',url:'/api/uploads/files/notes.txt'}],tablatures:[{id:31,name:'Guitarra y voz',instrument:'Guitar',instrumentIcon:'guitar',tuning:'Standard',content,commentCount:1,files:[{name:'Guitarra aislada.wav',type:'audio/wav',url:'/api/uploads/audio/guitar.wav'}]}]},{id:22,name:'Mar abierto',originalBand:'The Sodawaves',bpm:96,songKey:'C',files:[],tablatures:[]}]}],chatMessages:[{id:51,sender:owner,message:'He subido la demo del ensayo. Revisamos el estribillo el jueves.',timestamp:new Date().toISOString()},{id:52,sender:{id:2,name:'Alex'},message:'¡Perfecto! Llevo la nueva línea de bajo.',timestamp:new Date().toISOString()}]};
let comments=[{id:1,sender:owner,message:'Aquí podemos bajar la intensidad antes del estribillo.',timestamp:new Date().toISOString(),anchorStart:18,anchorEnd:40,quote:'Una melodía para volver',attachments:[]}];
const requests=[];let failComment=false;
await context.addInitScript(owner=>{localStorage.setItem('token','fixture');localStorage.setItem('currentUser',JSON.stringify(owner));localStorage.setItem('welcome_seen_1','true');localStorage.setItem('i18nextLng','es');localStorage.setItem('vite-ui-theme','dark');},owner);
await context.addCookies([{name:'i18next',value:'es',url:origin}]);
const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await context.route('**/api/**',async route=>{
 const r=route.request(),path=new URL(r.url()).pathname;requests.push({path,method:r.method(),data:r.postData()});
 if(path.endsWith('round.svg'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><defs><linearGradient id="g"><stop stop-color="#c4d889"/><stop offset="1" stop-color="#866bc7"/></linearGradient></defs><circle cx="120" cy="120" r="119" fill="url(#g)"/><path d="M0 120Q60 40 120 120T240 120V160Q180 80 120 160T0 160" fill="#3d305c"/><text x="120" y="100" fill="white" font-family="Georgia" font-size="21" text-anchor="middle">THE</text><text x="120" y="129" fill="white" font-family="Georgia" font-size="27" text-anchor="middle">SODAWAVES</text></svg>'});
 if(path.endsWith('.wav')){const b=Buffer.alloc(16044);b.write('RIFF');b.writeUInt32LE(16036,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(16000,40);return route.fulfill({contentType:'audio/wav',body:b});}
 if(path.endsWith('/upload/chunk')) return route.fulfill({body:'123_Ensayo acústico.wav'});
 if(path.endsWith('/upload/image')) return route.fulfill({body:'123_Logo nuevo.png'});
 if(path.endsWith('/comments')){
  if(r.method()==='POST'){if(failComment)return route.fulfill({status:400,json:{message:'Selection changed'}});const c={...JSON.parse(r.postData()),id:comments.length+1,sender:owner,timestamp:new Date().toISOString()};comments.push(c);return route.fulfill({json:c});}
  return route.fulfill({json:comments});
 }
 if(path.endsWith('/tabs/31/files')&&r.method()==='POST'){const f=JSON.parse(r.postData());band.songLists[0].songs[0].tablatures[0].files.push(f);return route.fulfill({json:band.songLists[0].songs[0].tablatures[0]});}
 if(path.endsWith('/songs/21/files')&&r.method()==='POST'){const f=JSON.parse(r.postData());band.songLists[0].songs[0].files.push(f);return route.fulfill({json:band.songLists[0].songs[0]});}
 let body=[];
 if(path.endsWith('/auth/me')||path.endsWith('/users/1'))body=owner;
 else if(path.endsWith('/bands/my-bands'))body=[band];
 else if(path.endsWith('/events'))body=[{id:1,name:'Ensayo · preparar el directo',date:'2026-10-01T19:30:00',location:'Local de ensayo',type:'ENSAYO'},{id:2,name:'Concierto en Sala Norte',date:'2026-10-12T21:00:00',location:'Sala Norte',type:'CONCIERTO'}];
 else if(path.includes('unread-count'))body=2;
 else if(path.includes('unread'))body=false;
 else if(path.endsWith('/notifications'))body=[{id:1,title:'Nueva demo',message:'Alex añadió una grabación a Luces de la ciudad',createdAt:new Date().toISOString(),isRead:false,actor:owner,metadata:{},type:'FILE_ADDED'}];
 else if(path.endsWith('/heartbeat'))body={onlineCount:2};
 return route.fulfill({json:body});
});
await page.goto(origin+'/project/1');const cookie=page.getByRole('button',{name:'Entendido',exact:true});if(await cookie.isVisible())await cookie.click();
await page.getByRole('heading',{name:'Repertorio'}).waitFor();await page.screenshot({path:'test-results/project-overview.png',fullPage:true});
assert(!requests.some(r=>r.path.endsWith('/read')),'Overview must not mark messages read');
await page.getByRole('button',{name:/Luces de la ciudad Próximo directo/}).click();await page.waitForURL(/songId=21/);
await page.goto(origin+'/project/1?tab=songs&listId=11&songId=21&tabId=31');await page.locator('pre').waitFor();
await page.getByRole('button',{name:/Ver fragmento/}).click();await page.locator('[data-anchor-line=true]').waitFor();
await page.screenshot({path:'test-results/song-workspace.png',fullPage:true});
await page.getByRole('button',{name:'Demo del ensayo.wav Audio'}).click();const audio=page.locator('[data-global-audio]');await page.waitForFunction(()=>document.querySelector('[data-global-audio]').currentTime>0);assert(await audio.evaluate(a=>!a.paused));await page.getByRole('region',{name:'Reproductor',exact:true}).getByRole('button',{name:'Cerrar reproductor'}).click();
await page.getByRole('button',{name:'Notas.txt Documentos'}).click();assert(await page.getByRole('dialog').getByRole('link',{name:'Descargar: Notas.txt'}).isVisible());await page.keyboard.press('Escape');
await page.locator('pre').evaluate(pre=>{const range=document.createRange();range.selectNodeContents(pre.querySelectorAll(':scope > span')[1]);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);document.dispatchEvent(new Event('selectionchange'));});
await page.getByRole('button',{name:'Comentar selección',exact:true}).click();await page.getByText('Comentando este fragmento',{exact:true}).waitFor();
const input=page.locator('#tab-comment-input');await input.fill('Probamos esta frase más suave.');
await page.locator('.song-comments input[type=file]').setInputFiles({name:'original.wav',mimeType:'audio/wav',buffer:Buffer.from('fixture-audio')});await page.locator('#upload-name').fill('Ensayo acústico');
await page.getByRole('button',{name:'Subir archivo',exact:true}).click();await page.getByText('Ensayo acústico.wav',{exact:true}).waitFor();
failComment=true;await page.getByRole('button',{name:'Enviar comentario'}).click();await page.getByText(/No se pudo guardar/).waitFor();assert.equal(await input.inputValue(),'Probamos esta frase más suave.');
failComment=false;await page.getByRole('button',{name:'Enviar comentario'}).click();await page.waitForFunction(()=>document.querySelector('#tab-comment-input').value==='');
assert.equal(comments.at(-1).quote,'Una melodía para volver');assert.equal(comments.at(-1).attachments[0].name,'Ensayo acústico.wav');
const upload=requests.find(r=>r.path.endsWith('/upload/chunk'));assert(upload.data.includes('Ensayo acústico.wav'));
await page.reload();await page.getByText('Probamos esta frase más suave.',{exact:true}).waitFor();
// Both song and tablature uploads share the rename step.
for (const [area, name, endpoint] of [['.song-media','Demo canción','/songs/21/files'],['.song-tab-media','Demo guitarra','/tabs/31/files']]) {
 await page.locator(area).getByRole('button',{name:'Añadir',exact:true}).click();
 await page.locator('.song-workspace').locator('..').locator('input[type=file]').first().setInputFiles({name:'take.wav',mimeType:'audio/wav',buffer:Buffer.from('take')});
 await page.locator('#upload-name').fill(name);
 await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(endpoint)), page.getByRole('button',{name:'Subir archivo',exact:true}).click()]);
 assert.equal(JSON.parse(requests.find(r=>r.path.endsWith(endpoint)&&r.method==='POST').data).name,name+'.wav');
}
// Cancellation does not upload anything.
const before=requests.filter(r=>r.path.includes('/upload/')).length;await page.locator('.song-comments input[type=file]').setInputFiles({name:'cancel.wav',mimeType:'audio/wav',buffer:Buffer.from('no')});await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(requests.filter(r=>r.path.includes('/upload/')).length,before);
// Rename is shared with project settings, including nested dialogs.
await page.getByRole('button',{name:'Editar proyecto',exact:true}).click();await page.locator('#upload-image').setInputFiles({name:'original.png',mimeType:'image/png',buffer:Buffer.from('fixture')});await page.locator('#upload-name').fill('Logo nuevo');await page.getByRole('button',{name:'Subir archivo',exact:true}).click();await page.waitForTimeout(300);assert(requests.find(r=>r.path.endsWith('/upload/image')).data.includes('Logo nuevo.png'));await page.keyboard.press('Escape');
await page.goto(origin+'/project/1?tab=songs&listId=11');const row=page.locator('[data-song-id="21"]');await row.waitFor();assert.equal(await row.locator('.lucide-grip-vertical').count(),0);
await row.getByRole('button',{name:/Acciones/}).click();await page.getByRole('menu').waitFor();assert(!page.url().includes('songId'));await page.keyboard.press('Escape');
await page.waitForTimeout(250);const a=await row.boundingBox(),b=await page.locator('[data-song-id="22"]').boundingBox();await page.mouse.move(a.x+70,a.y+a.height/2);await page.mouse.down();await page.waitForTimeout(80);await page.mouse.move(b.x+70,b.y+b.height*.9,{steps:20});await page.waitForTimeout(200);await page.mouse.up();await page.waitForTimeout(350);assert(requests.some(r=>r.path.includes('/reorder')));assert(!page.url().includes('songId'));
await page.locator('[data-song-id="21"]').click({position:{x:70,y:25}});await page.waitForURL(/songId=21/);
// A long touch anywhere on a row also reorders on mobile.
await page.setViewportSize({width:390,height:844});await page.goto(origin+'/project/1?tab=songs&listId=11');await page.locator('[data-song-id="21"]').waitFor();
const touchSession=await context.newCDPSession(page);await touchSession.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
await page.locator('[data-song-id="21"]').scrollIntoViewIfNeeded();const touchA=await page.locator('[data-song-id="21"]').boundingBox(),touchB=await page.locator('[data-song-id="22"]').boundingBox();const reorderBefore=requests.filter(r=>r.path.includes('/reorder')).length;
await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchA.x+60,y:touchA.y+20}]});await page.waitForTimeout(240);
for(let i=1;i<=12;i++)await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchA.x+60,y:touchA.y+20+(touchB.y+touchB.height*.9-touchA.y-20)*i/12}]});
await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);assert(requests.filter(r=>r.path.includes('/reorder')).length>reorderBefore,'Mobile long-touch drag');
await touchSession.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touchSession.detach();
for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.goto(origin+'/project/1');await page.getByRole('heading',{name:'Repertorio'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overview overflow '+width);await page.goto(origin+'/project/1?tab=songs&listId=11&songId=21&tabId=31');await page.locator('pre').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'song overflow '+width);if(width===390)await page.screenshot({path:'test-results/song-workspace-mobile.png',fullPage:true});}
await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/dashboard');await page.getByText('The Sodawaves',{exact:true}).waitFor();await page.screenshot({path:'test-results/circular-logo.png',fullPage:true});
await page.getByRole('button',{name:'Nuevo Proyecto',exact:true}).click();await page.locator('#create-upload-image').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from('fixture')});await page.locator('#upload-name').fill('Nueva banda');await page.getByRole('button',{name:'Subir archivo',exact:true}).click();await page.waitForTimeout(200);assert(requests.filter(r=>r.path.endsWith('/upload/image')).at(-1).data.includes('Nueva banda.png'));await page.keyboard.press('Escape');
await page.goto(origin+'/profile');await page.locator('input[type=file]').setInputFiles({name:'profile.png',mimeType:'image/png',buffer:Buffer.from('fixture')});await page.locator('#upload-name').fill('Foto perfil');await page.getByRole('button',{name:'Subir archivo',exact:true}).click();await page.waitForTimeout(200);assert(requests.filter(r=>r.path.endsWith('/upload/image')).at(-1).data.includes('Foto perfil.png'));
assert.deepEqual(errors,[]);fs.writeFileSync('test-results/workspace-results.json',JSON.stringify({passed:true,requests:requests.length,comments:comments.length,errors}));console.log('Workspace browser checks passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


