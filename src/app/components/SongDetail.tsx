import React, { useState, useRef, useEffect } from 'react';
import { useProjects, Song, Tablature } from '@/contexts/ProjectContext';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { ArrowLeft, Plus, Music2, FileAudio, Image as ImageIcon, File, Trash2, Guitar, Drum, Music, Check, Download, Play, Eye, X, FileText, Upload, Save, PenLine, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/app/components/ui/separator';
import { Progress } from '@/app/components/ui/progress';
import TabImage from '@/assets/tab.svg';
import SpeakerImage from '@/assets/speaker.svg';
import { useTranslation } from 'react-i18next';

const INSTRUMENTS = [
  { value: 'guitar', label: 'Guitarra', icon: Guitar },
  { value: 'bass', label: 'Bajo', icon: Music2 },
  { value: 'drums', label: 'Batería', icon: Drum },
  { value: 'piano', label: 'Piano', icon: Music },
  { value: 'vocal', label: 'Voz', icon: Music2 },
  { value: 'other', label: 'Otro', icon: Music },
];

// Toolbar component for tablature editing
// Controls component for tablature editing
function TablatureControls({ onInsert }: { onInsert: (text: string) => void }) {
  const { t } = useTranslation();
  const guitarStrings = 'e|---\nB|---\nG|---\nD|---\nA|---\nE|---\n';
  const bassStrings = 'G|---\nD|---\nA|---\nE|---\n';

  const symbols = [
    { label: 'h', desc: 'Hammer-on', value: 'h' },
    { label: 'p', desc: 'Pull-off', value: 'p' },
    { label: 'b', desc: 'Bend', value: 'b' },
    { label: '/', desc: 'Slide up', value: '/' },
    { label: '\\', desc: 'Slide down', value: '\\' },
    { label: '~', desc: 'Vibrato', value: '~' },
    { label: 'x', desc: 'Mute', value: 'x' },
    { label: '|', desc: 'Barra', value: '|' },
  ];

  return (
    <div className="space-y-6 mt-4">
      {/* String templates */}
      <div>
        <Label className="text-sm font-medium mb-3 block text-[#EDEDED]">{t('string_templates', 'Plantillas de cuerdas')}</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(guitarStrings)}
            className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
          >
            <Guitar className="size-4 mr-2" />
            {t('guitar_6', 'Guitarra (6 cuerdas)')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(bassStrings)}
            className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
          >
            <Music2 className="size-4 mr-2" />
            {t('bass_4', 'Bajo (4 cuerdas)')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert('---')}
            className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
          >
            {t('simple_line', 'Línea simple')}
          </Button>
        </div>
      </div>

      {/* Symbols */}
      <div>
        <Label className="text-sm font-medium mb-3 block text-[#EDEDED]">{t('symbols_techniques', 'Símbolos y técnicas')}</Label>
        <div className="flex gap-2 flex-wrap">
          {symbols.map((symbol) => (
            <Button
              key={symbol.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onInsert(symbol.value)}
              title={symbol.desc}
              className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31] min-w-[32px]"
            >
              {symbol.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [openTabDialog, setOpenTabDialog] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [tabData, setTabData] = useState({
    instrument: 'guitar',
    name: '',
    tuning: '',
  });
  
  // Local state for song editing
  const [editSongData, setEditSongData] = useState<{
    name: string;
    originalBand: string;
    bpm: number | null;
    key: string;
  }>({
    name: song.name || '',
    originalBand: song.originalBand || '',
    bpm: song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 ? song.bpm : null,
    key: song.key || '',
  });

  // Sync local state with prop when song changes (e.g. after save or external update)
  useEffect(() => {
    setEditSongData({
      name: song.name || '',
      originalBand: song.originalBand || '',
      bpm: song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 ? song.bpm : null,
      key: song.key || '',
    });
  }, [song]);

  // Local state for active tablature editing
  const [editingContent, setEditingContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSong, setIsSavingSong] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Upload State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Tab Edit State
  const [editTabDetailsDialog, setEditTabDetailsDialog] = useState(false);
  const [editTabDetails, setEditTabDetails] = useState({
      name: '',
      instrument: 'guitar',
      tuning: ''
  });

  // Helper for exponential backoff
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Derive selectedTab from props to ensure it's always up to date
  const selectedTab = song.tablatures.find(t => t.id === selectedTabId) || null;

  // Sync local content when switching tabs
  useEffect(() => {
    if (selectedTab) {
      setEditingContent(selectedTab.content || '');
    }
  }, [selectedTabId]); 

  // Manual Save for Tablature
  const [hasTabChanges, setHasTabChanges] = useState(false);

  useEffect(() => {
    if (!selectedTab) return;
    setHasTabChanges(editingContent !== (selectedTab.content || ''));
  }, [editingContent, selectedTab]);

  const handleSaveTab = async () => {
    if (!selectedTabId || !currentProject) return;

    setIsSaving(true);
    try {
      await updateTablature(currentProject.id, listId, song.id, selectedTabId, { content: editingContent });
      setHasTabChanges(false);
      toast.success(t('tab_updated', 'Tablatura actualizada'));
    } catch (error) {
      toast.error(t('tab_update_error', 'Error al guardar tablatura'));
    } finally {
      setIsSaving(false);
    }
  };

  const [hasSongChanges, setHasSongChanges] = useState(false);

  useEffect(() => {
    const hasChanges = 
        editSongData.name !== (song.name || '') ||
        editSongData.originalBand !== (song.originalBand || '') ||
        editSongData.bpm !== (song.bpm || 0) ||
        editSongData.key !== (song.key || '');
    setHasSongChanges(hasChanges);
  }, [editSongData, song]);

  const handleSaveSong = async () => {
    if (!currentProject) return;

    setIsSavingSong(true);
    try {
      await updateSong(currentProject.id, listId, song.id, editSongData);
      setHasSongChanges(false);
      toast.success(t('song_updated', 'Canción actualizada'));
    } catch (error) {
      toast.error(t('song_update_error', 'Error al guardar canción'));
    } finally {
      setIsSavingSong(false);
    }
  };

  const handleInsertText = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = editingContent;
    
    // Insert text at cursor position
    const newContent = 
      currentContent.substring(0, start) + 
      text + 
      currentContent.substring(end);
    
    setEditingContent(newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + text.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleCreateTablature = () => {
    if (!currentProject || !tabData.name.trim()) return;
    const instrument = INSTRUMENTS.find(i => i.value === tabData.instrument);
    createTablature(currentProject.id, listId, song.id, {
      instrument: instrument?.label || 'Guitarra',
      instrumentIcon: tabData.instrument,
      name: tabData.name,
      tuning: tabData.tuning,
      content: '',
    });
    setTabData({ instrument: 'guitar', name: '', tuning: '' });
    setOpenTabDialog(false);
    toast.success(t('tab_created', 'Tablatura creada'));
  };

  const handleDeleteSong = () => {
    if (!currentProject) return;
    deleteSong(currentProject.id, listId, song.id);
    toast.success(t('song_deleted', 'Canción eliminada'));
    onBack();
  };

  const handleDeleteTablature = (tabId: string) => {
    if (!currentProject) return;
    deleteTablature(currentProject.id, listId, song.id, tabId);
    if (selectedTabId === tabId) {
      setSelectedTabId(null);
    }
    toast.success(t('tab_deleted', 'Tablatura eliminada'));
  };

  const handleUpdateTabContent = (tabId: string, content: string) => {
    if (!currentProject) return;
    updateTablature(currentProject.id, listId, song.id, tabId, { content });
  };

  useEffect(() => {
      if (selectedTab) {
          setEditTabDetails({
              name: selectedTab.name,
              instrument: selectedTab.instrumentIcon || 'guitar',
              tuning: selectedTab.tuning || ''
          });
      }
  }, [selectedTab]);

  const handleUpdateTabDetails = async () => {
      if (!currentProject || !selectedTabId || !editTabDetails.name.trim()) return;
      const instrument = INSTRUMENTS.find(i => i.value === editTabDetails.instrument);
      
      console.log('Updating tab details:', {
          id: selectedTabId,
          payload: {
              name: editTabDetails.name,
              instrument: instrument?.label || 'Guitarra',
              instrumentIcon: editTabDetails.instrument,
              tuning: editTabDetails.tuning
          }
      });
      
      try {
          await updateTablature(currentProject.id, listId, song.id, selectedTabId, {
              name: editTabDetails.name,
              instrument: instrument?.label || 'Guitarra',
              instrumentIcon: editTabDetails.instrument,
              tuning: editTabDetails.tuning
          });
          setEditTabDetailsDialog(false);
          toast.success(t('info_updated', 'Información actualizada'));
      } catch (error) {
          toast.error(t('update_error', 'Error al actualizar'));
      }
  };

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ type: 'song' | 'tab', tabId?: string } | null>(null);

  const handleFileUpload = (type: 'song' | 'tab', tabId?: string) => {
    setUploadTarget({ type, tabId });
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    }
  };

  // Helper for generating UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const uploadFileWithRetry = async (url: string, formData: FormData, retries = 3, delay = 1000): Promise<any> => {
      try {
          return await api.post(url, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 1000 * 60 * 5, // 5 minutes per chunk
          });
      } catch (error: any) {
          if (retries > 0) {
              if (error.response && error.response.status >= 400 && error.response.status < 500) {
                  throw error; // Don't retry client errors (4xx)
              }
              await wait(delay);
              return uploadFileWithRetry(url, formData, retries - 1, delay * 2);
          }
          throw error;
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
          const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks (Cloudflare limit is 100MB, so safe)
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
              formData.append('folder', endpointCategory); // Backend expects singular or mapped 'files'

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

              // Update progress bar to completion of this chunk
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

      } catch (error: any) {
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

  const getInstrumentIcon = (iconName: string) => {
    const instrument = INSTRUMENTS.find(i => i.value === iconName);
    const Icon = instrument?.icon || Music;
    return <Icon className="size-4" />;
  };

  return (
    <div className="space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <Card className="bg-[#151518] border-[#2B2B31]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button variant="ghost" onClick={onBack} className="text-[#EDEDED] hover:bg-[#2B2B31]">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <CardTitle className="text-2xl text-[#EDEDED]">{song.name}</CardTitle>
                <p className="text-[#EDEDED]/60 mt-1">
                  {song.originalBand || song.bandName}
                  {song.bpm ? ` • ${song.bpm} BPM` : ''}
                  {song.key ? ` • ${song.key}` : ''}
                </p>
              </div>
            </div>
            <Button 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteSong}
            >
              <Trash2 className="size-4 md:mr-2" />
              <span className="hidden md:inline">{t('delete_song', 'Eliminar canción')}</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for Info and Media */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="bg-[#151518] rounded-[14px] p-0 h-[36px] w-fit">
          <TabsTrigger 
            value="info"
            className="data-[state=active]:bg-[#0B0B0C] data-[state=active]:text-[#EDEDED] data-[state=active]:border data-[state=active]:border-[#2B2B31] data-[state=active]:shadow-none text-[#EDEDED]/60 rounded-[14px] h-[36px] px-4 font-sans font-normal text-[14px]"
          >
            <FileText className="size-4 mr-2" />
            {t('info', 'Info')}
          </TabsTrigger>
          <TabsTrigger 
            value="media"
            className="data-[state=active]:bg-[#0B0B0C] data-[state=active]:text-[#EDEDED] data-[state=active]:border data-[state=active]:border-[#2B2B31] data-[state=active]:shadow-none text-[#EDEDED]/60 rounded-[14px] h-[36px] px-4 font-sans font-normal text-[14px]"
          >
            <Upload className="size-4 mr-2" />
            {t('media', 'Media')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="bg-[#151518] border-[#2B2B31]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#EDEDED]">{t('song_info', 'Información de la canción')}</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]">
                      <PenLine className="size-4 md:mr-2" />
                      <span className="hidden md:inline">{t('edit_info', 'Editar información')}</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
                    <DialogHeader>
                      <DialogTitle>{t('edit_info', 'Editar información')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-[#EDEDED]">{t('name', 'Nombre')}</Label>
                        <Input
                          value={editSongData.name}
                          onChange={(e) => setEditSongData({ ...editSongData, name: e.target.value })}
                          className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#EDEDED]">{t('band', 'Banda')}</Label>
                        <Input
                          value={editSongData.originalBand}
                          placeholder="Ej: The Beatles"
                          onChange={(e) => setEditSongData({ ...editSongData, originalBand: e.target.value })}
                          className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                        />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[#EDEDED]">{t('bpm', 'BPM')}</Label>
                          <Input
                            type="number"
                            placeholder="Opcional"
                            value={editSongData.bpm === null ? '' : editSongData.bpm}
                            onChange={(e) => {
                                 const val = e.target.value;
                                 setEditSongData({ ...editSongData, bpm: val === '' ? null : parseInt(val) })
                            }}
                            className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                          />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[#EDEDED]">{t('key', 'Tonalidad')}</Label>
                          <Input
                            value={editSongData.key}
                            onChange={(e) => setEditSongData({ ...editSongData, key: e.target.value })}
                            className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                          />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                           onClick={handleSaveSong}
                           disabled={isSavingSong}
                           className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]"
                        >
                            {isSavingSong ? t('saving', 'Guardando...') : t('save_changes', 'Guardar cambios')}
                        </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                   <Label className="text-[#EDEDED]/60 text-sm">{t('name', 'Nombre')}</Label>
                   <p className="text-[#EDEDED] text-lg font-medium mt-1">{song.name}</p>
                </div>
                <div>
                   <Label className="text-[#EDEDED]/60 text-sm">{t('band', 'Banda')}</Label>
                   <p className="text-[#EDEDED] text-lg font-medium mt-1">{song.originalBand || song.bandName || '-'}</p>
                </div>
                {song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 && (
                  <div>
                     <Label className="text-[#EDEDED]/60 text-sm">{t('bpm', 'BPM')}</Label>
                     <p className="text-[#EDEDED] text-lg font-medium mt-1">{song.bpm}</p>
                  </div>
                )}
                {song.key && (
                  <div>
                     <Label className="text-[#EDEDED]/60 text-sm">{t('key', 'Tonalidad')}</Label>
                     <p className="text-[#EDEDED] text-lg font-medium mt-1">{song.key}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <Card className="bg-[#151518] border-[#2B2B31]">
            <CardHeader>
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[#EDEDED]">{t('files_media', 'Archivos y media')}</CardTitle>
                    <Button size="sm" onClick={() => handleFileUpload('song')} disabled={isUploading} className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                      <Plus className="size-4 md:mr-2" />
                      <span className="hidden md:inline">{t('add_file', 'Añadir archivo')}</span>
                    </Button>
                  </div>
                  {isUploading && (
                      <div className="space-y-2">
                          <div className="flex justify-between text-sm text-[#EDEDED]/60">
                              <span>{uploadStatus}</span>
                              <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                      </div>
                  )}
              </div>
            </CardHeader>
            <CardContent>
              {song.files.length === 0 ? (
                <>
                  <img src={SpeakerImage} alt="speaker" className="size-12 mx-auto text-[#EDEDED]/40 mb-2" />
                  <p className="text-sm text-[#EDEDED]/40 text-center py-4">
                    {t('no_files', 'No hay archivos adjuntos')}
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  {song.files.map((file) => (
                    <div key={file.url} className="flex items-center gap-3 p-3 bg-[#0B0B0C] border border-[#2B2B31] rounded-lg group">
                      {file.type.startsWith('audio') ? (
                        <FileAudio className="size-5 text-blue-500" />
                      ) : file.type.startsWith('image') ? (
                        <ImageIcon className="size-5 text-green-500" />
                      ) : (
                        <File className="size-5 text-[#EDEDED]/60" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#EDEDED] truncate" title={file.name}>{file.name}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {(file.type.startsWith('audio') || file.type.startsWith('video') || file.type.startsWith('image')) && (
                            <Button
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                              onClick={() => setPreviewFile(file)}
                              title={t('view_play', "Reproducir/Ver")}
                            >
                                {file.type.startsWith('image') ? <Eye className="size-4" /> : <Play className="size-4" />}
                            </Button>
                          )}
                          
                            <a 
                            href={`${(import.meta.env.VITE_API_URL || '') + (file.url.startsWith('/uploads') ? '/api' + file.url : file.url)}`} 
                            download 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-[#2B2B31] rounded-md text-[#EDEDED]/60"
                            title={t('download', "Descargar")}
                          >
                              <Download className="size-4" />
                          </a>
                          <Button
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => currentProject && deleteSongFile(currentProject.id, listId, song.id, file.url)}
                            title={t('delete', "Eliminar")}
                          >
                              <Trash2 className="size-4" />
                          </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tablaturas */}
      <Card className="bg-[#151518] border-[#2B2B31]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-[#EDEDED]">{t('tabs_title', 'Tablaturas')} ({song.tablatures.length})</CardTitle>
            <Dialog open={openTabDialog} onOpenChange={setOpenTabDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                  <Plus className="size-4 md:mr-2" />
                  <span className="hidden md:inline">{t('new_tab', 'Nueva tablatura')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
                <DialogHeader>
                  <DialogTitle>{t('create_tab', 'Crear tablatura')}</DialogTitle>
                  <DialogDescription className="text-[#EDEDED]/60">
                    {t('create_tab_desc', 'Añade una nueva tablatura para un instrumento')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="tab-instrument" className="text-[#EDEDED]">{t('instrument', 'Instrumento')}</Label>
                    <Select
                      value={tabData.instrument}
                      onValueChange={(value) => setTabData({ ...tabData, instrument: value })}
                    >
                      <SelectTrigger id="tab-instrument" className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
                        {INSTRUMENTS.map((inst) => (
                          <SelectItem key={inst.value} value={inst.value} className="focus:bg-[#2B2B31] focus:text-[#EDEDED]">
                            {inst.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tab-name" className="text-[#EDEDED]">{t('name', 'Nombre')}</Label>
                    <Input
                      id="tab-name"
                      placeholder="Ej: Guitarra rítmica"
                      value={tabData.name}
                      onChange={(e) => setTabData({ ...tabData, name: e.target.value })}
                      className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tab-tuning" className="text-[#EDEDED]">{t('tuning', 'Afinación')}</Label>
                    <Input
                      id="tab-tuning"
                      placeholder="Opcional (Ej: Standard EADGBE)"
                      value={tabData.tuning}
                      onChange={(e) => setTabData({ ...tabData, tuning: e.target.value })}
                      className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                    />
                  </div>
                  <Button onClick={handleCreateTablature} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                    {t('create_tab', 'Crear tablatura')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {song.tablatures.length === 0 ? (
            <div className="text-center py-12">
              <img src={TabImage} alt="tab" className="size-12 mx-auto text-[#EDEDED]/40 mb-2" />
              <p className="text-[#EDEDED]/60">{t('no_tabs', 'No hay tablaturas aún')}</p>
              <p className="text-sm text-[#EDEDED]/40">{t('create_first_tab', 'Crea tu primera tablatura')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                {song.tablatures.map((tab) => (
                  <Card
                    key={tab.id}
                    className={`cursor-pointer transition-all bg-[#0B0B0C] border-[#2B2B31] ${
                      selectedTabId === tab.id ? 'ring-2 ring-[#A3E635]' : ''
                    }`}
                    onClick={() => setSelectedTabId(tab.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#151518] rounded-md border border-[#2B2B31]">
                                {getInstrumentIcon(tab.instrumentIcon || 'guitar')}
                              </div>
                              <div>
                                <h4 className="font-medium text-[#EDEDED]">{tab.name}</h4>
                                <p className="text-xs text-[#EDEDED]/60">{tab.tuning || t('standard_tuning', 'Estandar')}</p>
                              </div>
                            </div>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-[#EDEDED]/40 hover:text-[#A3E635] hover:bg-[#A3E635]/10"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTabId(tab.id);
                                      setEditTabDetailsDialog(true);
                                  }}
                                >
                                  <Edit className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-[#EDEDED]/40 hover:text-red-500 hover:bg-red-900/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTablature(tab.id);
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                            </div>
                          </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Editor Tabs Panel */}
              {selectedTab && (
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getInstrumentIcon(selectedTab.instrumentIcon || 'guitar')}
                        <h3 className="font-medium text-[#EDEDED] text-lg">{selectedTab.name}</h3>
                        <span className="text-sm text-[#EDEDED]/60 px-2 py-0.5 bg-[#2B2B31] rounded">
                            {selectedTab.tuning || 'Standard'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasTabChanges && (
                            <Button 
                                size="sm" 
                                onClick={handleSaveTab} 
                                disabled={isSaving}
                                className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]"
                            >
                                <Save className="size-4 mr-2" />
                                {isSaving ? t('saving', 'Guardando...') : t('save_changes', 'Guardar cambios')}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
                            onClick={() => {
                                const text = `${selectedTab.name}\n${selectedTab.tuning || 'Standard'}\n\n${editingContent}`;
                                const blob = new Blob([text], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${song.name}-${selectedTab.name}.txt`;
                                a.click();
                            }}
                        >
                            <Download className="size-4 mr-2" />
                            {t('export', 'Exportar')}
                        </Button>
                    </div>
                  </div>

                  {/* Tab Editor */}
                  <div className="relative">
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                          <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 bg-[#2B2B31]/50 text-[#EDEDED]/60 hover:text-[#EDEDED] hover:bg-[#2B2B31]"
                              onClick={() => {
                                  // Copy to clipboard
                                  navigator.clipboard.writeText(editingContent);
                                  toast.success("Copiado al portapapeles");
                              }}
                              title={t('copy', "Copiar")}
                          >
                              <FileText className="size-4" />
                          </Button>
                      </div>
                      <Textarea
                        ref={textareaRef}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="font-mono text-sm min-h-[400px] bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED] resize-none leading-relaxed p-4"
                        placeholder={t('tab_content_placeholder', "Escribe o pega aquí tu tablatura...\n\ne|---\nB|---\nG|---\nD|---\nA|---\nE|---\n")}
                        spellCheck={false}
                      />
                  </div>

                  <TablatureControls onInsert={handleInsertText} />

                  {/* Tab Files Section */}
                  <div className="mt-8 pt-8 border-t border-[#2B2B31]">
                      <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-[#EDEDED]">{t('attached_files', 'Archivos adjuntos')}</h4>
                          <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleFileUpload('tab', selectedTab.id)}
                              className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
                          >
                              <Upload className="size-4 mr-2" />
                              {t('add_file', 'Añadir archivo')}
                          </Button>
                      </div>
                      
                      {selectedTab.files && selectedTab.files.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selectedTab.files.map((file) => (
                                  <div key={file.url} className="flex items-center gap-3 p-3 bg-[#0B0B0C] border border-[#2B2B31] rounded-lg group">
                                      {file.type.startsWith('audio') ? (
                                          <FileAudio className="size-5 text-blue-500" />
                                      ) : file.type.startsWith('image') ? (
                                          <ImageIcon className="size-5 text-green-500" />
                                      ) : (
                                          <File className="size-5 text-[#EDEDED]/60" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-[#EDEDED] truncate">{file.name}</p>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                           <a 
                                              href={`${(import.meta.env.VITE_API_URL || '') + (file.url.startsWith('/uploads') ? '/api' + file.url : file.url)}`} 
                                              download 
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-2 hover:bg-[#2B2B31] rounded-md text-[#EDEDED]/60"
                                          >
                                              <Download className="size-4" />
                                          </a>
                                          <Button
                                              variant="ghost" 
                                              size="icon"
                                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                              onClick={() => currentProject && deleteTablatureFile(currentProject.id, listId, song.id, selectedTab.id, file.url)}
                                          >
                                              <Trash2 className="size-4" />
                                          </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-sm text-[#EDEDED]/40 italic">{t('no_files_tab', 'No hay archivos en esta tablatura')}</p>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Tab Details Dialog */}
       <Dialog open={editTabDetailsDialog} onOpenChange={setEditTabDetailsDialog}>
           <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
               <DialogHeader>
                   <DialogTitle>{t('edit_tab', 'Editar tablatura')}</DialogTitle>
               </DialogHeader>
               <div className="space-y-4 py-4">
                   <div className="space-y-2">
                         <Label htmlFor="edit-tab-name" className="text-[#EDEDED]">{t('name', 'Nombre')}</Label>
                         <Input
                           id="edit-tab-name"
                           value={editTabDetails.name}
                           onChange={(e) => setEditTabDetails({ ...editTabDetails, name: e.target.value })}
                           className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                         />
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor="edit-tab-instrument" className="text-[#EDEDED]">{t('instrument', 'Instrumento')}</Label>
                       <Select
                           value={editTabDetails.instrument}
                           onValueChange={(value) => setEditTabDetails({ ...editTabDetails, instrument: value })}
                       >
                           <SelectTrigger id="edit-tab-instrument" className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]">
                               <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
                               {INSTRUMENTS.map((inst) => (
                                   <SelectItem key={inst.value} value={inst.value} className="focus:bg-[#2B2B31] focus:text-[#EDEDED]">
                                       {inst.label}
                                   </SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor="edit-tab-tuning" className="text-[#EDEDED]">{t('tuning', 'Afinación')}</Label>
                       <Input
                           id="edit-tab-tuning"
                           value={editTabDetails.tuning}
                           onChange={(e) => setEditTabDetails({ ...editTabDetails, tuning: e.target.value })}
                           className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                       />
                   </div>
                   <Button onClick={handleUpdateTabDetails} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                       {t('save_changes', 'Guardar cambios')}
                   </Button>
               </div>
           </DialogContent>
       </Dialog>

      {/* Media Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
            <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] max-w-4xl w-full">
                <DialogHeader>
                    <DialogTitle>{previewFile.name}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 flex justify-center">
                    {previewFile.type.startsWith('image') ? (
                        <img 
                            src={(import.meta.env.VITE_API_URL || '') + (previewFile.url.startsWith('/uploads') ? '/api' + previewFile.url : previewFile.url)} 
                            alt={previewFile.name} 
                            className="max-h-[70vh] w-auto object-contain rounded-md"
                        />
                    ) : (
                        <audio 
                            controls 
                            className="w-full"
                            src={(import.meta.env.VITE_API_URL || '') + (previewFile.url.startsWith('/uploads') ? '/api' + previewFile.url : previewFile.url)} 
                        >
                            Your browser does not support the audio element.
                        </audio>
                    )}
                </div>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
