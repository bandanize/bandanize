import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api, { extractErrorMessage } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, User, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/app/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { PageLayout } from '@/app/components/PageLayout';

export function UserProfile() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    instrument: user?.instrument || '',
    bio: user?.bio || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleUpdateProfile = () => {
    updateProfile(profileData);
    toast.success(t('profile_updated', 'Perfil actualizado correctamente'));
  };

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
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
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
              <Label htmlFor="instrument" className="text-foreground">Instrumento principal</Label>
              <Input
                id="instrument"
                value={profileData.instrument}
                onChange={(e) => setProfileData({ ...profileData, instrument: e.target.value })}
                placeholder="Ej: Guitarra, Bajo, Batería..."
                className="bg-input-background border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-foreground">Biografía</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Cuéntanos un poco sobre ti..."
                className="bg-input-background border-border text-foreground"
                rows={4}
              />
            </div>
            
            <Button onClick={handleUpdateProfile} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="size-4 mr-2" />
              {t('save_changes', 'Guardar cambios')}
            </Button>
          </CardContent>
        </Card>

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
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
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
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
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
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
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
