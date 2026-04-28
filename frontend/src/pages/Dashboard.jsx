import React, { useState, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';

// Import tabs
import DashboardTab from '../components/tabs/DashboardTab';
import NewCaseTab from '../components/tabs/NewCaseTab';
import CaseMasterTab from '../components/tabs/CaseMasterTab';
import HistoryTab from '../components/tabs/HistoryTab';
import ActionLogTab from '../components/tabs/ActionLogTab';
import CommLogTab from '../components/tabs/CommLogTab';
import TimelineTab from '../components/tabs/TimelineTab';
import DocIndexTab from '../components/tabs/DocIndexTab';
import CaseStudyTab from '../components/tabs/CaseStudyTab';
import AdminPanelTab from '../components/tabs/AdminPanelTab';
import DataSearchTab from '../components/tabs/DataSearchTab';
import ReviewerDashTab from '../components/tabs/ReviewerDashTab';
import AccountantDashTab from '../components/tabs/AccountantDashTab';
import AgreementGenerationTab from '../components/tabs/AgreementGenerationTab';
import MyTaskTab from '../components/tabs/MyTaskTab';
import SodEodReportTab from '../components/tabs/SodEodReportTab';
import WorkReportTab from '../components/tabs/WorkReportTab';

const ProtectedRoute = ({ children, allowedRoles, id }) => {
  const { user } = useContext(AuthContext);
  
  const tabAccess = {
    "dashboard":            ["Admin", "Operations", "Staff", "Reviewer", "Accountant"],
    "new-case":             ["Admin", "Operations", "Staff"],
    "case-master":          ["Admin", "Operations"],
    "history":              ["Admin", "Operations", "Staff"],
    "action-log":           ["Admin", "Operations", "Staff"],
    "comm-log":             ["Admin", "Operations", "Staff"],
    "timeline":             ["Admin"],
    "doc-index":            ["Admin", "Operations", "Staff"],
    "case-study":           ["Admin", "Operations"],
    "admin-panel":          ["Admin"],
    "internal-search":      ["Admin", "Operations", "Staff", "Reviewer", "Accountant"],
    "reviewer-panel":       ["Admin", "Reviewer"],
    "accountant-dashboard": ["Admin", "Accountant"],
    "agreement-gen":        ["Admin", "Operations"],
    "my-task":              ["Admin", "Operations", "Staff"],
    "sod-eod-reports":      ["Admin", "Operations", "Staff"],
    "work-report":          ["Admin", "Operations"]
  };

  if (!user) return <Navigate to="/login" />;
  if (!tabAccess[id]?.includes(user?.role)) return <Navigate to="/" />;
  
  return children;
};

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="app-container min-h-screen bg-gray-50">
      <Navbar 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isCollapsed={isCollapsed}
      />
      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'md:ml-[70px]' : 'md:ml-[250px]'}`}>
          <div className="main p-0">
          <Routes>
            <Route path="/" element={<DashboardTab />} />
            
            <Route path="/new-case" element={
              <ProtectedRoute id="new-case"><NewCaseTab /></ProtectedRoute>
            } />
            
            <Route path="/case-master" element={
              <ProtectedRoute id="case-master"><CaseMasterTab /></ProtectedRoute>
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
            
            <Route path="/case-study" element={
              <ProtectedRoute id="case-study"><CaseStudyTab /></ProtectedRoute>
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
          </Routes>
        </div>
      </div>
    </div>
  </div>
);
};

export default Dashboard;
