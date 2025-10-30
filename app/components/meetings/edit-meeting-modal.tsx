import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, LinkIcon, FileText, Type, Loader2 } from 'lucide-react';
import { putData } from '@/lib/fetch-util';
import { useAuth } from '@/provider/auth-context';

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  meetingLink?: string;
  organizer: {
    _id: string;
    name: string;
    email: string;
  };
}

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  onSuccess: () => void;
}

export const EditMeetingModal: React.FC<EditMeetingModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingLink: ''
  });

  // Initialize form data when meeting changes
  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title || '',
        description: meeting.description || '',
        meetingLink: meeting.meetingLink || ''
      });
    }
  }, [meeting]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meeting || !user) return;

    // Validate required fields
    if (!formData.title.trim()) {
      alert('Meeting title is required');
      return;
    }

    // Check if user is the organizer
    if (meeting.organizer._id !== user._id) {
      alert('Only the meeting organizer can edit this meeting');
      return;
    }

    setLoading(true);

    try {
      // Prepare update data (only send fields that have values)
      const updateData: any = {
        title: formData.title.trim()
      };

      if (formData.description.trim()) {
        updateData.description = formData.description.trim();
      }

      if (formData.meetingLink.trim()) {
        updateData.meetingLink = formData.meetingLink.trim();
      }

      const response = await putData(`/meetings/${meeting._id}`, updateData);

      if (response.success) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          meetingLink: ''
        });
      } else {
        alert(response.message || 'Failed to update meeting');
      }
    } catch (error) {
      console.error('Error updating meeting:', error);
      alert('Failed to update meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset form data to original values
      if (meeting) {
        setFormData({
          title: meeting.title || '',
          description: meeting.description || '',
          meetingLink: meeting.meetingLink || ''
        });
      }
    }
  };

  if (!meeting) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="h-5 w-5" />
            Edit Meeting
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Meeting Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Meeting Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Meeting Title <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Type className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter meeting title"
                    className="pl-10 focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter meeting description (optional)"
                  rows={3}
                  className="focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
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
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4" />
                  Update Meeting
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};