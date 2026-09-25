import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { isVideoFile } from '@/lib/media-kind';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

const UploadNameContext = createContext<(file: File) => Promise<File | null>>(async () => null);
export const useUploadName = () => useContext(UploadNameContext);

export function UploadNameProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const resolve = useRef<((value: File | null) => void) | null>(null);
  const extension = file?.name.match(/\.[^.]+$/)?.[0] || '';
  const finish = (value: File | null) => { resolve.current?.(value); resolve.current = null; setFile(null); };
  const request = (next: File) => new Promise<File | null>(done => {
    if (isVideoFile(next)) {
      toast.error(t('workspace.video_upload_disabled'));
      done(null);
      return;
    }
    resolve.current?.(null);
    resolve.current = done;
    setName(next.name.replace(/\.[^.]+$/, ''));
    setFile(next);
  });
  const valid = name.trim().length > 0 && !/[\\/:*?"<>|#%]/.test(name) && !name.includes('..') && ![...name].some(char => char.charCodeAt(0) < 32);
  return <UploadNameContext.Provider value={request}>
    {children}
    <Dialog open={!!file} onOpenChange={open => { if (!open) finish(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('workspace.upload_title')}</DialogTitle><DialogDescription>{t('workspace.upload_hint')}</DialogDescription></DialogHeader>
        <form onSubmit={event => { event.preventDefault(); if (file && valid) finish(new File([file], name.trim() + extension, { type: file.type, lastModified: file.lastModified })); }} className="space-y-4">
          <Label htmlFor="upload-name">{t('name')}</Label>
          <div className="flex items-center gap-2"><Input id="upload-name" autoFocus aria-invalid={!valid} aria-describedby={!valid ? "upload-name-error" : undefined} value={name} maxLength={120} onChange={e => setName(e.target.value)} /><span className="text-sm text-muted-foreground">{extension}</span></div>
          {!valid && <p id="upload-name-error" className="text-xs text-destructive">{t('workspace.invalid_name')}</p>}
          <p className="text-xs text-muted-foreground truncate">{file?.name} · {((file?.size || 0) / 1024 / 1024).toFixed(1)} MB</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => finish(null)}>{t('workspace.cancel')}</Button><Button type="submit" disabled={!valid}>{t('workspace.upload')}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </UploadNameContext.Provider>;
}
