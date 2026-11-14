import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema } from './common';

/** Estados de aula e de nó de roadmap: não iniciado / estudando / concluído. */
export const learningStatusSchema = z.enum(['not_started', 'in_progress', 'done']);
export type LearningStatus = z.infer<typeof learningStatusSchema>;

export const resourceTypeSchema = z.enum([
  'link',
  'video',
  'article',
  'documentation',
  'book',
  'file',
  'other',
]);
export type ResourceType = z.infer<typeof resourceTypeSchema>;

export const noteScopeSchema = z.enum([
  'general',
  'dev',
  'study',
  'english',
  'reading',
  'health',
  'spiritual',
]);
export type NoteScope = z.infer<typeof noteScopeSchema>;

// ---- Estudos ---------------------------------------------------------------------------------

export const studyTrackKindSchema = z.enum(['track', 'course']);
export const studyTrackStatusSchema = z.enum(['not_started', 'in_progress', 'paused', 'completed']);
export type StudyTrackStatus = z.infer<typeof studyTrackStatusSchema>;

export const studyTrackSchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: studyTrackKindSchema,
  status: studyTrackStatusSchema,
  description: z.string().nullable(),
  provider: z.string().nullable(),
  url: z.string().nullable(),
  areaId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  weeklyTargetMinutes: z.number().int().positive().nullable(),
  startedAt: dateSchema.nullable(),
  completedAt: dateTimeSchema.nullable(),
  lessonsTotal: z.number().int(),
  lessonsDone: z.number().int(),
  /** 0–100: aulas concluídas ÷ aulas da trilha. */
  progress: z.number().min(0).max(100),
  minutesStudied: z.number().int(),
  minutesThisWeek: z.number().int(),
  createdAt: dateTimeSchema,
});
export type StudyTrack = z.infer<typeof studyTrackSchema>;

export const createStudyTrackInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome à trilha').max(120),
  kind: studyTrackKindSchema.optional(),
  description: z.string().max(5000).nullish(),
  provider: z.string().trim().max(80).nullish(),
  url: z.url().max(500).nullish(),
  areaId: idSchema.nullish(),
  goalId: idSchema.nullish(),
  weeklyTargetMinutes: z
    .number()
    .int()
    .positive()
    .max(7 * 24 * 60)
    .nullish(),
});
export type CreateStudyTrackInput = z.infer<typeof createStudyTrackInputSchema>;

export const updateStudyTrackInputSchema = createStudyTrackInputSchema.partial().extend({
  status: studyTrackStatusSchema.optional(),
});
export type UpdateStudyTrackInput = z.infer<typeof updateStudyTrackInputSchema>;

export const studyModuleSchema = z.object({
  id: idSchema,
  trackId: idSchema,
  name: z.string(),
  position: z.number(),
});
export type StudyModule = z.infer<typeof studyModuleSchema>;

export const createStudyModuleInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao módulo').max(120),
});
export const updateStudyModuleInputSchema = createStudyModuleInputSchema
  .partial()
  .extend({ position: z.number().optional() });

export const lessonSchema = z.object({
  id: idSchema,
  trackId: idSchema,
  moduleId: idSchema.nullable(),
  title: z.string(),
  status: learningStatusSchema,
  durationMinutes: z.number().int().positive().nullable(),
  notes: z.string().nullable(),
  position: z.number(),
  completedAt: dateTimeSchema.nullable(),
});
export type Lesson = z.infer<typeof lessonSchema>;

export const createLessonInputSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título à aula').max(200),
  moduleId: idSchema.nullish(),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .nullish(),
  notes: z.string().max(5000).nullish(),
});
export const updateLessonInputSchema = createLessonInputSchema.partial().extend({
  status: learningStatusSchema.optional(),
  position: z.number().optional(),
});

export const resourceSchema = z.object({
  id: idSchema,
  trackId: idSchema.nullable(),
  title: z.string(),
  type: resourceTypeSchema,
  url: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: dateTimeSchema,
});
export type Resource = z.infer<typeof resourceSchema>;

export const createResourceInputSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título ao material').max(200),
  type: resourceTypeSchema.optional(),
  url: z.url().max(500).nullish(),
  notes: z.string().max(5000).nullish(),
});
export const updateResourceInputSchema = createResourceInputSchema.partial();

