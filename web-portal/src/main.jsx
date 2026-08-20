import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const originalFetch = window.fetch;
window.fetch = function (url, options) {
  options = options || {};
  if (typeof url === "string" && (url.includes("/api") || !url.startsWith("http"))) {
    options.credentials = "include";
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
