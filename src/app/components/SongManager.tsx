import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProjects, Song, SongList, Project } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Plus, Trash2, Edit, Check, GripVertical } from 'lucide-react';
import { SongDetail } from '@/app/components/SongDetail';
import { toast } from 'sonner';
import SongListImage from '@/assets/song-list.svg';

// React DnD
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// --- Sortable Components ---

const ItemType = 'SONG_ROW';


interface SortableSongRowProps {
  song: Song;
  index: number;
  listId: string;
  moveSong: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  onSelect: (listId: string, song: Song) => void;
  onDelete: (listId: string, songId: string) => void;
}

const SortableSongRow = ({ song, index, listId, moveSong, onDrop, onSelect, onDelete }: SortableSongRowProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: any, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveSong(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => {
      return { id: song.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
        onDrop();
    }
  });

  const opacity = isDragging ? 0.4 : 1;
  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity }}
      className="group flex items-center gap-3 p-3 bg-[#0B0B0C] border border-[#2B2B31] rounded-lg hover:bg-[#151518] transition-all cursor-move mb-2"
      data-handler-id={handlerId}
    >
      {/* Drag Handle */}
      <div className="cursor-grab">
           <GripVertical className="size-5 text-[#2B2B31] group-hover:text-[#EDEDED]/40" />
      </div>
     
      <div 
        className="flex-1 cursor-pointer"
        onClick={() => onSelect(listId, song)}
      >
        <p className="font-medium text-[#EDEDED] text-[15px]">{song.name}</p>
        <p className="text-xs text-[#EDEDED]/50 font-medium">
          {song.originalBand || song.bandName}
          {song.bpm && ` • ${song.bpm} BPM`}
          {song.key && ` • ${song.key}`}
        </p>
      </div>
      
      {/* Visual Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-[#EDEDED]/40 hover:text-red-500 hover:bg-red-900/20 transition-all"
        onClick={(e) => {
            e.stopPropagation();
            onDelete(listId, song.id);
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
};

interface SortableSongListProps {
    listId: string;
    songs: Song[];
    onReorder: (listId: string, songIds: string[]) => void;
    onSelectSong: (listId: string, song: Song) => void;
    onDeleteSong: (listId: string, songId: string) => void;
}

const SortableSongList = ({ listId, songs, onReorder, onSelectSong, onDeleteSong }: SortableSongListProps) => {
    // Keep local state for smooth dragging
    const [items, setItems] = useState<Song[]>(songs);

    // Sync items if external source changes (e.g. adding a song)
    useEffect(() => {
        setItems(songs);
    }, [songs]);

    const moveSong = useCallback((dragIndex: number, hoverIndex: number) => {
        setItems((prevItems) => {
            const newItems = [...prevItems];
            const [movedItem] = newItems.splice(dragIndex, 1);
            newItems.splice(hoverIndex, 0, movedItem);
            return newItems;
        });
    }, []);

    const handleDrop = useCallback(() => {
        // When drag ends, we trigger the reorder in context (and API)
        const ids = items.map(s => s.id);
        // Optimize: verify if order actually changed to avoid API calls? 
        // We can compare ids vs songs.map(s=>s.id)
        const currentIds = songs.map(s => s.id);
        if (JSON.stringify(ids) !== JSON.stringify(currentIds)) {
             onReorder(listId, ids);
        }
    }, [items, listId, onReorder, songs]);

    return (
        <div>
            {items.map((song, index) => (
                <SortableSongRow
                    key={song.id}
                    index={index}
                    song={song}
                    listId={listId}
                    moveSong={moveSong}
                    onDrop={handleDrop}
                    onSelect={onSelectSong}
                    onDelete={onDeleteSong} 
                />
            ))}
        </div>
    );
};

// ... Inline SongListEditor ...


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
  const { currentProject, createSongList, updateSongList, deleteSongList, createSong, reorderSongs, deleteSong } = useProjects();
  const [openListDialog, setOpenListDialog] = useState(false);
  const [openSongDialog, setOpenSongDialog] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedSongRef, setSelectedSongRef] = useState<{ listId: string; songId: string } | null>(null);
  const [listName, setListName] = useState('');
  const [songData, setSongData] = useState<{
    name: string;
    originalBand: string;
    bpm: number | null;
    key: string;
  }>({
    name: '',
    originalBand: '',
    bpm: null,
    key: '',
  });

  const handleCreateList = () => {
    if (!currentProject || !listName.trim()) return;
    createSongList(currentProject.id, listName);
    setListName('');
    setOpenListDialog(false);
    toast.success('Lista creada');
  };

  // handleEditList and handleUpdateList removed (replaced by inline editor)

  const [editListDialog, setEditListDialog] = useState(false);
  const [listToEdit, setListToEdit] = useState<SongList | null>(null);
  const [editListName, setEditListName] = useState('');

  const handleUpdateList = async () => {
    if (!currentProject || !listToEdit || !editListName.trim()) return;
    try {
        await updateSongList(currentProject.id, listToEdit.id, editListName);
        setEditListDialog(false);
        toast.success('Lista actualizada');
    } catch (error) {
        toast.error('Error al actualizar la lista');
    }
  };

  const handleDeleteList = (listId: string) => {
    if (!currentProject) return;
    if (confirm('¿Estás seguro de que quieres eliminar esta lista? Se eliminarán todas las canciones.')) {
      deleteSongList(currentProject.id, listId);
      toast.success('Lista eliminada');
    }
  };

  const handleDeleteSong = (listId: string, songId: string) => {
      if (!currentProject) return;
      if (confirm('¿Estás seguro de que quieres eliminar esta canción? Se eliminarán también las tabs y archivos asociados.')) {
          deleteSong(currentProject.id, listId, songId);
          toast.success('Canción eliminada');
      }
  };

  const handleCreateSong = () => {
    if (!currentProject || !selectedListId || !songData.name.trim()) return;
    // @ts-ignore - backend handles nulls, ProjectContext type might need update but works runtime
    createSong(currentProject.id, selectedListId, songData);
    setSongData({ name: '', originalBand: '', bpm: null, key: '' });
    setOpenSongDialog(false);
    setSelectedListId(null);
    toast.success('Canción creada');
  };

  const handleSelectSong = (listId: string, song: Song) => {
    setSelectedSongRef({ listId, songId: song.id });
  };

  const handleReorder = (listId: string, songIds: string[]) => {
      if (!currentProject) return;
      reorderSongs(currentProject.id, listId, songIds);
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
  };

  return (
    <DndProvider backend={HTML5Backend}>
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
              <Accordion type="single" collapsible className="w-full space-y-4">
                {currentProject.songLists.map((list) => (
                  <AccordionItem key={list.id} value={list.id} className="border border-[#2B2B31] rounded-lg bg-[#151518] px-2 overflow-hidden last:border-b-[#2B2B31] last:border-b">
                    <AccordionTrigger className="hover:no-underline text-[#EDEDED] hover:text-[#EDEDED]/80">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium text-lg">{list.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#EDEDED]/60 mr-2">
                            {list.songs.length} {list.songs.length === 1 ? 'canción' : 'canciones'}
                          </span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                             {/* Edit List Button */}
                             <div
                                  role="button"
                                  className="h-8 w-8 p-0 text-[#EDEDED]/60 hover:text-[#A3E635] hover:bg-[#A3E635]/10 flex items-center justify-center rounded-md cursor-pointer transition-colors"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setListToEdit(list);
                                      setEditListName(list.name);
                                      setEditListDialog(true);
                                  }}
                              >
                                  <Edit className="size-4" />
                              </div>
                              {/* Delete List Button */}
                              <div
                                  role="button"
                                  className="h-8 w-8 p-0 text-[#EDEDED]/60 hover:text-red-500 hover:bg-red-900/20 flex items-center justify-center rounded-md cursor-pointer transition-colors"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteList(list.id);
                                  }}
                              >
                                  <Trash2 className="size-4" />
                              </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-10 border border-[#2B2B31] bg-transparent text-[#EDEDED]/60 hover:text-[#EDEDED] hover:bg-[#2B2B31] hover:border-[#EDEDED]/20 justify-center mb-2"
                          onClick={() => {
                            setSelectedListId(list.id);
                            setOpenSongDialog(true);
                          }}
                        >
                          <Plus className="size-4 mr-2" />
                          Añadir canción
                        </Button>
  
                        {list.songs.length > 0 && (
                          <div className="space-y-2">
                              <SortableSongList 
                                  listId={list.id}
                                  songs={list.songs}
                                  onReorder={handleReorder}
                                  onSelectSong={handleSelectSong}
                                  onDeleteSong={handleDeleteSong}
                              />
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
                <Label htmlFor="song-name" className="text-[#EDEDED]">Nombre de la canción <span className="text-red-500">*</span></Label>
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
                    placeholder="Opcional"
                    value={songData.bpm === null ? '' : songData.bpm}
                    onChange={(e) => {
                         const val = e.target.value;
                         setSongData({ ...songData, bpm: val === '' ? null : parseInt(val) })
                    }}
                    className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key" className="text-[#EDEDED]">Tonalidad</Label>
                  <Input
                    id="key"
                    placeholder="Opcional (Ej: C)"
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
  
        <Dialog open={editListDialog} onOpenChange={setEditListDialog}>
          <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
              <DialogHeader>
                  <DialogTitle>Editar lista</DialogTitle>
                  <DialogDescription className="text-[#EDEDED]/60">cambia el nombre de la lista</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="edit-list-name" className="text-[#EDEDED]">Nombre</Label>
                      <Input 
                          id="edit-list-name"
                          value={editListName}
                          onChange={(e) => setEditListName(e.target.value)}
                          className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                      />
                  </div>
                  <Button onClick={handleUpdateList} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                      Guardar cambios
                  </Button>
              </div>
          </DialogContent>
        </Dialog>
  
  
      </div>
    </DndProvider>
  );
}
