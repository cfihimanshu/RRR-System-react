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
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  CheckSquare,
  BarChart,
  ClipboardList
} from 'lucide-react';

const tabAccess = {
  "dashboard": ["Admin", "Operations", "Staff", "Reviewer", "Accountant"],
  "new-case": ["Admin", "Operations", "Staff"],
  "case-master": ["Admin", "Operations"],
  "history": ["Admin", "Operations", "Staff"],
  "action-log": ["Admin", "Operations", "Staff"],
  "comm-log": ["Admin", "Operations", "Staff"],
  "timeline": ["Admin"],
  "doc-index": ["Admin", "Operations", "Staff"],
  "case-study": ["Admin", "Operations"],
  "admin-panel": ["Admin"],
  "internal-search": ["Admin", "Operations", "Staff", "Reviewer", "Accountant"],
  "reviewer-panel": ["Admin", "Reviewer"],
  "accountant-dashboard": ["Admin", "Accountant"],
  "agreement-gen": ["Admin", "Operations"],
  "my-task": ["Admin", "Operations", "Staff"],
  "sod-eod-reports": ["Admin", "Operations", "Staff"],
  "work-report": ["Admin", "Operations"]
};

const tabsConfig = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { id: 'new-case', label: 'New Case', path: '/new-case', icon: PlusCircle },
  { id: 'case-master', label: 'Case Master', path: '/case-master', icon: ListTodo },
  { id: 'history', label: 'History & Update', path: '/history', icon: History },
  { id: 'action-log', label: 'Action Log', path: '/action-log', icon: Zap },
  { id: 'comm-log', label: 'Communication', path: '/comm-log', icon: MessageSquare },
  { id: 'timeline', label: 'Timeline View', path: '/timeline', icon: Clock },
  { id: 'doc-index', label: 'Document Index', path: '/doc-index', icon: FolderOpen },
  { id: 'case-study', label: 'Case Study (Draft)', path: '/case-study', icon: FileText },
  { id: 'admin-panel', label: 'Admin Panel', path: '/admin-panel', icon: Settings },
  { id: 'internal-search', label: 'Data Search', path: '/internal-search', icon: Search },
  { id: 'reviewer-panel', label: 'Reviewer Dashboard', path: '/reviewer-panel', icon: ClipboardEdit },
  { id: 'accountant-dashboard', label: 'Accountant Dashboard', path: '/accountant-dashboard', icon: CircleDollarSign },
  { id: 'agreement-gen', label: 'Agreement Generation ', path: '/agreement-gen', icon: FileText },
  { id: 'my-task', label: 'My Task', path: '/my-task', icon: CheckSquare },
  { id: 'sod-eod-reports', label: 'SOD/EOD Reports', path: '/sod-eod-reports', icon: ClipboardList },
  { id: 'work-report', label: 'Work Report', path: '/work-report', icon: BarChart },
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

  const handleClearCache = () => {
    window.location.reload(true);
  };

  const visibleTabs = tabsConfig.filter(tab =>
    user && tabAccess[tab.id]?.includes(user?.role)
  );

  return (
    <>
      <div className={`print:hidden fixed top-[56px] left-0 bottom-0 z-[90] flex flex-col gap-1.5 overflow-y-auto hide-scrollbar bg-gradient-to-b from-gray-900 to-gray-800 border-r border-white/10 transition-all duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-[70px] p-2' : 'w-[250px] p-3.5'}`}>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 hide-scrollbar mt-2">
          {visibleTabs.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.path}
              title={isCollapsed ? tab.label : ''}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-[13px] text-gray-300 border-l-4 border-transparent whitespace-nowrap transition-all rounded-lg hover:text-white hover:bg-white/10 ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'text-white font-semibold !border-blue-400 bg-blue-500/25' : ''}`}
              onClick={() => {
                if (window.innerWidth <= 768) setSidebarOpen(false);
              }}
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={20} className={`${isActive ? 'text-blue-400' : 'opacity-80'}`} />
                  {!isCollapsed && <span>{tab.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className={`mt-auto pt-4 border-t border-white/10 flex flex-col gap-2 shrink-0 ${isCollapsed ? 'items-center' : ''}`}>
          <div
            className={`bg-[#2D3748] text-[#E2E8F0] border border-[#4A5568] text-center py-2 rounded-lg text-[13px] font-semibold tracking-wide cursor-default shadow-sm ${isCollapsed ? 'w-10 h-10 flex items-center justify-center p-0 text-[10px]' : 'px-2'}`}
            title={`${caseCount} cases`}
          >
            {isCollapsed ? caseCount : `${caseCount} cases`}
          </div>
          <button
            onClick={handleClearCache}
            title="Clear Cache"
            className={`bg-[#1A202C] text-[#A0AEC0] border border-[#2D3748] hover:bg-[#2D3748] hover:text-white transition-colors text-center py-2 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm ${isCollapsed ? 'w-10 h-10' : ''}`}
          >
            <RefreshCw size={16} />
            {!isCollapsed && <span>Clear Cache</span>}
          </button>
          <button
            onClick={logout}
            title="Logout"
            className={`bg-[#E53E3E] hover:bg-[#C53030] text-white border border-[#E53E3E] transition-colors text-center py-2 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2 shadow-sm ${isCollapsed ? 'w-10 h-10' : ''}`}
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 top-[56px] bg-black/40 z-[80]"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
