import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { User, MapPin, Globe, Loader2, Music } from 'lucide-react';
import { getMediaUrl } from '@/services/api';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { Member } from '@/contexts/ProjectContext';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  name: string;
  city: string;
  instrument: string;
  bio: string;
  photo: string;
  rrss: Record<string, string>;
  bandIds: number[];
}

interface UserCardModalProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RRSS_LABELS: Record<string, { label: string; icon?: string }> = {
  instagram: { label: 'Instagram' },
  twitter: { label: 'X / Twitter' },
  youtube: { label: 'YouTube' },
  spotify: { label: 'Spotify' },
  soundcloud: { label: 'SoundCloud' },
  bandcamp: { label: 'Bandcamp' },
  tiktok: { label: 'TikTok' },
  facebook: { label: 'Facebook' },
};

export function UserCardModal({ member, open, onOpenChange }: UserCardModalProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && member) {
      setLoading(true);
      setProfile(null);
      api.get<UserProfile>(`/users/${member.id}`)
        .then((res) => setProfile(res.data))
        .catch(() => console.error('Error fetching user profile'))
        .finally(() => setLoading(false));
    }
  }, [open, member]);

  const initials = member?.name
    ? member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const socialLinks = profile?.rrss
    ? Object.entries(profile.rrss).filter(([, url]) => url && url.trim() !== '')
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground sr-only">
            {t('user_card', 'Tarjeta de usuario')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
          </div>
        ) : profile ? (
          <div className="flex flex-col items-center gap-4 pb-2">
            {/* Avatar */}
            <Avatar className="size-20">
              {profile.photo ? (
                <AvatarImage src={getMediaUrl(profile.photo)} alt={profile.name} />
              ) : null}
              <AvatarFallback className="text-lg bg-secondary text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Name & Username */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>

            {/* Info */}
            <div className="w-full space-y-3 pt-2">
              {profile.city && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{profile.city}</span>
                </div>
              )}

              {profile.instrument && (
                <div className="flex items-center gap-3 text-sm">
                  <Music className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{profile.instrument}</span>
                </div>
              )}

              {profile.bio && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('social_links', 'Redes sociales')}
                  </p>
                  {socialLinks.map(([platform, url]) => {
                    const info = RRSS_LABELS[platform.toLowerCase()] || { label: platform };
                    return (
                      <a
                        key={platform}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group"
                      >
                        <Globe className="size-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                        <span className="truncate">{info.label}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <User className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('user_not_found', 'No se pudo cargar el perfil')}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
