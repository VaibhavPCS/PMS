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
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
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

  // On initial load, if URL contains a hash like /#/route, navigate to that route.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      const hashPath = hash.slice(1); // remove leading '#'
      // If we're at the root path but have a hash route, navigate client-side
      if (window.location.pathname === '/' && hashPath !== '/') {
        navigate(hashPath, { replace: true });
      }
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL hash in sync with the current route for shareable hash URLs
  useEffect(() => {
    const desiredHash = `#${location.pathname}${location.search}`;
    if (window.location.hash !== desiredHash) {
      // Update hash without adding a new history entry
      window.location.hash = desiredHash;
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
