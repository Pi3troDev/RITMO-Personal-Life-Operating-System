import { apiErrorSchema } from '@ritmo/shared';
import { z } from 'zod';
import { successStatus, type AnyRoute } from './route';

type Json = Record<string, unknown>;

function toSchema(schema: z.ZodType, io: 'input' | 'output'): Json {
  const json = z.toJSONSchema(schema, {
    io,
    unrepresentable: 'any',
    target: 'draft-2020-12',
  }) as Json;
  delete json.$schema;
  return json;
}

/** `/tasks/:id` → `/tasks/{id}` */
const openApiPath = (path: string) => path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

function parametersOf(schema: z.ZodType | undefined, where: 'path' | 'query') {
  if (!schema) return [];
  const json = toSchema(schema, 'input');
  const properties = (json.properties ?? {}) as Record<string, Json>;
  const required = new Set((json.required ?? []) as string[]);
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: where,
    required: where === 'path' ? true : required.has(name),
    description: typeof property.description === 'string' ? property.description : undefined,
    schema: property,
  }));
}

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
});

const TAG_DESCRIPTIONS: Record<string, string> = {
  Autenticação:
    'Cadastro, login, renovação de sessão (refresh rotativo em cookie httpOnly) e logout.',
  Conta: 'Perfil do usuário, preferências, módulos ativos e senha.',
  Áreas: 'Áreas da vida (Trabalho, Estudos, Inglês…) usadas por todos os módulos.',
  Tarefas: 'Tarefas, checklist, recorrência e visões (hoje, próximas, atrasadas, concluídas).',
  Quadros: 'Quadros Kanban e colunas. O status da tarefa é a categoria da coluna em que ela está.',
  Projetos: 'Projetos e o progresso calculado a partir das suas tarefas.',
  Agenda: 'Compromissos, ocorrências de séries recorrentes e a visão agregada da agenda.',
  'Meu Dia': 'Visão do dia, foco (até 3 prioridades) e reflexão diária.',
  Captura: 'Captura rápida e caixa de entrada.',
  Hábitos: 'Hábitos, check-ins e estatísticas (sequência sem punição).',
  Objetivos: 'Objetivos, marcos, métricas, histórico de progresso e Visão do ano.',
  Estudos:
    'Trilhas e cursos, módulos, aulas, materiais e o resumo de estudo da semana. As sessões são registros de tempo (kind=study).',
  'Dev Space': 'Projetos de desenvolvimento com roadmap, e desafios de programação.',
  Inglês: 'Vocabulário (palavras e frases) e o resumo da prática por habilidade.',
  Leitura: 'Biblioteca, progresso, registros de leitura e citações.',
  Saúde: 'Divisões de treino, treinos e caminhadas registrados e frequência semanal.',
  Espiritualidade: 'Devocional diário, leitura bíblica, pedidos e registros de oração.',
  'Metas semanais': 'Uma meta por módulo, com o progresso calculado dos registros da semana.',
  Anotações: 'Anotações livres por módulo: ideias, reflexões, anotações de leitura.',
  Finanças: 'Contas, reservas, categorias, movimentações, orçamento e visão geral.',
  Tempo: 'Registro de tempo: cronômetro e lançamentos manuais.',
  Revisões: 'Revisões semanal e mensal, com métricas calculadas do período.',
  Insights: 'Insights determinísticos, calculados sob demanda a partir dos dados reais.',
  Relatórios: 'Distribuição de tempo e evolução.',
  Notificações: 'Central de notificações, preferências e inscrições de web push.',
  Dados: 'Exportação dos dados do usuário.',
  Sistema: 'Saúde do serviço.',
};

export function buildOpenApi(
  routes: AnyRoute[],
  info: { version: string; serverUrl: string },
): Json {
  const paths: Record<string, Record<string, Json>> = {};
  const tags = new Set<string>();

  for (const def of routes) {
    tags.add(def.tag);
    const status = successStatus(def);
    const operation: Json = {
      tags: [def.tag],
      summary: def.summary,
      description: def.description,
      operationId: `${def.method}_${def.path.replace(/[/:]+/g, '_').replace(/^_|_$/g, '')}`,
      parameters: [...parametersOf(def.params, 'path'), ...parametersOf(def.query, 'query')],
    };

    if (def.body) {
      operation.requestBody = {
        required: true,
        content: { 'application/json': { schema: toSchema(def.body, 'input') } },
      };
    }

    const responses: Record<string, Json> = {};
    if (def.response && status !== 204) {
      responses[String(status)] = {
        description: 'Sucesso',
        content: { 'application/json': { schema: toSchema(def.response, 'output') } },
      };
    } else {
      responses[String(status)] = { description: 'Sem conteúdo' };
    }
    if (def.body || def.query || def.params) responses['400'] = errorResponse('Dados inválidos');
    if (def.auth !== false) {
      operation.security = [{ bearerAuth: [] }];
      responses['401'] = errorResponse('Sessão ausente ou expirada');
    }
    if (def.path.includes(':'))
      responses['404'] = errorResponse('Não encontrado (ou de outro usuário)');
    if (def.limited) responses['429'] = errorResponse('Muitas tentativas');
    operation.responses = responses;

    const key = openApiPath(def.path);
    (paths[key] ??= {})[def.method] = operation;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'RITMO API',
      version: info.version,
      description: [
        'API do **RITMO — Personal Life Operating System**.',
        '',
        '**Autenticação.** `POST /auth/login` (ou `/auth/register`) devolve um `accessToken` JWT de 15 minutos: ',
        'envie-o em `Authorization: Bearer <token>`. O refresh token viaja em um cookie `httpOnly` e é trocado por ',
        '`POST /auth/refresh` (rotativo; o reuso de um token já trocado revoga a sessão). No botão **Authorize** ',
        'cole apenas o `accessToken`.',
        '',
        '**Convenções.** Datas em ISO 8601 UTC; dias como `YYYY-MM-DD` no fuso do usuário; dinheiro em centavos ',
        'inteiros; erros no formato `{ "error": { "code", "message", "details?" } }`. Recurso de outro usuário ',
        'responde `404`, nunca `403`.',
      ].join('\n'),
    },
    servers: [{ url: info.serverUrl }],
    tags: [...tags].map((name) => ({ name, description: TAG_DESCRIPTIONS[name] })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: { ApiError: toSchema(apiErrorSchema, 'output') },
    },
  };
}
