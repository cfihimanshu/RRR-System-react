import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import {
  LayoutDashboard,
  PlusCircle,
  ListTodo,
  History,
  Zap,
  MessageSquare,
  Clock,
  FolderOpen,
  FileText,
  Settings,
  Search,
  ClipboardEdit,
  CircleDollarSign,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  BarChart,
  ClipboardList,
  IndianRupee,
  Scale,
  Archive,
  BookOpen,
  HelpCircle
} from 'lucide-react';

import { TAB_ACCESS } from '../config/tabAccess';

const tabsConfig = [
  { id: 'legal-dashboard', label: 'Legal Dashboard', path: '/legal-dashboard', icon: Scale },
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { id: 'mis-report', label: 'MIS Report', path: '/mis-report', icon: BarChart },
  { id: 'new-case', label: 'New Case', path: '/new-case', icon: PlusCircle },
  { id: 'case-master', label: 'My Cases', path: '/case-master', icon: ListTodo },
  { id: 'archived-cases', label: 'Archived Cases', path: '/archived-cases', icon: Archive },
  // { id: 'history', label: 'History & Update', path: '/history', icon: History },
  // { id: 'action-log', label: 'Action Log', path: '/action-log', icon: Zap },
  // { id: 'comm-log',             label: 'Communication',         path: '/comm-log',             icon: MessageSquare },
  // { id: 'timeline', label: 'Timeline View', path: '/timeline', icon: Clock },
  // { id: 'doc-index',            label: 'Document Index',        path: '/doc-index',            icon: FolderOpen },
  { id: 'admin-panel', label: 'Admin Panel', path: '/admin-panel', icon: Settings },
  { id: 'internal-search', label: 'Records', path: '/internal-search', icon: Search },
  { id: 'reviewer-panel', label: 'Reviewer Dashboard', path: '/reviewer-panel', icon: ClipboardEdit },
  { id: 'accountant-dashboard', label: 'Accountant Dashboard', path: '/accountant-dashboard', icon: CircleDollarSign },
  { id: 'agreement-gen', label: 'Agreement Generation', path: '/agreement-gen', icon: FileText },
  { id: 'my-task', label: 'My Tasks', path: '/my-task', icon: CheckSquare },
  // { id: 'sod-eod-reports', label: 'Reports', path: '/sod-eod-reports', icon: ClipboardList },
  { id: 'work-report', label: 'Work Report', path: '/work-report', icon: BarChart },
  { id: 'refund-request', label: 'Approvals', path: '/refund-request', icon: IndianRupee },
  { id: 'pending-refunds', label: 'Pending Refunds', path: '/pending-refunds', icon: CircleDollarSign },
  { id: 'user-manual', label: 'User Manual', path: '/user-manual', icon: BookOpen },
  { id: 'faq', label: 'FAQ', path: '/faq', icon: HelpCircle },
];

