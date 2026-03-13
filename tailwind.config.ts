import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand primário — azul institucional profundo
        brand: {
          50:  "#eef4ff",
          100: "#d9e8ff",
          200: "#bcd4fe",
          300: "#8eb8fd",
          400: "#5a91fa",
          500: "#3468f6",
          600: "#1d48eb",
          700: "#1635d8",
          800: "#182caf",
          900: "#192b8a",
          950: "#141c55",
        },
        // Accent — verde esmeralda (status GIS ativo)
        accent: {
          50:  "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        // Alerta — âmbar (obras em andamento / trial expirando)
        warning: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // Danger — vermelho (problemas críticos / obras paralisadas)
        danger: {
          50:  "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        // Mapa / GIS — tons de topografia
        geo: {
          water:   "#3b82f6",
          green:   "#22c55e",
          road:    "#94a3b8",
          terrain: "#d97706",
          urban:   "#6366f1",
        },
        // Superfícies UI (compatível com Shadcn/ui)
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border:  "hsl(var(--border))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT:            "hsl(var(--sidebar-background))",
          foreground:         "hsl(var(--sidebar-foreground))",
          primary:            "hsl(var(--sidebar-primary))",
          "primary-foreground":"hsl(var(--sidebar-primary-foreground))",
          accent:             "hsl(var(--sidebar-accent))",
          "accent-foreground":"hsl(var(--sidebar-accent-foreground))",
          border:             "hsl(var(--sidebar-border))",
          ring:               "hsl(var(--sidebar-ring))",
        },
      },

      fontFamily: {
        // Display: títulos e KPIs
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        // Body: corpo de texto e UI
        sans:    ["var(--font-sans)", "system-ui", "sans-serif"],
        // Mono: coordenadas GIS e código
        mono:    ["var(--font-mono)", "monospace"],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      spacing: {
        "sidebar-w":        "16rem",   // 256px — largura da sidebar desktop
        "sidebar-w-collapsed": "4rem", // 64px  — sidebar recolhida
        "topbar-h":         "3.5rem",  // 56px  — altura da topbar
        "map-toolbar-h":    "3rem",    // 48px  — altura da drawing toolbar
      },

      zIndex: {
        map:        "10",
        toolbar:    "20",
        sidebar:    "30",
        topbar:     "40",
        modal:      "50",
        toast:      "60",
        support:    "70",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1",   transform: "scale(1)" },
          "50%":       { opacity: "0.6", transform: "scale(1.4)" },
        },
        "map-ping": {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.3s ease-out",
        "slide-in-left":  "slide-in-left 0.25s ease-out",
        "pulse-dot":      "pulse-dot 1.5s ease-in-out infinite",
        "map-ping":       "map-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
      },

      boxShadow: {
        card:    "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.08)",
        sidebar: "2px 0 8px 0 rgb(0 0 0 / 0.08)",
        map:     "0 4px 24px 0 rgb(0 0 0 / 0.18)",
        kpi:     "inset 0 0 0 1px rgb(255 255 255 / 0.06)",
      },

      backgroundImage: {
        "gradient-brand":   "linear-gradient(135deg, #192b8a 0%, #3468f6 100%)",
        "gradient-success": "linear-gradient(135deg, #047857 0%, #10b981 100%)",
        "gradient-map":     "linear-gradient(180deg, rgba(20,28,85,0.85) 0%, rgba(20,28,85,0) 100%)",
        "noise":            "url('/textures/noise.svg')",
      },
    },
  },
  plugins: [
    animate,
    typography,
    containerQueries,
  ],
} satisfies Config;

export default config;
