import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import FileUpload from '@/components/ui/file-upload';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Link as LinkIcon, Paperclip, X, UserPlus } from 'lucide-react';
import { fetchData, postData } from '@/lib/fetch-util';
import { useAuth } from '@/provider/auth-context';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface EmailParticipant {
  email: string;
  name?: string;
}

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate?: Date;
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedDate
}) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [emailParticipants, setEmailParticipants] = useState<EmailParticipant[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: '60',
    meetingLink: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      // Set default date and time
      if (selectedDate) {
        const nextWeek = new Date(selectedDate);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const dateStr = nextWeek.toISOString().split('T')[0];
        const timeStr = '10:00'; // Default to 10:00 AM
        
        setFormData(prev => ({
          ...prev,
          scheduledDate: dateStr,
          scheduledTime: timeStr
        }));
      }
    }
  }, [isOpen, selectedDate]);

  const fetchUsers = async () => {
    try {
      const response = await fetchData('/project/members');
      if (response.success || response.members) {
        // Handle both response formats
        const members = response.members || response.data || [];
        // Filter out current user from participants list
        const filteredUsers = members.filter((u: User) => u._id !== user?._id);
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching workspace members:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleParticipantToggle = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleFileUpload = (files: File[]) => {
    setAttachments(files);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmailParticipant = () => {
    const email = emailInput.trim().toLowerCase();
    
    if (!email) {
      setEmailError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check if email already exists in workspace members
    const existingUser = users.find((u: User) => u.email.toLowerCase() === email);
    if (existingUser) {
      setEmailError('This user is already in your workspace. Please select them from the members list above.');
      return;
    }

    // Check if email already added
    const alreadyAdded = emailParticipants.find((p: EmailParticipant) => p.email === email);
    if (alreadyAdded) {
      setEmailError('This email is already added');
      return;
    }

    // Add email participant
    setEmailParticipants(prev => [...prev, { email }]);
    setEmailInput('');
    setEmailError('');
  };

  const handleRemoveEmailParticipant = (email: string) => {
    setEmailParticipants(prev => prev.filter((p: EmailParticipant) => p.email !== email));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmailParticipant();
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      alert('Meeting title is required');
      return false;
    }
    if (!formData.scheduledDate) {
      alert('Meeting date is required');
      return false;
    }
    if (!formData.scheduledTime) {
      alert('Meeting time is required');
      return false;
    }
    if (formData.meetingLink && !isValidUrl(formData.meetingLink)) {
      alert('Please enter a valid meeting link URL');
      return false;
    }
    return true;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Get workspace ID from user context
      const workspaceId = typeof user?.currentWorkspace === 'string' 
        ? user.currentWorkspace 
        : user?.currentWorkspace?._id;

      if (!workspaceId) {
        alert('No workspace selected');
        return;
      }

      // Set workspace ID in localStorage for the request interceptor
      localStorage.setItem('currentWorkspaceId', workspaceId);

      // Combine date and time into a single Date object
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);

      // Only include workspace member IDs in participants (backend expects user IDs)
      // Email participants will be handled separately by the backend
      const participantIds = selectedParticipants; // These are user IDs from workspace members

      const meetingData = {
        title: formData.title,
        description: formData.description,
        scheduledDate: scheduledDateTime.toISOString(),
        duration: parseInt(formData.duration),
        meetingLink: formData.meetingLink,
        participants: participantIds,
        workspaceId: workspaceId,
        emailParticipants: emailParticipants, // Send email participants separately
        attachments: attachments.map(file => file.name)
      };

      const response = await postData('/meetings', meetingData);

      if (response.success) {
        onSuccess();
        onClose();
        // Reset form
        resetForm();
      }
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Failed to create meeting. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      scheduledDate: '',
      scheduledTime: '',
      duration: '60',
      meetingLink: '',
    });
    setSelectedParticipants([]);
    setEmailParticipants([]);
    setAttachments([]);
    setEmailInput('');
    setEmailError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getSelectedUserNames = () => {
    return users
      .filter(user => selectedParticipants.includes(user._id))
      .map(user => user.name);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6 text-blue-600" />
            Schedule New Meeting
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Meeting Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Meeting Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter meeting title"
                    required
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Meeting agenda or description"
                    rows={3}
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Schedule Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Schedule & Duration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                      required
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                      required
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
                    <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Meeting Link */}
                <div className="space-y-2">
                  <Label htmlFor="meetingLink">Meeting Link</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="meetingLink"
                      value={formData.meetingLink}
                      onChange={(e) => handleInputChange('meetingLink', e.target.value)}
                      placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      className="pl-10 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Participants Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Workspace Members Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Workspace Members</Label>
                  <ScrollArea className="max-h-48 border rounded-md p-3">
                    {users.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-gray-500 text-sm">Loading workspace members...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {users.map((user) => (
                          <div key={user._id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <Checkbox
                              id={`user-${user._id}`}
                              checked={selectedParticipants.includes(user._id)}
                              onCheckedChange={() => handleParticipantToggle(user._id)}
                            />
                            <label 
                              htmlFor={`user-${user._id}`} 
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium text-sm">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Email Invitation Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Invite by Email</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddEmailParticipant}
                      variant="outline"
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                  {emailError && (
                    <p className="text-sm text-red-600">{emailError}</p>
                  )}
                </div>

                {/* Email Participants Display */}
                {emailParticipants.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email Invites</Label>
                    <div className="flex flex-wrap gap-2">
                      {emailParticipants.map((participant, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="bg-green-100 text-green-800 flex items-center gap-1"
                        >
                          {participant.email}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-green-600" 
                            onClick={() => handleRemoveEmailParticipant(participant.email)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Selected Workspace Members Display */}
                {selectedParticipants.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <Label className="text-sm font-medium">Selected Members</Label>
                    <div className="flex flex-wrap gap-2">
                      {getSelectedUserNames().map((name, index) => (
                        <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Paperclip className="h-5 w-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFilesSelect={handleFileUpload}
                  selectedFiles={attachments}
                  maxFiles={5}
                  maxFileSize={10}
                />
              </CardContent>
            </Card>
          </form>
        </ScrollArea>
        
        <DialogFooter className="px-6 py-4 bg-gray-50 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Meeting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
