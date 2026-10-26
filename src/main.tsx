import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource-variable/noto-sans-arabic";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations
          .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js") || registration.scope === `${window.location.origin}/`)
          .forEach((registration) => {
            void registration.unregister();
          });
      })
      .catch((error) => console.error("Service worker cleanup failed:", error));
  });
}

const rootElement = document.getElementById("root");
if (rootElement) createRoot(rootElement).render(<App />);
