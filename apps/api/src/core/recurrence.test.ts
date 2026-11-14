import { describe, expect, it } from 'vitest';
import { isValidRule, nextOccurrence, occurrenceDays, parseRule } from './recurrence';

describe('parseRule', () => {
  it('aceita as regras suportadas', () => {
    expect(parseRule('FREQ=DAILY')).toMatchObject({ freq: 'DAILY', interval: 1 });
    expect(parseRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')?.byDay).toEqual([1, 3, 5]);
    expect(parseRule('RRULE:FREQ=MONTHLY;BYMONTHDAY=15;INTERVAL=2')).toMatchObject({
      byMonthDay: 15,
      interval: 2,
    });
    expect(parseRule('FREQ=DAILY;UNTIL=20261231T000000Z')?.until).toBe('2026-12-31');
  });

  it('rejeita regras inválidas ou fora do suporte', () => {
    for (const bad of [
      '',
      'FREQ=HOURLY',
      'FREQ=DAILY;BYDAY=MO',
      'FREQ=WEEKLY;BYDAY=XX',
      'FREQ=DAILY;COUNT=2;UNTIL=20261231',
      'FREQ=DAILY;BYSETPOS=1',
      'lixo',
      'FREQ=DAILY;INTERVAL=0',
    ]) {
      expect(isValidRule(bad), bad).toBe(false);
    }
  });
});

describe('occurrenceDays', () => {
  it('diária: um dia sim, outro não com INTERVAL=2', () => {
    expect(
      occurrenceDays('FREQ=DAILY;INTERVAL=2', '2026-11-02', '2026-11-02', '2026-11-09'),
    ).toEqual(['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-08']);
  });

  it('semanal com BYDAY (dias úteis)', () => {
    // 2026-11-16 é segunda-feira
    const days = occurrenceDays(
      'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      '2026-11-16',
      '2026-11-16',
      '2026-11-22',
    );
    expect(days).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']);
  });

  it('semanal sem BYDAY repete no dia da semana do início', () => {
    expect(occurrenceDays('FREQ=WEEKLY', '2026-11-18', '2026-11-01', '2026-12-10')).toEqual([
      '2026-11-18',
      '2026-11-25',
      '2026-12-02',
      '2026-12-09',
    ]);
  });

  it('semanal quinzenal respeita INTERVAL', () => {
    expect(
      occurrenceDays('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO', '2026-11-02', '2026-11-01', '2026-12-31'),
    ).toEqual(['2026-11-02', '2026-11-16', '2026-11-30', '2026-12-14', '2026-12-28']);
  });

  it('mensal pula meses sem o dia (dia 31)', () => {
    expect(occurrenceDays('FREQ=MONTHLY', '2026-01-31', '2026-01-01', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-03-31',
      '2026-05-31',
    ]);
  });

  it('anual', () => {
    expect(occurrenceDays('FREQ=YEARLY', '2024-02-29', '2024-01-01', '2029-01-01')).toEqual([
      '2024-02-29',
      '2028-02-29',
    ]);
  });

  it('COUNT conta desde o início da série, mesmo consultando uma janela posterior', () => {
    expect(occurrenceDays('FREQ=DAILY;COUNT=3', '2026-11-01', '2026-11-02', '2026-11-30')).toEqual([
      '2026-11-02',
      '2026-11-03',
    ]);
  });

  it('UNTIL é inclusivo', () => {
    expect(
      occurrenceDays('FREQ=DAILY;UNTIL=20261103', '2026-11-01', '2026-11-01', '2026-11-30'),
    ).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('não gera nada antes do início da série', () => {
    expect(occurrenceDays('FREQ=DAILY', '2026-11-10', '2026-11-01', '2026-11-09')).toEqual([]);
  });

  it('a primeira ocorrência vale mesmo fora do BYDAY', () => {
    // 2026-11-18 é quarta; a regra só quer segundas
    expect(
      occurrenceDays('FREQ=WEEKLY;BYDAY=MO', '2026-11-18', '2026-11-18', '2026-11-30'),
    ).toEqual(['2026-11-18', '2026-11-23', '2026-11-30']);
  });
});

describe('nextOccurrence', () => {
  it('devolve a próxima depois da data dada', () => {
    expect(nextOccurrence('FREQ=WEEKLY;BYDAY=MO,WE', '2026-11-18', '2026-11-18')).toBe(
      '2026-11-23',
    );
    expect(nextOccurrence('FREQ=DAILY', '2026-11-18', '2026-11-18')).toBe('2026-11-19');
  });

  it('devolve null quando a série acabou', () => {
    expect(nextOccurrence('FREQ=DAILY;UNTIL=20261118', '2026-11-18', '2026-11-18')).toBeNull();
    expect(nextOccurrence('FREQ=DAILY;COUNT=1', '2026-11-18', '2026-11-18')).toBeNull();
  });
});
