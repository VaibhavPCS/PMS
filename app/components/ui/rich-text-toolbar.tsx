import React from 'react';
import { Bold, Italic, Underline, Paperclip } from 'lucide-react';
import { Button } from './button';
import { Separator } from './separator';
import { cn } from '@/lib/utils';

interface RichTextToolbarProps {
  onAttachClick?: () => void;
  onActionClick?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  showFormattingButtons?: boolean;
  className?: string;
}

export function RichTextToolbar({
  onAttachClick,
  onActionClick,
  actionLabel = 'Share',
  actionDisabled = false,
  actionLoading = false,
  showFormattingButtons = true,
  className,
}: RichTextToolbarProps) {
  return (
    <div className={cn('flex items-center justify-between py-2 px-3 bg-gray-50 border-t', className)}>
      <div className="flex items-center gap-2">
        {/* Attach Button */}
        {onAttachClick && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAttachClick}
            className="h-8 w-8 p-0"
            title="Attach files"
          >
            <Paperclip className="h-4 w-4 text-gray-600" />
          </Button>
        )}

        {/* Separator */}
        {showFormattingButtons && onAttachClick && (
          <Separator orientation="vertical" className="h-5" />
        )}

        {/* Formatting Buttons */}
        {showFormattingButtons && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Bold"
              onClick={(e) => e.preventDefault()}
            >
              <Bold className="h-4 w-4 text-gray-600" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Italic"
              onClick={(e) => e.preventDefault()}
            >
              <Italic className="h-4 w-4 text-gray-600" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Underline"
              onClick={(e) => e.preventDefault()}
            >
              <Underline className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        )}
      </div>

      {/* Action Button */}
      {onActionClick && (
        <Button
          type="button"
          onClick={onActionClick}
          disabled={actionDisabled || actionLoading}
          size="sm"
          className="bg-[#FF6B2C] hover:bg-[#FF5A1A] text-white h-8 px-4"
        >
          {actionLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            actionLabel
          )}
        </Button>
      )}
    </div>
  );
}
