import React, { useState, useEffect } from 'react';
import { postData, fetchData } from '@/lib/fetch-util';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X, Upload } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onProjectAdded: () => void;
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export function AddProjectModal({ open, onClose, onProjectAdded }: AddProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Planning');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [projectHeadId, setProjectHeadId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  // Fetch workspace members
  useEffect(() => {
    if (open) {
      fetchWorkspaceMembers();
    }
  }, [open]);

  const fetchWorkspaceMembers = async () => {
    try {
      const response = await fetchData('/project/members');
      const leads = (response.members || []).filter((m: WorkspaceMember) => m.role === 'lead');
      // Sort by name, fallback to email
      leads.sort((a: WorkspaceMember, b: WorkspaceMember) => {
        const aKey = (a.name || a.email || '').toLowerCase();
        const bKey = (b.name || b.email || '').toLowerCase();
        return aKey.localeCompare(bKey);
      });
      setWorkspaceMembers(leads);
    } catch (error) {
      console.error('Failed to load workspace members', error);
    }
  };

  const projectDuration = startDate && endDate
    ? differenceInDays(endDate, startDate)
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    // Validate file types against backend-allowed set
    const allowedMimes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    const valid = selectedFiles.filter(
      (f) => f.type.startsWith('image/') || allowedMimes.has(f.type)
    );
    if (valid.length !== selectedFiles.length) {
      toast.error('Only images, PDF, and DOCX files are allowed.');
    }
    setFiles([...files, ...valid]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectHeadId) {
      toast.error('Please select a project lead');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (endDate < startDate) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('status', status);
      formData.append('startDate', startDate.toISOString());
      formData.append('endDate', endDate.toISOString());
      formData.append('projectHeadId', projectHeadId);

      // Add files
      files.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api-v1/project`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project');
      }

      toast.success('Project created successfully!');
      onProjectAdded();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setStatus('Planning');
      setStartDate(undefined);
      setEndDate(undefined);
      setProjectHeadId('');
      setFiles([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[552px] p-0 gap-0 rounded-[16px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white px-[24px] pt-[24px] pb-0 shrink-0">
          <div className="flex items-start gap-[10px] mb-[10px]">
            <div className="w-[48px] h-[48px] rounded-[10px] bg-[rgba(27,89,248,0.1)] flex items-center justify-center shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2 6.94975C2 6.06722 2 5.62595 2.06935 5.25839C2.37464 3.64031 3.64031 2.37464 5.25839 2.06935C5.62595 2 6.06722 2 6.94975 2C7.33642 2 7.52976 2 7.71557 2.01738C8.51665 2.09229 9.27652 2.40704 9.89594 2.92051C10.0396 3.03961 10.1763 3.17633 10.4497 3.44975L11 4C11.8158 4.81578 12.2237 5.22367 12.7121 5.49543C12.9804 5.64471 13.2651 5.7626 13.5604 5.84678C14.0979 6 14.6747 6 15.8284 6H16.2021C18.8345 6 20.1506 6 21.0062 6.76946C21.0849 6.84024 21.1598 6.91514 21.2305 6.99383C22 7.84935 22 9.16554 22 11.7979V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V6.94975Z" stroke="#1B59F8" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
          <DialogHeader className="p-0 space-y-[4px]">
            <DialogTitle className="text-[16px] font-semibold font-['Inter'] text-[#181d27] leading-[24px]">
              Add Project
            </DialogTitle>
            <DialogDescription className="text-[14px] font-normal font-['Inter'] text-[#535862] leading-[20px]">
              Add a new project in "Workspace"
            </DialogDescription>
          </DialogHeader>
          <div className="h-[20px]" />
        </div>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-[24px] pr-[14px] overflow-y-auto flex-1">
            <div className="pr-[10px] space-y-[16px]">
              {/* Project Name */}
              <div className="space-y-[6px]">
                <Label htmlFor="title" className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Project Name <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Enter name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] placeholder:text-[#717680]"
                />
              </div>

              {/* Project Lead */}
              <div className="space-y-[6px]">
                <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Project Lead <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                </Label>
                <Select value={projectHeadId} onValueChange={setProjectHeadId}>
                  <SelectTrigger className="h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] font-['Inter'] text-[14px]">
                    <SelectValue placeholder="Select project lead" />
                  </SelectTrigger>
                  <SelectContent className="font-['Inter']">
                    {workspaceMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id} className="text-[14px]">
                        {member.name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[12px] font-normal font-['Inter'] text-[#717680]">
                  Only employees with the ‘lead’ role can be selected
                </p>
              </div>

              {/* Status */}
              <div className="space-y-[6px]">
                <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Status <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] font-['Inter'] text-[14px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="font-['Inter']">
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    {/* <SelectItem value="Cancelled">Cancelled</SelectItem> */}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date & Due Date with Calendar Picker */}
              <div className="flex gap-[10px] flex-wrap">
                <div className="flex-1 min-w-[221px] space-y-[6px]">
                  <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                    Start Date <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] justify-start text-left font-normal",
                          !startDate && "text-[#717680]"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 min-w-[221px] space-y-[6px]">
                  <Label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                    Due Date <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] justify-start text-left font-normal",
                          !endDate && "text-[#717680]"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const start = startDate || today;
                          return date < start;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {projectDuration > 0 && (
                  <div className="flex-1 min-w-[120px] px-0 py-[5px] flex items-center">
                    <p className="text-[12px] font-normal font-['Inter'] text-[#344bfd] opacity-80">
                      Project Duration: {projectDuration} days
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-[6px]">
                <Label htmlFor="description" className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Write project description here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] placeholder:text-[#717680] resize-none"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-[6px]">
                <Label htmlFor="attachments" className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Attachments
                </Label>
                <div className="border border-[#d5d7da] rounded-[8px]">
                  <label htmlFor="attachments" className="flex items-center gap-[8px] px-[14px] py-[10px] cursor-pointer hover:bg-gray-50">
                    <span className="flex-1 text-[14px] font-normal font-['Inter'] text-[#717680]">
                      Upload
                    </span>
                    <Upload size={24} className="text-[#717680]" />
                  </label>
                  <input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.docx"
                  />
                </div>
                {files.length > 0 && (
                  <div className="space-y-[6px] mt-[8px]">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-[8px] text-[12px] font-['Inter'] text-[#414651]">
                        <span className="flex-1 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-[#cd2818] hover:text-[#a01f10]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[12px] font-normal font-['Inter'] text-[#cd2812]">
                  Max: 5 files
                </p>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-[12px] px-[24px] py-[20px] border-t border-gray-100 shrink-0">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-[rgba(4,1,16,0.05)] hover:bg-[rgba(4,1,16,0.1)] text-[#040110] font-medium font-['Inter'] text-[14px] h-auto px-[15px] py-[10px] rounded-[8px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#f2761b] hover:bg-[#f2761b]/90 text-white font-medium font-['Inter'] text-[14px] h-auto px-[15px] py-[10px] rounded-[8px]"
            >
              {isSubmitting ? 'Creating...' : 'Add Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddProjectModal;
