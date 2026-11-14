import { beforeAll, describe, expect, it } from 'vitest';
import { as, freezeClock, registerUser, TODAY } from './helpers';

describe('finanças', () => {
  let x: ReturnType<typeof as>;
  let accounts: { checking: string; wallet: string; reserve: string };
  let cat: { food: string; salary: string; rent: string };

  beforeAll(async () => {
    freezeClock();
    x = as(await registerUser());
    const categories = (await x.get('/finance/categories')).body as Array<{
      id: string;
      name: string;
      kind: string;
    }>;
    const find = (name: string, kind: string) =>
      categories.find((c) => c.name === name && c.kind === kind)!.id;
    cat = {
      food: find('Alimentação', 'expense'),
      salary: find('Salário', 'income'),
      rent: find('Moradia', 'expense'),
    };
    accounts = {
      checking: (
        await x.post('/finance/accounts', {
          name: 'Conta corrente',
          kind: 'checking',
          initialBalanceCents: 100_000,
        })
      ).body.id,
      wallet: (await x.post('/finance/accounts', { name: 'Carteira', kind: 'cash' })).body.id,
      reserve: (await x.post('/finance/accounts', { name: 'Reserva', kind: 'reserve' })).body.id,
    };
  });

  const balances = async () =>
    Object.fromEntries(
      ((await x.get('/finance/accounts')).body as Array<{ id: string; balanceCents: number }>).map(
        (a) => [a.id, a.balanceCents],
      ),
    );

  const tx = (body: object) => x.post('/finance/transactions', body);

  it('receita e despesa movem o saldo da conta', async () => {
    await tx({
      type: 'income',
      description: 'Salário',
      amountCents: 500_000,
      date: TODAY,
      accountId: accounts.checking,
      categoryId: cat.salary,
    }).expect(201);
    await tx({
      type: 'expense',
      description: 'Mercado',
      amountCents: 30_000,
      date: TODAY,
      accountId: accounts.checking,
      categoryId: cat.food,
    }).expect(201);
    expect((await balances())[accounts.checking]).toBe(100_000 + 500_000 - 30_000);
  });

  it('transferência move dinheiro entre contas e NUNCA conta como receita ou despesa', async () => {
    const before = (await x.get(`/finance/overview?month=${TODAY.slice(0, 7)}`)).body;
    await tx({
      type: 'transfer',
      description: 'Aporte na reserva',
      amountCents: 200_000,
      date: TODAY,
      accountId: accounts.checking,
      toAccountId: accounts.reserve,
    }).expect(201);
    const after = (await x.get(`/finance/overview?month=${TODAY.slice(0, 7)}`)).body;

    expect(after.incomeCents).toBe(before.incomeCents);
    expect(after.expenseCents).toBe(before.expenseCents);
    expect(after.expensesByCategory).toEqual(before.expensesByCategory);

    const b = await balances();
    expect(b[accounts.reserve]).toBe(200_000);
    expect(b[accounts.checking]).toBe(570_000 - 200_000);
    // o patrimônio total não mudou, só trocou de bolso: disponível caiu, reservado subiu
    expect(after.reservedCents - before.reservedCents).toBe(200_000);
    expect(after.availableCents - before.availableCents).toBe(-200_000);
  });

  it('reservado × disponível', async () => {
    const o = (await x.get(`/finance/overview?month=${TODAY.slice(0, 7)}`)).body;
    expect(o.reservedCents).toBe(200_000);
    expect(o.availableCents).toBe(370_000);
    expect(o.reservedCents + o.availableCents).toBe(100_000 + 500_000 - 30_000);
  });

  it('resgate (reserva → conta) devolve o dinheiro ao disponível', async () => {
    await tx({
      type: 'transfer',
      description: 'Resgate',
      amountCents: 50_000,
      date: TODAY,
      accountId: accounts.reserve,
      toAccountId: accounts.checking,
    }).expect(201);
    const b = await balances();
    expect(b[accounts.reserve]).toBe(150_000);
    expect(b[accounts.checking]).toBe(370_000 + 50_000);
  });

  it('validações: transferência exige destino diferente; categoria precisa combinar com o tipo; valor positivo', async () => {
    const base = { description: 'x', amountCents: 1000, date: TODAY, accountId: accounts.checking };
    expect((await tx({ ...base, type: 'transfer' })).body.error.message).toBe(
      'Escolha a conta de destino',
    );
    expect(
      (await tx({ ...base, type: 'transfer', toAccountId: accounts.checking })).body.error.message,
    ).toBe('Origem e destino precisam ser contas diferentes');
    expect((await tx({ ...base, type: 'expense', categoryId: cat.salary })).status).toBe(400);
    expect((await tx({ ...base, type: 'income', categoryId: cat.food })).status).toBe(400);
    expect((await tx({ ...base, type: 'expense', amountCents: 0 })).status).toBe(400);
    expect((await tx({ ...base, type: 'expense', amountCents: 10.5 })).status).toBe(400);
    expect((await tx({ ...base, type: 'expense', date: '18/11/2026' })).status).toBe(400);
  });

  it('transferência ignora categoria enviada', async () => {
    const t = (
      await tx({
        type: 'transfer',
        description: 'x',
        amountCents: 1000,
        date: TODAY,
        accountId: accounts.wallet,
        toAccountId: accounts.checking,
        categoryId: cat.food,
      }).expect(201)
    ).body;
    expect(t.categoryId).toBeNull();
    await x.delete(`/finance/transactions/${t.id}`).expect(204);
  });

  it('abertura do mês, 6 meses de histórico e despesas por categoria', async () => {
    const u = as(await registerUser());
    const cats = (await u.get('/finance/categories')).body as Array<{
      id: string;
      name: string;
      kind: string;
    }>;
    const food = cats.find((c) => c.name === 'Alimentação')!.id;
    const acc = (
      await u.post('/finance/accounts', {
        name: 'Conta',
        kind: 'checking',
        initialBalanceCents: 10_000,
      })
    ).body.id;
    await u.post('/finance/transactions', {
      type: 'income',
      description: 'out',
      amountCents: 100_000,
      date: '2026-10-05',
      accountId: acc,
    });
    await u.post('/finance/transactions', {
      type: 'expense',
      description: 'out',
      amountCents: 20_000,
      date: '2026-10-10',
      accountId: acc,
      categoryId: food,
    });
    await u.post('/finance/transactions', {
      type: 'expense',
      description: 'nov1',
      amountCents: 5_000,
      date: '2026-11-02',
      accountId: acc,
      categoryId: food,
    });
    await u.post('/finance/transactions', {
      type: 'expense',
      description: 'nov2',
      amountCents: 7_000,
      date: '2026-11-09',
      accountId: acc,
    });

    const o = (await u.get('/finance/overview?month=2026-11')).body;
    expect(o.openingBalanceCents).toBe(10_000 + 100_000 - 20_000);
    expect(o).toMatchObject({ incomeCents: 0, expenseCents: 12_000 });
    expect(o.expensesByCategory).toEqual([
      { categoryId: null, name: 'Sem categoria', amountCents: 7_000 },
      { categoryId: food, name: 'Alimentação', amountCents: 5_000 },
    ]);
    expect(o.monthly.map((m: { month: string }) => m.month)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    expect(o.monthly[4]).toEqual({ month: '2026-10', incomeCents: 100_000, expenseCents: 20_000 });
  });

  it('orçamento: planejado × realizado e aviso de insight', async () => {
    const u = as(await registerUser());
    const cats = (await u.get('/finance/categories')).body as Array<{
      id: string;
      name: string;
      kind: string;
    }>;
    const food = cats.find((c) => c.name === 'Alimentação')!.id;
    const salary = cats.find((c) => c.name === 'Salário')!.id;
    const acc = (await u.post('/finance/accounts', { name: 'Conta', kind: 'checking' })).body.id;
    await u.post('/finance/transactions', {
      type: 'expense',
      description: 'mercado',
      amountCents: 46_000,
      date: TODAY,
      accountId: acc,
      categoryId: food,
    });

    const overview = (
      await u
        .put('/finance/budgets', { categoryId: food, month: '2026-11', limitCents: 50_000 })
        .expect(200)
    ).body;
    expect(overview.budgets).toEqual([
      { categoryId: food, month: '2026-11', limitCents: 50_000, spentCents: 46_000 },
    ]);
    expect(
      (await u.put('/finance/budgets', { categoryId: salary, month: '2026-11', limitCents: 1 }))
        .status,
    ).toBe(400); // só despesa

    const insights = (await u.get('/insights')).body as Array<{
      kind: string;
      evidence: { percentUsed: number };
    }>;
    const risk = insights.find((i) => i.kind === 'budget_risk')!;
    expect(risk.evidence.percentUsed).toBe(92);

    await u.delete(`/finance/budgets?categoryId=${food}&month=2026-11`).expect(204);
    expect(
      ((await u.get('/finance/overview?month=2026-11')).body.budgets as unknown[]).length,
    ).toBe(0);
  });

  it('contas: nome único, arquivar, e excluir só sem movimentações', async () => {
    expect((await x.post('/finance/accounts', { name: 'Carteira', kind: 'cash' })).status).toBe(
      409,
    );
    expect((await x.delete(`/finance/accounts/${accounts.checking}`)).status).toBe(409);
    const empty = (await x.post('/finance/accounts', { name: 'Vazia', kind: 'cash' })).body;
    await x.delete(`/finance/accounts/${empty.id}`).expect(204);

    await x.patch(`/finance/accounts/${accounts.wallet}`, { archived: true }).expect(200);
    expect(
      ((await x.get('/finance/accounts')).body as Array<{ id: string }>).some(
        (a) => a.id === accounts.wallet,
      ),
    ).toBe(false);
    expect(
      ((await x.get('/finance/accounts?includeArchived=true')).body as Array<{ id: string }>).some(
        (a) => a.id === accounts.wallet,
      ),
    ).toBe(true);
  });

  it('listagem filtra por mês, conta e tipo, da mais recente para a mais antiga', async () => {
    await tx({
      type: 'expense',
      description: 'antiga',
      amountCents: 100,
      date: '2026-09-01',
      accountId: accounts.checking,
    });
    const nov = (await x.get('/finance/transactions?month=2026-11')).body as Array<{
      date: string;
      description: string;
    }>;
    expect(nov.length).toBeGreaterThan(0);
    expect(nov.every((t) => t.date.startsWith('2026-11'))).toBe(true);
    expect(nov.map((t) => t.date)).toEqual([...nov.map((t) => t.date)].sort().reverse());
    expect(((await x.get('/finance/transactions?month=2026-09')).body as unknown[]).length).toBe(1);
    const transfers = (await x.get('/finance/transactions?type=transfer')).body as Array<{
      type: string;
    }>;
    expect(transfers.every((t) => t.type === 'transfer')).toBe(true);
    const reserveOnly = (await x.get(`/finance/transactions?accountId=${accounts.reserve}`))
      .body as unknown[];
    expect(reserveOnly).toHaveLength(2); // aporte + resgate
  });

  it('corrigir uma movimentação reflete nos saldos', async () => {
    const t = (
      await tx({
        type: 'expense',
        description: 'erro de digitação',
        amountCents: 9_999,
        date: TODAY,
        accountId: accounts.checking,
      })
    ).body;
    const before = (await balances())[accounts.checking]!;
    await x.patch(`/finance/transactions/${t.id}`, { amountCents: 1_000 }).expect(200);
    expect((await balances())[accounts.checking]).toBe(before + 8_999);
    await x.delete(`/finance/transactions/${t.id}`).expect(204);
    expect((await balances())[accounts.checking]).toBe(before + 9_999);
  });

  it('projeção da reserva usa o ritmo real de aportes', async () => {
    const u = as(await registerUser());
    const checking = (
      await u.post('/finance/accounts', {
        name: 'Conta',
        kind: 'checking',
        initialBalanceCents: 5_000_000,
      })
    ).body.id;
    const reserve = (await u.post('/finance/accounts', { name: 'Reserva', kind: 'reserve' })).body
      .id;
    const goal = (
      await u.post('/goals', {
        name: 'R$ 10.000',
        category: 'financial',
        targetDate: '2027-01-31',
        linkedAccountId: reserve,
        metric: { kind: 'money', target: 1_000_000, unit: 'R$' },
      })
    ).body;
    expect((await u.get('/finance/projections')).body[0]).toMatchObject({
      goalId: goal.id,
      monthlyPaceCents: 0,
      projectedDate: null,
    });

    for (const date of ['2026-09-10', '2026-10-10', '2026-11-10']) {
      await u.post('/finance/transactions', {
        type: 'transfer',
        description: 'aporte',
        amountCents: 100_000,
        date,
        accountId: checking,
        toAccountId: reserve,
      });
    }
    const [p] = (await u.get('/finance/projections')).body;
    expect(p).toMatchObject({
      balanceCents: 300_000,
      targetCents: 1_000_000,
      monthlyPaceCents: 100_000,
    });
    // faltam 700.000 a 100.000/mês → 7 meses (210 dias) a partir de hoje
    expect(p.projectedDate).toBe('2027-06-16');

    // a data projetada passa da meta → insight de atenção com a evidência
    const insights = (await u.get('/insights')).body as Array<{
      kind: string;
      evidence: { projectedDate: string };
    }>;
    expect(insights.find((i) => i.kind === 'reserve_projection')?.evidence.projectedDate).toBe(
      '2027-06-16',
    );
  });
});
