import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Mini Weather",
};

// Runs before React loads, so the saved theme is applied with no flash of the wrong colours.
const themeScript = `
  try {
    var t = localStorage.getItem("mw.theme");
    if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}