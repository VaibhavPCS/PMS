import React, { useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { postMultipart } from "@/lib/fetch-util";
import { Button } from "@/components/ui/button";

interface AttachmentUploadProps {
  projectId: string;
  currentAttachmentCount: number;
  onUploadSuccess: () => void;
}

export function AttachmentUpload({
  projectId,
  currentAttachmentCount,
  onUploadSuccess
}: AttachmentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxAttachments = 10;
  const remainingSlots = maxAttachments - currentAttachmentCount;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Allowed MIME types/extensions aligned with backend
    const allowedMimes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ]);
    const allowedImage = (type: string) => type.startsWith('image/');

    // Filter invalid files and report
    const invalid = files.filter(
      (f) => !(allowedImage(f.type) || allowedMimes.has(f.type))
    );
    if (invalid.length > 0) {
      setError('Only images (jpg, png, gif) and PDF or DOCX documents are allowed.');
      return;
    }

    // Check if adding these files would exceed the limit
    if (files.length + currentAttachmentCount > maxAttachments) {
      setError(`Maximum ${maxAttachments} attachments allowed. You can only add ${remainingSlots} more.`);
      return;
    }

    setSelectedFiles(files);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Defensive check: ensure only allowed types
      const allowedMimes = new Set([
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]);
      for (const f of selectedFiles) {
        if (!(f.type.startsWith('image/') || allowedMimes.has(f.type))) {
          setError('Only images (jpg, png, gif) and PDF or DOCX documents are allowed.');
          setUploading(false);
          return;
        }
      }

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('attachments', file);
      });

      await postMultipart(`/projects/${projectId}/attachments`, formData);

      setSelectedFiles([]);
      onUploadSuccess();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachments');
    } finally {
      setUploading(false);
    }
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (currentAttachmentCount >= maxAttachments) {
    return (
      <div className="text-sm text-gray-500 italic">
        Maximum {maxAttachments} attachments reached
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="attachment-upload"
          accept="image/*,.pdf,.docx"
          disabled={uploading || remainingSlots === 0}
        />
        <label
          htmlFor="attachment-upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors font-['Inter'] font-medium"
        >
          <Upload className="w-4 h-4" />
          Select Files ({remainingSlots} slots remaining)
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            Selected files ({selectedFiles.length}):
          </div>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isImageFile(file) ? (
                    <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  disabled={uploading}
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-[#f2761b] hover:bg-[#d96816] text-white"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
          </Button>
        </div>
      )}
    </div>
  );
}
