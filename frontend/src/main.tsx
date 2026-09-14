import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./theme.css";

function LiquidBG() {
  return (
    <div className="liquid-bg">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LiquidBG />
    <App />
  </React.StrictMode>
);
