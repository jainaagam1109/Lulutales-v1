import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { trackLanded } from "./lib/visitorTrack";

trackLanded();

createRoot(document.getElementById("root")!).render(<App />);
