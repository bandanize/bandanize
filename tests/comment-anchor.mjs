import assert from 'node:assert/strict';
import { resolveAnchor } from '../apps/frontend/src/lib/comment-anchor.ts';
const anchor = { start: 3, end: 8, quote: 'verse' };
assert.deepEqual(resolveAnchor('Am\nverse\nC', anchor), anchor);
assert.deepEqual(resolveAnchor('Intro\nAm\nverse\nC', anchor), { start: 9, end: 14, quote: 'verse' });
assert.equal(resolveAnchor('Am\nchanged\nC', anchor), null);
assert.equal(resolveAnchor('verse\nverse', anchor), null);
assert.equal(resolveAnchor('anything', {start:0,end:0,quote:''}), null);
console.log('Passage anchors: exact, moved, deleted and ambiguous selections passed.');
