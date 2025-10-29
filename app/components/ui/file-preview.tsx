import React, { useState } from 'react';
import { File, Download, Eye, X, ExternalLink } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { buildBackendUrl } from '@/lib/config';

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'document';
  fileSize: number;
  mimeType: string;
}

interface FilePreviewProps {
  attachments: Attachment[];
  canDelete?: boolean;
  onDelete?: (index: number) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ 
  attachments, 
  canDelete = false, 
  onDelete 
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet')) return '📊';
    return '📁';
  };

  const downloadFile = async (attachment: Attachment) => {
    try {
      // Fetch the file with proper headers to force download
      const response = await fetch(buildBackendUrl(attachment.fileUrl), {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      // Get the file as a blob
      const blob = await response.blob();
      
      // Create a blob URL with the correct MIME type for forced download
      const blobUrl = URL.createObjectURL(new Blob([blob], { 
        type: 'application/octet-stream' // Force download by using generic binary type
      }));

      // Create and trigger download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.fileName;
      link.style.display = 'none';
      
      // Add to DOM, click, and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL to free memory
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to the original method if fetch fails
      const link = document.createElement('a');
      link.href = buildBackendUrl(attachment.fileUrl);
      link.download = attachment.fileName;
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openFile = (attachment: Attachment) => {
    const fileUrl = buildBackendUrl(attachment.fileUrl);
    window.open(fileUrl, '_blank');
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment, index) => (
        <div key={index} className="relative">
          {attachment.fileType === 'image' ? (
            // Image Preview
            <div className="relative max-w-xs">
              <img
                src={buildBackendUrl(attachment.fileUrl)}
                alt={attachment.fileName}
                className="rounded-lg max-h-48 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setPreviewImage(buildBackendUrl(attachment.fileUrl))}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {attachment.fileName}
              </div>
              {canDelete && onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 p-1 h-auto"
                  onClick={() => onDelete(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ) : (
            // Document Preview
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getFileIcon(attachment.mimeType)}</span>
                <div>
                  <div className="font-medium text-sm">{attachment.fileName}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(attachment.fileSize)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openFile(attachment)}
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadFile(attachment)}
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </Button>
                {canDelete && onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FilePreview;
