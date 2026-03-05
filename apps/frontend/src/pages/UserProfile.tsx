import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api, { extractErrorMessage, uploadFile, getMediaUrl } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { ArrowLeft, User, Lock, Save, MapPin, Music, Globe, Plus, X, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/app/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { PageLayout } from '@/app/components/PageLayout';

const RRSS_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'bandcamp', label: 'Bandcamp' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
];

export function UserProfile() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    city: user?.city || '',
    instrument: user?.instrument || '',
    bio: user?.bio || '',
  });
  const [rrss, setRrss] = useState<Record<string, string>>({});
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  // Load full profile on mount to get rrss
  useEffect(() => {
    if (user?.id) {
      api.get(`/users/${user.id}`)
        .then((res: { data: { rrss?: Record<string, string>; instrument?: string; bio?: string; photo?: string } }) => {
          if (res.data.rrss) setRrss(res.data.rrss);
          if (res.data.photo) setPhotoUrl(res.data.photo);
          setProfileData((prev) => ({
            ...prev,
            instrument: res.data.instrument || prev.instrument,
            bio: res.data.bio || prev.bio,
          }));
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Filter out empty rrss entries
      const filteredRrss: Record<string, string> = {};
      Object.entries(rrss).forEach(([platform, url]) => {
        if (url.trim()) filteredRrss[platform] = url.trim();
      });

      const payload = { ...profileData, rrss: filteredRrss, photo: photoUrl || undefined };
      const response = await api.put(`/users/${user.id}`, payload);
      updateProfile({
        name: response.data.name,
        city: response.data.city,
        instrument: response.data.instrument,
        bio: response.data.bio,
      });
      if (response.data.rrss) setRrss(response.data.rrss);
      toast.success(t('profile_updated', 'Perfil actualizado correctamente'));
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, t('profile_update_error', 'Error al actualizar el perfil')));
    } finally {
      setSaving(false);
    }
  };

  const handleAddRrss = () => {
    // Find first platform not already added
    const used = Object.keys(rrss);
    const available = RRSS_OPTIONS.find((o) => !used.includes(o.value));
    if (available) {
      setRrss({ ...rrss, [available.value]: '' });
    }
  };

  const handleRemoveRrss = (platform: string) => {
    const next = { ...rrss };
    delete next[platform];
    setRrss(next);
  };

  const handleChangeRrssPlatform = (oldPlatform: string, newPlatform: string) => {
    if (oldPlatform === newPlatform) return;
    const next = { ...rrss };
    const url = next[oldPlatform] || '';
    delete next[oldPlatform];
    next[newPlatform] = url;
    setRrss(next);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('invalid_image', 'Por favor selecciona un archivo de imagen'));
      return;
    }
    setUploadingPhoto(true);
    try {
      const filename = await uploadFile(file, 'image');
      const fullUrl = getMediaUrl(`/api/uploads/images/${filename}`);
      setPhotoUrl(fullUrl);
      // Save immediately
      if (user?.id) {
        await api.put(`/users/${user.id}`, { photo: fullUrl });
        toast.success(t('photo_updated', 'Foto de perfil actualizada'));
      }
    } catch {
      toast.error(t('photo_upload_error', 'Error al subir la foto'));
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('passwords_do_not_match', 'Las contraseñas no coinciden'));
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error(t('password_length_error', 'La contraseña debe tener al menos 6 caracteres'));
      return;
    }
    
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success(t('password_updated', 'Contraseña actualizada correctamente'));
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error, 'Error al actualizar la contraseña'));
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    if (window.confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer y perderás el acceso a todas tus bandas y datos.')) {
      try {
        await api.delete(`/users/${user.id}`);
        toast.success('Cuenta eliminada correctamente');
        logout();
      } catch (error: unknown) {
        toast.error(extractErrorMessage(error, 'Error al eliminar la cuenta'));
      }
    }
  };

  const usedPlatforms = Object.keys(rrss);

  return (
    <PageLayout
      headerContent={
        <div className="max-w-4xl w-full mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="hover:bg-accent text-foreground">
                <ArrowLeft className="size-4" />
                </Button>
                <div>
                <h1 className="text-[24px] font-normal font-poppins text-foreground leading-8 select-none">{t('my_profile', 'Mi Perfil')}</h1>
                <p className="text-[14px] font-normal font-poppins text-muted-foreground leading-5 select-none">{t('personal_info', 'Gestiona tu información personal')}</p>
                </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      }
    >
      <main className="max-w-4xl w-full mx-auto py-8 px-6 space-y-6">
        {/* Foto de perfil */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="size-24 border-2 border-border">
              {photoUrl ? (
                <AvatarImage src={photoUrl} alt={user?.name || ''} />
              ) : null}
              <AvatarFallback className="text-2xl bg-secondary text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingPhoto ? (
                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground">{t('click_to_change_photo', 'Haz clic para cambiar tu foto')}</p>
        </div>

        {/* Información Personal */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              <CardTitle className="text-foreground select-none">{t('personal_info', 'Información Personal')}</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              {t('update_project_info', 'Actualiza tu información de perfil')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">{t('name', 'Nombre completo')}</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Tu nombre"
                className="bg-input-background border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">{t('email', 'Email')}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-input-background/50 border-border text-muted-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="city" className="text-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {t('city', 'Ciudad')}
              </Label>
              <Input
                id="city"
                value={profileData.city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileData({ ...profileData, city: e.target.value })}
                placeholder={t('city_placeholder', 'Ej: Madrid, Barcelona...')}
                className="bg-input-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instrument" className="text-foreground flex items-center gap-1.5">
                <Music className="size-3.5" />
                {t('instrument', 'Instrumento')}
              </Label>
              <Input
                id="instrument"
                value={profileData.instrument}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileData({ ...profileData, instrument: e.target.value })}
                placeholder={t('instrument_placeholder', 'Ej: Guitarra, Batería, Voz...')}
                className="bg-input-background border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-foreground">{t('bio', 'Biografía')}</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder={t('bio_placeholder', 'Cuéntanos algo sobre ti...')}
                className="bg-input-background border-border text-foreground min-h-[100px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Redes Sociales */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-primary" />
                <CardTitle className="text-foreground select-none">{t('social_links', 'Redes sociales')}</CardTitle>
              </div>
              {usedPlatforms.length < RRSS_OPTIONS.length && (
                <Button variant="outline" size="sm" onClick={handleAddRrss} className="text-foreground border-border hover:bg-accent">
                  <Plus className="size-4 mr-1" />
                  {t('add', 'Añadir')}
                </Button>
              )}
            </div>
            <CardDescription className="text-muted-foreground">
              {t('social_links_desc', 'Añade tus redes sociales para que otros miembros puedan encontrarte')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {usedPlatforms.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('no_social_links', 'No has añadido ninguna red social todavía')}
              </p>
            )}
            {usedPlatforms.map((platform) => (
              <div key={platform} className="flex items-center gap-2">
                <select
                  value={platform}
                  onChange={(e) => handleChangeRrssPlatform(platform, e.target.value)}
                  className="bg-input-background border border-border text-foreground rounded-md px-3 py-2 text-sm min-w-[140px]"
                >
                  {RRSS_OPTIONS.filter((o) => o.value === platform || !usedPlatforms.includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Input
                  value={rrss[platform] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRrss({ ...rrss, [platform]: e.target.value })}
                  placeholder={t('social_url_placeholder', 'URL de tu perfil')}
                  className="bg-input-background border-border text-foreground flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => handleRemoveRrss(platform)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save button */}
        <Button onClick={handleUpdateProfile} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="size-4 mr-2" />
          {saving ? t('saving', 'Guardando...') : t('save_changes', 'Guardar cambios')}
        </Button>

        <Separator className="bg-border" />

        {/* Cambiar Contraseña */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              <CardTitle className="text-foreground select-none">{t('change_password', 'Cambiar Contraseña')}</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              {t('update_password', 'Actualiza tu contraseña de acceso')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-foreground">{t('current_password', 'Contraseña actual')}</Label>
                <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="bg-input-background border-border text-foreground"
                    autoComplete="current-password"
                />
                </div>
                
                <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-foreground">{t('new_password', 'Nueva contraseña')}</Label>
                <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="bg-input-background border-border text-foreground"
                    autoComplete="new-password"
                />
                </div>
                
                <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">{t('confirm_new_password', 'Confirmar nueva contraseña')}</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="bg-input-background border-border text-foreground"
                    autoComplete="new-password"
                />
                </div>
                
                <Button 
                type="submit"
                variant="outline" 
                className="w-full bg-card border-border text-foreground hover:bg-accent"
                disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                {t('change_password', 'Cambiar contraseña')}
                </Button>
            </form>
          </CardContent>
        </Card>

        <Separator className="bg-border" />

        {/* Zona de peligro */}
        <Card className="bg-card border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive select-none">{t('danger_zone', 'Zona de peligro')}</CardTitle>
            <CardDescription className="text-muted-foreground">
              Acciones irreversibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDeleteAccount} className="w-full bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/50">
              Eliminar cuenta
            </Button>
          </CardContent>
        </Card>
      </main>
    </PageLayout>
  );
}
