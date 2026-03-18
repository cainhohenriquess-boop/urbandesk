"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AppMainFrameProps = {
  children: React.ReactNode;
};

export function AppMainFrame({ children }: AppMainFrameProps) {
  const pathname = usePathname();
  const isDedicatedProjectMap = /^\/app\/projetos\/(?:[^/]+\/mapa|mapa)(?:\/|$)/.test(
    pathname
  );

  useEffect(() => {
    if (isDedicatedProjectMap) {
      document.body.dataset.mapRoute = "true";
      return () => {
        delete document.body.dataset.mapRoute;
      };
    }

    delete document.body.dataset.mapRoute;
    return undefined;
  }, [isDedicatedProjectMap]);

  return (
    <main
      className={cn(
        "app-main animate-fade-in relative z-10",
        isDedicatedProjectMap && "overflow-hidden p-0"
      )}
    >
      {children}
    </main>
  );
}
