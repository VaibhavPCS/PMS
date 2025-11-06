import React, { useEffect, useState } from 'react';
// UI note: The 'viewer' role is supported by the backend for existing users,
// but intentionally hidden in the UI. New invites cannot select 'viewer'.
// Existing viewer users still display with read-only capabilities.
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { fetchData, postData, deleteData, patchData, putData } from '@/lib/fetch-util';
import { Settings, UserPlus, Users, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../../provider/auth-context';

interface WorkspaceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  workspace: { _id: string; name: string; description?: string } | null;
  // Notifies parent to reflect changes instantly (name/description)
  onWorkspaceUpdated?: (ws: { _id: string; name: string; description?: string }) => void;
}

interface MemberItem {
  _id: string;
  name: string;
  email: string;
  role: string;
}

// Role descriptions help explain capabilities beneath the role selector.
// Include 'viewer' here so existing viewer roles render meaningful text,
// even though the viewer option is not selectable in the UI.
const roleDescriptions: Record<string, string> = {
  owner: 'Full control over workspace settings and membership.',
  admin: 'Manage employees and roles; create and delete projects.',
  // head renamed to lead in UI; keep backend role compatibility if present
  head: 'Leads projects in the workspace; shown as Lead in UI.',
  lead: 'Coordinate employees and workflows within projects.',
  member: 'Collaborate on projects and tasks within the workspace (Employee).',
  viewer: 'Read-only access to projects and tasks.',
};

