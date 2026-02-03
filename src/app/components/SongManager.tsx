import React, { useState, useEffect } from 'react';
import { useProjects, Song, SongList, Project } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Plus, Trash2, Music, ChevronRight, Edit, Check } from 'lucide-react';
import { SongDetail } from '@/app/components/SongDetail';
import { toast } from 'sonner';
import SongListImage from '@/assets/song-list.svg';

// Inline component for editing list metadata with manual save
const SongListEditor = ({ list, currentProject, onDelete }: { list: SongList, currentProject: Project, onDelete: (id: string) => void }) => {
  const { updateSongList } = useProjects();
  const [name, setName] = useState(list.name);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(name !== list.name);
  }, [name, list.name]);

  const handleSave = async () => {
    if (!currentProject || !name.trim()) return;

    setIsSaving(true);
    try {
        await updateSongList(currentProject.id, list.id, name);
        setHasChanges(false);
        toast.success('Lista actualizada');
    } catch (error) {
        toast.error('Error al guardar');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4 p-1">
        <div className="flex-1">
          <Label htmlFor={`list-name-${list.id}`} className="sr-only">Nombre de la lista</Label>
          <Input 
            id={`list-name-${list.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
          />
        </div>
        <div className="flex items-center gap-1 min-w-[80px] justify-end">
            {hasChanges && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#A3E635] hover:text-[#A3E635] hover:bg-[#A3E635]/10 h-8 w-8 p-0"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    <Check className="size-4" />
                </Button>
            )}
            <Button
                variant="ghost"
                size="sm"
                className="text-[#EDEDED]/60 hover:text-red-500 hover:bg-red-900/20 h-8 w-8 p-0"
                onClick={() => onDelete(list.id)}
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    </div>
  );
};

export function SongManager() {
  const { currentProject, createSongList, updateSongList, deleteSongList, createSong } = useProjects();
  const [openListDialog, setOpenListDialog] = useState(false);
  const [openSongDialog, setOpenSongDialog] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedSongRef, setSelectedSongRef] = useState<{ listId: string; songId: string } | null>(null);
  const [listName, setListName] = useState('');
  const [songData, setSongData] = useState({
    name: '',
    originalBand: '',
    bpm: 120,
    key: 'C',
  });

  const handleCreateList = () => {
    if (!currentProject || !listName.trim()) return;
    createSongList(currentProject.id, listName);
    setListName('');
    setOpenListDialog(false);
    toast.success('Lista creada');
  };

  // handleEditList and handleUpdateList removed (replaced by inline editor)

  const handleDeleteList = (listId: string) => {
    if (!currentProject) return;
    if (confirm('¿Estás seguro de que quieres eliminar esta lista? Se eliminarán todas las canciones.')) {
      deleteSongList(currentProject.id, listId);
      toast.success('Lista eliminada');
    }
  };

  const handleCreateSong = () => {
    if (!currentProject || !selectedListId || !songData.name.trim()) return;
    createSong(currentProject.id, selectedListId, songData);
    setSongData({ name: '', originalBand: '', bpm: 120, key: 'C' });
    setOpenSongDialog(false);
    setSelectedListId(null);
    toast.success('Canción creada');
  };

  const handleSelectSong = (listId: string, song: Song) => {
    setSelectedSongRef({ listId, songId: song.id });
  };

  if (!currentProject) return null;

  const activeSong = selectedSongRef
    ? currentProject.songLists
        .find((l) => l.id === selectedSongRef.listId)
        ?.songs.find((s) => s.id === selectedSongRef.songId)
    : null;

  if (activeSong && selectedSongRef) {
    return (
      <SongDetail
        key={activeSong.id}
        listId={selectedSongRef.listId}
        song={activeSong}
        onBack={() => setSelectedSongRef(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#151518] border-[#2B2B31]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-[#EDEDED]">Listas de canciones</CardTitle>
            <Dialog open={openListDialog} onOpenChange={setOpenListDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                  <Plus className="size-4 mr-2" />
                  Nueva lista
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
                <DialogHeader>
                  <DialogTitle>Crear lista de canciones</DialogTitle>
                  <DialogDescription className="text-[#EDEDED]/60">
                    Agrupa tus canciones por álbum, setlist, etc.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="list-name" className="text-[#EDEDED]">Nombre de la lista</Label>
                    <Input
                      id="list-name"
                      placeholder="Ej: Álbum 2024"
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                    />
                  </div>
                  <Button onClick={handleCreateList} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                    Crear lista
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {currentProject.songLists.length === 0 ? (
            <div className="text-center py-8 text-[#EDEDED]/40">
              <img src={SongListImage} alt="Song list" className="size-12 mx-auto mb-2" />
              <p>No hay listas aún</p>
              <p className="text-sm">Crea tu primera lista de canciones</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {currentProject.songLists.map((list) => (
                <AccordionItem key={list.id} value={list.id} className="border-[#2B2B31]">
                  <AccordionTrigger className="hover:no-underline text-[#EDEDED] hover:text-[#EDEDED]/80">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">{list.name}</span>
                      <div className="flex items-center gap-2">
                      <span className="text-sm text-[#EDEDED]/60">
                        {list.songs.length} {list.songs.length === 1 ? 'canción' : 'canciones'}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                       {/* Note: SongListEditor needs to be styled too, but it's an inline component above. 
                           I'll assume it inherits or needs manual update. 
                           Since I can't update it in this chunk easily, I will address it if I can or hope styles cascade.
                           Wait, SongListEditor uses Input and Button. I should update that component too.
                           For now, focusing on the main list. 
                       */}
                      <SongListEditor 
                        list={list} 
                        currentProject={currentProject} 
                        onDelete={handleDeleteList} 
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
                        onClick={() => {
                          setSelectedListId(list.id);
                          setOpenSongDialog(true);
                        }}
                      >
                        <Plus className="size-4 mr-2" />
                        Añadir canción
                      </Button>

                      {list.songs.length === 0 ? (
                        <p className="text-sm text-[#EDEDED]/40 text-center py-4">
                          No hay canciones en esta lista
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {list.songs.map((song) => (
                            <div
                              key={song.id}
                              className="flex items-center justify-between p-3 bg-[#0B0B0C] border border-[#2B2B31] rounded-lg hover:bg-[#2B2B31] cursor-pointer"
                              onClick={() => handleSelectSong(list.id, song)}
                            >
                              <div className="flex-1">
                                <p className="font-medium text-[#EDEDED]">{song.name}</p>
                                <p className="text-sm text-[#EDEDED]/60">
                                  {song.originalBand || song.bandName} • {song.bpm} BPM • {song.key}
                                </p>
                              </div>
                              <ChevronRight className="size-5 text-[#EDEDED]/40" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={openSongDialog} onOpenChange={setOpenSongDialog}>
        <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
          <DialogHeader>
            <DialogTitle>Añadir canción</DialogTitle>
            <DialogDescription className="text-[#EDEDED]/60">
              Completa la información de la canción
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="song-name" className="text-[#EDEDED]">Nombre de la canción</Label>
              <Input
                id="song-name"
                placeholder="Ej: Wonderwall"
                value={songData.name}
                onChange={(e) => setSongData({ ...songData, name: e.target.value })}
                className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="band-name" className="text-[#EDEDED]">Banda Original (Artista)</Label>
              <Input
                id="band-name"
                placeholder="Ej: Oasis"
                value={songData.originalBand}
                onChange={(e) => setSongData({ ...songData, originalBand: e.target.value })}
                className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bpm" className="text-[#EDEDED]">BPM</Label>
                <Input
                  id="bpm"
                  type="number"
                  value={songData.bpm}
                  onChange={(e) => setSongData({ ...songData, bpm: parseInt(e.target.value) || 120 })}
                  className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key" className="text-[#EDEDED]">Tonalidad</Label>
                <Input
                  id="key"
                  placeholder="Ej: C, Dm, G#"
                  value={songData.key}
                  onChange={(e) => setSongData({ ...songData, key: e.target.value })}
                  className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                />
              </div>
            </div>
            <Button onClick={handleCreateSong} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
              Crear canción
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
