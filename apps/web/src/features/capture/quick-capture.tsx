import { CAPTURE_KIND_LABELS, CAPTURE_KINDS, createCaptureInputSchema, type CaptureKind } from '@ritmo/shared';
import { Lightbulb, ListTodo, CalendarPlus, Receipt, StickyNote, Compass, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useCapture } from './api';

const KIND_ICONS: Record<CaptureKind, LucideIcon> = {
  task: ListTodo,
  idea: Lightbulb,
  event: CalendarPlus,
  expense: Receipt,
  note: StickyNote,
  goal: Compass,
};

const PLACEHOLDERS: Record<CaptureKind, string> = {
  task: 'O que precisa ser feito?',
  idea: 'Qual é a ideia?',
  event: 'Qual compromisso? (você define o horário depois)',
  expense: 'Ex.: Mercado 84,50 (você completa depois)',
  note: 'Anote o que quiser guardar',
  goal: 'Qual objetivo você quer alcançar?',
};

interface QuickCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCapture({ open, onOpenChange }: QuickCaptureProps) {
  const [kind, setKind] = useState<CaptureKind>('task');
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const capture = useCapture();

  function reset() {
    setText('');
    setFieldError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createCaptureInputSchema.safeParse({ kind, text });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Escreva algo para capturar');
      return;
    }
    capture.mutate(parsed.data, {
      onSuccess: (result) => {
        toast.success(
          result.destination === 'task'
            ? 'Tarefa criada em “A fazer”'
            : 'Guardado na caixa de entrada para classificar depois',
        );
        reset();
        onOpenChange(false);
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar rápido</DialogTitle>
          <DialogDescription>
            Registre agora, organize depois. Só tarefas viram item imediatamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div role="radiogroup" aria-label="Tipo de captura" className="flex flex-wrap gap-1.5">
            {CAPTURE_KINDS.map((k) => {
              const Icon = KIND_ICONS[k];
              const active = k === kind;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(k)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary/40 bg-primary-soft text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {CAPTURE_KIND_LABELS[k]}
                </button>
              );
            })}
          </div>
          <div>
            <Input
              autoFocus
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFieldError(null);
              }}
              placeholder={PLACEHOLDERS[kind]}
              aria-label="Texto da captura"
              aria-invalid={!!fieldError}
              maxLength={500}
              className="h-10"
            />
            {fieldError ? <p className="mt-1.5 text-xs text-destructive">{fieldError}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={capture.isPending}>
              {capture.isPending ? 'Salvando…' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