const Sidebar = ({ isOpen, setSidebarOpen, isCollapsed, setIsCollapsed, onLogoutClick }) => {
  const { user, logout } = useContext(AuthContext);
  const [caseCount, setCaseCount] = useState(0);
  const [approvalCounts, setApprovalCounts] = useState({
    tour: 0,
    settlement: 0,
    leave: 0,
    legal: 0,
    total: 0
  });

  useEffect(() => {
    const fetchCount = async () => {
      try {
        if (user?.role === 'Reviewer') {
          const res = await api.get('/refunds?status=Pending Review');
          const uniqueCaseIds = new Set((res.data || []).map(r => r.caseId));
          setCaseCount(uniqueCaseIds.size);
        } else {
          const res = await api.get('/cases/count');
          setCaseCount(res.data.total ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch cases count", err);
      }
    };
    if (user) fetchCount();
  }, [user]);

  useEffect(() => {
    const fetchApprovalCounts = async () => {
      if (!user || !['Admin', 'Super Admin', 'SuperAdmin', 'BD Head'].includes(user.role)) return;
      try {
        const [toursRes, leavesRes, legalRes] = await Promise.all([
          api.get('/tours'),
          api.get('/leaves'),
          api.get('/legal-requests')
        ]);

        const tours = toursRes.data || [];
        const leaves = leavesRes.data || [];
        const legals = legalRes.data || [];

        const tourPending = tours.filter(r => 
          (!r.reimbursementStatus && (r.status === 'Pending Review' || r.status === 'Pending')) ||
          (r.reimbursementStatus && (r.reimbursementStatus === 'Submitted' || r.reimbursementStatus === 'Pending'))
        ).length;

        const leavePending = leaves.filter(r => r.status === 'Pending' || r.status === 'Pending Review').length;
        const legalPending = legals.filter(r => user.role === 'BD Head' ? r.status === 'Pending BD Head' : r.status === 'Pending').length;

        setApprovalCounts({
          tour: tourPending,
          settlement: 0,
          leave: leavePending,
          legal: legalPending,
          total: tourPending + leavePending + legalPending
        });
      } catch (err) {
        console.error("Failed to fetch approval counts in sidebar:", err);
      }
    };

    fetchApprovalCounts();
    const interval = setInterval(fetchApprovalCounts, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const visibleTabs = tabsConfig.filter(tab => {
    if (!user) return false;
    if (tab.id === 'user-manual' || tab.id === 'faq') return true;
    // Show Records module if user has explicit permission OR role-based access
    if (tab.id === 'internal-search' && user.canAccessRecords) return true;
    return TAB_ACCESS[tab.id]?.includes(user?.role);
  });

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          print:hidden flex-shrink-0 flex flex-col
          bg-[var(--bg-secondary)] border-r border-[var(--border)]
          transition-all duration-300 ease-in-out
          h-full overflow-visible
          md:translate-x-0
          fixed md:relative top-[56px] md:top-0 left-0 z-[90]
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'w-[70px]' : 'w-[250px]'}
        `}
      >
        {/* Collapse Toggle Button */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsCollapsed(!isCollapsed)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsCollapsed(!isCollapsed);
            }
          }}
          className="hidden md:flex items-center justify-center absolute -right-3.5 top-6 z-[100] w-7 h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:scale-110 active:scale-95 transition-all duration-200 shadow-md cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed
            ? <ChevronRight size={14} strokeWidth={3.5} />
            : <ChevronLeft size={14} strokeWidth={3.5} />
          }
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 flex flex-col gap-1 px-2 hide-scrollbar">
          {visibleTabs.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.path}
              state={tab.id === 'new-case' ? { clear: true } : null}
              end={tab.path === '/'}
              title={isCollapsed ? tab.label : ''}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold tracking-wide transition-all duration-200 cursor-pointer select-none
                ${isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_0_15px_rgba(249,115,22,0.08)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                }
                ${isCollapsed ? 'justify-center' : ''}`
              }
              onClick={() => {
                if (window.innerWidth <= 768) setSidebarOpen(false);
                if (tab.id === 'case-master') {
                  window.dispatchEvent(new CustomEvent('reset-case-view'));
                }
              }}
            >
              {({ isActive }) => (
                <>
                  {/* Active accent bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent)]" />
                  )}
                  <div className="relative flex items-center justify-center">
                    <tab.icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={`flex-shrink-0 transition-colors duration-200
                        ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}
                      `}
                    />
                    {tab.id === 'refund-request' && approvalCounts.total > 0 && isCollapsed && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red text-white text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[var(--bg-secondary)] shadow-sm animate-pulse">
                        {approvalCounts.total}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="truncate leading-none flex items-center justify-between w-full min-w-0">
                      <span>{tab.label}</span>
                      {tab.id === 'refund-request' && approvalCounts.total > 0 && (
                        <span className="bg-red text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                          {approvalCounts.total}
                        </span>
                      )}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className={`shrink-0 border-t border-[var(--border)] p-2 flex flex-col gap-1.5 ${isCollapsed ? 'items-center' : ''}`}>
          {/* Case count badge */}
          <div
            title={`${caseCount} cases tracked`}
            className={`
              flex items-center gap-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]
              text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest
              ${isCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2.5 justify-start'}
            `}
          >
            <span className="text-[var(--accent)] font-black">{caseCount}</span>
            {!isCollapsed && <span>cases tracked</span>}
          </div>


          {/* Logout */}
          <div
            role="button"
            tabIndex={0}
            onClick={onLogoutClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onLogoutClick();
              }
            }}
            title="Sign Out"
            className={`
              flex items-center gap-2 rounded-xl border border-red-500/20
              bg-red-500/5 text-red-400
              hover:bg-red-500 hover:text-white hover:border-red-500
              transition-all text-[11px] font-black uppercase tracking-widest cursor-pointer
              ${isCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2.5'}
            `}
          >
            <LogOut size={14} />
            {!isCollapsed && <span>Sign Out</span>}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 top-[56px] bg-black/50 backdrop-blur-sm z-[80]"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
