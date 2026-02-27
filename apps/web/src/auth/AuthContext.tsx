import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import apiClient from '../lib/api-client';

export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    branchId?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'kc_token';   // matches existing api-client interceptor
const USER_KEY = 'ac_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setLoading] = useState(true);

    // Hydrate from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        if (savedToken && savedUser) {
            try {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const { data } = await apiClient.post('/api/auth/login', { email, password });
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setToken(data.accessToken);
        setUser(data.user);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
