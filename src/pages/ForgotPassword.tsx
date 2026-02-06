import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import Logo from '@/assets/logo.svg';
import { forgotPassword } from '@/services/api';
import { toast } from 'sonner';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
      toast.success('Correo enviado. Revisa tu bandeja de entrada.');
    } catch (err: any) {
      toast.error(err.response?.data || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-[448px] bg-card border-border rounded-[14px] p-6 shadow-none">
        <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
          <div className="flex items-center justify-center">
            <div className="w-[112px] h-[112px] flex items-center justify-center bg-white/5 rounded-full mb-4">
               <img src={Logo} alt="Bandanize Logo" className="size-16" />
            </div>
          </div>
          <CardTitle className="text-[30px] font-bold text-foreground font-sans text-center leading-8">
            Recuperar contraseña
          </CardTitle>
          <CardDescription className="text-[16px] text-muted-foreground text-center font-normal font-sans">
            Introduce tu email para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[14px] text-foreground font-normal">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground placeholder:text-muted-foreground/50 h-[36px] rounded-[8px]"
                />
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[14px] h-[40px] rounded-[8px]"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>
                <Link to="/login">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[36px] rounded-[8px]"
                  >
                    Volver al inicio de sesión
                  </Button>
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="bg-primary/10 text-primary p-4 rounded-lg border border-primary/20">
                <p>Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña en unos minutos.</p>
              </div>
              <Link to="/login">
                <Button
                  variant="outline"
                  className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[36px] rounded-[8px]"
                >
                  Volver al inicio de sesión
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
