export interface User {
  _id: string;  // Changed from id to _id
  email: string;
  name: string;
  role?: 'user' | 'admin' | 'super_admin';  // Add role property
  profilePicture?: string;
  isEmailVerified?: boolean;
  currentWorkspace?: string | {
    _id: string;
    name: string;
    description?: string;
    createdAt: string;
  };
  workspaces?: Array<{
    workspaceId: string;
    role: string;
    joinedAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}