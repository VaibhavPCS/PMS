import React, { useState, useEffect } from 'react';
import { X, Search, Users, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { fetchData, postData } from '@/lib/fetch-util';
import { useAuth } from '../../provider/auth-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface User {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

interface Workspace {
  _id: string;
  name: string;
}

interface CreateChatModalProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: () => void;
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({
  open,
  onClose,
  onChatCreated
}) => {
  const { user } = useAuth();
  const currentUserId = (user as any)?.id || (user as any)?._id || '';
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [chatName, setChatName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [existingDirectPartners, setExistingDirectPartners] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchWorkspaces();
    }
  }, [open]);

  useEffect(() => {
    const switchAndFetch = async () => {
      if (!selectedWorkspace) return;
      try {
        await postData('/workspace/switch', { workspaceId: selectedWorkspace });
        localStorage.setItem('currentWorkspaceId', selectedWorkspace);
        // Dispatch custom event for workspace change - COMMENTED OUT
        // window.dispatchEvent(new CustomEvent('workspaceChanged'));
        await fetchWorkspaceMembers();
        await fetchExistingDirectPartners();
      } catch (e) {
        console.error('Failed to switch workspace:', e);
      }
    };
    switchAndFetch();
  }, [selectedWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetchData('/workspace');
      const workspaceList = (response.workspaces || []).map((w: any) => w.workspaceId).filter(Boolean);
      setWorkspaces(workspaceList);
      const currentId = response.currentWorkspace?._id || workspaceList[0]?._id || '';
      if (currentId) {
        setSelectedWorkspace(currentId);
        localStorage.setItem('currentWorkspaceId', currentId);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const fetchWorkspaceMembers = async () => {
    try {
      const response = await fetchData('/project/members');
      const members = response.members || [];
      const otherMembers = members.filter((member: User) => member._id !== currentUserId);
      setAvailableUsers(otherMembers);
    } catch (error) {
      console.error('Failed to fetch workspace employees:', error);
    }
  };

  const fetchExistingDirectPartners = async () => {
    try {
      if (!selectedWorkspace) {
        console.log('No workspace selected, skipping fetchExistingDirectPartners');
        setExistingDirectPartners(new Set());
        return;
      }
      
      console.log('Fetching existing direct partners for workspace:', selectedWorkspace);
      const response = await fetchData(`/chats/workspace/${selectedWorkspace}`);
      console.log('Chats response:', response);
      
      const directChats = (response.chats || []).filter((chat: any) => {
        const isDirect = chat.type === 'direct';
        // Workspace might be an ObjectId string or a populated object
        const isCorrectWorkspace = chat.workspace === selectedWorkspace || 
                                  chat.workspace?._id === selectedWorkspace;
        const isActive = chat.isActive && !chat.isArchived;
        console.log('Chat check:', { isDirect, isCorrectWorkspace, isActive, chat });
        return isDirect && isCorrectWorkspace && isActive;
      });
      
      console.log('Filtered direct chats:', directChats);
      
      const partners = new Set<string>();
      directChats.forEach((chat: any) => {
        chat.participants?.forEach((p: any) => {
          if (p.user?._id !== currentUserId && p.isActive) {
            partners.add(p.user._id);
          }
        });
      });
      
      console.log('Found existing partners:', Array.from(partners));
      setExistingDirectPartners(partners);
    } catch (error: any) {
      console.error('Failed to fetch existing direct partners:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: `/chats/workspace/${selectedWorkspace}`
      });
      setExistingDirectPartners(new Set());
    }
  };

  const filteredUsers = availableUsers
    .filter(u => u._id !== currentUserId)
    .filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleUserToggle = (selectedUser: User) => {
    if (selectedUser._id === currentUserId) {
      return;
    }
    
    // Check if user already has an active chat with this person
    if (chatType === 'direct' && existingDirectPartners.has(selectedUser._id)) {
      toast.error('You already have an active chat');
      return;
    }
    
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === selectedUser._id);
      if (isSelected) {
        return prev.filter(u => u._id !== selectedUser._id);
      } else {
        if (chatType === 'direct' && prev.length >= 1) {
          return [selectedUser];
        }
        return [...prev, selectedUser];
      }
    });
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0 || !selectedWorkspace) {
      return;
    }

    if (chatType === 'group' && !chatName.trim()) {
      return;
    }

    try {
      setLoading(true);
      const participants = selectedUsers.map(u => u._id).filter(id => id !== currentUserId);
      
      const chatData = {
        type: chatType,
        participants,
        workspace: selectedWorkspace,
        name: chatType === 'group' ? chatName.trim() : (selectedUsers[0]?.name || 'Direct Chat')
      };

      await postData('/chats', chatData);
      if (chatType === 'group') {
        toast.success('Group chat created');
      } else {
        toast.success('Chat started', { description: selectedUsers[0]?.name || '' });
      }
      onChatCreated();
      onClose();
      setChatName('');
      setSelectedUsers([]);
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to create chat:', error);
      const message = (error as any)?.response?.data?.message || 'Failed to create chat';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const canCreate = selectedUsers.length > 0 && 
    (chatType === 'direct' || (chatType === 'group' && chatName.trim()));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[552px] p-0 gap-0 rounded-[16px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white px-[24px] pt-[24px] pb-0 shrink-0">
          <div className="flex items-start gap-[10px] mb-[10px]">
            <div className="w-[48px] h-[48px] rounded-[10px] bg-[rgba(59,130,246,0.1)] flex items-center justify-center shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2 6.94975C2 6.06722 2 5.62595 2.06935 5.25839C2.37464 3.64031 3.64031 2.37464 5.25839 2.06935C5.62595 2 6.06722 2 6.94975 2C7.33642 2 7.52976 2 7.71557 2.01738C8.51665 2.09229 9.27652 2.40704 9.89594 2.92051C10.0396 3.03961 10.1763 3.17633 10.4497 3.44975L11 4C11.8158 4.81578 12.2237 5.22367 12.7121 5.49543C12.9804 5.64471 13.2651 5.7626 13.5604 5.84678C14.0979 6 14.6747 6 15.8284 6H16.2021C18.8345 6 20.1506 6 21.0062 6.76946C21.0849 6.84024 21.1598 6.91514 21.2305 6.99383C22 7.84935 22 9.16554 22 11.7979V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V6.94975Z" stroke="#3B82F6" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
          <DialogHeader className="p-0 space-y-[4px]">
            <DialogTitle className="text-[16px] font-semibold font-['Inter'] text-[#181d27] leading-[24px]">
              Create Chat
            </DialogTitle>
            <DialogDescription className="text-[14px] font-normal font-['Inter'] text-[#535862] leading-[20px]">
              Start a new conversation with your team members
            </DialogDescription>
          </DialogHeader>
          <div className="h-[20px]" />
        </div>

        {/* Form Content - Scrollable */}
        <div className="px-[24px] pr-[14px] overflow-y-auto flex-1">
          <div className="pr-[10px] space-y-[16px]">
            {/* Chat Type */}
            <div className="space-y-[6px]">
              <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                Chat Type <span className="text-[#cd2818] font-['Work_Sans']">*</span>
              </Label>
              <div className="flex gap-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setChatType('direct');
                    setSelectedUsers(selectedUsers.slice(0, 1));
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-[8px] px-[14px] py-[10px] rounded-[8px] border text-[14px] font-medium font-['Inter'] transition-colors",
                    chatType === 'direct'
                      ? 'border-[#3B82F6] bg-[rgba(59,130,246,0.1)] text-[#3B82F6]'
                      : 'border-[#d5d7da] text-[#414651] hover:bg-[rgba(4,1,16,0.02)]'
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  Direct Message
                </button>
                <button
                  type="button"
                  onClick={() => setChatType('group')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-[8px] px-[14px] py-[10px] rounded-[8px] border text-[14px] font-medium font-['Inter'] transition-colors",
                    chatType === 'group'
                      ? 'border-[#3B82F6] bg-[rgba(59,130,246,0.1)] text-[#3B82F6]'
                      : 'border-[#d5d7da] text-[#414651] hover:bg-[rgba(4,1,16,0.02)]'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Group Chat
                </button>
              </div>
            </div>

            {/* Workspace */}
            <div className="space-y-[6px]">
              <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                Workspace <span className="text-[#cd2818] font-['Work_Sans']">*</span>
              </Label>
              <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                <SelectTrigger className="h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] font-['Inter'] text-[14px]">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent className="font-['Inter']">
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace._id} value={workspace._id} className="text-[14px]">
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group Name (only for group chats) */}
            {chatType === 'group' && (
              <div className="space-y-[6px]">
                <Label htmlFor="groupName" className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Group Name <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                </Label>
                <Input
                  id="groupName"
                  type="text"
                  placeholder="Enter group name"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  className="h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] placeholder:text-[#717680]"
                />
              </div>
            )}

            {/* User Search */}
            <div className="space-y-[6px]">
              <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                {chatType === 'direct' ? 'Select User' : 'Add Members'} <span className="text-[#cd2818] font-['Work_Sans']">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] pl-10 text-[14px] font-['Inter'] placeholder:text-[#717680]"
                />
              </div>
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="space-y-[6px]">
                <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Selected ({selectedUsers.length})
                </Label>
                <div className="flex flex-wrap gap-[8px]">
                  {selectedUsers.map(member => (
                    <div
                      key={member._id}
                      className="flex items-center gap-[6px] bg-[rgba(59,130,246,0.1)] text-[#3B82F6] px-[10px] py-[6px] rounded-[6px] text-[12px] font-medium font-['Inter']"
                    >
                      <Avatar className="w-4 h-4">
                        {member.profilePicture ? (
                          <img src={member.profilePicture} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="text-[10px]">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                      <button
                        onClick={() => handleUserToggle(member)}
                        className="text-[#3B82F6] hover:text-[#2563eb]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User List */}
            <div className="space-y-[6px]">
              <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                Available Members
              </Label>
              <div className="max-h-[200px] overflow-y-auto space-y-[4px] border border-[#d5d7da] rounded-[8px] p-[8px]">
                {filteredUsers.map(member => {
                  const isSelected = selectedUsers.some(u => u._id === member._id);
                  const hasExistingChat = existingDirectPartners.has(member._id);
                  return (
                    <div
                      key={member._id}
                      onClick={() => handleUserToggle(member)}
                      className={cn(
                        "flex items-center gap-[12px] p-[12px] rounded-[6px] cursor-pointer transition-colors",
                        isSelected 
                          ? 'bg-[rgba(59,130,246,0.1)] border border-[#3B82F6]' 
                          : hasExistingChat 
                          ? 'bg-[rgba(239,68,68,0.05)] border border-[#EF4444]'
                          : 'hover:bg-[rgba(4,1,16,0.02)]'
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      <Avatar className="w-8 h-8">
                        {member.profilePicture ? (
                          <img src={member.profilePicture} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="text-[12px]">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-[14px] font-medium font-['Inter'] text-[#181d27]">{member.name}</p>
                        <p className="text-[12px] font-normal font-['Inter'] text-[#717680]">{member.email}</p>
                        {hasExistingChat && (
                          <p className="text-[11px] font-medium font-['Inter'] text-[#EF4444]">Already has active chat</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-[14px] font-['Inter'] text-[#717680]">
                    No users found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-[12px] px-[24px] py-[20px] border-t border-gray-100 shrink-0">
          <Button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-[rgba(4,1,16,0.05)] hover:bg-[rgba(4,1,16,0.1)] text-[#040110] font-medium font-['Inter'] text-[14px] h-auto px-[15px] py-[10px] rounded-[8px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={!canCreate || loading}
            className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white font-medium font-['Inter'] text-[14px] h-auto px-[15px] py-[10px] rounded-[8px]"
          >
            {loading ? 'Creating...' : 'Create Chat'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatModal;