export function WorkspaceSettingsModal({ open, onClose, workspace, onWorkspaceUpdated }: WorkspaceSettingsModalProps) {
  const { user } = useAuth();
  const workspaceId = workspace?._id;

  const [activeTab, setActiveTab] = useState<string>('general');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [generalName, setGeneralName] = useState('');
  const [generalDescription, setGeneralDescription] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  // Note: 'viewer' remains in the type/API payload for backward compatibility,
  // but the viewer option is intentionally not presented to users.
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'lead' | 'viewer' | 'head'>('member');
  const [inviting, setInviting] = useState(false);

  const [deleting, setDeleting] = useState(false);
  
  // Determine current user's role within this workspace for permission gating
  const currentUserRole = members.find((m) => m._id === user?._id)?.role || 'member';
  

  useEffect(() => {
    if (open && workspaceId) {
      loadWorkspaceDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspaceId]);

  const loadWorkspaceDetails = async () => {
    setLoadingMembers(true);
    try {
      const res = await fetchData(`/workspace/${workspaceId}`);
      const ws = res.workspace;
      setGeneralName(ws?.name || workspace?.name || '');
      setGeneralDescription(ws?.description || workspace?.description || '');
      const memberItems: MemberItem[] = (ws?.members || []).map((m: any) => ({
        _id: m.userId?._id || m.userId,
        name: m.userId?.name || 'Unknown',
        email: m.userId?.email || '',
        role: m.role || 'member',
      }));
      setMembers(memberItems);
    } catch (error: any) {
      console.error('Failed to load workspace details', error);
      toast.error(error?.message || 'Failed to load workspace details');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleUpdateWorkspace = async () => {
    const name = generalName.trim();
    if (!name) {
      toast.error('Workspace name is required');
      return;
    }
    if (!workspaceId) return;
    setSavingGeneral(true);
    try {
      const res = await putData(`/workspace/${workspaceId}`, { name, description: generalDescription.trim() });
      toast.success(res?.message || 'Workspace updated');
      // Inform parent so workspace name/description updates immediately in UI
      onWorkspaceUpdated?.({ _id: workspaceId as string, name, description: generalDescription.trim() });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update workspace');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    if (!workspaceId) return;

    setInviting(true);
    try {
      const res = await postData(`/workspace/${workspaceId}/invite`, { email, role: inviteRole });
      toast.success(res?.message || 'Invitation sent');
      setInviteEmail('');
      await loadWorkspaceDetails();
    } catch (error: any) {
      // Prefer backend-provided error message for clarity (e.g., 404/403/400)
      const message =
        error?.response?.data?.message ||
        (error?.response?.status === 404
          ? 'Workspace or user not found'
          : undefined) ||
        error?.message ||
        'Failed to send invite';
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: MemberItem, newRole: 'member' | 'admin' | 'lead' | 'viewer' | 'head') => {
    if (!workspaceId) return;
    if (member.role === 'owner') {
      toast.error('Cannot change role of owner');
      return;
    }
    try {
      const res = await patchData(`/workspace/${workspaceId}/members/${member._id}/role`, { newRole });
      toast.success(res?.message || 'Role updated');
      setMembers((prev) => prev.map((m) => (m._id === member._id ? { ...m, role: newRole } : m)));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update role');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;
    const confirmRemove = window.confirm(`Delete workspace "${generalName || workspace?.name || ''}"? This action cannot be undone.`);
    if (!confirmRemove) return;
    setDeleting(true);
    try {
      const res = await deleteData(`/workspace/${workspaceId}`);
      toast.success(res?.message || 'Workspace deleted');
      onClose();
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete workspace');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveMember = async (member: MemberItem) => {
    if (!workspaceId) return;
    // Block owner removal at UI level; backend also enforces this
    if (member.role === 'owner') {
      toast.error('Cannot remove the owner. Transfer ownership first.');
      return;
    }
    if (currentUserRole !== 'owner' && currentUserRole !== 'admin') {
      toast.error('You do not have permission to remove members');
      return;
    }
    const confirmRemove = window.confirm(`Remove ${member.name} (${member.email}) from workspace?`);
    if (!confirmRemove) return;
    try {
      const res = await deleteData(`/workspace/${workspaceId}/members/${member._id}`);
      toast.success(res?.message || 'Employee removed');
      setMembers((prev) => prev.filter((m) => m._id !== member._id));
      // setAuditLogs((logs) => [
      //   { type: 'remove', message: `Removed ${member.email} from workspace`, status: 'success', timestamp: new Date().toISOString() },
      //   ...logs,
      // ]);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove employee');
      // setAuditLogs((logs) => [
      //   { type: 'remove', message: `Remove failed for ${member.email}: ${error?.message || 'error'}`, status: 'error', timestamp: new Date().toISOString() },
      //   ...logs,
      // ]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-[#E5EFFF] p-3 rounded-lg">
              <Settings className="w-6 h-6 text-[#3a5afe]" />
            </div>
            <div>
              <DialogTitle className="text-[18px] font-semibold font-['Inter']">
                Workspace Settings
              </DialogTitle>
              <p className="text-[14px] text-gray-500 font-['Inter'] mt-1">
                {workspace?.name || 'Select Workspace'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-auto bg-transparent border-b-[0.5px] border-[#949291] rounded-none p-0 justify-start w-full gap-0 mb-2">
            <TabsTrigger value="general" className="px-[12px] py-[8px] text-[13px] font-['Inter'] data-[state=active]:border-b-[1px] data-[state=active]:border-[#F2761B]">
              General
            </TabsTrigger>
            <TabsTrigger value="add" className="px-[12px] py-[8px] text-[13px] font-['Inter'] data-[state=active]:border-b-[1px] data-[state=active]:border-[#F2761B]">
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Employee
            </TabsTrigger>
            <TabsTrigger value="roles" className="px-[12px] py-[8px] text-[13px] font-['Inter'] data-[state=active]:border-b-[1px] data-[state=active]:border-[#F2761B]">
              <Users className="w-3.5 h-3.5 mr-1" /> Change Roles
            </TabsTrigger>
            <TabsTrigger value="delete" className="px-[12px] py-[8px] text-[13px] font-['Inter'] data-[state=active]:border-b-[1px] data-[state=active]:border-[#F2761B]">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Workspace
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[14px] font-medium font-['Inter'] text-[#040110]">Workspace name</Label>
                <Input
                  type="text"
                  value={generalName}
                  onChange={(e) => setGeneralName(e.target.value)}
                  placeholder="Workspace name"
                  className="h-[40px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[14px] font-medium font-['Inter'] text-[#040110]">Description</Label>
                <textarea
                  value={generalDescription}
                  onChange={(e) => setGeneralDescription(e.target.value)}
                  placeholder="Short description"
                  className="h-[90px] w-full border border-[#d5d7da] rounded-[8px] px-[10px] py-[8px] text-[14px]"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleUpdateWorkspace}
                  disabled={savingGeneral}
                  className="bg-[#3a5afe] hover:bg-[#334fdc] text-white font-['Inter']"
                >
                  {savingGeneral ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Add Employee Tab */}
          <TabsContent value="add">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[14px] font-medium font-['Inter'] text-[#040110]">
                  Employee email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@example.com"
                  aria-required="true"
                  className="h-[40px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[14px] font-medium font-['Inter'] text-[#040110]">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'member' | 'admin' | 'lead' | 'viewer' | 'head')}>
                  <SelectTrigger className="h-[40px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] font-['Inter'] text-[14px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="font-['Inter'] text-[14px]">
                    <SelectItem value="member">Employee</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    {/* Viewer role is deprecated in UI; commented out intentionally */}
                    {/** <SelectItem value="viewer">Viewer</SelectItem> **/}
                    {/* Head renamed to Lead in UI; keep backend value for compatibility */}
                    {/* <SelectItem value="head">Lead</SelectItem> */}
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[12px] text-[#717182]">Employee can collaborate; Admin can manage employees and projects.</p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleInvite}
                  disabled={inviting}
                  className="bg-[#f2761b] hover:bg-[#d96816] text-white font-['Inter']"
                  aria-disabled={inviting}
                >
                  {inviting ? 'Adding…' : 'Add Employee'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Change Roles Tab */}
          <TabsContent value="roles">
            <div className="space-y-3">
              {loadingMembers ? (
                <div className="flex items-center text-sm text-[#717182]"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading employees…</div>
              ) : members.length === 0 ? (
                <div className="text-sm text-[#717182]">No employees found for this workspace.</div>
              ) : (
                <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  {members.map((member) => (
                    <div key={member._id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-[14px] text-[#040110] truncate">{member.name}</div>
                          <div className="text-[12px] text-[#717182] truncate">{member.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(val) => handleRoleChange(member, (val as 'member' | 'admin' | 'lead' | 'viewer' | 'head'))}
                            disabled={member.role === 'owner'}
                          >
                            <SelectTrigger className="h-[34px] border-[#d5d7da] rounded-[8px] px-[10px] py-[6px] font-['Inter'] text-[13px]">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent className="font-['Inter'] text-[13px]">
                              <SelectItem value="member">Employee</SelectItem>
                              <SelectItem value="lead">Lead</SelectItem>
                              {/* Viewer role is deprecated in UI; commented out intentionally */}
                              {/** <SelectItem value="viewer">Viewer</SelectItem> **/}
                              {/* Head renamed to Lead in UI; keep backend value for compatibility */}
                              {/* <SelectItem value="head">Lead</SelectItem> */}
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            className="px-2 h-[34px] text-red-600 hover:text-red-700"
                            aria-label={`Remove ${member.name}`}
                            disabled={member.role === 'owner' || !(['owner', 'admin'].includes(currentUserRole))}
                            onClick={() => handleRemoveMember(member)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="w-full mt-2 text-[12px] text-[#717182]">
                        {roleDescriptions[member.role] || ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Delete Workspace Tab */}
          <TabsContent value="delete">
            <div className="space-y-3">
              <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                Deleting a workspace is irreversible. All projects and data inside may become inaccessible.
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleDeleteWorkspace}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-['Inter']"
                >
                  {deleting ? 'Deleting…' : 'Delete Workspace'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose} aria-label="Close settings">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WorkspaceSettingsModal;