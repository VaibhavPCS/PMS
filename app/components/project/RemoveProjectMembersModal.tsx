import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserX } from "lucide-react";
import { deleteData } from "@/lib/fetch-util";
import { toast } from "sonner";

interface UserRef {
  _id: string;
  name: string;
  email: string;
}

interface ProjectMember {
  userId: UserRef;
  role?: string;
}

interface RemoveProjectMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectHead?: UserRef | null;
  members?: ProjectMember[];
  onRemoveSuccess?: () => Promise<void> | void;
}

const getErrorMessage = (error: any, fallback?: string): string => {
  const backendMsg = error?.response?.data?.message;
  const status = error?.response?.status;
  const code = error?.code;
  if (backendMsg) return backendMsg;
  if (code === 'ERR_NETWORK') return 'Network error. Check your connection or server availability.';
  if (status === 403) return 'Only project head or admin can remove members';
  if (status === 404) return 'Project not found';
  if (status === 400) return 'Cannot remove project head from project';
  if (status === 500) return 'Internal Server Error';
  return fallback || 'Failed to remove member';
};

export const RemoveProjectMembersModal: React.FC<RemoveProjectMembersModalProps> = ({
  open,
  onOpenChange,
  projectId,
  projectHead,
  members = [],
  onRemoveSuccess,
}) => {
  const [query, setQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const allMembers = useMemo(() => {
    const list: Array<{ _id: string; name: string; email: string; isHead?: boolean }> = [];
    if (projectHead?._id) {
      list.push({ _id: projectHead._id, name: projectHead.name, email: projectHead.email, isHead: true });
    }
    for (const m of members) {
      const u = m?.userId;
      if (u?._id && !list.some(x => x._id === u._id)) {
        list.push({ _id: u._id, name: u.name, email: u.email });
      }
    }
    return list;
  }, [projectHead, members]);

  const filteredMembers = useMemo(() => {
    if (!query.trim()) return allMembers;
    const q = query.toLowerCase();
    return allMembers.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [allMembers, query]);

  const handleRemove = async (memberId: string, isHead?: boolean) => {
    if (isHead) {
      return toast.error('Cannot remove project head from project');
    }
    try {
      setRemovingId(memberId);
      const res = await deleteData(`/project/${projectId}/members`, { memberId });
      toast.success(res?.message || 'Member removed successfully');
      if (onRemoveSuccess) await onRemoveSuccess();
      // Keep modal open so user can remove multiple members; do not close automatically
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Project Members</DialogTitle>
          <DialogDescription>
            Remove employees from this project. Project head cannot be removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 text-sm"
          />

          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {filteredMembers.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">No matching employees</div>
              ) : (
                filteredMembers.map((m) => (
                  <div key={m._id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {(m.name?.charAt(0) || m.email?.charAt(0) || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {m.name} {m.isHead && <span className="ml-1 text-[10px] text-blue-600">(Project Head)</span>}
                        </div>
                        <div className="text-xs text-gray-600">{m.email}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!m.isHead || removingId === m._id}
                      onClick={() => handleRemove(m._id, m.isHead)}
                      className={m.isHead ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      {removingId === m._id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveProjectMembersModal;