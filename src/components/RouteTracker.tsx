import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/track";

export const RouteTracker = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    trackPageView(pathname + search, pathname);
  }, [pathname, search]);
  return null;
};
