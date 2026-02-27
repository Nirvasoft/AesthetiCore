import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Box, CircularProgress } from '@mui/material';

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress sx={{ color: '#A78BFA' }} />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
