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
import { toast } from "sonner";

interface InviteMembersButtonProps {
  projectId: string;
  // Optional categories prop to align with usage in project-detail
  categories?: Array<{
    name: string;
    members: Array<{
      userId: { _id: string; name: string; email: string };
      role: string;
    }>;
  }>;
  onInviteSuccess?: () => void | Promise<void>;
}

export function InviteMembersButton({
  projectId,
  onInviteSuccess
}: InviteMembersButtonProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setError(null);
    setSuccess(null);
  };

  const handleSendInvite = async () => {
    // Validation
    if (!email || !email.includes('@')) {
      setError("Please enter a valid email address");
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await postData(`/project/${projectId}/members`, {
        memberEmail: email
      });

      const successMsg = res?.message || 'Employee added successfully!';
      setSuccess(successMsg);
      toast.success(successMsg);
      setEmail("");

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

  return (
    <>
      <button
        onClick={handleInviteClick}
        className="bg-[rgba(4,1,16,0.05)] box-border flex items-center gap-[10px] px-[15px] py-[10px] rounded-[8px] cursor-pointer border-none hover:bg-[rgba(4,1,16,0.08)] transition-colors"
      >
        <UserPlus className="w-[15px] h-[15px] text-[#040110]" strokeWidth={2} />
        <span className="font-['Inter'] font-medium text-[14px] text-[#040110] whitespace-nowrap">
          Add employee
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
            {/* Email Input */}
            <div>
              <label className="text-[14px] font-medium font-['Inter'] text-[#040110] mb-1.5 block">
                Email<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter workspace employee email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3a5afe] text-[14px] font-['Inter']"
                disabled={loading}
              />
              <p className="text-[12px] font-normal font-['Inter'] text-[#717680] mt-1">
                Employee must already be part of the workspace
              </p>
            </div>

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
