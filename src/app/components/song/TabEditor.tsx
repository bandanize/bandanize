import React, { useState, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Guitar, Music2, Music, Save, Download, FileText, Upload, 
  FileAudio, Image as ImageIcon, File, Trash2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Tablature } from '@/contexts/ProjectContext';
import { getMediaUrl } from '@/services/api';
import { INSTRUMENTS } from './constants';

function TablatureControls({ onInsert }: { onInsert: (text: string) => void }) {
  const { t } = useTranslation();
  const guitarStrings = 'e|---\nB|---\nG|---\nD|---\nA|---\nE|---\n';
  const bassStrings = 'G|---\nD|---\nA|---\nE|---\n';

  const symbols = [
    { label: 'h', desc: 'Hammer-on', value: 'h' },
    { label: 'p', desc: 'Pull-off', value: 'p' },
    { label: 'b', desc: 'Bend', value: 'b' },
    { label: '/', desc: 'Slide up', value: '/' },
    { label: '\\', desc: 'Slide down', value: '\\' },
    { label: '~', desc: 'Vibrato', value: '~' },
    { label: 'x', desc: 'Mute', value: 'x' },
    { label: '|', desc: 'Barra', value: '|' },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div>
        <Label className="text-sm font-medium mb-3 block text-foreground">{t('string_templates', 'Plantillas de cuerdas')}</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(guitarStrings)}
            className="bg-card border-border text-foreground hover:bg-accent"
          >
            <Guitar className="size-4 mr-2" />
            {t('guitar_6', 'Guitarra (6 cuerdas)')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(bassStrings)}
            className="bg-card border-border text-foreground hover:bg-accent"
          >
            <Music2 className="size-4 mr-2" />
            {t('bass_4', 'Bajo (4 cuerdas)')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert('---')}
            className="bg-card border-border text-foreground hover:bg-accent"
          >
            {t('simple_line', 'Línea simple')}
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block text-foreground">{t('symbols_techniques', 'Símbolos y técnicas')}</Label>
        <div className="flex gap-2 flex-wrap">
          {symbols.map((symbol) => (
            <Button
              key={symbol.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onInsert(symbol.value)}
              title={symbol.desc}
              className="bg-card border-border text-foreground hover:bg-accent min-w-[32px]"
            >
              {symbol.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TabEditorProps {
  tab: Tablature;
  songName: string;
  onSave: (content: string) => Promise<void>;
  isSaving: boolean;
  onUpload: (tabId: string) => void;
  onDeleteFile: (tabId: string, fileUrl: string) => void;
}

export function TabEditor({ 
  tab, 
  songName, 
  onSave, 
  isSaving, 
  onUpload, 
  onDeleteFile 
}: TabEditorProps) {
  const { t } = useTranslation();
  const [editingContent, setEditingContent] = useState(tab.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const hasChanges = editingContent !== (tab.content || '');

  const handleInsertText = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = editingContent;
    
    const newContent = 
      currentContent.substring(0, start) + 
      text + 
      currentContent.substring(end);
    
    setEditingContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + text.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const getInstrumentIcon = (iconName: string) => {
    const instrument = INSTRUMENTS.find(i => i.value === iconName);
    const Icon = instrument?.icon || Music;
    return <Icon className="size-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            {getInstrumentIcon(tab.instrumentIcon || 'guitar')}
            <h3 className="font-medium text-foreground text-lg">{tab.name}</h3>
            <span className="text-sm text-foreground/60 px-2 py-0.5 bg-accent/50 rounded">
                {tab.tuning || 'Standard'}
            </span>
        </div>

        <div className="flex items-center gap-2">
            {hasChanges && (
                <Button 
                    size="sm" 
                    onClick={() => onSave(editingContent)} 
                    disabled={isSaving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    <Save className="size-4 mr-2" />
                    {isSaving ? t('saving', 'Guardando...') : t('save_changes', 'Guardar cambios')}
                </Button>
            )}
            <Button
                variant="outline"
                size="sm"
                className="bg-card border-border text-foreground hover:bg-accent"
                onClick={() => {
                    const text = `${tab.name}\n${tab.tuning || 'Standard'}\n\n${editingContent}`;
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${songName}-${tab.name}.txt`;
                    a.click();
                }}
            >
                <Download className="size-4 mr-2" />
                {t('export', 'Exportar')}
            </Button>
        </div>
      </div>

      <div className="relative">
          <div className="absolute top-2 right-2 flex gap-1 z-10">
              <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => {
                      navigator.clipboard.writeText(editingContent);
                      toast.success("Copiado al portapapeles");
                  }}
                  title={t('copy', "Copiar")}
              >
                  <FileText className="size-4" />
              </Button>
          </div>
          <Textarea
            ref={textareaRef}
            value={editingContent}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingContent(e.target.value)}
            className="font-mono text-sm min-h-[400px] bg-background border-border text-foreground resize-none leading-relaxed p-4"
            placeholder={t('tab_content_placeholder', "Escribe o pega aquí tu tablatura...\n\ne|---\nB|---\nG|---\nD|---\nA|---\nE|---\n")}
            spellCheck={false}
          />
      </div>

      <TablatureControls onInsert={handleInsertText} />

      <div className="mt-8 pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-foreground">{t('attached_files', 'Archivos adjuntos')}</h4>
              <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onUpload(tab.id)}
                  className="bg-card border-border text-foreground hover:bg-accent"
              >
                  <Upload className="size-4 mr-2" />
                  {t('add_file', 'Añadir archivo')}
              </Button>
          </div>
          
          {tab.files && tab.files.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tab.files.map((file: { url: string; type: string; name: string }) => (
                      <div key={file.url} className="flex items-center gap-3 p-3 bg-secondary/10 border border-border rounded-lg group">
                          {file.type.startsWith('audio') ? (
                              <FileAudio className="size-5 text-blue-500" />
                          ) : file.type.startsWith('image') ? (
                              <ImageIcon className="size-5 text-green-500" />
                          ) : (
                              <File className="size-5 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                               <a 
                                  href={getMediaUrl(file.url)}
                                  download 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-accent rounded-md text-muted-foreground"
                              >
                                  <Download className="size-4" />
                              </a>
                              <Button
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => onDeleteFile(tab.id, file.url)}
                              >
                                  <Trash2 className="size-4" />
                              </Button>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <p className="text-sm text-muted-foreground/60 italic">{t('no_files_tab', 'No hay archivos en esta tablatura')}</p>
          )}
      </div>
    </div>
  );
}
