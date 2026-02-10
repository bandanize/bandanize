import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import WelcomeImage from "@/assets/welcome.svg";
import ProjectImage from "@/assets/project.svg";
import SongListImage from "@/assets/song-list.svg";
import SongImage from "@/assets/song.svg";
import TabImage from "@/assets/tab.svg";
import { cn } from "@/app/components/ui/utils";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: ProjectImage,
    title: "1. Crea un Proyecto Musical",
    description: "Puede ser un proyecto en solitario o una banda. Añade nombre, descripción, imagen y miembros."
  },
  {
    icon: SongListImage,
    title: "2. Organiza con Listas",
    description: "Dentro de cada proyecto, crea listas para agrupar canciones (ej: \"Set en vivo\")."
  },
  {
    icon: SongImage,
    title: "3. Añade Canciones",
    description: "En cada lista, añade canciones con detalles como BPM, tonalidad y archivos multimedia."
  },
  {
    icon: TabImage,
    title: "4. Crea Tablaturas",
    description: "Para cada canción, añade archivos (video, audio, imágenes) o tablaturas para cada instrumento."
  }
];

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "sm:max-w-[480px] w-[95vw] mt-16 p-6 pt-[50px] gap-3",
          "bg-card border-border rounded-[10px] shadow-2xl",
          "flex flex-col items-center",
          "!overflow-visible !max-h-[85vh]",
          "[&>button.absolute]:hidden" // Hides the default close button
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        
        {/* Header Image - Absolute Positioned */}
        <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-[240px] h-[200px] z-50 pointer-events-none flex items-center justify-center">
           <img 
             src={WelcomeImage} 
             className="w-full h-full object-contain drop-shadow-2xl" 
             alt="Welcome" 
           />
        </div>
        
        {/* Title Section */}
        <div className="flex flex-col items-center text-center gap-2 w-full mb-1 shrink-0">
          <DialogTitle className="text-2xl font-bold text-foreground font-poppins leading-7">
            ¡Bienvenido a Bandanize!
          </DialogTitle>
          <DialogDescription className="text-sm font-normal text-muted-foreground font-poppins leading-5">
            Esta plataforma te ayudará a organizar tus proyectos musicales y colaborar con tu banda.
          </DialogDescription>
        </div>

        {/* Steps Container */}
        <div className="w-full bg-white/5 border border-white/5 rounded-[10px] p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-hidden"> 
            
            <div className="flex flex-col gap-0 shrink-0">
              <h3 className="text-base font-bold text-foreground font-poppins leading-6">¿Cómo funciona?</h3>
              <p className="text-xs text-muted-foreground font-poppins leading-4">Sigue estos pasos para empezar a organizar tu música:</p>
            </div>
            
            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 flex-1">
              {STEPS.map((step, index) => (
                <StepItem key={index} {...step} />
              ))}
            </div>
        </div>

        {/* Tip Section */}
        <div className="w-full bg-[#FEE8EB] border border-[#FF859A] rounded-[10px] p-3 flex gap-1 items-start shrink-0">
           <p className="text-[#0A0A0A] text-xs leading-[18px] font-poppins">
              <span className="font-bold">Tip: </span> 
              Usa el chat del proyecto para comunicarte con tu banda y mantener todos organizados.
           </p>
        </div>

        {/* Footer Button */}
        <div className="w-full shrink-0">
            <Button 
                onClick={onClose} 
                className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 rounded-[6px]"
            >
                ¡Entendido, empecemos!
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex gap-3 items-center">
      <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-transparent">
        <img src={icon} className="w-full h-full object-contain" alt={title} />
      </div>
      <div className="flex flex-col">
        <h4 className="text-sm font-bold text-foreground font-poppins leading-5">{title}</h4>
        <p className="text-xs font-normal text-muted-foreground font-poppins leading-4">
          {description}
        </p>
      </div>
    </div>
  );
}
