import { ProjectOverview } from '@/app/components/ProjectOverview';
import { useUploadName } from '@/app/components/UploadNameProvider';
import { AccountMenu } from '@/app/components/AccountMenu';
import { ProjectSwitcher } from '@/app/components/ProjectSwitcher';
import React, { useState, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, MessageSquare, Music, Users, LogOut, PenLine, Bell, Calendar, LayoutDashboard } from 'lucide-react';
import { ProjectChat } from '@/app/components/ProjectChat';
import { SongManager } from '@/app/components/SongManager';
import { MembersPanel } from '@/app/components/MembersPanel';
import { getUnreadNotificationCount, getUnreadChatStatus } from '@/services/api';
import { NotificationFeed } from '@/app/components/NotificationFeed';
import { ProjectCalendar } from '@/app/components/ProjectCalendar';
import { toast } from 'sonner';

import { uploadFile, getMediaUrl } from '@/services/api';

import { usePresence } from '@/hooks/usePresence';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { PageLayout } from '@/app/components/PageLayout';

export function ProjectHub() {
  const requestUploadName = useUploadName();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, projects, updateProject, leaveProject, deleteProject, selectProject, isLoading } = useProjects();
  const { user } = useAuth();
  const onlineCount = usePresence(currentProject?.id);
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Keep existing song links working; new project visits open the overview.
  const activeTab = searchParams.get('tab') || (['listId', 'songId', 'tabId'].some(key => searchParams.has(key)) ? 'songs' : 'overview');

  const setActiveTab = (tab: string) => {
    setSearchParams((prev: URLSearchParams) => {
      prev.set('tab', tab);
      return prev;
    }, { replace: true });
  };

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: currentProject?.name || '',
    description: currentProject?.description || '',
    imageUrl: currentProject?.imageUrl || '',
  });

  const [, setCookie] = useCookies(['lastProjectId']);

  // Set last active project cookie
  useEffect(() => {
    if (projectId) {
      setCookie('lastProjectId', projectId, { path: '/', maxAge: 30 * 24 * 60 * 60 }); // 30 days
    }
  }, [projectId, setCookie]);

  // Handle auto-selection on refresh
  useEffect(() => {
      if (!isLoading && projectId && currentProject?.id !== projectId && projects.some(project => project.id === projectId)) {
          selectProject(projectId);
      }
  }, [isLoading, projectId, currentProject, projects, selectProject]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  // Fetch unread count & chat status
  const fetchUnreadCount = React.useCallback(async () => {
        if (currentProject) {
            try {
                const [count, chatStatus] = await Promise.all([
                    getUnreadNotificationCount(currentProject.id.toString()),
                    getUnreadChatStatus(currentProject.id.toString())
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
      const picked = e.target.files?.[0];
      e.target.value = '';
      if (!picked) return;
      const file = await requestUploadName(picked);
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
        // If leaving chat tab, mark as read
        if (activeTab === 'chat' && value !== 'chat' && currentProject && hasUnreadChat) {
             import('@/services/api').then(m => m.markChatAsRead(currentProject.id.toString()))
                .catch(err => console.error("Failed to mark chat read", err));
             setHasUnreadChat(false);
        }
        
        setActiveTab(value);
    };

  return (
    <PageLayout compactHeader
      headerContent={
        <div className="max-w-[1280px] w-full mx-auto px-3 sm:px-5">
            <div className="max-w-[1216px] w-full mx-auto flex items-center gap-2 sm:gap-3">
            <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')} 
                aria-label={t('back_to_dashboard')} title={t('back_to_dashboard')} className="size-10 shrink-0 bg-transparent hover:bg-accent rounded-xl p-0"
            >
              <ArrowLeft className="size-4 text-foreground" />
            </Button>
            
            <div className="flex-1 flex items-center gap-2.5 min-w-0 select-none">
                <div className="hidden sm:flex size-9 aspect-square flex-shrink-0 rounded-xl bg-primary/[0.07] ring-1 ring-primary/15 overflow-hidden items-center justify-center pointer-events-none">
                    {currentProject.imageUrl ? (
                        <img 
                            src={getMediaUrl(currentProject.imageUrl)} 
                            alt={currentProject.name} 
                            className="w-full h-full object-contain" 
                        />
                    ) : (
                        <Music className="size-6 text-primary" />
                    )}
                </div>
               <div className="min-w-0">
                   <ProjectSwitcher />
                   <div className="flex items-center gap-1">
                       <span className="w-[7px] h-[7px] bg-primary rounded-full inline-block"></span>
                       <span className="text-[11px] text-muted-foreground leading-4">
                           {onlineCount} {t('online', 'Online')}
                       </span>
                   </div>
               </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2 items-center ml-auto shrink-0">
             <LanguageSwitcher compact />

            {currentProject.ownerId === user?.id ? (
              <>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openEditDialog} aria-label={t('edit_project')} title={t('edit_project')} className="bg-transparent border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground text-xs font-normal flex size-10 lg:w-auto px-0 lg:px-3 rounded-xl justify-center">
                    <PenLine className="size-4" />
                    <span className="hidden lg:inline">{t('edit_project', 'Editar proyecto')}</span>
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
                <Button variant="ghost" onClick={handleLeaveProject} aria-label={t('leave_project')} title={t('leave_project')} className="size-10 lg:w-auto px-0 lg:px-3 rounded-xl text-muted-foreground hover:text-destructive">
                    <LogOut className="size-4" />
                    <span className="hidden lg:inline">{t('leave_project', 'Abandonar')}</span>
                </Button>
            )}
            <AccountMenu />
            </div>
        </div>
        </div>
      }
    >
      <div className="max-w-[1280px] w-full mx-auto py-6 sm:py-8 px-4 sm:px-6">
         <div className="max-w-[1216px] w-full mx-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList aria-label={t('app_nav.sections')} className="grid grid-cols-6 lg:flex bg-card/60 border border-border/70 rounded-xl p-1 h-14 lg:h-12 w-full lg:w-fit max-w-full mx-auto gap-1">
            {[
              { value: 'overview', icon: LayoutDashboard, label: t('workspace.overview'), short: t('workspace.overview') },
              { value: 'songs', icon: Music, label: t('songs'), short: t('songs') },
              { value: 'chat', icon: MessageSquare, label: t('chat'), short: t('chat') },
              { value: 'members', icon: Users, label: t('members'), short: t('app_nav.team') },
              { value: 'calendar', icon: Calendar, label: t('calendar'), short: t('app_nav.agenda') },
              { value: 'notifications', icon: Bell, label: t('notifications'), short: t('app_nav.alerts') },
            ].map(({ value, icon: Icon, label, short }) => <TabsTrigger key={value} value={value} aria-label={label} title={label}
              className="relative min-w-0 lg:flex-none h-full px-0.5 lg:px-4 flex flex-col lg:flex-row gap-1 lg:gap-2 rounded-lg border-0 text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none font-normal">
              <Icon className="size-4 shrink-0" />
              <span className="lg:hidden max-w-full truncate text-[9px] leading-3">{short}</span>
              <span className="hidden lg:inline text-xs">{label}</span>
              {value === 'chat' && hasUnreadChat && <span className="absolute top-1 right-1 size-1.5 bg-primary rounded-full" />}
              {value === 'notifications' && unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </TabsTrigger>)}
          </TabsList>

          <div className="mt-5 sm:mt-6">
            <TabsContent value="overview" className="m-0"><ProjectOverview key={currentProject.id} project={currentProject} unreadCount={unreadCount} onOpen={(tab, song) => {
              if (song) setSearchParams({ tab, listId: song.listId, songId: song.songId });
              else handleTabChange(tab);
            }} /></TabsContent>
            <TabsContent value="songs" className="m-0">
                <SongManager />
            </TabsContent>

            <TabsContent value="chat" className="m-0">
                <ProjectChat />
            </TabsContent>

            <TabsContent value="members" className="m-0">
                <MembersPanel />
            </TabsContent>

            <TabsContent value="calendar" className="m-0">
                {currentProject && (
                    <ProjectCalendar key={currentProject.id}
                        projectId={currentProject.id.toString()} 
                    />
                )}
            </TabsContent>

            <TabsContent value="notifications" className="m-0">
                {currentProject && (
                    <NotificationFeed onRead={fetchUnreadCount}
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