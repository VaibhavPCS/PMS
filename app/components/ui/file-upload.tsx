import React, { useState, useRef } from 'react';
import { X, Upload, File, Image } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelect,
  selectedFiles,
  maxFiles = 3,
  maxFileSize = 5
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(newFiles).forEach(file => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max ${maxFileSize}MB)`);
        return;
      }

      // Check total file count
      if (selectedFiles.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      onFilesSelect([...selectedFiles, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesSelect(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className="w-full">
      {/* Selected Files Display */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                {isImage(file) ? (
                  <Image className="w-4 h-4 text-blue-500" />
                ) : (
                  <File className="w-4 h-4 text-gray-500" />
                )}
                <div>
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Upload Button */}
      {selectedFiles.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-10"
        >
          <Upload className="w-4 h-4 mr-2" />
          Attach Files ({selectedFiles.length}/{maxFiles})
        </Button>
      )}
    </div>
  );
};

export default FileUpload;
