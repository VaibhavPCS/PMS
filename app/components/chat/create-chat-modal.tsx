import React, { useState, useEffect } from 'react';
import { X, Search, Users, MessageCircle, MessageSquarePlus } from 'lucide-react';
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
  organization?: string;
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
  const [existingDirectPartners, setExistingDirectPartners] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch users and existing chats when modal opens
  useEffect(() => {
    if (open) {
      fetchOrganizationUsers();
      fetchExistingDirectPartners();
    }
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setChatType('direct');
      setChatName('');
      setSearchTerm('');
      setSelectedUsers([]);
    }
  }, [open]);

  const fetchOrganizationUsers = async () => {
    try {
      const response = await fetchData('/chats/users/organization');
      const users = response.users || [];
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to fetch organization users:', error);
      toast.error('Failed to load users from your organization');
    }
  };

  const fetchExistingDirectPartners = async () => {
    try {
      const response = await fetchData('/chats/organization');
      const directChats = (response.chats || []).filter((chat: any) => {
        const isDirect = chat.type === 'direct';
        const isActive = chat.isActive && !chat.isArchived;
        return isDirect && isActive;
      });

      const partners = new Set<string>();
      directChats.forEach((chat: any) => {
        chat.participants?.forEach((p: any) => {
          if (p.user?._id !== currentUserId && p.isActive) {
            partners.add(p.user._id);
          }
        });
      });

      setExistingDirectPartners(partners);
    } catch (error: any) {
      console.error('Failed to fetch existing direct partners:', error);
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
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (chatType === 'group' && !chatName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      const participants = selectedUsers.map(u => u._id).filter(id => id !== currentUserId);

      const chatData = {
        type: chatType,
        participants,
        name: chatType === 'group' ? chatName.trim() : (selectedUsers[0]?.name || 'Direct Chat')
      };

      await postData('/chats', chatData);

      if (chatType === 'group') {
        toast.success('Group chat created successfully', {
          description: `${selectedUsers.length} members added`
        });
      } else {
        toast.success('Chat started', {
          description: `with ${selectedUsers[0]?.name}`
        });
      }

      onChatCreated();
      onClose();
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
        <div className="bg-white px-[24px] pt-[24px] pb-[20px] shrink-0">
          <div className="flex items-start gap-[12px]">
            <div className="w-[48px] h-[48px] rounded-[10px] bg-[#eff6ff] flex items-center justify-center shrink-0">
              <MessageSquarePlus className="w-[24px] h-[24px] text-[#4a8cd7]" />
            </div>
            <div className="flex-1">
              <DialogHeader className="p-0 space-y-[4px]">
                <DialogTitle className="text-[18px] font-semibold font-['Inter'] text-[#181d27] leading-[24px]">
                  New Chat
                </DialogTitle>
                <DialogDescription className="text-[14px] font-normal font-['Inter'] text-[#535862] leading-[20px]">
                  Start a conversation with your organization members
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="px-[24px] pr-[14px] overflow-y-auto flex-1 bg-[#fafbfb]">
          <div className="pr-[10px] space-y-[16px] py-[16px]">
            {/* Chat Type */}
            <div className="space-y-[8px]">
              <Label className="text-[13px] font-medium font-['Inter'] text-[#535862] leading-[18px]">
                Chat Type
              </Label>
              <div className="flex gap-[8px]">
                <button
                  type="button"
                  onClick={() => {
                    setChatType('direct');
                    setSelectedUsers(selectedUsers.slice(0, 1));
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-[8px] px-[14px] py-[10px] rounded-[8px] border text-[14px] font-medium font-['Inter'] transition-all",
                    chatType === 'direct'
                      ? 'border-[#4a8cd7] bg-[#eff6ff] text-[#4a8cd7] shadow-sm'
                      : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#d1d5db] hover:bg-[#f9fafb]'
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  Direct
                </button>
                <button
                  type="button"
                  onClick={() => setChatType('group')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-[8px] px-[14px] py-[10px] rounded-[8px] border text-[14px] font-medium font-['Inter'] transition-all",
                    chatType === 'group'
                      ? 'border-[#4a8cd7] bg-[#eff6ff] text-[#4a8cd7] shadow-sm'
                      : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#d1d5db] hover:bg-[#f9fafb]'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Group
                </button>
              </div>
            </div>

            {/* Group Name (only for group chats) */}
            {chatType === 'group' && (
              <div className="space-y-[8px]">
                <Label htmlFor="groupName" className="text-[13px] font-medium font-['Inter'] text-[#535862] leading-[18px]">
                  Group Name
                </Label>
                <Input
                  id="groupName"
                  type="text"
                  placeholder="e.g., Project Team, Marketing Group"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  className="h-[40px] bg-white border-[#e5e7eb] rounded-[8px] px-[12px] py-[8px] text-[14px] font-['Inter'] placeholder:text-[#9ca3af] focus:border-[#4a8cd7] focus:ring-1 focus:ring-[#4a8cd7]"
                />
              </div>
            )}

            {/* User Search */}
            <div className="space-y-[8px]">
              <Label className="text-[13px] font-medium font-['Inter'] text-[#535862] leading-[18px]">
                {chatType === 'direct' ? 'Select Person' : 'Add Members'}
              </Label>
              <div className="relative">
                <Search className="absolute left-[12px] top-1/2 transform -translate-y-1/2 w-[16px] h-[16px] text-[#9ca3af]" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-[40px] bg-white border-[#e5e7eb] rounded-[8px] px-[12px] py-[8px] pl-[36px] text-[14px] font-['Inter'] placeholder:text-[#9ca3af] focus:border-[#4a8cd7] focus:ring-1 focus:ring-[#4a8cd7]"
                />
              </div>
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="space-y-[8px]">
                <Label className="text-[13px] font-medium font-['Inter'] text-[#535862] leading-[18px]">
                  Selected ({selectedUsers.length})
                </Label>
                <div className="flex flex-wrap gap-[6px]">
                  {selectedUsers.map(member => (
                    <div
                      key={member._id}
                      className="flex items-center gap-[6px] bg-[#eff6ff] border border-[#dbeafe] text-[#4a8cd7] px-[10px] py-[6px] rounded-[6px] text-[13px] font-medium font-['Inter']"
                    >
                      <Avatar className="w-[16px] h-[16px]">
                        {member.profilePicture ? (
                          <img src={member.profilePicture} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="text-[9px] bg-[#4a8cd7] text-white">{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-[120px] truncate">{member.name}</span>
                      <button
                        onClick={() => handleUserToggle(member)}
                        className="text-[#4a8cd7] hover:text-[#3b7bb8] ml-[2px]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User List */}
            <div className="space-y-[8px]">
              <Label className="text-[13px] font-medium font-['Inter'] text-[#535862] leading-[18px]">
                People in Your Organization ({availableUsers.length})
              </Label>
              <div className="max-h-[240px] overflow-y-auto space-y-[6px] bg-white border border-[#e5e7eb] rounded-[8px] p-[8px]">
                {filteredUsers.map(member => {
                  const isSelected = selectedUsers.some(u => u._id === member._id);
                  const hasExistingChat = chatType === 'direct' && existingDirectPartners.has(member._id);
                  return (
                    <div
                      key={member._id}
                      onClick={() => !hasExistingChat && handleUserToggle(member)}
                      className={cn(
                        "flex items-center gap-[10px] p-[10px] rounded-[6px] transition-all",
                        hasExistingChat
                          ? 'opacity-50 cursor-not-allowed bg-[#f9fafb]'
                          : isSelected
                          ? 'bg-[#eff6ff] border border-[#4a8cd7] cursor-pointer'
                          : 'hover:bg-[#f9fafb] cursor-pointer'
                      )}
                    >
                      <Avatar className="w-[32px] h-[32px] shrink-0">
                        {member.profilePicture ? (
                          <img src={member.profilePicture} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="text-[13px] bg-[#e5e7eb] text-[#6b7280]">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium font-['Inter'] text-[#181d27] truncate">
                          {member.name}
                        </p>
                        <p className="text-[12px] font-normal font-['Inter'] text-[#6b7280] truncate">
                          {member.email}
                        </p>
                        {hasExistingChat && (
                          <p className="text-[11px] font-medium font-['Inter'] text-[#ef4444] mt-[2px]">
                            Chat already exists
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-[18px] h-[18px] bg-[#4a8cd7] rounded-full flex items-center justify-center shrink-0">
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-[40px] text-[14px] font-['Inter'] text-[#9ca3af]">
                    {searchTerm ? 'No users found matching your search' : 'No users available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-[12px] px-[24px] py-[18px] border-t border-[#e5e7eb] bg-white shrink-0">
          <Button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-white hover:bg-[#f9fafb] text-[#6b7280] border border-[#e5e7eb] font-medium font-['Inter'] text-[14px] h-[40px] px-[16px] rounded-[8px] shadow-sm transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={!canCreate || loading}
            className={cn(
              "flex-1 font-medium font-['Inter'] text-[14px] h-[40px] px-[16px] rounded-[8px] shadow-sm transition-all",
              canCreate && !loading
                ? "bg-[#4a8cd7] hover:bg-[#3b7bb8] text-white"
                : "bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              chatType === 'direct' ? 'Start Chat' : 'Create Group'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChatModal;
