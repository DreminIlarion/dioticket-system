import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import NewTicketPage from './pages/NewTicketPage';
import TicketDetailPage from './pages/TicketDetailPage';
import CounterpartiesPage from './pages/CounterpartiesPage';
import NewCounterpartyPage from './pages/NewCounterpartyPage';
import CounterpartyDetailPage from './pages/CounterpartyDetailPage';
import MyCompanyPage from './pages/MyCompanyPage';
import InvitationsPage from './pages/InvitationsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import { Toaster } from './components/ui/toaster';
import ProjectsPage from './pages/ProjectsPage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
  

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/invite/accept" element={<RegisterPage />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/new" element={<NewTicketPage />} />
          <Route path="/tickets/:ticketNumber" element={<TicketDetailPage />} />
          <Route path="/counterparties" element={<CounterpartiesPage />} />
          <Route path="/counterparties/new" element={<NewCounterpartyPage />} />
          <Route path="/counterparties/:id" element={<CounterpartyDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/my-company" element={<MyCompanyPage />} />
          <Route path="/invitations" element={<InvitationsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
