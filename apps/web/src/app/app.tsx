import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { RequireAuth } from '../auth/RequireAuth';
import { LoginPage } from '../pages/login/LoginPage';
import { PatientsListPage } from '../pages/patients/PatientsList';
import { PatientRegistrationPage } from '../pages/patients/PatientRegistration';
import { PatientDetailPage } from '../pages/patients/PatientDetail';
import { SessionDetailPage } from '../pages/sessions/SessionDetail';
import { CrmDashboardPage } from '../pages/crm/CrmDashboard';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { BillingPage } from '../pages/billing/BillingPage';
import { AppointmentsPage } from '../pages/appointments/AppointmentsPage';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { StaffPage } from '../pages/staff/StaffPage';

export function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all wrapped in RequireAuth + AppShell */}
      <Route path="/*" element={
        <RequireAuth>
          <AppShell>
            <Routes>
              <Route path="/" element={<Navigate to="/patients" replace />} />
              <Route path="/patients" element={<PatientsListPage />} />
              <Route path="/patients/new" element={<PatientRegistrationPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              <Route path="/sessions/:id" element={<SessionDetailPage />} />
              <Route path="/crm" element={<CrmDashboardPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="*" element={<Navigate to="/patients" replace />} />
            </Routes>
          </AppShell>
        </RequireAuth>
      } />
    </Routes>
  );
}
