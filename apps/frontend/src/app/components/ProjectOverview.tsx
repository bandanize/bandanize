import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Music, Calendar, MessageSquare, Users, Bell, ListMusic } from 'lucide-react';
import type { Project } from '@/contexts/ProjectContext';
import type { CalendarEvent, Notification } from '@/types';
import { getProjectEvents, getProjectNotifications } from '@/services/api';
import { MemberAvatar } from './MemberAvatar';

export function ProjectOverview({ project, unreadCount, onOpen }: { project: Project; unreadCount: number; onOpen: (tab: string, song?: { listId: string; songId: string }) => void }) {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [now] = useState(() => Date.now());
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getProjectEvents(project.id), getProjectNotifications(project.id)]).then(([calendar, activity]) => {
      if (cancelled) return;
      const failed: string[] = [];
      if (calendar.status === 'fulfilled') setEvents(calendar.value); else failed.push('calendar');
      if (activity.status === 'fulfilled') setNotifications(activity.value); else failed.push('notifications');
      setErrors(failed); setLoading(false);
    });
    return () => { cancelled = true; };
  }, [project.id, revision]);
  const songs = project.songLists.flatMap(list => list.songs.map(song => ({ ...song, listId: list.id, listName: list.name })));
  const upcoming = events.filter(event => new Date(event.date).getTime() >= now).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0,3);
  const messages = [...project.chat].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0,3);
  const recent = [...notifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,3);
  const date = (value: string | Date) => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  const empty = (text: string) => <p className="text-sm text-muted-foreground py-5">{t('workspace.'+text)}</p>;
  const state = (key: string) => loading ? <p role="status" className="text-sm text-muted-foreground py-5">{t('workspace.loading')}</p> : errors.includes(key) ? <div className="text-sm py-5 text-muted-foreground">{t('workspace.load_failed')} <button onClick={() => { setLoading(true); setErrors([]); setRevision(v => v+1); }} className="text-primary underline">{t('workspace.retry')}</button></div> : null;
  const card = (key: string, title: string, icon: ReactNode, children: ReactNode, className = '') => <section className={`min-w-0 rounded-2xl border border-border bg-card p-5 ${className}`}>
    <div className="flex items-center justify-between gap-3 mb-4"><h2 className="flex items-center gap-2 text-sm font-medium">{icon}{t('workspace.'+title)}</h2><button onClick={() => onOpen(key)} aria-label={`${t('workspace.open')}: ${t('workspace.'+title)}`} className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"><ArrowUpRight className="size-4" /></button></div>{children}
  </section>;
  return <div className="space-y-5">
    <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-7">
      <p className="text-xs uppercase tracking-widest text-primary mb-2">{t('workspace.overview')}</p><h1 className="text-2xl sm:text-3xl font-semibold break-words">{project.name}</h1><p className="text-sm text-muted-foreground mt-2">{t('workspace.overview_hint')}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">{[
        { label:'songs', value: new Set(songs.map(s=>s.id)).size, tab:'songs', Icon:Music },
        { label:'lists', value:project.songLists.length, tab:'songs', Icon:ListMusic },
        { label:'members', value:project.members.length, tab:'members', Icon:Users },
        { label:'unread', value:unreadCount, tab:'notifications', Icon:Bell },
      ].map(({label,value,tab,Icon})=><button key={label} onClick={()=>onOpen(tab)} className="text-left rounded-xl bg-background/50 border border-border/70 p-3 hover:border-primary/40"><span className="text-xs text-muted-foreground flex items-center gap-2"><Icon className="size-3.5" />{t('workspace.'+label)}</span><strong className="block text-2xl font-semibold mt-1">{value}</strong></button>)}</div>
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      {card('songs','repertoire',<Music className="size-4 text-primary" />, songs.length ? <div className="divide-y divide-border">{songs.slice(0,4).map(song=><button key={`${song.listId}-${song.id}`} onClick={()=>onOpen('songs',{listId:song.listId,songId:song.id})} className="flex items-center w-full text-left gap-3 py-3 hover:text-primary"><span className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Music className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm truncate">{song.name}</span><span className="block text-xs text-muted-foreground truncate">{song.listName}{song.originalBand ? ` · ${song.originalBand}` : ''}</span></span><ArrowUpRight className="size-4 text-muted-foreground" /></button>)}</div> : empty('no_songs'))}
      {card('calendar','next_events',<Calendar className="size-4 text-primary" />, state('calendar') || (upcoming.length ? <div className="divide-y divide-border">{upcoming.map(event=><button key={event.id} onClick={()=>onOpen('calendar')} className="block w-full text-left py-3 hover:text-primary"><span className="text-xs text-primary">{date(event.date)}</span><span className="block text-sm font-medium mt-1 break-words">{event.name}</span><span className="block text-xs text-muted-foreground truncate mt-1">{event.location}</span></button>)}</div> : empty('no_events')))}
    </div>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
      {card('chat','recent_chat',<MessageSquare className="size-4 text-primary" />, messages.length ? <div className="space-y-4">{messages.map(message=><button key={message.id} onClick={()=>onOpen('chat')} className="text-left block w-full rounded-lg hover:bg-accent p-1"><span className="text-xs font-medium">{message.userName}</span><p className="text-sm text-muted-foreground line-clamp-2 break-words mt-1">{message.message}</p></button>)}</div> : empty('no_chat'))}
      {card('members','team',<Users className="size-4 text-primary" />, <div className="space-y-3">{project.members.slice(0,5).map(member=><button key={member.id} onClick={()=>onOpen('members')} className="w-full flex items-center gap-3 text-left hover:text-primary"><MemberAvatar name={member.name} photo={member.photo} className="size-8" /><span className="text-sm truncate">{member.name}</span></button>)}</div>)}
      {card('notifications','activity',<Bell className="size-4 text-primary" />, state('notifications') || (recent.length ? <div className="space-y-4">{recent.map(notification=><button key={notification.id} onClick={()=>onOpen('notifications')} className="block text-left w-full hover:text-primary"><span className="flex items-start gap-2 text-sm"><span className={`size-1.5 mt-1.5 shrink-0 rounded-full ${notification.isRead ? 'bg-muted-foreground' : 'bg-primary'}`} /><span className="line-clamp-2 break-words">{notification.message || notification.title || [notification.actor?.name, notification.metadata?.songName || notification.metadata?.eventName || notification.metadata?.tabName || notification.metadata?.listName || t('workspace.new_activity')].filter(Boolean).join(' · ')}</span></span><span className="text-xs text-muted-foreground ml-3.5">{date(notification.createdAt)}</span></button>)}</div> : empty('no_activity')),'md:col-span-2 xl:col-span-1')}
    </div>
  </div>;
}
