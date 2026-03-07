import * as React from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?:  React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
          <input
            type={type}
            ref={ref}
            className={cn(
              "flex h-9 w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm transition-colors",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-danger-500 focus-visible:ring-danger-400"
                : "border-border focus-visible:border-primary/60",
              className
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-danger-500 focus-visible:ring-danger-400"
            : "border-border focus-visible:border-primary/60",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ─────────────────────────────────────────────
// Textarea
// ─────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm",
        "placeholder:text-muted-foreground resize-none",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        error
          ? "border-danger-500 focus-visible:ring-danger-400"
          : "border-border focus-visible:border-primary/60",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

// ─────────────────────────────────────────────
// Label
// ─────────────────────────────────────────────
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-danger-500">*</span>}
    </label>
  )
);
Label.displayName = "Label";

// ─────────────────────────────────────────────
// FormField — Label + Input + mensagem de erro
// ─────────────────────────────────────────────
interface FormFieldProps {
  label:      string;
  error?:     string;
  required?:  boolean;
  children:   React.ReactNode;
  className?: string;
}

function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label required={required}>{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-danger-600 flex items-center gap-1">
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export { Input, Textarea, Label, FormField };
