/** Relógio injetável: os testes fixam o "agora" para validar regras que dependem do dia. */
let override: (() => Date) | null = null;

export const clock = {
  now: (): Date => (override ? override() : new Date()),
  /** Só para testes. Passe `null` para voltar ao relógio real. */
  set(fn: (() => Date) | null) {
    override = fn;
  },
};
