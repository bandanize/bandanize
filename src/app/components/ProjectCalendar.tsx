import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CalendarEvent, EventType } from '@/types';
import { getProjectEvents, createProjectEvent, updateProjectEvent, deleteProjectEvent, getCalendarToken } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Music, Clock, MapPin, Calendar as CalendarIcon, Download, Trash2, Pencil, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    isAfter,
    parseISO,
} from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface ProjectCalendarProps {
    projectId: string;
}

// Color config per event type matching Figma design
const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string; legendBg: string; legendBorder: string; badgeBg: string; badgeText: string; dot: string }> = {
    CONCIERTO: {
        bg: 'bg-[#2B1F39]',
        border: 'border-[#C78CFF]',
        text: 'text-[#C78CFF]',
        legendBg: '#A855F7',
        legendBorder: '#670EBD',
        badgeBg: 'bg-[#C78CFF]',
        badgeText: 'text-[#2B1F39]',
        dot: 'bg-[#A855F7]',
    },
    ENSAYO: {
        bg: 'bg-[#1A2E39]',
        border: 'border-[#A7E1FA]',
        text: 'text-[#A7E1FA]',
        legendBg: '#38BDF8',
        legendBorder: '#024B6C',
        badgeBg: 'bg-[#A7E1FA]',
        badgeText: 'text-[#1A2E39]',
        dot: 'bg-[#38BDF8]',
    },
    OTRO: {
        bg: 'bg-[#382B2E]',
        border: 'border-[#FFB7C0]',
        text: 'text-[#FFB7C0]',
        legendBg: '#FDA4AF',
        legendBorder: '#8F434C',
        badgeBg: 'bg-[#C48E96]',
        badgeText: 'text-[#382B2E]',
        dot: 'bg-[#FDA4AF]',
    },
};

