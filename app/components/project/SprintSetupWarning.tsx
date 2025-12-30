import React from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SprintSetupWarningProps {
  projectId: string;
  taskCount: number;
  onCreateSprint: () => void;
  onDismiss?: () => void;
}

export const SprintSetupWarning: React.FC<SprintSetupWarningProps> = ({
  projectId,
  taskCount,
  onCreateSprint,
  onDismiss
}) => {
  const [dismissed, setDismissed] = React.useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-amber-800">
            Sprint Setup Required
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>
              This project has <span className="font-semibold">{taskCount} task(s)</span> that need to be assigned to sprints.
              Create sprints to organize your work and improve project planning.
            </p>
          </div>
          <div className="mt-4 flex gap-3">
            <Button
              onClick={onCreateSprint}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Create Sprint
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {/* {onDismiss && (
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="text-amber-800 border-amber-300 hover:bg-amber-100"
              >
                Dismiss
              </Button>
            )} */}
          </div>
        </div>
        {/* {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className="inline-flex text-amber-400 hover:text-amber-500 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default SprintSetupWarning;
