import { Song } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import { MediaLibrary, type LibraryFile } from './MediaLibrary';
export function FileList({song,onUpload,isUploading,uploadProgress,onPreview,onDelete}: {
  song: Song; onUpload: () => void; isUploading: boolean; uploadStatus: string; uploadProgress: number;
  onPreview: (file: LibraryFile) => void; onDelete: (url: string) => void;
}) {
  const {t}=useTranslation();
  return <MediaLibrary files={song.files} title={t('workspace.song_files')} onUpload={onUpload} onPreview={onPreview} onDelete={onDelete} uploading={isUploading} progress={uploadProgress} />;
}
