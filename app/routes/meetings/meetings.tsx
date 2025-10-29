import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Users, ExternalLink } from 'lucide-react';
import { fetchData } from '@/lib/fetch-util';
import { useAuth } from '@/provider/auth-context';
import { CreateMeetingModal } from '@/components/meetings/create-meeting-modal';
import { MeetingCard } from '@/components/meetings/meeting-card';

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

const Meetings: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | undefined>();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      // Get current workspace ID from user context
      if (!user?.currentWorkspace) {
        console.error('No current workspace found');
        return;
      }
      
      // Extract workspace ID - currentWorkspace is an object with _id property
      const workspaceId = typeof user.currentWorkspace === 'string' 
        ? user.currentWorkspace 
        : user.currentWorkspace._id;
      
      const response = await fetchData(`/meetings/workspace/${workspaceId}`);
      if (response.success) {
        setMeetings(response.data);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleCreateMeeting = (date?: Date) => {
    setSelectedDateForModal(date || selectedDate);
    setShowCreateModal(true);
  };

  const handleMeetingCreated = () => {
    setShowCreateModal(false);
    fetchMeetings(); // Refresh meetings list
  };

  const getSelectedDateMeetings = () => {
    if (!selectedDate) return [];
    
    const selectedDateStr = selectedDate.toDateString();
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.scheduledDate);
      return meetingDate.toDateString() === selectedDateStr;
    });
  };

  const getUpcomingMeetings = () => {
    const now = new Date();
    return meetings
      .filter(meeting => {
        const meetingDate = new Date(meeting.scheduledDate);
        return meetingDate > now && meeting.status === 'scheduled';
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 5);
  };

  const getMeetingDates = () => {
    return meetings.map(meeting => new Date(meeting.scheduledDate));
  };

  const selectedDateMeetings = getSelectedDateMeetings();
  const upcomingMeetings = getUpcomingMeetings();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600 mt-1">Schedule and manage your meetings</p>
        </div>
        <Button onClick={() => handleCreateMeeting()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border"
                modifiers={{
                  meeting: getMeetingDates(),
                }}
                modifiersStyles={{
                  meeting: {
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    fontWeight: 'bold',
                  },
                }}
              />
              <div className="mt-4">
                <Button 
                  onClick={() => handleCreateMeeting(selectedDate)} 
                  className="w-full"
                  variant="outline"
                >
                  Schedule Meeting for {selectedDate?.toLocaleDateString()}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meetings List Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Date Meetings */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Meetings for {selectedDate.toLocaleDateString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateMeetings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No meetings scheduled for this date</p>
                    <Button 
                      onClick={() => handleCreateMeeting(selectedDate)} 
                      variant="outline" 
                      className="mt-4"
                    >
                      Schedule a Meeting
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDateMeetings.map((meeting) => (
                      <MeetingCard 
                        key={meeting._id} 
                        meeting={meeting} 
                        onUpdate={fetchMeetings}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Upcoming Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : upcomingMeetings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No upcoming meetings</p>
                  <Button 
                    onClick={() => handleCreateMeeting()} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Schedule Your First Meeting
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingMeetings.map((meeting) => (
                    <MeetingCard 
                      key={meeting._id} 
                      meeting={meeting} 
                      onUpdate={fetchMeetings}
                      compact
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleMeetingCreated}
        selectedDate={selectedDateForModal}
      />
    </div>
  );
};

export default Meetings;