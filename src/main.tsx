import { createRoot } from "react-dom/client";
import App from "./App.tsx";
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

createRoot(document.getElementById("root")!).render(<App />);
