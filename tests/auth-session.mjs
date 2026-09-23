import test from 'node:test';
import assert from 'node:assert/strict';
import { authStorage, clearAuthSession, getAuthToken, saveAuthSession } from '../apps/frontend/src/lib/auth-session.ts';

function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

function reset() {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage() });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage() });
}

test('unchecking remember replaces an existing persistent session with a tab session', () => {
  reset();
  localStorage.setItem('theme', 'dark');
  saveAuthSession('old-token', { id: 'old-user' }, true);
  saveAuthSession('tab-token', { id: 'new-user' }, false);
  assert.equal(localStorage.getItem('token'), null);
  assert.equal(localStorage.getItem('currentUser'), null);
  assert.equal(localStorage.getItem('theme'), 'dark');
  assert.equal(getAuthToken(), 'tab-token');
  assert.equal(authStorage(), sessionStorage);
  assert.deepEqual(JSON.parse(authStorage().getItem('currentUser')), { id: 'new-user' });
});

test('remember replaces a tab session and keeps profile updates in persistent storage', () => {
  reset();
  saveAuthSession('tab-token', { id: '1' }, false);
  saveAuthSession('remembered-token', { id: '2' }, true);
  assert.equal(sessionStorage.getItem('token'), null);
  assert.equal(sessionStorage.getItem('currentUser'), null);
  assert.equal(getAuthToken(), 'remembered-token');
  assert.equal(authStorage(), localStorage);
  authStorage().setItem('currentUser', JSON.stringify({ id: '2', photo: '/photo.jpg' }));
  assert.equal(JSON.parse(localStorage.getItem('currentUser')).photo, '/photo.jpg');
});

test('logout and expired-session cleanup clear both stores and preserve unrelated preferences', () => {
  reset();
  for (const store of [localStorage, sessionStorage]) {
    store.setItem('token', 'stale');
    store.setItem('currentUser', '{}');
    store.setItem('language', 'es');
  }
  clearAuthSession();
  assert.equal(getAuthToken(), null);
  for (const store of [localStorage, sessionStorage]) {
    assert.equal(store.getItem('currentUser'), null);
    assert.equal(store.getItem('language'), 'es');
  }
});
