
import React, { useMemo } from 'react';
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
// Removed explicit authService import used for resolveDashboardPath as it's now property based

// Admin CMS Imports
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { OpsDashboard } from './pages/admin/OpsDashboard'; // New
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
import { Suppliers } from './pages/admin/Suppliers'; // Still importing as Suppliers component but conceptually Partners
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

// Role Redirect Helper
const DashboardRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    // Use the backend-provided route directly
    const targetPath = user.dashboardRoute || '/unauthorized';
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
            return <Navigate to="/admin/bookings" replace />;
        default: return <Navigate to="/dashboard" replace />;
    }
};

const Layout = () => {
  const { user } = useAuth();
  
  // Resolve Branding for Agents
  // If user is an Agent, use their branding configuration
  // Otherwise (Admin/Staff/Operator), use default platform branding (passed as null to resolver)
  const agentForBranding = user?.role === UserRole.AGENT ? user : null;
  const branding = useMemo(() => resolveAgentBranding(agentForBranding), [agentForBranding]);

  return (
    <BrandContext.Provider value={{ branding, isPlatformDefault: !agentForBranding }}>
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
        <Navbar />
        <SessionWatcher />
        <div className="flex-1 flex flex-col">
            <React.Suspense fallback={<div className="p-4">Loading...</div>}>
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
  );
};

export default App;
