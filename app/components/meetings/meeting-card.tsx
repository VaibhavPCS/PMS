import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  Users, 
  ExternalLink, 
  Paperclip, 
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Calendar
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { fetchData, postData, deleteData } from '@/lib/fetch-util';
import { useAuth } from '@/provider/auth-context';
import { EditMeetingModal } from './edit-meeting-modal';

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  duration: number;
  meetingLink?: string;
  organizer: {
    _id: string;
    name: string;
    email: string;
  };
  participants: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
    };
    status: 'pending' | 'accepted' | 'declined';
    responseDate?: string;
  }>;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    mimeType: string;
  }>;
  createdAt: string;
}

interface MeetingCardProps {
  meeting: Meeting;
  onUpdate: () => void;
  compact?: boolean;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onUpdate, compact = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getParticipantStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrentUserParticipant = () => {
    return meeting.participants.find(p => p.user._id === user?._id);
  };

  const isOrganizer = () => {
    return meeting.organizer._id === user?._id;
  };

  const handleParticipantResponse = async (response: 'accepted' | 'declined') => {
    try {
      setLoading(true);
      const result = await postData(`/meetings/${meeting._id}/respond`, { response });
      if (result.success) {
        onUpdate();
      } else {
        alert(result.message || 'Failed to update response');
      }
    } catch (error) {
      console.error('Error updating participant response:', error);
      alert('Failed to update response');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      setLoading(true);
      
      // Get workspace ID from user context
      const workspaceId = typeof user?.currentWorkspace === 'string' 
        ? user.currentWorkspace 
        : user?.currentWorkspace?._id || '';

      // Set workspace ID in localStorage for the request interceptor
      localStorage.setItem('currentWorkspaceId', workspaceId);

      const result = await deleteData(`/meetings/${meeting._id}`);
      if (result.success) {
        onUpdate();
      } else {
        alert(result.message || 'Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Failed to delete meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMeeting = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    onUpdate();
  };

  const downloadAttachment = (attachment: any) => {
    window.open(attachment.fileUrl, '_blank');
  };

  const currentUserParticipant = getCurrentUserParticipant();

  if (compact) {
    return (
      <>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{meeting.title}</h4>
                  <Badge className={`text-xs ${getStatusColor(meeting.status)}`}>
                    {meeting.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(meeting.scheduledDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(meeting.scheduledDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {meeting.participants.length + 1}
                  </div>
                </div>
              </div>
              {meeting.meetingLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(meeting.meetingLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Meeting Modal */}
        <EditMeetingModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          meeting={meeting}
          onSuccess={handleEditSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">{meeting.title}</h3>
                <Badge className={getStatusColor(meeting.status)}>
                  {meeting.status}
                </Badge>
              </div>
              {meeting.description && (
                <p className="text-gray-600 text-sm mb-3">{meeting.description}</p>
              )}
            </div>
            
            {(isOrganizer() || currentUserParticipant) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOrganizer() && (
                    <>
                      <DropdownMenuItem onClick={handleEditMeeting}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDeleteMeeting} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Meeting
                      </DropdownMenuItem>
                    </>
                  )}
                  {currentUserParticipant && currentUserParticipant.status === 'pending' && (
                    <>
                      <DropdownMenuItem onClick={() => handleParticipantResponse('accepted')}>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Accept
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleParticipantResponse('declined')}>
                        <UserX className="h-4 w-4 mr-2" />
                        Decline
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(meeting.scheduledDate)} at {formatTime(meeting.scheduledDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{meeting.duration} minutes</span>
            </div>
          </div>

          {/* Organizer */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Organized by</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {meeting.organizer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{meeting.organizer.name}</span>
            </div>
          </div>

          {/* Participants */}
          {meeting.participants.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Participants ({meeting.participants.length})</p>
              <div className="space-y-2">
                {meeting.participants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {participant.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{participant.user.name}</span>
                    </div>
                    <Badge className={`text-xs ${getParticipantStatusColor(participant.status)}`}>
                      {participant.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {meeting.attachments.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Attachments ({meeting.attachments.length})</p>
              <div className="space-y-2">
                {meeting.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => downloadAttachment(attachment)}
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm">{attachment.fileName}</span>
                      <span className="text-xs text-gray-500">
                        ({(attachment.fileSize / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {meeting.meetingLink && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-gray-600">Join Meeting</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(meeting.meetingLink, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Join
              </Button>
            </div>
          )}

          {/* Participant Response Actions */}
          {currentUserParticipant && currentUserParticipant.status === 'pending' && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                size="sm"
                onClick={() => handleParticipantResponse('accepted')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleParticipantResponse('declined')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <UserX className="h-4 w-4" />
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        meeting={meeting}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};