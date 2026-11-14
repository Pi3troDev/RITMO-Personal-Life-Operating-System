import { DEFAULT_AREAS } from '@ritmo/shared';
import type { Prisma } from '../../generated/prisma/client';

export const DEFAULT_COLUMNS = [
  { name: 'Backlog', statusCategory: 'backlog' },
  { name: 'A fazer', statusCategory: 'todo' },
  { name: 'Em andamento', statusCategory: 'in_progress' },
  { name: 'Em revisão', statusCategory: 'in_review' },
  { name: 'Concluído', statusCategory: 'done' },
] as const;

const EXPENSE_CATEGORIES = [
  ['Moradia', 'house'],
  ['Alimentação', 'utensils'],
  ['Transporte', 'car'],
  ['Saúde', 'heart-pulse'],
  ['Educação', 'graduation-cap'],
  ['Lazer', 'popcorn'],
  ['Assinaturas', 'repeat'],
  ['Compras', 'shopping-bag'],
  ['Outros', 'ellipsis'],
] as const;

const INCOME_CATEGORIES = [
  ['Salário', 'briefcase'],
  ['Freelance', 'laptop'],
  ['Rendimentos', 'trending-up'],
  ['Outros', 'plus'],
] as const;

/** Cria tudo que um usuário novo precisa para abrir o app sem tela em branco. */
export async function seedNewUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.userSettings.create({ data: { userId } });

  await tx.area.createMany({
    data: DEFAULT_AREAS.map((area, index) => ({
      userId,
      name: area.name,
      color: area.color,
      icon: area.icon,
      position: index,
    })),
  });

  await tx.board.create({
    data: {
      userId,
      name: 'Meu quadro',
      isDefault: true,
      columns: {
        create: DEFAULT_COLUMNS.map((column, index) => ({
          userId,
          name: column.name,
          statusCategory: column.statusCategory,
          position: (index + 1) * 1000,
        })),
      },
    },
  });

  await tx.financeCategory.createMany({
    data: [
      ...EXPENSE_CATEGORIES.map(([name, icon]) => ({
        userId,
        name,
        icon,
        kind: 'expense' as const,
      })),
      ...INCOME_CATEGORIES.map(([name, icon]) => ({ userId, name, icon, kind: 'income' as const })),
    ],
  });

  await tx.notificationPreference.create({ data: { userId } });
}
