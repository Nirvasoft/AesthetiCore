import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useThemeMode } from '../theme/ThemeContext';
import {
    Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
    Typography, Divider, IconButton, Tooltip, Avatar, Stack,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    People, CalendarMonth, Inventory2, Receipt,
    BarChart, BadgeOutlined, MedicalServices, Campaign,
    Menu as MenuIcon, ChevronLeft, AutoAwesome, Logout,
    DarkMode, LightMode,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 72;

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
    { path: '/patients', label: 'Patients', icon: <People /> },
    { path: '/appointments', label: 'Appointments', icon: <CalendarMonth /> },
    { path: '/crm', label: 'CRM', icon: <Campaign /> },
    { path: '/inventory', label: 'Inventory', icon: <Inventory2 /> },
    { path: '/billing', label: 'Billing', icon: <Receipt /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart /> },
    { path: '/staff', label: 'Staff & HR', icon: <BadgeOutlined /> },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const theme = useTheme();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { mode, toggleTheme } = useThemeMode();
    const [collapsed, setCollapsed] = useState(false);
    const width = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;
    const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'AC';

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* ── Sidebar ── */}
            <Drawer
                variant="permanent"
                sx={{
                    width,
                    flexShrink: 0,
                    transition: 'width 0.25s ease',
                    '& .MuiDrawer-paper': {
                        width,
                        transition: 'width 0.25s ease',
                        overflowX: 'hidden',
                        bgcolor: alpha(theme.palette.background.paper, 0.6),
                        backdropFilter: 'blur(16px)',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        boxShadow: `4px 0 24px ${alpha('#000', 0.15)}`,
                    },
                }}
            >
                {/* Brand */}
                <Box sx={{ px: collapsed ? 1.5 : 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                        sx={{
                            width: 40, height: 40,
                            background: 'linear-gradient(135deg, #A78BFA 0%, #6366F1 100%)',
                            boxShadow: `0 4px 14px ${alpha('#6366F1', 0.4)}`,
                        }}
                    >
                        <AutoAwesome sx={{ fontSize: 22 }} />
                    </Avatar>
                    {!collapsed && (
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} letterSpacing={-0.5}
                                sx={{ background: 'linear-gradient(135deg, #A78BFA, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                AesthetiCore
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontSize={10} fontWeight={500}>
                                Clinic Management
                            </Typography>
                        </Box>
                    )}
                    <Box sx={{ ml: 'auto' }}>
                        <IconButton size="small" onClick={() => setCollapsed(c => !c)}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                            {collapsed ? <MenuIcon fontSize="small" /> : <ChevronLeft fontSize="small" />}
                        </IconButton>
                    </Box>
                </Box>

                <Divider sx={{ opacity: 0.4 }} />

                {/* Nav Items */}
                <List sx={{ px: 1, pt: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    {NAV_ITEMS.map(({ path, label, icon }) => {
                        const active = location.pathname === path || location.pathname.startsWith(path + '/');
                        const activeColor = '#A78BFA';
                        return (
                            <Tooltip key={path} title={collapsed ? label : ''} placement="right" arrow>
                                <ListItemButton
                                    component={NavLink} to={path}
                                    sx={{
                                        borderRadius: 2,
                                        minHeight: 44,
                                        px: collapsed ? 2 : 2,
                                        justifyContent: collapsed ? 'center' : 'initial',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        ...(active ? {
                                            bgcolor: alpha(activeColor, 0.1),
                                            '&::before': {
                                                content: '""', position: 'absolute', left: 0, top: 8, bottom: 8,
                                                width: 3, borderRadius: 4,
                                                bgcolor: activeColor,
                                            },
                                        } : {
                                            '&:hover': { bgcolor: alpha(activeColor, 0.05) },
                                        }),
                                    }}
                                >
                                    <ListItemIcon sx={{
                                        minWidth: 0, mr: collapsed ? 0 : 2,
                                        justifyContent: 'center',
                                        color: active ? activeColor : 'text.secondary',
                                        transition: 'color 0.2s ease',
                                    }}>
                                        {icon}
                                    </ListItemIcon>
                                    {!collapsed && (
                                        <ListItemText
                                            primary={label}
                                            primaryTypographyProps={{
                                                fontSize: 14, fontWeight: active ? 700 : 500,
                                                color: active ? activeColor : 'text.primary',
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            </Tooltip>
                        );
                    })}
                </List>

                <Divider sx={{ opacity: 0.4 }} />

                {/* Bottom user */}
                <Box sx={{ px: collapsed ? 1.5 : 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: alpha('#34D399', 0.15), color: '#34D399', fontSize: 14, fontWeight: 800 }}>
                        {initials}
                    </Avatar>
                    {!collapsed && (
                        <Box flex={1}>
                            <Typography variant="body2" fontWeight={600} fontSize={13}>
                                {user ? `${user.firstName} ${user.lastName}` : 'User'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontSize={11}>
                                {user?.role?.replace('_', ' ') ?? 'Staff'}
                            </Typography>
                        </Box>
                    )}
                    <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
                        <IconButton size="small" onClick={toggleTheme}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}>
                            {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    {!collapsed && (
                        <Tooltip title="Sign out">
                            <IconButton size="small" onClick={logout}
                                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                <Logout fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Drawer>

            {/* ── Main Content ── */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    minHeight: '100vh',
                    overflow: 'auto',
                    transition: 'margin-left 0.25s ease',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
