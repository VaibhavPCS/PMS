import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

const UserManagement = () => {
  return (
    <div className="w-full h-full overflow-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-600">Manage users, invitations, and access control</p>
        </div>

        {/* Coming Soon Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Management System</CardTitle>
            <CardDescription>
              Centralized user administration and access management
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-gray-600 mb-4">
                User management features are currently under development.
              </p>
              <div className="max-w-md mx-auto text-left space-y-2">
                <p className="text-sm text-gray-600">Upcoming features include:</p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>View and manage all users</li>
                  <li>Invite new users to the platform</li>
                  <li>Assign and modify user roles</li>
                  <li>Suspend or deactivate user accounts</li>
                  <li>Track user activity and login history</li>
                  <li>Bulk user operations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;
