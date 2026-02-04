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
        <Label className="text-sm font-medium mb-3 block text-[#EDEDED]">Plantillas de cuerdas</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(guitarStrings)}
            className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
          >
            <Guitar className="size-4 mr-2" />
            Guitarra (6 cuerdas)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(bassStrings)}
            className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
          >
            <Music2 className="size-4 mr-2" />
            Bajo (4 cuerdas)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert('---')}
            className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
          >
            Línea simple
          </Button>
        </div>
      </div>

      {/* Symbols */}
      <div>
        <Label className="text-sm font-medium mb-3 block text-[#EDEDED]">Símbolos y técnicas</Label>
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
      toast.success('Tablatura actualizada');
    } catch (error) {
      toast.error('Error al guardar tablatura');
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
      toast.success('Canción actualizada');
    } catch (error) {
      toast.error('Error al guardar canción');
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
    toast.success('Tablatura creada');
  };

  const handleDeleteSong = () => {
    if (!currentProject) return;
    deleteSong(currentProject.id, listId, song.id);
    toast.success('Canción eliminada');
    onBack();
  };

  const handleDeleteTablature = (tabId: string) => {
    if (!currentProject) return;
    deleteTablature(currentProject.id, listId, song.id, tabId);
    if (selectedTabId === tabId) {
      setSelectedTabId(null);
    }
    toast.success('Tablatura eliminada');
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
      
      try {
          await updateTablature(currentProject.id, listId, song.id, selectedTabId, {
              name: editTabDetails.name,
              instrument: instrument?.label || 'Guitarra',
              instrumentIcon: editTabDetails.instrument,
              tuning: editTabDetails.tuning
          });
          setEditTabDetailsDialog(false);
          toast.success('Información actualizada');
      } catch (error) {
          toast.error('Error al actualizar');
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
      setUploadStatus('Iniciando subida...');
      const toastId = toast.loading('Calculando chunks...');

      try {
          let endpointCategory = 'file';
          if (file.type.startsWith('image/')) endpointCategory = 'image';
          else if (file.type.startsWith('audio/')) endpointCategory = 'audio';
          else if (file.type.startsWith('video/')) endpointCategory = 'video';

          const uploadId = generateUUID();
          const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks (Cloudflare limit is 100MB, so safe)
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          
          if (file.size === 0) {
            toast.error("El archivo está vacío");
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
              setUploadStatus(`Subiendo parte ${chunkIndex + 1} de ${totalChunks} (${currentProgress}%)...`);
              toast.loading(`Subiendo parte ${chunkIndex + 1} de ${totalChunks} (${currentProgress}%)`, { id: toastId });
              
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
          
          toast.success('Archivo subido correctamente', { id: toastId });

      } catch (error: any) {
          console.error("Upload error", error);
          let errorMessage = 'Error al subir el archivo';
          
          if (error.response) {
             if (error.response.status === 413) {
                  errorMessage = 'Chunk demasiado grande (Error inesperado)';
              } else if (error.response.status === 524) {
                  errorMessage = 'Timeout en subida de chunk.';
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
                  {song.originalBand || song.bandName} • {song.bpm} BPM • {song.key}
                </p>
              </div>
            </div>
            <Button 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteSong}
            >
              <Trash2 className="size-4 mr-2" />
              Eliminar canción
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
            Info
          </TabsTrigger>
          <TabsTrigger 
            value="media"
            className="data-[state=active]:bg-[#0B0B0C] data-[state=active]:text-[#EDEDED] data-[state=active]:border data-[state=active]:border-[#2B2B31] data-[state=active]:shadow-none text-[#EDEDED]/60 rounded-[14px] h-[36px] px-4 font-sans font-normal text-[14px]"
          >
            <Upload className="size-4 mr-2" />
            Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="bg-[#151518] border-[#2B2B31]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#EDEDED]">Información de la canción</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]">
                      <PenLine className="size-4 mr-2" />
                      Editar información
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
                    <DialogHeader>
                      <DialogTitle>Editar información</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-[#EDEDED]">Nombre</Label>
                        <Input
                          value={editSongData.name}
                          onChange={(e) => setEditSongData({ ...editSongData, name: e.target.value })}
                          className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#EDEDED]">Banda</Label>
                        <Input
                          value={editSongData.originalBand}
                          placeholder="Ej: The Beatles"
                          onChange={(e) => setEditSongData({ ...editSongData, originalBand: e.target.value })}
                          className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                        />
                      </div>
                      <div className="space-y-2">
                          <Label className="text-[#EDEDED]">BPM</Label>
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
                          <Label className="text-[#EDEDED]">Tonalidad</Label>
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
                            {isSavingSong ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                   <Label className="text-[#EDEDED]/60 text-sm">Nombre</Label>
                   <p className="text-[#EDEDED] text-lg font-medium mt-1">{song.name}</p>
                </div>
                <div>
                   <Label className="text-[#EDEDED]/60 text-sm">Banda</Label>
                   <p className="text-[#EDEDED] text-lg font-medium mt-1">{song.originalBand || song.bandName || '-'}</p>
                </div>
                {song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 && (
                  <div>
                     <Label className="text-[#EDEDED]/60 text-sm">BPM</Label>
                     <p className="text-[#EDEDED] text-lg font-medium mt-1">{song.bpm}</p>
                  </div>
                )}
                {song.key && (
                  <div>
                     <Label className="text-[#EDEDED]/60 text-sm">Tonalidad</Label>
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
                    <CardTitle className="text-[#EDEDED]">Archivos y media</CardTitle>
                    <Button size="sm" onClick={() => handleFileUpload('song')} disabled={isUploading} className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                      <Plus className="size-4 mr-2" />
                      Añadir archivo
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
                    No hay archivos adjuntos
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
                              title="Reproducir/Ver"
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
                            title="Descargar"
                          >
                              <Download className="size-4" />
                          </a>
                          <Button
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => currentProject && deleteSongFile(currentProject.id, listId, song.id, file.url)}
                            title="Eliminar"
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
            <CardTitle className="text-[#EDEDED]">Tablaturas ({song.tablatures.length})</CardTitle>
            <Dialog open={openTabDialog} onOpenChange={setOpenTabDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                  <Plus className="size-4 mr-2" />
                  Nueva tablatura
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
                <DialogHeader>
                  <DialogTitle>Crear tablatura</DialogTitle>
                  <DialogDescription className="text-[#EDEDED]/60">
                    Añade una nueva tablatura para un instrumento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="tab-instrument" className="text-[#EDEDED]">Instrumento</Label>
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
                    <Label htmlFor="tab-name" className="text-[#EDEDED]">Nombre</Label>
                    <Input
                      id="tab-name"
                      placeholder="Ej: Guitarra rítmica"
                      value={tabData.name}
                      onChange={(e) => setTabData({ ...tabData, name: e.target.value })}
                      className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tab-tuning" className="text-[#EDEDED]">Afinación</Label>
                    <Input
                      id="tab-tuning"
                      placeholder="Opcional (Ej: Standard EADGBE)"
                      value={tabData.tuning}
                      onChange={(e) => setTabData({ ...tabData, tuning: e.target.value })}
                      className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                    />
                  </div>
                  <Button onClick={handleCreateTablature} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                    Crear tablatura
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
              <p className="text-[#EDEDED]/60">No hay tablaturas aún</p>
              <p className="text-sm text-[#EDEDED]/40">Crea tu primera tablatura</p>
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
                              <div className="size-10 bg-[#2B2B31] rounded-lg flex items-center justify-center text-[#EDEDED]">
                                {getInstrumentIcon(tab.instrumentIcon)}
                              </div>
                              <div>
                                <p className="font-medium text-[#EDEDED]">{tab.name}</p>
                                <p className="text-sm text-[#EDEDED]/60">{tab.instrument}</p>
                                {tab.tuning && <p className="text-xs text-[#EDEDED]/40">{tab.tuning}</p>}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTablature(tab.id);
                              }}
                              className="hover:bg-[#2B2B31] text-[#EDEDED]/60 hover:text-red-500"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="lg:col-span-2">
                    {selectedTab ? (
                      <Card className="bg-[#151518] border-[#2B2B31]">
                        <CardContent className="p-0">
                          {/* Header */}
                          <div className="p-6 border-b border-[#2B2B31] flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                 <CardTitle className="text-xl text-[#EDEDED]">{selectedTab.name}</CardTitle>
                                 <div 
                                    className="p-1 rounded-md hover:bg-[#2B2B31] cursor-pointer text-[#EDEDED]/40 hover:text-[#A3E635] transition-colors"
                                    onClick={() => setEditTabDetailsDialog(true)}
                                    role="button"
                                 >
                                    <Edit className="size-4" />
                                 </div>
                              </div>
                              
                              <div className="flex flex-col gap-1 mt-1">
                                  <p className="text-sm text-[#EDEDED]/60 font-medium">
                                    {selectedTab.instrument}
                                  </p>
                                  {selectedTab.tuning && (
                                    <p className="text-xs text-[#EDEDED]/40">
                                      {selectedTab.tuning}
                                    </p>
                                  )}
                              </div>
                            </div>
                            <Button 
                              onClick={handleSaveTab} 
                              disabled={isSaving || !hasTabChanges}
                              className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030] disabled:opacity-50 w-9 sm:w-auto px-0 sm:px-4"
                            >
                              <Save className="size-4 sm:mr-2" />
                              <span className="hidden sm:inline">Guardar</span>
                            </Button>
                      </div>

                      <div className="p-6 space-y-8">
                          {/* Editor */}
                          <div className="space-y-3">
                            <Label className="text-[#EDEDED] text-base font-medium">Tablatura</Label>
                            <Textarea
                              ref={textareaRef}
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              placeholder="Escribe tu tablatura aquí..."
                              className="font-mono text-sm min-h-[400px] bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED] resize-none focus-visible:ring-1 focus-visible:ring-[#A3E635]"
                            />
                            
                            {/* Controls below editor */}
                            <TablatureControls onInsert={handleInsertText} />
                          </div>

                          {/* Media Section */}
                          <div className="space-y-4 pt-4 border-t border-[#2B2B31]">
                              <div className="flex justify-between items-center">
                                  <Label className="text-[#EDEDED] text-base font-medium">Archivos y media</Label>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleFileUpload('tab', selectedTab.id)} 
                                    className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030] h-8 w-8 sm:w-auto px-0 sm:px-3"
                                  >
                                    <Plus className="size-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Añadir media</span>
                                  </Button>
                              </div>

                              {selectedTab.files.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                  {selectedTab.files.map((file) => (
                                    <div key={file.url} className="group relative aspect-square bg-[#0B0B0C] border border-[#2B2B31] rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 gap-3 hover:border-[#EDEDED]/20 transition-colors">
                                        <div className="size-10 rounded-full bg-[#151518] flex items-center justify-center">
                                            {file.type.startsWith('audio') ? (
                                              <FileAudio className="size-5 text-blue-500" />
                                            ) : file.type.startsWith('image') ? (
                                              <ImageIcon className="size-5 text-green-500" />
                                            ) : (
                                              <File className="size-5 text-[#EDEDED]/60" />
                                            )}
                                        </div>
                                        <p className="text-xs text-[#EDEDED] text-center w-full truncate px-2 font-medium">
                                            {file.name}
                                        </p>
                                        
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {(file.type.startsWith('audio') || file.type.startsWith('video') || file.type.startsWith('image')) && (
                                              <Button
                                                variant="ghost" 
                                                size="icon"
                                                className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                                                onClick={() => setPreviewFile(file)}
                                              >
                                                  {file.type.startsWith('image') ? <Eye className="size-4" /> : <Play className="size-4" />}
                                              </Button>
                                            )}
                                            <Button
                                              variant="ghost" 
                                              size="icon"
                                              className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                                              onClick={() => currentProject && deleteTablatureFile(currentProject.id, listId, song.id, selectedTab.id, file.url)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 border border-dashed border-[#2B2B31] rounded-xl">
                                    <p className="text-sm text-[#EDEDED]/40">No hay archivos adjuntos</p>
                                </div>
                              )}
                          </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-[#151518] border-[#2B2B31] h-full flex items-center justify-center">
                    <CardContent className="text-center py-12">
                      <Guitar className="size-16 mx-auto text-[#2B2B31] mb-4" />
                      <p className="text-[#EDEDED] font-medium">Selecciona una tablatura</p>
                      <p className="text-sm text-[#EDEDED]/40 mt-1">o crea una nueva para empezar a editar</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none text-white [&>button]:hidden">
            <DialogHeader className="p-4 absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex justify-between items-center">
                    <DialogTitle className="text-white drop-shadow-md">{previewFile?.name}</DialogTitle>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setPreviewFile(null)}
                        className="text-white hover:bg-white/20 rounded-full"
                    >
                        <X className="size-6" />
                    </Button>
                </div>
                <DialogDescription className="sr-only">
                    Previsualización del archivo {previewFile?.name}
                </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center min-h-[50vh] max-h-[85vh] overflow-hidden p-4">
                {previewFile && (
                    <>
                        {previewFile.type.startsWith('image') && (
                            <img 
                                src={`${(import.meta.env.VITE_API_URL || '') + (previewFile.url.startsWith('/uploads') ? '/api' + previewFile.url : previewFile.url)}`} 
                                alt={previewFile.name} 
                                className="max-w-full max-h-[80vh] object-contain"
                            />
                        )}
                        {previewFile.type.startsWith('audio') && (
                            <div className="w-full max-w-md bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                                <FileAudio className="size-16 mx-auto mb-4 text-blue-400" />
                                <audio 
                                    controls 
                                    className="w-full" 
                                    src={`${(import.meta.env.VITE_API_URL || '') + (previewFile.url.startsWith('/uploads') ? '/api' + previewFile.url : previewFile.url)}`} 
                                    autoPlay
                                />
                            </div>
                        )}
                        {previewFile.type.startsWith('video') && (
                            <video 
                                controls 
                                className="max-w-full max-h-[80vh]" 
                                src={`${(import.meta.env.VITE_API_URL || '') + (previewFile.url.startsWith('/uploads') ? '/api' + previewFile.url : previewFile.url)}`} 
                                autoPlay
                            />
                        )}
                    </>
                )}
            </div>
        </DialogContent>
      </Dialog>
      <Dialog open={editTabDetailsDialog} onOpenChange={setEditTabDetailsDialog}>
          <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
              <DialogHeader>
                  <DialogTitle>Editar tablatura</DialogTitle>
                  <DialogDescription className="text-[#EDEDED]/60">Modifica los detalles de la tablatura</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-tab-name" className="text-[#EDEDED]">Nombre</Label>
                    <Input 
                        id="edit-tab-name"
                        value={editTabDetails.name}
                        onChange={(e) => setEditTabDetails({ ...editTabDetails, name: e.target.value })}
                        className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-tab-instrument" className="text-[#EDEDED]">Instrumento</Label>
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
                    <Label htmlFor="edit-tab-tuning" className="text-[#EDEDED]">Afinación</Label>
                    <Input 
                        id="edit-tab-tuning"
                        value={editTabDetails.tuning}
                        onChange={(e) => setEditTabDetails({ ...editTabDetails, tuning: e.target.value })}
                        className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                    />
                  </div>
                  <Button onClick={handleUpdateTabDetails} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                      Guardar cambios
                  </Button>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
