import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initFaviconAdapter } from "./lib/favicon";

// Initialize adaptive background-removed favicon
initFaviconAdapter();

createRoot(document.getElementById("root")!).render(
  <App />
);
