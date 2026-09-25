import { uploadFileWithRetry } from '@/services/api';
import { isVideoFile, mediaKind, isMpeg } from './media-kind';

export async function uploadMedia(file: File, progress: (value: number) => void = () => {}) {
  if (!file.size) throw new Error('El archivo está vacío / The file is empty');
  if (isVideoFile(file)) {
    throw new Error('VIDEO_NOT_ALLOWED');
  }
  const media = mediaKind({ name: file.name, url: '', type: file.type });
  const kind = media === 'image' ? 'image' : media === 'audio' ? 'audio' : 'file';
  const folder = { image: 'images', audio: 'audio', video: 'videos', file: 'files' }[kind];
  const chunkSize = 5 * 1024 * 1024;
  const count = Math.ceil(file.size / chunkSize);
  const uploadId = crypto.randomUUID();
  let filename = '';
  for (let index = 0; index < count; index++) {
    const data = new FormData();
    data.append('file', file.slice(index * chunkSize, (index + 1) * chunkSize));
    data.append('chunkIndex', String(index)); data.append('totalChunks', String(count));
    data.append('uploadId', uploadId); data.append('originalFilename', file.name); data.append('folder', kind);
    const response = await uploadFileWithRetry('/upload/chunk', data);
    if (index === count - 1) {
      if (typeof response.data !== 'string' || !response.data.trim() || response.data === 'Chunk received'
          || /[/\\\\?#%]/.test(response.data) || [...response.data].some(char => char.charCodeAt(0) < 32) || response.data.includes('..')) {
        throw new Error('The server did not confirm a completed upload');
      }
      filename = response.data;
    }
    progress(Math.round((index + 1) / count * 100));
  }
  return { name: file.name, type: isMpeg({ name: file.name, url: '', type: file.type }) ? 'audio/mpeg' : file.type || 'application/octet-stream', url: `/api/uploads/${folder}/${filename}` };
}
