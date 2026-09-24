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
const requests=[];let failComment=false;let legacyMode=false;
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
  if(r.method()==='POST'){if(legacyMode && Object.values(JSON.parse(r.postData())).some(value=>typeof value!=='string'))return route.fulfill({status:400,json:{message:'Legacy string-only request'}});if(failComment)return route.fulfill({status:400,json:{message:'Selection changed'}});const c={...JSON.parse(r.postData()),id:comments.length+1,sender:owner,timestamp:new Date().toISOString()};comments.push(c);return route.fulfill({json:c});}
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

await page.goto(origin+'/project/1?tab=songs&listId=11&songId=21&tabId=31');
const cookie=page.getByRole('button',{name:'Entendido',exact:true});if(await cookie.isVisible())await cookie.click();
await page.locator('pre').waitFor();
// Use real mouse selection, not a manually dispatched selectionchange event.
const line=page.locator('pre > span').nth(1);await line.dblclick({position:{x:12,y:8}});
const bubble=page.getByRole('button',{name:'Comentar selección',exact:true});await bubble.waitFor();
const box=await bubble.boundingBox(),lineBox=await line.boundingBox();assert(box.y+box.height<=lineBox.y+2,'Comment action must be above selected text');
await page.screenshot({path:'test-results/comment-selection.png',fullPage:false});
await bubble.click();await page.waitForTimeout(220);assert.equal(await page.locator('#tab-comment-input').evaluate(el=>document.activeElement===el),true);
assert.equal(await page.getByRole('button',{name:'Mencionar a alguien',exact:true}).count(),0);
assert.equal(await page.getByRole('button',{name:'Comentario general',exact:true}).count(),0);
await page.locator('#tab-comment-input').fill('@');
const alex=page.getByRole('option',{name:'Alex',exact:true});await alex.click();assert.equal(await page.locator('#tab-comment-input').inputValue(),'@Alex ');
await page.locator('#tab-comment-input').fill('@Alex entra aquí');await page.getByRole('button',{name:'Enviar comentario'}).click();await page.waitForTimeout(200);assert.equal(comments.at(-1).message,'@Alex entra aquí');assert(comments.at(-1).quote);
for(const width of [1440,390]){
 await page.setViewportSize({width,height:900});
 await page.getByRole('button',{name:'Comentar una parte',exact:true}).click();const picker=page.getByRole('dialog',{name:'Comentar una parte',exact:true});
 await picker.getByRole('button',{name:'Línea 2: Una melodía para volver',exact:true}).click();await picker.getByRole('button',{name:'Línea 4: Cuando se encienden las luces',exact:true}).click();
 if(width===390)await page.screenshot({path:'test-results/comment-lines-mobile.png'});
 await picker.getByRole('button',{name:'Comentar estas líneas',exact:true}).click();await page.waitForTimeout(220);
 const input=page.locator('#tab-comment-input');assert(await input.evaluate(el=>document.activeElement===el));
 await input.fill('Antes @Al después');await input.evaluate(el=>{el.setSelectionRange(9,9);});await input.press('Backspace');await input.press('l');
 await page.getByRole('option',{name:'Alex',exact:true}).click();assert.equal(await input.inputValue(),'Antes @Alex  después');
 await page.getByRole('button',{name:'Enviar comentario'}).click();await page.waitForTimeout(200);assert.equal(comments.at(-1).quote,content.split('\n').slice(1,4).join('\n'));
}
await page.locator('#tab-comment-input').fill('@');await page.locator('#tab-comment-input').press('ArrowDown');await page.locator('#tab-comment-input').press('Enter');assert.equal(await page.locator('#tab-comment-input').inputValue(),'@Jules ');
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Pantalla completa',exact:true}).click();
await page.getByRole('dialog').locator('pre > span').nth(1).dblclick({position:{x:12,y:8}});await page.getByRole('button',{name:'Comentar selección',exact:true}).click();await page.waitForTimeout(250);assert.equal(await page.getByRole('dialog').count(),0);
await page.getByRole('button',{name:'Pantalla completa',exact:true}).click();
await page.getByRole('button',{name:'Comentar una parte',exact:true}).click();const picker=page.getByRole('dialog',{name:'Comentar una parte',exact:true});await picker.getByRole('button',{name:'Línea 2: Una melodía para volver',exact:true}).click();await picker.getByRole('button',{name:'Comentar estas líneas',exact:true}).click();await page.waitForTimeout(250);assert.equal(await page.getByRole('dialog').count(),0);assert(await page.locator('#tab-comment-input').evaluate(el=>document.activeElement===el));
// The plain path works against the legacy server and never sends an attachments array.
legacyMode=true;await page.getByRole('button',{name:'Quitar selección',exact:true}).click();await page.locator('#tab-comment-input').fill('Sin seleccionar ninguna línea');await page.getByRole('button',{name:'Enviar comentario'}).click();await page.waitForTimeout(200);
assert.deepEqual(JSON.parse(requests.filter(r=>r.path.endsWith('/comments')&&r.method==='POST').at(-1).data),{message:'Sin seleccionar ninguna línea'});assert.equal(comments.at(-1).message,'Sin seleccionar ninguna línea');
// A solo project must not show an empty mention picker or block Enter.
legacyMode=false; band.members=[owner];
await page.reload();await page.locator('pre').waitFor();
await page.getByRole('button',{name:'Comentar una parte',exact:true}).click();
const soloPicker=page.getByRole('dialog',{name:'Comentar una parte',exact:true});
await soloPicker.getByRole('button',{name:'Línea 2: Una melodía para volver',exact:true}).click();
await soloPicker.getByRole('button',{name:'Comentar estas líneas',exact:true}).click();
const soloInput=page.locator('#tab-comment-input');
await soloInput.fill('@nadie Revisar esta frase');
assert.equal(await page.getByRole('listbox').count(),0);
assert.equal(await page.getByText('No se encontraron miembros',{exact:true}).count(),0);
await soloInput.press('Enter');
await page.waitForFunction(()=>document.querySelector('#tab-comment-input')?.value==='');
assert.equal(comments.at(-1).quote,'Una melodía para volver');
assert.equal(content.slice(comments.at(-1).anchorStart,comments.at(-1).anchorEnd),comments.at(-1).quote);
console.log('PASS compact composer and solo-project selected comments with Enter');
// Verify the requested visual order, and the scope of both libraries.
const header=await page.getByText('Luces de la ciudad',{exact:true}).first().boundingBox(),songFiles=await page.locator('.song-media').boundingBox(),workspace=await page.locator('.song-workspace').boundingBox(),commentPanel=await page.locator('.song-comments > div').first().boundingBox(),tabFiles=await page.locator('.song-tab-media').boundingBox();
assert(songFiles.y>header.y && songFiles.y+songFiles.height<=workspace.y);assert(tabFiles.y>=commentPanel.y+commentPanel.height);
await page.screenshot({path:'test-results/song-files-reordered-mobile.png',fullPage:true});
await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/song-files-reordered.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS floating selection, line picker desktop/mobile/fullscreen, mentions and submitted anchors');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
