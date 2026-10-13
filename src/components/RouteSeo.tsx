import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_TITLE = "LuluTales – Personalised Audio Stories for Kids, in English & Hindi";

/** Pages that search engines may list. Everything else is the signed-in app. */
const isPublic = (path: string) => path === "/" || path === "/welcome" || path === "/privacy" || path === "/terms";

const titleFor = (path: string): string | null => {
  if (path.startsWith("/auth")) return "Sign in · LuluTales";
  if (path.startsWith("/i/")) return "You’re invited · LuluTales";
  if (path === "/library") return "Library · LuluTales";
  if (path === "/my-stories") return "My stories · LuluTales";
  if (path === "/profile") return "Parents · LuluTales";
  if (path.startsWith("/magic-hub")) return "Make a story · LuluTales";
  if (path.startsWith("/admin")) return "Admin · LuluTales";
  return null;
};

/**
 * Per-page browser title and a "don't list this page" note for search engines on
 * private pages. Pages that set their own title (welcome, privacy, terms, 404) still win,
 * because their own effects run after this one.
 */
export const RouteSeo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleFor(pathname) ?? BASE_TITLE;

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (isPublic(pathname)) {
      robots?.remove();
    } else {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.appendChild(robots);
      }
      robots.content = "noindex";
    }
  }, [pathname]);

  return null;
};
