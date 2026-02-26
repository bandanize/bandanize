import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProjects, Song, SongList } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { Plus, Trash2, Edit, GripVertical, ChevronDown, Share } from 'lucide-react';
import { SongDetail } from '@/app/components/SongDetail';
import { toast } from 'sonner';
import SongListImage from '@/assets/song-list.svg';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

// React DnD
import { DndProvider, useDrag, useDrop, ConnectDragSource } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';

type Identifier = string | symbol;

// --- Sortable Components ---

// ItemType for DnD
// ItemType for DnD
const ItemType = {
    SONG_ROW: 'SONG_ROW',
    SONG_LIST: 'SONG_LIST'
};


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
    accept: ItemType.SONG_ROW,
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

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType.SONG_ROW,
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
          drop(node);
          preview(node);
          ref.current = node;
      }}
      style={{ opacity }}
      className="group flex items-center gap-3 p-4 bg-background border border-border rounded-lg hover:bg-card/50 transition-all select-none"
      data-handler-id={handlerId}
    >
      {/* Drag Handle */}
      <div ref={(node) => { drag(node); }} className="cursor-grab p-1 -ml-1 touch-none">
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
        <div className="flex flex-col gap-2">
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

// --- Sortable Accordion Item ---

interface SortableAccordionItemProps {
    list: SongList;
    index: number;
    moveList: (dragIndex: number, hoverIndex: number) => void;
    onDrop: () => void;
    children: (dragRef: ConnectDragSource) => React.ReactNode;
}

const SortableAccordionItem = ({ list, index, moveList, onDrop, children }: SortableAccordionItemProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
        accept: ItemType.SONG_LIST,
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
            moveList(dragIndex, hoverIndex);

            // Note: we're mutating the monitor item here!
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemType.SONG_LIST,
        item: () => {
            return { id: list.id, index };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        end: () => {
            onDrop();
        }
    });

    const opacity = isDragging ? 0 : 1;

    // Connect refs
    // drop(ref); 
    // preview(ref);

    return (
        <div 
            ref={(node) => { 
                drop(node); 
                preview(node); 
                ref.current = node; 
            }} 
            style={{ opacity }} 
            data-handler-id={handlerId} 
            className="mb-4"
        >
            {children(drag)}
        </div>
    );
};

