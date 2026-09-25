import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { markChatAsRead } from '@/services/api';
import { MemberAvatar } from './MemberAvatar';
import React, { useState, useRef, useEffect } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Send, ListMusic, Music, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function ProjectChat() {
  const { currentProject, sendMessage, chatSyncFailed } = useProjects();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const nearBottom = useRef(true);
  const [message, setMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [, setSearchParams] = useSearchParams();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (nearBottom.current) scrollToBottom();
  }, [currentProject?.chat]);

  useEffect(() => {
    if (!currentProject?.id) return;
    const read = () => {
      if (document.visibilityState === 'visible' && nearBottom.current)
        void markChatAsRead(currentProject.id).catch(() => {});
    };
    read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, [currentProject?.id, currentProject?.chat.length]);

  // Mention logic
  const [showMentions, setShowMentions] = useState(false);
  const [mentionType, setMentionType] = useState<'user' | 'content'>('user');
  const [mentionQuery, setMentionQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionFilteredMembers = currentProject?.members.filter(member => 
    member.name.toLowerCase().includes(mentionQuery.toLowerCase()) && member.id !== user?.id
  ) || [];

  // Content Suggestions
  const contentSuggestions = React.useMemo(() => {
    if (!currentProject || mentionType !== 'content') return [];
    const query = mentionQuery.toLowerCase();
    
    const suggestions: { 
        id: string; 
        name: string; 
        type: 'list' | 'song' | 'tab'; 
        level: number;
        subtitle?: string; // Keep for fallback or additional info
        data?: { listId: string; songId?: string };
    }[] = [];

    currentProject.songLists.forEach(list => {
      const listMatches = list.name.toLowerCase().includes(query);
      
      // Filter songs that match OR have matching tabs
      const matchingSongs = list.songs.map(song => {
          const songMatches = song.name.toLowerCase().includes(query);
          const matchingTabs = song.tablatures.filter(tab => tab.name.toLowerCase().includes(query));
          return { song, songMatches, matchingTabs };
      }).filter(result => result.songMatches || result.matchingTabs.length > 0);

      // If list matches or has matching children, include it
      if (listMatches || matchingSongs.length > 0) {
          suggestions.push({ 
              id: list.id, 
              name: list.name, 
              type: 'list', 
              level: 0 
          });

          matchingSongs.forEach(({ song, songMatches, matchingTabs }) => {
              if (listMatches || songMatches || matchingTabs.length > 0) {
                  suggestions.push({
                      id: song.id,
                      name: song.name,
                      type: 'song',
                      level: 1,
                      data: { listId: list.id }
                  });

                  const tabsToShow = songMatches ? song.tablatures : matchingTabs;
                  
                  tabsToShow.forEach(tab => {
                      suggestions.push({
                          id: tab.id,
                          name: tab.name,
                          type: 'tab',
                          level: 2,
                          data: { listId: list.id, songId: song.id }
                      });
                  });
              }
          });
      }
    });

    return suggestions;
  }, [currentProject, mentionQuery, mentionType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    const lastWord = value.split(' ').pop();
    if (lastWord) {
        if (lastWord.startsWith('@')) {
            setShowMentions(true);
            setMentionType('user');
            setMentionQuery(lastWord.slice(1));
        } else if (lastWord.startsWith('#')) {
            setShowMentions(true);
            setMentionType('content');
            setMentionQuery(lastWord.slice(1));
        } else {
            setShowMentions(false);
        }
    } else {
        setShowMentions(false);
    }
  };

  const handleSelectMention = (name: string) => {
      const words = message.split(' ');
      words.pop();
      const newMessage = [...words, `@${name} `].join(' ');
      setMessage(newMessage);
      setShowMentions(false);
      inputRef.current?.focus();
  };

  const handleSelectContentMention = (item: typeof contentSuggestions[0]) => {
      const words = message.split(' ');
      words.pop();
       // Format: #[Name](type:id:extraData)
       // extraData needed for navigation (e.g. listId for song)
       let idString = `${item.type}:${item.id}`;
       if (item.type === 'song' && item.data) idString += `:${item.data.listId}`;
       if (item.type === 'tab' && item.data) idString += `:${item.data.listId}:${item.data.songId}`;

      const newMessage = [...words, `#[${item.name}](${idString}) `].join(' ');
      setMessage(newMessage);
      setShowMentions(false);
      inputRef.current?.focus();
  };

  const navigateToContent = (type: string, id: string, extra1?: string, extra2?: string) => {
      setSearchParams(prev => {
          prev.set('tab', 'songs');
          if (type === 'list') {
              prev.set('listId', id);
              prev.delete('songId');
              prev.delete('tabId');
          } else if (type === 'song') {
              if (extra1) prev.set('listId', extra1); // listId
              prev.set('songId', id);
              prev.delete('tabId');
          } else if (type === 'tab') {
               if (extra1) prev.set('listId', extra1); // listId
               if (extra2) prev.set('songId', extra2); // songId
               prev.set('tabId', id);
          }
          return prev;
      }, { replace: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault(); 
    }
    if (showMentions && e.key === 'Enter') {
        e.stopPropagation();
        e.preventDefault();
        if (mentionType === 'user' && mentionFilteredMembers.length > 0) {
            handleSelectMention(mentionFilteredMembers[0].name);
        } else if (mentionType === 'content' && contentSuggestions.length > 0) {
            handleSelectContentMention(contentSuggestions[0]);
        }
    }
    if (showMentions && e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentProject || sending) return;
    const draft = message;
    setSending(true);
    try {
      await sendMessage(currentProject.id, draft);
      setMessage(previous => previous === draft ? '' : previous);
      nearBottom.current = true;
      scrollToBottom();
    } catch {
      toast.error(t('chat_send_failed', 'No se pudo enviar. Tu mensaje sigue aquí; vuelve a intentarlo.'));
    } finally { setSending(false); }
  };

  const highlightMentions = (text: string, isOwnMessage: boolean) => {
    const mentionClass = isOwnMessage
      ? 'text-[#29410a] bg-black/5 underline decoration-current font-bold rounded px-0.5'
      : 'text-primary bg-primary/10 font-bold rounded px-0.5';
    const names = (currentProject?.members.map(member => member.name).filter(Boolean) || [])
      .sort((a, b) => b.length - a.length);
    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const renderUsers = (value: string, key: number) => {
      if (!names.length) return value;
      const regex = new RegExp('(@(?:' + names.map(escapeRegex).join('|') + '))(?![\\p{L}\\p{N}_])', 'gu');
      return value.split(regex).map((part, index) =>
        names.includes(part.slice(1)) && part.startsWith('@')
          ? <span key={key + '-' + index} className={mentionClass}>{part}</span>
          : part);
    };
    const parts: React.ReactNode[] = [];
    const contentRegex = /#\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    for (const match of text.matchAll(contentRegex)) {
      const index = match.index!;
      parts.push(<React.Fragment key={'text-' + index}>{renderUsers(text.slice(lastIndex, index), index)}</React.Fragment>);
      const [type, id, extra1, extra2] = match[2].split(':');
      parts.push(
        <button key={'content-' + index} type="button"
          className={mentionClass + ' inline text-left hover:underline focus-visible:outline focus-visible:outline-2'}
          onClick={() => navigateToContent(type, id, extra1, extra2)}>
          #{match[1]}
        </button>
      );
      lastIndex = index + match[0].length;
    }
    parts.push(<React.Fragment key="tail">{renderUsers(text.slice(lastIndex), lastIndex)}</React.Fragment>);
    return <>{parts}</>;
  };

  if (!currentProject) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center bg-card select-none">
        <div>
          <h3 className="text-foreground font-medium">Chat del Proyecto</h3>
          <p className="text-xs text-muted-foreground">General</p>
        </div>
      </div>

      {chatSyncFailed && (
        <p role="status" className="px-4 py-2 text-xs text-amber-400 border-b border-border">
          {t('chat_reconnecting', 'No se puede actualizar el chat. Reintentando la conexión…')}
        </p>
      )}
      <div ref={scrollAreaRef} onScroll={event => {
        const area = event.currentTarget;
        nearBottom.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
      }} className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentProject.chat.length === 0 ? (
          <div className="text-center text-muted-foreground/60 py-8">
            <p>No hay mensajes aún</p>
            <p className="text-xs">Sé el primero en enviar un mensaje</p>
          </div>
        ) : (
          currentProject.chat.map((msg) => {
            const isMe = msg.userId === user?.id;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                 <MemberAvatar name={msg.userName} photo={isMe ? user?.photo || msg.userPhoto : currentProject.members.find(member => member.id === msg.userId)?.photo ?? msg.userPhoto} />
                
                <div className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-sm text-foreground font-medium">{msg.userName}</span>
                  <div 
                    className={`p-3 rounded-lg text-sm break-words ${
                      isMe 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    {highlightMentions(msg.message, isMe)}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {(() => {
                      try {
                        const date = new Date(msg.timestamp);
                        return isNaN(date.getTime()) 
                          ? '—' 
                          : formatDistanceToNow(date, { addSuffix: true, locale: es });
                      } catch {
                        return '—';
                      }
                    })()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border bg-card relative">
           {showMentions && (
              <div className="absolute bottom-full mb-2 left-4 w-64 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-10 max-h-60 overflow-y-auto">
                 {mentionType === 'user' ? (
                     mentionFilteredMembers.length > 0 ? (
                        mentionFilteredMembers.map(member => (
                            <button
                            key={member.id}
                            className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-2 text-foreground"
                            onClick={() => handleSelectMention(member.name)}
                            >
                                <MemberAvatar name={member.name} photo={member.photo} className="size-6" />
                                {member.name}
                            </button>
                        ))
                    ) : <div className="px-4 py-2 text-sm text-muted-foreground">No se encontraron miembros</div>
                 ) : (
                     contentSuggestions.length > 0 ? (
                        contentSuggestions.map(item => (
                            <button
                                key={`${item.type}-${item.id}`}
                                className={`w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-2 text-foreground ${
                                    item.level === 1 ? 'pl-8' : item.level === 2 ? 'pl-12' : ''
                                }`}
                                onClick={() => handleSelectContentMention(item)}
                            >
                                {item.type === 'list' && <ListMusic className="size-4 text-primary" />}
                                {item.type === 'song' && <Music className="size-4 text-blue-500" />}
                                {item.type === 'tab' && <FileText className="size-4 text-green-500" />}
                                
                                <span className={item.level === 0 ? 'font-semibold' : ''}>
                                    {item.name}
                                </span>
                            </button>
                        ))
                     ) : <div className="px-4 py-2 text-sm text-muted-foreground">No se encontró contenido</div>
                 )}
              </div>
           )}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje... (@miembro, #contenido)"
              className="flex-1 bg-background border-border text-foreground focus-visible:ring-ring"
              ref={inputRef}
            />
            <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90" aria-label={t("send", "Enviar")} disabled={sending || !message.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
      </div>
    </div>
  );
}
