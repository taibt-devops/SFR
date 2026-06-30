import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// PWA tự cập nhật: ép kiểm tra service worker mới định kỳ + khi quay lại tab.
// (registerType:autoUpdate sẽ skipWaiting + reload khi có bản mới → khỏi hard-reload tay.)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    const check = () => reg.update().catch(() => {});
    setInterval(check, 60 * 1000); // mỗi phút
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
  });
}
