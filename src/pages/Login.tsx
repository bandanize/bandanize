import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import Logo from '@/assets/logo.svg';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
    } catch (err: unknown) {
      const error = err as AxiosError<{ data: string } | string>;
      if (error.response && error.response.data && typeof error.response.data === 'string') {
        setError(error.response.data);
      } else {
        // Fallback for generic error or object data
        setError(error.message || 'Error al iniciar sesión');
      }
    }
  };

  if (showRegister) {
    return <Register onBack={() => setShowRegister(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-[448px] bg-card border-border rounded-[14px] p-6 shadow-none">
        <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
          <div className="flex items-center justify-center">
             <img src={Logo} alt="Bandanize Logo" className="size-28 mb-4" />
          </div>
          <CardTitle className="text-[30px] font-bold text-foreground font-sans text-center leading-8">Bandanize</CardTitle>
          <CardDescription className="text-[16px] text-muted-foreground text-center font-normal font-sans">
            Inicia sesión en tu cuenta de músico
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[14px] text-foreground font-normal">Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="tu@email.com"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                autoComplete="email"
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground placeholder:text-muted-foreground/50 h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[14px] text-foreground font-normal">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground h-[36px] rounded-[8px]"
              />
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-[14px] text-muted-foreground underline font-sans">He olvidado mi contraseña</Link>
              </div>
            </div>
            
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 mt-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[14px] h-[40px] rounded-[8px]"
              >
                Iniciar sesión
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[36px] rounded-[8px]"
                onClick={() => setShowRegister(true)}
              >
                Crear cuenta
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Decorative background images simulation based on CSS if possible, but skipping complex absolute positioning without assets */}
    </div>
  );
}

function Register({ onBack }: { onBack: () => void }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false); // New success state

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, name, username);
      setSuccess(true); // Set success on successful registration
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Error al registrarse');
    }
  };

  if (success) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-[448px] bg-card border-border rounded-[14px] p-6 shadow-none">
            <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
              <div className="flex items-center justify-center">
                 <img src={Logo} alt="Bandanize Logo" className="size-28 mb-4" />
              </div>
              <CardTitle className="text-[30px] font-bold text-foreground font-sans text-center leading-8">Check your email</CardTitle>
              <CardDescription className="text-[16px] text-muted-foreground text-center font-normal font-sans">
                 We've sent a verification link to <strong>{email}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="text-center space-y-4">
                    <p className="text-foreground/80 text-[14px]">
                        Please check your inbox and click the link to verify your account and start using Bandanize.
                    </p>
                    <Button 
                        onClick={onBack}
                        variant="outline"
                        className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[36px] rounded-[8px]"
                    >
                        Back to Login
                    </Button>
               </div>
            </CardContent>
          </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-[448px] bg-card border-border rounded-[14px] p-6 shadow-none">
        <CardHeader className="space-y-4 flex flex-col items-center p-0 mb-8">
          <div className="flex items-center justify-center">
             <img src={Logo} alt="Bandanize Logo" className="size-28 mb-4" />
          </div>
          <CardTitle className="text-[30px] font-bold text-foreground font-sans text-center leading-8">Crear cuenta</CardTitle>
          <CardDescription className="text-[16px] text-muted-foreground text-center font-normal font-sans">
            Regístrate como músico en Bandanize
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
             <div className="space-y-2">
              <Label htmlFor="name" className="text-[14px] text-[#EDEDED] font-normal">Nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                className="bg-[#151518] bg-gradient-to-t from-white/5 to-white/5 border-none text-[#EDEDED] placeholder:text-[#EDEDED]/25 h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[14px] text-foreground font-normal">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground placeholder:text-muted-foreground/50 h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[14px] text-foreground font-normal">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground placeholder:text-muted-foreground/50 h-[36px] rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[14px] text-foreground font-normal">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="bg-input-background bg-gradient-to-t from-white/5 to-white/5 border-none text-foreground h-[36px] rounded-[8px]"
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded text-center">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3 mt-4">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-sans text-[14px] h-[40px] rounded-[8px]">
                Registrarse
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-card border-border text-foreground hover:bg-accent hover:text-white font-sans text-[14px] h-[36px] rounded-[8px]"
                onClick={onBack}
              >
                Volver al inicio de sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
