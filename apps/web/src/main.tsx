import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './app/App';
import { DEMO_MODE } from './lib/env';

async function bootstrap() {
  // `import.meta.env.DEV` is repeated so the bundler can drop the whole demo layer from builds.
  if (import.meta.env.DEV && DEMO_MODE) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ quiet: true });
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
