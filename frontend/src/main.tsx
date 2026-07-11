import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initFaviconAdapter } from "./lib/favicon";

// Initialize adaptive background-removed favicon
initFaviconAdapter();

// Handle Vite dynamic import chunk errors (common after deployments)
window.addEventListener('vite:preloadError', () => {
  const hasReloaded = sessionStorage.getItem('vite-reload');
  if (!hasReloaded) {
    sessionStorage.setItem('vite-reload', 'true');
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <App />
);