export function SongManager() {
  const { currentProject, createSongList, updateSongList, deleteSongList, reorderSongLists, createSong, reorderSongs, deleteSong, updateSong } = useProjects();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [openListDialog, setOpenListDialog] = useState(false);
  const [openSongDialog, setOpenSongDialog] = useState(false);
  
  // State derived from URL
  const selectedListId = searchParams.get('listId');
  const selectedSongId = searchParams.get('songId');
  
  const [accordionValue, setAccordionValue] = useState<string | undefined>(selectedListId || undefined);

  // Sync URL with local state
  useEffect(() => {
      const listId = searchParams.get('listId');
      if (listId) setAccordionValue(listId);
  }, [searchParams]);

  const handleAccordionChange = (value: string) => {
      setAccordionValue(value);
      setSearchParams(prev => {
          if (value) {
              prev.set('listId', value);
          } else {
              prev.delete('listId');
          }
          return prev;
      }, { replace: true });
  };

  const handleSelectSong = (listId: string, song: Song) => {
      setSearchParams(prev => {
          prev.set('listId', listId);
          prev.set('songId', song.id);
          return prev;
      });
  };

  const handleBackToManager = () => {
      setSearchParams(prev => {
          prev.delete('songId');
          // Start: Keep listId? Yes, usually user wants to go back to the list
          return prev;
      });
  };

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

  // Local state for list reordering
  const [localLists, setLocalLists] = useState<SongList[]>([]);

  useEffect(() => {
      if (currentProject) {
          setLocalLists(currentProject.songLists);
      }
  }, [currentProject]);

  const moveList = useCallback((dragIndex: number, hoverIndex: number) => {
    setLocalLists((prevLists) => {
        const newLists = [...prevLists];
        const [movedList] = newLists.splice(dragIndex, 1);
        newLists.splice(hoverIndex, 0, movedList);
        return newLists;
    });
  }, []);

  const handleListDrop = useCallback(() => {
    if (!currentProject) return;
    const ids = localLists.map(l => l.id);
    const currentIds = currentProject.songLists.map((l: SongList) => l.id);
    if (JSON.stringify(ids) !== JSON.stringify(currentIds)) {
         reorderSongLists(currentProject.id, ids);
    }
  }, [localLists, currentProject, reorderSongLists]);

  const handleCreateList = async () => {
    if (!currentProject || !listName.trim()) return;
    await createSongList(currentProject.id, listName);
    setListName('');
    setOpenListDialog(false);
    toast.success(t('list_created', 'Lista creada'));
  };



  const handleExportList = (list: SongList) => {
    if (!list.songs.length) {
      toast.error(t('empty_list_export', 'La lista está vacía'));
      return;
    }

    const header = `${list.name}\n${'-'.repeat(list.name.length)}\n`;
    const body = list.songs.map((song, index) => {
      let line = `${index + 1}. ${song.name}`;
      const details = [];
      if (song.key) details.push(`[Key: ${song.key}]`);
      if (song.bpm) details.push(`[BPM: ${song.bpm}]`);
      
      if (details.length > 0) {
        line += ` ${details.join(' ')}`;
      }
      return line;
    }).join('\n');

    const content = `${header}\n${body}`;
    navigator.clipboard.writeText(content);
    toast.success(t('list_exported', 'Lista copiada al portapapeles'));
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

  // State for "Add Song" dialog
  const [songCreationListId, setSongCreationListId] = useState<string | null>(null);
  
  const handleCreateSong = async () => {
    if (!currentProject || !songCreationListId || !songData.name.trim()) return;
    await createSong(currentProject.id, songCreationListId, {
      ...songData,
      bpm: songData.bpm ?? undefined // Handle null to undefined
    });
    setSongData({ name: '', originalBand: '', bpm: null, key: '' });
    setOpenSongDialog(false);
    setSongCreationListId(null);
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

  const activeSong = selectedListId && selectedSongId
    ? currentProject.songLists
        .find((l: SongList) => l.id === selectedListId)
        ?.songs.find((s: Song) => s.id === selectedSongId)
    : null;

  if (activeSong && selectedListId && selectedSongId) {
    return (
      <SongDetail
        key={activeSong.id}
        listId={selectedListId}
        song={activeSong}
        onBack={handleBackToManager}
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setListName(e.target.value)}
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
              <Accordion 
                type="single" 
                collapsible 
                className="w-full space-y-4"
                value={accordionValue}
                onValueChange={handleAccordionChange}
              >
                {localLists.map((list, index) => (
                  <SortableAccordionItem 
                    key={list.id} 
                    index={index} 
                    list={list} 
                    moveList={moveList} 
                    onDrop={handleListDrop}
                  >
                    {(dragRef) => (
                    <AccordionItem value={list.id} className="border border-border rounded-lg bg-card overflow-hidden last:border-b">
                    <AccordionTrigger className="hover:no-underline text-foreground hover:text-foreground/80 group [&>svg]:hidden">
                        <div className="flex items-center justify-between w-full px-4">
                        <div className="flex items-center gap-3">
                             {/* Drag Handle for List */}
                            <div ref={(node) => { dragRef(node); }} className="cursor-grab p-1 -ml-1 touch-none" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <GripVertical className="size-5 text-muted-foreground hover:text-foreground" />
                            </div>
                            <span className="font-medium text-lg">{list.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground mr-2">
                            {list.songs.length} {list.songs.length === 1 ? t('song_singular', 'canción') : t('song_plural', 'canciones')}
                            </span>
                            <div className="flex items-center gap-1">
                                {/* Export List Button */}
                                <div
                                    role="button"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 flex items-center justify-center rounded-md cursor-pointer transition-colors"
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        handleExportList(list);
                                    }}
                                    title={t('export_list', 'Copiar lista')}
                                >
                                    <Share className="size-4" />
                                </div>
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
                            className="w-full h-10 border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border/60 justify-center mb-2"
                            onClick={() => {
                                setSongCreationListId(list.id);
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
                                    onSelectSong={handleSelectSong}
                                    onDeleteSong={handleDeleteSong}
                                    onEditSong={handleEditSongClick}
                                />
                            </div>
                            )}
                        </div>
                        </AccordionContent>
                    </AccordionItem>
                    )}
                  </SortableAccordionItem>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSongData({ ...songData, name: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="band-name" className="text-foreground">{t('original_band', 'Banda Original (Artista)')}</Label>
                <Input
                  id="band-name"
                  placeholder="Ej: Oasis"
                  value={songData.originalBand}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSongData({ ...songData, originalBand: e.target.value })}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSongData({ ...songData, key: e.target.value })}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditListName(e.target.value)}
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSongForm({ ...editSongForm, name: e.target.value })}
                            className="bg-background border-border text-foreground"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">{t('band', 'Banda')}</Label>
                        <Input
                            value={editSongForm.originalBand}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSongForm({ ...editSongForm, originalBand: e.target.value })}
                            className="bg-background border-border text-foreground"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-foreground">{t('bpm', 'BPM')}</Label>
                        <Input
                            type="number"
                            value={editSongForm.bpm === null ? '' : editSongForm.bpm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditSongForm({ ...editSongForm, key: e.target.value })}
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
