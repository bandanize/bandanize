import React, { useState, useRef } from 'react';
import { useProjects, Song } from '@/contexts/ProjectContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'; // Keep tabs import if used elsewhere or remove if unused. It is NOT used anymore in this file.
// Actually, I should remove unused imports.
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uploadFileWithRetry } from '@/services/api';

// Sub-components
// Sub-components
import { SongHeader } from './song/SongHeader';
import { SongEditDialog } from './song/SongEditDialog';
import { FileList } from './song/FileList';
import { TabList } from './song/TabList';
import { TabEditor } from './song/TabEditor';
import { MediaPreviewDialog } from './song/MediaPreviewDialog';
import { INSTRUMENTS } from './song/constants';

interface SongDetailProps {
  listId: string;
  song: Song;
  onBack: () => void;
}

export function SongDetail({ listId, song, onBack }: SongDetailProps) {
  const { t } = useTranslation();
  const { 
    currentProject, 
    updateSong, 
    deleteSong, 
    addSongFile, 
    deleteSongFile,
    createTablature, 
    updateTablature, 
    deleteTablature, 
    addTablatureFile,
    deleteTablatureFile
  } = useProjects();

  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const selectedTab = song.tablatures.find(t => t.id === selectedTabId) || null;

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ type: 'song' | 'tab', tabId?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  
  // Saving states
  const [isSavingSong, setIsSavingSong] = useState(false);
  const [isSavingTab, setIsSavingTab] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Preview Dialog
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);

  // --- Handlers ---

  const handleUpdateSong = async (data: { name: string; originalBand: string; bpm: number | null; key: string }) => {
    if (!currentProject) return;
    setIsSavingSong(true);
    try {
      await updateSong(currentProject.id, listId, song.id, data);
      toast.success(t('song_updated', 'Canción actualizada'));
    } catch {
      toast.error(t('song_update_error', 'Error al guardar canción'));
    } finally {
      setIsSavingSong(false);
    }
  };

  const handleDeleteSong = async () => {
    if (!currentProject) return;
    if (confirm(t('delete_confirmation', "¿Estás seguro de que quieres eliminar esta canción?"))) {
        await deleteSong(currentProject.id, listId, song.id);
        toast.success(t('song_deleted', 'Canción eliminada'));
        onBack();
    }
  };

  const handleCreateTab = async (data: { name: string; instrument: string; tuning: string }) => {
      if (!currentProject) return;
      const instrument = INSTRUMENTS.find(i => i.value === data.instrument);
      try {
          await createTablature(currentProject.id, listId, song.id, {
            instrument: instrument?.label || 'Guitarra',
            instrumentIcon: data.instrument,
            name: data.name,
            tuning: data.tuning,
            content: '',
          });
          toast.success(t('tab_created', 'Tablatura creada'));
      } catch {
          toast.error(t('create_error', "Error al crear tablatura"));
      }
  };

  const handleDeleteTab = async (tabId: string) => {
      if (!currentProject) return;
      if (confirm(t('delete_tab_confirmation', "¿Eliminar tablatura?"))) {
          await deleteTablature(currentProject.id, listId, song.id, tabId);
          if (selectedTabId === tabId) setSelectedTabId(null);
          toast.success(t('tab_deleted', 'Tablatura eliminada'));
      }
  };
  
  const handleUpdateTabDetails = async (tabId: string, data: { name: string; instrument: string; tuning: string; instrumentIcon: string }) => {
       if (!currentProject) return;
       try {
           await updateTablature(currentProject.id, listId, song.id, tabId, data);
           toast.success(t('info_updated', 'Información actualizada'));
       } catch {
           toast.error(t('update_error', 'Error al actualizar'));
       }
  };

  const handleSaveTabContent = async (content: string) => {
      if (!currentProject || !selectedTabId) return;
      setIsSavingTab(true);
      try {
          await updateTablature(currentProject.id, listId, song.id, selectedTabId, { content });
          toast.success(t('tab_updated', 'Tablatura actualizada'));
      } catch {
          toast.error(t('tab_update_error', 'Error al guardar tablatura'));
      } finally {
          setIsSavingTab(false);
      }
  };

  // --- File Upload Logic ---
  // Helper for generating UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleFileUploadTrigger = (type: 'song' | 'tab', tabId?: string) => {
      setUploadTarget({ type, tabId });
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
      }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !uploadTarget || !currentProject) return;

      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus(t('starting_upload', 'Iniciando subida...'));
      const toastId = toast.loading(t('calculating_chunks', 'Calculando chunks...'));

      try {
          let endpointCategory = 'file';
          if (file.type.startsWith('image/')) endpointCategory = 'image';
          else if (file.type.startsWith('audio/')) endpointCategory = 'audio';
          else if (file.type.startsWith('video/')) endpointCategory = 'video';

          const uploadId = generateUUID();
          const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          
          if (file.size === 0) {
            toast.error(t('empty_file', "El archivo está vacío"));
            setUploadTarget(null);
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          let finalFilename = '';

          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
              const start = chunkIndex * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, file.size);
              const chunk = file.slice(start, end);

              const formData = new FormData();
              formData.append('file', chunk);
              formData.append('chunkIndex', chunkIndex.toString());
              formData.append('totalChunks', totalChunks.toString());
              formData.append('uploadId', uploadId);
              formData.append('originalFilename', file.name);
              formData.append('folder', endpointCategory);

              const currentProgress = Math.round((chunkIndex / totalChunks) * 100);
              const statusMsg = t('uploading_chunk', `Subiendo parte ${chunkIndex + 1} de ${totalChunks} (${currentProgress}%)...`)
                .replace('{current}', (chunkIndex + 1).toString())
                .replace('{total}', totalChunks.toString())
                .replace('{percent}', currentProgress.toString());

              setUploadStatus(statusMsg);
              toast.loading(statusMsg, { id: toastId });
              
              const response = await uploadFileWithRetry('/upload/chunk', formData);
              
              if (chunkIndex === totalChunks - 1) {
                  finalFilename = response.data;
              }

              const percentCompleted = Math.round(((chunkIndex + 1) / totalChunks) * 100);
              setUploadProgress(percentCompleted);
          }

          let folderName = 'files';
          if (endpointCategory === 'image') folderName = 'images';
          if (endpointCategory === 'audio') folderName = 'audio';
          if (endpointCategory === 'video') folderName = 'videos';
          
          const mediaFile = {
              name: file.name,
              type: file.type,
              url: `/api/uploads/${folderName}/${finalFilename}`
          };

          if (uploadTarget.type === 'song') {
              await addSongFile(currentProject.id, listId, song.id, mediaFile);
          } else if (uploadTarget.type === 'tab' && uploadTarget.tabId) {
              await addTablatureFile(currentProject.id, listId, song.id, uploadTarget.tabId, mediaFile);
          }
          
          toast.success(t('file_uploaded_success', 'Archivo subido correctamente'), { id: toastId });

      } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          console.error("Upload error", error);
          let errorMessage = t('upload_error_generic', 'Error al subir el archivo');
          if (error.response) {
             if (error.response.status === 413) {
                  errorMessage = t('chunk_too_large', 'Chunk demasiado grande (Error inesperado)');
              } else if (error.response.status === 524) {
                  errorMessage = t('upload_timeout', 'Timeout en subida de chunk.');
              }
          }
          toast.error(errorMessage, { id: toastId });
      } finally {
          setIsUploading(false);
          setUploadTarget(null);
          setUploadProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <div className="space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      
      <SongHeader 
        song={song} 
        onBack={onBack} 
        onDelete={handleDeleteSong} 
        onUpdate={handleUpdateSong}
        onEdit={() => setIsEditOpen(true)}
        isSaving={isSavingSong}
      />

      <SongEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        song={song}
        onUpdate={handleUpdateSong}
        isSaving={isSavingSong}
      />

      {/* Media Section */}
      <FileList 
        song={song} 
        onUpload={() => handleFileUploadTrigger('song')}
        isUploading={isUploading && uploadTarget?.type === 'song'}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        onPreview={setPreviewFile}
        onDelete={(url) => currentProject && deleteSongFile(currentProject.id, listId, song.id, url)}
      />

      {/* Tablatures Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TabList 
            song={song}
            selectedTabId={selectedTabId}
            onSelectTab={setSelectedTabId}
            onDeleteTab={handleDeleteTab}
            onCreateTab={handleCreateTab}
            onUpdateTabDetails={handleUpdateTabDetails}
        />

        {selectedTab && (
            <div className="lg:col-span-2 space-y-4">
                <TabEditor 
                    key={selectedTab.id}
                    tab={selectedTab}
                    songName={song.name}
                    onSave={handleSaveTabContent}
                    isSaving={isSavingTab}
                    onUpload={(tabId) => handleFileUploadTrigger('tab', tabId)}
                    onDeleteFile={(tabId, url) => currentProject && deleteTablatureFile(currentProject.id, listId, song.id, tabId, url)}
                />
            </div>
        )}
      </div>

      <MediaPreviewDialog 
        file={previewFile} 
        onClose={() => setPreviewFile(null)} 
      />
    </div>
  );
}
