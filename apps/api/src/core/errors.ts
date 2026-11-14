/** Erro previsto, com status HTTP e código estável para o cliente. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'VALIDATION', message, details);
export const unauthorized = (message = 'Sua sessão expirou. Entre novamente.') =>
  new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Você não tem permissão para isso.') =>
  new AppError(403, 'FORBIDDEN', message);
/** Recurso inexistente OU de outro usuário: nunca revelamos qual dos dois. */
export const notFound = (message = 'Não encontramos este item.') =>
  new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details);
