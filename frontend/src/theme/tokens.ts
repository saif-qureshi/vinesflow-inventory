import type { ThemeConfig } from "antd";
import { theme } from "antd";

// Single source of truth for chrome colors. Keep the light values in sync with
// the `@theme` block in globals.css (which exposes them to Tailwind).
export const brand = {
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  secondary: "#0f766e",
  sidebarBg: "#0f172a",
  sidebarText: "#cbd5e1",
  muted: "#94a3b8",
  surface: "#f8fafc",
  border: "#e2e8f0",
} as const;

export const ACCENT_PRESETS = [
  { name: "Blue", value: "#2563eb" },
  { name: "Emerald", value: "#059669" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#d97706" },
  { name: "Violet", value: "#7c3aed" },
];

// `sidebar` only controls the app sidebar pane (dark vs light). The rest of the
// app is always light — this is NOT a full dark-mode switch.
export function buildAntdTheme(sidebar: "light" | "dark", accent: string): ThemeConfig {
  const darkSidebar = sidebar === "dark";
  return {
    token: {
      colorPrimary: accent,
      colorLink: accent,
      borderRadius: 6,
      fontSize: 14,
      controlHeight: 38,
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    },
    components: {
      Layout: {
        siderBg: darkSidebar ? "#0f172a" : "#ffffff",
        headerBg: "#ffffff",
        bodyBg: brand.surface,
        headerHeight: 60,
      },
      Menu: {
        itemColor: "#475569",
        // Selected background is a subtle tint of the accent so it stays cohesive
        // whatever the accent color is (not a fixed blue).
        itemSelectedBg: `${accent}1f`,
        itemSelectedColor: accent,
        itemHoverBg: "#f1f5f9",
        itemBorderRadius: 8,
        itemMarginInline: 8,
        darkItemBg: "transparent",
        darkItemSelectedBg: accent,
        darkItemSelectedColor: "#ffffff",
        darkItemColor: brand.sidebarText,
        darkItemHoverBg: "rgba(255,255,255,0.06)",
      },
      Button: { controlHeight: 38 },
      Input: { controlHeight: 38 },
    },
    algorithm: theme.defaultAlgorithm,
  };
}

// Default (light sidebar + blue) used before the org's preference is known.
export const antdTheme = buildAntdTheme("light", brand.primary);
