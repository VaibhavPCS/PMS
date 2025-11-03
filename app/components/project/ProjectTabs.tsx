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
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="h-auto bg-transparent border-b-[0.5px] border-[#949291] rounded-none p-0 justify-start w-full gap-0">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="
              px-[20px] py-[10px] rounded-none
              text-[16px] font-normal font-['Inter']
              data-[state=active]:text-[#000D2A]
              data-[state=active]:border-b-[1px]
              data-[state=active]:border-[#F2761B]
              data-[state=inactive]:text-[#000D2A]
              data-[state=inactive]:opacity-60
              data-[state=active]:bg-transparent
              data-[state=inactive]:bg-transparent
              hover:bg-transparent
              hover:opacity-100
              data-[state=active]:shadow-none
              shadow-none
              relative
              mb-[-0.5px]
              transition-opacity
              border-b-[0.5px]
              border-transparent
            "
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default ProjectTabs;
