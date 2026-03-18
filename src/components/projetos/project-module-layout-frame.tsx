"use client";

import { usePathname } from "next/navigation";

type ProjectModuleLayoutFrameProps = {
  intro: React.ReactNode;
  children: React.ReactNode;
};

const MAP_ROUTE_PATTERN = /^\/app\/projetos\/(?:[^/]+\/mapa|mapa)(?:\/|$)/;

export function ProjectModuleLayoutFrame({
  intro,
  children,
}: ProjectModuleLayoutFrameProps) {
  const pathname = usePathname();
  const isDedicatedMapRoute = MAP_ROUTE_PATTERN.test(pathname);

  if (isDedicatedMapRoute) {
    return <div className="h-full min-h-0">{children}</div>;
  }

  return (
    <div className="space-y-6">
      {intro}
      {children}
    </div>
  );
}
