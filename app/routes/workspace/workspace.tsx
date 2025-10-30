import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../../provider/auth-context";
import { Navigate, useNavigate } from "react-router";
import { postData, fetchData, putData, deleteData } from "@/lib/fetch-util";
import {
  Plus,
  UserPlus,
  Building2,
  Check,
  X,
  Calendar,
  Users,
  AlertCircle,
  Settings,
  Edit,
  Trash2,
  UserX,
  Crown,
  Loader2,
  Eye,
  ChevronDown,
  CalendarIcon,
  MoreVertical,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";

const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

interface Workspace {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface UserWorkspace {
  workspaceId: Workspace;
  role: string;
  joinedAt: string;
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  _id: string;
  title: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  categories: Array<{
    name: string;
    members: Array<{
      userId: {
        _id: string;
        name: string;
        email: string;
      };
      role: string;
    }>;
    status: string;
  }>;
  creator: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

const WorkspacePage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const permissions = usePermissions();

  // One-time init guard to avoid duplicate fetches in StrictMode
  const didInitRef = useRef(false);
  // Track last workspace for which members were loaded to avoid redundant calls
  const lastMembersWorkspaceIdRef = useRef<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] =
    useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteToProjectModal, setShowInviteToProjectModal] =
    useState(false);

  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] =
    useState(false);
  const [showDeleteProjectAlert, setShowDeleteProjectAlert] = useState(false);

  const [settingsTab, setSettingsTab] = useState<
    "general" | "members" | "transfer" | "danger"
  >("general");

  const [inviteData, setInviteData] = useState({ email: "", role: "member" });
  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    description: "",
  });
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    status: "Planning",
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    categories: [{ name: "", members: [] }],
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [inviteToProjectData, setInviteToProjectData] = useState({
    email: "",
    categoryName: "",
    role: "member" as "lead" | "member",
  });

  const [editingField, setEditingField] = useState<
    "title" | "description" | null
  >(null);
  const [editProjectData, setEditProjectData] = useState({
    title: "",
    description: "",
  });

  const [editWorkspace, setEditWorkspace] = useState({
    name: "",
    description: "",
  });
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [demoteCurrentOwner, setDemoteCurrentOwner] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<{
    [categoryIndex: number]: WorkspaceMember[];
  }>({});
  const [selectedMembersWithRoles, setSelectedMembersWithRoles] = useState<{
    [categoryIndex: number]: Array<{
      member: WorkspaceMember;
      role: "lead" | "member";
    }>;
  }>({});

  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submittingSettings, setSubmittingSettings] = useState(false);
  const [submittingWorkspace, setSubmittingWorkspace] = useState(false);
  const [submittingProjectInvite, setSubmittingProjectInvite] = useState(false);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const canCreateWorkspace = permissions.canCreateWorkspace;
  const canManageWorkspace = permissions.canManageSettings;
  const canInviteMembers = permissions.canInviteMembers;
  const canCreateProject = permissions.canCreateProject;
  const isOwner = currentUserRole === "owner";
  const canSeeAllProjects = permissions.canViewAllProjects;

  const memoizedStatusColor = useCallback((status: string) => {
    switch (status) {
      case "Planning":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "On Hold":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const memoizedProgressColor = useCallback((progress: number) => {
    if (progress < 25) return "bg-red-500";
    if (progress < 50) return "bg-orange-500";
    if (progress < 75) return "bg-yellow-500";
    return "bg-green-500";
  }, []);

  const handleEditProject = useCallback(
    (project: Project, field: "title" | "description") => {
      setSelectedProject(project);
      setEditingField(field);
      setEditProjectData({
        title: project.title,
        description: project.description || "",
      });
      setShowEditProjectModal(true);
    },
    []
  );

  const handleUpdateProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedProject || !editingField) return;

      const fieldValue = editProjectData[editingField];
      if (editingField === "title" && !fieldValue.trim()) {
        toast.error("Project title cannot be empty");
        return;
      }

      try {
        setSubmittingUpdate(true);
        await putData(`/project/${selectedProject._id}`, {
          [editingField]: fieldValue.trim(),
        });

        toast.success(`Project ${editingField} updated successfully!`);
        setShowEditProjectModal(false);
        setSelectedProject(null);
        setEditingField(null);
        await fetchProjects();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || `Failed to update ${editingField}`
        );
      } finally {
        setSubmittingUpdate(false);
      }
    },
    [editProjectData, editingField, selectedProject]
  );

  const handleDeleteProject = useCallback(async () => {
    if (!selectedProject) return;

    try {
      setSubmittingDelete(true);
      await deleteData(`/project/${selectedProject._id}`);

      toast.success("Project deleted successfully!");
      setShowDeleteProjectAlert(false);
      setSelectedProject(null);
      await fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete project");
    } finally {
      setSubmittingDelete(false);
    }
  }, [selectedProject]);

  const handleManageCategories = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowManageCategoriesModal(true);
  }, []);

  const canEditProject = useCallback(
    (project: Project) => {
      return (
        userRole === "super-admin" ||
        userRole === "admin" ||
        project.creator._id === currentUserId ||
        currentUserRole === "lead"
      );
    },
    [userRole, currentUserId, currentUserRole]
  );
  const fetchUserRole = useCallback(async () => {
    try {
      const response = await fetchData("/auth/me");
      setUserRole(response.user.role);
      setCurrentUserId(response.user._id);
    } catch (error) {
      toast.error("Failed to load user data");
    }
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = (await fetchData("/workspace")) as {
        workspaces: UserWorkspace[];
        currentWorkspace: Workspace;
      };
      setWorkspaces(response.workspaces);
      setCurrentWorkspace(response.currentWorkspace);

      const currentUserWorkspace = response.workspaces.find(
        (w) => w.workspaceId._id === response.currentWorkspace?._id
      );
      setCurrentUserRole(currentUserWorkspace?.role || "");
    } catch (error) {
      toast.error("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetchData("/project");
      setProjects(response.projects);
    } catch (error) {
      toast.error("Failed to load projects");
    }
  }, []);

  // Move the declaration above its usage to satisfy linter
  const fetchWorkspaceMembers = useCallback(async () => {
    const wsId = currentWorkspace?._id;
    if (!wsId) {
      setWorkspaceMembers([]);
      lastMembersWorkspaceIdRef.current = null;
      return;
    }

    // Avoid repeated fetch for same workspace
    if (lastMembersWorkspaceIdRef.current === wsId) {
      return;
    }

    try {
      const response = await fetchData("/project/members");
      setWorkspaceMembers(response.members || []);
      lastMembersWorkspaceIdRef.current = wsId;
    } catch (error) {
      setWorkspaceMembers([]);
    }
  }, [currentWorkspace?._id]);

  // Initial data load — guard to avoid duplicate calls
  useEffect(() => {
    if (!isAuthenticated) return;
    if (didInitRef.current) return;
    didInitRef.current = true;

    fetchUserRole();
    fetchWorkspaces();
    fetchProjects();
  }, [isAuthenticated, fetchUserRole, fetchWorkspaces, fetchProjects]);

  useEffect(() => {
    if (isAuthenticated && currentWorkspace?._id) {
      fetchWorkspaceMembers();
    }
  }, [isAuthenticated, currentWorkspace?._id, fetchWorkspaceMembers]);

  useEffect(() => {
    if (currentWorkspace) {
      setEditWorkspace({
        name: currentWorkspace.name,
        description: currentWorkspace.description,
      });
    }
  }, [currentWorkspace]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (currentWorkspace?._id === workspaceId) {
        return;
      }

      const loadingToast = toast.loading("Switching workspace...");

      try {
        await postData("/workspace/switch", { workspaceId });

        await Promise.allSettled([
          fetchWorkspaces(),
          fetchProjects(),
          fetchWorkspaceMembers(),
        ]);

        toast.dismiss(loadingToast);
        toast.success("Workspace switched successfully!");
      } catch (error: any) {
        toast.dismiss(loadingToast);

        if (error.response?.status === 403) {
          toast.error("You don't have permission to access this workspace");
        } else if (error.response?.status === 404) {
          toast.error("Workspace not found");
        } else {
          toast.error(
            error.response?.data?.message || "Failed to switch workspace"
          );
        }
      }
    },
    [currentWorkspace, fetchWorkspaces, fetchProjects, fetchWorkspaceMembers]
  );

  const handleCreateWorkspace = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newWorkspace.name.trim()) {
        toast.error("Workspace name is required");
        return;
      }

      try {
        setSubmittingWorkspace(true);
        await postData("/workspace", newWorkspace);

        setShowCreateWorkspaceModal(false);
        setNewWorkspace({ name: "", description: "" });
        toast.success("Workspace created successfully!");
        await fetchWorkspaces();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to create workspace"
        );
      } finally {
        setSubmittingWorkspace(false);
      }
    },
    [newWorkspace, fetchWorkspaces]
  );

  const handleInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteData.email.trim() || !inviteData.role) {
        toast.error("Please fill in all fields");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteData.email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      try {
        setSubmittingInvite(true);
        await postData(`/workspace/${currentWorkspace?._id}/invite`, {
          email: inviteData.email.trim(),
          role: inviteData.role,
        });

        setInviteData({ email: "", role: "member" });
        setShowInviteModal(false);
        toast.success("Invitation sent successfully!");
        await fetchWorkspaces();
        await fetchWorkspaceMembers();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to send invitation"
        );
      } finally {
        setSubmittingInvite(false);
      }
    },
    [inviteData, currentWorkspace, fetchWorkspaces, fetchWorkspaceMembers]
  );

  const handleInviteToProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (
        !inviteToProjectData.email.trim() ||
        !inviteToProjectData.categoryName
      ) {
        toast.error("Please fill in all fields");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteToProjectData.email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      try {
        setSubmittingProjectInvite(true);
        await postData(`/project/${selectedProject?._id}/members`, {
          categoryName: inviteToProjectData.categoryName,
          memberEmail: inviteToProjectData.email.trim(),
          role: inviteToProjectData.role === "lead" ? "Lead" : "Member",
        });

        setInviteToProjectData({ email: "", categoryName: "", role: "member" });
        setShowInviteToProjectModal(false);
        setSelectedProject(null);
        toast.success("Member invited to project successfully!");
        await fetchProjects();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to invite member to project"
        );
      } finally {
        setSubmittingProjectInvite(false);
      }
    },
    [inviteToProjectData, selectedProject, fetchProjects]
  );

  const handleCreateProject = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newProject.title.trim()) {
        toast.error("Project title is required");
        return;
      }

      if (!newProject.startDate || !newProject.endDate) {
        toast.error("Please select start and end dates");
        return;
      }

      if (newProject.startDate >= newProject.endDate) {
        toast.error("End date must be after start date");
        return;
      }

      const categoriesWithoutLead = newProject.categories.filter(
        (category, index) => {
          const categoryMembers = selectedMembersWithRoles[index] || [];
          return (
            categoryMembers.length > 0 &&
            !categoryMembers.some((m) => m.role === "lead")
          );
        }
      );

      if (categoriesWithoutLead.length > 0) {
        toast.error("Each category with members must have at least one lead");
        return;
      }

      try {
        setSubmittingProject(true);

        const formattedCategories = newProject.categories.map(
          (category, index) => ({
            name: category.name,
            members: (selectedMembersWithRoles[index] || []).map(
              (memberWithRole) => ({
                email: memberWithRole.member.email,
                role: memberWithRole.role === "lead" ? "Lead" : "Member",
              })
            ),
          })
        );

        await postData("/project", {
          ...newProject,
          startDate: newProject.startDate.toISOString(),
          endDate: newProject.endDate.toISOString(),
          categories: formattedCategories,
        });

        setNewProject({
          title: "",
          description: "",
          status: "Planning",
          startDate: undefined,
          endDate: undefined,
          categories: [{ name: "", members: [] }],
        });
        setSelectedMembers({});
        setSelectedMembersWithRoles({});
        setShowProjectModal(false);
        toast.success("Project created successfully!");
        await fetchProjects();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to create project"
        );
      } finally {
        setSubmittingProject(false);
      }
    },
    [newProject, selectedMembersWithRoles, fetchProjects]
  );

  const handleUpdateWorkspace = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editWorkspace.name.trim()) {
        toast.error("Workspace name is required");
        return;
      }

      try {
        setSubmittingSettings(true);
        await putData(`/workspace/${currentWorkspace?._id}`, {
          name: editWorkspace.name.trim(),
          description: editWorkspace.description,
        });

        toast.success("Workspace updated successfully!");
        if (currentWorkspace) {
          setCurrentWorkspace({
            ...currentWorkspace,
            name: editWorkspace.name.trim(),
            description: editWorkspace.description,
          });
        }
        await fetchWorkspaces();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to update workspace"
        );
      } finally {
        setSubmittingSettings(false);
      }
    },
    [editWorkspace, currentWorkspace, fetchWorkspaces]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string, memberName: string) => {
      if (
        !confirm(
          `Are you sure you want to remove ${memberName} from this workspace?`
        )
      ) {
        return;
      }

      try {
        await deleteData(
          `/workspace/${currentWorkspace?._id}/members/${memberId}`
        );
        toast.success(`${memberName} removed successfully`);
        await fetchWorkspaceMembers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to remove member");
      }
    },
    [currentWorkspace, fetchWorkspaceMembers]
  );

  const handleChangeMemberRole = useCallback(
    async (memberId: string, memberName: string, newRole: string) => {
      try {
        await putData(
          `/workspace/${currentWorkspace?._id}/members/${memberId}/role`,
          {
            newRole: newRole,
          }
        );

        toast.success(
          `${memberName}'s role changed to ${newRole} successfully`
        );
        await fetchWorkspaceMembers();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to change member role"
        );
      }
    },
    [currentWorkspace, fetchWorkspaceMembers]
  );

  const handleTransferWorkspace = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedNewOwner) {
        toast.error("Please select a new owner");
        return;
      }

      const newOwnerName = workspaceMembers.find(
        (m) => m._id === selectedNewOwner
      )?.name;
      if (
        !confirm(
          `Are you sure you want to transfer ownership to ${newOwnerName}?\n\n` +
            `You will become ${demoteCurrentOwner ? "a Lead" : "an Admin"} and lose owner privileges.`
        )
      ) {
        return;
      }

      try {
        setSubmittingSettings(true);
        await postData(`/workspace/${currentWorkspace?._id}/transfer`, {
          newOwnerId: selectedNewOwner,
          demoteCurrentOwner,
        });

        toast.success(`Workspace transferred to ${newOwnerName} successfully!`);
        setShowSettingsModal(false);
        await fetchWorkspaces();
        await fetchWorkspaceMembers();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to transfer workspace"
        );
      } finally {
        setSubmittingSettings(false);
      }
    },
    [
      selectedNewOwner,
      demoteCurrentOwner,
      workspaceMembers,
      currentWorkspace,
      fetchWorkspaces,
      fetchWorkspaceMembers,
    ]
  );

  const handleDeleteWorkspace = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (deleteConfirmation !== currentWorkspace?.name) {
        toast.error("Please type the workspace name to confirm deletion");
        return;
      }

      try {
        setSubmittingSettings(true);
        await deleteData(`/workspace/${currentWorkspace?._id}`);
        toast.success(
          "Workspace archived successfully. It will be permanently deleted in 7 days if not restored."
        );
        setShowSettingsModal(false);
        await fetchWorkspaces();
        navigate("/dashboard");
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to delete workspace"
        );
      } finally {
        setSubmittingSettings(false);
      }
    },
    [deleteConfirmation, currentWorkspace, fetchWorkspaces, navigate]
  );

  const addCategory = useCallback(() => {
    setNewProject((prev) => ({
      ...prev,
      categories: [...prev.categories, { name: "", members: [] }],
    }));
  }, []);

  const removeCategory = useCallback((index: number) => {
    setNewProject((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));

    setSelectedMembers((prev) => {
      const newSelected = { ...prev };
      delete newSelected[index];
      return newSelected;
    });
  }, []);

  const updateCategoryName = useCallback((index: number, name: string) => {
    setNewProject((prev) => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === index ? { ...cat, name } : cat
      ),
    }));
  }, []);

  const toggleMemberSelection = useCallback(
    (
      categoryIndex: number,
      member: WorkspaceMember,
      role: "lead" | "member" = "member"
    ) => {
      const currentMembers = selectedMembersWithRoles[categoryIndex] || [];
      const existingMemberIndex = currentMembers.findIndex(
        (m) => m.member._id === member._id
      );

      if (existingMemberIndex >= 0) {
        setSelectedMembersWithRoles({
          ...selectedMembersWithRoles,
          [categoryIndex]: currentMembers.filter(
            (m) => m.member._id !== member._id
          ),
        });
      } else {
        setSelectedMembersWithRoles({
          ...selectedMembersWithRoles,
          [categoryIndex]: [...currentMembers, { member, role }],
        });
      }
    },
    [selectedMembersWithRoles]
  );

  if (isLoading || loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" />;
  }

  if (workspaces.length === 0 && canCreateWorkspace) {
    return (
      <>
        <div className="h-full flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <Card className="w-full max-w-md border-0 shadow-xl">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Welcome to PMS
                </CardTitle>
                <CardDescription className="text-base text-gray-600 mt-2">
                  Create your first workspace to start organizing projects and
                  collaborating with your team.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <Button
                  onClick={() => setShowCreateWorkspaceModal(true)}
                  className="w-full h-12"
                  size="lg"
                  type="button"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Workspace
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create Workspace Dialog (mounted in this branch) */}
        <Dialog
          open={showCreateWorkspaceModal}
          onOpenChange={setShowCreateWorkspaceModal}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span>Create New Workspace</span>
              </DialogTitle>
              <DialogDescription>
                Create a workspace to organize your projects and team
                collaboration.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateWorkspace} className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="workspace-name"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Workspace Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="workspace-name"
                    type="text"
                    required
                    value={newWorkspace.name}
                    onChange={(e) =>
                      setNewWorkspace({ ...newWorkspace, name: e.target.value })
                    }
                    placeholder="Enter workspace name"
                    className="h-12 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="workspace-description"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="workspace-description"
                    value={newWorkspace.description}
                    onChange={(e) =>
                      setNewWorkspace({
                        ...newWorkspace,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe what this workspace will be used for..."
                    rows={3}
                    className="resize-none focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateWorkspaceModal(false);
                    setNewWorkspace({ name: "", description: "" });
                  }}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingWorkspace}
                  className="flex-1 h-11"
                >
                  {submittingWorkspace ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Workspace
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ✅ ADD: Handle case when user has no workspaces and no permission to create them
  if (workspaces.length === 0 && !canCreateWorkspace) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md border-0 shadow-xl">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                No Workspaces Available
              </CardTitle>
              <CardDescription className="text-base text-gray-600 mt-2">
                You don't have access to any workspaces yet. Please contact an
                administrator to get invited to a workspace or to upgrade your
                account permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8 text-center">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    Need access to a workspace?
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Ask an administrator to invite you to their workspace
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 font-medium">
                    Want to create workspaces?
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Contact support to upgrade to admin permissions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <CardTitle className="text-xl mb-3 text-gray-900">
              No Workspace Selected
            </CardTitle>
            <CardDescription className="text-gray-600">
              Please select a workspace to continue.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden">
      <div className="block md:hidden bg-white/90 backdrop-blur-sm border-b shadow-sm p-4">
        <Select
          value={currentWorkspace?._id || ""}
          onValueChange={switchWorkspace}
        >
          <SelectTrigger className="w-full h-12 border-gray-200 focus:ring-blue-500">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-semibold">
                  {currentWorkspace?.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">
                {currentWorkspace?.name}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((userWorkspace) => {
              const workspace = userWorkspace.workspaceId;
              const isActive = currentWorkspace?._id === workspace._id;

              return (
                <SelectItem key={workspace._id} value={workspace._id}>
                  <div className="flex items-center space-x-3 w-full">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback
                        className={
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-orange-500 text-white"
                        }
                      >
                        {workspace.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {workspace.name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {userWorkspace.role}
                      </p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="block md:hidden bg-white/90 backdrop-blur-sm border-b px-4 pb-4">
        <div className="flex gap-2 justify-center">
          {canManageWorkspace && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="flex-1 min-w-0 px-3 h-10"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
          {canInviteMembers && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="flex-1 min-w-0 px-3 h-10"
              title="Invite"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          )}
          {canCreateProject && (
            <Button
              size="sm"
              onClick={() => setShowProjectModal(true)}
              className="flex-1 min-w-0 px-3 h-10"
              title="New Project"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="hidden md:block bg-white/90 backdrop-blur-sm border-b shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-80 justify-start h-12 border-gray-200 hover:border-gray-300"
                >
                  <div className="flex items-center space-x-3 w-full">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-semibold">
                        {currentWorkspace?.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium truncate">
                        {currentWorkspace?.name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {currentUserRole} workspace
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50 ml-auto" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                {workspaces.map((userWorkspace) => {
                  const workspace = userWorkspace.workspaceId;
                  const isActive = currentWorkspace?._id === workspace._id;

                  return (
                    <DropdownMenuItem
                      key={workspace._id}
                      onClick={() => switchWorkspace(workspace._id)}
                      className={
                        isActive
                          ? "bg-blue-50 border-l-4 border-l-blue-500"
                          : ""
                      }
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback
                            className={
                              isActive
                                ? "bg-blue-600 text-white"
                                : "bg-orange-500 text-white"
                            }
                          >
                            {workspace.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {workspace.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {userWorkspace.role}
                          </p>
                        </div>
                        {isActive && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}

                {canCreateWorkspace && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowCreateWorkspaceModal(true)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Create New Workspace
                          </p>
                          <p className="text-xs text-blue-500">
                            Start a new project space
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center space-x-3">
            {canManageWorkspace && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center space-x-2 h-10"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
            )}

            {canInviteMembers && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteModal(true)}
                className="flex items-center space-x-2 h-10"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </Button>
            )}

            {canCreateProject && (
              <Button
                size="sm"
                onClick={() => setShowProjectModal(true)}
                className="flex items-center space-x-2 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
              <Badge variant="secondary" className="text-sm">
                {projects.length}{" "}
                {projects.length === 1 ? "project" : "projects"}
              </Badge>
            </div>
            {!canSeeAllProjects && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Eye className="w-4 h-4" />
                <span>Showing only projects you're part of</span>
              </div>
            )}
          </div>

          {projects.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200 hover:border-gray-300 transition-colors">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="grid grid-cols-2 gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-3 h-3 bg-gray-400 rounded-sm" />
                    ))}
                  </div>
                </div>
                <CardTitle className="text-xl mb-3 text-gray-900">
                  {canSeeAllProjects
                    ? "No Projects Yet"
                    : "No Projects Available"}
                </CardTitle>
                <CardDescription className="text-base mb-6 max-w-md mx-auto">
                  {canSeeAllProjects
                    ? "Transform your ideas into organized projects. Create your first project to get started with team collaboration."
                    : "No projects have been created in this workspace yet. Check back later or contact your admin."}
                </CardDescription>
                {canCreateProject && (
                  <Button
                    onClick={() => setShowProjectModal(true)}
                    size="lg"
                    className="h-12 px-8"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Project
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <Card
                  key={project._id}
                  className="hover:shadow-xl hover:scale-[1.02] transition-all duration-200 group border-0 shadow-md bg-white/80 backdrop-blur-sm"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <CardTitle
                        className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors min-w-0 flex-1 mr-3 cursor-pointer font-semibold"
                        onClick={() => navigate(`/project/${project._id}`)}
                      >
                        {project.title}
                      </CardTitle>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {canEditProject(project) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 shadow-lg"
                            >
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditProject(project, "title");
                                }}
                                className="flex items-center space-x-2 hover:bg-blue-50 transition-colors"
                              >
                                <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Edit Title</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditProject(project, "description");
                                }}
                                className="flex items-center space-x-2 hover:bg-blue-50 transition-colors"
                              >
                                <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Edit Description</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManageCategories(project);
                                }}
                                className="flex items-center space-x-2 hover:bg-purple-50 transition-colors"
                              >
                                <Users className="mr-2 h-4 w-4 text-purple-600" />
                                <span>Manage Categories</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setShowInviteToProjectModal(true);
                                }}
                                className="flex items-center space-x-2 hover:bg-green-50 transition-colors"
                              >
                                <UserPlus className="mr-2 h-4 w-4 text-green-600" />
                                <span>Invite to Project</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(project);
                                  setShowDeleteProjectAlert(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Project</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            memoizedStatusColor(project.status)
                          )}
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription
                      className="text-sm line-clamp-3 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors"
                      onClick={() => navigate(`/project/${project._id}`)}
                    >
                      {project.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent
                    className="pt-0 cursor-pointer"
                    onClick={() => navigate(`/project/${project._id}`)}
                  >
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                          <span className="font-medium">Progress</span>
                          <span className="font-semibold">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${memoizedProgressColor(project.progress)}`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="p-1.5 rounded-md bg-blue-100">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="truncate text-gray-600 font-medium">
                            {project.categories.reduce(
                              (total, cat) => total + cat.members.length,
                              0
                            )}{" "}
                            team members
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <div className="p-1.5 rounded-md bg-green-100">
                            <Calendar className="w-3.5 h-3.5 text-green-600" />
                          </div>
                          <span className="text-xs text-gray-600 font-medium">
                            {new Date(project.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {!canSeeAllProjects && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <Badge variant="outline" className="text-xs">
                            {project.creator._id === currentUserId
                              ? "Creator"
                              : "Team Member"}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            Created{" "}
                            {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={showEditProjectModal}
        onOpenChange={setShowEditProjectModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Edit className="w-5 h-5 text-white" />
              </div>
              <span>
                Edit{" "}
                {editingField === "title"
                  ? "Project Title"
                  : "Project Description"}
              </span>
            </DialogTitle>
            <DialogDescription>
              Update the {editingField} for{" "}
              <span className="font-semibold">"{selectedProject?.title}"</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateProject} className="space-y-6 mt-4">
            <div className="space-y-3">
              <Label
                htmlFor={`edit-${editingField}`}
                className="text-sm font-semibold text-gray-800"
              >
                {editingField === "title"
                  ? "Project Title"
                  : "Project Description"}
                {editingField === "title" && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              {editingField === "title" ? (
                <Input
                  id="edit-title"
                  required
                  value={editProjectData.title}
                  onChange={(e) =>
                    setEditProjectData({
                      ...editProjectData,
                      title: e.target.value,
                    })
                  }
                  placeholder="Enter project title"
                  className="h-12 text-base focus:ring-blue-500"
                />
              ) : (
                <Textarea
                  id="edit-description"
                  value={editProjectData.description}
                  onChange={(e) =>
                    setEditProjectData({
                      ...editProjectData,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Enter project description (optional)"
                  className="resize-none text-base focus:ring-blue-500"
                />
              )}
            </div>

            <div className="flex space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditProjectModal(false);
                  setSelectedProject(null);
                  setEditingField(null);
                }}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingUpdate}
                className="flex-1 h-11"
              >
                {submittingUpdate ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Update {editingField === "title" ? "Title" : "Description"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showManageCategoriesModal}
        onOpenChange={setShowManageCategoriesModal}
      >
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span>Manage Project Categories</span>
            </DialogTitle>
            <DialogDescription>
              View and manage categories for{" "}
              <span className="font-semibold">"{selectedProject?.title}"</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="grid gap-4">
              {selectedProject?.categories.map((category, index) => (
                <Card
                  key={index}
                  className="border-l-4 border-l-purple-500 shadow-sm"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-gray-900">
                        {category.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="bg-purple-100 text-purple-800"
                      >
                        {category.members.length}{" "}
                        {category.members.length === 1 ? "member" : "members"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {category.members.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            <Users className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                            No members assigned to this category
                          </div>
                        ) : (
                          category.members.map((member) => (
                            <div
                              key={member.userId._id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm">
                                    {member.userId.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {member.userId.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {member.userId.email}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-medium",
                                  member.role === "Lead"
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200"
                                )}
                              >
                                {member.role}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setSelectedProject(null);
                }}
                className="px-8 h-11"
              >
                <Check className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteProjectAlert}
        onOpenChange={setShowDeleteProjectAlert}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle className="text-lg">
                Delete Project?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-semibold">"{selectedProject?.title}"</span>?
              <br />
              <br />
              This action will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Archive the project and all its data</li>
                <li>Remove access for all team members</li>
                <li>Cannot be undone</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-6">
            <AlertDialogCancel
              className="flex-1 h-11"
              onClick={() => setSelectedProject(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={submittingDelete}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {submittingDelete ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Workspace Dialog */}
      <Dialog
        open={showCreateWorkspaceModal}
        onOpenChange={setShowCreateWorkspaceModal}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span>Create New Workspace</span>
            </DialogTitle>
            <DialogDescription>
              Create a workspace to organize your projects and team
              collaboration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="workspace-name"
                  className="text-sm font-semibold text-gray-800"
                >
                  Workspace Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workspace-name"
                  type="text"
                  required
                  value={newWorkspace.name}
                  onChange={(e) =>
                    setNewWorkspace({ ...newWorkspace, name: e.target.value })
                  }
                  placeholder="Enter workspace name"
                  className="h-12 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="workspace-description"
                  className="text-sm font-semibold text-gray-800"
                >
                  Description
                </Label>
                <Textarea
                  id="workspace-description"
                  value={newWorkspace.description}
                  onChange={(e) =>
                    setNewWorkspace({
                      ...newWorkspace,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe what this workspace will be used for..."
                  rows={3}
                  className="resize-none focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateWorkspaceModal(false);
                  setNewWorkspace({ name: "", description: "" });
                }}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingWorkspace}
                className="flex-1 h-11"
              >
                {submittingWorkspace ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workspace
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <span>Invite to Workspace</span>
            </DialogTitle>
            <DialogDescription>
              Invite a team member to join{" "}
              <span className="font-semibold">{currentWorkspace?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="invite-email"
                  className="text-sm font-semibold text-gray-800"
                >
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, email: e.target.value })
                  }
                  placeholder="Enter email address"
                  className="h-12 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="invite-role"
                  className="text-sm font-semibold text-gray-800"
                >
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={inviteData.role}
                  onValueChange={(value) =>
                    setInviteData({ ...inviteData, role: value })
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-medium">Member</span>
                          <p className="text-xs text-gray-500">
                            Basic workspace access
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="lead">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <div>
                          <span className="font-medium">Lead</span>
                          <p className="text-xs text-gray-500">
                            Can manage projects and tasks
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-purple-600" />
                        <div>
                          <span className="font-medium">Admin</span>
                          <p className="text-xs text-gray-500">
                            Full workspace management
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteModal(false)}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingInvite}
                className="flex-1 h-11"
              >
                {submittingInvite ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <span>Create New Project</span>
            </DialogTitle>
            <DialogDescription>
              Create a new project in{" "}
              <span className="font-semibold">{currentWorkspace?.name}</span>{" "}
              workspace
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-8 mt-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="project-title"
                  className="text-sm font-semibold text-gray-800"
                >
                  Project Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="project-title"
                  required
                  value={newProject.title}
                  onChange={(e) =>
                    setNewProject({ ...newProject, title: e.target.value })
                  }
                  placeholder="Enter project title"
                  className="h-12 text-base focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="project-description"
                  className="text-sm font-semibold text-gray-800"
                >
                  Description
                </Label>
                <Textarea
                  id="project-description"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Describe your project goals and objectives..."
                  className="resize-none text-base focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="project-status"
                  className="text-sm font-semibold text-gray-800"
                >
                  Status
                </Label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) =>
                    setNewProject({ ...newProject, status: value })
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12",
                        !newProject.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newProject.startDate ? (
                        format(newProject.startDate, "PPP")
                      ) : (
                        <span>Pick start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newProject.startDate}
                      onSelect={(date: Date | undefined) =>
                        setNewProject({ ...newProject, startDate: date })
                      }
                      disabled={(date: Date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-800">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12",
                        !newProject.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newProject.endDate ? (
                        format(newProject.endDate, "PPP")
                      ) : (
                        <span>Pick end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newProject.endDate}
                      onSelect={(date: Date | undefined) =>
                        setNewProject({ ...newProject, endDate: date })
                      }
                      disabled={(date: Date) => {
                        if (date < new Date("1900-01-01")) return true;
                        if (newProject.startDate && date < newProject.startDate)
                          return true;
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <Label className="text-base font-semibold text-gray-800">
                    Project Categories
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Organize your team into focused categories
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCategory}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              <div className="space-y-6">
                {newProject.categories.map((category, index) => (
                  <Card key={index} className="border-l-4 border-l-indigo-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Input
                          placeholder="Category name (e.g., Frontend, Backend, Design)"
                          value={category.name}
                          onChange={(e) =>
                            updateCategoryName(index, e.target.value)
                          }
                          className="flex-1 min-w-0 h-11 text-base"
                        />
                        {newProject.categories.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCategory(index)}
                            className="ml-3 text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {workspaceMembers.length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold text-gray-800 mb-3 block">
                            Assign Team Members:
                          </Label>
                          <ScrollArea className="h-44 w-full border rounded-lg p-3 bg-gray-50">
                            <div className="space-y-3">
                              {workspaceMembers.map((member) => {
                                const isSelected = selectedMembersWithRoles[
                                  index
                                ]?.some((m) => m.member._id === member._id);
                                const currentRole =
                                  selectedMembersWithRoles[index]?.find(
                                    (m) => m.member._id === member._id
                                  )?.role || "member";

                                return (
                                  <div
                                    key={member._id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-white transition-colors bg-white"
                                  >
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => {
                                          if (isSelected) {
                                            toggleMemberSelection(
                                              index,
                                              member
                                            );
                                          } else {
                                            toggleMemberSelection(
                                              index,
                                              member,
                                              "member"
                                            );
                                          }
                                        }}
                                        className="flex-shrink-0"
                                      />
                                      <Avatar className="w-8 h-8">
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                          {member.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0 flex-1">
                                        <Label className="text-sm font-semibold truncate block cursor-pointer">
                                          {member.name}
                                        </Label>
                                        <span className="text-xs text-gray-500 truncate block">
                                          {member.email}
                                        </span>
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <Select
                                        value={currentRole}
                                        onValueChange={(
                                          value: "lead" | "member"
                                        ) => {
                                          const currentMembers =
                                            selectedMembersWithRoles[index] ||
                                            [];
                                          const updatedMembers =
                                            currentMembers.map((m) =>
                                              m.member._id === member._id
                                                ? { ...m, role: value }
                                                : m
                                            );
                                          setSelectedMembersWithRoles({
                                            ...selectedMembersWithRoles,
                                            [index]: updatedMembers,
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="w-24 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="member">
                                            Member
                                          </SelectItem>
                                          <SelectItem value="lead">
                                            Lead
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>

                          {selectedMembersWithRoles[index] &&
                            selectedMembersWithRoles[index].length > 0 &&
                            !selectedMembersWithRoles[index].some(
                              (m) => m.role === "lead"
                            ) && (
                              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                                  <span className="text-sm text-yellow-800 font-medium">
                                    Warning: This category needs at least one
                                    lead member
                                  </span>
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProjectModal(false)}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingProject}
                className="flex-1 h-11"
              >
                {submittingProject ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <span>Workspace Settings</span>
            </DialogTitle>
            <DialogDescription>
              Manage your workspace settings and permissions
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={settingsTab}
            onValueChange={(value) => setSettingsTab(value as any)}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-4 h-11">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="transfer" disabled={!isOwner}>
                Transfer
              </TabsTrigger>
              <TabsTrigger value="danger">Danger Zone</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-8">
              <form onSubmit={handleUpdateWorkspace} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-workspace-name"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Workspace Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-workspace-name"
                    required
                    value={editWorkspace.name}
                    onChange={(e) =>
                      setEditWorkspace({
                        ...editWorkspace,
                        name: e.target.value,
                      })
                    }
                    placeholder="Workspace name"
                    className="h-12 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-workspace-description"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="edit-workspace-description"
                    value={editWorkspace.description}
                    onChange={(e) =>
                      setEditWorkspace({
                        ...editWorkspace,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                    placeholder="Workspace description..."
                    className="resize-none focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={submittingSettings}
                    className="px-8 h-11"
                  >
                    {submittingSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Update Workspace
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="members" className="space-y-6 mt-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Team Members
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    {workspaceMembers.length} members
                  </Badge>
                </div>

                <ScrollArea className="h-80 w-full border rounded-lg p-4 bg-gray-50">
                  <div className="space-y-3">
                    {workspaceMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-white transition-colors bg-white"
                      >
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate text-gray-900">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {member.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className="capitalize font-medium"
                          >
                            {member.role}
                          </Badge>

                          {canManageWorkspace &&
                            member._id !== currentUserId && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleChangeMemberRole(
                                        member._id,
                                        member.name,
                                        "member"
                                      )
                                    }
                                  >
                                    <Users className="mr-2 h-4 w-4" />
                                    Make Member
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleChangeMemberRole(
                                        member._id,
                                        member.name,
                                        "lead"
                                      )
                                    }
                                  >
                                    <Crown className="mr-2 h-4 w-4" />
                                    Make Lead
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleChangeMemberRole(
                                        member._id,
                                        member.name,
                                        "admin"
                                      )
                                    }
                                  >
                                    <Settings className="mr-2 h-4 w-4" />
                                    Make Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleRemoveMember(
                                        member._id,
                                        member.name
                                      )
                                    }
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Remove Member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="space-y-6 mt-8">
              {isOwner ? (
                <form onSubmit={handleTransferWorkspace} className="space-y-6">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-semibold text-base mb-2">
                          Transfer Ownership
                        </p>
                        <p className="leading-relaxed">
                          This action will transfer full ownership of this
                          workspace to another member. You will lose owner
                          privileges and this action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="new-owner"
                      className="text-sm font-semibold text-gray-800"
                    >
                      Select New Owner <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={selectedNewOwner}
                      onValueChange={(value) => setSelectedNewOwner(value)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Choose a member to transfer ownership to" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaceMembers
                          .filter((member) => member._id !== currentUserId)
                          .map((member) => (
                            <SelectItem key={member._id} value={member._id}>
                              <div className="flex items-center space-x-3">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                                    {member.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-medium">
                                    {member.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="ml-2 text-xs capitalize"
                                  >
                                    {member.role}
                                  </Badge>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="demote-current-owner"
                      checked={demoteCurrentOwner}
                      onCheckedChange={(checked) =>
                        setDemoteCurrentOwner(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="demote-current-owner"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Demote me to Lead role (instead of Admin role)
                    </Label>
                  </div>

                  <div className="flex justify-end pt-6 border-t">
                    <Button
                      type="submit"
                      disabled={submittingSettings || !selectedNewOwner}
                      variant="destructive"
                      className="px-8 h-11"
                    >
                      {submittingSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Transferring...
                        </>
                      ) : (
                        <>
                          <Crown className="w-4 h-4 mr-2" />
                          Transfer Ownership
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                  <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">
                    Only workspace owners can transfer ownership.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="danger" className="space-y-6 mt-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold text-base mb-2">
                      Delete Workspace
                    </p>
                    <p className="leading-relaxed">
                      This action will archive the workspace and all its data.
                      The workspace will be permanently deleted in 7 days unless
                      restored. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleDeleteWorkspace} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="delete-confirmation"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Type the workspace name to confirm deletion{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder={currentWorkspace?.name}
                    className="border-red-300 focus:border-red-500 focus:ring-red-500 h-12"
                  />
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={
                      submittingSettings ||
                      deleteConfirmation !== currentWorkspace?.name
                    }
                    variant="destructive"
                    className="px-8 h-11"
                  >
                    {submittingSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Workspace
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkspacePage;
