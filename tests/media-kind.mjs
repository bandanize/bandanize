import assert from 'node:assert/strict';
import { mediaKind, isVideoFile } from '../apps/frontend/src/lib/media-kind.ts';
for (const name of ['track.mpeg','TRACK.MPG']) {
 for (const type of ['', 'application/octet-stream','video/mpeg','audio/mpeg']) {
  const file={name,url:'/api/uploads/videos/'+name,type};
  assert.equal(mediaKind(file),'audio');
  assert.equal(isVideoFile(file),false);
 }
}
assert.equal(mediaKind({name:'Legacy',url:'/api/uploads/videos/clip',type:'video/mpeg; charset=binary'}),'audio');
for (const ext of ['mp4','mov','avi','mkv','webm','wmv','m4v','flv','3gp']) {
 for (const type of ['', 'application/octet-stream','video/mp4','audio/mpeg']) {
  assert.equal(isVideoFile({name:'clip.'+ext,type}),true);
 }
}
assert.equal(mediaKind({name:'song.mp3',url:'',type:'audio/mpeg'}),'audio');
console.log('PASS MPEG audio classification and video upload veto');
