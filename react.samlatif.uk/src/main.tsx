import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { loadCvDataFromCraftfolio } from "./data/cv";

async function bootstrap() {
  await loadCvDataFromCraftfolio();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
