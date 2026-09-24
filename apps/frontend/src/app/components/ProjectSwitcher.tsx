import { ChevronsUpDown, Check, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjects } from '@/contexts/ProjectContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';

export function ProjectSwitcher() {
  const { projects, currentProject, selectProject } = useProjects();
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (!currentProject) return null;
  if (projects.length < 2) return <h1 className="text-sm sm:text-lg font-medium font-poppins truncate">{currentProject.name}</h1>;
  return <DropdownMenu>
    <DropdownMenuTrigger className="flex items-center gap-1.5 min-w-0 max-w-full min-h-7 rounded-md text-left hover:bg-accent hover:text-primary focus-visible:outline focus-visible:outline-primary" aria-label={t('projects_ui.switch')}>
      <h1 className="text-sm sm:text-lg font-medium font-poppins truncate">{currentProject.name}</h1>
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-64 max-w-[calc(100vw-32px)] max-h-[70dvh] overflow-y-auto">
      {projects.map(project => <DropdownMenuItem key={project.id} onSelect={() => { selectProject(project.id); navigate('/project/' + project.id); }} className="gap-3 py-3">
        <span className="flex-1 truncate">{project.name}</span>{project.id === currentProject.id && <Check className="size-4 text-primary" />}
      </DropdownMenuItem>)}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => navigate('/dashboard')}><LayoutGrid className="size-4 mr-2" />{t('projects_ui.all')}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
