import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import WelcomeImage from '@/assets/welcome.svg';
import ProjectImage from '@/assets/project.svg';
import TabImage from '@/assets/tab.svg';
import SongImage from '@/assets/song.svg';
import SongListImage from '@/assets/song-list.svg';


interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] bg-card border-border text-foreground p-0 gap-0 overflow-y-auto custom-scrollbar">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <div className="mx-auto w-20 h-20 flex items-center justify-center mb-2 relative z-10">
            <img src={WelcomeImage} className="w-full h-full object-contain drop-shadow-2xl" alt="Welcome" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">¡Bienvenido a Bandanize!</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm max-w-[90%] mx-auto mt-1">
            Esta plataforma te ayudará a organizar tus proyectos musicales y a colaborar con tu banda.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2">
          <div className="bg-secondary/50 rounded-xl p-4 border border-border">
            <h3 className="text-base font-semibold text-foreground mb-3">¿Cómo funciona?</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-accent transition-colors">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <img src={ProjectImage} className="w-full h-full object-contain" alt="Project" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">1. Crea un Proyecto</h4>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Proyectos solos o bandas. Añade info y miembros.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-accent transition-colors">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <img src={SongListImage} className="w-full h-full object-contain" alt="List" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">2. Organiza Listas</h4>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Agrupa canciones en listas (ej: "Set en vivo").
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-accent transition-colors">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <img src={SongImage} className="w-full h-full object-contain" alt="Song" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">3. Añade Canciones</h4>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Detalles, BPM, tonalidad y multimedia.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-accent transition-colors">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <img src={TabImage} className="w-full h-full object-contain" alt="Tab" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">4. Crea Tablaturas</h4>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Archivos y tablaturas para cada instrumento.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-primary/10 rounded-xl p-3 flex gap-3 items-center">
            <p className="text-primary text-xs font-medium">
              <span className="font-bold">Tip:</span> Usa el chat del proyecto para comunicarte con tu banda.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 pb-6 shrink-0">
          <Button onClick={onClose} className="w-full h-10 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
            ¡Entendido, empecemos!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
