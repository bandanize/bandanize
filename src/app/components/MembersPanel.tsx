import React, { useState, useEffect } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { UserPlus, Mail, User, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { cn } from "@/app/components/ui/utils";
import api from '@/services/api';
import { useTranslation } from 'react-i18next';

export function MembersPanel() {
  const { currentProject, inviteMember, kickMember } = useProjects();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  
  interface User {
    id: string;
    email: string;
    name: string;
  }

  // Search states
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  // const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
        if (!searchValue.trim()) {
            setSearchResults([]);
            return;
        }
        // setLoading(true);
        try {
            const response = await api.get(`/users/search?query=${searchValue}`);
            setSearchResults(response.data);
        } catch (error) {
            console.error("Error searching users", error);
        } finally {
            // setLoading(false);
        }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchValue]);

  const handleInviteMember = async () => {
    if (!currentProject || !email) return;

    try {
      await inviteMember(currentProject.id, email);
      toast.success(t('invitation_sent', 'Invitación enviada correctamente'));
      setEmail('');
      setSearchValue('');
      setOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('invite_error', 'Error al enviar invitación');
      toast.error(errorMessage);
    }
  };

  if (!currentProject) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-foreground select-none">{t('project_members', 'Miembros del proyecto')}</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <UserPlus className="size-4 mr-2" />
                  {t('invite_member', 'Invitar miembro')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] overflow-visible bg-card border-border text-foreground">
                <DialogHeader>
                  <DialogTitle className="text-foreground">{t('invite_member', 'Invitar miembro')}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {t('invite_desc', 'Busca un usuario por email o nombre para invitarlo.')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2 flex flex-col">
                    <Label className="text-foreground">{t('user_label', 'Usuario')}</Label>
                    <div className="border border-border rounded-md overflow-hidden bg-card">
                      <Command shouldFilter={false} className="bg-card">
                        <CommandInput 
                          placeholder={t('search_placeholder', "Buscar por email o nombre...")}
                          value={searchValue}
                          onValueChange={setSearchValue}
                          className="text-foreground"
                        />
                        <CommandList>
                          <CommandEmpty className="py-2 text-center text-sm text-muted-foreground">
                             {searchValue ? t('no_users_found', "No se encontraron usuarios.") : t('start_typing', "Escribe para buscar...")}
                          </CommandEmpty>
                          <CommandGroup>
                            {searchResults
                              .filter(u => u.email !== user?.email && !currentProject.members.some(m => m.email === u.email))
                              .map((u) => (
                              <CommandItem
                                key={u.id}
                                value={u.email} 
                                onSelect={(currentValue) => {
                                  setEmail(currentValue === email ? "" : currentValue);
                                  setSearchValue(u.email); // Auto-fill search with selected email for clarity
                                }}
                                className="data-[selected=true]:bg-accent text-foreground cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    email === u.email ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                    <span>{u.name}</span>
                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  </div>
                  <Button onClick={handleInviteMember} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={!email || email === user?.email}>
                    {t('invite_to_project', 'Invitar al proyecto')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentProject.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-secondary/10 border border-border rounded-lg group"
              >
                <div className="size-10 bg-secondary rounded-full flex items-center justify-center">
                  <User className="size-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                      {member.name} 
                      {currentProject.ownerId === member.id && <span className="ml-2 text-xs text-primary border border-primary px-1 rounded">{t('owner_badge', 'Owner')}</span>}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="size-3 mr-1" />
                    {member.email}
                  </div>
                </div>
                
                {/* Kick Button: Only for owner, and cannot kick self */}
                {currentProject.ownerId === user?.id && currentProject.ownerId !== member.id && (
                    <Button
                        variant="ghost" 
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/20 data-[state=open]:opacity-100"
                        onClick={() => {
                            if (confirm(t('kick_confirm', `¿Estás seguro de que quieres expulsar a ${member.name}?`).replace('${name}', member.name))) {
                                kickMember(currentProject.id, member.id);
                            }
                        }}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
