import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import WelcomeImage from '@/assets/welcome.svg';
import ProjectImage from '@/assets/project.svg';
import SongListImage from '@/assets/song-list.svg';
import TabImage from '@/assets/tab.svg';
import CalendarImage from '@/assets/calendar.svg';

interface WelcomeModalProps { open: boolean; onClose: () => void; guide?: boolean; }
const images = [WelcomeImage, ProjectImage, SongListImage, TabImage, CalendarImage];
const topics = ['intro', 'project', 'songs', 'tabs', 'team'];

export function WelcomeModal(props: WelcomeModalProps) {
  return props.open ? <GuideContent {...props} /> : null;
}

function GuideContent({ open, onClose, guide = false }: WelcomeModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const topic = topics[step];
  const last = step === topics.length - 1;
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="w-[calc(100%-24px)] sm:max-w-[760px] p-0 gap-0 overflow-hidden max-h-[calc(100dvh-24px)] rounded-2xl">
      <div className="overflow-y-auto min-h-0 max-h-[calc(100dvh-24px)]">
        <div className="px-5 sm:px-7 pt-6 pb-4 pr-12">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-primary mb-2">Bandanize · {t('guide_ui.eyebrow')}</p>
          <DialogTitle className="text-xl sm:text-2xl font-semibold">{t(guide ? 'guide_ui.title' : 'guide_ui.welcome')}</DialogTitle>
          <DialogDescription className="mt-2 text-sm">{t('guide_ui.description')}</DialogDescription>
        </div>
        <div className="px-5 sm:px-7 pb-5">
          <nav aria-label={t('guide_ui.topics')} className="flex gap-1.5 mb-5">
            {topics.map((item,index)=><button key={item} type="button" aria-label={t('guide_ui.'+item+'.title')}
              aria-current={index===step?'step':undefined} onClick={()=>setStep(index)}
              className="flex-1 min-w-0 h-8 flex items-center rounded-lg px-0.5 focus-visible:outline focus-visible:outline-primary"><span className={`block w-full h-1.5 rounded-full ${index===step?'bg-primary':index<step?'bg-primary/35':'bg-muted'}`} /></button>)}
          </nav>
          <div className="grid sm:grid-cols-[220px_minmax(0,1fr)] gap-5 sm:gap-7 items-center">
            <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-primary/[0.03] to-[#ff859a]/10 border border-white/5 flex items-center justify-center h-32 sm:h-64 overflow-hidden">
              <span aria-hidden="true" className="absolute rounded-full border border-primary/10 size-40 sm:size-56" />
              <img src={images[step]} alt="" className="relative object-contain w-40 h-28 sm:w-52 sm:h-56 p-2" />
            </div>
            <div aria-live="polite" aria-atomic="true" className="min-w-0">
              <p className="text-xs text-muted-foreground mb-2">{t('guide_ui.step',{current:step+1,total:topics.length})}</p>
              <h3 className="text-lg font-semibold mb-2">{t('guide_ui.'+topic+'.title')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t('guide_ui.'+topic+'.body')}</p>
              <ul className="mt-4 space-y-3">
                {[1,2].map(item=><li key={item} className="flex gap-2 text-sm leading-relaxed"><Check className="size-4 text-primary shrink-0 mt-0.5" /><span>{t('guide_ui.'+topic+'.tip'+item)}</span></li>)}
              </ul>
            </div>
          </div>
          <p className="mt-5 text-xs text-muted-foreground border-t border-border pt-4">{t('guide_ui.reopen')}</p>
          <div className="flex items-center justify-between gap-2 mt-5">
            <Button variant="ghost" onClick={()=>step===0?onClose():setStep(step-1)} className="text-muted-foreground">
              {step>0&&<ArrowLeft className="size-4" />}{t(step===0?'guide_ui.later':'guide_ui.back')}
            </Button>
            <Button onClick={()=>last?onClose():setStep(step+1)} className="rounded-xl">
              {t(last?(guide?'guide_ui.done':'guide_ui.start'):'guide_ui.next')}{!last&&<ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
