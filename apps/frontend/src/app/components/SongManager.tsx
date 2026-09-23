import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProjects, Song, SongList } from '@/contexts/ProjectContext';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Plus, Trash2, Edit, GripVertical, Share, ArrowLeft, ArrowRightLeft, Copy, MoreVertical, FileText, Paperclip, MessageCircle, ListMusic, ArrowRight, Loader2 } from 'lucide-react';
import { SongDetail } from '@/app/components/SongDetail';
import { toast } from 'sonner';
import SongListImage from '@/assets/song-list.svg';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Badge } from '@/app/components/ui/badge';
import { ExportListDialog } from './ExportListDialog';

import { motion, useReducedMotion } from 'motion/react';

// React DnD
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';

type Identifier = string | symbol;

// --- Sortable Components ---

const ItemType = {
    SONG_ROW: 'SONG_ROW',
    SONG_LIST: 'SONG_LIST'
};

interface PlaylistDropResult { targetListId: string }

interface DragItem {
  index: number;
  id: string;
  type: string;
  sourceListId?: string;
  name: string;
}

// --- Sortable Song Row ---

interface SortableSongRowProps {
  song: Song;
  index: number;
  listId: string;
  moveSong: (dragIndex: number, hoverIndex: number) => void;
  onDrop: () => void;
  onCancelDrag: () => void;
  onSelect: (listId: string, song: Song) => void;
  onDelete: (listId: string, songId: string) => void;
  onEdit: (listId: string, song: Song) => void;
  onMoveCopy: (listId: string, song: Song) => void;
  isDuplicate: boolean;
}

