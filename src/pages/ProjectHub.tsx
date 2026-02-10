import React, { useState, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, MessageSquare, Music, Users, LogOut, PenLine, Bell } from 'lucide-react';
import { ProjectChat } from '@/app/components/ProjectChat';
import { SongManager } from '@/app/components/SongManager';
import { MembersPanel } from '@/app/components/MembersPanel';
import { NotificationFeed } from '@/app/components/NotificationFeed';
import { toast } from 'sonner';

import { uploadFile, getMediaUrl } from '@/services/api';

import { usePresence } from '@/hooks/usePresence';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { PageLayout } from '@/app/components/PageLayout';

export function ProjectHub() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, projects, updateProject, leaveProject, deleteProject, selectProject, isLoading } = useProjects();
  const { user } = useAuth();
  const onlineCount = usePresence(currentProject?.id);
  const [activeTab, setActiveTab] = useState('songs');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: currentProject?.name || '',
    description: currentProject?.description || '',
    imageUrl: currentProject?.imageUrl || '',
  });

  const { t } = useTranslation();

  const [, setCookie] = useCookies(['lastProjectId']);

  // Set last active project cookie
  useEffect(() => {
    if (projectId) {
      setCookie('lastProjectId', projectId, { path: '/', maxAge: 30 * 24 * 60 * 60 }); // 30 days
    }
  }, [projectId, setCookie]);

  // Handle auto-selection on refresh
  useEffect(() => {
      if (!isLoading && projectId && !currentProject && projects.length > 0) {
          selectProject(projectId);
      }
  }, [isLoading, projectId, currentProject, projects, selectProject]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  // Fetch unread count & chat status
  const fetchUnreadCount = React.useCallback(async () => {
        if (currentProject) {
            try {
                const api = await import('@/services/api');
                const [count, chatStatus] = await Promise.all([
                    api.getUnreadNotificationCount(currentProject.id.toString()),
                    api.getUnreadChatStatus(currentProject.id.toString())
                ]);
                setUnreadCount(count);
                setHasUnreadChat(chatStatus);
            } catch (error) {
                console.error("Failed to fetch unread status", error);
            }
        }
    }, [currentProject]);

    useEffect(() => {
        if (currentProject) {
            fetchUnreadCount();
            // Poll every 30 seconds
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [currentProject, fetchUnreadCount]);



  if (isLoading) {
       return (
         <div className="min-h-screen flex items-center justify-center bg-background">
             <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-foreground opacity-60">{t('loading_project', 'Cargando proyecto...')}</p>
             </div>
         </div>
       );
  }

  const openEditDialog = () => {
    if (currentProject) {
      setEditData({
        name: currentProject.name,
        description: currentProject.description,
        imageUrl: currentProject.imageUrl || '',
      });
      setEditDialogOpen(true);
    }
  };

  const handleUpdateProject = async () => {
    if (!currentProject) return;
    try {
      await updateProject(currentProject.id, editData);
      setEditDialogOpen(false);
      toast.success(t('project_updated', 'Proyecto actualizado'));
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(t('project_update_error', 'Error al actualizar el proyecto'));
    }
  };

  const handleLeaveProject = async () => {
    if (!currentProject || !window.confirm('¿Estás seguro de que quieres abandonar este proyecto?')) return;
    try {
        await leaveProject(currentProject.id);
        toast.success(t('left_project', 'Has abandonado el proyecto'));
        navigate('/dashboard');
    } catch (error) {
        console.error('Error leaving project:', error);
        toast.error(t('leave_error', 'Error al abandonar el proyecto'));
    }
  };

  const handleDeleteProject = async () => {
      if (!currentProject) return;
      try {
          await deleteProject(currentProject.id);
          navigate('/dashboard');
      } catch (error) {
          console.error("Error deleting project:", error);
          toast.error(t('delete_error', "Error al eliminar proyecto"));
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
          toast.loading(t('uploading', "Subiendo imagen..."));
          const filename = await uploadFile(file, 'image');
          const fullUrl = getMediaUrl(`/api/uploads/images/${filename}`);
          
          setEditData(prev => ({ ...prev, imageUrl: fullUrl }));
          toast.dismiss();
          toast.success(t('image_uploaded', "Imagen subida correctamente"));
      } catch (error) {
          console.error("Upload error:", error);
          toast.dismiss();
          toast.error(t('upload_error', "Error al subir la imagen"));
      }
  };

  if (!currentProject || currentProject.id !== projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground">{t('loading_project', 'Cargando proyecto...')}</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4 bg-primary text-primary-foreground">
            {t('back_to_dashboard', 'Volver al dashboard')}
          </Button>
        </div>
      </div>
    );
  }

    const handleTabChange = (value: string) => {
        // If leaving notifications tab, mark as read
        if (activeTab === 'notifications' && value !== 'notifications' && currentProject && unreadCount > 0) {
            import('@/services/api').then(m => m.markNotificationsRead(currentProject.id.toString()))
                .catch(err => console.error("Failed to mark notifications read", err));
            setUnreadCount(0);
        }
        
        // If leaving chat tab, mark as read
        if (activeTab === 'chat' && value !== 'chat' && currentProject && hasUnreadChat) {
             import('@/services/api').then(m => m.markChatAsRead(currentProject.id.toString()))
                .catch(err => console.error("Failed to mark chat read", err));
             setHasUnreadChat(false);
        }
        
        setActiveTab(value);
    };

  return (
    <PageLayout
      headerContent={
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6">
            <div className="max-w-[1216px] w-full mx-auto flex flex-wrap items-center gap-4">
            <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')} 
                className="w-[40px] h-[36px] bg-transparent hover:bg-white/5 rounded-[8px] p-0"
            >
              <ArrowLeft className="size-4 text-foreground" />
            </Button>
            
            <div className="flex-1 flex items-center gap-3 min-w-[200px] select-none">
                <div className="size-10 aspect-square flex-shrink-0 rounded-md overflow-hidden bg-white/5 flex items-center justify-center pointer-events-none">
                    {currentProject.imageUrl ? (
                        <img 
                            src={getMediaUrl(currentProject.imageUrl)} 
                            alt={currentProject.name} 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <Music className="size-6 text-primary" />
                    )}
                </div>
               <div className="min-w-0">
                   <h1 className="text-[20px] sm:text-[24px] font-normal font-poppins text-foreground leading-8 truncate">{currentProject.name}</h1>
                   <div className="flex items-center gap-1">
                       <span className="w-[7px] h-[7px] bg-primary rounded-full inline-block"></span>
                       <span className="text-[14px] font-normal font-poppins text-muted-foreground leading-5">
                           {onlineCount} {t('online', 'Online')}
                       </span>
                   </div>
               </div>
            </div>

            <div className="flex gap-2 items-center ml-auto">
             <LanguageSwitcher />

            {currentProject.ownerId === user?.id ? (
              <>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openEditDialog} className="bg-card border border-border text-foreground hover:bg-accent font-sans text-[14px] font-normal flex h-[36px] w-9 sm:w-auto px-0 sm:px-4 rounded-[8px] justify-center">
                    <PenLine className="size-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('edit_project', 'Editar proyecto')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">{t('project_settings', 'Configuración del Proyecto')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {t('update_project_info', 'Actualiza la información del proyecto o gestionalo.')}
                    </DialogDescription>
                  </DialogHeader>
                    <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="text-foreground">{t('project_name', 'Nombre del proyecto')}</Label>
                      <Input
                        id="edit-name"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description" className="text-foreground">{t('description', 'Descripción')}</Label>
                      <Textarea
                        id="edit-description"
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-image" className="text-foreground">{t('image', 'Imagen del Proyecto')}</Label>
                      <div className="flex gap-2">
                         <Input
                          id="edit-image"
                          value={editData.imageUrl}
                          onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
                          placeholder="URL de la imagen"
                          className="flex-1 bg-background border-border text-foreground"
                        />
                      </div>
                       <div className="mt-2">
                           <Label htmlFor="upload-image" className="text-xs text-muted-foreground mb-1 block">{t('or_upload_image', 'O subir imagen:')}</Label>
                           <Input
                              id="upload-image"
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="bg-background border-border text-foreground"
                           />
                       </div>
                    </div>
                    <Button onClick={handleUpdateProject} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      {t('save_changes', 'Guardar cambios')}
                    </Button>
                    
                    <div className="border-t border-border pt-4 mt-4">
                        <Label className="text-destructive mb-2 block">{t('danger_zone', 'Zona de Peligro')}</Label>
                        <Button variant="destructive" className="w-full bg-destructive/20 text-destructive hover:bg-destructive/40 border border-destructive/50" onClick={async () => {
                            if (window.confirm(t('delete_confirmation', "Are you sure?"))) {
                                try {
                                    await handleDeleteProject(); 
                                } catch {
                                    toast.error(t('delete_error', "Error al eliminar proyecto"));
                                }
                            }
                        }}>
                             {t('delete_project', 'Eliminar Proyecto')}
                        </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              </>
            ) : (
                <Button variant="destructive" onClick={handleLeaveProject} className="bg-red-900/20 text-red-500 hover:bg-red-900/40">
                    <LogOut className="size-4 mr-2" />
                    <span className="hidden sm:inline">{t('leave_project', 'Abandonar')}</span>
                </Button>
            )}
            </div>
        </div>
        </div>
      }
    >
      <div className="max-w-[1280px] w-full mx-auto py-8 px-4 sm:px-6">
         <div className="max-w-[1216px] w-full mx-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-card rounded-[14px] p-0 h-[36px] flex items-center w-full sm:w-fit max-w-full mx-auto overflow-visible">
            <TabsTrigger 
                value="songs"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-none text-muted-foreground rounded-[14px] h-[36px] flex-1 sm:flex-none px-4 font-sans font-normal text-[14px]"
            >
              <Music className="size-4 mr-2 flex-shrink-0" />
              <span>{t('songs', 'Canciones')}</span>
            </TabsTrigger>
            <TabsTrigger 
                value="chat"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-none text-muted-foreground rounded-[14px] h-[36px] flex-1 sm:flex-none px-4 font-sans font-normal text-[14px] relative overflow-visible"
            >
              <MessageSquare className="size-4 mr-2 flex-shrink-0" />
              <span>{t('chat', 'Chat')}</span>
              {hasUnreadChat && (
                    <span className="absolute -top-1 -right-1 bg-red-500 w-[8px] h-[8px] rounded-full border border-card shadow-sm z-10" />
              )}
            </TabsTrigger>
            <TabsTrigger 
                value="members"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-none text-muted-foreground rounded-[14px] h-[36px] flex-1 sm:flex-none px-4 font-sans font-normal text-[14px]"
            >
              <Users className="size-4 mr-2 flex-shrink-0" />
              <span>{t('members', 'Miembros')}</span>
            </TabsTrigger>
            <TabsTrigger 
                value="notifications"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-none text-muted-foreground rounded-[14px] h-[36px] flex-1 sm:flex-none px-4 font-sans font-normal text-[14px] relative overflow-visible"
            >
              <Bell className="size-4 mr-2 flex-shrink-0" />
              <span>{t('notifications', 'Notificaciones')}</span>
              {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center border border-card shadow-sm z-10 gap-0.5">
                      <Bell className="size-[10px]" />
                      <span>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="songs" className="m-0">
                <SongManager />
            </TabsContent>

            <TabsContent value="chat" className="m-0">
                <ProjectChat />
            </TabsContent>

            <TabsContent value="members" className="m-0">
                <MembersPanel />
            </TabsContent>

            <TabsContent value="notifications" className="m-0">
                {currentProject && (
                    <NotificationFeed 
                        projectId={currentProject.id.toString()} 
                    />
                )}
            </TabsContent>
          </div>
        </Tabs>
         </div>
      </div>
    </PageLayout>
  );
}