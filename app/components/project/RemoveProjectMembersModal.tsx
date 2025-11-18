import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserX } from "lucide-react";
import { deleteData, patchData } from "@/lib/fetch-util";
import { toast } from "sonner";

interface UserRef {
  _id: string;
  name: string;
  email: string;
}

interface ProjectMember {
  userId: UserRef;
  role?: string;
  reportsTo?: string;
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
    const list: Array<{ _id: string; name: string; email: string; isHead?: boolean; role?: string; reportsTo?: string }> = [];
    if (projectHead?._id) {
      list.push({ _id: projectHead._id, name: projectHead.name, email: projectHead.email, isHead: true, role: 'project-head' });
    }
    for (const m of members) {
      const u = m?.userId;
      if (u?._id && !list.some(x => x._id === u._id)) {
        list.push({ _id: u._id, name: u.name, email: u.email, role: m.role, reportsTo: m.reportsTo });
      }
    }
    return list;
  }, [projectHead, members]);

  const filteredMembers = useMemo(() => {
    if (!query.trim()) return allMembers;
    const q = query.toLowerCase();
    return allMembers.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [allMembers, query]);

  const [editing, setEditing] = useState<{ _id: string; name: string; email: string; role?: string; reportsTo?: string } | null>(null);
  const [editRole, setEditRole] = useState<string>('member');
  const [editReportsTo, setEditReportsTo] = useState<string>('');

  const reportingOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string }> = [];
    if (projectHead?._id) {
      opts.push({ id: projectHead._id, label: `${projectHead.name || projectHead.email} (Project Head)` });
    }
    (members || []).forEach(m => {
      if ((m.role || 'member') === 'tl') {
        opts.push({ id: m.userId._id, label: `${m.userId.name || m.userId.email} (TL)` });
      }
    });
    return opts;
  }, [projectHead, members]);

  const openEdit = (m: { _id: string; name: string; email: string; role?: string; reportsTo?: string }) => {
    setEditing(m);
    setEditRole(m.role || 'member');
    setEditReportsTo(m.reportsTo || '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editReportsTo) { toast.error('Reporting is required'); return; }
    try {
      const res = await patchData(`/projects/${projectId}/members/${editing._id}`, { role: editRole, reportsTo: editReportsTo });
      toast.success((res as any)?.message || 'Member updated');
      setEditing(null);
      if (onRemoveSuccess) await onRemoveSuccess();
    } catch (e: any) {
      toast.error(getErrorMessage({ response: { data: { message: e.message } } }, 'Failed to update'));
    }
  };

  const handleRemove = async (memberId: string, isHead?: boolean) => {
    if (isHead) {
      return toast.error('Cannot remove project head from project');
    }
    try {
      setRemovingId(memberId);
      const res = await deleteData(`/projects/${projectId}/members`, { memberId });
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
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => !m.isHead && openEdit(m)}>
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
                        {m.role && (
                          <div className="text-[10px] text-gray-500 mt-0.5">Role: {m.role}</div>
                        )}
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
        {editing && (
          <Dialog open={!!editing} onOpenChange={(o)=>!o && setEditing(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
                <DialogDescription>Change role and reporting. Email cannot be modified.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <Input value={editing.email} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <select className="w-full border rounded h-9 px-2" value={editRole} onChange={e=>setEditRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="tl">TL</option>
                    <option value="trainee">Trainee</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Reporting</label>
                  <select className="w-full border rounded h-9 px-2" value={editReportsTo} onChange={e=>setEditReportsTo(e.target.value)}>
                    <option value="">Select reporting user</option>
                    {reportingOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button>
                  <Button onClick={saveEdit}>Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RemoveProjectMembersModal;