const SortableSongRow = ({ song, index, listId, moveSong, onDrop, onCancelDrag, onSelect, onDelete, onEdit, onMoveCopy, isDuplicate }: SortableSongRowProps) => {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ItemType.SONG_ROW,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current || item.sourceListId !== listId) return;
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveSong(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType.SONG_ROW,
    item: () => ({ id: song.id, index, type: ItemType.SONG_ROW, sourceListId: listId, name: song.name }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (_item, monitor) => {
      const result = monitor.getDropResult<PlaylistDropResult>();
      if (result?.targetListId && result.targetListId !== listId) onCancelDrag();
      else onDrop();
    }
  });

  const opacity = isDragging ? 0.4 : 1;

  return (
    <motion.div layout="position" transition={{ duration: reducedMotion ? 0 : 0.18 }}
      ref={(node) => {
          drop(node);
          preview(node);
          ref.current = node;
      }}
      style={{ opacity }}
      className="group flex items-center gap-2 min-h-14 px-2 py-2 rounded-lg hover:bg-white/[0.035] transition-colors select-none"
      data-song-id={song.id}
      data-handler-id={handlerId}
    >
      {/* Drag Handle */}
      <button type="button" ref={(node) => { drag(node); }} aria-label={t('visual.drag_song', { name: song.name })}
        className="cursor-grab active:cursor-grabbing flex h-8 w-6 shrink-0 items-center justify-center touch-none text-muted-foreground/50 hover:text-primary focus-visible:outline focus-visible:outline-primary">
           <GripVertical className="size-4" />
      </button>
     
      <div 
        className="flex-1 min-w-0 cursor-pointer rounded focus-visible:outline focus-visible:outline-primary"
        role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(listId, song); } }}
        onClick={() => onSelect(listId, song)}
      >
        <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">{song.name}</p>
            {isDuplicate && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border font-medium">
                    {t('duplicate', 'Duplicado')}
                </Badge>
            )}
        </div>
        <p className="text-xs text-muted-foreground font-medium truncate">
          {song.originalBand || song.bandName}
          {(song.bpm !== undefined && song.bpm !== null && song.bpm !== 0) ? ` • ${song.bpm} BPM` : ''}
          {song.key ? ` • ${song.key}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3 text-[11px] tabular-nums text-muted-foreground" aria-label={t('visual.song_activity')}>
        {[
          { Icon: FileText, value: song.tablatures.length, label: t('library.tab_count', { count: song.tablatures.length }) },
          { Icon: Paperclip, value: song.files.length + song.tablatures.reduce((total, tab) => total + tab.files.length, 0), label: t('library.file_count', { count: song.files.length + song.tablatures.reduce((total, tab) => total + tab.files.length, 0) }) },
          { Icon: MessageCircle, value: song.tablatures.some(tab => tab.commentCount === undefined) ? '—' : song.tablatures.reduce((total, tab) => total + (tab.commentCount || 0), 0), label: song.tablatures.some(tab => tab.commentCount === undefined) ? t('library.comments_unavailable') : t('library.comment_count', { count: song.tablatures.reduce((total, tab) => total + (tab.commentCount || 0), 0) }) },
        ].map(({ Icon, value, label }) => <span key={label} title={label} aria-label={label} className="inline-flex items-center gap-1">
          <Icon className="size-3 opacity-80" aria-hidden="true" /><span aria-hidden="true">{value}</span>
        </span>)}
      </div>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t('visual.song_actions', { name: song.name })}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors shrink-0 data-[state=open]:text-foreground"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onMoveCopy(listId, song);
            }}
          >
            <ArrowRightLeft className="mr-2 size-4" />
            {t('move_copy', 'Mover o Copiar')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(listId, song);
            }}
          >
            <Edit className="mr-2 size-4" />
            {t('edit', 'Editar')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDelete(listId, song.id);
            }}
          >
            <Trash2 className="mr-2 size-4" />
            {t('delete', 'Eliminar')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
};

// --- Sortable Song List (songs within a list) ---

interface SortableSongListProps {
    listId: string;
    songs: Song[];
    onReorder: (listId: string, songIds: string[]) => void;
    onSelectSong: (listId: string, song: Song) => void;
    onDeleteSong: (listId: string, songId: string) => void;
    onEditSong: (listId: string, song: Song) => void;
    onMoveCopySong: (listId: string, song: Song) => void;
    duplicateSongIds: Set<string>;
}

const SortableSongList = ({ listId, songs, onReorder, onSelectSong, onDeleteSong, onEditSong, onMoveCopySong, duplicateSongIds }: SortableSongListProps) => {
    const [items, setItems] = useState<Song[]>(songs);

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
        const ids = items.map(s => s.id);
        const currentIds = songs.map(s => s.id);
        if (JSON.stringify(ids) !== JSON.stringify(currentIds)) {
             onReorder(listId, ids);
        }
    }, [items, listId, onReorder, songs]);

    return (
        <div className="flex flex-col">
            {items.map((song, index) => (
                <SortableSongRow
                    key={song.id}
                    index={index}
                    song={song}
                    listId={listId}
                    moveSong={moveSong}
                    onDrop={handleDrop}
                    onCancelDrag={() => setItems(songs)}
                    onSelect={onSelectSong}
                    onDelete={onDeleteSong} 
                    onEdit={onEditSong}
                    onMoveCopy={onMoveCopySong}
                    isDuplicate={duplicateSongIds.has(song.id)}
                />
            ))}
        </div>
    );
};

// --- Sortable List Item (compact card for left panel) ---

interface SortableListItemProps {
    list: SongList;
    index: number;
    isSelected: boolean;
    moveList: (dragIndex: number, hoverIndex: number) => void;
    onDrop: () => void;
    onSelect: (listId: string) => void;
    onEdit: (list: SongList) => void;
    onDelete: (listId: string) => void;
    onDuplicate: (list: SongList) => void;
    onExport: (list: SongList) => void;
    onSongDropOnList: (sourceListId: string, songId: string, targetListId: string) => void;
}

const SortableListItem = ({ list, index, isSelected, moveList, onDrop, onSelect, onEdit, onDelete, onDuplicate, onExport, onSongDropOnList }: SortableListItemProps) => {
    const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    const [{ handlerId, isOver }, drop] = useDrop<DragItem, PlaylistDropResult, { handlerId: Identifier | null, isOver: boolean }>({
        accept: [ItemType.SONG_LIST, ItemType.SONG_ROW],
        canDrop: (item: DragItem) => item.type === ItemType.SONG_LIST || item.sourceListId !== list.id,
        drop(item: DragItem, monitor) {
            if (monitor.getItemType() === ItemType.SONG_ROW) {
                if (item.sourceListId && item.sourceListId !== list.id) {
                    onSongDropOnList(item.sourceListId, item.id, list.id);
                    return { targetListId: list.id };
                }
            }
        },
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
                isOver: monitor.isOver() && monitor.canDrop() && monitor.getItemType() === ItemType.SONG_ROW,
            };
        },
        hover(item: DragItem, monitor) {
            if (monitor.getItemType() !== ItemType.SONG_LIST) return;
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset) return;
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

            moveList(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemType.SONG_LIST,
        item: () => ({ id: list.id, index, name: list.name, type: ItemType.SONG_LIST }),
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
        end: () => { onDrop(); }
    });

    const opacity = isDragging ? 0.3 : 1;

    return (
        <motion.div layout="position" transition={{ duration: reducedMotion ? 0 : 0.18 }} 
            ref={(node) => { 
                drop(node); 
                preview(node); 
                ref.current = node; 
            }} 
            style={{ opacity }} 
            data-handler-id={handlerId}
            data-playlist-id={list.id}
            className={`
                group flex items-center justify-between gap-2 px-3 py-3 rounded-xl cursor-pointer transition-colors select-none
                ${isSelected 
                    ? 'bg-primary/[0.08] border border-primary/35 shadow-[inset_3px_0_0_var(--primary)]' 
                    : 'bg-transparent border border-transparent hover:bg-card hover:border-border'
                }
                ${isOver ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
            `}
            onClick={() => onSelect(list.id)}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                {/* Drag Handle */}
                <div 
                    ref={(node) => { drag(node); }} 
                    className="cursor-grab p-0.5 touch-none" 
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    <GripVertical className="size-5 text-muted-foreground/30" />
                </div>
                <ListMusic className={`size-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                <span className="font-medium text-sm text-foreground truncate">{list.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs tabular-nums ${isOver ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isOver ? t('visual.drop_here') : list.songs.length}
                </span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 data-[state=open]:opacity-100"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onExport(list); }}>
                            <Share className="mr-2 size-4" />
                            {t('export_list', 'Exportar lista')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDuplicate(list); }}>
                            <Copy className="mr-2 size-4" />
                            {t('duplicate', 'Duplicar')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(list); }}>
                            <Edit className="mr-2 size-4" />
                            {t('edit', 'Editar')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(list.id); }}>
                            <Trash2 className="mr-2 size-4" />
                            {t('delete', 'Eliminar')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    );
};

