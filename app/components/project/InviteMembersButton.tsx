import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { fetchData, postData } from "@/lib/fetch-util";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

interface InviteMembersButtonProps {
  projectId: string;
  // Optional workspaceId to avoid relying only on localStorage
  workspaceId?: string;
  // Optional categories prop to align with usage in project-detail
  categories?: Array<{
    name: string;
    members: Array<{
      userId: { _id: string; name: string; email: string };
      role: string;
    }>;
  }>;
  onInviteSuccess?: () => void | Promise<void>;
  // Optional customization props for different contexts (e.g., mobile)
  buttonClassName?: string;
  buttonText?: string;
  iconSize?: string;
}

export function InviteMembersButton({
  projectId,
  workspaceId: propWorkspaceId,
  onInviteSuccess,
  buttonClassName,
  buttonText = "Add employee",
  iconSize = "w-[15px] h-[15px]"
}: InviteMembersButtonProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [role, setRole] = useState<string>("member");
  const [reportsTo, setReportsTo] = useState<string>("");
  const [tls, setTls] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [projectHead, setProjectHead] = useState<{ _id: string; name: string; email: string } | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string>("");

  // Consistent error message extraction for API failures
  const getErrorMessage = (error: any, fallback: string, specific?: Record<number, string>) => {
    const status = error?.response?.status as number | undefined;
    const backendMessage = error?.response?.data?.message as string | undefined;
    if (backendMessage) return backendMessage;
    if (error?.code === 'ERR_NETWORK') return 'Network error. Please check your connection.';
    if (specific && status && specific[status]) return specific[status];
    if (status === 401) return 'Unauthorized. Please sign in again.';
    if (status === 404) return 'Project or employee not found in workspace';
    if (status === 403) return 'Only project head or admin can add members';
    if (status === 500) return 'Server error. Please try again later.';
    if (status === 400) return 'Employee is already part of this project';
    return error?.message || fallback;
  };

  const handleInviteClick = () => {
    setShowInviteDialog(true);
    setEmail("");
    setSelectedMemberEmail("");
    setError(null);
    setSuccess(null);
    setRole("member");
    setReportsTo("");
    fetchProjectTls();
    fetchWorkspaceMembers();
  };

  const fetchProjectTls = async () => {
    try {
      const res = await fetchData(`/projects/${projectId}`);
      const proj = res?.project || {};
      const members = (proj?.members || []) as Array<{ userId: { _id: string; name: string; email: string }, role?: string }>;
      const tlMembers = members.filter(m => (m.role || 'member') === 'tl').map(m => ({ _id: m.userId._id, name: m.userId.name, email: m.userId.email }));
      setTls(tlMembers);
      if (proj?.projectHead?._id) {
        setProjectHead({ _id: proj.projectHead._id, name: proj.projectHead.name, email: proj.projectHead.email });
      } else {
        setProjectHead(null);
      }
    } catch {
      setTls([]);
      setProjectHead(null);
    }
  };

  const fetchWorkspaceMembers = async () => {
    try {
      // Use prop workspaceId first, then fall back to localStorage
      const workspaceId = propWorkspaceId || localStorage.getItem("currentWorkspaceId");
      if (!workspaceId) {
        console.warn("No workspace ID found in props or localStorage");
        setWorkspaceMembers([]);
        return;
      }

      // console.log(`Fetching workspace members for workspace ID: ${workspaceId}`);
      const response = await fetchData(`/workspace/${workspaceId}`);
      // console.log("Workspace API response:", response);

      const workspace = response?.workspace || response;
      const members = workspace?.members || [];

      // console.log(`Found ${members.length} workspace members`);
      const mappedMembers = members.map((member: any) => ({
        _id: member.userId?._id || member.userId,
        name: member.userId?.name || 'Unknown',
        email: member.userId?.email || ''
      })).filter((member: any) => member.email);

      // console.log(`Filtered to ${mappedMembers.length} members with email addresses`);
      setWorkspaceMembers(mappedMembers);
    } catch (error) {
      console.error("Error fetching workspace members:", error);
      // If we can't fetch workspace members, just show an empty dropdown
      // The user can still manually type the email if needed
      setWorkspaceMembers([]);
    }
  };

  const handleSendInvite = async () => {
    // Validation
    if (!selectedMemberEmail || !selectedMemberEmail.includes('@')) {
      setError("Please select a workspace member");
      toast.error("Please select a workspace member");
      return;
    }

    if (!reportsTo) {
      setError("Please select Reporting (Project Head or TL)");
      toast.error("Please select Reporting (Project Head or TL)");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await postData(`/projects/${projectId}/members`, {
        memberEmail: selectedMemberEmail,
        role,
        reportsTo: reportsTo || undefined
      });

      const successMsg = res?.message || 'Employee added successfully!';
      setSuccess(successMsg);
      toast.success(successMsg);
      setSelectedMemberEmail("");

      // Wait a bit to show success message
      setTimeout(() => {
        setShowInviteDialog(false);
        if (onInviteSuccess) {
          onInviteSuccess();
        }
      }, 800);

    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to add employee', {
        403: 'Only project head or admin can add members',
        404: 'Project or employee not found in workspace',
        400: 'Employee is already part of this project',
      });
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Use custom button if className is provided (e.g., for mobile)
  const defaultButtonClass = "bg-[rgba(4,1,16,0.05)] box-border flex items-center gap-[10px] px-[15px] py-[10px] rounded-[8px] cursor-pointer border-none hover:bg-[rgba(4,1,16,0.08)] transition-colors";

  return (
    <>
      <button
        onClick={handleInviteClick}
        className={buttonClassName || defaultButtonClass}
      >
        <UserPlus className={`${iconSize} ${buttonClassName ? '' : 'text-[#040110]'}`} strokeWidth={2} />
        <span className={buttonClassName ? '' : "font-['Inter'] font-medium text-[14px] text-[#040110] whitespace-nowrap"}>
          {buttonText}
        </span>
      </button>

      {/* Add Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-[#E5EFFF] p-3 rounded-lg">
                <UserPlus className="w-6 h-6 text-[#3a5afe]" />
              </div>
              <div>
                <DialogTitle className="text-[18px] font-semibold font-['Inter']">
                  Add Employee to Project
                </DialogTitle>
                <DialogDescription className="text-[14px] text-gray-500 font-['Inter'] mt-1">
                  Add a workspace employee to this project
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Workspace Member Selector */}
            <div>
              <label className="text-[14px] font-medium font-['Inter'] text-[#040110] mb-1.5 block">
                Select Employee<span className="text-red-500">*</span>
              </label>
              <Select value={selectedMemberEmail} onValueChange={setSelectedMemberEmail}>
                <SelectTrigger className="h-10 w-full border border-gray-300 rounded-lg px-3 text-[14px] font-['Inter']" disabled={workspaceMembers.length === 0}>
                  <SelectValue placeholder={workspaceMembers.length === 0 ? "No workspace members found" : "Select a workspace employee"} />
                </SelectTrigger>
                <SelectContent className="font-['Inter']">
                  {workspaceMembers.map((member) => (
                    <SelectItem key={member._id} value={member.email} className="text-[14px]">
                      {member.name} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[12px] font-normal font-['Inter'] text-[#717680] mt-1">
                Employee must already be part of the workspace
              </p>
            </div>

            {/* Role Selector */}
            <div>
              <label className="text-[14px] font-medium font-['Inter'] text-[#040110] mb-1.5 block">
                Role<span className="text-red-500">*</span>
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-10 w-full border border-gray-300 rounded-lg px-3 text-[14px] font-['Inter']">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="font-['Inter']">
                  <SelectItem value="member" className="text-[14px]">Employee</SelectItem>
                  <SelectItem value="tl" className="text-[14px]">TL</SelectItem>
                  <SelectItem value="trainee" className="text-[14px]">Trainee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reporting Selector */}
            {(
              <div>
                <label className="text-[14px] font-medium font-['Inter'] text-[#040110] mb-1.5 block">
                  Reporting <span className="text-red-500">*</span>
                </label>
                <Select value={reportsTo} onValueChange={setReportsTo}>
                  <SelectTrigger className="h-10 w-full border border-gray-300 rounded-lg px-3 text-[14px] font-['Inter']">
                    <SelectValue placeholder="Select reporting user" />
                  </SelectTrigger>
                  <SelectContent className="font-['Inter']">
                    {/* Project Head option */}
                    {projectHead && (
                      <SelectItem value={projectHead._id} className="text-[14px]">
                        {projectHead.name || projectHead.email} (Project Head)
                      </SelectItem>
                    )}
                    {/* TL options */}
                    {tls.length > 0 ? (
                      tls.map(tl => (
                        <SelectItem key={tl._id} value={tl._id} className="text-[14px]">
                          {tl.name} ({tl.email}) (TL)
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-[12px] text-gray-500">No TLs in this project</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Error Message */}
            {/* {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )} */}

            {/* Success Message */}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                {success}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={loading}
              className="font-['Inter']"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={loading}
              className="bg-[#f2761b] hover:bg-[#d96816] text-white font-['Inter']"
            >
              {loading ? "Adding..." : "Add Employee"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
