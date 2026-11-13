import { z } from 'zod';
import { idSchema } from './common';

/** Colour tokens of the design system reserved for life areas (`--area-*`). */
export const AREA_COLORS = [
  'trabalho',
  'estudos',
  'programacao',
  'ingles',
  'academia',
  'espiritualidade',
  'leitura',
  'pessoal',
  'outros',
] as const;
export const areaColorSchema = z.enum(AREA_COLORS);
export type AreaColor = z.infer<typeof areaColorSchema>;

export const areaSchema = z.object({
  id: idSchema,
  name: z.string(),
  color: areaColorSchema,
  /** Lucide icon name in kebab-case, e.g. `graduation-cap`. */
  icon: z.string(),
  position: z.number().int(),
  archived: z.boolean(),
});
export type Area = z.infer<typeof areaSchema>;

/** Areas created for every new user. */
export const DEFAULT_AREAS: ReadonlyArray<Pick<Area, 'name' | 'color' | 'icon'>> = [
  { name: 'Trabalho', color: 'trabalho', icon: 'briefcase' },
  { name: 'Estudos', color: 'estudos', icon: 'graduation-cap' },
  { name: 'Programação', color: 'programacao', icon: 'code' },
  { name: 'Inglês', color: 'ingles', icon: 'languages' },
  { name: 'Academia', color: 'academia', icon: 'dumbbell' },
  { name: 'Espiritualidade', color: 'espiritualidade', icon: 'book-heart' },
  { name: 'Leitura', color: 'leitura', icon: 'book-open' },
  { name: 'Pessoal', color: 'pessoal', icon: 'user' },
  { name: 'Outros', color: 'outros', icon: 'shapes' },
];
