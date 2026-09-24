import { useState } from 'react';
import { WelcomeModal } from './WelcomeModal';
import { LogOut, Settings, Mail, ChevronDown, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from './ui/button';
import { MemberAvatar } from './MemberAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';

export function AccountMenu() {
  const [guideOpen, setGuideOpen] = useState(false);
  const { user, logout } = useAuth();
  const { invitations } = useProjects();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const count = invitations?.length || 0;
  return <><DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" aria-label={t('app_nav.account')} title={t('app_nav.account')}
        className="relative h-10 w-10 sm:w-auto sm:max-w-40 rounded-xl p-1.5 sm:px-2 gap-2 border border-border/70 bg-background/50 hover:bg-accent hover:border-primary/25 transition-colors">
        <MemberAvatar name={user?.name || ''} photo={user?.photo} className="size-7" />
        <span className="hidden sm:inline truncate text-xs">{user?.username}</span>
        <ChevronDown className="hidden sm:block size-3 text-muted-foreground shrink-0" />
        {count > 0 && <span className="absolute -right-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{count > 9 ? '9+' : count}</span>}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <div className="px-2 py-2 min-w-0"><p className="text-sm font-medium truncate">{user?.name}</p><p className="text-xs text-muted-foreground truncate">@{user?.username}</p></div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => navigate('/profile')}><Settings className="size-4 mr-2" />{t('my_profile')}</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => navigate('/invitations')}><Mail className="size-4 mr-2" />{t('invitations')}{count > 0 && <span className="ml-auto text-xs text-primary">{count}</span>}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => setGuideOpen(true)}><BookOpen className="size-4 mr-2" />{t('guide_ui.menu')}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={logout}><LogOut className="size-4 mr-2" />{t('logout')}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu><WelcomeModal open={guideOpen} onClose={() => setGuideOpen(false)} guide /></>;
}
