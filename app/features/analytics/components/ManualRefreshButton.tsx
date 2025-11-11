import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useManualRefresh } from "@/features/analytics/hooks/useManualRefresh";

interface ManualRefreshButtonProps {
  userRole?: string;
}

export const ManualRefreshButton = ({ userRole }: ManualRefreshButtonProps) => {
  const { mutate: triggerRefresh, isPending } = useManualRefresh();

  // Only show button for admin users
  if (!userRole || userRole !== 'admin') {
    return null;
  }

  return (
    <Button
      onClick={() => triggerRefresh()}
      disabled={isPending}
      variant="default"
      size="default"
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Refreshing...' : 'Refresh Analytics'}
    </Button>
  );
};
