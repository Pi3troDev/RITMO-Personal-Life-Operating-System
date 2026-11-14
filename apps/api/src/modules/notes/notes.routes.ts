import {
  createNoteInputSchema,
  noteSchema,
  noteScopeSchema,
  updateNoteInputSchema,
  type Note as NoteDto,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { crudRoutes, defined } from '../../core/http/crud';
import type { AnyRoute } from '../../core/http/route';
import type { Note } from '../../generated/prisma/client';

const toNoteDto = (n: Note): NoteDto => ({
  id: n.id,
  scope: n.scope,
  title: n.title,
  body: n.body,
  tags: (n.tags as string[] | null) ?? [],
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
});

/** Anotações livres: ideias de projetos, reflexões, anotações de leitura. */
export function notesRoutes({ db }: Deps): AnyRoute[] {
  return crudRoutes({
    db,
    tag: 'Anotações',
    path: '/notes',
    names: ['anotação', 'anotações'],
    model: 'note',
    response: noteSchema,
    create: createNoteInputSchema,
    update: updateNoteInputSchema,
    query: z.object({
      scope: noteScopeSchema.optional(),
      q: z.string().trim().max(100).optional(),
    }),
    where: (q: { scope?: string; q?: string }) => ({
      ...(q.scope ? { scope: q.scope } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q } }, { body: { contains: q.q } }] } : {}),
    }),
    orderBy: { createdAt: 'desc' },
    toDto: (row: Note) => toNoteDto(row),
    toCreate: (input: z.infer<typeof createNoteInputSchema>) => ({
      scope: input.scope ?? 'general',
      title: input.title,
      body: input.body ?? '',
      tags: input.tags ?? [],
    }),
    toUpdate: (input: z.infer<typeof updateNoteInputSchema>) => defined(input),
  });
}
