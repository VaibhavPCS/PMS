import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { value: 'All', label: 'All' },
  { value: 'Planning', label: 'Proposed' },
  { value: 'In Progress', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
  { value: 'On Hold', label: 'On hold' }
];

export function ProjectTabs({ activeTab, onTabChange }: ProjectTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full overflow-hidden">
      <div className="flex items-center gap-[10px] border-b-[0.5px] border-[#949291] overflow-x-auto scrollbar-visible">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap ${activeTab === tab.value
                ? "border-b-[1px] border-[#f2761b] opacity-100"
                : "opacity-60 hover:opacity-100"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </Tabs>
  );
}

export default ProjectTabs;
