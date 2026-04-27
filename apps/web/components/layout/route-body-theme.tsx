"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RouteBodyTheme() {
  const pathname = usePathname();

  useEffect(() => {
    const routeTheme = pathname === "/" ? "home" : "default";
    document.body.dataset.routeTheme = routeTheme;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      delete document.body.dataset.routeTheme;
    };
  }, [pathname]);

  return null;
}
