import { useSeenContent } from '@/contexts/SongUnreadContext';
import { useUploadName } from '../UploadNameProvider';
import { uploadMedia } from '@/lib/upload-media';
import { resolveAnchor, type CommentAnchor } from '@/lib/comment-anchor';
import { MediaLibrary, type LibraryFile } from './MediaLibrary';
import { toast } from 'sonner';
import { MemberAvatar } from '../MemberAvatar';
import React, { useState, useRef, useEffect } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import axios from 'axios';

import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Send, Trash2, MessageCircle, Paperclip, X, LoaderCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export interface TabComment {
  anchorStart?: number;
  anchorEnd?: number;
  quote?: string;
  attachments?: LibraryFile[];
  id: number;
  sender: { id: number; name: string; photo?: string } | null;
  message: string;
  timestamp: string;
}

interface TabCommentsProps {
  songId: string;
  tabId: string;
  content: string;
  anchor: CommentAnchor | null;
  onClearAnchor: () => void;
  onLocate: (anchor: CommentAnchor) => void;
  onPreview: (file: LibraryFile) => void;
  onCommentsChange: (comments: TabComment[]) => void;
}

export function TabComments({ songId, tabId, content, anchor, onClearAnchor, onLocate, onPreview, onCommentsChange }: TabCommentsProps) {
  const { t, i18n } = useTranslation();
  const requestUploadName = useUploadName();
  const [attachments, setAttachments] = useState<LibraryFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const attach = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]; event.target.value = '';
    if (!picked || uploading || attachments.length >= 5) return;
    const file = await requestUploadName(picked); if (!file) return;
    setUploading(true); setUploadProgress(0);
    try { const uploaded = await uploadMedia(file, setUploadProgress); setAttachments(previous => [...previous, uploaded]); }
    catch { toast.error(t('workspace.upload_failed')); }
    finally { setUploading(false); }
  };
  const { currentProject, updateTabCommentCount } = useProjects();
  const { user } = useAuth();
  const [comments, setComments] = useState<TabComment[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadedTabId, setLoadedTabId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useSeenContent(scrollAreaRef, loadedTabId === tabId ? songId : undefined, 'comments', JSON.stringify(comments.map(comment => comment.id)));

  // Mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionFilteredMembers = currentProject?.members.filter(member =>
    (member.name + ' ' + member.username).toLowerCase().includes(mentionQuery.toLowerCase()) && member.id !== user?.id
  ) || [];

  useEffect(() => {
    let cancelled = false;
    api.get(`/tabs/${tabId}/comments`).then(response => {
      if (!cancelled) { setComments(response.data); setLoadedTabId(tabId); }
    }).catch(() => { if (!cancelled) toast.error(t('workspace.comments_failed')); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [tabId, t]);

  useEffect(() => {
    if (loadedTabId === tabId) updateTabCommentCount(tabId, comments.length);
  }, [tabId, comments.length, loadedTabId, updateTabCommentCount]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [comments]);

  useEffect(() => { onCommentsChange(comments); }, [comments, onCommentsChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value, caret = e.target.selectionStart ?? value.length;
    setMessage(value);
    const match = value.slice(0, caret).match(/(?:^|\s)@([^@\n]*)$/);
    setShowMentions(!!match); setMentionIndex(0);
    setMentionQuery(match?.[1] || '');
    setMentionRange(match ? { start: caret - match[1].length - 1, end: caret } : null);
  };
  const handleSelectMention = (name: string) => {
    const start = mentionRange?.start ?? inputRef.current?.selectionStart ?? message.length;
    const end = mentionRange?.end ?? inputRef.current?.selectionEnd ?? start;
    const prefix = start > 0 && !/\s/.test(message[start - 1]) ? ' ' : '';
    const insertion = prefix + '@' + name + ' ';
    setMessage(message.slice(0, start) + insertion + message.slice(end));
    setShowMentions(false); setMentionRange(null);
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(start + insertion.length, start + insertion.length); });
  };
  const mentionsVisible = showMentions && mentionFilteredMembers.length > 0;

  const [previousAnchor, setPreviousAnchor] = useState(anchor);
  if (previousAnchor !== anchor) {
    setPreviousAnchor(anchor);
    setShowMentions(false); setMentionRange(null); setSendError('');
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!mentionsVisible) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(index => (index + (e.key === 'ArrowDown' ? 1 : -1) + mentionFilteredMembers.length) % Math.max(1, mentionFilteredMembers.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const member = mentionFilteredMembers[mentionIndex]; if (member) handleSelectMention(member.name);
    } else if (e.key === 'Escape') { e.preventDefault(); setShowMentions(false); }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !attachments.length) || !user || isSending || uploading) return;

    setSendError('');
    setIsSending(true);
    try {
      const response = await api.post(`/tabs/${tabId}/comments`, {
        message: message.trim(),
        // The legacy server accepts only string fields. Plain comments need only message.
        ...((anchor || attachments.length) ? { attachments } : {}),
        ...(anchor ? { anchorStart: anchor.start, anchorEnd: anchor.end, quote: anchor.quote } : {})
      });
      setComments(prev => [...prev, response.data]);
      setMessage(''); setAttachments([]); setShowMentions(false); onClearAnchor();
    } catch (error) {
      console.error('Error sending comment', error);
      const response = axios.isAxiosError(error) ? error.response : undefined;
      const reason = response?.data?.message;
      const stale = response?.status === 400 && typeof reason === 'string' && reason.includes('selected passage has changed');
      setSendError(t(stale ? 'comments_ui.stale_error' : !response ? 'comments_ui.network_error' : 'comments_ui.send_error'));
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
      toast.error(t('workspace.comment_failed'));
    }
  };

  const highlightMentions = (text: string) => {
    if (!text || !currentProject) return text;

    const memberNames = currentProject.members.map(m => m.name);
    if (!memberNames.length) return text;
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
    <div className="tab-comments-panel bg-card rounded-xl border border-border overflow-hidden">
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
        className="tab-comments-scroll max-h-[min(32rem,65dvh)] overflow-y-auto px-4 divide-y divide-border/60"
      >
        {isLoading ? (
          <div className="text-center text-muted-foreground/60 py-4 text-sm">
            {t('loading', 'Cargando...')}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground/60 py-4">
            <p className="text-sm">{t('no_comments', 'No hay comentarios')}</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = String(comment.sender?.id) === user?.id;
            return (
              <div key={comment.id} data-tab-comment-id={comment.id} data-seen-key={String(comment.id)} tabIndex={-1} className="py-5 group focus-visible:outline focus-visible:outline-primary rounded-md">
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0"><span className="block text-sm font-medium text-foreground break-words">{comment.sender?.name || t('deleted_user', 'Usuario eliminado')}</span>
                    <span className="block mt-1 text-[11px] text-muted-foreground">
                      {(() => {
                        try {
                          const date = new Date(comment.timestamp);
                          return isNaN(date.getTime()) 
                            ? t('just_now', 'Ahora') 
                            : formatDistanceToNow(date, { addSuffix: true, locale: i18n.language.startsWith('es') ? es : enUS });
                        } catch {
                          return t('just_now', 'Ahora');
                        }
                      })()}
                    </span>
                    </div>
                    {isMe && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity ml-auto shrink-0 p-1"
                        title={t('delete_comment', 'Eliminar comentario')}
                      >
                        <Trash2 className="size-3 text-destructive hover:text-destructive/80" />
                      </button>
                    )}
                  </div>
                  {comment.quote && (() => {
                    const located = resolveAnchor(content, { start: comment.anchorStart ?? -1, end: comment.anchorEnd ?? -1, quote: comment.quote });
                    return <div className="mt-3 mb-3 border-l-2 border-primary/50 bg-primary/[0.04] rounded-r-md py-2 pl-3 pr-2">
                      <button data-comment-locate type="button" disabled={!located} onClick={() => located && onLocate(located)} className="text-left text-xs text-primary hover:underline disabled:text-muted-foreground w-full">
                        <span className="block text-[10px] mb-1">{t(located ? 'workspace.see_passage' : 'workspace.passage_changed')}</span><span className="font-mono whitespace-pre-wrap break-words line-clamp-3">{comment.quote}</span>
                      </button>
                    </div>;
                  })()}
                  <p className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap break-words mt-3">
                    {highlightMentions(comment.message)}
                  </p>
                  {!!comment.attachments?.length && <div className="mt-4"><MediaLibrary files={comment.attachments} title={t('workspace.attachments')} onPreview={onPreview} /></div>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-4 border-t border-border relative">
        {mentionsVisible && (
          <div id="comment-mention-options" role="listbox" aria-label={t('comments_ui.mention')} className="tab-comments-scroll mb-3 w-full bg-popover border border-border rounded-md max-h-48 overflow-y-auto">
            {mentionFilteredMembers.map((member, index) => (
                <button
                  key={member.id} id={`comment-member-${index}`} type="button" role="option" aria-label={member.name} aria-selected={index === mentionIndex}
                  onMouseDown={event => event.preventDefault()}
                  className={`w-full text-left px-3 py-3 hover:bg-accent text-sm flex items-center gap-2 text-foreground ${index === mentionIndex ? 'bg-accent' : ''}`}
                  onClick={() => handleSelectMention(member.name)}
                >
                  <MemberAvatar name={member.name} photo={member.photo} className="size-5" />
                  {member.name}
                </button>
              ))}
          </div>
        )}
        <input type="file" ref={attachmentInput} onChange={attach} className="hidden" />
        {anchor && <div className="mb-3 border-l-2 border-primary bg-primary/5 p-2 text-xs flex gap-2">
          <div className="flex-1 min-w-0"><span className="text-primary">{t('workspace.commenting_on')}</span><p className="font-mono whitespace-pre-wrap line-clamp-3 mt-1">{anchor.quote}</p></div>
          <button type="button" onClick={onClearAnchor} aria-label={t('workspace.clear_selection')}><X className="size-4" /></button>
        </div>}
        {!!attachments.length && <div className="mb-3 space-y-1">{attachments.map(file => <div key={file.url} className="flex gap-2 text-xs items-center"><Paperclip className="size-3 shrink-0" /><span className="truncate">{file.name}</span><button type="button" className="ml-auto" disabled={isSending} onClick={() => setAttachments(previous => previous.filter(item => item.url !== file.url))} aria-label={t('workspace.delete')}><X className="size-3" /></button></div>)}</div>}
        {uploading && <p role="status" className="text-xs text-primary mb-2">{t('workspace.uploading')} {uploadProgress}%</p>}
        {sendError && <p role="alert" className="text-xs text-destructive mb-3">{sendError}</p>}
        <form onSubmit={handleSendComment} className="flex gap-2">
          <Button type="button" size="icon" variant="outline" className="size-8 shrink-0" disabled={uploading || isSending || attachments.length >= 5} onClick={() => attachmentInput.current?.click()} aria-label={t('workspace.attach_file')}><Paperclip className="size-4" /></Button>
          <Input
            id="tab-comment-input" role="combobox" aria-autocomplete="list" aria-expanded={mentionsVisible} aria-controls={mentionsVisible ? "comment-mention-options" : undefined} aria-activedescendant={mentionsVisible && mentionFilteredMembers[mentionIndex] ? `comment-member-${mentionIndex}` : undefined} aria-label={t('workspace.comment')} maxLength={10000}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t(anchor ? 'comments_ui.part_placeholder' : 'comments_ui.general_placeholder')}
            className="flex-1 h-8 text-sm bg-background border-border text-foreground"
            ref={inputRef}
            disabled={isSending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="size-8 bg-primary text-primary-foreground hover:bg-primary/90" 
            aria-label={t('workspace.send_comment')}
            disabled={(!message.trim() && !attachments.length) || isSending || uploading}
          >
            {isSending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
