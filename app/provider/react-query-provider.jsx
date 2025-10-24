import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth-context';


export const queryClient = new QueryClient();

const ReactQueryProvider = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {children}
                <Toaster position='top-right' richColors/>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default ReactQueryProvider;