const DAY_NAMES_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_ES_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES_EN_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ProjectCalendar({ projectId }: ProjectCalendarProps) {
    const { t, i18n } = useTranslation();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [calendarToken, setCalendarToken] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        date: '',
        time: '12:00',
        type: 'OTRO' as EventType,
        location: '',
    });

    const locale = i18n.language?.startsWith('es') ? es : enUS;
    const dayNames = i18n.language?.startsWith('es') ? DAY_NAMES_ES : DAY_NAMES_EN;
    const dayNamesShort = i18n.language?.startsWith('es') ? DAY_NAMES_ES_SHORT : DAY_NAMES_EN_SHORT;

    const fetchEvents = useCallback(async () => {
        try {
            const data = await getProjectEvents(projectId);
            setEvents(data);
        } catch (error) {
            console.error('Failed to load events', error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const fetchToken = useCallback(async () => {
        try {
            const token = await getCalendarToken(projectId);
            setCalendarToken(token);
        } catch (error) {
            console.error('Failed to load calendar token', error);
        }
    }, [projectId]);

    useEffect(() => {
        fetchEvents();
        fetchToken();
    }, [fetchEvents, fetchToken]);

    // Calendar grid generation
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: calStart, end: calEnd });
    }, [currentMonth]);

    const weeks = useMemo(() => {
        const result: Date[][] = [];
        for (let i = 0; i < calendarDays.length; i += 7) {
            result.push(calendarDays.slice(i, i + 7));
        }
        return result;
    }, [calendarDays]);

    const eventsByDay = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        events.forEach(event => {
            const dayKey = format(parseISO(event.date), 'yyyy-MM-dd');
            if (!map[dayKey]) map[dayKey] = [];
            map[dayKey].push(event);
        });
        return map;
    }, [events]);

    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return events
            .filter(e => isAfter(parseISO(e.date), now) || isSameDay(parseISO(e.date), now))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);
    }, [events]);

    const openCreateDialog = (day?: Date) => {
        setEditingEvent(null);
        setFormData({
            name: '',
            description: '',
            date: day ? format(day, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            time: '12:00',
            type: 'OTRO',
            location: '',
        });
        setDialogOpen(true);
    };

    const openEditDialog = (event: CalendarEvent) => {
        setEditingEvent(event);
        const eventDate = parseISO(event.date);
        setFormData({
            name: event.name,
            description: event.description || '',
            date: format(eventDate, 'yyyy-MM-dd'),
            time: format(eventDate, 'HH:mm'),
            type: event.type,
            location: event.location || '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) return;
        const dateTime = `${formData.date}T${formData.time}:00`;

        try {
            if (editingEvent) {
                await updateProjectEvent(editingEvent.id, {
                    name: formData.name,
                    description: formData.description,
                    date: dateTime,
                    type: formData.type,
                    location: formData.location,
                });
                toast.success(t('event_updated'));
            } else {
                await createProjectEvent(projectId, {
                    name: formData.name,
                    description: formData.description,
                    date: dateTime,
                    type: formData.type,
                    location: formData.location,
                });
                toast.success(t('event_created'));
            }
            setDialogOpen(false);
            fetchEvents();
        } catch (error) {
            console.error('Error saving event:', error);
            toast.error(editingEvent ? t('event_update_error', 'Error') : t('event_create_error', 'Error'));
        }
    };

    const handleDelete = async (eventId: number) => {
        if (!window.confirm(t('confirm_delete_event'))) return;
        try {
            await deleteProjectEvent(eventId);
            toast.success(t('event_deleted'));
            fetchEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error(t('delete_error', 'Error'));
        }
    };

    // iCal static export
    const exportToICal = () => {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bandanize//Calendar//EN',
            'CALSCALE:GREGORIAN',
        ];

        events.forEach(event => {
            const dtStart = format(parseISO(event.date), "yyyyMMdd'T'HHmmss");
            lines.push('BEGIN:VEVENT');
            lines.push(`DTSTART:${dtStart}`);
            lines.push(`SUMMARY:${event.name}`);
            if (event.description) lines.push(`DESCRIPTION:${event.description}`);
            if (event.location) lines.push(`LOCATION:${event.location}`);
            lines.push(`CATEGORIES:${event.type}`);
            lines.push(`UID:${event.id}@bandanize`);
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar-${projectId}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Copy live subscription URL
    const copySubscriptionUrl = () => {
        const baseUrl = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL || window.location.origin + '/api';
        // Use token if available, otherwise fallback to legacy (though legacy is deprecated)
        const subUrl = calendarToken 
            ? `${baseUrl}/calendar/${calendarToken}.ics`
            : `${baseUrl}/bands/${projectId}/calendar.ics`;
            
        navigator.clipboard.writeText(subUrl).then(() => {
            toast.success(t('subscription_url_copied', 'URL copiada — pégala en tu app de calendario'));
        });
    };

    if (loading) {
        return (
            <div className="p-4 text-center text-sm text-muted-foreground">
                {t('loading_project', 'Cargando...')}
            </div>
        );
    }

    return (
        <Card className="bg-card border-border rounded-[14px]">
            {/* Card Header */}
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
                {/* Title row with navigation — stacks on mobile */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                    <CardTitle className="text-[16px] font-normal text-foreground">
                        {t('calendar')}
                    </CardTitle>
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <Button
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[8px] h-8 px-2 sm:px-3 text-[13px] sm:text-[14px] font-normal"
                            onClick={() => setCurrentMonth(new Date())}
                        >
                            {t('today')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-[8px] hover:bg-white/5"
                            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                        >
                            <ChevronLeft className="size-4 text-foreground" />
                        </Button>
                        <div className="min-w-[100px] sm:min-w-[140px] text-center">
                            <span className="text-[14px] sm:text-[16px] font-bold text-foreground capitalize">
                                {format(currentMonth, 'MMMM yyyy', { locale })}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-[8px] hover:bg-white/5"
                            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                        >
                            <ChevronRight className="size-4 text-foreground" />
                        </Button>
                        {/* Export & Subscribe buttons */}
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-white/5"
                                onClick={exportToICal}
                                title={t('export_calendar')}
                            >
                                <Download className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-white/5"
                                onClick={copySubscriptionUrl}
                                title={t('subscribe_calendar', 'Suscribirse al calendario')}
                            >
                                <Link2 className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-4">
                    {(['CONCIERTO', 'ENSAYO', 'OTRO'] as EventType[]).map(type => (
                        <div key={type} className="flex items-center gap-1.5">
                            <div
                                className="w-3 h-3 rounded-[4px] flex-shrink-0"
                                style={{
                                    background: EVENT_COLORS[type].legendBg,
                                    border: `1px solid ${EVENT_COLORS[type].legendBorder}`,
                                }}
                            />
                            <span className="text-[11px] sm:text-[12px] text-muted-foreground leading-4">
                                {t(type.toLowerCase())}
                            </span>
                        </div>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-6 sm:space-y-8">
                {/* Calendar Grid */}
                <div className="flex flex-col gap-1 sm:gap-2">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {dayNames.map((day, i) => (
                            <div key={day} className="py-1 sm:py-2 text-center">
                                {/* Full name on desktop, single letter on mobile */}
                                <span className="hidden sm:inline text-[14px] font-bold text-muted-foreground">
                                    {day}
                                </span>
                                <span className="sm:hidden text-[12px] font-bold text-muted-foreground">
                                    {dayNamesShort[i]}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Week rows */}
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="grid grid-cols-7 gap-1 sm:gap-2">
                            {week.map(day => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const dayEvents = eventsByDay[dayKey] || [];
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const todayDay = isToday(day);

                                return (
                                    <div
                                        key={dayKey}
                                        onClick={() => {
                                            // On mobile, tapping a day opens create dialog
                                            if (window.innerWidth < 640 && isCurrentMonth) {
                                                if (dayEvents.length === 0) {
                                                    openCreateDialog(day);
                                                }
                                            }
                                        }}
                                        className={`
                                            flex flex-col rounded-[8px] sm:rounded-[10px]
                                            p-1 sm:p-2
                                            min-h-[44px] sm:min-h-[80px]
                                            ${todayDay
                                                ? 'bg-[rgba(163,230,53,0.15)] border-2 sm:border-[3px] border-primary'
                                                : 'border border-border'
                                            }
                                            ${!isCurrentMonth ? 'opacity-30' : ''}
                                            transition-colors cursor-pointer sm:cursor-default
                                        `}
                                    >
                                        {/* Day header */}
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[12px] sm:text-[14px] ${todayDay ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                                                {format(day, 'd')}
                                            </span>
                                            {/* Add button only visible on desktop */}
                                            {isCurrentMonth && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openCreateDialog(day);
                                                    }}
                                                    className="hidden sm:flex w-5 h-5 items-center justify-center rounded-[6px] hover:bg-white/10 transition-colors"
                                                >
                                                    <Plus className="size-3 text-foreground" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Desktop: event chips */}
                                        <div className="hidden sm:flex flex-col gap-1 flex-1 overflow-hidden mt-1">
                                            {dayEvents.slice(0, 2).map(event => {
                                                const colors = EVENT_COLORS[event.type] || EVENT_COLORS.OTRO;
                                                return (
                                                    <button
                                                        key={event.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditDialog(event);
                                                        }}
                                                        className={`
                                                            ${colors.bg} border ${colors.border}
                                                            rounded-[4px] px-1.5 py-0.5 text-left
                                                            hover:opacity-80 transition-opacity w-full
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span className={`text-[11px] leading-4 truncate flex-1 ${colors.text}`}>
                                                                {event.name}
                                                            </span>
                                                            <Music className={`size-2.5 flex-shrink-0 ${colors.text}`} />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Clock className={`size-2.5 flex-shrink-0 ${colors.text}`} />
                                                            <span className={`text-[10px] leading-4 ${colors.text}`}>
                                                                {format(parseISO(event.date), 'HH:mm')}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                            {dayEvents.length > 2 && (
                                                <span className="text-[10px] text-muted-foreground text-center">
                                                    +{dayEvents.length - 2}
                                                </span>
                                            )}
                                        </div>

                                        {/* Mobile: colored dots */}
                                        {dayEvents.length > 0 && (
                                            <div className="flex sm:hidden gap-0.5 mt-1 justify-center flex-wrap">
                                                {dayEvents.slice(0, 3).map(event => {
                                                    const colors = EVENT_COLORS[event.type] || EVENT_COLORS.OTRO;
                                                    return (
                                                        <div
                                                            key={event.id}
                                                            className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}
                                                        />
                                                    );
                                                })}
                                                {dayEvents.length > 3 && (
                                                    <span className="text-[8px] text-muted-foreground leading-none">+</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Upcoming Events Section */}
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[14px] sm:text-[16px] font-normal text-foreground">
                            {t('upcoming_events')}
                        </h3>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-[8px] sm:hidden"
                            onClick={() => openCreateDialog()}
                        >
                            <Plus className="size-4 mr-1" />
                            <span className="text-[12px]">{t('create_event')}</span>
                        </Button>
                    </div>

                    {upcomingEvents.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-6 sm:py-8">
                            {t('no_events')}
                        </div>
                    ) : (
                        upcomingEvents.map(event => {
                            const colors = EVENT_COLORS[event.type] || EVENT_COLORS.OTRO;
                            const eventDate = parseISO(event.date);

                            return (
                                <div
                                    key={event.id}
                                    className={`${colors.bg} border ${colors.border} rounded-[10px] p-3 sm:p-4`}
                                >
                                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                                        <div className="flex-1 flex flex-col gap-1 min-w-0">
                                            {/* Title + type badge */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className={`text-[14px] sm:text-[16px] font-bold ${colors.text} truncate`}>
                                                    {event.name}
                                                </h4>
                                                <Music className={`size-3.5 sm:size-4 flex-shrink-0 ${colors.text}`} />
                                            </div>

                                            {/* Details */}
                                            <div className="flex flex-col gap-0.5 sm:gap-1 mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarIcon className={`size-3 sm:size-3.5 flex-shrink-0 ${colors.text}`} />
                                                    <span className={`text-[12px] sm:text-[14px] ${colors.text}`}>
                                                        {format(eventDate, 'd MMM yyyy', { locale })}
                                                    </span>
                                                    <span className={`text-[12px] sm:text-[14px] ${colors.text}`}>
                                                        · {format(eventDate, 'HH:mm')}
                                                    </span>
                                                </div>
                                                {event.location && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className={`size-3 sm:size-3.5 flex-shrink-0 ${colors.text}`} />
                                                        <span className={`text-[12px] sm:text-[14px] ${colors.text} truncate`}>
                                                            {event.location}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description — hidden on very small screens */}
                                            {event.description && (
                                                <p className={`hidden sm:block text-[14px] ${colors.text} opacity-80 mt-1 line-clamp-2`}>
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Type badge + actions */}
                                        <div className="flex flex-col items-end gap-1 sm:gap-2 flex-shrink-0">
                                            <span className={`${colors.badgeBg} ${colors.badgeText} text-[10px] sm:text-[12px] font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-[4px]`}>
                                                {t(event.type.toLowerCase())}
                                            </span>
                                            <div className="flex gap-0.5 sm:gap-1">
                                                <button
                                                    onClick={() => openEditDialog(event)}
                                                    className={`p-1 sm:p-1.5 rounded-[4px] hover:bg-white/10 transition-colors ${colors.text}`}
                                                >
                                                    <Pencil className="size-3 sm:size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className={`p-1 sm:p-1.5 rounded-[4px] hover:bg-white/10 transition-colors ${colors.text}`}
                                                >
                                                    <Trash2 className="size-3 sm:size-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>

            {/* Create/Edit Event Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-card border-border text-foreground max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            {editingEvent ? t('edit_event') : t('create_event')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 sm:space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <Label className="text-foreground text-[13px] sm:text-[14px]">{t('event_name')}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, name: e.target.value }))}
                                placeholder={t('event_name')}
                                className="bg-background border-border text-foreground h-9 sm:h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-foreground text-[13px] sm:text-[14px]">{t('event_description')}</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(p => ({ ...p, description: e.target.value }))}
                                placeholder={t('event_description')}
                                className="bg-background border-border text-foreground"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-foreground text-[13px] sm:text-[14px]">{t('event_date')}</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, date: e.target.value }))}
                                    className="bg-background border-border text-foreground h-9 sm:h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-foreground text-[13px] sm:text-[14px]">{t('event_date')}</Label>
                                <Input
                                    type="time"
                                    value={formData.time}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, time: e.target.value }))}
                                    className="bg-background border-border text-foreground h-9 sm:h-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-foreground text-[13px] sm:text-[14px]">{t('event_type')}</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val: string) => setFormData(p => ({ ...p, type: val as EventType }))}
                            >
                                <SelectTrigger className="bg-background border-border text-foreground h-9 sm:h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="CONCIERTO">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: EVENT_COLORS.CONCIERTO.legendBg }} />
                                            {t('concierto')}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="ENSAYO">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: EVENT_COLORS.ENSAYO.legendBg }} />
                                            {t('ensayo')}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="OTRO">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: EVENT_COLORS.OTRO.legendBg }} />
                                            {t('otro')}
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-foreground text-[13px] sm:text-[14px]">{t('event_location')}</Label>
                            <Input
                                value={formData.location}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, location: e.target.value }))}
                                placeholder={t('event_location')}
                                className="bg-background border-border text-foreground h-9 sm:h-10"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            {editingEvent && (
                                <Button
                                    variant="destructive"
                                    className="bg-destructive/20 text-destructive hover:bg-destructive/40 border border-destructive/50 text-[13px]"
                                    onClick={() => {
                                        handleDelete(editingEvent.id);
                                        setDialogOpen(false);
                                    }}
                                >
                                    <Trash2 className="size-4 mr-1.5" />
                                    <span className="hidden sm:inline">{t('delete_event')}</span>
                                    <span className="sm:hidden">{t('delete_event')}</span>
                                </Button>
                            )}
                            <Button
                                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] sm:text-[14px]"
                                onClick={handleSubmit}
                            >
                                {editingEvent ? t('save_changes') : t('create_event')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
