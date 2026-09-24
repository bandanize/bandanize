// Runs exclusively on a GitHub Actions runner; API fixtures never touch production.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(process.env.BROWSER_PACKAGE + '/package.json');
const { chromium, webkit } = require('playwright');
const origin = 'http://127.0.0.1:4173';
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
await mkdir('test-results', { recursive: true });
async function setup(browser, mobile = false, auth = true, optional = false, timezoneId = 'Europe/Madrid', welcomeSeen = true) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile, isMobile: mobile, timezoneId, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'i18next', value: 'en', url: origin }]);
  await context.addInitScript(({ owner, auth, optional, welcomeSeen }) => {
    localStorage.setItem('i18nextLng', 'en');
    if (welcomeSeen) localStorage.setItem('welcome_seen_1', 'true');
    if (auth) {
      localStorage.setItem('token', 'fixture');
      localStorage.setItem('currentUser', JSON.stringify({ ...owner, photo: undefined }));
    }
    if (optional) {
      window.consentCalls = [];
      window.zaraz = { consent: { APIReady: true,
        purposes: { 'analysis-id': { name: 'Analytics', description: 'Optional test purpose' } },
        getAll: () => ({ 'analysis-id': false }),
        set: values => window.consentCalls.push(values)
      } };
    }
  }, { owner, auth, optional, welcomeSeen });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests = [];
  const fixture = structuredClone(band);
  const controls = { failNextTransfer: false, extraProjects: [], notifications: [], events: [] };
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    requests.push({ path, url: request.url(), method: request.method(), data: request.postData() });
    if (path.endsWith('/calendar/fixture-calendar-token.ics')) {
      await route.fulfill({status:200,contentType:'text/calendar',body:'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'}); return;
    }
    if (path === '/api/bands/1/events') {
      if (request.method() === 'POST') controls.events.push({id:90,...JSON.parse(request.postData())});
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(request.method()==='POST'?controls.events.at(-1):controls.events)}); return;
    }
    if (/^\/api\/events\/\d+$/.test(path)) {
      const id=Number(path.split('/').at(-1)), item=controls.events.find(event=>event.id===id);
      if(request.method()==='DELETE') controls.events=controls.events.filter(event=>event.id!==id);
      if(request.method()==='PUT'&&item) Object.assign(item,JSON.parse(request.postData()));
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(item||{})}); return;
    }
    if (path.startsWith('/api/uploads/images/')) {
      await route.fulfill({ status: path.endsWith('missing.svg') ? 404 : 200, contentType: 'image/svg+xml',
        body: path.endsWith('missing.svg') ? 'not found' : '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#FF96A5"/><circle cx="40" cy="30" r="14" fill="#243020"/><path d="M12 80a28 28 0 0 1 56 0" fill="#243020"/></svg>' });
      return;
    }
    if (/\/songs\/\d+\/(move|replicate|copy)$/.test(path)) {
      if (controls.failNextTransfer) {
        controls.failNextTransfer = false;
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Fixture: try again' }) });
        return;
      }
      const id = Number(path.split('/')[3]);
      const target = fixture.songLists.find(list => String(list.id) === new URL(request.url()).searchParams.get('targetListId'));
      const source = fixture.songLists.find(list => list.songs.some(song => song.id === id));
      const song = structuredClone(source.songs.find(song => song.id === id));
      if (path.endsWith('/move')) source.songs = source.songs.filter(song => song.id !== id);
      if (path.endsWith('/replicate')) { song.id = 99; song.tablatures = []; }
      target.songs.push(song);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(song) });
      return;
    }
    let body = [];
    if (path.endsWith('/auth/me') || path.endsWith('/users/1')) body = owner;
    else if (path.endsWith('/auth/login')) body = { ...owner, token: 'fixture' };
    else if (path.endsWith('/auth/register') || path.includes('/auth/verify')) body = { message: 'OK' };
    else if (path.endsWith('/bands/my-bands')) body = [fixture, ...controls.extraProjects];
    else if (path.includes('/invite-links/')) body = path.endsWith('/accept') ? { bandId: 1 } : { bandName: 'Rehearsal', expiresAt: '2030-01-01T00:00:00Z' };
    else if (path.endsWith('/calendar-token')) body = 'fixture-calendar-token';
    else if (path.endsWith('/heartbeat')) body = { onlineCount: 1 };
    else if (/\/notifications\/\d+\/read$/.test(path)) { const item = controls.notifications.find(item => String(item.id) === path.split('/').at(-2)); if (item) item.isRead = true; body = {}; }
    else if (path.endsWith('/notifications')) body = controls.notifications;
    else if (path.includes('unread-count')) body = controls.notifications.filter(item => !item.isRead).length;
    else if (path.includes('unread')) body = false;
    else if (path.endsWith('/comments')) body = [{ id: 1, message: 'One', sender: owner, timestamp: '2026-09-23T10:00:00Z' }, { id: 2, message: 'Two', sender: owner, timestamp: '2026-09-23T10:00:00Z' }];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { context, page, errors, requests, controls, fixture };
}
async function dismiss(page) {
  const button = page.getByRole('button', { name: 'Understood', exact: true });
  if (await button.isVisible()) await button.click();
}
async function capture(page, name) {
  const bytes = await page.screenshot({ path: 'test-results/' + name + '.png', fullPage: true, animations: 'disabled' });
  if (['visual-cookies', 'visual-library', 'visual-transfer', 'visual-mobile', 'visual-dashboard', 'visual-cookie-mobile', 'projects-single', 'projects-multiple', 'projects-mobile', 'profile-avatars', 'app-navbar-desktop', 'app-navbar-mobile', 'calendar-timezone', 'calendar-refresh', 'calendar-mobile', 'guide-desktop', 'guide-mobile', 'song-sort-desktop', 'song-sort-mobile'].includes(name))
    console.log('VISUAL_IMAGE ' + name + ' ' + bytes.toString('base64'));
}
const browser = await chromium.launch();
try {
  const { context, page, errors } = await setup(browser, false, false, true);
  try {
    await page.goto(origin + '/cookies');
    await page.getByRole('region', { name: 'Cookies and privacy' }).locator('img').waitFor();
    assert(await page.getByRole('region', { name: 'Cookies and privacy' }).locator('img').evaluate(img => img.complete && img.naturalWidth > 0));
    await capture(page, 'visual-cookies');
    await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
    assert.equal(await page.evaluate(() => window.consentCalls.at(-1)['analysis-id']), false);
    await page.reload();
    assert.equal(await page.getByRole('region', { name: 'Cookies and privacy' }).count(), 0);
    await page.getByRole('button', { name: 'Cookie settings', exact: true }).first().click();
    await page.getByRole('checkbox', { name: /Analytics/ }).check();
    await page.getByRole('button', { name: 'Save preferences' }).click();
    assert.equal(await page.evaluate(() => window.consentCalls.at(-1)['analysis-id']), true);
    await page.getByRole('button', { name: 'Cookie settings', exact: true }).first().click();
    await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
    assert.equal(await page.evaluate(() => window.consentCalls.at(-1)['analysis-id']), false);
    for (const path of ['/privacy', '/terms&conditions', '/cookies']) {
      await page.goto(origin + path);
      await page.locator('main h1').waitFor();
      assert.equal(new URL(page.url()).pathname, path);
    }
    await capture(page, 'cookies');
    assert.deepEqual(errors, []);
    console.log('PASS public legal routes and persistent, reversible consent');
  } finally { await context.close(); }


  const narrow = await setup(browser, true, false, true);
  try {
    await narrow.context.addCookies([{ name: 'i18next', value: 'es', url: origin }]);
    await narrow.page.setViewportSize({ width: 320, height: 640 });
    await narrow.page.goto(origin + '/login');
    const banner = narrow.page.getByRole('region', { name: 'Cookies y privacidad' });
    await banner.waitFor();
    for (const name of ['Aceptar opcionales', 'Rechazar opcionales']) {
      const button = banner.getByRole('button', { name, exact: true });
      assert(await button.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Cookie actions must not overflow');
      const box = await button.boundingBox();
      assert(box.x >= 16 && box.x + box.width <= 304 && box.y + box.height <= 624);
    }
    await capture(narrow.page, 'visual-cookie-mobile');
    await banner.getByRole('button', { name: 'Rechazar opcionales', exact: true }).click();
    assert.equal(await banner.count(), 0);
    assert.deepEqual(narrow.errors, []);
    console.log('PASS Spanish cookie illustration and actions fit a 320px viewport');
  } finally { await narrow.context.close(); }

  const test = await setup(browser);
  try {
    const { page, requests, errors } = test;
    await page.goto(origin + '/project/1?tab=songs&listId=11');
    await dismiss(page);
    await page.locator('[aria-label="2 comments"]').waitFor();
    assert.equal(await page.locator('[aria-label="1 tabs"]').count(), 1);
    assert.equal(await page.locator('[aria-label="1 files"]').count(), 1);
    const row = page.locator('[data-handler-id]').filter({ has: page.getByText('First song', { exact: true }) });
    const second = page.locator('[data-handler-id]').filter({ has: page.getByText('Second song', { exact: true }) });
    const handle = await row.boundingBox(), target = await second.boundingBox();
    assert(handle && target);
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
          await page.waitForTimeout(50);
    await page.waitForTimeout(50);
    await page.mouse.move(target.x + 20, target.y + target.height * .8, { steps: 15 });
    await page.locator('.fixed.pointer-events-none').filter({ hasText: 'First song' }).waitFor();
    await capture(page, 'drag-preview');
    await page.mouse.up();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-handler-id]')].filter(el => /First song|Second song/.test(el.textContent)).map(el => el.textContent).join('|').startsWith('Second song'));
    assert(requests.some(request => request.path.includes('reorder')));
    await page.goto(origin + '/project/1?tab=chat');
    await page.getByText('@Alex', { exact: true }).first().waitFor();
    assert.equal(await page.getByText('@Alex', { exact: true }).count(), 2);
    assert.equal(await page.getByText('@Alex', { exact: true }).first().evaluate(el => getComputedStyle(el).color), 'rgb(41, 65, 10)');
    await page.getByRole('button', { name: /First song/ }).click();
    await page.waitForURL(/songId=21/);
    await page.goto(origin + '/project/1?tab=calendar');
    await page.getByRole('button', { name: /Google Calendar/ }).click();
    const link = page.locator('a[href*="calendar.google.com/calendar/render"]');
    await link.waitFor();
    assert.match(await link.getAttribute('href'), /fixture-calendar-token/);
    await capture(page, 'calendar-link');
    assert.deepEqual(errors, []);
    console.log('PASS song counters, animated drag, mention navigation and calendar link');
  } finally { await test.context.close(); }


  // Cross-playlist drops ask before mutation, preserve source on cancel/error, and distinguish copying.
  for (const mobile of [false, true]) {
    const test = await setup(browser, mobile);
    const { page, context, requests, controls } = test;
    const transfers = () => requests.filter(request => /\/songs\/\d+\/(move|copy|replicate)$/.test(request.path));
    try {
      await page.goto(origin + '/project/1?tab=songs&listId=11');
      await dismiss(page);
      const row = page.locator('[data-song-id="21"]');
      await row.waitFor();
      assert((await row.boundingBox()).height <= 60, 'Song rows stay compact');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow');
      await capture(page, mobile ? 'visual-mobile' : 'visual-library');
      const drop = async () => {
        const handle = await row.boundingBox();
        const target = await page.locator(mobile ? '[data-mobile-playlist-id="12"]' : '[data-playlist-id="12"]').boundingBox();
        assert(handle && target);
        const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
        const to = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
        if (mobile) {
          const session = await context.newCDPSession(page);
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
          await page.waitForTimeout(240);
          for (let step = 1; step <= 12; step++) await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * step / 12, y: from.y + (to.y - from.y) * step / 12 }]
          });
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await session.detach();
        } else {
          await page.mouse.move(from.x, from.y);
          await page.mouse.down();
          await page.waitForTimeout(50);
          await page.mouse.move(to.x, to.y, { steps: 15 });
          await page.mouse.up();
        }
        await page.getByRole('dialog', { name: 'Move or duplicate song' }).waitFor();
      };
      await drop();
      assert.equal(transfers().length, 0, 'Dropping does not change playlists');
      if (!mobile) await capture(page, 'visual-transfer');
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(transfers().length, 0);
      await drop();
      controls.failNextTransfer = true;
      await page.getByRole('button', { name: /^Move Remove/ }).click();
      await page.getByText('Could not update the playlist. Please try again.', { exact: true }).waitFor();
      assert(await page.getByRole('dialog', { name: 'Move or duplicate song' }).isVisible());
      await page.getByRole('button', { name: /^Duplicate Keep/ }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await row.count(), 1, 'Duplicate keeps source');
      await drop();
      await page.getByRole('button', { name: /^Move Remove/ }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await row.count(), 0, 'Move removes source');
      assert.deepEqual(transfers().map(request => request.path.split('/').at(-1)), ['move', 'replicate', 'move']);
      await page.goto(origin + '/project/1?tab=songs&listId=12');
      await page.locator('[data-song-id="21"]').waitFor();
      assert.equal(await page.locator('[data-song-id="99"]').count(), 1, 'Independent copy and moved song both reach target');
      if (!mobile) {
        await page.goto(origin + '/dashboard');
        await page.locator('.group[role="button"]').filter({ hasText: 'Rehearsal' }).waitFor();
        await capture(page, 'visual-dashboard');
      }
      assert.deepEqual(test.errors, []);
      console.log('PASS ' + (mobile ? 'touch mobile' : 'desktop') + ' compact rows, drop cancellation, failed-request retry, duplicate and move');
    } catch (error) { await capture(page, mobile ? 'mobile-transfer-failure' : 'desktop-transfer-failure'); throw error; }
    finally { await context.close(); }
  }



  const sorting = await setup(browser);
  try {
    const {page, fixture, requests, errors} = sorting;
    fixture.songLists[0].songs.push({id:23,name:'No artist yet',files:[],tablatures:[]});
    await page.goto(origin+'/project/1?tab=songs&listId=11'); await dismiss(page);
    const order=()=>page.locator('[data-song-id]').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-song-id')));
    const expectOrder=async expected=>{
      await page.waitForFunction(ids=>JSON.stringify([...document.querySelectorAll('[data-song-id]')].map(row=>row.getAttribute('data-song-id')))===JSON.stringify(ids),expected);
      assert.deepEqual(await order(),expected);
    };
    const select=async name=>{
      await page.getByRole('combobox',{name:'Sort songs',exact:true}).click();
      await page.getByRole('option',{name,exact:true}).click();
    };
    await page.locator('[data-song-id="23"]').waitFor();
    await expectOrder(['21','22','23']);
    const activity=page.locator('[data-song-id="21"] time');
    assert.equal(await activity.getAttribute('datetime'),'2026-09-20T18:00:00.000Z');
    assert.match(await activity.getAttribute('aria-label'),/^Last activity:/);
    assert((await activity.innerText()).length>0);
    assert.equal(await page.locator('[data-song-id="23"] time').count(),0);
    await page.locator('[data-song-id="23"]').getByText('No date',{exact:true}).waitFor();
    await select('Artist');
    await expectOrder(['22','21','23']);
    await select('Recent changes');
    await page.waitForFunction(()=>document.querySelector('[data-song-id]')?.getAttribute('data-song-id')==='22');
    await expectOrder(['22','21','23']);
    // Returning from a song picks up server-side edits/comments without losing the selected sort.
    await page.locator('[data-song-id="21"] [role="button"]').click();
    await page.getByRole('button',{name:'Back to songs',exact:true}).waitFor();
    fixture.songLists[0].songs[0].updatedAt=new Date(Date.now()-60000).toISOString();
    await page.getByRole('button',{name:'Back to songs',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-song-id]')?.getAttribute('data-song-id')==='21');
    await expectOrder(['21','22','23']);
    await select('Established order');
    await expectOrder(['21','22','23']);
    assert.equal(requests.filter(r=>r.path.endsWith('/reorder')).length,0);
    await select('Artist'); await capture(page,'song-sort-desktop');
    await page.reload(); await page.locator('[data-song-id="23"]').waitFor();
    await expectOrder(['22','21','23']);
    // In-list dragging must not persist a different manual order while using a computed sort.
    const first=await page.locator('[data-song-id="22"]').boundingBox(),last=await page.locator('[data-song-id="21"]').boundingBox();
    await page.mouse.move(first.x+50,first.y+first.height/2);await page.mouse.down();await page.waitForTimeout(70);
    await page.mouse.move(last.x+50,last.y+last.height-2,{steps:12});await page.mouse.up();
    await expectOrder(['22','21','23']);
    assert.equal(requests.filter(r=>r.path.endsWith('/reorder')).length,0);
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.getByRole('combobox',{name:'Sort songs',exact:true}).click();
      await page.getByRole('option',{name:'Recent changes',exact:true}).click();
      await expectOrder(['21','22','23']);
      for (const row of await page.locator('[data-song-id]').all()) {
        assert((await row.boundingBox()).height <= 58, 'Activity must keep rows compact');
        assert(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      }
      if(width===390) await capture(page,'song-sort-mobile');
    }
    await page.getByRole('combobox',{name:'Idioma / Language'}).click();
    await page.getByRole('option',{name:'Español',exact:true}).click();
    await page.locator('[data-song-id="21"] time[aria-label^="Última actividad:"]').waitFor();
    await page.locator('[data-song-id="23"]').getByText('Sin fecha',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS song activity timestamps, localized exact dates, missing-date fallback and compact mobile rows');
    console.log('PASS song sorts preserve manual order, put unknown artists/dates last, survive navigation/reload and refresh recent changes');
  } catch(error) {
    console.log('SORT_DIAGNOSTIC',sorting.page.url(),await sorting.page.locator('[data-song-id]').evaluateAll(rows=>rows.map(row=>({id:row.getAttribute('data-song-id'),text:row.innerText}))),sorting.requests.filter(r=>r.path.endsWith('my-bands')).length);
    throw error;
  } finally {await sorting.context.close();}

  const picker = await setup(browser);
  try {
    const { page, controls, errors } = picker;
    await page.goto(origin + '/dashboard');
    await dismiss(page);
    const first = page.locator('[data-project-id="1"]');
    await first.waitFor();
    assert((await first.boundingBox()).width > 1000, 'A single project gets a complete featured card');
    await first.locator('img[alt="Owner"]').waitFor();
    assert(await first.locator('img[alt="Owner"]').evaluate(img => img.complete && img.naturalWidth > 0));
    await page.locator('header img[alt="Owner"]').waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('currentUser')).photo), owner.photo);
    await capture(page, 'projects-single');
    controls.extraProjects = [
      { ...structuredClone(band), id: 2, name: 'Acoustic sessions', description: 'Ideas for the next set', songLists: [] },
      { ...structuredClone(band), id: 3, name: 'Studio nights', description: 'Demos and recordings', songLists: [], photo: '/api/uploads/images/cover.svg' }
    ];
    await page.reload();
    await page.locator('[data-project-id="3"]').waitFor();
    assert.equal(await page.locator('[data-project-id]').count(), 3);
    assert((await first.boundingBox()).width < 600);
    await capture(page, 'projects-multiple');
    await first.click();
    await page.getByRole('button', { name: 'Switch musical project' }).click();
    await page.getByRole('menuitem', { name: 'Acoustic sessions', exact: true }).click();
    await page.waitForURL('**/project/2');
    await page.getByRole('heading', { name: 'Acoustic sessions', exact: true }).waitFor();
    await page.goto(origin + '/project/1?tab=members');
    await page.locator('img[alt="Alex"]').waitFor();
    assert.equal(await page.locator('img[alt="Riley Broken"]').count(), 0);
    await page.getByText('RB', { exact: true }).waitFor();
    await page.getByText('J', { exact: true }).waitFor();
    await capture(page, 'profile-avatars');
    await page.goto(origin + '/project/1?tab=chat');
    await page.locator('img[alt="Owner"]').first().waitFor();
    await page.goto(origin + '/project/1?tab=songs&listId=11&songId=21&tabId=31');
    await page.locator('img[alt="Owner"]').first().waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/dashboard');
    await page.locator('[data-project-id="3"]').waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await capture(page, 'projects-mobile');
    assert.deepEqual(errors, []);
    console.log('PASS one/multiple project layouts, switching, profile photos and failed/missing photo fallbacks');
  } finally { await picker.context.close(); }


  const navbar = await setup(browser);
  try {
    const { page, errors } = navbar;
    await page.goto(origin + '/project/1?tab=songs&listId=11');
    await dismiss(page);
    const sections = page.getByRole('tablist', { name: 'Project sections' });
    await sections.waitFor();
    assert.equal(await sections.getByRole('tab').count(), 6);
    assert((await page.locator('header').boundingBox()).height <= 80, 'Header stays compact');
    for (const [name, value] of [['Chat', 'chat'], ['Songs', 'songs']]) {
      await sections.getByRole('tab', { name, exact: true }).click();
      await page.waitForURL(new RegExp('tab=' + value));
      await sections.getByRole('tab', { name, exact: true }).and(page.locator('[aria-selected="true"]')).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('listId'), '11');
    }
    await page.getByRole('button', { name: 'My account', exact: true }).click();
    await page.getByRole('menuitem', { name: /Invitations/ }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'My account');
    await capture(page, 'app-navbar-desktop');
    for (const width of [768, 640, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Navbar must fit narrow screens');
      assert(await sections.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      for (const tab of await sections.getByRole('tab').all()) {
        const box = await tab.boundingBox();
        assert(box.x >= 0 && box.x + box.width <= width && box.height >= (width >= 768 ? 36 : 44));
        assert((await tab.innerText()).trim().length > 0, 'Mobile tabs retain readable labels');
      }
      await page.getByRole('combobox', { name: 'Idioma / Language' }).click();
      await page.getByRole('option', { name: 'Español', exact: true }).click();
      await page.getByRole('tablist', { name: 'Secciones del proyecto' }).waitFor();
      await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
      await page.keyboard.press('Escape');
      if (width === 390) await capture(page, 'app-navbar-mobile');
      await page.getByRole('combobox', { name: 'Idioma / Language' }).click();
      await page.getByRole('option', { name: 'English', exact: true }).click();
      await sections.waitFor();
    }
    await page.getByRole('button', { name: 'Back to Dashboard', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('button', { name: 'My account', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS compact app navbar, visible mobile sections, language, account keyboard focus and existing deep links');
  } finally { await navbar.context.close(); }


  const activity = await setup(browser);
  try {
    const { page, controls, requests, errors } = activity;
    controls.notifications = ['TAB_COMMENT_ADDED','TAB_COMMENT_MENTION'].map((type,index)=>({
      id:index+81,type,actor:owner,metadata:{tabName:'Guitar',tabId:'31',songId:'21',commentId:'1'},isRead:false,createdAt:'2026-09-23T10:00:00Z'
    }));
    await page.goto(origin+'/project/1?tab=notifications'); await dismiss(page);
    const note = page.locator('[data-notification-id="81"]');
    await note.waitFor();
    assert.match(await note.innerText(),/commented on the tablature/);
    assert.match(await page.locator('[data-notification-id="82"]').innerText(),/mentioned you in a comment/);
    for (let attempt=0;attempt<2;attempt++) {
      await note.click();
      await page.waitForURL(/tabId=31/);
      await page.locator('[data-tab-comment-id="1"]').waitFor();
      await page.getByRole('tab',{name:'Notifications',exact:true}).click();
      await note.waitFor();
      assert.equal(await note.getAttribute('data-read'),'true');
      assert.equal(await page.locator('[data-notification-id="82"]').getAttribute('data-read'),'false');
    }
    assert.equal(requests.filter(r=>r.path.endsWith('/81/read')).length,1);
    assert.equal(requests.filter(r=>r.path.endsWith('/mark-read')).length,0);
    assert.deepEqual(errors,[]);
    console.log('PASS tab comment notifications link to score, mark only opened item and remain clickable when read');
  } finally {await activity.context.close();}


  for (const [zone, expected] of [['Europe/Madrid','20:00'],['America/New_York','14:00']]) {
    const calendar = await setup(browser,false,true,false,zone);
    try {
      const {page,controls,requests,errors} = calendar;
      controls.events = [{id:71,name:'Timezone rehearsal',date:'2027-07-20T20:00:00',startsAt:'2027-07-20T18:00:00Z',timeZone:'Europe/Madrid',type:'ENSAYO',location:'Studio'}];
      await page.goto(origin+'/project/1?tab=calendar'); await dismiss(page);
      await page.getByText('Timezone rehearsal',{exact:true}).waitFor();
      await page.locator('[data-calendar-event="71"]').filter({hasText:expected}).waitFor();
      await page.getByText('Times shown in your zone: '+zone,{exact:true}).waitFor();
      await page.getByRole('button',{name:'Google Calendar',exact:true}).click();
      const info = page.getByRole('dialog');
      await info.getByRole('link',{name:'Add to Google Calendar',exact:true}).waitFor();
      assert.equal(await info.getByRole('link').count(),1,'One clear Google Calendar action');
      assert.match(await info.getByRole('link',{name:'Add to Google Calendar',exact:true}).getAttribute('href'),/fixture-calendar-token/);
      await info.getByText(/Clicking again does not force a refresh/).waitFor();
      await page.setViewportSize({width:390,height:844});
      if(zone==='Europe/Madrid') await capture(page,'calendar-timezone');
      await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Create event',exact:true}).first().click();
      const form = page.getByRole('dialog');
      assert.equal(await form.getByLabel('Event time zone',{exact:true}).inputValue(),zone);
      await form.getByPlaceholder('Event name',{exact:true}).fill('Local rehearsal');
      await form.locator('input[type=date]').fill('2027-07-21');
      await form.locator('input[type=time]').fill('19:30');
      await form.getByRole('button',{name:'Create event',exact:true}).click();
      await form.waitFor({state:'detached'});
      const created=JSON.parse(requests.filter(r=>r.path==='/api/bands/1/events'&&r.method==='POST').at(-1).data);
      assert.equal(created.date,'2027-07-21T19:30:00'); assert.equal(created.timeZone,zone);
      assert.deepEqual(errors,[]);
      console.log('PASS calendar displays viewer timezone and submits explicit event timezone: '+zone);
    } finally {await calendar.context.close();}
  }


  const usability=await setup(browser,false,true,false,'Europe/Madrid',false);
  try {
    const {page,controls,requests,errors}=usability;
    controls.events=[{id:71,name:'Next rehearsal',date:'2027-07-20T20:00:00',startsAt:'2027-07-20T18:00:00Z',timeZone:'Europe/Madrid',type:'ENSAYO',location:'Studio A'}];
    await page.goto(origin+'/project/1?tab=calendar'); await dismiss(page);
    await page.locator('[data-calendar-event="71"]').waitFor();
    await capture(page,'calendar-refresh');
    const initial=await page.locator('[data-calendar-day]').first().getAttribute('data-calendar-day');
    await page.getByRole('button',{name:'Next month',exact:true}).click();
    await page.waitForFunction(previous=>document.querySelector('[data-calendar-day]')?.getAttribute('data-calendar-day')!==previous,initial);
    await page.getByRole('button',{name:'Previous month',exact:true}).click();
    await page.waitForFunction(previous=>document.querySelector('[data-calendar-day]')?.getAttribute('data-calendar-day')===previous,initial);
    await page.locator('[data-calendar-day]').first().click();
    assert.equal(await page.getByRole('dialog').count(),0,'Selecting a day shows its agenda rather than creating an event');
    await page.getByText('This day is free',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Upcoming',exact:true}).click();
    await page.locator('[data-calendar-event="71"]').click();
    const editor=page.getByRole('dialog');
    assert.equal(await editor.getByLabel('Event time zone',{exact:true}).inputValue(),'Europe/Madrid');
    assert.equal(await editor.getByLabel('Time',{exact:true}).inputValue(),'20:00');
    page.once('dialog',dialog=>dialog.dismiss());
    await editor.getByRole('button',{name:'Delete event',exact:true}).click();
    assert(await editor.isVisible(),'Cancel deletion keeps the edit dialog open');
    assert.equal(requests.filter(r=>r.method==='DELETE').length,0);
    await page.keyboard.press('Escape');
    for(const width of [390,320]){
      await page.setViewportSize({width,height:740});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.locator('[data-calendar-day]').first().click();
      await page.getByText('This day is free',{exact:true}).waitFor();
      if(width===390) await capture(page,'calendar-mobile');
      await page.getByRole('button',{name:'Upcoming',exact:true}).click();
    }
    await page.setViewportSize({width:1280,height:900});
    await page.goto(origin+'/dashboard');
    await page.evaluate(()=>localStorage.removeItem('welcome_seen_1'));
    await page.reload();
    const welcome=page.getByRole('dialog',{name:'Your music, in good company',exact:true});
    await welcome.waitFor();
    await welcome.locator('img').evaluate(img=>img.decode());
    await capture(page,'guide-desktop');
    for(let step=1;step<5;step++) {
      await welcome.getByRole('button',{name:'Next',exact:true}).click();
      await welcome.getByText('Step '+(step+1)+' of 5',{exact:true}).waitFor();
    }
    await welcome.getByRole('button',{name:'Get started',exact:true}).click();
    await welcome.waitFor({state:'detached'});
    await page.reload();
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.getByRole('button',{name:'My account',exact:true}).click();
    await page.getByRole('menuitem',{name:'Bandanize guide',exact:true}).click();
    const guide=page.getByRole('dialog',{name:'Your Bandanize guide',exact:true});
    await guide.getByText('Step 1 of 5',{exact:true}).waitFor();
    await page.setViewportSize({width:320,height:568});
    await guide.getByRole('button',{name:'Work on each part of the song',exact:true}).click();
    await guide.getByText('Step 4 of 5',{exact:true}).waitFor();
    assert(await guide.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    const bounds=await guide.boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=321&&bounds.y+bounds.height<=569);
    await capture(page,'guide-mobile');
    await page.keyboard.press('Escape'); await guide.waitFor({state:'detached'});
    await page.goto(origin+'/project/1?tab=calendar');
    await page.getByRole('button',{name:'My account',exact:true}).click();
    await page.getByRole('menuitem',{name:'Bandanize guide',exact:true}).click();
    await page.getByRole('dialog',{name:'Your Bandanize guide',exact:true}).waitFor();
    await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);
    console.log('PASS calendar agenda/month navigation, single Google action, delete cancellation, first welcome and reusable guide at 320px');
  } finally {await usability.context.close();}

  const invite = await setup(browser, false, false);
  try {
    const { page, errors } = invite;
    await page.goto(origin + '/join/' + token);
    await dismiss(page);
    await page.getByRole('link', { name: 'Create account', exact: true }).click();
    await page.locator('#email').waitFor();
    assert.match(await page.evaluate(() => localStorage.getItem('bandanize.pendingInvite')), new RegExp(token));
    await page.locator('#name').fill('Owner');
    await page.locator('#username').fill('owner');
    await page.locator('#email').fill('Owner@Example.test');
    await page.locator('#password').fill('fixture-password');
    await page.locator('form button[type=submit]').click();
    await page.getByText('Check your email', { exact: true }).waitFor();
    await page.goto(origin + '/verify-email?token=fixture-verification');
    await page.waitForURL('**/login');
    await page.locator('#username').fill('owner@example.test');
    await page.locator('#password').fill('fixture-password');
    await page.locator('form button[type=submit]').click();
    await page.waitForURL('**/join/' + token);
    await page.getByRole('button', { name: 'Join project', exact: true }).click();
    await page.waitForURL('**/project/1');
    await page.getByRole('heading', { name: 'Rehearsal' }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('bandanize.pendingInvite')), null);
    assert.deepEqual(errors, []);
    console.log('PASS invitation survives account entry and resumes after sign-in');
  } finally { await invite.context.close(); }
} finally { await browser.close(); }

for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  const { context, page, errors } = await setup(browser, true);
  try {
    await page.goto(origin + '/project/1?tab=songs&listId=11&songId=21&tabId=31');
    await dismiss(page);
    await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await dialog.getByRole('combobox', { name: 'Font size' }).selectOption('4');
    await dialog.evaluate(async el => { await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))); });
    const box = await dialog.boundingBox();
    assert(box && box.x >= 0 && box.y >= 0 && box.width >= 370 && box.height >= 820, JSON.stringify(box));
    assert(box.x + box.width <= 391 && box.y + box.height <= 845);
    assert.equal(await dialog.locator('pre').evaluate(el => getComputedStyle(el).fontSize), '20px');
    assert.equal(await dialog.locator('pre button').first().evaluate(el => getComputedStyle(el).fontSize), '20px');
    const reading = await dialog.locator('pre').boundingBox();
    assert(reading.height > 600, JSON.stringify(reading));
    assert.equal(await dialog.locator('pre').evaluate(el => getComputedStyle(el).whiteSpace), 'pre-wrap');
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const pre = dialog.locator('pre');
      assert(await pre.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Long tab lines must wrap without horizontal scrolling');
      assert.equal(await pre.textContent(), band.songLists[0].songs[0].tablatures[0].content, 'Wrapping must not change tab content or comment offsets');
      assert(await pre.locator(':scope > span').nth(1).evaluate(el => el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).lineHeight) * 2), 'Long line must visibly occupy multiple rows');
    }
    await dialog.getByRole('button', { name: 'Edit tablature', exact: true }).click();
    assert(await dialog.locator('textarea').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Mobile editing must also wrap');
    await dialog.getByRole('button', { name: 'View chords', exact: true }).click();
    await capture(page, name + '-mobile-fullscreen');
    await dialog.getByRole('button', { name: /Exit fullscreen|Salir de pantalla completa/i }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert(await page.locator('pre').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Normal mobile view must wrap too');
    assert.deepEqual(errors, []);
    console.log('PASS ' + name + ' mobile viewport, scrolling, font size and exit');
  } catch (error) { await capture(page, name + '-failure'); throw error; }
  finally { await context.close(); await browser.close(); }
}

