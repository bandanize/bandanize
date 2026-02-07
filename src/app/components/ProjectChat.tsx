import React, { useState, useRef, useEffect } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';

import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function ProjectChat() {
  const { currentProject, sendMessage } = useProjects();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentProject?.chat]);

  // Mention logic
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionFilteredMembers = currentProject?.members.filter(member => 
    member.name.toLowerCase().includes(mentionQuery.toLowerCase()) && member.id !== user?.id
  ) || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Simple mention detection: if last word starts with @
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
      words.pop(); // Remove partial mention
      const newMessage = [...words, `@${name} `].join(' ');
      setMessage(newMessage);
      setShowMentions(false);
      inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault(); 
        // Could implement navigation here
    }
    if (showMentions && e.key === 'Enter') {
        e.preventDefault();
        if (mentionFilteredMembers.length > 0) {
            handleSelectMention(mentionFilteredMembers[0].name);
        }
    }
    // Allow Escape to close mentions
    if (showMentions && e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && currentProject) {
      sendMessage(currentProject.id, message);
      setMessage('');
    }
  };

  const highlightMentions = (text: string, isOwnMessage: boolean) => {
    if (!text) return null;
    
    const memberNames = currentProject?.members
      .map(m => m.name)
      .sort((a, b) => b.length - a.length) || [];

    if (memberNames.length === 0) return text;

    const escapeRegex = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Match valid member names
    const patternString = `(@(?:${memberNames.map(escapeRegex).join('|')}))`;
    const regex = new RegExp(patternString, 'g');
    
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.startsWith('@') && memberNames.includes(part.slice(1))) {
        return (
          <span 
            key={index} 
            className={`font-bold ${isOwnMessage ? 'text-blue-600' : 'text-primary'}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (!currentProject) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center bg-card">
        <div>
          <h3 className="text-foreground font-medium">Chat del Proyecto</h3>
          <p className="text-xs text-muted-foreground">General</p>
        </div>
      </div>

      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
                {/* Avatar logic - assuming we don't have avatar URL in msg yet, using fallback */}
                 <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-foreground text-xs shrink-0">
                    {msg.userName.substring(0, 2).toUpperCase()}
                 </div>
                
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
                          ? 'Ahora' 
                          : formatDistanceToNow(date, { addSuffix: true, locale: es });
                      } catch {
                        return 'Ahora';
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
              <div className="absolute bottom-full mb-2 left-4 w-64 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-10">
                {mentionFilteredMembers.length > 0 ? (
                  mentionFilteredMembers.map(member => (
                    <button
                      key={member.id}
                      className="w-full text-left px-4 py-2 hover:bg-accent text-sm flex items-center gap-2 text-foreground"
                      onClick={() => handleSelectMention(member.name)}
                    >
                       <div className="size-6 bg-secondary rounded-full flex items-center justify-center text-xs font-bold text-foreground">
                          {member.name.charAt(0)}
                       </div>
                       {member.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-muted-foreground">No se encontraron miembros</div>
                )}
              </div>
           )}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-background border-border text-foreground focus-visible:ring-ring"
              ref={inputRef}
            />
            <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={!message.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
      </div>
    </div>
  );
}
