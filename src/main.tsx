import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ElectionProvider } from "./context/ElectionContext";
import { SettingsProvider } from "./context/SettingsContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <ElectionProvider>
          <App />
        </ElectionProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
