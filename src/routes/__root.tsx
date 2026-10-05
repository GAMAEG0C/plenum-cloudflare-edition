import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

const queryClient = new QueryClient();

import appCss from "../styles.css?url";

import { tenantConfig } from "@/config/tenant";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${tenantConfig.shortName} · Hospital Veterinario` },
      { name: "description", content: tenantConfig.description },
      { property: "og:title", content: `${tenantConfig.shortName} · Hospital Veterinario` },
      { property: "og:description", content: tenantConfig.description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/8f75747a-eb43-4931-99dc-17e4a383b787" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/8f75747a-eb43-4931-99dc-17e4a383b787" },
      { name: "twitter:title", content: `${tenantConfig.shortName} · Hospital Veterinario` },
      { name: "twitter:description", content: tenantConfig.description },
    ],
    links: [
      { rel: "icon", type: "image/png", href: tenantConfig.logo.light },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RoleProvider>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
            <Toaster position="bottom-right" richColors />
          </RoleProvider>
        </AuthProvider>
    </QueryClientProvider>
  );
}
