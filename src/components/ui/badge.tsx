import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none transition-colors select-none",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        outline:     "border-border text-foreground",
        // Status de projeto
        planejado:   "border-slate-200  bg-slate-100  text-slate-700",
        andamento:   "border-brand-200  bg-brand-100  text-brand-700",
        paralisado:  "border-warning-200 bg-warning-100 text-warning-700",
        concluido:   "border-accent-200 bg-accent-100 text-accent-700",
        cancelado:   "border-danger-200  bg-danger-100  text-danger-700",
        // Status de tenant
        trial:       "border-brand-300  bg-brand-50   text-brand-700",
        ativo:       "border-accent-300 bg-accent-50  text-accent-700",
        inadimplente:"border-danger-300  bg-danger-50   text-danger-700",
        // Role
        superadmin:  "border-violet-300 bg-violet-100 text-violet-700",
        secretario:  "border-brand-300  bg-brand-100  text-brand-700",
        engenheiro:  "border-accent-300 bg-accent-100 text-accent-700",
        campo:       "border-warning-300 bg-warning-100 text-warning-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn(
          "h-1.5 w-1.5 rounded-full",
          variant === "andamento"   ? "bg-brand-500"   :
          variant === "concluido"   ? "bg-accent-500"  :
          variant === "paralisado"  ? "bg-warning-500" :
          variant === "cancelado"   ? "bg-danger-500"  :
          variant === "trial"       ? "bg-brand-500"   :
          variant === "inadimplente"? "bg-danger-500"  :
          "bg-current"
        )} />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
