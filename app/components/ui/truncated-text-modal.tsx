import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TruncatedTextModalProps {
  text: string;
  lines?: number;
  textClassName?: string;
  ellipsisClassName?: string;
  modalBgClassName?: string;
  modalTitle?: string;
}

export function TruncatedTextModal({
  text,
  lines = 3,
  textClassName,
  ellipsisClassName,
  modalBgClassName = 'bg-white',
  modalTitle = 'Description',
}: TruncatedTextModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Determine if the content exceeds the clamped height
    setIsTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [text, lines]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn('leading-[1.5] overflow-hidden', textClassName)}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: lines,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {text || '—'}
      </div>
      {isTruncated && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show full text"
          className={cn('absolute bottom-0 right-0 px-1 py-0.5 rounded-[4px] shadow-sm', ellipsisClassName || 'text-[#040110] bg-inherit')}
        >
          ...
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          <div className={cn('rounded-[10px] p-[16px] text-[14px] font-[\'Inter\'] text-[#040110]', modalBgClassName)}>
            {text || '—'}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}