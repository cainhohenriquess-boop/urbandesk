"use client";

import type { TechnicalFieldDefinition } from "@/lib/project-disciplines";

function TechnicalFieldControl({
  field,
  value,
  onChange,
}: {
  field: TechnicalFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const commonClassName =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500";

  if (field.kind === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className={commonClassName}
      />
    );
  }

  if (field.kind === "select") {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={commonClassName}
      >
        <option value="">Selecione...</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      min={field.kind === "number" ? field.min : undefined}
      max={field.kind === "number" ? field.max : undefined}
      step={field.kind === "number" ? "any" : undefined}
      className={commonClassName}
    />
  );
}

type ProjectMapTechnicalFormProps = {
  fields: TechnicalFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  title?: string;
};

export function ProjectMapTechnicalForm({
  fields,
  values,
  onChange,
  title = "Formulário da disciplina",
}: ProjectMapTechnicalFormProps) {
  if (fields.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-background px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 grid gap-3">
        {fields.map((field) => (
          <label key={field.key} className="grid gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            <TechnicalFieldControl
              field={field}
              value={values[field.key] ?? ""}
              onChange={(value) => onChange(field.key, value)}
            />
            {field.helper ? (
              <span className="text-xs text-muted-foreground">{field.helper}</span>
            ) : null}
          </label>
        ))}
      </div>
    </div>
  );
}
