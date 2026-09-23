import { ProjectPicker } from '@/app/components/ProjectPicker';
import { MemberAvatar } from '@/app/components/MemberAvatar';
import React, { useState, useEffect } from 'react';
import { useCookies } from 'react-cookie';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { LogOut, Plus, Settings, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WelcomeModal } from '@/app/components/WelcomeModal';
import { getUnreadNotificationCount } from '@/services/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/app/components/ui/dropdown-menu';
import { uploadFile, getMediaUrl } from '@/services/api';
import { toast } from 'sonner';
import EmptyProjectsImage from '@/assets/empty-projects.svg';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { PageLayout } from '@/app/components/PageLayout';
import { Skeleton } from '@/app/components/ui/skeleton';

export function Dashboard() {
  const { user, logout } = useAuth();
  const { projects, createProject, selectProject, invitations, isLoading } = useProjects();
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectImage, setProjectImage] = useState('');
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!user) return false;
    return !localStorage.getItem(`welcome_seen_${user.id}`);
  });
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [cookies] = useCookies(['lastProjectId']);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUnread = async () => {
        if (!projects.length) return;
        
        try {
            const counts: Record<string, number> = {};
            
            await Promise.all(projects.map(async (p) => {
                try {
                    const count = await getUnreadNotificationCount(p.id);
                    if (count > 0) counts[p.id] = count;
                } catch {
                   // ignore individual failures
                }
            }));
            
            setUnreadCounts(counts);
        } catch (error) {
            console.error("Failed to fetch unread counts", error);
        }
    };
    
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [projects]);



  const handleCloseWelcome = () => {
    setShowWelcome(false);
    if (user) {
      localStorage.setItem(`welcome_seen_${user.id}`, 'true');
    }
  };

  const handleCreateProject = () => {
    if (projectName.trim()) {
      createProject(projectName, projectDescription, projectImage || undefined);
      setProjectName('');
      setProjectDescription('');
      setProjectImage('');
      setOpen(false);
      toast.success(t('project_created', 'Proyecto creado correctamente'));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
          toast.loading(t('uploading', "Subiendo imagen..."));
          const filename = await uploadFile(file, 'image');
          const fullUrl = getMediaUrl(`/api/uploads/images/${filename}`);
          setProjectImage(fullUrl);
          toast.dismiss();
          toast.success(t('image_uploaded', "Imagen subida"));
      } catch (error) {
          console.error("Upload error:", error);
          toast.dismiss();
          toast.error(t('upload_error', "Error al subir imagen"));
      }
  };

  const handleProjectClick = (projectId: string) => {
    selectProject(projectId);
    navigate(`/project/${projectId}`);
  };

  return (
    <PageLayout
      headerContent={
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6">
          <div className="max-w-[1216px] w-full flex justify-between items-center mx-auto">
            {/* Logo Section */}
            <div className="flex items-center gap-3 select-none">
              <div className="flex items-center justify-center">
                   <img src="/favicon.svg" alt="Bandanize" className="size-10 pointer-events-none" />
              </div>
              <div>
                <h1 className="text-[24px] font-normal font-poppins text-foreground leading-8">Bandanize</h1>
                <p className="text-[14px] font-normal font-poppins text-muted-foreground leading-5">{t('Welcome')}, {user?.name?.split(' ')[0]}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
               <LanguageSwitcher />

               {/* User Button */}
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-9 sm:min-w-[148px] sm:w-auto h-[36px] bg-card border-border rounded-[8px] text-foreground text-[14px] font-normal font-sans hover:bg-accent hover:text-white px-0 sm:px-4"
                    >
                      <MemberAvatar name={user?.name || ''} photo={user?.photo} className="size-6 sm:mr-1" />
                      <span className="truncate max-w-[80px] hidden sm:inline">{user?.username}</span>
                      {(invitations?.length || 0) > 0 && (
                        <span className="ml-2 bg-destructive text-white text-xs rounded-full px-2 py-0.5 hidden sm:inline">
                          {invitations.length}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-border text-foreground">
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="focus:bg-white/5 focus:text-foreground cursor-pointer">
                      <Settings className="size-4 mr-2" />
                      {t('my_profile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/invitations')} className="focus:bg-white/5 focus:text-foreground cursor-pointer">
                      <Mail className="size-4 mr-2" />
                      {t('invitations')}
                      {(invitations?.length || 0) > 0 && (
                        <span className="ml-auto bg-destructive/20 text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                          {invitations.length}
                        </span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={logout} className="focus:bg-white/5 focus:text-foreground cursor-pointer">
                      <LogOut className="size-4 mr-2" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
          </div>
        </div>
      }
    >
      <div className="max-w-[1280px] w-full mx-auto py-8 px-6">
        
        {/* Projects Header Row */}
        <div className="flex justify-between items-center mb-6 max-w-[1216px] w-full mx-auto h-[36px]">
          <h2 className="text-[20px] font-bold text-foreground font-sans leading-7 select-none">{t('your_projects')}</h2>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-9 sm:min-w-[148px] sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-0 sm:px-4">
                <Plus className="size-4 sm:mr-2 text-primary-foreground" />
                <span className="hidden sm:inline">{t('new_project')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="text-foreground">{t('create_new_project_title')}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                   {t('create_new_project_desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name" className="text-foreground">{t('project_name')}</Label>
                  <Input
                    id="project-name"
                    placeholder="Ej: The Sodawaves"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-input-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description" className="text-foreground">{t('description')}</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Ej: Banda de alternative rock"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="bg-input-background border-border text-foreground"
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="project-image" className="text-foreground">{t('image')}</Label>
                  <div className="flex gap-2">
                       <Input
                        id="project-image"
                        placeholder="https://ejemplo.com/imagen.jpg"
                        value={projectImage}
                        onChange={(e) => setProjectImage(e.target.value)}
                        className="bg-input-background border-border text-foreground flex-1"
                      />
                  </div>
                   <div className="mt-2 text-muted-foreground">
                       <Label htmlFor="create-upload-image" className="text-xs mb-1 block">{t('or_upload_image')}</Label>
                       <Input
                          id="create-upload-image"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="bg-card border-border text-foreground h-auto py-2.5 items-center file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer flex"
                       />
                   </div>
                </div>
                <Button onClick={handleCreateProject} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {t('create_project')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Project List or Loading or Empty State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-[1216px] w-full mx-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-full h-[140px] bg-card border border-border rounded-[14px] p-[12px] gap-[10px] flex">
                <Skeleton className="w-[116px] h-[116px] rounded-[9px]" />
                <div className="flex flex-col h-[116px] flex-1 gap-2">
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                  <div className="flex items-center gap-2 h-[20px] mt-auto">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="max-w-[1166px] w-full min-h-[336px] mx-auto flex flex-col items-center justify-center gap-6 select-none">
            <div className="w-[327px] h-[206px] flex items-center justify-center">
                 <img src={EmptyProjectsImage} alt="EmptyProjects" className="w-full h-full object-contain pointer-events-none" />
            </div>
            <div className="flex flex-col items-center gap-1">
                <h3 className="text-[20px] font-bold text-foreground font-sans leading-6 text-center">{t('no_projects_yet')}</h3>
                <p className="text-[14px] font-normal text-muted-foreground font-sans leading-5 text-center">{t('create_first_project')}</p>
            </div>
            <Button 
                onClick={() => setOpen(true)}
                className="w-auto sm:min-w-[148px] h-[36px] bg-card border border-border rounded-[8px] text-foreground font-sans text-[14px] font-normal hover:bg-accent px-4"
            >
                 <Plus className="size-4 mr-2 stroke-[1.33px] text-foreground" />
                 {t('new_project')}
            </Button>
          </div>
        ) : (
          <ProjectPicker projects={projects} lastProjectId={String(cookies.lastProjectId || '')} unreadCounts={unreadCounts} onSelect={handleProjectClick} />
        )}
      </div>

      <WelcomeModal open={showWelcome} onClose={handleCloseWelcome} />
      
    </PageLayout>
  );
}