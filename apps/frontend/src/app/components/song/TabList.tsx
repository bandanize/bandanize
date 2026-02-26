import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, Edit, Trash2, Music } from 'lucide-react';
import { Song, Tablature } from '@/contexts/ProjectContext';
import { INSTRUMENTS } from './constants';
import { useTranslation } from 'react-i18next';
import TabImage from '@/assets/tab.svg';

interface TabListProps {
  song: Song;
  selectedTabId: string | null;
  onSelectTab: (id: string) => void;
  onDeleteTab: (id: string) => void;
  onCreateTab: (data: { name: string; instrument: string; tuning: string }) => void;
  onUpdateTabDetails: (id: string, data: { name: string; instrument: string; tuning: string; instrumentIcon: string }) => Promise<void>;
}

export function TabList({ 
  song, 
  selectedTabId, 
  onSelectTab, 
  onDeleteTab, 
  onCreateTab,
  onUpdateTabDetails
}: TabListProps) {
  const { t } = useTranslation();
  const [openTabDialog, setOpenTabDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [tabData, setTabData] = useState({
    instrument: 'guitar',
    name: '',
    tuning: '',
  });
  
  const [editTabDetails, setEditTabDetails] = useState({
      id: '',
      name: '',
      instrument: 'guitar',
      tuning: ''
  });

  const getInstrumentIcon = (iconName: string) => {
    const instrument = INSTRUMENTS.find(i => i.value === iconName);
    const Icon = instrument?.icon || Music;
    return <Icon className="size-4" />;
  };

  const handleCreate = () => {
    if (!tabData.name.trim()) return;
    onCreateTab(tabData);
    setTabData({ instrument: 'guitar', name: '', tuning: '' });
    setOpenTabDialog(false);
  };

  const openEdit = (e: React.MouseEvent, tab: Tablature) => {
    e.stopPropagation();
    setEditTabDetails({
        id: tab.id,
        name: tab.name,
        instrument: tab.instrumentIcon || 'guitar',
        tuning: tab.tuning || ''
    });
    setOpenEditDialog(true);
  };

  const handleUpdate = async () => {
      if (!editTabDetails.name.trim()) return;
      
      const instrumentLabel = INSTRUMENTS.find(i => i.value === editTabDetails.instrument)?.label || 'Guitarra';
      
      await onUpdateTabDetails(editTabDetails.id, {
          name: editTabDetails.name,
          instrument: instrumentLabel,
          instrumentIcon: editTabDetails.instrument,
          tuning: editTabDetails.tuning
      });
      setOpenEditDialog(false);
  };

  return (

    <Card className="bg-card border-border h-fit">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-foreground">{t('tabs_title', 'Tablaturas')} ({song.tablatures.length})</CardTitle>
          <Dialog open={openTabDialog} onOpenChange={setOpenTabDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="size-4 md:mr-2" />
                <span className="hidden md:inline">{t('new_tab', 'Nueva tablatura')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>{t('create_tab', 'Crear tablatura')}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t('create_tab_desc', 'Añade una nueva tablatura para un instrumento')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="tab-instrument" className="text-foreground">{t('instrument', 'Instrumento')}</Label>
                  <Select
                    value={tabData.instrument}
                    onValueChange={(value) => setTabData({ ...tabData, instrument: value })}
                  >
                    <SelectTrigger id="tab-instrument" className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {INSTRUMENTS.map((inst) => (
                        <SelectItem key={inst.value} value={inst.value} className="focus:bg-accent focus:text-accent-foreground">
                          {inst.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tab-name" className="text-foreground">{t('name', 'Nombre')}</Label>
                  <Input
                    id="tab-name"
                    placeholder="Ej: Guitarra rítmica"
                    value={tabData.name}
                    onChange={(e) => setTabData({ ...tabData, name: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tab-tuning" className="text-foreground">{t('tuning', 'Afinación')}</Label>
                  <Input
                    id="tab-tuning"
                    placeholder="Opcional (Ej: Standard EADGBE)"
                    value={tabData.tuning}
                    onChange={(e) => setTabData({ ...tabData, tuning: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {t('create_tab', 'Crear tablatura')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

           <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
               <DialogContent className="bg-card border-border text-foreground">
                   <DialogHeader>
                       <DialogTitle>{t('edit_tab', 'Editar tablatura')}</DialogTitle>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                       <div className="space-y-2">
                             <Label htmlFor="edit-tab-name" className="text-foreground">{t('name', 'Nombre')}</Label>
                             <Input
                               id="edit-tab-name"
                               value={editTabDetails.name}
                               onChange={(e) => setEditTabDetails({ ...editTabDetails, name: e.target.value })}
                               className="bg-background border-border text-foreground"
                             />
                       </div>
                       <div className="space-y-2">
                           <Label htmlFor="edit-tab-instrument" className="text-foreground">{t('instrument', 'Instrumento')}</Label>
                           <Select
                               value={editTabDetails.instrument}
                               onValueChange={(value) => setEditTabDetails({ ...editTabDetails, instrument: value })}
                           >
                               <SelectTrigger id="edit-tab-instrument" className="bg-background border-border text-foreground">
                                   <SelectValue />
                               </SelectTrigger>
                               <SelectContent className="bg-card border-border text-foreground">
                                   {INSTRUMENTS.map((inst) => (
                                       <SelectItem key={inst.value} value={inst.value} className="focus:bg-accent focus:text-accent-foreground">
                                           {inst.label}
                                       </SelectItem>
                                   ))}
                               </SelectContent>
                           </Select>
                       </div>
                       <div className="space-y-2">
                           <Label htmlFor="edit-tab-tuning" className="text-foreground">{t('tuning', 'Afinación')}</Label>
                           <Input
                               id="edit-tab-tuning"
                               value={editTabDetails.tuning}
                               onChange={(e) => setEditTabDetails({ ...editTabDetails, tuning: e.target.value })}
                               className="bg-background border-border text-foreground"
                           />
                       </div>
                       <Button onClick={handleUpdate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                           {t('save_changes', 'Guardar cambios')}
                       </Button>
                   </div>
               </DialogContent>
           </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {song.tablatures.length === 0 ? (
          <div className="text-center py-12">
            <img src={TabImage} alt="tab" className="size-12 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground/60">{t('no_tabs', 'No hay tablaturas aún')}</p>
            <p className="text-sm text-muted-foreground/40">{t('create_first_tab', 'Crea tu primera tablatura')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {song.tablatures.map((tab) => (
              <Card
                key={tab.id}
                className={`cursor-pointer transition-all bg-secondary/10 border-border ${
                  selectedTabId === tab.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onSelectTab(tab.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-secondary/20 rounded-md border border-border">
                            {getInstrumentIcon(tab.instrumentIcon || 'guitar')}
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{tab.name}</h4>
                            <p className="text-xs text-muted-foreground">{tab.tuning || t('standard_tuning', 'Estandar')}</p>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(e) => openEdit(e, tab)}
                            >
                              <Edit className="size-4" />
                            </Button>
                            <Button
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTab(tab.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                        </div>
                      </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
