import React, { useState, useEffect } from 'react';
import { X, Search, Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchData, postData } from '@/lib/fetch-util';
import { useAuth } from '../../provider/auth-context';

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
  onClose: () => void;
  onChatCreated: () => void;
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({
  onClose,
  onChatCreated
}) => {
  const { user } = useAuth();
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [chatName, setChatName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchWorkspaceMembers();
    }
  }, [selectedWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetchData('/workspace');
      setWorkspaces(response.workspaces || []);
      if (response.workspaces?.length > 0) {
        setSelectedWorkspace(response.workspaces[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  const fetchWorkspaceMembers = async () => {
    try {
      const response = await fetchData(`/workspace/${selectedWorkspace}/members`);
      const members = response.members || [];
      // Filter out current user
      const otherMembers = members
        .map((member: any) => member.user)
        .filter((member: User) => member._id !== user?._id);
      setAvailableUsers(otherMembers);
    } catch (error) {
      console.error('Failed to fetch workspace members:', error);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserToggle = (selectedUser: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === selectedUser._id);
      if (isSelected) {
        return prev.filter(u => u._id !== selectedUser._id);
      } else {
        if (chatType === 'direct' && prev.length >= 1) {
          return [selectedUser]; // For direct messages, only one user
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
      alert('Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      const participants = selectedUsers.map(u => u._id);
      
      const chatData = {
        type: chatType,
        participants,
        workspace: selectedWorkspace,
        ...(chatType === 'group' && { name: chatName.trim() })
      };

      await postData('/chats', chatData);
      onChatCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert('Failed to create chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = selectedUsers.length > 0 && 
    (chatType === 'direct' || (chatType === 'group' && chatName.trim()));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">New Chat</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Chat Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Chat Type</label>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setChatType('direct');
                  setSelectedUsers(selectedUsers.slice(0, 1));
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                  chatType === 'direct'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Direct Message</span>
              </button>
              <button
                onClick={() => setChatType('group')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                  chatType === 'group'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Group Chat</span>
              </button>
            </div>
          </div>

          {/* Workspace Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Workspace</label>
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {workspaces.map(workspace => (
                <option key={workspace._id} value={workspace._id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          {/* Group Name (only for group chats) */}
          {chatType === 'group' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Group Name</label>
              <Input
                placeholder="Enter group name..."
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
              />
            </div>
          )}

          {/* User Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {chatType === 'direct' ? 'Select User' : 'Add Members'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Selected</label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user._id}
                    className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-sm"
                  >
                    <Avatar className="w-5 h-5">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                    <button
                      onClick={() => handleUserToggle(user)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User List */}
          <div className="space-y-2">
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredUsers.map(user => {
                const isSelected = selectedUsers.some(u => u._id === user._id);
                return (
                  <div
                    key={user._id}
                    onClick={() => handleUserToggle(user)}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Checkbox checked={isSelected} readOnly />
                    <Avatar className="w-8 h-8">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name} />
                      ) : null}
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={!canCreate || loading}
          >
            {loading ? 'Creating...' : 'Create Chat'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateChatModal;