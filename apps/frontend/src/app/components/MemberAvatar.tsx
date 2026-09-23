import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { getMediaUrl } from '@/services/api';
import { cn } from '@/app/components/ui/utils';

export function MemberAvatar({ name, photo, className }: { name: string; photo?: string | null; className?: string }) {
  const initials = (name || '').trim().split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || '?';
  return <Avatar className={cn('size-8 shrink-0 border border-white/10', className)}>
    {photo && <AvatarImage src={getMediaUrl(photo)} alt={name} className="h-full w-full object-cover" />}
    <AvatarFallback className="bg-secondary text-foreground text-[0.7em] font-medium" aria-label={name}>{initials}</AvatarFallback>
  </Avatar>;
}
