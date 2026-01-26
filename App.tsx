

import React, { Component, useMemo, ReactNode, ErrorInfo } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SessionWatcher } from './components/SessionWatcher';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BrandContext, resolveAgentBranding } from './context/BrandContext';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword'; 
import { ResetPassword } from './pages/ResetPassword'; 
import { VerifyEmail } from './pages/VerifyEmail';
import { AuthActionHandler } from './pages/AuthActionHandler'; 
import { Unauthorized } from './pages/Unauthorized';
import { QuoteDetail } from './pages/QuoteDetail';
import { Terms, Privacy, Support, Faq } from './pages/StaticPages';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Admin CMS Imports
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { OpsDashboard } from './pages/admin/OpsDashboard'; 
import { UserManagement } from './pages/admin/UserManagement'; 
import { AgentsList } from './pages/admin/AgentsList';
import { AgentProfile } from './pages/admin/AgentProfile';
import { OperatorsList } from './pages/admin/OperatorsList';
import { OperatorProfile } from './pages/admin/OperatorProfile';
import { StaffManagement } from './pages/admin/StaffManagement';
import { AuditLogs } from './pages/admin/AuditLogs'; 
import { GstDashboard } from './pages/admin/GstDashboard'; 
import { CompanyManagement } from './pages/admin/CompanyManagement'; 
import { FinancialLedgerExport } from './pages/admin/FinancialLedgerExport'; 
import { PaymentReminderSettings } from './pages/admin/PaymentReminderSettings'; 
import { PLReports } from './pages/admin/PLReports'; 
import { Destinations } from './pages/admin/Destinations';
import { Hotels } from './pages/admin/Hotels';
import { Sightseeing } from './pages/admin/Sightseeing';
import { Transfers } from './pages/admin/Transfers';
import { VisaPage } from './pages/admin/Visa';
import { FixedPackages } from './pages/admin/FixedPackages';
import { SystemTemplates } from './pages/admin/SystemTemplates';
import { QuickQuoteTemplateManager } from './pages/admin/QuickQuoteTemplateManager'; 
import { BookingManager } from './pages/admin/BookingManager';
import { CurrencyManagement } from './pages/admin/CurrencyManagement';
import { InventoryApproval } from './pages/admin/InventoryApproval';
import { Suppliers } from './pages/admin/Suppliers'; 
import { Contracts } from './pages/admin/Contracts'; 
import { ContractApproval } from './pages/admin/ContractApproval'; 

// Agent Panel Imports
import { AgentDashboard } from './pages/agent/AgentDashboard';
import { QuoteList } from './pages/agent/QuoteList';
import { QuickQuote } from './pages/agent/QuickQuote';
import { SmartBuilder } from './pages/agent/SmartBuilder';
import { BookingDetail } from './pages/agent/BookingDetail';
import { Branding } from './pages/agent/Branding';
import { AgentPLReport } from './pages/agent/PLReport'; 
import { GuideBook } from './pages/agent/GuideBook'; 
import { AgentPackages } from './pages/agent/AgentPackages';
import { AgentTemplates } from './pages/agent/AgentTemplates';
import { AgentVisa } from './pages/agent/AgentVisa';

// Operator Panel Imports
import { OperatorDashboard } from './pages/operator/OperatorDashboard';
import { OperatorBookingView } from './pages/operator/OperatorBookingView';
import { AssignedQuotes } from './pages/operator/AssignedQuotes';
import { AssignedBookings } from './pages/operator/AssignedBookings';
import { WorkQueue } from './pages/operator/WorkQueue'; 
import { OperatorGuideBook } from './pages/operator/OperatorGuideBook'; 
import { InventoryManager } from './pages/operator/InventoryManager'; 
import { OperatorProfilePage } from './pages/operator/OperatorProfilePage';

// Supplier Panel Imports
import { SupplierDashboard } from './pages/supplier/SupplierDashboard';

// Public View
import { ClientTripView } from './pages/public/ClientTripView';
import { ClientPaymentPage } from './pages/public/ClientPaymentPage'; 

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// --- ERROR BOUNDARY ---
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <div className="bg-red-50 p-4 rounded-full mb-4">
                <AlertTriangle size={48} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-600 mb-6 max-w-md">
                The application encountered an unexpected error. Please try reloading the page.
            </p>
            {this.state.error && (
                <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 text-xs text-left font-mono text-red-700 mb-6 max-w-lg overflow-auto">
                    {this.state.error.toString()}
                </div>
            )}
            <button 
                onClick={() => window.location.reload()}
                className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2"
            >
                <RefreshCw size={18} /> Reload Application
            </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Role Redirect Helper
const DashboardRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    // Use the backend-provided route directly
    const targetPath = user.dashboardRoute || '/unauthorized';
    
    // Prevent infinite loop if dashboardRoute points to current path (though ProtectedRoute handles /dashboard usually)
    return <Navigate to={targetPath} replace />;
};

// Universal Booking Router Helper
const BookingRouter = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    switch(user.role) {
        case UserRole.AGENT: return <BookingDetail />;
        case UserRole.OPERATOR: return <OperatorBookingView />;
        case UserRole.ADMIN:
        case UserRole.STAFF: 
            // Allow Admins/Staff to view the detailed booking page
            return <BookingDetail />;
        default: return <Navigate to="/dashboard" replace />;
    }
};

const Layout = () => {
  const { user } = useAuth();
  
  // Resolve Branding for Agents
  const agentForBranding = user?.role === UserRole.AGENT ? user : null;
  const branding = useMemo(() => resolveAgentBranding(agentForBranding), [agentForBranding]);

  return (
    <BrandContext.Provider value={{ branding, isPlatformDefault: !agentForBranding }}>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
        <Navbar />
        <SessionWatcher />
        <div className="flex-1 flex flex-col">
            <React.Suspense fallback={<div className="p-4 flex justify-center"><RefreshCw className="animate-spin text-brand-600"/></div>}>
                <Outlet />
            </React.Suspense>
        </div>
        <Footer />
      </div>
    </BrandContext.Provider>
  );
};

const App: React.FC = () => {
  // REDIRECT HANDLER
  React.useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    
    if (path.includes('/auth/action') && !window.location.hash.includes('auth/action')) {
      const hashPath = `/auth/action${search}`;
      window.location.replace(`${window.location.origin}/#${hashPath}`);
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public Client Views (No Auth Required, No Standard Navbar) */}
            <Route path="/view/:id" element={<ClientTripView />} />
            <Route path="/payment/:id" element={<ClientPaymentPage />} /> 

            {/* DEDICATED FIREBASE ACTION HANDLER */}
            <Route path="/auth/action" element={<AuthActionHandler />} />

            {/* Standard Public Pages */}
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} /> 
              <Route path="/reset-password" element={<ResetPassword />} /> 
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/support" element={<Support />} />
              <Route path="/faq" element={<Faq />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* General Authenticated Routes */}
              <Route element={<Layout />}>
                  <Route path="/dashboard" element={<DashboardRedirect />} />
                  <Route path="/quote/:id" element={<QuoteDetail />} />
                  <Route path="/booking/:id" element={<BookingRouter />} />
                  
                  {/* Agent Specific */}
                  <Route element={<ProtectedRoute allowedRoles={[UserRole.AGENT]} />}>
                      <Route path="/agent/dashboard" element={<AgentDashboard />} />
                      <Route path="/agent/quotes" element={<QuoteList />} />
                      <Route path="/agent/create" element={<QuickQuote />} />
                      <Route path="/agent/builder" element={<SmartBuilder />} />
                      <Route path="/agent/branding" element={<Branding />} />
                      <Route path="/agent/reports" element={<AgentPLReport />} />
                      <Route path="/agent/guidebook" element={<GuideBook />} />
                      <Route path="/agent/packages" element={<AgentPackages />} />
                      <Route path="/agent/templates" element={<AgentTemplates />} />
                      <Route path="/agent/visa" element={<AgentVisa />} />
                  </Route>

                  {/* Operator Specific */}
                  <Route element={<ProtectedRoute allowedRoles={[UserRole.OPERATOR]} />}>
                      <Route path="/operator/dashboard" element={<OperatorDashboard />} />
                      <Route path="/operator/assigned-quotes" element={<AssignedQuotes />} />
                      <Route path="/operator/assigned-bookings" element={<AssignedBookings />} />
                      <Route path="/operator/work-queue" element={<WorkQueue />} />
                      <Route path="/operator/guidebook" element={<OperatorGuideBook />} />
                      <Route path="/operator/inventory" element={<InventoryManager />} />
                      <Route path="/operator/profile" element={<OperatorProfilePage />} />
                  </Route>

                  {/* Hotel Partner Specific */}
                  <Route element={<ProtectedRoute allowedRoles={[UserRole.HOTEL_PARTNER]} />}>
                      <Route path="/partner/dashboard" element={<SupplierDashboard />} />
                  </Route>
              </Route>

              {/* Admin CMS Routes */}
              <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.STAFF, UserRole.OPERATOR]} />}>
                <Route path="/admin" element={<AdminLayout />}>
                    {/* Shared Ops Dashboard */}
                    <Route path="ops-dashboard" element={<OpsDashboard />} />
                    
                    {/* Admin Specific */}
                    <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.STAFF]} />}>
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="destinations" element={<Destinations />} />
                        <Route path="hotels" element={<Hotels />} />
                        <Route path="sightseeing" element={<Sightseeing />} />
                        <Route path="transfers" element={<Transfers />} />
                        <Route path="visa" element={<VisaPage />} />
                        <Route path="packages" element={<FixedPackages />} />
                        <Route path="templates" element={<SystemTemplates />} />
                        <Route path="quick-templates" element={<QuickQuoteTemplateManager />} />
                        <Route path="contracts" element={<Contracts />} />
                        
                        {/* Admin Only - User Management & Audit */}
                        <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
                          <Route path="agents" element={<AgentsList />} />
                          <Route path="agents/:id" element={<AgentProfile />} />
                          <Route path="operators" element={<OperatorsList />} />
                          <Route path="operators/:id" element={<OperatorProfile />} />
                          <Route path="staff" element={<StaffManagement />} />
                          <Route path="companies" element={<CompanyManagement />} /> 
                          <Route path="financial-ledger-export" element={<FinancialLedgerExport />} />
                          <Route path="pl-reports" element={<PLReports />} />
                          <Route path="reminders" element={<PaymentReminderSettings />} />
                          <Route path="audit" element={<AuditLogs />} />
                          <Route path="users" element={<UserManagement />} /> 
                          <Route path="currency" element={<CurrencyManagement />} />
                        </Route>

                        {/* Pricing & GST & Approvals for Admin/Staff */}
                        <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.STAFF]} />}>
                          {/* <Route path="pricing" element={<PricingRules />} /> Removed */}
                          <Route path="bookings" element={<BookingManager />} />
                          <Route path="gst-reports" element={<GstDashboard />} />
                          <Route path="approvals" element={<InventoryApproval />} />
                          <Route path="partners" element={<Suppliers />} /> 
                          <Route path="contract-approvals" element={<ContractApproval />} />
                        </Route>
                    </Route>
                </Route>
              </Route>
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;