function PlaylistDropTarget({ list, onDrop, onSelect }: { list: SongList; onDrop: (source: string, song: string, target: string) => void; onSelect: (id: string) => void }) {
  const { t } = useTranslation();
  const [{ isOver }, drop] = useDrop<DragItem, PlaylistDropResult, { isOver: boolean }>({
    accept: ItemType.SONG_ROW,
    canDrop: item => !!item.sourceListId && item.sourceListId !== list.id,
    drop: item => { if (item.sourceListId) { onDrop(item.sourceListId, item.id, list.id); return { targetListId: list.id }; } },
    collect: monitor => ({ isOver: monitor.isOver() && monitor.canDrop() }),
  });
  return <button type="button" ref={node => { drop(node); }} data-mobile-playlist-id={list.id}
    onClick={() => onSelect(list.id)}
    className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${isOver ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-muted-foreground'}`}>
    <ListMusic className="size-3.5" />{isOver ? t('visual.drop_here') + ' · ' : ''}{list.name}
  </button>;
}

function DragPreview() {
  const { item, offset, dragging } = useDragLayer(monitor => ({
    item: monitor.getItem() as DragItem | null,
    offset: monitor.getClientOffset(),
    dragging: monitor.isDragging(),
  }));
  if (!dragging || !item || !offset) return null;
  return <div aria-hidden="true" className="fixed inset-0 z-[100] pointer-events-none">
    <div style={{ transform: 'translate(' + (offset.x + 12) + 'px, ' + (offset.y + 12) + 'px)' }}
      className="w-max max-w-[65vw] rounded-xl border-2 border-primary bg-card px-4 py-3 shadow-2xl text-foreground">
      <div className="flex items-center gap-2"><GripVertical className="size-4 text-primary" /><span className="truncate">{item.name}</span></div>
    </div>
  </div>;
}

// --- Main SongManager Component ---

export function SongManager() {
  const { currentProject, createSongList, updateSongList, deleteSongList, duplicateSongList, reorderSongLists, createSong, reorderSongs, deleteSong, updateSong, moveSongToList, copySongToList, replicateSongInList } = useProjects();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [openListDialog, setOpenListDialog] = useState(false);
  const [openSongDialog, setOpenSongDialog] = useState(false);
  
  // State derived from URL
  const selectedListId = searchParams.get('listId');
  const selectedSongId = searchParams.get('songId');

  const handleSelectList = useCallback((listId: string) => {
      setSearchParams(prev => {
          prev.set('listId', listId);
          prev.delete('songId');
          return prev;
      }, { replace: true });
  }, [setSearchParams]);

  const handleBackToLists = () => {
      setSearchParams(prev => {
          prev.delete('listId');
          prev.delete('songId');
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

  // Auto-select first list if none selected (desktop only)
  useEffect(() => {
      if (!selectedListId && localLists.length > 0) {
          // Only auto-select on larger screens
          if (window.innerWidth >= 1024) {
              handleSelectList(localLists[0].id);
          }
      }
  }, [localLists, selectedListId, handleSelectList]);

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

  const handleExportListClick = (list: SongList) => {
    if (!list.songs.length) {
      toast.error(t('empty_list_export', 'La lista está vacía'));
      return;
    }
    setExportListDialogProps({ isOpen: true, list });
  };

  const handleExportClipboard = (list: SongList) => {
    const header = `${list.name}\n${'-'.repeat(list.name.length)}\n`;
    const body = list.songs.map((song: Song, index: number) => {
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

  const [editListDialog, setEditListDialog] = useState(false);
  const [listToEdit, setListToEdit] = useState<SongList | null>(null);
  const [editListName, setEditListName] = useState('');
  
  // --- Duplicate List Dialog ---
  const [exportListDialogProps, setExportListDialogProps] = useState<{
      isOpen: boolean;
      list: SongList | null;
  }>({ isOpen: false, list: null });

  const [duplicateListDialogProps, setDuplicateListDialogProps] = useState<{
      isOpen: boolean;
      list: SongList | null;
  }>({ isOpen: false, list: null });

  // --- Move/Copy Dialog State ---
  const [moveCopyDialogProps, setMoveCopyDialogProps] = useState<{
      isOpen: boolean;
      sourceListId: string;
      songId: string;
      targetListId: string | null;
  }>({ isOpen: false, sourceListId: '', songId: '', targetListId: '' });

  const handleSongDropOnList = useCallback((sourceListId: string, songId: string, targetListId: string) => {
      setMoveCopyDialogProps({
          isOpen: true,
          sourceListId,
          songId,
          targetListId
      });
  }, []);

  const handleManualMoveCopyClick = (listId: string, song: Song) => {
      setMoveCopyDialogProps({
          isOpen: true,
          sourceListId: listId,
          songId: song.id,
          targetListId: null // User will select
      });
  };

  const [isTransferring, setIsTransferring] = useState(false);

  const executeMoveCopy = async (action: 'move' | 'copy' | 'replicate') => {
      if (!currentProject) return;
      const { sourceListId, songId, targetListId } = moveCopyDialogProps;
      if (!targetListId || isTransferring || targetListId === sourceListId) return;
      setIsTransferring(true);
      
      try {
          if (action === 'move') {
              await moveSongToList(currentProject.id, sourceListId, songId, targetListId);
              toast.success(t('song_moved', 'Canción movida'));
              // If moving currently selected song, redirect to target list
              if (selectedSongId === songId && selectedListId === sourceListId) {
                  handleSelectList(targetListId);
              }
          } else if (action === 'copy') {
              await copySongToList(currentProject.id, sourceListId, songId, targetListId);
              toast.success(t('song_linked', 'Canción vinculada'));
          } else if (action === 'replicate') {
              await replicateSongInList(currentProject.id, sourceListId, songId, targetListId);
              toast.success(t('song_copied', 'Canción copiada (duplicada)'));
          }
          setMoveCopyDialogProps(prev => ({ ...prev, isOpen: false }));
      } catch (error) {
          console.error(error);
          toast.error(t('action_error', 'Ocurrió un error al realizar la acción.'));
      } finally {
          setIsTransferring(false);
      }
  };

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

  const handleDuplicateListClick = (list: SongList) => {
      setDuplicateListDialogProps({ isOpen: true, list });
  };

  const handleDuplicateList = async (deepCopy: boolean) => {
      const { list } = duplicateListDialogProps;
      if (!currentProject || !list) return;
      try {
          await duplicateSongList(currentProject.id, list.id, deepCopy);
          toast.success(t('songlist_duplicated', 'Lista duplicada correctamente.'));
      } catch {
          toast.error(t('error_duplicating_list', 'Error al duplicar la lista'));
      } finally {
          setDuplicateListDialogProps(prev => ({ ...prev, isOpen: false }));
      }
  };

  const handleDeleteList = (listId: string) => {
    if (!currentProject) return;
    if (confirm(t('delete_list_confirmation', '¿Estás seguro de que quieres eliminar esta lista? Se eliminarán todas las canciones.'))) {
      deleteSongList(currentProject.id, listId);
      // If the deleted list was selected, clear selection
      if (selectedListId === listId) {
          handleBackToLists();
      }
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
      bpm: songData.bpm ?? undefined
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
           
          setIsEditSongOpen(false);
          setEditingSong(null);
          toast.success(t('song_updated', "Canción actualizada"));
      } catch {
          toast.error(t('song_update_error', "Error al actualizar la canción"));
      } finally {
          setIsSavingSong(false);
      }
  };

  const handleEditListClick = (list: SongList) => {
      setListToEdit(list);
      setEditListName(list.name);
      setEditListDialog(true);
  };

  // Calculate duplicate song IDs across all lists (must be before conditional return)
  const duplicateSongIds = React.useMemo(() => {
    if (!currentProject) return new Set<string>();
    const songCounts = new Map<string, number>();
    currentProject.songLists.forEach((list: SongList) => {
        list.songs.forEach((song: Song) => {
            songCounts.set(song.id, (songCounts.get(song.id) || 0) + 1);
        });
    });
    const duplicates = new Set<string>();
    songCounts.forEach((count, id) => {
        if (count > 1) duplicates.add(id);
    });
    return duplicates;
  }, [currentProject, currentProject?.songLists]);

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
  }

  const selectedList = selectedListId 
    ? currentProject.songLists.find((l: SongList) => l.id === selectedListId) 
    : null;

  // --- Render ---
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <DragPreview />
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Song Lists */}
        <div className={`w-full lg:w-[280px] xl:w-[300px] lg:shrink-0 space-y-4 ${selectedListId ? 'hidden lg:block' : 'block'}`}>
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-foreground font-semibold text-base select-none">{t('songs_list', 'Listas de canciones')}</h2>
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

          <p className="hidden lg:block text-xs leading-relaxed text-muted-foreground">{t('visual.drag_hint')}</p>
          {/* Song Lists */}
          {currentProject.songLists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <img src={SongListImage} alt="Song list" className="size-12 mx-auto mb-2" />
              <p>{t('no_lists', 'No hay listas aún')}</p>
              <p className="text-sm">{t('create_first_list', 'Crea tu primera lista de canciones')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {localLists.map((list, index) => (
                <SortableListItem
                  key={list.id}
                  list={list}
                  index={index}
                  isSelected={selectedListId === list.id}
                  moveList={moveList}
                  onDrop={handleListDrop}
                  onSelect={handleSelectList}
                  onEdit={handleEditListClick}
                  onDelete={handleDeleteList}
                  onDuplicate={handleDuplicateListClick}
                  onExport={handleExportListClick}
                  onSongDropOnList={handleSongDropOnList}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Song Content */}
        <div className={`flex-1 min-w-0 ${!selectedListId ? 'hidden lg:block' : 'block'}`}>
          {selectedList ? (
            <Card className="bg-card border-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
              <CardContent className="p-3 sm:p-5">
                {/* Back button (mobile only) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden mb-4 -ml-2 text-muted-foreground hover:text-foreground"
                  onClick={handleBackToLists}
                >
                  <ArrowLeft className="size-4 mr-1" />
                  {t('back_to_lists', 'Listas')}
                </Button>

                {currentProject.songLists.length > 1 && <div className="lg:hidden mb-4">
                  <p className="text-[11px] text-muted-foreground mb-2">{t('visual.drag_hint')}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {currentProject.songLists.filter(list => list.id !== selectedListId).map(list =>
                      <PlaylistDropTarget key={list.id} list={list} onDrop={handleSongDropOnList} onSelect={handleSelectList} />)}
                  </div>
                </div>}

                {/* List Header */}
                <div className="flex items-center justify-between gap-3 pb-4 mb-3 border-b border-border">
                  <h3 className="text-foreground font-poppins font-medium text-xl tracking-tight truncate">{selectedList.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {selectedList.songs.length} {selectedList.songs.length === 1 ? t('song_singular', 'canción') : t('song_plural', 'canciones')}
                  </span>
                </div>

                {/* Add Song Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border border-primary/20 bg-primary/[0.06] text-primary hover:bg-primary/15 justify-center mb-3 rounded-lg text-xs"
                  onClick={() => {
                    setSongCreationListId(selectedList.id);
                    setOpenSongDialog(true);
                  }}
                >
                  <Plus className="size-4 mr-2" />
                  {t('add_song', 'Añadir canción')}
                </Button>

                {/* Song List */}
                {selectedList.songs.length > 0 && (
                  <SortableSongList 
                      listId={selectedList.id}
                      songs={selectedList.songs}
                      onReorder={handleReorder}
                      onSelectSong={handleSelectSong}
                      onDeleteSong={handleDeleteSong}
                      onEditSong={handleEditSongClick}
                      onMoveCopySong={handleManualMoveCopyClick}
                      duplicateSongIds={duplicateSongIds}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="hidden lg:flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <img src={SongListImage} alt="Song list" className="size-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('select_list_hint', 'Selecciona una lista para ver sus canciones')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Dialogs --- */}

      {/* Add Song Dialog */}
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

      {/* Edit List Dialog */}
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

      {/* Export List Dialog */}
      <ExportListDialog 
          isOpen={exportListDialogProps.isOpen}
          onOpenChange={(open: boolean) => setExportListDialogProps(prev => ({ ...prev, isOpen: open }))}
          list={exportListDialogProps.list}
          onExportClipboard={handleExportClipboard}
      />
      
      {/* Duplicate List Dialog */}
      <Dialog open={duplicateListDialogProps.isOpen} onOpenChange={(open: boolean) => {
          if (!open) setDuplicateListDialogProps(prev => ({ ...prev, isOpen: false }));
      }}>
        <DialogContent className="max-w-md bg-card border-border p-6 shadow-xl rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
               <Copy className="size-5 text-primary" />
               {t('duplicate_list', 'Duplicar Lista')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
               {t('duplicate_list_desc', 'Selecciona cómo quieres duplicar las canciones de esta lista.')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {/* Option 1: True Duplicate */}
              <Card 
                className={`relative overflow-hidden cursor-pointer transition-colors border-2 border-border hover:border-primary/50 bg-background hover:bg-accent/5`}
                onClick={() => handleDuplicateList(true)}
              >
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Copy className="size-5 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">
                      {t('duplicate_songs', 'Copiar canciones')}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('duplicate_songs_desc', 'Se crearán copias independientes de cada canción (con sus propios archivos y tabs).')}
                  </p>
                </CardContent>
              </Card>

              {/* Option 2: Link */}
              <Card 
                className={`relative overflow-hidden cursor-pointer transition-colors border-2 border-border hover:border-primary/50 bg-background hover:bg-accent/5`}
                onClick={() => handleDuplicateList(false)}
              >
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <ArrowRightLeft className="size-5 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">
                      {t('link_songs', 'Vincular canciones')}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('link_songs_desc', 'Las mismas canciones aparecerán en la nueva lista. Los cambios en una afectarán a la otra.')}
                  </p>
                </CardContent>
              </Card>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Move/Copy Dialog */}
      <Dialog open={moveCopyDialogProps.isOpen} onOpenChange={isOpen => {
        if (!isTransferring) setMoveCopyDialogProps(prev => ({ ...prev, isOpen }));
      }}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[460px]"
          onEscapeKeyDown={event => { if (isTransferring) event.preventDefault(); }}
          onInteractOutside={event => { if (isTransferring) event.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>{t('visual.transfer_title')}</DialogTitle>
            <DialogDescription>{t('visual.transfer_description')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-background/50 p-4 space-y-2 text-sm">
            <p className="font-medium truncate">{currentProject.songLists.find(list => list.id === moveCopyDialogProps.sourceListId)?.songs.find(song => song.id === moveCopyDialogProps.songId)?.name}</p>
            <div className="flex items-center gap-2 text-muted-foreground text-xs min-w-0">
              <span className="truncate">{currentProject.songLists.find(list => list.id === moveCopyDialogProps.sourceListId)?.name}</span>
              <ArrowRight className="size-3.5 shrink-0 text-primary" />
              <span className="truncate text-foreground">{currentProject.songLists.find(list => list.id === moveCopyDialogProps.targetListId)?.name || t('destination_list', 'Lista destino')}</span>
            </div>
          </div>
          <Select value={moveCopyDialogProps.targetListId || ''} disabled={isTransferring}
            onValueChange={targetListId => setMoveCopyDialogProps(prev => ({ ...prev, targetListId }))}>
            <SelectTrigger aria-label={t('destination_list', 'Lista destino')}><SelectValue placeholder={t('select_list_placeholder', 'Selecciona la lista destino')} /></SelectTrigger>
            <SelectContent>{currentProject.songLists.filter(list => list.id !== moveCopyDialogProps.sourceListId).map(list =>
              <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Button className="h-auto py-4 flex-col items-start whitespace-normal text-left gap-2"
              disabled={!moveCopyDialogProps.targetListId || isTransferring} onClick={() => executeMoveCopy('move')}>
              <span className="flex items-center gap-2"><ArrowRightLeft className="size-4" />{t('move', 'Mover')}</span>
              <span className="text-xs font-normal opacity-80">{t('visual.move_hint')}</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col items-start whitespace-normal text-left gap-2"
              disabled={!moveCopyDialogProps.targetListId || isTransferring} onClick={() => executeMoveCopy('replicate')}>
              <span className="flex items-center gap-2"><Copy className="size-4" />{t('duplicate', 'Duplicar')}</span>
              <span className="text-xs font-normal text-muted-foreground">{t('visual.duplicate_hint')}</span>
            </Button>
          </div>
          {isTransferring && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Loader2 className="size-4 animate-spin" />{t('visual.transferring')}</p>}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer py-2 hover:text-foreground">{t('visual.link_option')}</summary>
            <p className="leading-relaxed mb-2">{t('visual.link_hint')}</p>
            <Button size="sm" variant="outline" disabled={!moveCopyDialogProps.targetListId || isTransferring} onClick={() => executeMoveCopy('copy')}>{t('link', 'Vincular')}</Button>
          </details>
          <Button variant="ghost" disabled={isTransferring} onClick={() => setMoveCopyDialogProps(prev => ({ ...prev, isOpen: false }))}>{t('cancel', 'Cancelar')}</Button>
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
    </DndProvider>
  );
}