export const studyTrackDetailSchema = studyTrackSchema.extend({
  modules: z.array(studyModuleSchema),
  lessons: z.array(lessonSchema),
  resources: z.array(resourceSchema),
});
export type StudyTrackDetail = z.infer<typeof studyTrackDetailSchema>;

// ---- Dev Space --------------------------------------------------------------------------------

export const devProjectStatusSchema = z.enum(['idea', 'planned', 'active', 'paused', 'completed']);

export const roadmapNodeSchema = z.object({
  id: idSchema,
  devProjectId: idSchema,
  parentId: idSchema.nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: learningStatusSchema,
  position: z.number(),
});
export type RoadmapNode = z.infer<typeof roadmapNodeSchema>;

export const devProjectSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  status: devProjectStatusSchema,
  repoUrl: z.string().nullable(),
  demoUrl: z.string().nullable(),
  stack: z.array(z.string()),
  areaId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  roadmapTotal: z.number().int(),
  roadmapDone: z.number().int(),
  /** 0–100: nós do roadmap concluídos ÷ total. */
  progress: z.number().min(0).max(100),
  createdAt: dateTimeSchema,
});
export type DevProject = z.infer<typeof devProjectSchema>;

export const createDevProjectInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao projeto').max(120),
  description: z.string().max(5000).nullish(),
  status: devProjectStatusSchema.optional(),
  repoUrl: z.url().max(500).nullish(),
  demoUrl: z.url().max(500).nullish(),
  stack: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  areaId: idSchema.nullish(),
  goalId: idSchema.nullish(),
});
export const updateDevProjectInputSchema = createDevProjectInputSchema.partial();

export const devProjectDetailSchema = devProjectSchema.extend({
  roadmap: z.array(roadmapNodeSchema),
});
export type DevProjectDetail = z.infer<typeof devProjectDetailSchema>;

export const createRoadmapNodeInputSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título ao item').max(200),
  description: z.string().max(5000).nullish(),
  parentId: idSchema.nullish(),
});
export const updateRoadmapNodeInputSchema = createRoadmapNodeInputSchema.partial().extend({
  status: learningStatusSchema.optional(),
  position: z.number().optional(),
});

export const challengeDifficultySchema = z.enum(['easy', 'medium', 'hard']);
export const challengeStatusSchema = z.enum(['todo', 'in_progress', 'solved', 'abandoned']);

export const challengeSchema = z.object({
  id: idSchema,
  title: z.string(),
  platform: z.string().nullable(),
  url: z.string().nullable(),
  difficulty: challengeDifficultySchema,
  status: challengeStatusSchema,
  notes: z.string().nullable(),
  solvedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
});
export type Challenge = z.infer<typeof challengeSchema>;

export const createChallengeInputSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título ao desafio').max(200),
  platform: z.string().trim().max(60).nullish(),
  url: z.url().max(500).nullish(),
  difficulty: challengeDifficultySchema.optional(),
  notes: z.string().max(5000).nullish(),
});
export const updateChallengeInputSchema = createChallengeInputSchema.partial().extend({
  status: challengeStatusSchema.optional(),
});

// ---- Anotações (ideias de dev, reflexões, anotações de leitura…) ------------------------------

