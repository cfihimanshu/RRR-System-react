import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  BarChart,
  RefreshCw,
  Download,
  AlertTriangle,
  Clock,
  TrendingUp,
  Coins,
  CheckCircle2,
  Calendar,
  User,
  Search,
  ChevronRight,
  Briefcase,
  Edit2,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';

const MisReportTab = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [editingTargetId, setEditingTargetId] = useState(null);
  const [newTargetValue, setNewTargetValue] = useState('');
  const [submittingTarget, setSubmittingTarget] = useState(false);
  const [editingTargetType, setEditingTargetType] = useState('');

  // Search/filter states for tables
  const [activeCasesSearch, setActiveCasesSearch] = useState('');
  const [todayCasesSearch, setTodayCasesSearch] = useState('');

  // Date and month filters
  const [filterType, setFilterType] = useState('all'); // 'all', 'current-month', 'last-month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      let url = '/reports/mis';
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load MIS Report data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (filterType === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (filterType === 'current-month') {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      
      const formatLocal = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      
      setStartDate(formatLocal(start));
      setEndDate(formatLocal(end));
    } else if (filterType === 'last-month') {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      
      const formatLocal = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      
      setStartDate(formatLocal(start));
      setEndDate(formatLocal(end));
    }
  }, [filterType]);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const canViewAllSpecialists = ['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role);
  const isPersonalScope = data?.scope === 'personal';

  const visibleAssigneePerformance = useMemo(() => {
    if (!data) return [];
    if (canViewAllSpecialists) return data.assigneePerformance;
    const userFullName = (user?.fullName || '').trim().toLowerCase();
    const userEmail = (user?.email || '').trim().toLowerCase();
    return data.assigneePerformance.filter(p =>
      (p.name || '').trim().toLowerCase() === userFullName ||
      (p.email || '').trim().toLowerCase() === userEmail
    );
  }, [data, user, canViewAllSpecialists]);

  useEffect(() => {
    if (activeTabIdx >= visibleAssigneePerformance.length) {
      setActiveTabIdx(0);
    }
  }, [visibleAssigneePerformance, activeTabIdx]);

  const currentSpecialist = visibleAssigneePerformance[activeTabIdx] || null;

  const handleUpdateTarget = async (userId, currentTarget, type = 'monthly') => {
    if (editingTargetId === userId && editingTargetType === type) {
      // Save
      const numVal = parseInt(newTargetValue, 10);
      if (isNaN(numVal) || numVal < 0) {
        toast.error('Please enter a valid target amount');
        return;
      }
      const targetToSave = type === 'daily' ? numVal * 30 : numVal;
      try {
        setSubmittingTarget(true);
        await api.put(`/users/${userId}/target`, { monthlyTarget: targetToSave });
        toast.success(`${type === 'daily' ? 'Daily' : 'Monthly'} target updated successfully`);
        setEditingTargetId(null);
        setEditingTargetType('');
        fetchData(true);
      } catch (err) {
        console.error(err);
        toast.error('Failed to update target');
      } finally {
        setSubmittingTarget(false);
      }
    } else {
      // Enter edit mode
      setEditingTargetId(userId);
      setEditingTargetType(type);
      const initialVal = type === 'daily' ? Math.round(currentTarget / 30) : currentTarget;
      setNewTargetValue(initialVal.toString());
    }
  };

  const handleExportExcel = () => {
    if (!data) return;

    try {
      const workbook = XLSX.utils.book_new();

      // 1. Assignee Performance Sheet
      const perfHeaders = [
        'Specialist Name', 'Role', 'Monthly Target', 'Amount Saved/Resolved', 
        'Target Met %', 'Total Cases', 'Total Case Amount', 
        'Pending Cases', 'Pending Amount', 'Resolved Cases', 
        'Assigned Today', 'Assigned Today Amount', 'Resolved Today', 'Resolved Today Amount'
      ];
      const perfData = visibleAssigneePerformance.map(p => ({
        'Specialist Name': p.name || '',
        'Role': p.role || '',
        'Monthly Target': p.target || 0,
        'Amount Saved/Resolved': p.saved || 0,
        'Target Met %': p.target ? Math.round((p.saved / p.target) * 100) : 0,
        'Total Cases': p.totalCases || 0,
        'Total Case Amount': p.totalAmt || 0,
        'Pending Cases': p.pendingCases || 0,
        'Pending Amount': p.pendingAmt || 0,
        'Resolved Cases': p.resolvedCases || 0,
        'Assigned Today': p.todayCases || 0,
        'Assigned Today Amount': p.todayAmt || 0,
        'Resolved Today': p.resolvedToday || 0,
        'Resolved Today Amount': p.resolvedTodayAmt || 0
      }));
      const perfSheet = XLSX.utils.json_to_sheet(perfData);
      XLSX.utils.book_append_sheet(workbook, perfSheet, 'Specialist Performance');

      // 2. Active Cases Sheet
      const activeData = data.activeCases.map(c => ({
        'Assignee': c.assignee || '',
        'Case ID': c.caseId || '',
        'Company Name': c.companyName || '',
        'Due Date': c.dueDate || '',
        'Amount (INR)': c.totalAmtPaid || 0,
        'Status': c.currentStatus || ''
      }));
      const activeSheet = XLSX.utils.json_to_sheet(activeData);
      XLSX.utils.book_append_sheet(workbook, activeSheet, 'Active Cases');

      // 3. Today's Cases Sheet
      const todayData = data.todayCases.map(c => ({
        'Assignee': c.assignee || '',
        'Case ID': c.caseId || '',
        'Company Name': c.companyName || '',
        'Amount (INR)': c.totalAmtPaid || 0,
        'Priority': c.priority || '',
        'Status': c.currentStatus || ''
      }));
      const todaySheet = XLSX.utils.json_to_sheet(todayData);
      XLSX.utils.book_append_sheet(workbook, todaySheet, "Today's Assignments");

      XLSX.writeFile(workbook, `Escalation_MIS_Report_${data.reportDate}.xlsx`);
      toast.success('Excel Report exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel report');
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const formatLargeCurrency = (amt) => {
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
    return formatCurrency(amt);
  };

  // Filter lists based on search
  const filteredActiveCases = useMemo(() => {
    if (!data) return [];
    return data.activeCases.filter(c => 
      c.assignee.toLowerCase().includes(activeCasesSearch.toLowerCase()) ||
      c.caseId.toLowerCase().includes(activeCasesSearch.toLowerCase()) ||
      c.companyName.toLowerCase().includes(activeCasesSearch.toLowerCase())
    );
  }, [data, activeCasesSearch]);

  const filteredTodayCases = useMemo(() => {
    if (!data) return [];
    let cases = data.todayCases;
    
    if (currentSpecialist) {
      const specName = (currentSpecialist.name || '').trim().toLowerCase();
      const specEmail = (currentSpecialist.email || '').trim().toLowerCase();
      
      cases = cases.filter(c => {
        const assVal = (c.assignee || '').trim().toLowerCase();
        if (!assVal) return false;
        
        // Match name
        if (specName) {
          const cleanSpecName = specName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nameRegex = new RegExp(`^(${cleanSpecName})`, 'i');
          if (nameRegex.test(assVal)) return true;
          
          // Reverse match: if case assignee name matches start of specialist name
          const cleanAssVal = assVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const assRegex = new RegExp(`^(${cleanAssVal})`, 'i');
          if (assRegex.test(specName)) return true;
        }
        
        // Match email
        if (specEmail) {
          const cleanSpecEmail = specEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const emailRegex = new RegExp(`^(${cleanSpecEmail})`, 'i');
          if (emailRegex.test(assVal)) return true;
        }
        
        return false;
      });
    }

    return cases.filter(c => 
      c.assignee.toLowerCase().includes(todayCasesSearch.toLowerCase()) ||
      c.caseId.toLowerCase().includes(todayCasesSearch.toLowerCase()) ||
      c.companyName.toLowerCase().includes(todayCasesSearch.toLowerCase())
    );
  }, [data, todayCasesSearch, currentSpecialist]);

  // Status badging styles
  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('settl') || s.includes('clos') || s.includes('done') || s.includes('complet') || s.includes('resol')) {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Resolved</span>;
    }
    if (s.includes('critic') || s.includes('high')) {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-red/10 text-red rounded-full border border-red/20">Critical</span>;
    }
    if (s.includes('pend') || s.includes('progress') || s.includes('wait')) {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-yellow/10 text-yellow rounded-full border border-yellow/20">Pending</span>;
    }
    return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">Open</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase().trim();
    if (p === 'critical' || p === 'high') {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-red/10 text-red rounded-full">High</span>;
    }
    if (p === 'medium') {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-yellow/10 text-yellow rounded-full">Medium</span>;
    }
    return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 rounded-full">Low</span>;
  };

  // Custom Avatar colors helper
  const getAvatarStyle = (name) => {
    const colors = [
      { bg: 'bg-[#2A2455]', text: 'text-[#9B8FE8]' },
      { bg: 'bg-[#0E2A20]', text: 'text-[#4ACE8A]' },
      { bg: 'bg-[#2E1A12]', text: 'text-[#E89060]' },
      { bg: 'bg-[#2A1E08]', text: 'text-[#E8C060]' }
    ];
    const index = (name || '').charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <RefreshCw className="animate-spin text-accent mb-4" size={36} />
        <p className="text-sm text-text-muted font-black uppercase tracking-widest">Compiling MIS Report...</p>
      </div>
    );
  }

  if (!data) return null;

  // Active tab specialist data
  const targetMetPct = currentSpecialist && currentSpecialist.target
    ? Math.min(100, Math.round((currentSpecialist.saved / currentSpecialist.target) * 100))
    : 0;
  const targetLeft = currentSpecialist
    ? Math.max(0, currentSpecialist.target - currentSpecialist.saved)
    : 0;
  const barColor = targetMetPct >= 80 ? 'bg-[#4ACE8A]' : targetMetPct >= 50 ? 'bg-[#E8A84A]' : 'bg-[#E85B5B]';
  const textColor = targetMetPct >= 80 ? 'text-[#4ACE8A]' : targetMetPct >= 50 ? 'text-[#E8A84A]' : 'text-[#E85B5B]';

  return (
    <div className="flex flex-col bg-bg-primary min-h-screen">
      {/* HEADER SECTION */}
      <div className="bg-bg-secondary border-b border-border px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent-soft rounded-2xl text-accent shrink-0">
            <BarChart size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
              Escalation MIS Report
            </h1>
            <p className="text-[10px] md:text-xs text-text-muted font-black uppercase tracking-widest mt-1">
              Monthly Performance &amp; Case Tracker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-black text-text-primary">
              {new Date(data.reportDate).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
              Auto-Refreshed Live
            </div>
          </div>
          
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-3 bg-bg-card hover:bg-bg-card-hover border-2 border-border text-text-secondary rounded-xl transition-all shadow-sm active:scale-95"
            title="Refresh Report Data"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-accent' : ''} />
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
          >
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-bg-card border-b border-border px-6 md:px-8 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-accent animate-pulse" />
          <span className="text-xs font-black text-text-primary uppercase tracking-wider">Report Period:</span>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-bg-input border-2 border-border rounded-xl px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent font-medium transition-all cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="current-month">Current Month</option>
            <option value="last-month">Last Month</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {filterType === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-bg-input border-2 border-border rounded-xl px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent font-medium transition-all"
              />
              <span className="text-xs text-text-muted font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-bg-input border-2 border-border rounded-xl px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent font-medium transition-all"
              />
            </div>
          )}

          {(filterType === 'current-month' || filterType === 'last-month') && startDate && endDate && (
            <div className="text-xs text-text-muted font-bold bg-bg-input px-3 py-1.5 rounded-xl border border-border">
              Period: {new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Active Cases */}
          <div onClick={() => navigate('/case-master', { state: { misFilter: 'active' } })} className="bg-bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-blue-400/30 transition-all cursor-pointer">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[100px] flex items-center justify-center">
              <Clock size={20} className="text-blue-400/20 translate-x-2 -translate-y-2 group-hover:scale-110 transition-all" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Active Cases</span>
            <div className="text-3xl font-black text-blue-400 mt-2">{data.metrics.totalActiveCases}</div>
            <div className="text-xs font-black text-blue-400/70 mt-1">{formatLargeCurrency(data.metrics.totalActiveCasesAmount || data.metrics.totalAmountAtRisk)}</div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide mt-1">
              {isPersonalScope ? 'Your assigned cases' : 'Across all specialists'}
            </div>
          </div>

          {/* Card 2: Pending/Overdue */}
          <div onClick={() => navigate('/case-master', { state: { misFilter: 'overdue' } })} className="bg-bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-yellow-400/30 transition-all cursor-pointer">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-[100px] flex items-center justify-center">
              <AlertTriangle size={20} className="text-yellow-400/20 translate-x-2 -translate-y-2 group-hover:scale-110 transition-all" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Pending / Overdue</span>
            <div className="text-3xl font-black text-yellow-400 mt-2">{data.metrics.pendingOverdueCases}</div>
            <div className="text-xs font-black text-yellow-400/70 mt-1">{formatLargeCurrency(data.metrics.pendingOverdueCasesAmount || 0)}</div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide mt-1">Attention Required</div>
          </div>

          {/* Card 3: Total Amount at Risk */}
          <div className="bg-bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red/5 rounded-bl-[100px] flex items-center justify-center">
              <Coins size={20} className="text-red/20 translate-x-2 -translate-y-2 group-hover:scale-110 transition-all" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Amount at Risk</span>
            <div className="text-3xl font-black text-red mt-2">{formatLargeCurrency(data.metrics.totalAmountAtRisk)}</div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide mt-2">Linked to Active Cases</div>
          </div>

          {/* Card 4: Cases Assigned Today */}
          <div onClick={() => navigate('/case-master', { state: { misFilter: 'today' } })} className="bg-bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-green-400/30 transition-all cursor-pointer">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-[100px] flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-400/20 translate-x-2 -translate-y-2 group-hover:scale-110 transition-all" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Assigned Today</span>
            <div className="text-3xl font-black text-green-400 mt-2">{data.metrics.casesAssignedToday}</div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide mt-2">
              {isPersonalScope ? 'Your cases registered today' : 'Newly registered today'}
            </div>
          </div>
        </div>

        {/* SECTION 4: ASSIGNEE-WISE PERFORMANCE */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-accent rounded-full" />
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Specialist-wise Performance Matrix</h3>
          </div>

          {/* Tabs header — all specialists for Admin/Super Admin only */}
          {visibleAssigneePerformance.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
            {visibleAssigneePerformance.map((spec, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveTabIdx(idx);
                  setEditingTargetId(null);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${
                  activeTabIdx === idx
                    ? 'bg-accent/15 border-accent/30 text-accent font-black'
                    : 'bg-bg-card border-border text-text-secondary hover:bg-bg-card-hover'
                }`}
              >
                {spec.name}
              </button>
            ))}
          </div>
          )}

          {/* Active Panel Details */}
          {currentSpecialist && (
            <div className="bg-bg-card border-2 border-border rounded-2xl p-6 space-y-8 animate-in fade-in duration-300">
              {/* Header profile info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border pb-6">
                <div className="flex items-center gap-4">
                  <span className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base ${getAvatarStyle(currentSpecialist.name).bg} ${getAvatarStyle(currentSpecialist.name).text}`}>
                    {(currentSpecialist.name || 'DV').slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h4 className="text-base font-black text-text-primary leading-none">{currentSpecialist.name}</h4>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                      <Briefcase size={12} /> {currentSpecialist.role || 'Escalation Specialist'}
                    </p>
                  </div>
                </div>

                {/* Target Met progress info badge */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Monthly Target progress</span>
                    <div className={`text-lg font-black ${textColor}`}>{targetMetPct}%</div>
                  </div>
                </div>
              </div>

              {/* Stats Box Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-bg-input border border-border rounded-xl p-4">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Total cases</span>
                  <div className="text-lg font-black text-text-primary mt-1">{currentSpecialist.totalCases}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Total amount</span>
                  <div className="text-lg font-black text-text-primary mt-1">{formatCurrency(currentSpecialist.totalAmt)}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4 border-red/10">
                  <span className="text-[9px] font-black text-red uppercase tracking-wider">Pending cases</span>
                  <div className="text-lg font-black text-red mt-1">{currentSpecialist.pendingCases}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4 border-red/10">
                  <span className="text-[9px] font-black text-red uppercase tracking-wider">Pending amount</span>
                  <div className="text-lg font-black text-red mt-1">{formatCurrency(currentSpecialist.pendingAmt)}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4 border-green-500/10">
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-wider">Resolved cases</span>
                  <div className="text-lg font-black text-green-400 mt-1">{currentSpecialist.resolvedCases}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4 border-green-500/10">
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-wider">Amount saved</span>
                  <div className="text-lg font-black text-green-400 mt-1">{formatCurrency(currentSpecialist.resolvedAmt)}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Assigned today</span>
                  <div className="text-lg font-black text-text-primary mt-1">{currentSpecialist.todayCases}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Today's amount</span>
                  <div className="text-lg font-black text-text-primary mt-1">{formatCurrency(currentSpecialist.todayAmt)}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4 border-green-500/10">
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-wider">Resolved today</span>
                  <div className="text-lg font-black text-green-400 mt-1">{currentSpecialist.resolvedToday}</div>
                </div>
                <div className="bg-bg-input border border-border rounded-xl p-4 border-green-500/10">
                  <span className="text-[9px] font-black text-green-400 uppercase tracking-wider">Resolved amt today</span>
                  <div className="text-lg font-black text-green-400 mt-1">{formatCurrency(currentSpecialist.resolvedTodayAmt)}</div>
                </div>
              </div>

              {/* Progress target bar and interactive settings */}
              <div className="bg-bg-secondary/40 border border-border rounded-2xl p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-text-muted uppercase tracking-wider">
                    <span>Performance Target Meter</span>
                    <span className={textColor}>{targetMetPct}% Complete</span>
                  </div>
                  <div className="h-3.5 bg-bg-input rounded-full overflow-hidden border border-border">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${targetMetPct}%` }} />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
                  <div className="flex flex-wrap items-center gap-6">
                    {/* Daily Target */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-text-muted uppercase tracking-wider">Daily Target:</span>
                      {editingTargetId === currentSpecialist.userId && editingTargetType === 'daily' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newTargetValue}
                            onChange={(e) => setNewTargetValue(e.target.value)}
                            className="bg-bg-input border-2 border-accent rounded-xl px-3 py-1 text-xs font-black text-text-primary outline-none w-32"
                            disabled={submittingTarget}
                          />
                          <button
                            onClick={() => handleUpdateTarget(currentSpecialist.userId, currentSpecialist.target, 'daily')}
                            disabled={submittingTarget}
                            className="p-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-text-primary">{formatCurrency(Math.round(currentSpecialist.target / 30))}</span>
                          {['Admin', 'Super Admin', 'SuperAdmin', 'Operations', 'Operation Head'].includes(user?.role) && (
                            <button
                              onClick={() => handleUpdateTarget(currentSpecialist.userId, currentSpecialist.target, 'daily')}
                              className="p-1 text-text-muted hover:text-accent rounded transition-all"
                              title="Edit Daily Target"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Monthly Target */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-text-muted uppercase tracking-wider">Monthly Target:</span>
                      {editingTargetId === currentSpecialist.userId && editingTargetType === 'monthly' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newTargetValue}
                            onChange={(e) => setNewTargetValue(e.target.value)}
                            className="bg-bg-input border-2 border-accent rounded-xl px-3 py-1 text-xs font-black text-text-primary outline-none w-32"
                            disabled={submittingTarget}
                          />
                          <button
                            onClick={() => handleUpdateTarget(currentSpecialist.userId, currentSpecialist.target, 'monthly')}
                            disabled={submittingTarget}
                            className="p-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-text-primary">{formatCurrency(currentSpecialist.target)}</span>
                          {['Admin', 'Super Admin', 'SuperAdmin', 'Operations', 'Operation Head'].includes(user?.role) && (
                            <button
                              onClick={() => handleUpdateTarget(currentSpecialist.userId, currentSpecialist.target, 'monthly')}
                              className="p-1 text-text-muted hover:text-accent rounded transition-all"
                              title="Edit Monthly Target"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-text-muted uppercase tracking-wider">Target Left:</span>
                    <span className={`text-sm font-black ${targetLeft > 0 ? 'text-red' : 'text-green-400'}`}>
                      {targetLeft > 0 ? formatCurrency(targetLeft) : 'Achieved! 🎉'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2 & 3: TABLES GRID */}
        <div className="grid grid-cols-1 gap-8">
          {/* Today's Assigned Cases Table */}
          <div className="bg-bg-card border-2 border-border rounded-2xl p-6 flex flex-col min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-accent rounded-full" />
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Today's Assignments</h3>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search Today's..."
                  value={todayCasesSearch}
                  onChange={(e) => setTodayCasesSearch(e.target.value)}
                  className="bg-bg-input border-2 border-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-text-primary outline-none focus:border-accent w-48 font-medium transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Assignee</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Case ID</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Company</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Amount</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Priority</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTodayCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-text-muted font-black uppercase tracking-widest text-[10px] opacity-40">No cases assigned today</td>
                    </tr>
                  ) : (
                    filteredTodayCases.map((c, idx) => {
                      const avStyle = getAvatarStyle(c.assignee);
                      return (
                        <tr key={idx} className="border-b border-border hover:bg-bg-card-hover transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[9px] ${avStyle.bg} ${avStyle.text}`}>
                                {(c.assignee || 'UN').slice(0, 2).toUpperCase()}
                              </span>
                              <span className="text-xs font-bold text-text-primary">{c.assignee}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono font-bold text-text-secondary">{c.caseId}</td>
                          <td className="px-4 py-3.5 text-xs font-bold text-text-primary max-w-[130px] truncate">{c.companyName}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-black text-text-primary text-right">{formatCurrency(c.totalAmtPaid)}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">{getPriorityBadge(c.priority)}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">{getStatusBadge(c.currentStatus)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MisReportTab;
