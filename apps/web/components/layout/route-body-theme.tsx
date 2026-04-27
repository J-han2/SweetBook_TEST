"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RouteBodyTheme() {
  const pathname = usePathname();

  useEffect(() => {
    const routeTheme = pathname === "/" ? "home" : "default";
    document.body.dataset.routeTheme = routeTheme;

    return () => {
      delete document.body.dataset.routeTheme;
    };
  }, [pathname]);

  return null;
}
