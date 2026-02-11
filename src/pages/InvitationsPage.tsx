import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/app/components/ui/card';
import { Check, X, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { PageLayout } from '@/app/components/PageLayout';

export function InvitationsPage() {
  const { invitations, acceptInvitation, rejectInvitation, setInvitations, isLoading } = useProjects(); // Added setInvitations
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleAccept = async (id: string) => {
    try {
      await acceptInvitation(id);
      setInvitations(prev => prev.filter(inv => inv.id !== id));
      toast.success(t('invitations.accepted'));
    } catch {
      toast.error(t('invitations.acceptError'));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectInvitation(id);
      setInvitations(prev => prev.filter(inv => inv.id !== id));
      toast.success(t('invitations.rejected'));
    } catch {
      toast.error(t('invitations.rejectError'));
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
              <h1 className="text-[24px] font-normal font-poppins text-foreground leading-8">{t('project_invitations', 'Invitaciones de Proyecto')}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      }
    >
      <main className="max-w-4xl mx-auto p-6">
        {isLoading ? (
             <div className="flex items-center justify-center min-h-[50vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
             </div>
        ) : !invitations?.length ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
            <div className="bg-card p-4 rounded-full mb-4 border border-border">
              <Mail className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">{t('no_invitations', 'No tienes invitaciones pendientes')}</h2>
            <p className="text-muted-foreground">
              {t('invitations_desc', 'Cuando te inviten a un proyecto, aparecerá aquí.')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {invitations.map((inv) => (
              <Card key={inv.id} className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">{inv.bandName}</CardTitle>
                  <CardDescription className="text-muted-foreground">{t('invited_to_collab', 'Te han invitado a colaborar')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-4" />
                    <span>{t('pending_invitation', 'Invitación pendiente')}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" 
                    onClick={() => handleAccept(inv.id)}
                  >
                    <Check className="size-4 mr-2" />
                    {t('accept_invitation', 'Aceptar')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-card border-border text-destructive hover:bg-destructive/20 hover:text-destructive-foreground"
                    onClick={() => handleReject(inv.id)}
                  >
                    <X className="size-4 mr-2" />
                    {t('decline_invitation', 'Rechazar')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </PageLayout>
  );
}
