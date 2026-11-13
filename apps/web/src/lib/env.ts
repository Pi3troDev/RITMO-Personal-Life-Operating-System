/**
 * Demo mode answers `/api` in the browser with sample data so the interface can be reviewed
 * before the backend exists. It is on in development unless `VITE_DEMO=false`, and never in a
 * production build.
 */
export const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_DEMO !== 'false';
