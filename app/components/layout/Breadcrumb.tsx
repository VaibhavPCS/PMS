import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronRight, Home, Building, ChevronLeft, LayoutDashboard } from 'lucide-react';

export function Breadcrumb() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate(-1);
  };

  const isWorkspace = location.pathname.includes('/workspace');
  const isDashboard = location.pathname === '/dashboard';

  return (
    <div className="flex items-center text-[14px] text-[#717182] font-['Inter'] gap-[8px]">
      {/* Back Button */}
      <div className="flex items-center gap-[8px]">
        <button
          onClick={handleBack}
          className="flex items-center gap-[8px] bg-transparent border-none cursor-pointer text-[#717182] text-[14px] font-['Inter'] hover:text-[#040110] transition-colors"
        >
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
      </div>

      {/* Separator */}
      <div className="w-[1px] h-[20px] bg-[#D1D5DB]" />

      {/* Dashboard Link */}
      <div className="flex items-center gap-[8px]">
        <a
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
          className="flex items-center gap-[8px] text-[#717182] hover:text-[#040110] transition-colors no-underline"
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </a>
      </div>

      {/* Workspace (if on workspace page) */}
      {isWorkspace && (
        <>
          <ChevronRight size={20} className="text-[#949291]" />
          <div className="flex items-center gap-[8px]">
            <Building size={20} />
            <span>Workspace</span>
          </div>
        </>
      )}
    </div>
  );
}

export default Breadcrumb;
