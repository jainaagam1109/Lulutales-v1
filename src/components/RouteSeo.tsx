import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_TITLE = "LuluTales – Personalised Audio Stories for Kids, in English & Hindi";

/** Pages that search engines may list. Everything else is the signed-in app. */
const isPublic = (path: string) => path === "/" || path === "/welcome" || path === "/privacy" || path === "/terms";

const SITE = "https://lulutales.in";
/** The address search engines should treat as the real one for each public page. */
const canonicalFor = (path: string) => (path === "/" || path === "/welcome" ? `${SITE}/` : `${SITE}${path}`);

const setLink = (rel: string, href: string | null) => {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!href) return el?.remove();
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
};

const setOgUrl = (href: string) => {
  let el = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", "og:url");
    document.head.appendChild(el);
  }
  el.content = href;
};

const HOME_DESC =
  "Personalised audio stories where your child is the hero. Each one builds a skill like courage, kindness or friendship. Ages 2 to 9, in English and Hindi.";

/** Title and description for each public page (used by search results and share previews). */
const PUBLIC_META: Record<string, { title: string; description: string }> = {
  "/": { title: BASE_TITLE, description: HOME_DESC },
  "/welcome": { title: BASE_TITLE, description: HOME_DESC },
  "/privacy": {
    title: "Privacy Policy · LuluTales",
    description:
      "How LuluTales collects, uses and protects your details and your child’s. What we keep, why we keep it, and how to ask us to delete it.",
  },
  "/terms": {
    title: "Terms of Use · LuluTales",
    description:
      "The terms for using LuluTales, personalised audio stories for children aged 2 to 9 in English and Hindi: your account, your stories and your plan.",
  },
};

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
};

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
 * Per-page browser title, the page's own canonical address and share link, and a
 * "don't list this page" note for search engines on private pages. Pages that set their own title (welcome, privacy, terms, 404) still win,
 * because their own effects run after this one.
 */
export const RouteSeo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = PUBLIC_META[pathname];
    document.title = meta?.title ?? titleFor(pathname) ?? BASE_TITLE;
    const description = meta?.description ?? HOME_DESC;
    const shareTitle = meta?.title ?? BASE_TITLE;
    setMeta("name", "description", description);
    setMeta("property", "og:title", shareTitle);
    setMeta("property", "og:description", description);
    setMeta("name", "twitter:title", shareTitle);
    setMeta("name", "twitter:description", description);

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (isPublic(pathname)) {
      robots?.remove();
      setLink("canonical", canonicalFor(pathname));
      setOgUrl(canonicalFor(pathname));
    } else {
      // Private pages aren't listed, so they don't claim an address of their own.
      setLink("canonical", null);
      setOgUrl(`${SITE}/`);
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
