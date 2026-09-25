import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { CalendarEvent, EventType } from '@/types';
import { getProjectEvents, createProjectEvent, updateProjectEvent, deleteProjectEvent, getCalendarToken } from '@/services/api';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, MapPin, Download, Trash2, MoreHorizontal, Link2, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CalendarImage from '@/assets/calendar.svg';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
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

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid';
const eventDateValue = (event: CalendarEvent) => event.startsAt || event.date;
const DAY_NAMES_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_ES_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES_EN_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ProjectCalendar({ projectId }: ProjectCalendarProps) {
    const { t, i18n } = useTranslation();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [googleOpen, setGoogleOpen] = useState(false);
    const [calendarToken, setCalendarToken] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [highlightedDay, setHighlightedDay] = useState<Date | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        date: '',
        time: '12:00',
        timeZone: localTimeZone,
        type: 'OTRO' as EventType,
        location: '',
    });

    const requestRevision = useRef(0);
    const lifetime = useRef(0);
    const mutationPending = useRef(false);
    const locale = i18n.language?.startsWith('es') ? es : enUS;
    const dayNames = i18n.language?.startsWith('es') ? DAY_NAMES_ES : DAY_NAMES_EN;
    const dayNamesShort = i18n.language?.startsWith('es') ? DAY_NAMES_ES_SHORT : DAY_NAMES_EN_SHORT;

    const fetchEvents = useCallback(async () => {
        if (mutationPending.current) return;
        const revision = ++requestRevision.current;
        try {
            const data = await getProjectEvents(projectId);
            if (revision !== requestRevision.current) return;
            if (!Array.isArray(data) || data.some(event => !Number.isFinite(Date.parse(eventDateValue(event))))) throw new Error('Invalid calendar response');
            setEvents(data); setLoadError(false);
        } catch (error) {
            if (revision !== requestRevision.current) return;
            console.error('Failed to load events', error);
            setLoadError(true);
        } finally {
            if (revision === requestRevision.current) setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        const generation = ++lifetime.current;
        mutationPending.current = false;
        // Reset project-scoped presentation before its requests can complete.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEvents([]); setCalendarToken(null); setLoading(true); setSaving(false); setDialogOpen(false);
        void fetchEvents();
        void getCalendarToken(projectId).then(value => {
            if (generation === lifetime.current) setCalendarToken(value);
        }).catch(error => console.error('Failed to load calendar token', error));
        const recover = () => { if (document.visibilityState !== 'hidden') void fetchEvents(); };
        const timer = setInterval(recover, 10000);
        window.addEventListener('focus', recover); window.addEventListener('online', recover);
        return () => {
            ++lifetime.current; ++requestRevision.current;
            clearInterval(timer);
            window.removeEventListener('focus', recover); window.removeEventListener('online', recover);
        };
    }, [projectId, fetchEvents]);

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
            const dayKey = format(parseISO(eventDateValue(event)), 'yyyy-MM-dd');
            if (!map[dayKey]) map[dayKey] = [];
            map[dayKey].push(event);
        });
        return map;
    }, [events]);

    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return events
            .filter(e => isAfter(parseISO(eventDateValue(e)), now) || isSameDay(parseISO(eventDateValue(e)), now))
            .sort((a, b) => new Date(eventDateValue(a)).getTime() - new Date(eventDateValue(b)).getTime())
            .slice(0, 8);
    }, [events]);

    const agendaEvents = highlightedDay ? eventsByDay[format(highlightedDay, 'yyyy-MM-dd')] || [] : upcomingEvents;

    const openCreateDialog = (day?: Date) => {
        setEditingEvent(null);
        setFormData({
            name: '',
            description: '',
            date: day ? format(day, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            time: '12:00',
        timeZone: localTimeZone,
            type: 'OTRO',
            location: '',
        });
        setDialogOpen(true);
    };

    const openEditDialog = (event: CalendarEvent) => {
        setEditingEvent(event);
        setFormData({
            name: event.name,
            description: event.description || '',
            date: event.date.slice(0, 10),
            time: event.date.slice(11, 16),
            timeZone: event.timeZone || 'Europe/Madrid',
            type: event.type,
            location: event.location || '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (mutationPending.current || !formData.name.trim()) return;
        if (!formData.date || !formData.time) return;
        try { new Intl.DateTimeFormat('en', { timeZone: formData.timeZone }); } catch { toast.error(t('calendar_link.invalid_zone')); return; }
        const dateTime = `${formData.date}T${formData.time}:00`;

        const generation = lifetime.current;
        mutationPending.current = true; ++requestRevision.current;
        setSaving(true);
        try {
            if (editingEvent) {
                await updateProjectEvent(editingEvent.id, {
                    name: formData.name,
                    description: formData.description,
                    date: dateTime,
                    timeZone: formData.timeZone,
                    type: formData.type,
                    location: formData.location,
                });
                if (generation !== lifetime.current) return;
                toast.success(t('event_updated'));
            } else {
                await createProjectEvent(projectId, {
                    name: formData.name,
                    description: formData.description,
                    date: dateTime,
                    timeZone: formData.timeZone,
                    type: formData.type,
                    location: formData.location,
                });
                if (generation !== lifetime.current) return;
                toast.success(t('event_created'));
            }
            setDialogOpen(false);
        } catch (error) {
            console.error('Error saving event:', error);
            if (generation === lifetime.current) toast.error(t('calendar_link.save_error'));
        } finally {
            if (generation === lifetime.current) {
                mutationPending.current = false; setSaving(false);
                void fetchEvents();
            }
        }
    };

    const handleDelete = async (eventId: number) => {
        if (mutationPending.current || !window.confirm(t('confirm_delete_event'))) return false;
        const generation = lifetime.current;
        mutationPending.current = true; ++requestRevision.current; setSaving(true);
        try {
            await deleteProjectEvent(eventId);
            if (generation !== lifetime.current) return false;
            toast.success(t('event_deleted'));
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            if (generation === lifetime.current) toast.error(t('delete_error', 'Error'));
            return false;
        } finally {
            if (generation === lifetime.current) {
                mutationPending.current = false; setSaving(false); void fetchEvents();
            }
        }
    };

    // Download the exact same correctly zoned feed used by subscribers.
    const exportToICal = async () => {
        if (!subscriptionUrl) return;
        try {
            const response = await fetch(subscriptionUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error('Calendar download failed');
            const body = await response.text();
            if (!body.startsWith('BEGIN:VCALENDAR')) throw new Error('Invalid calendar response');
            const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
            const link = document.createElement('a'); link.href = url; link.download = 'calendar-' + projectId + '.ics'; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { toast.error(t('calendar_link.download_error')); }
    };

    const apiBase = new URL(import.meta.env.VITE_API_URL || '/api', window.location.origin).href.replace(/\/$/, '');
    const subscriptionUrl = calendarToken ? apiBase + '/calendar/' + encodeURIComponent(calendarToken) + '.ics' : '';
    const googleUrl = subscriptionUrl
      ? 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(subscriptionUrl.replace(/^https?:/, 'webcal:'))
      : '';
    const copySubscriptionUrl = async () => {
        if (!subscriptionUrl) return;
        try {
            await navigator.clipboard.writeText(subscriptionUrl);
            toast.success(t('subscription_url_copied'));
        } catch { toast.error(t('calendar_link.copy_manually')); }
    };

    if (loading) {
        return (
            <div className="p-4 text-center text-sm text-muted-foreground">
                {t('loading_project', 'Cargando...')}
            </div>
        );
    }


    return (
        <Card className="bg-card border-border rounded-2xl gap-0 overflow-hidden">
            <Dialog open={googleOpen} onOpenChange={setGoogleOpen}>
              <DialogContent className="max-h-[calc(100dvh-32px)] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2"><CalendarDays className="size-5" /></div>
                  <DialogTitle>Google Calendar</DialogTitle>
                  <DialogDescription>{t('calendar_ui.google_intro')}</DialogDescription>
                </DialogHeader>
                <p className="text-sm text-muted-foreground leading-relaxed">{t('calendar_ui.google_timing')}</p>
                <Button asChild className="w-full"><a href={googleUrl} target="_blank" rel="noopener noreferrer">{t('calendar_ui.google_add')}</a></Button>
                <p className="text-xs text-muted-foreground">{t('calendar_ui.google_once')}</p>
              </DialogContent>
            </Dialog>

            <div className="p-4 sm:p-6 border-b border-border">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><h2 className="text-lg font-semibold">{t('calendar')}</h2><p className="text-sm text-muted-foreground mt-1">{t('calendar_ui.subtitle')}</p></div>
                <Button onClick={() => openCreateDialog(highlightedDay || undefined)} className="h-10 rounded-xl"><Plus className="size-4" />{t('create_event')}</Button>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 rounded-xl bg-background/60 border border-border p-1">
                  <Button variant="ghost" size="icon" className="size-9 rounded-lg" aria-label={t('calendar_ui.previous')} onClick={() => {setCurrentMonth(subMonths(currentMonth,1));setHighlightedDay(null);}}><ChevronLeft className="size-4" /></Button>
                  <span aria-live="polite" className="w-24 sm:w-36 text-center text-xs sm:text-sm font-medium capitalize truncate">{format(currentMonth,'MMMM yyyy',{locale})}</span>
                  <Button variant="ghost" size="icon" className="size-9 rounded-lg" aria-label={t('calendar_ui.next')} onClick={() => {setCurrentMonth(addMonths(currentMonth,1));setHighlightedDay(null);}}><ChevronRight className="size-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-9 rounded-lg text-xs" onClick={() => {setCurrentMonth(new Date());setHighlightedDay(new Date());}}>{t('today')}</Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="rounded-lg" disabled={!subscriptionUrl} onClick={() => setGoogleOpen(true)}><CalendarDays className="size-4" />Google Calendar</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-9" aria-label={t('calendar_ui.options')}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={!subscriptionUrl} onSelect={() => {void exportToICal();}}><Download className="size-4 mr-2" />{t('export_calendar')}</DropdownMenuItem>
                      <DropdownMenuItem disabled={!subscriptionUrl} onSelect={() => {void copySubscriptionUrl();}}><Link2 className="size-4 mr-2" />{t('calendar_ui.copy_link')}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t('calendar_link.display_zone',{zone:localTimeZone})}</p>
            </div>

            {loadError && <div role="alert" className="m-4 p-3 rounded-xl border border-destructive/30 text-sm">{t('calendar_ui.load_error')} <Button variant="ghost" size="sm" onClick={fetchEvents}>{t('calendar_ui.retry')}</Button></div>}
            <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
              <section aria-label={t('calendar_ui.month_view')} className="min-w-0 p-3 sm:p-5">
                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map((name,index)=><span key={name} className="text-center text-xs text-muted-foreground py-2"><span className="hidden sm:inline">{name}</span><span className="sm:hidden">{dayNamesShort[index]}</span></span>)}
                </div>
                <div className="space-y-1">
                  {weeks.map((week,index)=><div key={index} className="grid grid-cols-7 gap-1">{week.map(day=>{
                    const key=format(day,'yyyy-MM-dd'), items=eventsByDay[key]||[];
                    const selected=!!highlightedDay && isSameDay(day,highlightedDay);
                    return <button key={key} type="button" data-calendar-day={key} aria-pressed={selected}
                      aria-label={format(day,'EEEE, d MMMM yyyy',{locale})+' · '+t('calendar_ui.event_count',{count:items.length})}
                      onClick={()=>setHighlightedDay(day)}
                      className={`relative min-w-0 min-h-14 sm:min-h-20 p-1.5 sm:p-2 rounded-xl text-left border transition-colors focus-visible:outline focus-visible:outline-primary ${selected?'border-primary bg-primary/10':'border-transparent hover:bg-accent/50'} ${!isSameMonth(day,currentMonth)?'opacity-40':''}`}>
                      <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${isToday(day)?'bg-primary text-primary-foreground font-semibold':'text-foreground'}`}>{format(day,'d')}</span>
                      <span className="hidden sm:flex flex-col gap-1 mt-1">{items.slice(0,2).map(event=><span key={event.id} className={`block rounded px-1 text-[10px] truncate ${(EVENT_COLORS[event.type]||EVENT_COLORS.OTRO).bg} ${(EVENT_COLORS[event.type]||EVENT_COLORS.OTRO).text}`}>{format(parseISO(eventDateValue(event)),'HH:mm')} {event.name}</span>)}</span>
                      <span className="flex sm:hidden gap-1 mt-1">{items.slice(0,3).map(event=><span key={event.id} className={`size-1 rounded-full ${(EVENT_COLORS[event.type]||EVENT_COLORS.OTRO).dot}`} />)}</span>
                      {items.length>2&&<span className="hidden sm:block text-[10px] text-muted-foreground mt-1">+{items.length-2}</span>}
                    </button>;
                  })}</div>)}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">{(['CONCIERTO','ENSAYO','OTRO'] as EventType[]).map(type=><span key={type} className="inline-flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${EVENT_COLORS[type].dot}`} />{t(type.toLowerCase())}</span>)}</div>
              </section>
              <section aria-label={t('calendar_ui.agenda')} className="min-w-0 border-t lg:border-t-0 lg:border-l border-border bg-background/30 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 aria-live="polite" className="text-sm font-semibold capitalize">{highlightedDay?format(highlightedDay,'EEEE, d MMMM',{locale}):t('upcoming_events')}</h3>
                  {highlightedDay&&<Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={()=>setHighlightedDay(null)}>{t('calendar_ui.upcoming')}</Button>}
                </div>
                {agendaEvents.length? <div className="space-y-2">{agendaEvents.map(event=>{
                  const colors=EVENT_COLORS[event.type]||EVENT_COLORS.OTRO;
                  return <button key={event.id} type="button" data-calendar-event={event.id} onClick={()=>openEditDialog(event)} className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/40 hover:bg-accent/30 focus-visible:outline focus-visible:outline-primary transition-colors">
                    <span className="flex justify-between items-center gap-2"><span className="text-xs text-muted-foreground">{format(parseISO(eventDateValue(event)),'d MMM',{locale})} · {format(parseISO(eventDateValue(event)),'HH:mm')}</span><span className={`text-[10px] rounded-full px-2 py-0.5 ${colors.bg} ${colors.text}`}>{t(event.type.toLowerCase())}</span></span>
                    <span className="block text-sm font-medium mt-2 break-words">{event.name}</span>
                    {event.location&&<span className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" /><span className="truncate">{event.location}</span></span>}
                    {event.description&&<span className="block text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</span>}
                  </button>;
                })}</div>:<div className="py-5 text-center"><img src={CalendarImage} alt="" className="size-24 mx-auto object-contain mb-4" /><p className="text-sm font-medium">{t(highlightedDay?'calendar_ui.empty_day':'no_events')}</p><p className="text-xs text-muted-foreground mt-2 mb-4">{t('calendar_ui.empty_help')}</p><Button variant="outline" size="sm" onClick={()=>openCreateDialog(highlightedDay||undefined)}>{t('calendar_ui.plan')}</Button></div>}
              </section>
            </div>

            {/* Create/Edit Event Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-card border-border text-foreground max-w-[95vw] sm:max-w-lg max-h-[calc(100dvh-32px)] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            {editingEvent ? t('edit_event') : t('create_event')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 sm:space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="event-name" className="text-foreground text-[13px] sm:text-[14px]">{t('event_name')}</Label>
                            <Input
                                id="event-name" value={formData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, name: e.target.value }))}
                                placeholder={t('event_name')}
                                className="bg-background border-border text-foreground h-9 sm:h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="event-description" className="text-foreground text-[13px] sm:text-[14px]">{t('event_description')}</Label>
                            <Textarea
                                id="event-description" value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(p => ({ ...p, description: e.target.value }))}
                                placeholder={t('event_description')}
                                className="bg-background border-border text-foreground"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="event-date" className="text-foreground text-[13px] sm:text-[14px]">{t('event_date')}</Label>
                                <Input
                                    id="event-date" type="date"
                                    value={formData.date}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, date: e.target.value }))}
                                    className="bg-background border-border text-foreground h-9 sm:h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="event-time" className="text-foreground text-[13px] sm:text-[14px]">{t('calendar_ui.time')}</Label>
                                <Input
                                    id="event-time" type="time"
                                    value={formData.time}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, time: e.target.value }))}
                                    className="bg-background border-border text-foreground h-9 sm:h-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="event-time-zone">{t('calendar_link.zone')}</Label>
                            <Input id="event-time-zone" list="event-time-zones" value={formData.timeZone}
                                onChange={event => setFormData(previous => ({ ...previous, timeZone: event.target.value }))}
                                className="bg-background border-border" />
                            <datalist id="event-time-zones">
                                {Array.from(new Set([localTimeZone, 'Europe/Madrid', 'Atlantic/Canary', 'Europe/London', 'America/New_York', 'America/Mexico_City', 'America/Argentina/Buenos_Aires', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'])).map(zone => <option key={zone} value={zone} />)}
                            </datalist>
                            <p className="text-xs text-muted-foreground">{t('calendar_link.zone_help')}</p>
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
                            <Label htmlFor="event-location" className="text-foreground text-[13px] sm:text-[14px]">{t('event_location')}</Label>
                            <Input
                                id="event-location" value={formData.location}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, location: e.target.value }))}
                                placeholder={t('event_location')}
                                className="bg-background border-border text-foreground h-9 sm:h-10"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            {editingEvent && (
                                <Button
                                    variant="destructive"
                                    disabled={saving}
                                    className="bg-destructive/20 text-destructive hover:bg-destructive/40 border border-destructive/50 text-[13px]"
                                    onClick={async () => {
                                        if (await handleDelete(editingEvent.id)) setDialogOpen(false);
                                    }}
                                >
                                    <Trash2 className="size-4 mr-1.5" />
                                    <span className="hidden sm:inline">{t('delete_event')}</span>
                                    <span className="sm:hidden">{t('delete_event')}</span>
                                </Button>
                            )}
                            <Button
                                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] sm:text-[14px]"
                                disabled={saving || !formData.name.trim() || !formData.date || !formData.time}
                                onClick={handleSubmit}
                            >
                                {saving ? t('saving') : editingEvent ? t('save_changes') : t('create_event')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
