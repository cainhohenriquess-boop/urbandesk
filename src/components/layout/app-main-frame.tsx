"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AppMainFrameProps = {
  children: React.ReactNode;
};

export function AppMainFrame({ children }: AppMainFrameProps) {
  const pathname = usePathname();
  const isDedicatedProjectMap = /^\/app\/projetos\/[^/]+\/mapa(?:\/|$)/.test(pathname);

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
