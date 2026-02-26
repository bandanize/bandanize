import React, { useEffect, useState } from 'react';
import { getProjectNotifications } from '@/services/api';
import { Notification } from '@/types';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { format } from 'date-fns';
import { 
    ListMusic, 
    MessageSquare, 
    UserPlus, 
    Calendar, 
    Music 
} from 'lucide-react';

interface NotificationFeedProps {
    projectId: string;
}

export function NotificationFeed({ projectId }: NotificationFeedProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                // Fetch notifications (they will come as isRead=false if not marked yet)
                const data = await getProjectNotifications(projectId);
                setNotifications(data);
            } catch (error) {
                console.error('Failed to load notifications', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [projectId]);

    const getNotificationStyle = (type: Notification['type']) => {
        switch (type) {
            case 'EVENT_CREATED': 
            case 'EVENT_MODIFIED': 
                return { 
                    icon: <Calendar className="h-4 w-4" />, 
                    color: "text-sky-400", // #38BDF8
                    borderColor: "border-l-sky-400"
                };
            case 'CHAT_MENTION': 
                return { 
                    icon: <MessageSquare className="h-4 w-4" />, 
                    color: "text-yellow-400", // #FACC15
                    borderColor: "border-l-yellow-400"
                };
            case 'SONG_ADDED': 
            case 'FILE_ADDED': 
                return { 
                    icon: <Music className="h-4 w-4" />, 
                    color: "text-orange-400", // #FB923C
                    borderColor: "border-l-orange-400"
                };
            case 'MEMBER_ADDED': 
            case 'MEMBER_REMOVED': 
                return { 
                    icon: <UserPlus className="h-4 w-4" />,
                    color: "text-purple-500", // #A855F7
                    borderColor: "border-l-purple-500"
                };
            case 'LIST_CREATED': 
            case 'TAB_CREATED':
                return { 
                    icon: <ListMusic className="h-4 w-4" />, 
                    color: "text-[#FDA4AF]", // #FDA4AF
                    borderColor: "border-l-[#FDA4AF]"
                };
            default: 
                return { 
                    icon: <ListMusic className="h-4 w-4" />, 
                    color: "text-slate-400",
                    borderColor: "border-l-slate-400"
                };
        }
    };

    const getMessage = (notification: Notification) => {
        const { actor, type, metadata } = notification;
        const actorName = actor.name || actor.username;

        switch (type) {
            case 'LIST_CREATED':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> creó la lista "{metadata.listName}"</span>;
            case 'SONG_ADDED':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> añadió la canción "{metadata.songName}"</span>;
            case 'MEMBER_ADDED':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> añadió a {metadata.targetUserName || "un miembro"} como miembro del proyecto</span>;
            case 'MEMBER_REMOVED':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> eliminó a un miembro</span>;
            case 'CHAT_MENTION':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> te ha mencionado en el chat</span>;
            case 'EVENT_CREATED':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> creó el evento "{metadata.eventName}"</span>;
            case 'EVENT_MODIFIED':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> modificó el evento "{metadata.eventName}"</span>;
            case 'FILE_ADDED':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> añadió un archivo</span>;
            case 'TAB_CREATED':
                return <span><strong className="font-bold text-foreground">{actorName}</strong> creó la tablatura "{metadata.tabName}"</span>;
            default:
                return <span><strong className="font-bold text-foreground">{actorName}</strong> realizó una acción</span>;
        }
    };

    if (loading) {
        return <div className="p-4 text-center text-sm text-muted-foreground">Loading notifications...</div>;
    }

    if (notifications.length === 0) {
        return <div className="p-4 text-center text-sm text-muted-foreground">No recent activity</div>;
    }

    return (
        <ScrollArea className="h-[600px] w-full rounded-xl border bg-card shadow-sm">
            <div className="flex flex-col">
                {notifications.map((notification) => {
                    const style = getNotificationStyle(notification.type);
                    return (
                        <div 
                            key={notification.id} 
                            className={`flex items-start gap-4 p-4 border-b border-[#2B2B31] last:border-0 transition-all duration-200 ${
                                notification.isRead 
                                    ? 'opacity-50 border-l-[4px] border-l-transparent' 
                                    : `border-l-[4px] ${style.borderColor} bg-transparent`
                            }`}
                        >
                            <div className="mt-0.5">
                                 <div className={`${style.color}`}>
                                    {style.icon}
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="text-sm leading-snug text-foreground font-normal">
                                    {getMessage(notification)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(notification.createdAt), 'MMM d, yyyy • h:mm a')}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
