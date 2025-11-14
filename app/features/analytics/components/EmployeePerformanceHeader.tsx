import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function EmployeePerformanceHeader({ userId, userName, userRole }: { userId: string; userName: string; userRole: string }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar className="w-12 h-12">
        <AvatarFallback>{(userName?.charAt(0) || 'U')}</AvatarFallback>
      </Avatar>
      <div>
        <h2 className="text-xl font-semibold">{userName || 'Employee'}</h2>
        <div className="text-sm text-muted-foreground">{userRole} · {userId}</div>
      </div>
    </div>
  );
}

