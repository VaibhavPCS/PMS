import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "react-router";
import { useEffect } from "react";

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

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Handle hash-based routing for static deployments
  // On initial load, if URL contains a hash like /#/dashboard, navigate to that route
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      const hashPath = hash.slice(1); // Remove '#' to get '/dashboard'
      const currentPath = location.pathname;

      // Only navigate if we're not already on the correct path
      if (currentPath !== hashPath) {
        navigate(hashPath, { replace: true });
      }
    } else if (location.pathname === '/' && !hash) {
      // If we're at the root with no hash, let the redirect component handle it
      // This ensures proper redirection to /sign-in#/sign-in
      return;
    }
    // Run only on mount to handle initial page load with hash URLs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep hash in sync with the current route
  // This allows copy/paste of URLs and proper refresh behavior
  useEffect(() => {
    const desiredHash = `#${location.pathname}${location.search}`;
    if (window.location.hash !== desiredHash) {
      // Update hash without triggering navigation
      window.history.replaceState(null, '', desiredHash);
    }
  }, [location.pathname, location.search]);

  return (
    <ReactQueryProvider>
      <AuthProvider>
        <Outlet />
        <Toaster /> {/* ✅ Keep only this one */}
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
}
