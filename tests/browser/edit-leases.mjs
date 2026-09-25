// Runs exclusively on a GitHub Actions runner; API fixtures never touch production.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(process.env.BROWSER_PACKAGE + '/package.json');
const { chromium, webkit } = require('playwright');
const origin = process.env.BROWSER_ORIGIN || 'http://127.0.0.1:4173';
const token = 'a'.repeat(43);
const owner = { id: '1', name: 'Owner', username: 'owner', email: 'owner@example.test', photo: '/api/uploads/images/owner.svg' };
const band = {
  id: 1, name: 'Rehearsal', description: 'Browser fixture', ownerId: 1,
  members: [owner, { id: 2, name: 'Alex', username: 'alex', email: 'alex@example.test', photo: '/api/uploads/images/alex.svg' }, { id: 3, name: 'Riley Broken', username: 'riley', email: 'riley@example.test', photo: '/api/uploads/images/missing.svg' }, { id: 4, name: 'Jules', username: 'jules', email: 'jules@example.test' }],
  songLists: [{ id: 11, name: 'Setlist', songs: [
    { id: 21, name: 'First song', originalBand: 'Zulu', updatedAt: '2026-09-20T18:00:00Z', files: [], tablatures: [{ id: 31, name: 'Guitar tab',
      instrument: 'Guitar', instrumentIcon: 'guitar', tuning: 'Standard',
      content: 'Am C G\n' + ('e|---3---5---7---|' + '-'.repeat(100) + '\n').repeat(35),
      commentCount: 2, files: [{ id: '41', name: 'Notes', type: 'text/plain', url: '/fixture.txt' }] }] },
    { id: 22, name: 'Second song', originalBand: 'Álvaro', updatedAt: '2026-09-24T10:00:00Z', files: [], tablatures: [] }
  ] }, { id: 12, name: 'Live set', songs: [] }],
  chatMessages: [{ id: 51, sender: owner, message: '@Alex #[First song](song:21:11) @Alex', timestamp: '2026-09-23T10:00:00Z' }]
};

