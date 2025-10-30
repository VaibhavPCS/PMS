import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const RoleManagement = () => {
  return (
    <div className="w-full h-full overflow-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Role Management</h1>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>

        {/* Coming Soon Card */}
        <Card>
          <CardHeader>
            <CardTitle>Role Management System</CardTitle>
            <CardDescription>
              Configure roles, permissions, and access control for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-gray-600 mb-4">
                Role management features are currently under development.
              </p>
              <div className="max-w-md mx-auto text-left space-y-2">
                <p className="text-sm text-gray-600">Upcoming features include:</p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>Create and manage custom roles</li>
                  <li>Assign granular permissions</li>
                  <li>Role-based access control (RBAC)</li>
                  <li>Permission inheritance</li>
                  <li>Audit logs for role changes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleManagement;
