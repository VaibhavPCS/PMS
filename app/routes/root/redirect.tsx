import { Navigate } from 'react-router';

/**
 * Root redirect component that redirects from / to /sign-in
 */
const RootRedirect = () => {
  return <Navigate to="/sign-in" replace />;
};

export default RootRedirect;