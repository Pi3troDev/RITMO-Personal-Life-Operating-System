import { beforeAll, describe, expect, it } from 'vitest';
import { as, freezeClock, registerUser, TODAY, type TestUser } from './helpers';

// Fuso do usuário: America/Sao_Paulo (UTC-3). 2026-11-16 é segunda-feira.
const at = (day: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return new Date(Date.parse(`${day}T00:00:00Z`) + (h + 3) * 3_600_000 + m * 60_000).toISOString();
};

describe('agenda', () => {
  let user: TestUser;
  let api: ReturnType<typeof as>;

  beforeAll(async () => {
    freezeClock();
    user = await registerUser();
    api = as(user);
  });

  const agenda = async (from: string, to: string) =>
    (await api.get(`/agenda?from=${from}&to=${to}`).expect(200)).body as Array<{
      id: string;
      kind: string;
      title: string;
      start: string;
      end: string;
      status: string;
      conflict: boolean;
      recurring: boolean;
      refId: string;
    }>;

  it('compromisso simples aparece só no seu dia', async () => {
    const ev = (
      await api
        .post('/events', {
          title: 'Dentista',
          start: at('2026-11-20', '10:00'),
          end: at('2026-11-20', '11:00'),
          location: 'Centro',
        })
        .expect(201)
    ).body;
    expect(ev).toMatchObject({
      title: 'Dentista',
      status: 'scheduled',
      allDay: false,
      recurrence: null,
      location: 'Centro',
    });
    expect((await agenda('2026-11-20', '2026-11-20')).map((i) => i.title)).toContain('Dentista');
    expect((await agenda('2026-11-19', '2026-11-19')).map((i) => i.title)).not.toContain(
      'Dentista',
    );
  });

  it('rejeita término antes do início e recorrência inválida', async () => {
    const res = await api
      .post('/events', { title: 'x', start: at(TODAY, '10:00'), end: at(TODAY, '09:00') })
      .expect(400);
    expect(res.body.error.message).toBe('O término precisa ser depois do início');
    await api
      .post('/events', {
        title: 'x',
        start: at(TODAY, '10:00'),
        end: at(TODAY, '11:00'),
        recurrence: 'FREQ=QUASE',
      })
      .expect(400);
  });

  it('série semanal é expandida na leitura, no horário local certo', async () => {
    const u = await registerUser();
    const x = as(u);
    await x
      .post('/events', {
        title: 'Aula',
        start: at('2026-11-16', '19:00'),
        end: at('2026-11-16', '20:30'),
        recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE',
      })
      .expect(201);
    const items = (await x.get('/agenda?from=2026-11-16&to=2026-11-30')).body as Array<{
      title: string;
      start: string;
      end: string;
      recurring: boolean;
    }>;
    expect(items.map((i) => i.start)).toEqual([
      at('2026-11-16', '19:00'),
      at('2026-11-18', '19:00'),
      at('2026-11-23', '19:00'),
      at('2026-11-25', '19:00'),
      at('2026-11-30', '19:00'),
    ]);
    expect(
      items.every(
        (i) =>
          i.recurring && new Date(i.end).getTime() - new Date(i.start).getTime() === 90 * 60_000,
      ),
    ).toBe(true);
  });

  it('não gera ocorrências antes do início da série', async () => {
    const u = await registerUser();
    const x = as(u);
    await x.post('/events', {
      title: 'Futuro',
      start: at('2026-12-07', '09:00'),
      end: at('2026-12-07', '10:00'),
      recurrence: 'FREQ=DAILY',
    });
    expect(((await x.get('/agenda?from=2026-11-01&to=2026-12-06')).body as unknown[]).length).toBe(
      0,
    );
    expect(((await x.get('/agenda?from=2026-12-07&to=2026-12-08')).body as unknown[]).length).toBe(
      2,
    );
  });

  it('cancelar uma ocorrência isolada não afeta o resto da série', async () => {
    const u = await registerUser();
    const x = as(u);
    const ev = (
      await x.post('/events', {
        title: 'Standup',
        start: at('2026-11-16', '09:00'),
        end: at('2026-11-16', '09:15'),
        recurrence: 'FREQ=DAILY',
      })
    ).body;
    await x.put(`/events/${ev.id}/occurrences/2026-11-18`, { status: 'cancelled' }).expect(200);
    const items = (await x.get('/agenda?from=2026-11-17&to=2026-11-19')).body as Array<{
      status: string;
    }>;
    expect(items.map((i) => i.status)).toEqual(['scheduled', 'cancelled', 'scheduled']);

    // desfazer
    await x.put(`/events/${ev.id}/occurrences/2026-11-18`, { status: 'scheduled' }).expect(200);
    expect(
      ((await x.get('/agenda?from=2026-11-18&to=2026-11-18')).body as Array<{ status: string }>)[0]!
        .status,
    ).toBe('scheduled');

    // compromisso sem recorrência não aceita exceção
    const single = (
      await x.post('/events', {
        title: 'Único',
        start: at('2026-11-20', '09:00'),
        end: at('2026-11-20', '10:00'),
      })
    ).body;
    await x.put(`/events/${single.id}/occurrences/2026-11-20`, { status: 'cancelled' }).expect(400);
  });

  it('editar o horário de uma série muda todas as ocorrências e mantém o primeiro dia', async () => {
    const u = await registerUser();
    const x = as(u);
    const ev = (
      await x.post('/events', {
        title: 'Yoga',
        start: at('2026-11-16', '07:00'),
        end: at('2026-11-16', '08:00'),
        recurrence: 'FREQ=DAILY',
      })
    ).body;
    // o usuário arrasta a ocorrência de quarta (18) para 08:30–09:30
    const edited = (
      await x.patch(`/events/${ev.id}`, {
        start: at('2026-11-18', '08:30'),
        end: at('2026-11-18', '09:30'),
      })
    ).body;
    expect(edited.start).toBe(at('2026-11-16', '08:30'));
    expect(edited.end).toBe(at('2026-11-16', '09:30'));
    const items = (await x.get('/agenda?from=2026-11-16&to=2026-11-17')).body as Array<{
      start: string;
    }>;
    expect(items.map((i) => i.start)).toEqual([
      at('2026-11-16', '08:30'),
      at('2026-11-17', '08:30'),
    ]);
  });

  it('detecta conflitos entre compromissos e tarefas com bloco, ignorando cancelados', async () => {
    const u = await registerUser();
    const x = as(u);
    await x.post('/events', {
      title: 'Reunião A',
      start: at('2026-11-18', '10:00'),
      end: at('2026-11-18', '11:00'),
    });
    await x.post('/events', {
      title: 'Reunião B',
      start: at('2026-11-18', '10:30'),
      end: at('2026-11-18', '11:30'),
    });
    await x.post('/events', {
      title: 'Almoço',
      start: at('2026-11-18', '12:00'),
      end: at('2026-11-18', '13:00'),
    });
    await x.post('/tasks', {
      title: 'Relatório',
      scheduledStart: at('2026-11-18', '12:30'),
      estimateMinutes: 60,
    });
    const cancelled = (
      await x.post('/events', {
        title: 'Cancelada',
        start: at('2026-11-18', '15:00'),
        end: at('2026-11-18', '16:00'),
      })
    ).body;
    await x.post('/events', {
      title: 'Sobreposta à cancelada',
      start: at('2026-11-18', '15:30'),
      end: at('2026-11-18', '16:30'),
    });
    await x.patch(`/events/${cancelled.id}`, { status: 'cancelled' });

    const byTitle = Object.fromEntries(
      (
        (await x.get('/agenda?from=2026-11-18&to=2026-11-18')).body as Array<{
          title: string;
          conflict: boolean;
        }>
      ).map((i) => [i.title, i.conflict]),
    );
    expect(byTitle).toMatchObject({
      'Reunião A': true,
      'Reunião B': true,
      Almoço: true,
      Relatório: true,
      Cancelada: false,
      'Sobreposta à cancelada': false,
    });
  });

  it('evento que cruza a meia-noite aparece nos dois dias', async () => {
    const u = await registerUser();
    const x = as(u);
    await x.post('/events', {
      title: 'Plantão',
      start: at('2026-11-18', '22:00'),
      end: at('2026-11-19', '06:00'),
    });
    expect(((await x.get('/agenda?from=2026-11-18&to=2026-11-18')).body as unknown[]).length).toBe(
      1,
    );
    expect(((await x.get('/agenda?from=2026-11-19&to=2026-11-19')).body as unknown[]).length).toBe(
      1,
    );
    expect(((await x.get('/agenda?from=2026-11-20&to=2026-11-20')).body as unknown[]).length).toBe(
      0,
    );
  });

  it('tarefa com bloco aparece como tarefa na agenda; período inválido é 400', async () => {
    const u = await registerUser();
    const x = as(u);
    const t = (
      await x.post('/tasks', {
        title: 'Escrever',
        scheduledStart: at('2026-11-18', '14:00'),
        estimateMinutes: 45,
      })
    ).body;
    const [item] = (await x.get('/agenda?from=2026-11-18&to=2026-11-18')).body as Array<{
      kind: string;
      refId: string;
      start: string;
      end: string;
    }>;
    expect(item).toMatchObject({
      kind: 'task',
      refId: t.id,
      start: at('2026-11-18', '14:00'),
      end: at('2026-11-18', '14:45'),
    });
    await x.get('/agenda?from=2026-11-20&to=2026-11-18').expect(400);
    await x.get('/agenda?from=ontem&to=hoje').expect(400);
  });
});
