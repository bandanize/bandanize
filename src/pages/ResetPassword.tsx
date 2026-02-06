import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import Logo from '@/assets/logo.svg';
import { resetPassword } from '@/services/api';
import { toast } from 'sonner';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Token inválido o faltante');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      toast.success('Contraseña restablecida exitosamente');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] p-4">
        <Card className="w-[448px] bg-[#151518] border-[#2B2B31] rounded-[14px] p-6 shadow-none">
            <CardContent className="pt-6 text-center text-[#EDEDED]">
                Token inválido o faltante. Por favor solicita un nuevo enlace.
                <div className="mt-4">
                     <Link to="/forgot-password">
                        <Button variant="outline">Solicitar nuevo enlace</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] p-4">
      <Card className="w-[448px] bg-[#151518] border-[#2B2B31] rounded-[14px] p-6 shadow-none">
        <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
          <div className="flex items-center justify-center">
            <div className="w-[112px] h-[112px] flex items-center justify-center bg-white/5 rounded-full mb-4">
               <img src={Logo} alt="Bandanize Logo" className="size-16" />
            </div>
          </div>
          <CardTitle className="text-[30px] font-bold text-[#EDEDED] font-sans text-center leading-8">
            Nueva contraseña
          </CardTitle>
          <CardDescription className="text-[16px] text-[#EDEDED]/60 text-center font-normal font-sans">
            Introduce tu nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-[14px] text-[#EDEDED] font-normal">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-[#151518] bg-gradient-to-t from-white/5 to-white/5 border-none text-[#EDEDED] h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[14px] text-[#EDEDED] font-normal">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-[#151518] bg-gradient-to-t from-white/5 to-white/5 border-none text-[#EDEDED] h-[36px] rounded-[8px]"
              />
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#A3E635] hover:bg-[#92d030] text-[#151518] font-sans text-[14px] h-[40px] rounded-[8px]"
              >
                {loading ? 'Restableciendo...' : 'Guardar contraseña'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
