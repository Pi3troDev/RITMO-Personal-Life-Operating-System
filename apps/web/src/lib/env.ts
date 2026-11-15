/**
 * Modo demonstração: a API é simulada no navegador (MSW) com dados de exemplo, sem backend.
 * Só liga explicitamente — `npm run dev:demo -w @ritmo/web` — e nunca entra em um build de produção.
 * O padrão é falar com a API real (`apps/api`), via proxy do Vite em `/api`.
 */
export const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO === 'true';
