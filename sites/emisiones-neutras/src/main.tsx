import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

/**
 * Placeholder de arranque.
 *
 * El sitio todavía no tiene contenido: falta confirmar qué proyectos se publican
 * (ver README). Esta pantalla existe para que el scaffold compile y se pueda
 * levantar `npm run dev` mientras tanto — se reemplaza entera al construir el sitio.
 */
function Placeholder() {
  return (
    <main className="mx-auto flex min-h-screen max-w-content flex-col justify-center gap-4 px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-nopal-600">
        Sitio en construcción
      </p>
      <h1 className="max-w-[18ch] text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl">
        Emisiones Neutras
      </h1>
      <p className="max-w-[60ch] text-lg text-nopal-800">
        Scaffold listo. El contenido está pendiente de definición — ver{" "}
        <code className="rounded bg-arena-100 px-1.5 py-0.5 font-mono text-base">README.md</code>.
      </p>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró el elemento #root en index.html");

createRoot(root).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>,
);
