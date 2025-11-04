import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { X, Download } from "lucide-react";
import { buildBackendUrl } from "@/lib/config";

interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  size?: number;
  mimeType?: string;
  path: string;
}

interface FilePreviewModalProps {
  attachment: Attachment | null;
  open: boolean;
  onClose: () => void;
}

export function FilePreviewModal({ attachment, open, onClose }: FilePreviewModalProps) {
  if (!attachment) return null;

  const isImage = attachment.mimeType?.startsWith('image/');
  const isPDF = attachment.mimeType === 'application/pdf';

  // Construct file URL based on saved path (served via /uploads)
  const safePath = attachment.path?.startsWith('/') ? attachment.path : `/${attachment.path}`;
  const fileUrl = buildBackendUrl(safePath);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-[18px] font-semibold font-['Inter'] text-[#040110]">
                {attachment.originalName}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Preview of {attachment.originalName}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-auto max-h-[calc(90vh-120px)]">
          {isImage ? (
            <div className="flex items-center justify-center p-4">
              <img
                src={fileUrl}
                alt={attachment.originalName}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded border"
              title={attachment.originalName}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-gray-500 mb-4">
                Preview not available for this file type
              </div>
              <button
                onClick={handleDownload}
                className="bg-[#f2761b] text-white px-6 py-2 rounded-lg hover:bg-[#d96816] transition-colors font-['Inter'] font-medium"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
