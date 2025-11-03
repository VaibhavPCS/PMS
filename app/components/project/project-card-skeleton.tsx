import React from 'react';
import { Card } from '@/components/ui/card';

export function ProjectCardSkeleton() {
  return (
    <Card className="animate-pulse p-[17px] flex flex-col gap-[25px] border-[0.5px] border-gray-200 rounded-[10px]">
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
      </div>
      <div className="flex flex-col gap-[10px]">
        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
        <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
        <div className="h-16 w-full bg-gray-200 rounded"></div>
      </div>
      <div className="flex flex-col gap-[10px]">
        <div className="h-4 w-full bg-gray-200 rounded"></div>
        <div className="h-2 w-full bg-gray-200 rounded-full"></div>
      </div>
      <div className="flex items-center gap-[10px]">
        <div className="h-7 w-7 bg-gray-200 rounded-full"></div>
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
      </div>
    </Card>
  );
}
