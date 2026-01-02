import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Sprint {
  _id?: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  durationDays?: number;
  status?: string;
}

interface SprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sprintData: any) => Promise<void>;
  projectId: string;
  sprint?: Sprint | null; // If provided, we're editing
  mode: 'create' | 'edit';
}

export const SprintModal: React.FC<SprintModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  sprint,
  mode
}) => {
  const [formData, setFormData] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: ''
  });

  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [endDateObj, setEndDateObj] = useState<Date | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sprint && mode === 'edit') {
      const startDate = formatDateForInput(sprint.startDate);
      const endDate = formatDateForInput(sprint.endDate);
      setFormData({
        name: sprint.name || '',
        goal: sprint.goal || '',
        startDate,
        endDate
      });

      // Set date objects only if valid dates exist
      if (sprint.startDate) {
        const startDateObj = new Date(sprint.startDate);
        if (!isNaN(startDateObj.getTime())) {
          setStartDateObj(startDateObj);
        } else {
          setStartDateObj(undefined);
        }
      }
      if (sprint.endDate) {
        const endDateObj = new Date(sprint.endDate);
        if (!isNaN(endDateObj.getTime())) {
          setEndDateObj(endDateObj);
        } else {
          setEndDateObj(undefined);
        }
      }
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        goal: '',
        startDate: '',
        endDate: ''
      });
      setStartDateObj(undefined);
      setEndDateObj(undefined);
    }
    setErrors({});
  }, [sprint, mode, isOpen]);

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Title is required';
    }

    if (!formData.goal.trim()) {
      newErrors.goal = 'Description is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const submitData: any = {
        name: formData.name.trim(),
        goal: formData.goal.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        projectId
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting sprint:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save sprint'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  console.log('SprintModal rendering with isOpen:', isOpen, 'mode:', mode);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Sprint' : 'Create New Sprint'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update sprint details' : 'Create a new sprint for your project'}
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sprint Title */}
          <div className="space-y-[6px]">
            <Label htmlFor="name" className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
              Title <span className="text-[#cd2818] font-['Work_Sans']">*</span>
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={cn(
                "h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px]",
                errors.name && "border-[#cd2818] focus-visible:ring-[#cd2818]"
              )}
              placeholder="e.g., Sprint 1, Q1 2025 Sprint, Feature X Sprint"
            />
            {errors.name && (
              <p className="mt-1 text-[12px] text-[#cd2818] flex items-center gap-1 font-['Inter']">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Sprint Description */}
          <div className="space-y-[6px]">
            <Label htmlFor="goal" className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
              Description <span className="text-[#cd2818] font-['Work_Sans']">*</span>
            </Label>
            <Textarea
              id="goal"
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              rows={3}
              className={cn(
                "min-h-[88px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px]",
                errors.goal && "border-[#cd2818] focus-visible:ring-[#cd2818]"
              )}
              placeholder="What do you want to achieve in this sprint?"
            />
            {errors.goal && (
              <p className="mt-1 text-[12px] text-[#cd2818] flex items-center gap-1 font-['Inter']">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.goal}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-[6px]">
            <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
              Start Date <span className="text-[#cd2818] font-['Work_Sans']">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal",
                    !startDateObj && "text-[#717680]",
                    errors.startDate && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDateObj ? format(startDateObj, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDateObj}
                  onSelect={(date) => {
                    if (!date) return;
                    setStartDateObj(date);
                    const formattedDate = format(date, "yyyy-MM-dd");
                    setFormData(prev => ({ ...prev, startDate: formattedDate }));

                    // Clear error for this field
                    if (errors.startDate) {
                      setErrors(prev => ({ ...prev, startDate: '' }));
                    }

                    // Ensure end date is after start date
                    if (endDateObj && endDateObj < date) {
                      setEndDateObj(date);
                      setFormData(prev => ({ ...prev, endDate: formattedDate }));
                    }
                  }}
                  disabled={(date) => {
                    // Disable dates before today
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                />
              </PopoverContent>
            </Popover>
            {errors.startDate && (
              <p className="mt-1 text-[12px] text-[#cd2818] flex items-center gap-1 font-['Inter']">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.startDate}
              </p>
            )}
          </div>

          {/* End Date */}
          <div className="space-y-[6px]">
            <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
              End Date <span className="text-[#cd2818] font-['Work_Sans']">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal",
                    !endDateObj && "text-[#717680]",
                    errors.endDate && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDateObj ? format(endDateObj, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDateObj}
                  onSelect={(date) => {
                    if (!date) return;
                    setEndDateObj(date);
                    setFormData(prev => ({ ...prev, endDate: format(date, "yyyy-MM-dd") }));

                    // Clear error for this field
                    if (errors.endDate) {
                      setErrors(prev => ({ ...prev, endDate: '' }));
                    }
                  }}
                  disabled={(date) => {
                    // Disable dates before today
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) return true;

                    // Disable dates before start date
                    if (startDateObj && date < startDateObj) return true;
                    return false;
                  }}
                />
              </PopoverContent>
            </Popover>
            {errors.endDate && (
              <p className="mt-1 text-[12px] text-[#cd2818] flex items-center gap-1 font-['Inter']">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.endDate}
              </p>
            )}
          </div>

          {/* Info Box */}
          {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Sprint Duration Calculation</p>
                <p>
                  The system automatically excludes Sundays when calculating sprint duration.
                  For example, a 14-day sprint might span 16 calendar days if it includes 2 Sundays.
                </p>
              </div>
            </div>
          </div> */}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[8px] p-[16px]">
              <p className="text-[14px] text-[#991b1b] flex items-center gap-2 font-['Inter']">
                <AlertCircle className="w-5 h-5" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                mode === 'edit' ? 'Update Sprint' : 'Create Sprint'
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SprintModal;
