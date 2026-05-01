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
  IndianRupee
} from 'lucide-react';

const tabAccess = {
  "dashboard": ["Admin", "Operations", "Staff", "Reviewer", "Accountant"],
  "new-case": ["Admin", "Operations", "Staff"],
  "case-master": ["Admin", "Operations"],
  // "history": ["Admin", "Operations", "Staff"],
  // "action-log": ["Admin", "Operations", "Staff"],
  // "comm-log": ["Admin", "Operations", "Staff"],
  // "timeline": ["Admin"],
  // "doc-index": ["Admin", "Operations", "Staff"],
  "admin-panel": ["Admin"],
  "internal-search": ["Admin", "Operations", "Staff", "Reviewer", "Accountant"],
  "reviewer-panel": ["Admin", "Reviewer"],
  "accountant-dashboard": ["Admin", "Accountant"],
  "agreement-gen": ["Admin", "Operations"],
  "my-task": ["Admin", "Operations", "Staff"],
  "sod-eod-reports": ["Admin", "Operations", "Staff"],
  "work-report": ["Admin", "Operations"],
  "refund-request": ["Admin", "Operations", "Staff"]
};

const tabsConfig = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { id: 'new-case', label: 'New Case', path: '/new-case', icon: PlusCircle },
  { id: 'case-master', label: 'My Cases', path: '/case-master', icon: ListTodo },
  // { id: 'history', label: 'History & Update', path: '/history', icon: History },
  // { id: 'action-log', label: 'Action Log', path: '/action-log', icon: Zap },
  // { id: 'comm-log',             label: 'Communication',         path: '/comm-log',             icon: MessageSquare },
  // { id: 'timeline', label: 'Timeline View', path: '/timeline', icon: Clock },
  // { id: 'doc-index',            label: 'Document Index',        path: '/doc-index',            icon: FolderOpen },
  { id: 'admin-panel', label: 'Admin Panel', path: '/admin-panel', icon: Settings },
  { id: 'internal-search', label: 'Records', path: '/internal-search', icon: Search },
  { id: 'reviewer-panel', label: 'Reviewer Dashboard', path: '/reviewer-panel', icon: ClipboardEdit },
  { id: 'accountant-dashboard', label: 'Accountant', path: '/accountant-dashboard', icon: CircleDollarSign },
  { id: 'agreement-gen', label: 'Agreement Generation', path: '/agreement-gen', icon: FileText },
  { id: 'my-task', label: 'My Tasks', path: '/my-task', icon: CheckSquare },
  { id: 'sod-eod-reports', label: 'Reports', path: '/sod-eod-reports', icon: ClipboardList },
  { id: 'work-report', label: 'Work Report', path: '/work-report', icon: BarChart },
  { id: 'refund-request', label: 'Submit Refund Request', path: '/refund-request', icon: IndianRupee },
];

const Sidebar = ({ isOpen, setSidebarOpen, isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useContext(AuthContext);
  const [caseCount, setCaseCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/cases');
        setCaseCount(res.data.length);
      } catch (err) {
        console.error("Failed to fetch cases count", err);
      }
    };
    if (user) fetchCount();
  }, [user]);

  const visibleTabs = tabsConfig.filter(tab =>
    user && tabAccess[tab.id]?.includes(user?.role)
  );

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          print:hidden flex-shrink-0 flex flex-col
          bg-[var(--bg-secondary)] border-r border-[var(--border)]
          transition-all duration-300 ease-in-out
          h-full overflow-hidden
          md:translate-x-0
          fixed md:relative top-[56px] md:top-0 left-0 z-[90]
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'w-[70px]' : 'w-[250px]'}
        `}
      >
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-200 shadow-lg"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed
            ? <ChevronRight size={12} strokeWidth={3} />
            : <ChevronLeft size={12} strokeWidth={3} />
          }
        </button>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 flex flex-col gap-1 px-2 hide-scrollbar">
          {visibleTabs.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.path}
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
              }}
            >
              {({ isActive }) => (
                <>
                  {/* Active accent bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--accent)] rounded-full shadow-[0_0_8px_var(--accent)]" />
                  )}
                  <tab.icon
                    size={18}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`flex-shrink-0 transition-colors duration-200
                      ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}
                    `}
                  />
                  {!isCollapsed && (
                    <span className="truncate leading-none">{tab.label}</span>
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
          <button
            onClick={logout}
            title="Sign Out"
            className={`
              flex items-center gap-2 rounded-xl border border-red-500/20
              bg-red-500/5 text-red-400
              hover:bg-red-500 hover:text-white hover:border-red-500
              transition-all text-[11px] font-black uppercase tracking-widest
              ${isCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2.5'}
            `}
          >
            <LogOut size={14} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
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
