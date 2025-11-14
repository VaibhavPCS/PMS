import { Table } from '@/components/ui/table';

export default function ProjectInvolvementTable({ projects }: { projects: any[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <th className="text-left p-2">Project</th>
            <th className="text-left p-2">Role</th>
            <th className="text-left p-2">Assigned</th>
            <th className="text-left p-2">Completed</th>
            <th className="text-left p-2">Approval Rate</th>
          </tr>
        </thead>
        <tbody>
          {(projects || []).map((p, i) => (
            <tr key={i}>
              <td className="p-2">{p.projectName}</td>
              <td className="p-2">{p.role}</td>
              <td className="p-2">{p.tasksAssigned}</td>
              <td className="p-2">{p.tasksCompleted}</td>
              <td className="p-2">{Math.round(p.approvalRate || 0)}%</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

