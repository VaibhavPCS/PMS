import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Target, AlertCircle } from 'lucide-react';
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
    endDate: '',
    durationDays: '',
    useDuration: false
  });

  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [endDateObj, setEndDateObj] = useState<Date | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [calculatedEndDate, setCalculatedEndDate] = useState<string>('');

  useEffect(() => {
    if (sprint && mode === 'edit') {
      const startDate = formatDateForInput(sprint.startDate);
      const endDate = formatDateForInput(sprint.endDate);
      setFormData({
        name: sprint.name,
        goal: sprint.goal,
        startDate,
        endDate,
        durationDays: '',
        useDuration: false
      });
      setStartDateObj(new Date(sprint.startDate));
      setEndDateObj(new Date(sprint.endDate));
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        goal: '',
        startDate: '',
        endDate: '',
        durationDays: '',
        useDuration: false
      });
      setStartDateObj(undefined);
      setEndDateObj(undefined);
    }
    setErrors({});
    setCalculatedEndDate('');
  }, [sprint, mode, isOpen]);

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Calculate end date if using duration mode
    if (name === 'durationDays' && formData.useDuration && formData.startDate && value) {
      calculateEndDate(formData.startDate, parseInt(value));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setFormData(prev => ({ ...prev, useDuration: checked }));

    if (checked && formData.startDate && formData.durationDays) {
      calculateEndDate(formData.startDate, parseInt(formData.durationDays));
    } else {
      setCalculatedEndDate('');
    }
  };

  const calculateEndDate = async (startDate: string, durationDays: number) => {
    // This is a client-side approximation
    // The server will do the actual calculation excluding Sundays
    const start = new Date(startDate);
    let workingDaysAdded = 0;
    let currentDate = new Date(start);

    while (workingDaysAdded < durationDays - 1) {
      currentDate.setDate(currentDate.getDate() + 1);
      // Skip Sundays
      if (currentDate.getDay() !== 0) {
        workingDaysAdded++;
      }
    }

    // Skip if landed on Sunday
    while (currentDate.getDay() === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setCalculatedEndDate(formatDateForInput(currentDate.toISOString()));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Sprint name is required';
    }

    if (!formData.goal.trim()) {
      newErrors.goal = 'Sprint goal is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.useDuration) {
      if (!formData.durationDays || parseInt(formData.durationDays) < 1) {
        newErrors.durationDays = 'Duration must be at least 1 day';
      }
    } else {
      if (!formData.endDate) {
        newErrors.endDate = 'End date is required';
      } else if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (end <= start) {
          newErrors.endDate = 'End date must be after start date';
        }
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
        projectId
      };

      if (formData.useDuration) {
        submitData.durationDays = parseInt(formData.durationDays);
      } else {
        submitData.endDate = formData.endDate;
      }

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
          {/* Sprint Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Sprint Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Sprint 1, Q1 2025 Sprint, Feature X Sprint"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Sprint Goal */}
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
              Sprint Goal *
            </label>
            <textarea
              id="goal"
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.goal ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="What do you want to achieve in this sprint?"
            />
            {errors.goal && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.goal}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
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

                    // Calculate end date if using duration mode
                    if (formData.useDuration && formData.durationDays) {
                      calculateEndDate(formattedDate, parseInt(formData.durationDays));
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.startDate}
              </p>
            )}
          </div>

          {/* Duration Mode Toggle */}
          {mode === 'create' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useDuration"
                checked={formData.useDuration}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="useDuration" className="text-sm font-medium text-gray-700">
                Calculate end date from duration (excluding Sundays)
              </label>
            </div>
          )}

          {/* Duration Days (if enabled) */}
          {formData.useDuration && mode === 'create' ? (
            <div>
              <label htmlFor="durationDays" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (working days, excluding Sundays) *
              </label>
              <input
                type="number"
                id="durationDays"
                name="durationDays"
                value={formData.durationDays}
                onChange={handleChange}
                min="1"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.durationDays ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 14"
              />
              {errors.durationDays && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.durationDays}
                </p>
              )}
              {calculatedEndDate && (
                <p className="mt-2 text-sm text-gray-600">
                  Calculated end date: {new Date(calculatedEndDate).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
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
                      // Disable dates before start date
                      if (startDateObj && date < startDateObj) return true;
                      return false;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.endDate}
                </p>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 flex items-center gap-2">
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
