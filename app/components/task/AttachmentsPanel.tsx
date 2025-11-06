import React, { useState } from 'react';
import { Eye, Trash2, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { ImagePreviewModal } from '../ui/image-preview-modal';
import { cn } from '@/lib/utils';
import { buildBackendUrl } from '@/lib/config';

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'document';
  fileSize: number;
  mimeType: string;
}

interface AttachmentsPanelProps {
  attachments: Attachment[];
  onDelete?: (index: number) => void;
  onPreview?: (attachment: Attachment) => void;
  canDelete?: boolean;
  className?: string;
}

export function AttachmentsPanel({
  attachments,
  onDelete,
  onPreview,
  canDelete = false,
  className,
}: AttachmentsPanelProps) {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (attachment: Attachment) => {
    if (attachment.fileType === 'image') {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }

    if (attachment.mimeType?.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }

    if (attachment.mimeType?.includes('word') || attachment.mimeType?.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }

    return <FileIcon className="w-5 h-5 text-gray-500" />;
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = buildBackendUrl(attachment.fileUrl);
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (attachment: Attachment, index: number) => {
    if (attachment.fileType === 'image') {
      // Find the index among image attachments only
      const imageAttachments = attachments.filter(a => a.fileType === 'image');
      const imageIndex = imageAttachments.findIndex(img => img.fileUrl === attachment.fileUrl);

      // Only open modal if image was found
      if (imageIndex >= 0) {
        setPreviewImageIndex(imageIndex);
        setPreviewModalOpen(true);
      }
    } else {
      handleDownload(attachment);
    }
  };

  // Get all image attachments for the modal
  const imageAttachments = attachments.filter(a => a.fileType === 'image');

  if (!attachments || attachments.length === 0) {
    return (
      <div className={cn('p-4 text-center text-gray-500 text-sm', className)}>
        <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No attachments</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-[250px]', className)}>
      <div className="space-y-2 p-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            {/* File Icon */}
            <div className="flex-shrink-0">
              {getFileIcon(attachment)}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {attachment.fileName}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(attachment.fileSize)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePreview(attachment, index)}
                className="h-7 w-7 p-0"
                title={attachment.fileType === 'image' ? 'Preview' : 'Download'}
              >
                {attachment.fileType === 'image' ? (
                  <Eye className="h-4 w-4 text-gray-600" />
                ) : (
                  <svg
                    className="h-4 w-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                )}
              </Button>

              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(index)}
                  className="h-7 w-7 p-0 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Image Preview Modal */}
      {imageAttachments.length > 0 && (
        <ImagePreviewModal
          images={imageAttachments}
          initialIndex={previewImageIndex}
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}
    </ScrollArea>
  );
}