export const noteSchema = z.object({
  id: idSchema,
  scope: noteScopeSchema,
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Note = z.infer<typeof noteSchema>;

export const createNoteInputSchema = z.object({
  scope: noteScopeSchema.optional(),
  title: z.string().trim().min(1, 'Dê um título à anotação').max(200),
  body: z.string().max(20000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});
export const updateNoteInputSchema = createNoteInputSchema.partial();

// ---- Inglês -----------------------------------------------------------------------------------

export const vocabularyKindSchema = z.enum(['word', 'phrase']);
export const vocabularyStatusSchema = z.enum(['new', 'learning', 'mastered']);

export const vocabularyItemSchema = z.object({
  id: idSchema,
  kind: vocabularyKindSchema,
  term: z.string(),
  meaning: z.string(),
  example: z.string().nullable(),
  status: vocabularyStatusSchema,
  tags: z.array(z.string()),
  reviewCount: z.number().int(),
  lastReviewedAt: dateTimeSchema.nullable(),
  /** Reservado para a revisão espaçada (fora da primeira versão): hoje nunca é preenchido. */
  nextReviewAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
});
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

export const createVocabularyInputSchema = z.object({
  kind: vocabularyKindSchema.optional(),
  term: z.string().trim().min(1, 'Informe a palavra ou frase').max(200),
  meaning: z.string().trim().min(1, 'Informe o significado').max(500),
  example: z.string().max(500).nullish(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});
export const updateVocabularyInputSchema = createVocabularyInputSchema.partial().extend({
  status: vocabularyStatusSchema.optional(),
});

export const listVocabularyQuerySchema = z.object({
  kind: vocabularyKindSchema.optional(),
  status: vocabularyStatusSchema.optional(),
  q: z.string().trim().max(100).optional(),
});

export const englishSummarySchema = z.object({
  weekStart: dateSchema,
  minutesBySkill: z.object({
    listening: z.number().int(),
    reading: z.number().int(),
    speaking: z.number().int(),
    writing: z.number().int(),
    untagged: z.number().int(),
  }),
  totalMinutes: z.number().int(),
  practiceDays: z.number().int(),
  weeklyTargetMinutes: z.number().int().nullable(),
  vocabulary: z.object({
    new: z.number().int(),
    learning: z.number().int(),
    mastered: z.number().int(),
  }),
});
export type EnglishSummary = z.infer<typeof englishSummarySchema>;

// ---- Metas por período ------------------------------------------------------------------------

export const targetScopeSchema = z.enum([
  'study',
  'dev',
  'english',
  'reading',
  'health',
  'spiritual',
]);
export type TargetScope = z.infer<typeof targetScopeSchema>;

export const targetMetricSchema = z.enum([
  'time_minutes',
  'workout_sessions',
  'pages_read',
  'bible_chapters',
  'vocabulary_items',
]);
export type TargetMetric = z.infer<typeof targetMetricSchema>;

/** Qual métrica cada módulo aceita como meta semanal. */
export const TARGET_METRICS_BY_SCOPE: Record<TargetScope, readonly TargetMetric[]> = {
  study: ['time_minutes'],
  dev: ['time_minutes'],
  english: ['time_minutes', 'vocabulary_items'],
  reading: ['pages_read', 'time_minutes'],
  health: ['workout_sessions', 'time_minutes'],
  spiritual: ['bible_chapters', 'time_minutes'],
};

export const periodicTargetSchema = z.object({
  scope: targetScopeSchema,
  metric: targetMetricSchema,
  targetValue: z.number().int().positive(),
  /** Quanto já foi feito na semana atual. */
  currentValue: z.number().int().nonnegative(),
  weekStart: dateSchema,
});
export type PeriodicTarget = z.infer<typeof periodicTargetSchema>;

export const setTargetInputSchema = z.object({
  metric: targetMetricSchema,
  targetValue: z.number().int().positive().max(1_000_000),
});
export type SetTargetInput = z.infer<typeof setTargetInputSchema>;

// ---- Leitura ----------------------------------------------------------------------------------

export const bookStatusSchema = z.enum(['want_to_read', 'reading', 'finished', 'paused']);

export const bookSchema = z.object({
  id: idSchema,
  title: z.string(),
  author: z.string().nullable(),
  totalPages: z.number().int().positive().nullable(),
  currentPage: z.number().int().nonnegative(),
  status: bookStatusSchema,
  coverUrl: z.string().nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  startedAt: dateSchema.nullable(),
  finishedAt: dateSchema.nullable(),
  goalId: idSchema.nullable(),
  /** 0–100, ou nulo quando o total de páginas não foi informado. */
  progress: z.number().min(0).max(100).nullable(),
  createdAt: dateTimeSchema,
});
export type Book = z.infer<typeof bookSchema>;

export const createBookInputSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título').max(200),
  author: z.string().trim().max(120).nullish(),
  totalPages: z.number().int().positive().max(20000).nullish(),
  coverUrl: z.url().max(500).nullish(),
  status: bookStatusSchema.optional(),
  goalId: idSchema.nullish(),
});
export const updateBookInputSchema = createBookInputSchema.partial().extend({
  currentPage: z.number().int().nonnegative().optional(),
  rating: z.number().int().min(1).max(5).nullish(),
});

export const readingLogSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  date: dateSchema,
  pagesRead: z.number().int().nonnegative(),
  minutes: z.number().int().positive().nullable(),
  note: z.string().nullable(),
});
export type ReadingLog = z.infer<typeof readingLogSchema>;

