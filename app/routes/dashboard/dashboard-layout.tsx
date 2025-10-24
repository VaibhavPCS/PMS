// import React from 'react';
// import { Navigate, Outlet } from 'react-router';
// import { useAuth } from '../../provider/auth-context';
// import Sidebar from '../../components/layout/sidebar';

// const DashboardLayout = () => {
//   const { isAuthenticated, isLoading } = useAuth();

//   if (isLoading) {
//     return (
//       <div className="w-full h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-center">
//           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-gray-600">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!isAuthenticated) {
//     return <Navigate to="/sign-in" />;
//   }

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* Sidebar */}
//       <Sidebar />
      
//       {/* Main Content */}
//       <div className="flex-1 flex flex-col overflow-hidden">
//         {/* Main Content Area */}
//         <main className="flex-1 overflow-y-auto p-8">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// };

// export default DashboardLayout;
