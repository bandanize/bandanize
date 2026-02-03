import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { LogOut, Plus, Music2, Users, User, Settings, Mail, Cookie } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WelcomeModal } from '@/app/components/WelcomeModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/app/components/ui/dropdown-menu';
import { uploadFile } from '@/services/api';
import { toast } from 'sonner';
import CookiesImage from '@/assets/cookies.svg';
import EmptyProjectsImage from '@/assets/empty-projects.svg';

export function Dashboard() {
  const { user, logout } = useAuth();
  const { projects, createProject, selectProject, invitations } = useProjects();
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectImage, setProjectImage] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCookies, setShowCookies] = useState(() => !localStorage.getItem('cookieConsent'));
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is the first time the user logs in
    const hasSeenWelcome = localStorage.getItem(`welcome_seen_${user?.id}`);
    if (!hasSeenWelcome && user) {
      setShowWelcome(true);
    }
  }, [user]);

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
      toast.success('Proyecto creado correctamente');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
          toast.loading("Subiendo imagen...");
          const filename = await uploadFile(file, 'image');
          const fullUrl = `/api/uploads/images/${filename}`;
          setProjectImage(fullUrl);
          toast.dismiss();
          toast.success("Imagen subida");
      } catch (error) {
          console.error("Upload error:", error);
          toast.dismiss();
          toast.error("Error al subir imagen");
      }
  };

  const handleProjectClick = (projectId: string) => {
    selectProject(projectId);
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] relative">
      {/* Header */}
      <header className="h-[84px] bg-[#151518] border-b border-black/10 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] flex flex-col justify-center w-full">
        <div className="max-w-[1216px] w-full flex justify-between items-center mx-auto px-6">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
                 <img src="/favicon.svg" alt="Bandanize" className="size-8" />
            </div>
            <div>
              <h1 className="text-[24px] font-normal font-poppins text-[#EDEDED] leading-8">Bandanize</h1>
              <p className="text-[14px] font-normal font-poppins text-[#EDEDED]/60 leading-5">Bienvenido, {user?.name}</p>
            </div>
          </div>

          {/* User Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-[148px] h-[36px] bg-[#151518] border-[#2B2B31] rounded-[8px] text-[#EDEDED] text-[14px] font-normal font-sans hover:bg-[#1f1f22] hover:text-white"
              >
                <User className="size-4 mr-2" />
                <span className="truncate max-w-[80px]">{user?.username}</span>
                {(invitations?.length || 0) > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {invitations.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="focus:bg-white/5 focus:text-[#EDEDED] cursor-pointer">
                <Settings className="size-4 mr-2" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/invitations')} className="focus:bg-white/5 focus:text-[#EDEDED] cursor-pointer">
                <Mail className="size-4 mr-2" />
                Invitaciones
                {(invitations?.length || 0) > 0 && (
                  <span className="ml-auto bg-red-500/20 text-red-400 text-xs rounded-full px-2 py-0.5">
                    {invitations.length}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2B2B31]" />
              <DropdownMenuItem onClick={logout} className="focus:bg-white/5 focus:text-[#EDEDED] cursor-pointer">
                <LogOut className="size-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1280px] w-full mx-auto py-8 px-6">
        
        {/* Projects Header Row */}
        <div className="flex justify-between items-center mb-6 max-w-[1216px] w-full mx-auto h-[36px]">
          <h2 className="text-[20px] font-bold text-[#EDEDED] font-sans leading-7">Tus proyectos</h2>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-9 sm:w-[148px] h-[36px] bg-[#A3E635] hover:bg-[#92d030] text-[#151518] rounded-[8px] font-sans text-[14px] font-normal px-0 sm:px-4">
                <Plus className="size-4 sm:mr-2 stroke-[1.33px] text-[#151518]" />
                <span className="hidden sm:inline">Nuevo Proyecto</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
              <DialogHeader>
                <DialogTitle className="text-[#EDEDED]">Crear nuevo proyecto</DialogTitle>
                <DialogDescription className="text-[#EDEDED]/60">
                  Crea un proyecto en solitario o una banda musical
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name" className="text-[#EDEDED]">Nombre del proyecto</Label>
                  <Input
                    id="project-name"
                    placeholder="Ej: The Sodawaves"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description" className="text-[#EDEDED]">Descripción</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Ej: Banda de alternative rock"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="project-image" className="text-[#EDEDED]">Imagen</Label>
                  <div className="flex gap-2">
                       <Input
                        id="project-image"
                        placeholder="https://ejemplo.com/imagen.jpg"
                        value={projectImage}
                        onChange={(e) => setProjectImage(e.target.value)}
                        className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED] flex-1"
                      />
                  </div>
                   <div className="mt-2 text-[#EDEDED]/60">
                       <Label htmlFor="create-upload-image" className="text-xs mb-1 block">O subir imagen:</Label>
                       <Input
                          id="create-upload-image"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED]"
                       />
                   </div>
                </div>
                <Button onClick={handleCreateProject} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                  Crear proyecto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Project List or Empty State */}
        {projects.length === 0 ? (
          <div className="max-w-[1166px] w-full min-h-[336px] mx-auto flex flex-col items-center justify-center gap-6">
            <div className="w-[327px] h-[206px] flex items-center justify-center">
                 <img src={EmptyProjectsImage} alt="EmptyProjects" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col items-center gap-1">
                <h3 className="text-[20px] font-bold text-[#EDEDED] font-sans leading-6 text-center">No tienes proyectos aún</h3>
                <p className="text-[14px] font-normal text-[#EDEDED]/60 font-sans leading-5 text-center">Crea tu primer proyecto musical</p>
            </div>
            <Button 
                onClick={() => setOpen(true)}
                className="w-auto sm:w-[148px] h-[36px] bg-[#0B0B0C] border border-[#2B2B31] rounded-[8px] text-[#EDEDED] font-sans text-[14px] font-normal hover:bg-[#1f1f22] px-4"
            >
                 <Plus className="size-4 mr-2 stroke-[1.33px] text-[#EDEDED]" />
                 Nuevo Proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1216px] w-full mx-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                className="w-full h-[140px] bg-[#151518] border border-[#2B2B31] rounded-[14px] p-[12px] gap-[10px] flex cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleProjectClick(project.id)}
              >
                  {/* Image Section */}
                  <div className="w-[116px] h-[116px] flex-shrink-0 rounded-[9px] overflow-hidden flex items-center justify-center">
                    {project.imageUrl ? (
                        <img
                          src={project.imageUrl}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[linear-gradient(135deg,#A3E635_0%,#FF96A5_100%)] flex items-center justify-center">
                          <Music2 className="size-10 text-[#222424]" />
                        </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="flex flex-col h-[116px] flex-1 gap-1 min-w-0">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                           <h3 className="text-[16px] font-normal font-poppins text-[#EDEDED] leading-4 truncate">{project.name}</h3>
                           <p className="text-[16px] font-normal font-poppins text-[#EDEDED] leading-6 line-clamp-3 text-ellipsis overflow-hidden h-[72px] opacity-60">
                               {project.description || 'Sin descripción'}
                           </p>
                      </div>
                      <div className="flex items-center gap-2 h-[20px]">
                           <div className="flex items-center gap-2 text-[#EDEDED]">
                                <Users className="size-4" />
                                <span className="text-[14px] font-normal font-sans leading-5">
                                    {project.members.length} {project.members.length === 1 ? 'miembro' : 'miembros'}
                                </span>
                           </div>
                      </div>
                  </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <WelcomeModal open={showWelcome} onClose={handleCloseWelcome} />
      
      {/* Cookies Overlay */}
      {showCookies && (
          <div className="fixed bottom-4 left-4 z-50 w-[calc(100vw-32px)] sm:w-[400px] h-auto bg-[#151518] rounded-[14px] flex flex-col shadow-2xl border border-white/5 overflow-hidden">
             {/* Image placeholder */}
             <div className="w-full h-[200px] bg-white/5 flex items-center justify-center">
                 <img src={CookiesImage} alt="Cookies" />
             </div>
             
             <div className="p-6 flex flex-col gap-4">
                 <div className="flex flex-col gap-2">
                     <h4 className="text-[20px] font-medium font-poppins text-[#EDEDED] leading-6">Cookies & Privacy</h4>
                     <p className="text-[12px] font-normal font-poppins text-[#EDEDED] leading-4">
                         We use cookies to personalise your experience. By continuing to visit this website you agree to our use of cookies. Learn more
                     </p>
                 </div>
                 
                 <div className="flex gap-4 w-full">
                     <Button 
                        onClick={() => {
                          setShowCookies(false);
                          localStorage.setItem('cookieConsent', 'true');
                        }}
                        className="flex-1 h-[36px] bg-[#151518] border border-[#2B2B31] rounded-[8px] text-[#EDEDED] font-poppins text-[14px] font-normal hover:bg-[#1f1f22]"
                     >
                         Decline
                     </Button>
                     <Button 
                        onClick={() => {
                          setShowCookies(false);
                          localStorage.setItem('cookieConsent', 'true');
                        }}
                        className="flex-1 h-[36px] bg-[#A3E635] hover:bg-[#92d030] rounded-[8px] text-[#151518] font-poppins text-[14px] font-normal"
                     >
                         Accept
                     </Button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
}