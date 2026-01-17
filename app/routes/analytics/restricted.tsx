
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/provider/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, Calendar as CalendarIcon, User } from 'lucide-react';
import axios from '@/lib/axios';
import { ProductivityReportView } from '@/features/analytics/components/ProductivityReportView';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ReportData } from '@/features/analytics/types';

interface HierarchicalMember {
  id: string;
  name: string;
  email: string;
  role: string;
  profilePicture: string | null;
  reports?: HierarchicalMember[];
}

interface FlatMember {
  id: string;
  name: string;
  role: string;
  level: number;
}

const flattenHierarchy = (members: HierarchicalMember[], level = 0): FlatMember[] => {
  return members.reduce((acc, member) => {
    acc.push({ 
      id: member.id, 
      name: member.name, 
      role: member.role, 
      level 
    });
    if (member.reports && member.reports.length > 0) {
      acc.push(...flattenHierarchy(member.reports, level + 1));
    }
    return acc;
  }, [] as FlatMember[]);
};

export default function TeamReportPage() {
  const { user } = useAuth();
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [hierarchyError, setHierarchyError] = useState('');
  const [hierarchy, setHierarchy] = useState<HierarchicalMember[]>([]);
  
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Fetch Team Hierarchy
  useEffect(() => {
    const fetchHierarchy = async () => {
      if (!user?._id) return;
      
      try {
        setLoadingHierarchy(true);
        const res = await axios.get(`/analytics/leaders/${user._id}/hierarchy`);
        setHierarchy(res.data);
      } catch (err: any) {
        setHierarchyError(err.response?.data?.message || 'Failed to load team hierarchy');
      } finally {
        setLoadingHierarchy(false);
      }
    };

    fetchHierarchy();
  }, [user?._id]);

  const flatMembers = useMemo(() => flattenHierarchy(hierarchy), [hierarchy]);

  const canGenerate = selectedMemberId && startDate && endDate;

  const generateReport = async () => {
    if (!canGenerate) return;
    
    try {
      setReportLoading(true);
      setReportError('');
      setReportData(null);

      const startStr = format(startDate!, 'yyyy-MM-dd');
      const endStr = format(endDate!, 'yyyy-MM-dd');

      const res = await axios.get(`/analytics/snapshot/user/${selectedMemberId}/range?startDate=${startStr}&endDate=${endStr}`);
      setReportData(res.data);
    } catch (e: any) {
      setReportError('Failed to generate report: ' + (e.response?.data?.message || e.message));
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownload = async (downloadFormat: 'excel' | 'pdf') => {
    if (!canGenerate) return;
    
    const startStr = format(startDate!, 'yyyy-MM-dd');
    const endStr = format(endDate!, 'yyyy-MM-dd');

    const url = downloadFormat === 'excel'
      ? `/analytics/export/user/${selectedMemberId}?startDate=${startStr}&endDate=${endStr}`
      : `/analytics/export/user/${selectedMemberId}/pdf?startDate=${startStr}&endDate=${endStr}`;

    const headers = downloadFormat === 'excel' ? { 'Accept': 'text/csv' } : {};
    try {
      const resp = await axios.get(url, { responseType: 'blob', headers });
      const blob = new Blob([resp.data], { type: downloadFormat === 'excel' ? 'text/csv' : 'application/pdf' });
      const link = document.createElement('a');
      const fname = downloadFormat === 'excel' ? `user-${selectedMemberId}-productivity.csv` : `user-${selectedMemberId}-productivity.pdf`;
      link.href = URL.createObjectURL(blob);
      link.download = fname;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e: any) {
      console.error('Download failed', e);
      setReportError('Failed to download report: ' + (e.message || 'Unknown error'));
    }
  };

  if (loadingHierarchy) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading team structure...</span>
      </div>
    );
  }

  if (hierarchyError) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p className="font-medium">Access Restricted</p>
          </div>
          <p className="text-sm text-red-500 mt-2">{hierarchyError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="bg-white p-4 rounded-lg border border-[#e6e8ec] shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* User Selector */}
          <div>
            <label className="block text-[13px] font-medium text-[#111827] mb-2">User</label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-left text-[14px] hover:border-[#F2761B] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none flex items-center justify-between gap-2 [&>svg]:hidden">
                <span className="truncate text-[#111827]">
                  <SelectValue placeholder="Select team member" />
                </span>
                <span className="text-[#9ca3af] text-xs">▼</span>
              </SelectTrigger>
              <SelectContent>
                {flatMembers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">No reporting members found</div>
                ) : (
                    flatMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                        <span style={{ paddingLeft: `${member.level * 10}px` }}>
                        {member.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-400 capitalize">({member.role})</span>
                    </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[13px] font-medium text-[#111827] mb-2">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal border-[#e6e8ec] hover:border-[#F2761B] hover:text-black",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd-MM-yyyy") : <span>Pick start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[13px] font-medium text-[#111827] mb-2">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal border-[#e6e8ec] hover:border-[#F2761B] hover:text-black",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd-MM-yyyy") : <span>Pick end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Generate Button */}
          <div>
            <Button 
                onClick={generateReport}
                disabled={!canGenerate || reportLoading}
                className="w-full bg-[#F2761B] hover:bg-[#F2761B]/90 text-white"
            >
                {reportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Generate Report
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="min-h-[400px]">
        {reportError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 mb-4">
                {reportError}
            </div>
        )}

        {!reportData && !reportLoading && !reportError && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-gray-200 bg-gray-50/50 rounded-lg mt-8">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <User className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Select Member & Date Range</h3>
                <p className="text-gray-500 mt-2 max-w-sm">
                    Choose a team member and date range above to view their detailed productivity report.
                </p>
            </div>
        )}

        {reportData && (
            <ProductivityReportView reportData={reportData} onDownload={handleDownload} />
        )}
      </div>
    </div>
  );
}
