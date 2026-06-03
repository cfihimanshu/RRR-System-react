import React, { useState, useContext, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { LogOut, X, Key, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { TAB_ACCESS } from '../config/tabAccess';
import api from '../api/axios';
import toast from 'react-hot-toast';

// Lazy-loaded tabs — only the active route is fetched (no .jsx filenames in prod build)
const DashboardTab = React.lazy(() => import('../components/tabs/DashboardTab'));
const SuperAdminDashTab = React.lazy(() => import('../components/tabs/SuperAdminDashTab'));
const NewCaseTab = React.lazy(() => import('../components/tabs/NewCaseTab'));
const CaseMasterTab = React.lazy(() => import('../components/tabs/CaseMasterTab'));
const ArchivedCasesTab = React.lazy(() => import('../components/tabs/ArchivedCasesTab'));
const HistoryTab = React.lazy(() => import('../components/tabs/HistoryTab'));
const ActionLogTab = React.lazy(() => import('../components/tabs/ActionLogTab'));
const CommLogTab = React.lazy(() => import('../components/tabs/CommLogTab'));
const TimelineTab = React.lazy(() => import('../components/tabs/TimelineTab'));
const DocIndexTab = React.lazy(() => import('../components/tabs/DocIndexTab'));
const CaseStudyTab = React.lazy(() => import('../components/tabs/CaseStudyTab'));
const AdminPanelTab = React.lazy(() => import('../components/tabs/AdminPanelTab'));
const DataSearchTab = React.lazy(() => import('../components/tabs/DataSearchTab'));
const ReviewerDashTab = React.lazy(() => import('../components/tabs/ReviewerDashTab'));
const AccountantDashTab = React.lazy(() => import('../components/tabs/AccountantDashTab'));
const AgreementGenerationTab = React.lazy(() => import('../components/tabs/AgreementGenerationTab'));
const MyTaskTab = React.lazy(() => import('../components/tabs/MyTaskTab'));
const SodEodReportTab = React.lazy(() => import('../components/tabs/SodEodReportTab'));
const WorkReportTab = React.lazy(() => import('../components/tabs/WorkReportTab'));
const RefundRequestTab = React.lazy(() => import('../components/tabs/RefundRequestTab'));
const LegalDashboardTab = React.lazy(() => import('../components/tabs/LegalDashboardTab'));
const PendingRefundsTab = React.lazy(() => import('../components/tabs/PendingRefundsTab'));

import TabLoader from '../components/shared/TabLoader';

const ProtectedRoute = ({ children, allowedRoles, id }) => {
  const { user } = useContext(AuthContext);
  
  if (!user) return <Navigate to="/login" />;
  
  // Allow access if user has explicit module permission OR role-based access
  const hasAccess = (id === 'internal-search' && user.canAccessRecords) || TAB_ACCESS[id]?.includes(user?.role);
  
  if (!hasAccess) return <Navigate to="/" />;
  
  return children;
};

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    // Auto-heartbeat every 5 minutes to update lastSeen
    const heartbeatInterval = setInterval(() => {
      api.get('/auth/me').catch(err => console.error('Heartbeat failed:', err));
    }, 5 * 60 * 1000); // 5 minutes

    // Instant session validation when user returns to this tab/window
    const handleFocus = () => {
      api.get('/auth/me').catch(err => {
        if (err.response?.status === 401) {
          logout();
          window.location.href = '/login';
        }
      });
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [logout]);

  return (
    <div className="app-container h-screen flex flex-col overflow-hidden">
      <Navbar 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isCollapsed={isCollapsed}
        onLogoutClick={() => setShowLogoutModal(true)}
        onChangePasswordClick={() => setShowPasswordModal(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          onLogoutClick={() => setShowLogoutModal(true)}
          onChangePasswordClick={() => setShowPasswordModal(true)}
        />
        <div className={`flex-1 overflow-auto transition-all duration-300 ease-in-out`}>
          <div className="main h-full p-0 flex flex-col">
          <Suspense fallback={<TabLoader />}>
          <Routes>
            <Route path="/" element={
              user?.role === 'Legal'
                ? <Navigate to="/legal-dashboard" replace />
                : user?.role === 'Super Admin'
                ? <SuperAdminDashTab />
                : <DashboardTab />
            } />
            
            <Route path="/new-case" element={
              <ProtectedRoute id="new-case"><NewCaseTab /></ProtectedRoute>
            } />
            
            <Route path="/case-master" element={
              <ProtectedRoute id="case-master"><CaseMasterTab /></ProtectedRoute>
            } />

            <Route path="/archived-cases" element={
              <ProtectedRoute id="archived-cases"><ArchivedCasesTab /></ProtectedRoute>
            } />
            
            <Route path="/history" element={
              <ProtectedRoute id="history"><HistoryTab /></ProtectedRoute>
            } />
            
            <Route path="/action-log" element={
              <ProtectedRoute id="action-log"><ActionLogTab /></ProtectedRoute>
            } />
            
            <Route path="/comm-log" element={
              <ProtectedRoute id="comm-log"><CommLogTab /></ProtectedRoute>
            } />
            
            <Route path="/timeline" element={
              <ProtectedRoute id="timeline"><TimelineTab /></ProtectedRoute>
            } />
            
            <Route path="/doc-index" element={
              <ProtectedRoute id="doc-index"><DocIndexTab /></ProtectedRoute>
            } />
            
            
            <Route path="/admin-panel" element={
              <ProtectedRoute id="admin-panel"><AdminPanelTab /></ProtectedRoute>
            } />
            
            <Route path="/internal-search" element={
              <ProtectedRoute id="internal-search"><DataSearchTab /></ProtectedRoute>
            } />
            
            <Route path="/reviewer-panel" element={
              <ProtectedRoute id="reviewer-panel"><ReviewerDashTab /></ProtectedRoute>
            } />
            
            <Route path="/accountant-dashboard" element={
              <ProtectedRoute id="accountant-dashboard"><AccountantDashTab /></ProtectedRoute>
            } />
            
            <Route path="/agreement-gen" element={
              <ProtectedRoute id="agreement-gen"><AgreementGenerationTab /></ProtectedRoute>
            } />
            
            <Route path="/my-task" element={
              <ProtectedRoute id="my-task"><MyTaskTab /></ProtectedRoute>
            } />
            
            <Route path="/sod-eod-reports" element={
              <ProtectedRoute id="sod-eod-reports"><SodEodReportTab /></ProtectedRoute>
            } />
            
            <Route path="/work-report" element={
              <ProtectedRoute id="work-report"><WorkReportTab /></ProtectedRoute>
            } />

            <Route path="/refund-request" element={
              <ProtectedRoute id="refund-request"><RefundRequestTab /></ProtectedRoute>
            } />

            <Route path="/legal-dashboard" element={
              <ProtectedRoute id="legal-dashboard"><LegalDashboardTab /></ProtectedRoute>
            } />

            <Route path="/pending-refunds" element={
              <ProtectedRoute id="pending-refunds"><PendingRefundsTab /></ProtectedRoute>
            } />

            {/* Catch-all for unauthorized or non-existent URLs */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </Suspense>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 animate-zoom-in relative">
            <div className="p-10 text-center">
              <div className="w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <LogOut size={40} className="text-red-500" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">Confirm Sign Out</h3>
              <p className="text-sm text-slate-500 font-medium px-4">Are you sure you want to end your current session? You'll need to login again to access your dashboard.</p>
              
              <div className="grid grid-cols-2 gap-4 mt-12">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="py-4 px-6 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-[0.15em] hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95 border border-slate-200/50"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setShowLogoutModal(false);
                    try {
                      await api.post('/auth/logout');
                    } catch (err) {
                      console.error('Logout API failed:', err);
                    }
                    logout();
                  }}
                  className="py-4 px-6 rounded-2xl bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.15em] hover:bg-red-700 shadow-xl shadow-red-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      </div>
    </div>
  );
};

const ChangePasswordModal = ({ onClose }) => {
  const [formData, setFormData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    if (formData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword
      });
      toast.success("Password updated successfully");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 animate-zoom-in relative">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shadow-inner border border-amber-100">
              <Key size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Security</h3>
              <p className="text-xs text-slate-500 font-medium">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Current Password</label>
              <div className="relative">
                <input 
                  type={showOldPassword ? "text" : "password"} 
                  required
                  className="w-full px-5 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500/50 focus:bg-white outline-none transition-all text-sm font-bold"
                  placeholder="••••••••"
                  value={formData.oldPassword}
                  onChange={e => setFormData({ ...formData, oldPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">New Password</label>
              <div className="relative">
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  required
                  className="w-full px-5 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500/50 focus:bg-white outline-none transition-all text-sm font-bold"
                  placeholder="••••••••"
                  value={formData.newPassword}
                  onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm New Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required
                  className="w-full px-5 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-500/50 focus:bg-white outline-none transition-all text-sm font-bold"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? 'Updating...' : (
                  <>
                    <ShieldCheck size={14} /> Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
