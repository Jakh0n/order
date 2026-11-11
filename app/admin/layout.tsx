import type { Metadata, Viewport } from "next";

// The admin is installable as its own app (home screen) — needed for push on iPhone.
// The manifest is linked only here, so customers on store pages never get an install prompt.
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "Flami", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#16a05d" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
