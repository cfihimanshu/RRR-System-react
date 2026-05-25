import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import {
  ShieldCheck,
  FolderOpen,
  CheckCircle2,
  FileCheck,
  Activity,
  TrendingUp,
  Clock,
  Timer,
  ClipboardList,
  ChevronRight,
  X,
  Calendar,
  CreditCard,
  Eye,
  FileText,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import TabLoader from '../shared/TabLoader';

const getPermissionsForRole = (roleName) => {
  const r = String(roleName || '').toLowerCase().replace(/\s+/g, '');
  if (r === 'superadmin' || r === 'superadmin') {
    return {
      create: 'Cases, Users',
      view: 'Dashboard, My Cases, My Tasks, Work Report, Admin Panel, System Access & Audit Ledger',
      search: 'Search & Filters on all Cases',
      edit: 'Cases, User Roles, Records Access',
      delete: 'Cases',
      hasCreate: true,
      hasView: true,
      hasSearch: true,
      hasEdit: true,
      hasDelete: true
    };
  } else if (r === 'admin') {
    return {
      create: 'Cases, Users',
      view: 'Dashboard, My Cases, My Tasks, Work Report, Admin Panel, System Access & Audit Ledger',
      search: 'Search & Filters on all Cases',
      edit: 'Cases, User Roles, Records Access',
      delete: 'Cases',
      hasCreate: true,
      hasView: true,
      hasSearch: true,
      hasEdit: true,
      hasDelete: true
    };
  } else if (r === 'operations') {
    return {
      create: 'Cases, Tasks, Documents, Communications',
      view: 'Dashboard, My Cases, My Tasks, Work Report',
      search: 'Search & Filters on all Cases',
      edit: 'Cases, Tasks',
      delete: 'No Access',
      hasCreate: true,
      hasView: true,
      hasSearch: true,
      hasEdit: true,
      hasDelete: false
    };
  } else if (r === 'staff') {
    return {
      create: 'Cases, Tasks, Documents, Communications',
      view: 'My Cases (Assigned), My Tasks, Work Report',
      search: 'Search within Assigned Cases',
      edit: 'Assigned Cases, Tasks',
      delete: 'No Access',
      hasCreate: true,
      hasView: true,
      hasSearch: true,
      hasEdit: true,
      hasDelete: false
    };
  } else if (r === 'reviewer') {
    return {
      create: 'Refund Remarks',
      view: 'Reviewer Dashboard, My Cases, Work Report',
      search: 'Search Cases & Refunds',
      edit: 'Refund Status (QA Approve/Reject)',
      delete: 'No Access',
      hasCreate: true,
      hasView: true,
      hasSearch: true,
      hasEdit: true,
      hasDelete: false
    };
  } else if (r === 'accountant') {
    return {
      create: 'Refund Payment Details',
      view: 'Accountant Dashboard, My Cases',
      search: 'Search Cases by ID/Amount',
      edit: 'Refund Status (Paid/Pending)',
      delete: 'No Access',
      hasCreate: true,
      hasView: true,
      hasSearch: true,
      hasEdit: true,
      hasDelete: false
    };
  } else if (r === 'legal') {
    return {
      create: 'Legal Notices, Case Notes',
      view: 'Legal Dashboard, My Cases',
      search: 'Search Assigned Cases',
      edit: 'Legal Notice Status',
      delete: 'No Access',
      hasCreate: true,
      hasView: true,
      hasSearch: true,
      hasEdit: true,
      hasDelete: false
    };
  }
  return {
    create: 'No Access',
    view: 'Assigned Cases Only',
    search: 'Assigned Cases Only',
    edit: 'No Access',
    delete: 'No Access',
    hasCreate: false,
    hasView: true,
    hasSearch: true,
    hasEdit: false,
    hasDelete: false
  };
};

const SuperAdminDashTab = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCases: 0,
    totalAmountPaid: 0,
    activeCases: 0,
    openCasesAmount: 0,
    settledCases: 0,
    settledAmount: 0,
    closedCases: 0,
    closedAmount: 0,
    highRiskCases: 0,
    highRiskAmount: 0,
    refundCases: 0,
    refundAmount: 0,
    caseTypeWiseData: []
  });
  const [activities, setActivities] = useState([]);
  const [visibleActivitiesCount, setVisibleActivitiesCount] = useState(15);
  const [refunds, setRefunds] = useState([]);
  const [viewAllRefunds, setViewAllRefunds] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [users, setUsers] = useState([]);
  const [viewAllUsers, setViewAllUsers] = useState(false);

  const fetchSuperAdminStats = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

      // 1. Fetch system statistics (All-time Cases metrics)
      const statsRes = await api.get('/dashboard/stats?teamFilter=all');
      const statsData = statsRes.data || {};

      // 2. Fetch refund requests list
      const refundsRes = await api.get('/refunds');
      const refundData = Array.isArray(refundsRes.data) ? refundsRes.data : [];
      setRefunds(refundData);

      // 3. Fetch system users for Access Details
      try {
        const usersRes = await api.get('/auth/users');
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      } catch (userErr) {
        console.error('Error fetching users for access details:', userErr);
      }

      // Update case counts and types
      setStats({
        totalCases: statsData.totalCases || 0,
        totalAmountPaid: statsData.totalAmountPaid || 0,
        activeCases: statsData.openCases || 0,
        openCasesAmount: statsData.openCasesAmount || 0,
        settledCases: statsData.settledCases || 0,
        settledAmount: statsData.settledAmount || 0,
        closedCases: statsData.closedCases || 0,
        closedAmount: statsData.closedAmount || 0,
        highRiskCases: (statsData.highPriority || 0) + (statsData.criticalPriority || 0),
        highRiskAmount: (statsData.highPriorityAmount || 0) + (statsData.criticalPriorityAmount || 0),
        refundCases: refundData.length || 0,
        refundAmount: statsData.totalRefundAmount || 0,
        caseTypeWiseData: statsData.caseTypeWiseData || []
      });

    } catch (err) {
      console.error('Error loading Super Admin stats:', err);
      toast.error('Failed to sync system statistics');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const [tlRes, reportsRes] = await Promise.allSettled([
        api.get('/timeline?feed=true&limit=30'),
        api.get('/reports?light=true&limit=20')
      ]);

      const tlDataRaw = tlRes.status === 'fulfilled' ? tlRes.value.data : [];
      const reportsDataRaw = reportsRes.status === 'fulfilled' ? reportsRes.value.data : [];

      const tlData = Array.isArray(tlDataRaw) ? tlDataRaw : (tlDataRaw.logs || tlDataRaw.timeline || []);
      const reportsData = Array.isArray(reportsDataRaw) ? reportsDataRaw : (reportsDataRaw.reports || []);

      const tlActivities = (Array.isArray(tlData) ? tlData : [])
        .map(item => {
          const itemDate = new Date(item.createdAt);
          return {
            id: item._id,
            type: 'timeline',
            title: item.summary || item.eventType || 'System Activity',
            subtitle: `${item.caseId || 'General'} — ${item.eventType || 'Update'}`,
            user: item.source || 'System',
            date: isNaN(itemDate.getTime()) ? new Date() : itemDate,
            color: item.eventType?.toLowerCase().includes('mou') ? 'green' :
              item.eventType?.toLowerCase().includes('escalat') ? 'red' :
                item.eventType?.toLowerCase().includes('status') ? 'orange' :
                  item.eventType?.toLowerCase().includes('update') ? 'purple' :
                    item.eventType?.toLowerCase().includes('refund') ? 'green' : 'blue'
          };
        });

      const reportActivities = (Array.isArray(reportsData) ? reportsData : [])
        .map(item => {
          const itemDate = new Date(item.createdAt);
          return {
            id: item._id,
            type: 'report',
            title: `${item.type || 'Report'} Submitted`,
            subtitle: item.userEmail || 'User Report',
            user: item.userName || item.userEmail || 'User',
            date: isNaN(itemDate.getTime()) ? new Date() : itemDate,
            color: item.type === 'SOD' ? 'purple' : 'orange'
          };
        });

      const merged = [...tlActivities, ...reportActivities]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 50);

      setActivities(merged);
    } catch (err) {
      console.error('Activity fetch error:', err);
    }
  };

  useEffect(() => {
    fetchSuperAdminStats(false);
    fetchActivities();
    const interval = setInterval(() => {
      fetchSuperAdminStats(true);
      fetchActivities();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleActivityScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 10;
    if (bottom && visibleActivitiesCount < activities.length) {
      setVisibleActivitiesCount(prev => prev + 15);
    }
  };

  if (loading) {
    return (
      <div className="section active bg-bg-primary h-screen flex items-center justify-center w-full">
        <TabLoader minHeight="300px" text="Loading Super Admin Panel" />
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const displayedRefunds = viewAllRefunds ? refunds : refunds.slice(0, 3);

  return (
    <div className="section active w-full pb-10 px-6 bg-bg-primary overflow-x-hidden max-w-full min-h-screen">

      {/* Welcome Banner */}
      <div className="bg-bg-card border-2 border-border rounded-3xl p-8 shadow-sm mb-8 mt-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-accent-soft rounded-full -mr-16 -mt-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent-soft text-accent border border-accent/20">
              <ShieldCheck size={12} /> Super Admin Control Zone
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-text-primary uppercase tracking-tight">
              Super Admin
            </h1>
          </div>
        </div>
      </div>

      {/* Dynamic Case Summaries Grid (6 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {/* Total Cases */}
        <div
          onClick={() => navigate('/case-master')}
          className="bg-bg-card border-2 border-border rounded-2xl p-4 shadow-sm hover:border-accent hover:shadow-md cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center border border-accent/15 group-hover:scale-105 transition-transform">
              <FolderOpen size={18} />
            </div>
            <span className="text-[9px] font-black text-text-muted bg-bg-input px-2 py-0.5 rounded-lg uppercase tracking-wider">Total</span>
          </div>
          <div className="text-2xl font-black text-text-primary mb-1 tracking-tight">{stats.totalCases}</div>
          <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5 line-clamp-1">Total Cases</div>
          <div className="text-xs font-black text-accent">{formatCurrency(stats.totalAmountPaid)}</div>
        </div>

        {/* Active Cases */}
        <div
          onClick={() => navigate('/case-master', { state: { statusFilter: 'Active' } })}
          className="bg-bg-card border-2 border-border rounded-2xl p-4 shadow-sm hover:border-blue-500/40 hover:shadow-md cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-soft text-blue border border-blue-soft flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity size={18} />
            </div>
            <span className="text-[9px] font-black text-text-muted bg-bg-input px-2 py-0.5 rounded-lg uppercase tracking-wider font-mono">Active</span>
          </div>
          <div className="text-2xl font-black text-text-primary mb-1 tracking-tight">{stats.activeCases}</div>
          <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5 line-clamp-1">Active Files</div>
          <div className="text-xs font-black text-blue">{formatCurrency(stats.openCasesAmount)}</div>
        </div>

        {/* Settled Cases */}
        <div
          onClick={() => navigate('/case-master', { state: { statusFilter: 'Settlement' } })}
          className="bg-bg-card border-2 border-border rounded-2xl p-4 shadow-sm hover:border-green-600/40 hover:shadow-md cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-soft text-green border border-green-soft flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-[9px] font-black text-text-muted bg-bg-input px-2 py-0.5 rounded-lg uppercase tracking-wider font-mono">Settled</span>
          </div>
          <div className="text-2xl font-black text-text-primary mb-1 tracking-tight">{stats.settledCases}</div>
          <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5 line-clamp-1">Settled Files</div>
          <div className="text-xs font-black text-green">{formatCurrency(stats.settledAmount)}</div>
        </div>

        {/* Closed Cases */}
        <div
          onClick={() => navigate('/case-master', { state: { statusFilter: 'Closure' } })}
          className="bg-bg-card border-2 border-border rounded-2xl p-4 shadow-sm hover:border-purple-500/40 hover:shadow-md cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-soft text-purple border border-purple-soft flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileCheck size={18} />
            </div>
            <span className="text-[9px] font-black text-text-muted bg-bg-input px-2 py-0.5 rounded-lg uppercase tracking-wider font-mono">Closed</span>
          </div>
          <div className="text-2xl font-black text-text-primary mb-1 tracking-tight">{stats.closedCases}</div>
          <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5 line-clamp-1">Closed Files</div>
          <div className="text-xs font-black text-purple">{formatCurrency(stats.closedAmount)}</div>
        </div>

        {/* High Risk Cases */}
        <div
          onClick={() => navigate('/case-master', { state: { priorityFilter: ['High', 'Critical'] } })}
          className="bg-bg-card border-2 border-border rounded-2xl p-4 shadow-sm hover:border-red-500/40 hover:shadow-md cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-soft text-red border border-red-soft flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle size={18} />
            </div>
            <span className="text-[9px] font-black text-text-muted bg-bg-input px-2 py-0.5 rounded-lg uppercase tracking-wider font-mono">Critical</span>
          </div>
          <div className="text-2xl font-black text-text-primary mb-1 tracking-tight">{stats.highRiskCases}</div>
          <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5 line-clamp-1">High Risk Files</div>
          <div className="text-xs font-black text-red">{formatCurrency(stats.highRiskAmount)}</div>
        </div>

        {/* Refund Cases */}
        <div
          onClick={() => navigate('/case-master', { state: { refundStatusFilter: ['Paid', 'Pending'] } })}
          className="bg-bg-card border-2 border-border rounded-2xl p-4 shadow-sm hover:border-yellow-500/40 hover:shadow-md cursor-pointer transition-all active:scale-98 group"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-soft text-yellow border border-yellow-soft flex items-center justify-center group-hover:scale-105 transition-transform">
              <RotateCcw size={18} />
            </div>
            <span className="text-[9px] font-black text-text-muted bg-bg-input px-2 py-0.5 rounded-lg uppercase tracking-wider font-mono">Refund</span>
          </div>
          <div className="text-2xl font-black text-text-primary mb-1 tracking-tight">{stats.refundCases}</div>
          <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5 line-clamp-1">Refund Actions</div>
          <div className="text-xs font-black text-yellow">{formatCurrency(stats.refundAmount)}</div>
        </div>
      </div>

      {/* Main Grid Section (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Hand: Case Classifications & Refund Actions Details Table */}
        <div className="lg:col-span-2 space-y-8">

          {/* Case Classifications Grid */}
          <div className="bg-bg-card border-2 border-border rounded-[2rem] p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingUp size={16} className="text-accent" /> Case Classifications
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {stats.caseTypeWiseData.slice(0, 8).map((item, index) => (
                <div key={index} className="bg-bg-input border border-border p-4 rounded-2xl flex flex-col justify-between hover:border-accent transition-colors">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider block truncate mb-2">
                    {item.caseType || 'General Case'}
                  </div>
                  <div>
                    <div className="text-2xl font-black text-text-primary">
                      {item.count}
                    </div>
                    <div className="text-[10px] font-black text-accent mt-1">
                      {formatCurrency(item.totalAmount)}
                    </div>
                  </div>
                </div>
              ))}
              {stats.caseTypeWiseData.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs font-bold text-text-muted uppercase tracking-wider">
                  No classification data found
                </div>
              )}
            </div>
          </div>

          {/* Access Details Table (Replaces Refund Actions Details Table) */}
          <div className="bg-bg-card border-2 border-border rounded-[2rem] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck size={18} className="text-accent" /> Access Details
              </h3>
            </div>

            {users.length === 0 ? (
              <div className="py-12 text-center bg-bg-input/30 border-2 border-dashed border-border rounded-2xl text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b-2 border-border text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">
                        <th className="px-4 py-4 whitespace-nowrap w-[15%] max-w-[150px]">User Name / Email</th>
                        <th className="px-4 py-4 whitespace-nowrap w-[8%]">Role</th>
                        <th className="px-4 py-4 whitespace-nowrap w-[15%]">Create</th>
                        <th className="px-4 py-4 whitespace-nowrap w-[15%]">View</th>
                        <th className="px-4 py-4 whitespace-nowrap w-[15%]">Search</th>
                        <th className="px-4 py-4 whitespace-nowrap w-[16%]">Edit</th>
                        <th className="px-4 py-4 whitespace-nowrap w-[16%]">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {(viewAllUsers ? users : users.slice(0, 5)).map((u) => {
                        const perms = getPermissionsForRole(u.role);
                        return (
                          <tr
                            key={u._id}
                            className="hover:bg-bg-secondary/40 transition-colors"
                          >
                            <td className="px-4 py-4 align-middle w-[15%] max-w-[150px] break-all">
                              <div className="text-[11px] font-black text-text-primary tracking-tight">{u.fullName || 'User'}</div>
                              <div className="text-[9px] font-bold text-accent tracking-wide mt-0.5">{u.email}</div>
                            </td>
                            <td className="px-4 py-4 align-middle w-[8%]">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-bg-input text-text-primary border border-border">
                                {u.role || 'Staff'}
                              </span>
                            </td>
                            {/* Create Access */}
                            <td className="px-4 py-4 align-middle w-[15%]">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${perms.hasCreate ? 'bg-green' : 'bg-red'}`} />
                                  <span className={`text-[9px] font-black uppercase tracking-wider ${perms.hasCreate ? 'text-green' : 'text-red'}`}>
                                    {perms.hasCreate ? 'Allowed' : 'Blocked'}
                                  </span>
                                </div>
                                <span className="text-[9.5px] font-semibold text-text-secondary leading-snug">
                                  {perms.create}
                                </span>
                              </div>
                            </td>
                            {/* View Access */}
                            <td className="px-4 py-4 align-middle w-[15%]">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${perms.hasView ? 'bg-green' : 'bg-red'}`} />
                                  <span className={`text-[9px] font-black uppercase tracking-wider ${perms.hasView ? 'text-green' : 'text-red'}`}>
                                    {perms.hasView ? 'Allowed' : 'Blocked'}
                                  </span>
                                </div>
                                <span className="text-[9.5px] font-semibold text-text-secondary leading-snug">
                                  {perms.view}
                                </span>
                              </div>
                            </td>
                            {/* Search Access */}
                            <td className="px-4 py-4 align-middle w-[15%]">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${perms.hasSearch ? 'bg-green' : 'bg-red'}`} />
                                  <span className={`text-[9px] font-black uppercase tracking-wider ${perms.hasSearch ? 'text-green' : 'text-red'}`}>
                                    {perms.hasSearch ? 'Allowed' : 'Blocked'}
                                  </span>
                                </div>
                                <span className="text-[9.5px] font-semibold text-text-secondary leading-snug">
                                  {perms.search}
                                </span>
                              </div>
                            </td>
                            {/* Edit Access */}
                            <td className="px-4 py-4 align-middle w-[16%]">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${perms.hasEdit ? 'bg-green' : 'bg-red'}`} />
                                  <span className={`text-[9px] font-black uppercase tracking-wider ${perms.hasEdit ? 'text-green' : 'text-red'}`}>
                                    {perms.hasEdit ? 'Allowed' : 'Blocked'}
                                  </span>
                                </div>
                                <span className="text-[9.5px] font-semibold text-text-secondary leading-snug">
                                  {perms.edit}
                                </span>
                              </div>
                            </td>
                            {/* Delete Access */}
                            <td className="px-4 py-4 align-middle w-[16%]">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${perms.hasDelete ? 'bg-green' : 'bg-red'}`} />
                                  <span className={`text-[9px] font-black uppercase tracking-wider ${perms.hasDelete ? 'text-green' : 'text-red'}`}>
                                    {perms.hasDelete ? 'Allowed' : 'Blocked'}
                                  </span>
                                </div>
                                <span className="text-[9.5px] font-semibold text-text-secondary leading-snug">
                                  {perms.delete}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {users.length > 5 && (
              <button
                onClick={() => setViewAllUsers(!viewAllUsers)}
                className="mt-6 w-full text-center py-3 bg-bg-input hover:bg-accent-soft border border-border hover:border-accent text-[10px] font-black uppercase tracking-widest text-text-primary rounded-xl transition-all"
              >
                {viewAllUsers ? 'Show Less' : `View All (${users.length})`}
              </button>
            )}
          </div>

        </div>

        {/* Right Hand: Recent Activities Timeline */}
        <div className="bg-bg-card border-2 border-border rounded-[2rem] p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6 px-2">
            <Clock size={18} className="text-blue" />
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Recent Activity</h3>
          </div>

          <div
            className="space-y-6 flex-1 overflow-y-auto scrollbar-thin max-h-[580px] pr-2"
            onScroll={handleActivityScroll}
          >
            {activities.length === 0 ? (
              <div className="text-center py-20 opacity-20">
                <Timer size={40} className="mx-auto mb-4" />
                <div className="text-[10px] font-black uppercase tracking-widest">Awaiting Pulse...</div>
              </div>
            ) : (
              activities.slice(0, visibleActivitiesCount).map((activity, idx) => (
                <div key={activity.id || idx} className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-[-24px] before:w-[2px] last:before:hidden before:bg-border/50">
                  <div className={`absolute left-[-5px] top-1.5 w-3 h-3 rounded-full z-10 border-2 border-bg-card shadow-[0_0_10px_rgba(0,0,0,0.5)] ${activity.color === 'green' ? 'bg-green shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                    activity.color === 'red' ? 'bg-red shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                      activity.color === 'purple' ? 'bg-purple shadow-[0_0_8px_rgba(168,85,247,0.4)]' :
                        activity.color === 'orange' ? 'bg-accent shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-blue shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                    }`} />

                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1 flex items-center justify-between">
                    <span>{new Date(activity.date).toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : 'Earlier'} &nbsp;{new Date(activity.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-accent font-black tracking-widest">{activity.user}</span>
                  </div>

                  <p className="text-[11px] font-bold text-text-secondary leading-snug mb-1">
                    {activity.title.length > 80 ? activity.title.substring(0, 80) + '...' : activity.title}
                  </p>
                  <div className="text-[9px] font-black text-text-muted uppercase tracking-tight opacity-60 truncate">
                    {activity.subtitle}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- REFUND DETAIL POPUP MODAL --- */}
      {selectedRefund && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedRefund(null)}
        >
          <div
            className="bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-soft rounded-xl text-accent"><FileText size={18} /></div>
                <div>
                  <div className="text-[11px] font-black text-text-primary uppercase tracking-widest">{selectedRefund.caseId}</div>
                  <div className="text-[9px] font-bold text-accent uppercase tracking-widest mt-0.5">{selectedRefund.companyName || 'N/A'}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="p-2 rounded-xl hover:bg-red-soft/30 text-text-muted hover:text-red transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Status + Date */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 ${selectedRefund.status === 'Paid'
                  ? 'bg-green-soft text-green border-green-soft'
                  : selectedRefund.status === 'Rejected'
                    ? 'bg-red-soft text-red border-red-soft'
                    : 'bg-yellow-soft text-yellow border-yellow-soft'
                  }`}>{selectedRefund.status}</span>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted">
                  <Calendar size={12} />
                  {selectedRefund.timestamp ? new Date(selectedRefund.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
              </div>

              {/* Amount */}
              <div className="bg-bg-secondary rounded-xl p-4 flex items-center justify-between">
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Total Credit Amount</div>
                <div className="text-xl font-black text-text-primary">₹{Number(selectedRefund.amount || 0).toLocaleString('en-IN')}</div>
              </div>

              {/* Rejection Reason */}
              {selectedRefund.status === 'Rejected' && selectedRefund.reviewerRemark && (
                <div className="bg-red-soft/20 border border-red-soft/50 rounded-xl p-4">
                  <div className="text-[9px] font-black text-red uppercase tracking-widest mb-1">Reason for Rejection</div>
                  <div className="text-[11px] font-bold text-red">{selectedRefund.reviewerRemark}</div>
                </div>
              )}

              {/* Bank Details */}
              <div className="bg-bg-secondary rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">
                  <CreditCard size={12} /> Bank Details
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <div className="text-[8px] text-text-muted uppercase font-black">Bank Name</div>
                    <div className="font-black text-text-primary uppercase mt-0.5">{selectedRefund.bankName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-text-muted uppercase font-black">Account Holder</div>
                    <div className="font-black text-text-primary uppercase mt-0.5">{selectedRefund.accHolder || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-text-muted uppercase font-black">Account No.</div>
                    <div className="font-black text-text-primary mt-0.5 tracking-widest">{selectedRefund.accNum || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-text-muted uppercase font-black">IFSC Code</div>
                    <div className="font-black text-text-primary mt-0.5 tracking-widest">{selectedRefund.ifsc || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-text-muted uppercase font-black">Branch</div>
                    <div className="font-black text-text-primary uppercase mt-0.5">{selectedRefund.branch || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-text-muted uppercase font-black">Account Type</div>
                    <div className="font-black text-text-primary uppercase mt-0.5">{selectedRefund.accType || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {selectedRefund.summary && (
                <div className="bg-bg-secondary rounded-xl p-4">
                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Summary / Reason</div>
                  <div className="text-[11px] font-bold text-text-primary">{selectedRefund.summary}</div>
                </div>
              )}

              {/* Document */}
              {selectedRefund.documentLink && (
                <a
                  href={selectedRefund.documentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-accent/10 hover:bg-accent text-accent hover:text-white border-2 border-accent/20 hover:border-accent rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  <Eye size={14} /> View Supporting Document
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminDashTab;
