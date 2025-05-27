import { getCurrentWebview } from "@tauri-apps/api/webview";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { getWindowScale } from "./utils/configUtils";

(async () => {
  await getCurrentWebview().setZoom(getWindowScale())
})()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
