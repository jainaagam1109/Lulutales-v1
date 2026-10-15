/** Removes the welcome-page copy that ships inside index.html (see scripts/prerender-welcome.ts). */
export const removePrerender = () => {
  if (typeof document === "undefined") return;
  document.getElementById("lt-prerender")?.remove();
};
