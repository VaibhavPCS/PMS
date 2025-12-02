import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserX } from "lucide-react";
import { deleteData, patchData, fetchData } from "@/lib/fetch-util";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserRef {
  _id: string;
  name: string;
  email: string;
}

interface ProjectMember {
  userId: UserRef;
  role?: string;
  reportsTo?: string | UserRef;  // Can be ID string or populated object
}

interface RemoveProjectMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectHead?: UserRef | null;
  members?: ProjectMember[];
  onRemoveSuccess?: () => Promise<void> | void;
  userRole?: string;  // User's workspace role for permission checks
  currentUserId?: string;  // Current user's ID to check if they're project head
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
  userRole = '',
  currentUserId = '',
}) => {
  const [query, setQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [migrationData, setMigrationData] = useState<{ tasks: any[], subordinates: any[], memberName: string }>({ tasks: [], subordinates: [], memberName: '' });
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  const allMembers = useMemo(() => {
    const list: Array<{ _id: string; name: string; email: string; isHead?: boolean; role?: string; reportsTo?: string; reportsToName?: string }> = [];
    if (projectHead?._id) {
      list.push({ _id: projectHead._id, name: projectHead.name, email: projectHead.email, isHead: true, role: 'project-head' });
    }
    for (const m of members) {
      const u = m?.userId;
      if (u?._id && !list.some(x => x._id === u._id)) {
        // Handle reportsTo as either string ID or populated object
        const reportsToId = typeof m.reportsTo === 'string' ? m.reportsTo : m.reportsTo?._id;
        const reportsToName = typeof m.reportsTo === 'object' && m.reportsTo ? m.reportsTo.name : undefined;
        list.push({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: m.role,
          reportsTo: reportsToId,
          reportsToName: reportsToName
        });
      }
    }
    return list;
  }, [projectHead, members]);

  const filteredMembers = useMemo(() => {
    if (!query.trim()) return allMembers;
    const q = query.toLowerCase();
    return allMembers.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [allMembers, query]);

  const [editing, setEditing] = useState<{ _id: string; name: string; email: string; role?: string; reportsTo?: string; reportsToName?: string } | null>(null);
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

  // Check if current user can edit members
  const canEditMembers = () => {
    // Check if user is project head
    const isProjectHead = projectHead?._id === currentUserId;
    // Check workspace role
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isOwner = userRole === 'owner';
    const isLead = userRole === 'lead' || userRole === 'head';

    return isProjectHead || isAdmin || isOwner || isLead;
  };

  const openEdit = (m: { _id: string; name: string; email: string; role?: string; reportsTo?: string; reportsToName?: string }) => {
    // Check permissions before opening edit dialog
    if (!canEditMembers()) {
      toast.error('Only project lead, admin, or workspace owner can edit members');
      return;
    }

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

    setRemovingId(memberId);
    try {
      // Check for dependencies (tasks and subordinates)
      const tasksRes = await fetchData(`/task/project/${projectId}`);
      const tasks = tasksRes.tasks || [];
      // Only block if tasks are 'todo', 'in_progress', or pending approval
      const userTasks = tasks.filter((t: any) => 
        (t.assignedTo?._id === memberId || t.assignedTo === memberId) && 
        (['todo', 'to-do', 'in_progress', 'in-progress'].includes(t.status) || t.approvalStatus === 'pending-approval')
      );
      
      const subordinates = members.filter(m => m.reportsTo === memberId);
      
      if (userTasks.length > 0 || subordinates.length > 0) {
        const member = allMembers.find(m => m._id === memberId);
        setMigrationData({
          tasks: userTasks,
          subordinates: subordinates,
          memberName: member?.name || 'User'
        });
        setPendingRemovalId(memberId);
        setShowMigration(true);
        setRemovingId(null);
        return;
      }

      // No dependencies, proceed with removal
      const res = await deleteData(`/projects/${projectId}/members`, { memberId });
      toast.success(res?.message || 'Member removed successfully');
      if (onRemoveSuccess) await onRemoveSuccess();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemovingId(null);
    }
  };

  const handleMigrateAndRemove = async () => {
    if (!newAssignee) {
      toast.error("Please select a new assignee");
      return;
    }
    if (!pendingRemovalId) return;

    setMigrating(true);
    try {
      // 1. Reassign tasks
      if (migrationData.tasks.length > 0) {
        await Promise.all(migrationData.tasks.map(task =>
          patchData(`/task/${task._id}`, { assignedTo: newAssignee })
        ));
      }

      // 2. Reassign subordinates
      if (migrationData.subordinates.length > 0) {
        await Promise.all(migrationData.subordinates.map(sub =>
          patchData(`/projects/${projectId}/members/${sub.userId._id}`, {
            role: sub.role,
            reportsTo: newAssignee
          })
        ));
      }

      // 3. Remove user
      const res = await deleteData(`/projects/${projectId}/members`, { memberId: pendingRemovalId });
      toast.success(`Migrated and removed ${migrationData.memberName} successfully`);

      setShowMigration(false);
      setPendingRemovalId(null);
      setNewAssignee("");
      if (onRemoveSuccess) await onRemoveSuccess();
    } catch (error: any) {
      console.error("Migration failed:", error);
      toast.error("Failed to migrate and remove. Please try again.");
    } finally {
      setMigrating(false);
    }
  };

  const renderMigrationContent = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <span className="font-semibold">{migrationData.memberName}</span> cannot be removed yet because they have:
          </p>
          <ul className="list-disc list-inside pl-2 mb-4">
            {migrationData.tasks.length > 0 && (
              <li>{migrationData.tasks.length} active tasks (Todo/In Progress/Pending Approval)</li>
            )}
            {migrationData.subordinates.length > 0 && (
              <li>{migrationData.subordinates.length} subordinates reporting to them</li>
            )}
          </ul>
          <p className="mb-2 font-medium text-red-600">
            Please manually reassign these responsibilities before removing the member.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowMigration(false);
              setPendingRemovalId(null);
            }}
          >
            Close
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setShowMigration(false);
        setPendingRemovalId(null);
        setNewAssignee("");
      }
      onOpenChange(o);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showMigration ? "Migration Required" : "Manage Project Members"}
          </DialogTitle>
          <DialogDescription>
            {showMigration
              ? "You must reassign responsibilities before removing this member."
              : "Remove employees from this project. Project head cannot be removed."}
          </DialogDescription>
        </DialogHeader>

        {showMigration ? renderMigrationContent() : (
          <div className="space-y-3">
            <Input
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 text-sm"
            />

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {filteredMembers.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-4">No matching employees</div>
                ) : (
                  filteredMembers.map((m) => (
                    <div key={m._id} className="flex items-center justify-between p-2 border rounded-md">
                      <div
                        className={`flex items-center gap-3 ${!m.isHead && canEditMembers() ? 'cursor-pointer hover:bg-accent/30 rounded-md p-1 -m-1' : ''}`}
                        onClick={() => !m.isHead && canEditMembers() && openEdit(m)}
                      >
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
                          <div className="flex items-center gap-3 mt-0.5">
                            {m.role && (
                              <div className="text-[10px] text-gray-500">Role: {m.role}</div>
                            )}
                            {m.reportsTo && (
                              <div className="text-[10px] text-blue-600">
                                Reports to: {m.reportsToName || allMembers.find(mem => mem._id === m.reportsTo)?.name || 'Unknown'}
                              </div>
                            )}
                          </div>
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
        )}
        {editing && (
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
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
                  <select className="w-full border rounded h-9 px-2" value={editRole} onChange={e => setEditRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="tl">TL</option>
                    <option value="trainee">Trainee</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Reporting</label>
                  <select className="w-full border rounded h-9 px-2" value={editReportsTo} onChange={e => setEditReportsTo(e.target.value)}>
                    <option value="">Select reporting user</option>
                    {reportingOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
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
