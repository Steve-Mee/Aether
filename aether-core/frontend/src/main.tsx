import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {
  initErrorReporting,
  installGlobalErrorHandlers,
  installObservabilityProbe,
} from '@/lib/observability/errorReporter';

async function bootstrap() {
  await initErrorReporting();
  installGlobalErrorHandlers();
  installObservabilityProbe();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
