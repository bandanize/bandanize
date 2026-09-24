import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(process.env.BROWSER_PACKAGE + '/package.json');
const { chromium, webkit } = require('playwright');
const origin='http://127.0.0.1:4173';
for (const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();
 const owner={id:'1',username:'owner',name:'Owner',email:'owner@example.test'};
 let history=[{id:10,sender:owner,message:'Second legacy',timestamp:null},{id:2,sender:owner,message:'First legacy',timestamp:'2020-01-01T12:00:00'}];
 let invitations=[],failSend=true,postCount=0;
 const band={id:1,name:'Live project',ownerId:1,members:[owner],songLists:[],chatMessages:history};
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(owner=>{
  localStorage.setItem('token','fixture');localStorage.setItem('currentUser',JSON.stringify(owner));
  localStorage.setItem('welcome_seen_1','true');localStorage.setItem('i18nextLng','es');
  const original=window.fetch.bind(window);
  window.fetch=(input, options)=>{
   if(String(input).endsWith('/live/events')) {
    const stream=new ReadableStream({start(controller) {
     window.emitLive=change=>controller.enqueue(new TextEncoder().encode('event: change\ndata: '+JSON.stringify(change)+'\n\n'));
     controller.enqueue(new TextEncoder().encode('event: ready\ndata: {}\n\n'));
     options.signal.addEventListener('abort',()=>{try{controller.close();}catch{}});
    }});
    return Promise.resolve(new Response(stream,{headers:{'Content-Type':'text/event-stream'}}));
   }
   return original(input,options);
  };
 },owner);
 await context.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  let body=[];
  if(path.endsWith('/auth/me')||path.endsWith('/users/1'))body=owner;
  else if(path.endsWith('/bands/my-bands'))body=[{...band,chatMessages:history}];
  else if(path.endsWith('/invitations/mine'))body=invitations;
  else if(path.endsWith('/accept')){invitations=[];body='Invitation accepted';}
  else if(path.endsWith('/reject')){invitations=[];body='Invitation rejected';}
  else if(path.endsWith('/chat')&&req.method()==='POST'){
   postCount++;
   if(failSend)return route.fulfill({status:500,json:{message:'Retry later'}});
   body={id:30,sender:owner,message:req.postDataJSON().message,timestamp:'2026-01-01T12:00:00'};
   history.push(body);
  }
  else if(path.endsWith('/chat'))body=history;
  else if(path.endsWith('/heartbeat'))body={onlineCount:1};
  else if(path.includes('unread-count'))body=0;
  else if(path.includes('unread'))body=false;
  await route.fulfill({json:body});
 });
 try {
  await page.goto(origin+'/project/1?tab=chat');
  const cookie=page.getByRole('button',{name:'Entendido',exact:true});if(await cookie.isVisible())await cookie.click();
  await page.getByText('First legacy',{exact:true}).waitFor();
  const order=()=>page.locator('div.rounded-lg.text-sm.break-words').allTextContents();
  assert.deepEqual(await order(),['First legacy','Second legacy']);
  await page.reload();
  await page.getByText('First legacy',{exact:true}).waitFor();
  assert.deepEqual(await order(),['First legacy','Second legacy']);
  const input=page.getByPlaceholder('Escribe un mensaje... (@miembro, #contenido)');
  await input.fill('Keep my draft');await input.press('Enter');
  await page.getByText('No se pudo enviar. Tu mensaje sigue aquí; vuelve a intentarlo.').waitFor();
  assert.equal(await input.inputValue(),'Keep my draft');
  failSend=false;await input.press('Enter');
  await page.getByText('Keep my draft',{exact:true}).waitFor();
  assert.equal(await input.inputValue(),'');assert.equal(postCount,2);
  history.push({id:31,sender:{id:2,name:'Guest'},message:'Incoming without reload',timestamp:null});
  await page.evaluate(()=>window.emitLive({kind:'chat',bandId:1}));
  await page.getByText('Incoming without reload',{exact:true}).waitFor();
  await page.evaluate(()=>window.emitLive({kind:'chat',bandId:1}));
  assert.equal(await page.getByText('Keep my draft',{exact:true}).count(),1);
  await page.goto(origin+'/invitations');
  await page.getByText('No tienes invitaciones pendientes',{exact:true}).waitFor();
  invitations=[{id:55,bandId:2,bandName:'Instant invitation'}];
  await page.evaluate(()=>window.emitLive({kind:'invitations',bandId:2}));
  await page.getByText('Instant invitation',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Aceptar',exact:true}).click();
  await page.getByText('No tienes invitaciones pendientes',{exact:true}).waitFor();
  assert.deepEqual(invitations,[]);
  // A lost push is recovered by background refresh; no navigation or reload.
  invitations=[{id:56,bandId:3,bandName:'Recovered invitation'}];
  await page.getByText('Recovered invitation',{exact:true}).waitFor({timeout:15000});
  await page.getByRole('button',{name:'Rechazar',exact:true}).click();
  await page.getByText('No tienes invitaciones pendientes',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS '+name+' stable legacy chat order, failed-send draft, live arrival/deduplication, instant invitations, accept/reject and lost-push recovery');
 } finally {await context.close();await browser.close();}
}
