import { Link } from "react-router-dom";
import { useEffect } from "react";
import { LuluLogo } from "@/components/LuluLogo";

/** Friendly page for a wrong or old web address. */
const NotFound = () => {
  useEffect(() => {
    document.title = "Page not found · LuluTales";
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <LuluLogo size={34} />
      <h1 className="mt-10 font-[Quicksand] text-[28px] font-bold leading-tight">We couldn’t find that page</h1>
      <p className="mt-2 max-w-[340px] text-[15px] text-muted-foreground">
        The link may be old or have a small typo. Your stories are safe.
      </p>
      <Link
        to="/"
        className="mt-7 inline-flex min-h-12 items-center rounded-full bg-primary px-7 font-semibold text-primary-foreground"
      >
        Go to LuluTales
      </Link>
      <p className="mt-6 text-sm text-muted-foreground">
        Need help? Write to{" "}
        <a href="mailto:hello@lulutales.in" className="font-semibold text-primary">hello@lulutales.in</a>
      </p>
    </main>
  );
};

export default NotFound;
