import React, { useState, useEffect } from 'react';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { UserPlus, Mail, User, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/app/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { cn } from "@/app/components/ui/utils";
import api from '@/services/api';
import { useTranslation } from 'react-i18next';

export function MembersPanel() {
  const { currentProject, inviteMember, kickMember } = useProjects();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  
  // Search states
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
        if (!searchValue.trim()) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        try {
            const response = await api.get(`/users/search?query=${searchValue}`);
            setSearchResults(response.data);
        } catch (error) {
            console.error("Error searching users", error);
        } finally {
            setLoading(false);
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
    } catch (err: any) {
      toast.error(err.message || t('invite_error', 'Error al enviar invitación'));
    }
  };

  if (!currentProject) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-[#151518] border-[#2B2B31]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-[#EDEDED]">{t('project_members', 'Miembros del proyecto')}</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#A3E635] text-[#151518] hover:bg-[#92d030]">
                  <UserPlus className="size-4 mr-2" />
                  {t('invite_member', 'Invitar miembro')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] overflow-visible bg-[#151518] border-[#2B2B31] text-[#EDEDED]">
                <DialogHeader>
                  <DialogTitle className="text-[#EDEDED]">{t('invite_member', 'Invitar miembro')}</DialogTitle>
                  <DialogDescription className="text-[#EDEDED]/60">
                    {t('invite_desc', 'Busca un usuario por email o nombre para invitarlo.')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2 flex flex-col">
                    <Label className="text-[#EDEDED]">{t('user_label', 'Usuario')}</Label>
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className="w-full justify-between bg-[#0B0B0C] border-[#2B2B31] text-[#EDEDED] hover:bg-[#2B2B31]"
                        >
                          {email
                            ? searchResults.find((user) => user.email === email)?.name || email
                            : t('search_user', "Buscar usuario...")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0 bg-[#151518] border-[#2B2B31]">
                        <Command shouldFilter={false} className="bg-[#151518]">
                          <CommandInput 
                            placeholder={t('search_placeholder', "Buscar por email o nombre...")}
                            value={searchValue}
                            onValueChange={setSearchValue}
                            className="text-[#EDEDED]"
                          />
                          <CommandList>
                            <CommandEmpty className="py-2 text-center text-sm text-[#EDEDED]/60">{t('no_users_found', "No se encontraron usuarios.")}</CommandEmpty>
                            <CommandGroup>
                              {searchResults.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.email} 
                                  onSelect={(currentValue) => {
                                    setEmail(currentValue === email ? "" : currentValue);
                                    setOpenCombobox(false);
                                  }}
                                  className="data-[selected=true]:bg-[#2B2B31] text-[#EDEDED]"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      email === user.email ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                      <span>{user.name}</span>
                                      <span className="text-xs text-[#EDEDED]/60">{user.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button onClick={handleInviteMember} className="w-full bg-[#A3E635] text-[#151518] hover:bg-[#92d030]" disabled={!email}>
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
                className="flex items-center gap-3 p-3 bg-[#0B0B0C] border border-[#2B2B31] rounded-lg group"
              >
                <div className="size-10 bg-[#2B2B31] rounded-full flex items-center justify-center">
                  <User className="size-5 text-[#EDEDED]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#EDEDED]">
                      {member.name} 
                      {currentProject.ownerId === member.id && <span className="ml-2 text-xs text-[#A3E635] border border-[#A3E635] px-1 rounded">{t('owner_badge', 'Owner')}</span>}
                  </p>
                  <div className="flex items-center text-sm text-[#EDEDED]/60">
                    <Mail className="size-3 mr-1" />
                    {member.email}
                  </div>
                </div>
                
                {/* Kick Button: Only for owner, and cannot kick self */}
                {currentProject.ownerId === user?.id && currentProject.ownerId !== member.id && (
                    <Button
                        variant="ghost" 
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-[#EDEDED]/40 hover:text-red-500 hover:bg-red-900/20 data-[state=open]:opacity-100"
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
