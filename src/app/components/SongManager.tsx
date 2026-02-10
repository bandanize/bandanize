import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProjects, Song, SongList } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Plus, Trash2, Edit, GripVertical, ChevronDown } from 'lucide-react';
import { SongDetail } from '@/app/components/SongDetail';
import { toast } from 'sonner';
import SongListImage from '@/assets/song-list.svg';
import { useTranslation } from 'react-i18next';

// React DnD
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';

type Identifier = string | symbol;

// --- Sortable Components ---

// ItemType for DnD
const ItemType = 'SONG_ROW';


interface DragItem {
  index: number;
  id: string;
  type: string;
}

interface SortableSongRowProps {
  song: Song;
  index: number;
  listId: string;
  moveSong: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  onSelect: (listId: string, song: Song) => void;
  onDelete: (listId: string, songId: string) => void;
  onEdit: (listId: string, song: Song) => void;
}

const SortableSongRow = ({ song, index, listId, moveSong, onDrop, onSelect, onDelete, onEdit }: SortableSongRowProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
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

      if (!clientOffset) return;
      
      // Get pixels to the top
      const hoverClientY = (clientOffset).y - hoverBoundingRect.top;

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
    end: () => {
        onDrop();
    }
  });

  const opacity = isDragging ? 0.4 : 1;

  return (
    <div
      ref={(node) => {
          drag(drop(node));
          ref.current = node;
      }}
      style={{ opacity }}
      className="group flex items-center gap-3 p-4 bg-background border border-border rounded-lg hover:bg-card/50 transition-all cursor-move select-none"
      data-handler-id={handlerId}
    >
      {/* Drag Handle */}
      <div className="cursor-grab">
           <GripVertical className="size-5 text-muted-foreground group-hover:text-muted-foreground/60" />
      </div>
     
      <div 
        className="flex-1 cursor-pointer"
        onClick={() => onSelect(listId, song)}
      >
        <p className="font-medium text-foreground text-[15px]">{song.name}</p>
        <p className="text-xs text-muted-foreground font-medium">
          {song.originalBand || song.bandName}
          {song.bpm && ` • ${song.bpm} BPM`}
          {song.key && ` • ${song.key}`}
        </p>
      </div>
      
      {/* Edit Button */}
        <Button
            variant="ghost"
            size="sm"
            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onEdit(listId, song);
            }}
        >
            <Edit className="size-4" />
        </Button>

      {/* Visual Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/20 transition-all"
        onClick={(e: React.MouseEvent) => {
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
    onEditSong: (listId: string, song: Song) => void;
}

const SortableSongList = ({ listId, songs, onReorder, onSelectSong, onDeleteSong, onEditSong }: SortableSongListProps) => {
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
        <div className="flex flex-col gap-4">
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
                    onEdit={onEditSong}
                />
            ))}
        </div>
    );
};

// ... Inline SongListEditor ...




export function SongManager() {
  const { currentProject, createSongList, updateSongList, deleteSongList, createSong, reorderSongs, deleteSong, updateSong } = useProjects();
  const { t } = useTranslation();
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

  const handleCreateList = async () => {
    if (!currentProject || !listName.trim()) return;
    await createSongList(currentProject.id, listName);
    setListName('');
    setOpenListDialog(false);
    toast.success(t('list_created', 'Lista creada'));
  };

  // handleEditList and handleUpdateList removed (replaced by inline editor)

  const [editListDialog, setEditListDialog] = useState(false);
  const [listToEdit, setListToEdit] = useState<SongList | null>(null);
  const [editListName, setEditListName] = useState('');

  // --- Song Editing State ---
  const [isEditSongOpen, setIsEditSongOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<{ song: Song, listId: string } | null>(null);
  const [editSongForm, setEditSongForm] = useState<{
      name: string;
      originalBand: string;
      bpm: number | null;
      key: string;
  }>({ name: '', originalBand: '', bpm: null, key: '' });
  const [isSavingSong, setIsSavingSong] = useState(false);




  const handleUpdateList = async () => {
    if (!currentProject || !listToEdit || !editListName.trim()) return;
    try {
        await updateSongList(currentProject.id, listToEdit.id, editListName);
        setEditListDialog(false);
        toast.success(t('list_updated', 'Lista actualizada'));
    } catch {
        toast.error(t('list_update_error', 'Error al actualizar la lista'));
    }
  };

  const handleDeleteList = (listId: string) => {
    if (!currentProject) return;
    if (confirm(t('delete_list_confirmation', '¿Estás seguro de que quieres eliminar esta lista? Se eliminarán todas las canciones.'))) {
      deleteSongList(currentProject.id, listId);
      toast.success(t('list_deleted', 'Lista eliminada'));
    }
  };

  const handleDeleteSong = (listId: string, songId: string) => {
      if (!currentProject) return;
      if (confirm(t('delete_song_confirmation', '¿Estás seguro de que quieres eliminar esta canción? Se eliminarán también las tabs y archivos asociados.'))) {
          deleteSong(currentProject.id, listId, songId);
          toast.success(t('song_deleted', 'Canción eliminada'));
      }
  };

  const handleCreateSong = async () => {
    if (!currentProject || !selectedListId || !songData.name.trim()) return;
    await createSong(currentProject.id, selectedListId, {
      ...songData,
      bpm: songData.bpm ?? undefined // Handle null to undefined
    });
    setSongData({ name: '', originalBand: '', bpm: null, key: '' });
    setOpenSongDialog(false);
    setSelectedListId(null);
    toast.success(t('song_created', 'Canción creada'));
  };



  const handleReorder = (listId: string, songIds: string[]) => {
      if (!currentProject) return;
      reorderSongs(currentProject.id, listId, songIds);
  };

  const handleEditSongClick = (listId: string, song: Song) => {
      setEditingSong({ song, listId });
      setEditSongForm({
          name: song.name,
          originalBand: song.originalBand || song.bandName || '',
          bpm: song.bpm || null,
          key: song.key || '',
      });
      setIsEditSongOpen(true);
  };

  const handleUpdateSong = async () => {
      if (!currentProject || !editingSong) return;

      setIsSavingSong(true);
      try {
          await updateSong(currentProject.id, editingSong.listId, editingSong.song.id, {
              name: editSongForm.name,
              originalBand: editSongForm.originalBand,
              bpm: editSongForm.bpm ?? undefined,
              key: editSongForm.key
          });
          // Also try mapping key -> songKey just in case context expects songKey
           
          setIsEditSongOpen(false);
          setEditingSong(null);
          toast.success(t('song_updated', "Canción actualizada"));
      } catch {
          toast.error(t('song_update_error', "Error al actualizar la canción"));
      } finally {
          setIsSavingSong(false);
      }
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
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-foreground select-none">{t('songs_list', 'Listas de canciones')}</CardTitle>
              <Dialog open={openListDialog} onOpenChange={setOpenListDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="size-4 md:mr-2" />
                    <span className="hidden md:inline">{t('new_list', 'Nueva lista')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle>{t('create_list', 'Crear lista de canciones')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {t('create_list_desc', 'Agrupa tus canciones por álbum, setlist, etc.')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="list-name" className="text-foreground">{t('list_name', 'Nombre de la lista')}</Label>
                      <Input
                        id="list-name"
                        placeholder="Ej: Álbum 2024"
                        value={listName}
                        onChange={(e) => setListName(e.target.value)}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <Button onClick={handleCreateList} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      {t('create_list', 'Crear lista')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {currentProject.songLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <img src={SongListImage} alt="Song list" className="size-12 mx-auto mb-2" />
                <p>{t('no_lists', 'No hay listas aún')}</p>
                <p className="text-sm">{t('create_first_list', 'Crea tu primera lista de canciones')}</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-4">
                {currentProject.songLists.map((list) => (
                  <AccordionItem key={list.id} value={list.id} className="border border-border rounded-lg bg-card overflow-hidden last:border-b-border last:border-b">
                  <AccordionTrigger className="hover:no-underline text-foreground hover:text-foreground/80 group [&>svg]:hidden">
                    <div className="flex items-center justify-between w-full px-4">
                      <span className="font-medium text-lg">{list.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground mr-2">
                          {list.songs.length} {list.songs.length === 1 ? t('song_singular', 'canción') : t('song_plural', 'canciones')}
                        </span>
                        <div className="flex items-center gap-1">
                           {/* Edit List Button */}
                           <div
                                role="button"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center rounded-md cursor-pointer transition-colors"
                                onClick={(e: React.MouseEvent) => {
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
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/20 flex items-center justify-center rounded-md cursor-pointer transition-colors"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleDeleteList(list.id);
                                }}
                            >
                                <Trash2 className="size-4" />
                            </div>
                            {/* Chevron Button (Dropdown) - Visual only, triggers parent accordion */}
                            <div
                                role="button"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center rounded-md cursor-pointer transition-colors"
                            >
                                <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-10 border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border/60 justify-center mb-4"
                          onClick={() => {
                            setSelectedListId(list.id);
                            setOpenSongDialog(true);
                          }}
                        >
                          <Plus className="size-4 md:mr-2" />
                          <span className="hidden md:inline">{t('add_song', 'Añadir canción')}</span>
                        </Button>
  
                        {list.songs.length > 0 && (
                           <div className="flex flex-col">
                              <SortableSongList 
                                  listId={list.id}
                                  songs={list.songs}
                                  onReorder={handleReorder}
                                  onSelectSong={(lId, s) => setSelectedSongRef({ listId: lId, songId: s.id })}
                                  onDeleteSong={handleDeleteSong}
                                  onEditSong={handleEditSongClick}
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
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>{t('add_song', 'Añadir canción')}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('add_song_desc', 'Completa la información de la canción')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="song-name" className="text-foreground">{t('song_name', 'Nombre de la canción')} <span className="text-destructive">*</span></Label>
                <Input
                  id="song-name"
                  placeholder="Ej: Wonderwall"
                  value={songData.name}
                  onChange={(e) => setSongData({ ...songData, name: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="band-name" className="text-foreground">{t('original_band', 'Banda Original (Artista)')}</Label>
                <Input
                  id="band-name"
                  placeholder="Ej: Oasis"
                  value={songData.originalBand}
                  onChange={(e) => setSongData({ ...songData, originalBand: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bpm" className="text-foreground">{t('bpm', 'BPM')}</Label>
                  <Input
                    id="bpm"
                    type="number"
                    placeholder="Opcional"
                    value={songData.bpm === null ? '' : songData.bpm}
                    onChange={(e) => {
                         const val = e.target.value;
                         setSongData({ ...songData, bpm: val === '' ? null : parseInt(val) })
                    }}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key" className="text-foreground">{t('key', 'Tonalidad')}</Label>
                  <Input
                    id="key"
                    placeholder="Opcional (Ej: C)"
                    value={songData.key}
                    onChange={(e) => setSongData({ ...songData, key: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
              <Button onClick={handleCreateSong} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {t('create_song', 'Crear canción')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
  
        <Dialog open={editListDialog} onOpenChange={setEditListDialog}>
          <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                  <DialogTitle>{t('edit_list', 'Editar lista')}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">{t('edit_list_desc', 'cambia el nombre de la lista')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="edit-list-name" className="text-foreground">{t('name', 'Nombre')}</Label>
                      <Input 
                          id="edit-list-name"
                          value={editListName}
                          onChange={(e) => setEditListName(e.target.value)}
                          className="bg-background border-border text-foreground"
                      />
                  </div>
                  <Button onClick={handleUpdateList} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      {t('save_changes', 'Guardar cambios')}
                  </Button>
              </div>
          </DialogContent>
        </Dialog>
        
      {/* Edit Song Dialog */}
       <Dialog open={isEditSongOpen} onOpenChange={setIsEditSongOpen}>
            <DialogContent className="bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle>{t('edit_song', 'Editar canción')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">{t('edit_song_desc', 'Modifica los detalles de la canción')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-foreground">{t('name', 'Nombre')}</Label>
                        <Input
                            value={editSongForm.name}
                            onChange={(e) => setEditSongForm({ ...editSongForm, name: e.target.value })}
                            className="bg-background border-border text-foreground"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">{t('band', 'Banda')}</Label>
                        <Input
                            value={editSongForm.originalBand}
                            onChange={(e) => setEditSongForm({ ...editSongForm, originalBand: e.target.value })}
                            className="bg-background border-border text-foreground"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">{t('bpm', 'BPM')}</Label>
                        <Input
                            type="number"
                            value={editSongForm.bpm === null ? '' : editSongForm.bpm}
                            onChange={(e) => {
                                const val = e.target.value;
                                setEditSongForm({ ...editSongForm, bpm: val === '' ? null : parseInt(val) })
                            }}
                            className="bg-background border-border text-foreground"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">{t('key', 'Tonalidad')}</Label>
                        <Input
                            value={editSongForm.key}
                            onChange={(e) => setEditSongForm({ ...editSongForm, key: e.target.value })}
                            className="bg-background border-border text-foreground"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                        onClick={handleUpdateSong}
                        disabled={isSavingSong}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSavingSong ? t('saving', 'Guardando...') : t('save_changes', 'Guardar cambios')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  </DndProvider>
);
}
