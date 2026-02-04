import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/contexts/ProjectContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/app/components/ui/card';
import { Check, X, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';

export function InvitationsPage() {
  const { invitations, acceptInvitation, rejectInvitation } = useProjects();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleAccept = async (id: string, bandName: string) => {
    try {
      await acceptInvitation(id);
      toast.success(t('joined_band', `Te has unido a ${bandName}`).replace('${bandName}', bandName));
    } catch (error) {
      toast.error(t('accept_error', 'Error al aceptar la invitación'));
    }
  };

  const handleReject = async (id: string, bandName: string) => {
    try {
      await rejectInvitation(id);
      toast.success(t('rejected_invitation', `Has rechazado la invitación de ${bandName}`).replace('${bandName}', bandName));
    } catch (error) {
      toast.error(t('reject_error', 'Error al rechazar la invitación'));
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] relative">
      <header className="min-h-[84px] pt-[env(safe-area-inset-top)] bg-[#151518] border-b border-black/10 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] flex flex-col justify-center w-full">
        <div className="max-w-4xl w-full mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="hover:bg-white/5 text-[#EDEDED]">
                <ArrowLeft className="size-4" />
              </Button>
              <h1 className="text-[24px] font-normal font-poppins text-[#EDEDED] leading-8">{t('project_invitations', 'Invitaciones de Proyecto')}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {!invitations?.length ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
            <div className="bg-[#151518] p-4 rounded-full mb-4 border border-[#2B2B31]">
              <Mail className="size-8 text-[#EDEDED]/60" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-[#EDEDED]">{t('no_invitations', 'No tienes invitaciones pendientes')}</h2>
            <p className="text-[#EDEDED]/60">
              {t('invitations_desc', 'Cuando te inviten a un proyecto, aparecerá aquí.')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {invitations.map((inv) => (
              <Card key={inv.id} className="bg-[#151518] border-[#2B2B31]">
                <CardHeader>
                  <CardTitle className="text-[#EDEDED]">{inv.bandName}</CardTitle>
                  <CardDescription className="text-[#EDEDED]/60">{t('invited_to_collab', 'Te han invitado a colaborar')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-[#EDEDED]/60">
                    <Mail className="size-4" />
                    <span>{t('pending_invitation', 'Invitación pendiente')}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    className="flex-1 bg-[#A3E635] text-[#151518] hover:bg-[#92d030]" 
                    onClick={() => handleAccept(inv.id, inv.bandName)}
                  >
                    <Check className="size-4 mr-2" />
                    {t('accept_invitation', 'Aceptar')}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-[#151518] border-[#2B2B31] text-red-500 hover:bg-red-900/20 hover:text-red-400"
                    onClick={() => handleReject(inv.id, inv.bandName)}
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
    </div>
  );
}
