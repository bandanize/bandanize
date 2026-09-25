export interface MediaFile { name: string; url: string; type?: string }
export function mediaExtension(file: MediaFile) {
  const path = file.name || file.url.split(/[?#]/)[0];
  return path.split('.').pop()?.toLowerCase() || '';
}
export function mediaKind(file: MediaFile): 'audio' | 'video' | 'image' | 'document' {
  const mime = (file.type || '').split(';')[0].trim().toLowerCase();
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  // Old uploads may have an empty or generic MIME type.
  if (!mime || ['application/octet-stream', 'binary/octet-stream'].includes(mime)) {
    const ext = mediaExtension(file);
    if (['mp3', 'wav', 'wave', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'aif', 'aiff'].includes(ext)) return 'audio';
    if (['mp4', 'm4v', 'webm', 'mov', 'mpeg', 'mpg'].includes(ext)) return 'video';
  }
  return 'document';
}
export function isMpeg(file: MediaFile) {
  return ['mpeg', 'mpg'].includes(mediaExtension(file)) || file.type?.split(';')[0].trim().toLowerCase() === 'video/mpeg';
}

export function isVideoFile(file: { name?: string; url?: string; type?: string }): boolean {
  return mediaKind(file as MediaFile) === 'video';
}
