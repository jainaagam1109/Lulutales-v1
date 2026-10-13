import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { trackInitialAuthViewed, trackLanded } from "./lib/visitorTrack";

trackLanded();
trackInitialAuthViewed();

createRoot(document.getElementById("root")!).render(<App />);
