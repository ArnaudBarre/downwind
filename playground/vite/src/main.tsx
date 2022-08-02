import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import "virtual:@downwind/base.css";
import "./index.css";

import { App } from "./App";
import "virtual:@downwind/utils.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
