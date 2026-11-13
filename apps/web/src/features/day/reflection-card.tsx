import { MOOD_LABELS, type Mood, type Reflection, type UpsertReflectionInput } from '@ritmo/shared';
import { NotebookPen } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useSaveReflection } from './api';

const QUESTIONS: { key: keyof Omit<UpsertReflectionInput, 'mood'>; label: string }[] = [
  { key: 'accomplished', label: 'O que consegui fazer?' },
  { key: 'pending', label: 'O que ficou pendente?' },
  { key: 'learned', label: 'O que aprendi?' },
  { key: 'improve', label: 'O que posso melhorar amanhã?' },
];

const EMPTY: UpsertReflectionInput = { accomplished: '', pending: '', learned: '', improve: '', mood: null };

export function ReflectionCard({ date, reflection }: { date: string; reflection: Reflection | null }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UpsertReflectionInput>(EMPTY);
  const save = useSaveReflection(date);

  function openDialog() {
    setDraft(
      reflection
        ? {
            accomplished: reflection.accomplished,
            pending: reflection.pending,
            learned: reflection.learned,
            improve: reflection.improve,
            mood: reflection.mood,
          }
        : EMPTY,
    );
    setOpen(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    save.mutate(draft, {
      onSuccess: () => {
        setOpen(false);
        toast.success('Reflexão salva');
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <section aria-labelledby="reflection-title" className="surface p-5">
      <h2 id="reflection-title" className="flex items-center gap-2 text-sm font-semibold">
        <NotebookPen className="size-4 text-primary" aria-hidden />
        Reflexão do dia
      </h2>
      {reflection ? (
        <div className="mt-3 space-y-1.5 text-sm">
          {reflection.mood ? (
            <p className="text-muted-foreground">
              Como foi: <span className="text-foreground">{MOOD_LABELS[reflection.mood]}</span>
            </p>
          ) : null}
          {reflection.learned ? <p className="line-clamp-3">{reflection.learned}</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Ao fechar o dia, registre o que aconteceu. Dias difíceis continuam sendo dias válidos.
        </p>
      )}
      <Button variant="outline" size="sm" className="mt-4" onClick={openDialog}>
        {reflection ? 'Editar reflexão' : 'Refletir sobre o dia'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Encerrar o dia</DialogTitle>
            <DialogDescription>Escreva só o que fizer sentido. Nada aqui é nota.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="mb-2 block">Como foi meu dia?</Label>
              <div role="radiogroup" aria-label="Como foi meu dia" className="flex flex-wrap gap-1.5">
                {(Object.keys(MOOD_LABELS) as Mood[]).map((mood) => {
                  const active = draft.mood === mood;
                  return (
                    <button
                      key={mood}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setDraft({ ...draft, mood: active ? null : mood })}
                      className={cn(
                        'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary/40 bg-primary-soft'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {MOOD_LABELS[mood]}
                    </button>
                  );
                })}
              </div>
            </div>
            {QUESTIONS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`reflection-${key}`}>{label}</Label>
                <Textarea
                  id={`reflection-${key}`}
                  rows={2}
                  value={draft[key]}
                  maxLength={4000}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Salvando…' : 'Salvar reflexão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
