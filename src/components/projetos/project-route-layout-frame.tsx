"use client";

import { useSelectedLayoutSegment } from "next/navigation";

type ProjectRouteLayoutFrameProps = {
  header: React.ReactNode;
  nav: React.ReactNode;
  children: React.ReactNode;
};

export function ProjectRouteLayoutFrame({
  header,
  nav,
  children,
}: ProjectRouteLayoutFrameProps) {
  const segment = useSelectedLayoutSegment();
  const isMapRoute = segment === "mapa";

  if (isMapRoute) {
    return <div className="h-full min-h-0">{children}</div>;
  }

  return (
    <div className="space-y-6">
      {header}
      {nav}
      {children}
    </div>
  );
}