await mkdir('test-results', {recursive:true});
for (const [engineName, engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser = await engine.launch();
 const fixture = structuredClone(band), tab = fixture.songLists[0].songs[0].tablatures[0];
 let lease = null, failRenew = false, failSave = false, saveCount = 0, serial = 0;
 const errors = [];
 async function session(id,name) {
  const context = await browser.newContext({serviceWorkers:'block'});
  await context.addCookies([{name:'i18next',value:'en',url:origin}]);
  await context.addInitScript(({id,name}) => {
   localStorage.setItem('token','fixture-'+id);
   localStorage.setItem('currentUser',JSON.stringify({id,name,username:name,email:name+'@example.test'}));
   localStorage.setItem('welcome_seen_'+id,'true');localStorage.setItem('i18nextLng','en');
  },{id,name});
  await context.route('**/api/**',async route => {
   const request=route.request(), path=new URL(request.url()).pathname, method=request.method();
   const data=request.postDataJSON(), json=value=>route.fulfill({json:value});
   if(path.endsWith('/edit-lock')) {
    if(lease && lease.until<Date.now()) lease=null;
    if(method==='GET')return json(lease?{locked:true,ownerName:lease.name,expiresAt:new Date(lease.until).toISOString()}:{locked:false});
    if(method==='DELETE'){if(lease?.token===request.headers()['x-tab-edit-token']&&lease.id===id)lease=null;return route.fulfill({status:200});}
    if(data.token && failRenew)return route.fulfill({status:503,json:{message:'Renewal temporarily unavailable'}});
    if(data.token ? !lease||lease.token!==data.token||lease.id!==id : lease||data.content!==tab.content)
     return route.fulfill({status:409,json:{message:'Editing conflict. Preserve your draft.'}});
    lease={id,name,token:data.token||'lease-'+(++serial),until:Date.now()+90000};
    return json({locked:true,ownerName:name,token:lease.token,expiresAt:new Date(lease.until).toISOString()});
   }
   if(path==='/api/tabs/31'&&method==='PUT'){
    saveCount++;
    if(failSave)return route.fulfill({status:503,json:{message:'Save temporarily unavailable'}});
    if(!lease||lease.id!==id||lease.token!==request.headers()['x-tab-edit-token'])return route.fulfill({status:409});
    tab.content=data.content;return json(tab);
   }
   if(path.endsWith('/auth/me')||path.endsWith('/users/'+id))return json({id,name});
   if(path.endsWith('/bands/my-bands'))return json([fixture]);
   if(path.endsWith('/heartbeat'))return json({onlineCount:2});
   if(path.includes('unread-count'))return json(0);
   if(path.endsWith('/unread'))return json(false);
   return json([]);
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin+'/project/1?tab=songs&listId=11&songId=21&tabId=31');
  const cookie=page.getByRole('button',{name:'Understood',exact:true});if(await cookie.isVisible())await cookie.click();
  await page.locator('pre').waitFor();
  return {context,page};
 }
 try {
  const a=await session('1','Owner'),b=await session('2','Alex');
  await a.page.getByRole('button',{name:'Edit tablature',exact:true}).click();
  await a.page.locator('textarea').waitFor();
  await b.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await b.page.getByText('Owner is editing this tablature',{exact:true}).waitFor();
  assert.equal(await b.page.getByRole('button',{name:'Edit tablature',exact:true}).isEnabled(),false);
  await a.page.locator('textarea').fill('Offline draft survives');
  failSave=true;
  await a.page.getByRole('button',{name:'Save',exact:true}).click();
  await a.page.getByText('Error al guardar tablatura',{exact:true}).waitFor();
  assert.equal(await a.page.locator('textarea').inputValue(),'Offline draft survives');
  assert.notEqual(tab.content,'Offline draft survives');
  failRenew=true;
  await a.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await a.page.getByText('Renewal temporarily unavailable',{exact:true}).waitFor();
  assert.equal(await a.page.locator('textarea').getAttribute('readonly'),'');
  assert.equal(await a.page.getByRole('button',{name:'Save',exact:true}).isEnabled(),false);
  assert.equal(saveCount,1);
  // Reload with a persisted draft and an expired server lease.
  lease=null;failRenew=false;failSave=false;
  await a.page.reload();
  await a.page.getByText(/You have an unsaved draft/).waitFor();
  await a.page.getByRole('button',{name:'Edit tablature',exact:true}).click();
  assert.equal(await a.page.locator('textarea').inputValue(),'Offline draft survives');
  await a.page.getByRole('button',{name:'Save',exact:true}).click();
  await a.page.waitForFunction(()=>!document.querySelector('[title="Save"]'));
  assert.equal(tab.content,'Offline draft survives');
  await a.page.getByRole('button',{name:'Close editor',exact:true}).click();
  await a.page.locator('pre').waitFor();
  assert.equal(lease,null);
  await b.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await b.page.waitForFunction(()=>document.querySelector('pre')?.textContent==='Offline draft survives');
  // Background project recovery picks up the new base before editing.
  await b.page.getByRole('button',{name:'Edit tablature',exact:true}).click();
  await b.page.locator('textarea').waitFor();
  await b.page.locator('textarea').fill('Alex unsaved draft');
  // Another client obtains an expired lease and saves different content.
  lease=null;tab.content='New remote version';
  await b.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await b.page.getByRole('button',{name:'Resume editing',exact:true}).waitFor();
  await b.page.getByRole('button',{name:'Resume editing',exact:true}).click();
  assert.equal(await b.page.locator('textarea').inputValue(),'Alex unsaved draft');
  assert.equal(await b.page.getByRole('button',{name:'Save',exact:true}).isEnabled(),false);
  assert.equal(tab.content,'New remote version');
  await b.page.screenshot({path:'test-results/'+engineName+'-edit-draft-conflict.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS '+engineName+' two editor UI ownership, failed save/renewal, read-only lease loss, reload draft, release and stale draft conflict (API fixtures)');
 } finally {await browser.close();}
}
