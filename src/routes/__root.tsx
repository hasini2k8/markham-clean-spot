import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Markham Cleanup — Volunteer Together" },
      { name: "description", content: "Join Markham residents cleaning up the city. Log hours, get supervisor approval, AI-verified cleanups." },
      { property: "og:title", content: "Markham Cleanup — Volunteer Together" },
      { name: "twitter:title", content: "Markham Cleanup — Volunteer Together" },
      { property: "og:description", content: "Join Markham residents cleaning up the city. Log hours, get supervisor approval, AI-verified cleanups." },
      { name: "twitter:description", content: "Join Markham residents cleaning up the city. Log hours, get supervisor approval, AI-verified cleanups." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a3b32d9d-9812-4805-9803-39b21767ef11/id-preview-805a8c6e--5c0d41d1-4d16-4454-b8c8-10c7bb57f4b8.lovable.app-1776459287666.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a3b32d9d-9812-4805-9803-39b21767ef11/id-preview-805a8c6e--5c0d41d1-4d16-4454-b8c8-10c7bb57f4b8.lovable.app-1776459287666.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  ),
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
