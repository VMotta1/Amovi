
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AuthProvider } from "./app/providers/AuthProvider";
import { I18nProvider } from "./app/providers/I18nProvider";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <I18nProvider>
      <App />
    </I18nProvider>
  </AuthProvider>,
);
  
