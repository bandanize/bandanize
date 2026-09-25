import { MediaLibrary } from './song/MediaLibrary';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProjects, Song } from '@/contexts/ProjectContext';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uploadMedia } from '@/lib/upload-media';
import { isVideoFile } from '@/lib/media-kind';
import { useUploadName } from './UploadNameProvider';
import type { CommentAnchor } from '@/lib/comment-anchor';
import '@/styles/song-workspace.css';

// Sub-components
import { SongHeader } from './song/SongHeader';
import { SongEditDialog } from './song/SongEditDialog';
import { FileList } from './song/FileList';
import { TabList } from './song/TabList';
import { TabEditor } from './song/TabEditor';
import { TabComments, type TabComment } from './song/TabComments';
import { MediaPreviewDialog } from './song/MediaPreviewDialog';
import { INSTRUMENTS } from './song/constants';

interface SongDetailProps {
  listId: string;
  song: Song;
  onBack: () => void;
}

export function SongDetail({ listId, song, onBack }: SongDetailProps) {
  const { t } = useTranslation();
  const requestUploadName = useUploadName();
  const [commentsVisible, setCommentsVisible] = useState(() => {
    try { return localStorage.getItem('bandanize.reader.comments') !== 'hidden'; } catch { return true; }
  });
  const toggleComments = () => {
    setCommentsVisible(visible => {
      try { localStorage.setItem('bandanize.reader.comments', visible ? 'hidden' : 'visible'); } catch { /* Storage may be unavailable. */ }
      return !visible;
    });
    setFocusedAnchor(null);
  };
  const [pendingAnchor, setPendingAnchor] = useState<{ tabId: string; anchor: CommentAnchor } | null>(null);
  const [focusedAnchor, setFocusedAnchor] = useState<{ tabId: string; anchor: CommentAnchor } | null>(null);
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

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab ID from URL
  const selectedTabId = searchParams.get('tabId');
  const selectedTab = song.tablatures.find(t => t.id === selectedTabId) || null;

  const [tabComments, setTabComments] = useState<{ tabId: string | null; comments: TabComment[] }>({ tabId: null, comments: [] });
  const linkedCommentId = searchParams.get('commentId');
  const [previousLinkedComment, setPreviousLinkedComment] = useState<string | null>(null);
  if (previousLinkedComment !== linkedCommentId) {
    setPreviousLinkedComment(linkedCommentId);
    if (linkedCommentId) setCommentsVisible(true);
  }
  useEffect(() => {
    if (!linkedCommentId || tabComments.tabId !== selectedTabId || !tabComments.comments.some(comment => String(comment.id) === linkedCommentId)) return;
    const frame = requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>('[data-tab-comment-id]')).find(el => el.dataset.tabCommentId === linkedCommentId);
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [linkedCommentId, selectedTabId, tabComments]);
  const receiveComments = useCallback((comments: TabComment[]) => setTabComments({ tabId: selectedTabId, comments }), [selectedTabId]);
  useEffect(() => {
    if (!focusedAnchor) return;
    const clear = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-comment-locate], [data-comment-marker]')) setFocusedAnchor(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFocusedAnchor(null); };
    document.addEventListener('pointerdown', clear);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', clear); document.removeEventListener('keydown', escape); };
  }, [focusedAnchor]);

  const setSelectedTabId = (id: string | null) => {
      setSearchParams(prev => {
          if (id) {
              prev.set('tabId', id);
          } else {
              prev.delete('tabId');
          }
          return prev;
      }, { replace: true });
  };

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

  const handleFileUploadTrigger = (type: 'song' | 'tab', tabId?: string) => {
    if (isUploading) return;
    setUploadTarget({ type, tabId });
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
  };
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked || !uploadTarget || !currentProject || isUploading) return;
    if (isVideoFile(picked)) {
      toast.error(t('workspace.video_upload_disabled'));
      return;
    }
    const target = uploadTarget;
    const file = await requestUploadName(picked);
    if (!file) return;
    setIsUploading(true); setUploadProgress(0); setUploadStatus(t('workspace.uploading'));
    const toastId = toast.loading(t('workspace.uploading'));
    try {
      const media = await uploadMedia(file, setUploadProgress);
      if (target.type === 'song') await addSongFile(currentProject.id, listId, song.id, media);
      else if (target.tabId) await addTablatureFile(currentProject.id, listId, song.id, target.tabId, media);
      toast.success(t('workspace.uploaded'), { id: toastId });
    } catch (err: any) {
      if (err?.message === 'VIDEO_NOT_ALLOWED' || err?.response?.status === 403) {
        toast.error(t('workspace.video_upload_disabled'), { id: toastId });
      } else {
        toast.error(t('workspace.upload_failed'), { id: toastId });
      }
    }
    finally { setIsUploading(false); setUploadTarget(null); }
  };

  return (
    <div className="space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="audio/*,image/*,.pdf,.doc,.docx,.txt,.gp,.gp3,.gp4,.gp5,.gpx,.xml,.mxl,.musicxml"
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

        <div className="song-media min-w-0"><FileList song={song} onUpload={() => handleFileUploadTrigger('song')}
          isUploading={isUploading && uploadTarget?.type === 'song'} uploadStatus={uploadStatus} uploadProgress={uploadProgress}
          onPreview={setPreviewFile} onDelete={url => currentProject && deleteSongFile(currentProject.id, listId, song.id, url)} /></div>

      <SongEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        song={song}
        onUpdate={handleUpdateSong}
        isSaving={isSavingSong}
      />

      <div className="song-workspace">
        <div className="song-tabs min-w-0"><TabList song={song} selectedTabId={selectedTabId} onSelectTab={setSelectedTabId}
          onDeleteTab={handleDeleteTab} onCreateTab={handleCreateTab} onUpdateTabDetails={handleUpdateTabDetails} /></div>
        <div className="song-score min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
          {selectedTab ? <TabEditor songId={song.id} key={selectedTab.id} tab={selectedTab} songName={song.name} onSave={handleSaveTabContent} isSaving={isSavingTab}
            hideFiles commentsVisible={commentsVisible} onToggleComments={toggleComments}
            comments={tabComments.tabId === selectedTab.id ? tabComments.comments : []}
            onUpload={tabId => handleFileUploadTrigger('tab', tabId)} uploading={isUploading && uploadTarget?.type === 'tab'} uploadProgress={uploadProgress}
            onDeleteFile={(tabId, url) => currentProject && deleteTablatureFile(currentProject.id, listId, song.id, tabId, url)} onPreview={setPreviewFile}
            focusedAnchor={focusedAnchor?.tabId === selectedTab.id ? focusedAnchor.anchor : null}
            onAnnotate={anchor => { setCommentsVisible(true); setPendingAnchor({ tabId: selectedTab.id, anchor }); setTimeout(() => { const input = document.getElementById('tab-comment-input'); input?.scrollIntoView({ block: 'center', behavior: 'smooth' }); input?.focus({ preventScroll: true }); }, 150); }} />
            : <div className="min-h-64 flex items-center justify-center text-center text-sm text-muted-foreground p-6">{t('workspace.choose_tab')}</div>}
        </div>
        <div className="song-comments min-w-0 space-y-4">
          {selectedTab && <div hidden={!commentsVisible}><TabComments songId={song.id} onCommentsChange={receiveComments} key={selectedTab.id} tabId={selectedTab.id} content={selectedTab.content}
            anchor={pendingAnchor?.tabId === selectedTab.id ? pendingAnchor.anchor : null} onClearAnchor={() => setPendingAnchor(null)}
            onLocate={anchor => setFocusedAnchor({ tabId: selectedTab.id, anchor })} onPreview={setPreviewFile} /></div>}
          {selectedTab && <div className="song-tab-media"><MediaLibrary songId={song.id} activityScope={'tab:' + selectedTab.id} files={selectedTab.files || []} title={t('workspace.tab_files')}
            onUpload={() => handleFileUploadTrigger('tab', selectedTab.id)} uploading={isUploading && uploadTarget?.type === 'tab'} progress={uploadProgress}
            onPreview={setPreviewFile} onDelete={url => currentProject && deleteTablatureFile(currentProject.id, listId, song.id, selectedTab.id, url)} /></div>}
        </div>

      </div>

      <MediaPreviewDialog 
        file={previewFile} 
        onClose={() => setPreviewFile(null)} 
      />
    </div>
  );
}
