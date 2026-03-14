import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// CLOCK SKEW FIX: Add 5 seconds to local time to prevent "Session issued in the future" error
const originalDateNow = Date.now;
Date.now = () => originalDateNow() + 5000;

import './index.css'
import App from './App.jsx'
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
