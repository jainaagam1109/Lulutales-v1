import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useParentSettings, localLook, isNight } from "@/lib/parentSettings";
import { useAuth } from "@/hooks/useAuth";

/**
 * Applies the family's chosen Look (Light / Dark / Dark at night) to the whole app.
 * The public welcome page and the admin screens always stay light.
 */
export const LookApplier = () => {
  const { pathname } = useLocation();
  const { session } = useAuth();
  useParentSettings(); // loads the saved choice onto this device after sign-in
  const [, bump] = useState(0);

  useEffect(() => {
    const on = () => bump((n) => n + 1);
    window.addEventListener("lulutales-settings", on);
    const t = setInterval(on, 60_000); // re-check each minute for "Dark at night"
    return () => {
      window.removeEventListener("lulutales-settings", on);
      clearInterval(t);
    };
  }, []);

  const look = localLook();
  const exempt = !session || pathname === "/welcome" || pathname.startsWith("/admin") || pathname.startsWith("/auth");
  const dark = !exempt && (look === "dark" || (look === "auto" && isNight()));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  return null;
};

export default LookApplier;
