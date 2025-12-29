import React from 'react';
import ExcelUploadComponent from '@/components/excel-upload/ExcelUploadComponent';

export default function ExcelUpload() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Excel Data Upload</h1>
        <p className="text-muted-foreground">
          Upload project tasks from Excel files with workspace and project selection
        </p>
      </div>
      <ExcelUploadComponent />
    </div>
  );
}