import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

// @ts-expect-error – no declaration file for this JS module
import ReactQueryProvider from "./provider/react-query-provider.jsx";
import { AuthProvider } from "./provider/auth-context";
import { Toaster } from "sonner"; // ✅ Keep only this one

import "./app.css";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Montserrat:wght@300;400;500;600;700;800&display=swap",
  },
  {
    rel: "icon",
    href: "/pcs_logo.jpg",
    type: "image/jpeg",
  },
];

// Ensure the browser tab title always displays PMS
export function meta() {
  return [
    { title: "PMS" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#F2761B] border-t-transparent" />
        <p className="text-[#717182] animate-pulse font-medium">Loading application...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactQueryProvider>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </ReactQueryProvider>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
  // TODO: Add a link to the help center
}
