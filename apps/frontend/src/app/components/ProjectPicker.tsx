import { useState } from 'react';
import { ArrowUpRight, Bell, ListMusic, Music2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Project } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { MemberAvatar } from './MemberAvatar';
import { getMediaUrl } from '@/services/api';

function ProjectArtwork({ project, single }: { project: Project; single: boolean }) {
  const [failed, setFailed] = useState<string>();
  const showPhoto = project.imageUrl && failed !== project.imageUrl;
  return <div className={`relative isolate overflow-hidden flex items-center justify-center ${single ? 'h-52 sm:h-full sm:min-h-64' : 'h-48'} bg-[radial-gradient(ellipse_at_top_left,#607b34,transparent_70%),linear-gradient(130deg,#263022,#382730)]`}>
    {showPhoto && <img src={getMediaUrl(project.imageUrl!)} alt="" aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover scale-150 blur-3xl opacity-65 saturate-150 pointer-events-none" />}
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/70 pointer-events-none" />
    <div className={`relative rounded-2xl drop-shadow-[0_14px_20px_rgba(0,0,0,0.4)] transition-transform duration-300 motion-reduce:transition-none group-hover:-translate-y-1 ${single ? 'size-36 sm:size-40' : 'size-32'}`}>
      {showPhoto ? <img src={getMediaUrl(project.imageUrl!)} alt="" onError={() => setFailed(project.imageUrl)}
        className="h-full w-full object-contain rounded-2xl" />
        : <div className="h-full w-full rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-card">
            <Music2 className="size-12 text-primary" aria-hidden="true" />
          </div>}
    </div>
  </div>;
}

export function ProjectPicker({ projects, lastProjectId, unreadCounts, onSelect }: {
  projects: Project[]; lastProjectId?: string; unreadCounts: Record<string, number>; onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const single = projects.length === 1;
  return <div className={single ? 'w-full' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'} data-testid="project-picker">
    {projects.map(project => {
      const songCount = new Set(project.songLists.flatMap(list => list.songs.map(song => song.id))).size;
      return <button key={project.id} type="button" role="button" data-project-id={project.id}
        onClick={() => onSelect(project.id)}
        className={`group text-left w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4 transition-colors shadow-[0_12px_36px_rgba(0,0,0,0.12)] ${single ? 'grid sm:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]' : 'flex flex-col'}`}>
        <ProjectArtwork project={project} single={single} />
        <div className={`flex flex-col min-w-0 flex-1 ${single ? 'p-5 sm:p-7 lg:p-8' : 'p-5'}`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{t(project.ownerId === user?.id ? 'projects_ui.your_project' : 'projects_ui.shared_project')}</span>
            {lastProjectId === project.id && <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">{t('projects_ui.recent')}</span>}
          </div>
          <h3 className={`font-poppins font-medium tracking-tight text-foreground truncate ${single ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>{project.name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-2 mb-5">{project.description || t('projects_ui.description')}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-5">
            <span className="inline-flex items-center gap-1.5"><ListMusic className="size-3.5" />{t('projects_ui.lists', { count: project.songLists.length })}</span>
            <span className="inline-flex items-center gap-1.5"><Music2 className="size-3.5" />{t('projects_ui.songs', { count: songCount })}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />{t('visual.member_count', { count: project.members.length })}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4 mt-auto">
            <div className="flex items-center -space-x-2">
              {project.members.slice(0, 4).map(member => <MemberAvatar key={member.id} name={member.name}
                photo={member.id === user?.id ? user?.photo || member.photo : member.photo} className="size-7 border-2 border-card" />)}
              {project.members.length > 4 && <span className="size-7 rounded-full border-2 border-card bg-secondary text-[10px] flex items-center justify-center">+{project.members.length - 4}</span>}
            </div>
            <span className="flex items-center gap-2">
              {(unreadCounts[project.id] || 0) > 0 && <span className="inline-flex items-center gap-1 text-xs text-primary"><Bell className="size-3" />{unreadCounts[project.id]}</span>}
              <span className="inline-flex items-center gap-2 text-xs font-medium rounded-full bg-primary/10 px-3 py-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {t('projects_ui.open')}<ArrowUpRight className="size-3.5" />
              </span>
            </span>
          </div>
        </div>
      </button>;
    })}
  </div>;
}
