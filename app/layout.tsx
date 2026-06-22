import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperChannel",
  description: "Multi-tenant conversations and publishing workspace.",
};

const themeScript = `
  (() => {
    try {
      const storedTheme = window.localStorage.getItem("superchannel-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 font-sans text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
