import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate(-1);
  };

  // Auto-detect breadcrumb items based on current route if not provided
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    if (items) return items;

    const path = location.pathname;
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'Dashboard',
        icon: (
          <img
            src="/assets/4001ba5860d2858f2469e275a4ce7fe2c2c2a952.svg"
            alt="Dashboard"
            className="w-[20px] h-[20px]"
          />
        ),
        href: '/dashboard',
        isActive: path === '/dashboard'
      }
    ];

    if (path.includes('/workspace')) {
      breadcrumbs.push({
        label: 'Workspace',
        icon: (
          <img
            src="/assets/84789fe1294f4eedc3013b31bb79e7394bd87fab.svg"
            alt="Workspace"
            className="w-[20px] h-[20px]"
          />
        ),
        href: '/workspace',
        isActive: path === '/workspace'
      });
    }

    if (path.includes('/project/')) {
      // Add workspace if not already added
      if (!breadcrumbs.find(b => b.label === 'Workspace')) {
        breadcrumbs.push({
          label: 'Workspace',
          icon: (
            <img
              src="/assets/84789fe1294f4eedc3013b31bb79e7394bd87fab.svg"
              alt="Workspace"
              className="w-[20px] h-[20px]"
            />
          ),
          href: '/workspace',
          isActive: false
        });
      }
      breadcrumbs.push({
        label: 'Project Detail',
        icon: (
          <img
            src="/assets/folder-project-icon.svg"
            alt="Project"
            className="w-[20px] h-[20px]"
          />
        ),
        isActive: !path.includes('/task/')
      });
    }

    if (path.includes('/task/')) {
      // Add workspace and project if not already added
      if (!breadcrumbs.find(b => b.label === 'Workspace')) {
        breadcrumbs.push({
          label: 'Workspace',
          icon: (
            <img
              src="/assets/84789fe1294f4eedc3013b31bb79e7394bd87fab.svg"
              alt="Workspace"
              className="w-[20px] h-[20px]"
            />
          ),
          href: '/workspace',
          isActive: false
        });
      }
      if (!breadcrumbs.find(b => b.label === 'Project Detail')) {
        breadcrumbs.push({
          label: 'Project Detail',
          icon: (
            <img
              src="/assets/folder-project-icon.svg"
              alt="Project"
              className="w-[20px] h-[20px]"
            />
          ),
          isActive: false
        });
      }
      breadcrumbs.push({
        label: 'Task Details',
        icon: (
          <svg
            className="w-[20px] h-[20px]"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 10L9 13L14 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="3"
              y="3"
              width="14"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        ),
        isActive: true
      });
    }

    return breadcrumbs;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <div className="flex items-center text-[14px] text-[#717182] font-['Inter'] gap-[10px]">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-[8px] bg-transparent border-none cursor-pointer text-[#717182] text-[14px] font-['Inter'] hover:text-[#040110] transition-colors p-0"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        <span className="font-medium">Back</span>
      </button>

      {/* Separator */}
      <span className="text-[#949291] text-[16px]">/</span>

      {/* Breadcrumb Items */}
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {item.href && !item.isActive ? (
            <a
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href!);
              }}
              className="flex items-center gap-[8px] text-[#717182] hover:text-[#040110] transition-colors no-underline"
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </a>
          ) : (
            <div className={`flex items-center gap-[8px] ${item.isActive ? 'text-[#040110]' : 'text-[#717182]'}`}>
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
          )}

          {/* Separator between items (except last) */}
          {index < breadcrumbItems.length - 1 && (
            <span className="text-[#949291] text-[16px]">/</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default Breadcrumb;
