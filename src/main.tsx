import { removePrerender } from "./lib/prerender";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { trackInitialAuthViewed, trackLanded } from "./lib/visitorTrack";

trackLanded();
trackInitialAuthViewed();

// The welcome-page copy shipped in index.html is only for visitors who are signed out on "/".
if (document.documentElement.classList.contains("lt-no-pre")) removePrerender();

createRoot(document.getElementById("root")!).render(<App />);
