import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, Button, Alert, Stack,
    CircularProgress, Avatar, InputAdornment, IconButton,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    AutoAwesome, Email, Lock, Visibility, VisibilityOff, Login,
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';

export function LoginPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const from = (location.state as any)?.from?.pathname || '/patients';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err?.response?.data?.message ?? 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(ellipse at 30% 20%, ${alpha('#6366F1', 0.15)} 0%, transparent 60%),
                   radial-gradient(ellipse at 70% 80%, ${alpha('#A78BFA', 0.10)} 0%, transparent 50%),
                   ${theme.palette.background.default}`,
        }}>
            <Paper
                elevation={0}
                sx={{
                    width: 420, p: 5, borderRadius: 4,
                    border: '1px solid', borderColor: 'divider',
                    bgcolor: alpha(theme.palette.background.paper, 0.7),
                    backdropFilter: 'blur(20px)',
                    boxShadow: `0 24px 80px ${alpha('#000', 0.3)}`,
                }}
            >
                {/* Brand */}
                <Stack alignItems="center" mb={4}>
                    <Avatar sx={{
                        width: 56, height: 56, mb: 2,
                        background: 'linear-gradient(135deg, #A78BFA 0%, #6366F1 100%)',
                        boxShadow: `0 8px 32px ${alpha('#6366F1', 0.4)}`,
                    }}>
                        <AutoAwesome sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}
                        sx={{ background: 'linear-gradient(135deg, #A78BFA, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        AesthetiCore
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Sign in to your clinic dashboard
                    </Typography>
                </Stack>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <Stack gap={2.5}>
                        {error && (
                            <Alert severity="error" sx={{ borderRadius: 2, fontSize: 13 }}>{error}</Alert>
                        )}

                        <TextField
                            id="email"
                            label="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                            autoFocus
                            fullWidth
                            required
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&.Mui-focused fieldset': { borderColor: '#A78BFA' },
                                },
                            }}
                        />

                        <TextField
                            id="password"
                            label="Password"
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            fullWidth
                            required
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment>,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setShowPw(p => !p)} edge="end">
                                            {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&.Mui-focused fieldset': { borderColor: '#A78BFA' },
                                },
                            }}
                        />

                        <Button
                            id="btn-login"
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading || !email || !password}
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Login />}
                            sx={{
                                mt: 0.5, py: 1.4, borderRadius: 2,
                                fontWeight: 700, fontSize: 15, textTransform: 'none',
                                background: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)',
                                boxShadow: `0 4px 20px ${alpha('#6366F1', 0.35)}`,
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                                    boxShadow: `0 6px 24px ${alpha('#6366F1', 0.5)}`,
                                },
                            }}
                        >
                            {loading ? 'Signing in…' : 'Sign In'}
                        </Button>
                    </Stack>
                </form>

                <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={3}>
                    © 2026 AesthetiCore · Clinic Management System
                </Typography>
            </Paper>
        </Box>
    );
}