export const createReadingLogInputSchema = z
  .object({
    date: dateSchema.optional(),
    /** Quantas páginas foram lidas na sessão. */
    pagesRead: z.number().int().nonnegative().max(2000).optional(),
    /** Alternativa: a página em que parou. Calcula `pagesRead` pela diferença. */
    endPage: z.number().int().positive().max(20000).optional(),
    minutes: z
      .number()
      .int()
      .positive()
      .max(24 * 60)
      .nullish(),
    note: z.string().max(2000).nullish(),
  })
  .refine((v) => v.pagesRead !== undefined || v.endPage !== undefined, {
    message: 'Informe as páginas lidas ou a página em que parou',
    path: ['pagesRead'],
  });

export const bookQuoteSchema = z.object({
  id: idSchema,
  bookId: idSchema,
  text: z.string(),
  page: z.number().int().positive().nullable(),
  note: z.string().nullable(),
  createdAt: dateTimeSchema,
});
export type BookQuote = z.infer<typeof bookQuoteSchema>;

export const createQuoteInputSchema = z.object({
  text: z.string().trim().min(1, 'Escreva a citação').max(2000),
  page: z.number().int().positive().max(20000).nullish(),
  note: z.string().max(2000).nullish(),
});
export const updateQuoteInputSchema = createQuoteInputSchema.partial();

export const readingSummarySchema = z.object({
  weekStart: dateSchema,
  pagesThisWeek: z.number().int(),
  minutesThisWeek: z.number().int(),
  readingDaysThisWeek: z.number().int(),
  booksFinishedThisYear: z.number().int(),
  weeklyTargetPages: z.number().int().nullable(),
});
export type ReadingSummary = z.infer<typeof readingSummarySchema>;

// ---- Saúde ------------------------------------------------------------------------------------

export const workoutTypeSchema = z.enum(['strength', 'walk', 'cardio', 'other']);

export const planExerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().positive().max(50).nullish(),
  reps: z.string().trim().max(20).nullish(),
  restSeconds: z.number().int().nonnegative().max(3600).nullish(),
  notes: z.string().max(500).nullish(),
});
export type PlanExercise = z.infer<typeof planExerciseSchema>;

export const workoutPlanSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  /** Dias da semana em que a divisão acontece: 0 = domingo … 6 = sábado. */
  weekdays: z.array(z.number().int().min(0).max(6)),
  exercises: z.array(planExerciseSchema),
  archived: z.boolean(),
  createdAt: dateTimeSchema,
});
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;

export const createWorkoutPlanInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao treino').max(80),
  description: z.string().max(2000).nullish(),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  exercises: z.array(planExerciseSchema).max(60).optional(),
});
export const updateWorkoutPlanInputSchema = createWorkoutPlanInputSchema
  .partial()
  .extend({ archived: z.boolean().optional() });

export const workoutSetSchema = z.object({
  exercise: z.string().trim().min(1).max(120),
  reps: z.number().int().nonnegative().max(1000).nullish(),
  weightKg: z.number().nonnegative().max(1000).nullish(),
});

export const workoutLogSchema = z.object({
  id: idSchema,
  date: dateSchema,
  type: workoutTypeSchema,
  planId: idSchema.nullable(),
  title: z.string(),
  durationMinutes: z.number().int().positive().nullable(),
  distanceKm: z.number().positive().nullable(),
  effort: z.number().int().min(1).max(10).nullable(),
  notes: z.string().nullable(),
  sets: z.array(workoutSetSchema),
  createdAt: dateTimeSchema,
});
export type WorkoutLog = z.infer<typeof workoutLogSchema>;

