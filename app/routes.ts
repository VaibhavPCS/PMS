import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Root redirect route
  index("routes/root/redirect.tsx"),
  
  // Auth routes (for non-authenticated users)
  layout("routes/auth/auth-layout.tsx", [
    route("sign-in", "routes/auth/sign-in.tsx"),
    route("sign-up", "routes/auth/sign-up.tsx"),
    route("verify-otp", "routes/auth/verify-otp.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("reset-password", "routes/auth/reset-password.tsx"),
    route("verify-email", "routes/auth/verify-email.tsx"),
  ]),

  // Protected routes with dashboard layout
  layout("components/layout/dashboard-layout.tsx", [
    route("dashboard", "routes/dashboard/dashboard.tsx"),
    route("workspace", "routes/workspace/workspace.tsx"),
    route("tasks", "routes/tasks/tasks.tsx"),
    route("meetings", "routes/meetings/meetings.tsx"),
    route("members", "routes/members/members.tsx"),
    route("archived", "routes/archived/archived.tsx"),
    route("chat", "routes/chat/chat.tsx"),
    route("settings", "routes/settings/settings.tsx"),
    // Add project detail route here inside the dashboard layout
    route("project/:id", "routes/project/project-detail.tsx"),
    // Move task route INSIDE dashboard layout
    route("task/:id", "routes/task/task-detail.tsx"),
  ]),

  // 404 catch-all
  route("*", "routes/root/not-found.tsx"),
] satisfies RouteConfig;
