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
    { id: 21, name: 'First song', files: [], tablatures: [{ id: 31, name: 'Guitar tab',
      instrument: 'Guitar', instrumentIcon: 'guitar', tuning: 'Standard',
      content: 'Am C G\n' + ('e|---3---5---7---|' + '-'.repeat(100) + '\n').repeat(35),
      commentCount: 2, files: [{ id: '41', name: 'Notes', type: 'text/plain', url: '/fixture.txt' }] }] },
    { id: 22, name: 'Second song', files: [], tablatures: [] }
  ] }, { id: 12, name: 'Live set', songs: [] }],
  chatMessages: [{ id: 51, sender: owner, message: '@Alex #[First song](song:21:11) @Alex', timestamp: '2026-09-23T10:00:00Z' }]
};
await mkdir('test-results', { recursive: true });
async function setup(browser, mobile = false, auth = true, optional = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile, isMobile: mobile, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'i18next', value: 'en', url: origin }]);
  await context.addInitScript(({ owner, auth, optional }) => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('welcome_seen_1', 'true');
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
  }, { owner, auth, optional });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests = [];
  const fixture = structuredClone(band);
  const controls = { failNextTransfer: false, extraProjects: [] };
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    requests.push({ path, url: request.url(), method: request.method(), data: request.postData() });
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
    else if (path.includes('unread-count')) body = 0;
    else if (path.includes('unread')) body = false;
    else if (path.endsWith('/comments')) body = [{ id: 1, message: 'One', sender: owner, timestamp: '2026-09-23T10:00:00Z' }, { id: 2, message: 'Two', sender: owner, timestamp: '2026-09-23T10:00:00Z' }];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { context, page, errors, requests, controls };
}
async function dismiss(page) {
  const button = page.getByRole('button', { name: 'Understood', exact: true });
  if (await button.isVisible()) await button.click();
}
async function capture(page, name) {
  const bytes = await page.screenshot({ path: 'test-results/' + name + '.png', fullPage: true, animations: 'disabled' });
  if (['visual-cookies', 'visual-library', 'visual-transfer', 'visual-mobile', 'visual-dashboard', 'visual-cookie-mobile', 'projects-single', 'projects-multiple', 'projects-mobile', 'profile-avatars'].includes(name))
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
    await page.locator('img[alt="Owner"]').waitFor();
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
    assert.equal(await dialog.locator('pre').evaluate(el => getComputedStyle(el).whiteSpace), 'pre');
    await capture(page, name + '-mobile-fullscreen');
    await dialog.getByRole('button', { name: /Exit fullscreen|Salir de pantalla completa/i }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    console.log('PASS ' + name + ' mobile viewport, scrolling, font size and exit');
  } catch (error) { await capture(page, name + '-failure'); throw error; }
  finally { await context.close(); await browser.close(); }
}