export const createWorkoutLogInputSchema = z.object({
  date: dateSchema.optional(),
  type: workoutTypeSchema.optional(),
  planId: idSchema.nullish(),
  /** Padrão: o nome do treino escolhido ou o tipo da atividade. */
  title: z.string().trim().max(120).optional(),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .nullish(),
  distanceKm: z.number().positive().max(1000).nullish(),
  effort: z.number().int().min(1).max(10).nullish(),
  notes: z.string().max(2000).nullish(),
  sets: z.array(workoutSetSchema).max(300).optional(),
});
export const updateWorkoutLogInputSchema = createWorkoutLogInputSchema.partial();

export const workoutFrequencySchema = z.object({
  weeks: z.array(
    z.object({
      start: dateSchema,
      sessions: z.number().int(),
      minutes: z.number().int(),
      distanceKm: z.number(),
      byType: z.record(z.string(), z.number().int()),
    }),
  ),
  weeklyTargetSessions: z.number().int().nullable(),
});
export type WorkoutFrequency = z.infer<typeof workoutFrequencySchema>;

// ---- Espiritualidade ---------------------------------------------------------------------------

export const devotionalSchema = z.object({
  id: idSchema,
  date: dateSchema,
  title: z.string().nullable(),
  passage: z.string().nullable(),
  reflection: z.string(),
  application: z.string().nullable(),
  updatedAt: dateTimeSchema,
});
export type Devotional = z.infer<typeof devotionalSchema>;

export const upsertDevotionalInputSchema = z.object({
  title: z.string().trim().max(200).nullish(),
  passage: z.string().trim().max(200).nullish(),
  reflection: z.string().max(10000),
  application: z.string().max(5000).nullish(),
});

export const bibleReadingSchema = z.object({
  id: idSchema,
  date: dateSchema,
  book: z.string(),
  chapterFrom: z.number().int().positive(),
  chapterTo: z.number().int().positive(),
  chapters: z.number().int().positive(),
  notes: z.string().nullable(),
});
export type BibleReading = z.infer<typeof bibleReadingSchema>;

export const createBibleReadingInputSchema = z
  .object({
    date: dateSchema.optional(),
    book: z.string().trim().min(1, 'Informe o livro').max(60),
    chapterFrom: z.number().int().positive().max(200),
    chapterTo: z.number().int().positive().max(200).optional(),
    notes: z.string().max(2000).nullish(),
  })
  .refine((v) => (v.chapterTo ?? v.chapterFrom) >= v.chapterFrom, {
    message: 'O último capítulo precisa ser maior ou igual ao primeiro',
    path: ['chapterTo'],
  });

export const prayerStatusSchema = z.enum(['active', 'answered', 'archived']);

export const prayerRequestSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: prayerStatusSchema,
  answeredAt: dateTimeSchema.nullable(),
  answerNote: z.string().nullable(),
  createdAt: dateTimeSchema,
});
export type PrayerRequest = z.infer<typeof prayerRequestSchema>;

export const createPrayerRequestInputSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título ao pedido').max(200),
  description: z.string().max(5000).nullish(),
});
export const updatePrayerRequestInputSchema = createPrayerRequestInputSchema.partial().extend({
  status: prayerStatusSchema.optional(),
  answerNote: z.string().max(5000).nullish(),
});

export const prayerLogSchema = z.object({
  id: idSchema,
  date: dateSchema,
  minutes: z.number().int().positive().nullable(),
  requestId: idSchema.nullable(),
  notes: z.string().nullable(),
});
export type PrayerLog = z.infer<typeof prayerLogSchema>;

export const createPrayerLogInputSchema = z.object({
  date: dateSchema.optional(),
  minutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .nullish(),
  requestId: idSchema.nullish(),
  notes: z.string().max(2000).nullish(),
});

export const spiritualSummarySchema = z.object({
  weekStart: dateSchema,
  devotionalStreak: z.number().int(),
  devotionalDaysThisWeek: z.number().int(),
  chaptersThisWeek: z.number().int(),
  prayerMinutesThisWeek: z.number().int(),
  activeRequests: z.number().int(),
  answeredRequests: z.number().int(),
  weeklyTargetChapters: z.number().int().nullable(),
});
export type SpiritualSummary = z.infer<typeof spiritualSummarySchema>;
