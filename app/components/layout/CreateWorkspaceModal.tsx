import React, { useState } from 'react';
import { postData } from '@/lib/fetch-util';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onWorkspaceCreated: () => void;
}

export function CreateWorkspaceModal({ open, onClose, onWorkspaceCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  try {
    await postData('/workspace', {  // ✅ Singular
      name,
      description,
    });
    toast.success('Workspace created successfully!');
    onWorkspaceCreated();
    onClose();
    // Reset form
    setName('');
    setDescription('');
  } catch (error) {
    toast.error('Failed to create workspace');
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold font-['Inter']">
            Create New Workspace
          </DialogTitle>
          <DialogDescription className="font-['Inter']">
            Create a new workspace to organize your projects and team collaboration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-[15px] mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Workspace Name *
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="font-['Inter']"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Workspace Description
            </Label>
            <Textarea
              id="description"
              placeholder="Enter workspace description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="font-['Inter'] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="font-['Inter']"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#F2761B] hover:bg-[#F2761B]/90 font-['Inter']"
            >
              {isSubmitting ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWorkspaceModal;
