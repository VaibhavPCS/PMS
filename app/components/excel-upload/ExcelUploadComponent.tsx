import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Download, RefreshCw, Edit3, Save, X } from 'lucide-react';
import { useAuth } from '@/provider/auth-context';
import { fetchData, postMultipart } from '@/lib/fetch-util';

interface Workspace {
  _id: string;
  name: string;
  description: string;
  role: string;
}

interface Project {
  _id: string;
  title: string;
  description: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

interface TaskResult {
  row: number;
  taskId?: string;
  title?: string;
  errors?: string[];
}

interface UploadResult {
  total: number;
  successful: TaskResult[];
  failed: TaskResult[];
}

const ExcelUploadComponent: React.FC = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [excelData, setExcelData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<any[]>([]);
  const [projectLeads, setProjectLeads] = useState<any[]>([]);
  const [selectedProjectLead, setSelectedProjectLead] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch workspaces on component mount
  React.useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Fetch projects when workspace changes
  React.useEffect(() => {
    if (selectedWorkspace) {
      fetchProjects(selectedWorkspace);
    } else {
      setProjects([]);
      setSelectedProject('');
      setUsers([]);
      setSelectedUser('');
    }
  }, [selectedWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetchData('/excel-upload/workspaces');
      if (response.success) {
        setWorkspaces(response.data);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setError('Failed to fetch workspaces');
    }
  };

  const fetchProjects = async (workspaceId: string) => {
    try {
      const response = await fetchData(`/excel-upload/workspaces/${workspaceId}/projects`);
      if (response.success) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to fetch projects');
    }
  };

  const fetchUsers = async (projectId: string) => {
    try {
      const response = await fetchData(`/excel-upload/projects/${projectId}/users`);
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSelectedUser('');
    setUsers([]);
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    setSuccess('');
    
    if (projectId) {
      fetchUsers(projectId);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      setSuccess('');
      setUploadResult(null);
      
      // Parse Excel file for preview
      await parseExcelForPreview(file);
    }
  };

  const parseExcelForPreview = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(50);
      
      // Use FileReader to read the Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Send to backend for parsing
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await postMultipart('/excel-upload/parse-preview', formData);
          
          if (response.success) {
            setExcelData(response.data);
            setEditedData(response.data);
            setShowPreview(true);
            setError('');
          } else {
            setError('Failed to parse Excel file: ' + response.message);
          }
        } catch (error: any) {
          console.error('Excel parsing error:', error);
          setError('Failed to parse Excel file. Please check the format.');
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      console.error('File reading error:', error);
      setError('Failed to read file. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedWorkspace) {
      setError('Please select a workspace');
      return;
    }
    
    if (!selectedProject) {
      setError('Please select a project');
      return;
    }
    
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }
    
    if (!selectedFile) {
      setError('Please select an Excel file');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('workspaceId', selectedWorkspace);
    formData.append('projectId', selectedProject);
    formData.append('userId', selectedUser);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await postMultipart('/excel-upload/upload-tasks', formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        setSuccess(response.message);
        setUploadResult(response.data);
        // Reset file selection
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError('Upload failed: ' + response.data.message);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = () => {
    // Create a template Excel file structure
    const templateData = [
      {
        'Task Name': 'Sample Task 1',
        'Task Description': 'This is a sample task description',
        'Status': 'to-do',
        'Priority': 'medium',
        'Start Date': '2024-01-01',
        'End Date': '2024-01-15',
        'Assignee': 'john.doe@example.com',
        'Approval Status': 'not-required',
        'Approval By': '',
        'Approval Date': ''
      },
      {
        'Task Name': 'Sample Task 2',
        'Task Description': 'Another sample task',
        'Status': 'in-progress',
        'Priority': 'high',
        'Start Date': '2024-01-10',
        'End Date': '2024-01-20',
        'Assignee': 'jane.smith@example.com',
        'Approval Status': 'approved',
        'Approval By': 'lead.user@example.com',
        'Approval Date': '2024-01-05'
      }
    ];

    // Create CSV content for download
    const headers = Object.keys(templateData[0]);
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task-upload-template-with-approval.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setSelectedWorkspace('');
    setSelectedProject('');
    setSelectedUser('');
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    setSuccess('');
    setExcelData([]);
    setShowPreview(false);
    setEditingRow(null);
    setEditedData([]);
    setProjectLeads([]);
    setSelectedProjectLead('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditCell = (rowIndex: number, field: string, value: any) => {
    const newData = [...editedData];
    newData[rowIndex][field] = value;
    setEditedData(newData);
  };

  const handleEditRow = (rowIndex: number) => {
    setEditingRow(rowIndex);
  };

  const handleSaveRow = (rowIndex: number) => {
    setEditingRow(null);
  };

  const handleCancelEdit = (rowIndex: number) => {
    // Revert changes for this row
    const newData = [...editedData];
    newData[rowIndex] = { ...excelData[rowIndex] };
    setEditedData(newData);
    setEditingRow(null);
  };

  const fetchProjectLeads = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await fetchData(`/excel-upload/projects/${selectedProject}/leads`);
      if (response.success) {
        setProjectLeads(response.data);
      }
    } catch (error) {
      console.error('Error fetching project leads:', error);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !selectedWorkspace || !selectedProject || !selectedUser) {
      setError('Please complete all selections before uploading');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create form data with edited data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('workspaceId', selectedWorkspace);
      formData.append('projectId', selectedProject);
      formData.append('userId', selectedUser);
      formData.append('projectLeadId', selectedProjectLead);
      formData.append('taskData', JSON.stringify(editedData));
      
      const response = await postMultipart('/excel-upload/upload-tasks', formData);
      
      if (response.success) {
        setUploadResult(response.data);
        setSuccess(`Successfully created ${response.data.successful.length} tasks!`);
        setShowPreview(false);
        setExcelData([]);
        setEditedData([]);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError('Upload failed: ' + response.message);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Upload Tasks from Excel</CardTitle>
          <CardDescription>
            Import tasks from an Excel file into your project. Download the template to see the required format. New fields added: Approval By (project lead email), Approval Date (YYYY-MM-DD).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Workspace Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Workspace</label>
              <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace._id} value={workspace._id}>
                      {workspace.name} ({workspace.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Project</label>
              <Select value={selectedProject} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-full" disabled={!selectedWorkspace}>
                  <SelectValue placeholder={selectedWorkspace ? "Choose a project" : "Select workspace first"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User (Assignee)</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full" disabled={!selectedProject}>
                  <SelectValue placeholder={selectedProject ? "Choose a user" : "Select project first"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Excel File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-file-input"
                  disabled={!selectedUser}
                />
                <label
                  htmlFor="excel-file-input"
                  className={`cursor-pointer flex flex-col items-center space-y-2 ${!selectedUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FileSpreadsheet className="w-12 h-12 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : 'Click to select Excel file'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Supported formats: .xlsx, .xls (Max 10MB)
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Template</span>
              </Button>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  disabled={isUploading}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !selectedWorkspace || !selectedProject || isUploading}
                  className="flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Tasks</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            {showPreview && editedData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Preview Tasks</h3>
                  <Badge variant="outline">{editedData.length} tasks ready to upload</Badge>
                </div>



                {/* Preview Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Edit</TableHead>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Approval Status</TableHead>
                          <TableHead>Approval By</TableHead>
                          <TableHead>Approval Date</TableHead>
                          <TableHead>Assignee</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editedData.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {editingRow === index ? (
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSaveRow(index)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCancelEdit(index)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditRow(index)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <input
                                  type="text"
                                  value={row.title || ''}
                                  onChange={(e) => handleEditCell(index, 'title', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  onBlur={() => setEditingRow(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingRow(null);
                                    if (e.key === 'Escape') setEditingRow(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              ) : (
                                row.title
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <textarea
                                  value={row.description || ''}
                                  onChange={(e) => handleEditCell(index, 'description', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border rounded resize-none"
                                  rows={2}
                                  onBlur={() => setEditingRow(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) setEditingRow(null);
                                    if (e.key === 'Escape') setEditingRow(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              ) : (
                                <div className="max-w-xs truncate" title={row.description}>
                                  {row.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <input
                                  type="date"
                                  value={row.startDate ? new Date(row.startDate).toISOString().split('T')[0] : ''}
                                  onChange={(e) => handleEditCell(index, 'startDate', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  onBlur={() => setEditingRow(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingRow(null);
                                    if (e.key === 'Escape') setEditingRow(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              ) : (
                                new Date(row.startDate).toLocaleDateString()
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <input
                                  type="date"
                                  value={row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : ''}
                                  onChange={(e) => handleEditCell(index, 'dueDate', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  onBlur={() => setEditingRow(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingRow(null);
                                    if (e.key === 'Escape') setEditingRow(null);
                                  }}
                                  autoFocus
                                />
                              ) : (
                                new Date(row.dueDate).toLocaleDateString()
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <Select value={row.status || 'to-do'} onValueChange={(value) => handleEditCell(index, 'status', value)}>
                                  <SelectTrigger className="w-full h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="to-do">To Do</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="on-hold">On Hold</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline">{row.status || 'to-do'}</Badge>
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <Select value={row.priority || 'medium'} onValueChange={(value) => handleEditCell(index, 'priority', value)}>
                                  <SelectTrigger className="w-full h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline">{row.priority || 'medium'}</Badge>
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <Select value={row.approvalStatus || 'not-required'} onValueChange={(value) => handleEditCell(index, 'approvalStatus', value)}>
                                  <SelectTrigger className="w-full h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not-required">Not Required</SelectItem>
                                    <SelectItem value="pending-approval">Pending Approval</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge 
                                  variant={row.approvalStatus === 'approved' ? 'default' : 
                                         row.approvalStatus === 'rejected' ? 'destructive' : 
                                         row.approvalStatus === 'pending-approval' ? 'secondary' : 'outline'}
                                >
                                  {row.approvalStatus || 'not-required'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <Select 
                                  value={row.approvalBy || 'none'} 
                                  onValueChange={(value) => handleEditCell(index, 'approvalBy', value === 'none' ? null : value)}
                                  disabled={row.approvalStatus !== 'approved'}
                                >
                                  <SelectTrigger className="w-full h-8 text-sm">
                                    <SelectValue placeholder="Select lead" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {users.filter(user => user.role === 'lead').map((user) => (
                                      <SelectItem key={user._id} value={user._id}>
                                        {user.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm">
                                  {row.approvalBy && row.approvalBy !== 'none' ? users.find(u => u._id === row.approvalBy)?.name || 'Unknown' : 'None'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setEditingRow(index)}
                            >
                              {editingRow === index ? (
                                <input
                                  type="date"
                                  value={row.approvalDate ? new Date(row.approvalDate).toISOString().split('T')[0] : ''}
                                  onChange={(e) => handleEditCell(index, 'approvalDate', e.target.value === '' ? null : e.target.value)}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                  disabled={row.approvalStatus !== 'approved'}
                                  onBlur={() => setEditingRow(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingRow(null);
                                    if (e.key === 'Escape') setEditingRow(null);
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span className="text-sm">
                                  {row.approvalDate ? new Date(row.approvalDate).toLocaleDateString() : 'N/A'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {users.find(u => u._id === selectedUser)?.name || 'Selected User'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Preview Action Buttons */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPreview(false);
                      setExcelData([]);
                      setEditedData([]);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    Cancel Preview
                  </Button>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleConfirmUpload}
                      disabled={isUploading || editedData.length === 0}
                      className="flex items-center space-x-2"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Confirm Upload ({editedData.length} tasks)</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Table */}
            {uploadResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Upload Results</h3>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Success: {uploadResult.successful.length}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      Failed: {uploadResult.failed.length}
                    </Badge>
                  </div>
                </div>

                {uploadResult.failed.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Errors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadResult.failed.map((failure, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{failure.row}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {failure.errors?.map((error, errorIndex) => (
                                  <div key={errorIndex} className="text-sm text-red-600 flex items-center space-x-1">
                                    <XCircle className="w-3 h-3" />
                                    <span>{error}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {uploadResult.successful.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Successfully created {uploadResult.successful.length} tasks.
                    {uploadResult.successful.slice(0, 3).map((success, index) => (
                      <div key={index} className="flex items-center space-x-1 mt-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>{success.title}</span>
                      </div>
                    ))}
                    {uploadResult.successful.length > 3 && (
                      <div className="mt-1">...and {uploadResult.successful.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExcelUploadComponent;