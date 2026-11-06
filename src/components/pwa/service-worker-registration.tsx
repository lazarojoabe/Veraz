"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // A aplicação continua funcional mesmo se o navegador bloquear o registro.
      });
    }
  }, []);

  return null;
}
