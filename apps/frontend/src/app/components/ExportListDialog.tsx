import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Card, CardContent } from '@/app/components/ui/card';
import { SongList } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import { Share, Copy, Youtube, Music } from 'lucide-react';

interface ExportListDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    list: SongList | null;
    onExportClipboard: (list: SongList) => void;
}

export function ExportListDialog({ isOpen, onOpenChange, list, onExportClipboard }: ExportListDialogProps) {
    const { t } = useTranslation();

    if (!list) return null;

    const exportToSpotify = async () => {
        alert(t('export_spotify_premium', 'La exportación a Spotify está deshabilitada temporalmente porque requiere la API Premium de pago.'));
        /*
        const newWindow = window.open('', '_blank');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/api/integrations/spotify/auth-url?listId=${list.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (newWindow) newWindow.location.href = data.url;
            } else {
                if (newWindow) newWindow.close();
                console.error("Failed to get Spotify Auth URL");
                alert(t('export_spotify_failed', 'Fallo al iniciar sesión con Spotify'));
            }
        } catch (error) {
            if (newWindow) newWindow.close();
            console.error(error);
            alert(t('export_spotify_error', 'Error conectando con el servidor'));
        }
        */
    };

    const exportToYouTube = async () => {
        const newWindow = window.open('', '_blank');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/api/integrations/youtube/auth-url?listId=${list.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (newWindow) newWindow.location.href = data.url;
            } else {
                if (newWindow) newWindow.close();
                console.error("Failed to get YouTube Auth URL");
                alert(t('export_youtube_failed', 'Fallo al iniciar sesión con YouTube'));
            }
        } catch (error) {
            if (newWindow) newWindow.close();
            console.error(error);
            alert(t('export_youtube_error', 'Error conectando con el servidor'));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-card border-border p-6 shadow-xl rounded-2xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Share className="size-5 text-primary" />
                        {t('export_list_title', 'Exportar Lista')}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {t('export_list_desc', 'Elige dónde quieres exportar tu lista de canciones.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    {/* Option 1: Clipboard */}
                    <Card
                        className={`relative overflow-hidden cursor-pointer transition-all border-2 border-border hover:border-primary/50 bg-background hover:bg-accent/5`}
                        onClick={() => {
                            onExportClipboard(list);
                            onOpenChange(false);
                        }}
                    >
                        <CardContent className="p-4 flex flex-col items-center text-center h-full">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                <Copy className="size-5 text-primary" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground mb-1">
                                {t('export_clipboard', 'Portapapeles')}
                            </h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {t('export_clipboard_desc', 'Copia texto con canciones')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Option 2: Spotify */}
                    {/* Option 2: Spotify (Disabled) */}
                    <Card
                        className={`relative overflow-hidden cursor-not-allowed transition-all border-2 border-border bg-background/50 opacity-60 grayscale`}
                        onClick={exportToSpotify}
                    >
                        <CardContent className="p-4 flex flex-col items-center text-center h-full">
                            <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                <Music className="size-5 text-muted-foreground" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground mb-1 relative">
                                Spotify
                                <span className="absolute -top-3 -right-6 text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded-full select-none cursor-default">PREMIUM</span>
                            </h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {t('export_spotify_desc', 'Requiere API Premium')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Option 3: YouTube */}
                    <Card
                        className={`relative overflow-hidden cursor-pointer transition-all border-2 border-border hover:border-[#FF0000]/50 bg-background hover:bg-[#FF0000]/5`}
                        onClick={exportToYouTube}
                    >
                        <CardContent className="p-4 flex flex-col items-center text-center h-full">
                            <div className="size-10 rounded-full bg-[#FF0000]/10 flex items-center justify-center mb-3">
                                <Youtube className="size-5 text-[#FF0000]" />
                            </div>
                            <h4 className="font-semibold text-sm text-foreground mb-1">
                                YT Music
                            </h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {t('export_youtube_desc', 'Crea playlist')}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
