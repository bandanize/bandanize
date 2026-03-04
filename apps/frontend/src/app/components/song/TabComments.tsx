import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Send, Trash2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface TabComment {
  id: number;
  sender: { id: number; name: string };
  message: string;
  timestamp: string;
}

interface TabCommentsProps {
  tabId: string;
}

export function TabComments({ tabId }: TabCommentsProps) {
  const { t } = useTranslation();
  const { currentProject } = useProjects();
  const { user } = useAuth();
  const [comments, setComments] = useState<TabComment[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const mentionFilteredMembers = currentProject?.members.filter(member =>
    member.name.toLowerCase().includes(mentionQuery.toLowerCase()) && member.id !== user?.id
  ) || [];

  const fetchComments = useCallback(async () => {
    try {
      const response = await api.get(`/tabs/${tabId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments', error);
    } finally {
      setIsLoading(false);
    }
  }, [tabId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [comments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    const lastWord = value.split(' ').pop();
    if (lastWord && lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionQuery(lastWord.slice(1));
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
    }
    if (showMentions && e.key === 'Enter') {
      e.preventDefault();
      if (mentionFilteredMembers.length > 0) {
        handleSelectMention(mentionFilteredMembers[0].name);
      }
    }
    if (showMentions && e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || isSending) return;

    setIsSending(true);
    try {
      const response = await api.post(`/tabs/${tabId}/comments`, {
        message: message.trim()
      });
      setComments(prev => [...prev, response.data]);
      setMessage('');
    } catch (error) {
      console.error('Error sending comment', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/tabs/${tabId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment', error);
    }
  };

  const highlightMentions = (text: string) => {
    if (!text || !currentProject) return text;

    const memberNames = currentProject.members.map(m => m.name);
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patternString = `(@(?:${memberNames.map(escapeRegex).join('|')}))`;
    const userRegex = new RegExp(patternString, 'g');

    return text.split(userRegex).map((part, i) => {
      if (part.startsWith('@') && memberNames.includes(part.slice(1))) {
        return (
          <span key={i} className="font-bold text-primary">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 select-none">
        <MessageCircle className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">
          {t('comments', 'Comentarios')}
        </h4>
        <span className="text-xs text-muted-foreground">
          ({comments.length})
        </span>
      </div>

      <div 
        ref={scrollAreaRef} 
        className="max-h-64 overflow-y-auto p-3 space-y-3"
      >
        {isLoading ? (
          <div className="text-center text-muted-foreground/60 py-4 text-sm">
            {t('loading', 'Cargando...')}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground/60 py-4">
            <p className="text-sm">{t('no_comments', 'No hay comentarios')}</p>
            <p className="text-xs">{t('be_first_comment', 'Sé el primero en comentar')}</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = String(comment.sender.id) === user?.id;
            return (
              <div key={comment.id} className="flex gap-2 group">
                <div className="size-7 rounded-full bg-secondary flex items-center justify-center text-foreground text-[10px] shrink-0">
                  {comment.sender.name.substring(0, 2).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-foreground">{comment.sender.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(() => {
                        try {
                          const date = new Date(comment.timestamp);
                          return isNaN(date.getTime()) 
                            ? t('just_now', 'Ahora') 
                            : formatDistanceToNow(date, { addSuffix: true, locale: es });
                        } catch {
                          return t('just_now', 'Ahora');
                        }
                      })()}
                    </span>
                    {isMe && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                        title={t('delete_comment', 'Eliminar comentario')}
                      >
                        <Trash2 className="size-3 text-destructive hover:text-destructive/80" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 break-words mt-0.5">
                    {highlightMentions(comment.message)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-border relative">
        {showMentions && (
          <div className="absolute bottom-full mb-2 left-3 w-56 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
            {mentionFilteredMembers.length > 0 ? (
              mentionFilteredMembers.map(member => (
                <button
                  key={member.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2 text-foreground"
                  onClick={() => handleSelectMention(member.name)}
                >
                  <div className="size-5 bg-secondary rounded-full flex items-center justify-center text-[10px] font-bold text-foreground">
                    {member.name.charAt(0)}
                  </div>
                  {member.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {t('no_members_found', 'No se encontraron miembros')}
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSendComment} className="flex gap-2">
          <Input
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('write_comment', 'Escribe un comentario... (@miembro)')}
            className="flex-1 h-8 text-sm bg-background border-border text-foreground"
            ref={inputRef}
            disabled={isSending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="size-8 bg-primary text-primary-foreground hover:bg-primary/90" 
            disabled={!message.trim() || isSending}
          >
            <Send className="size-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
