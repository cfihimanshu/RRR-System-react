import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
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
  Check,
  X,
  Mail
} from 'lucide-react';
import * as XLSX from 'xlsx';

const MisReportTab = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState(null);
  const [editingTargetId, setEditingTargetId] = useState(null);
  const [newTargetValue, setNewTargetValue] = useState('');
  const [submittingTarget, setSubmittingTarget] = useState(false);
  const [editingTargetType, setEditingTargetType] = useState('');
  const [sendingMail, setSendingMail] = useState(false);

  const handleSendMailReport = async () => {
    setSendingMail(true);
    const loadToast = toast.loading('Sending daily reports to all Admin users...');
    try {
      await api.post('/reports/send-daily-email');
      toast.success('Daily reports successfully sent to all Admins!', { id: loadToast });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to send reports. Please try again.', { id: loadToast });
    } finally {
      setSendingMail(false);
    }
  };

  // Search/filter states for tables
  const [activeCasesSearch, setActiveCasesSearch] = useState('');
  const [todayCasesSearch, setTodayCasesSearch] = useState('');

  // Modal states for specialist cases lookup
  const [selectedMetricLabel, setSelectedMetricLabel] = useState('');
  const [modalCases, setModalCases] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMetricClick = (label, casesList, specName = '') => {
    if (!casesList || casesList.length === 0) {
      toast.error('No cases available for this metric');
      return;
    }
    setSelectedMetricLabel(specName ? `${specName} - ${label}` : `${currentSpecialist?.name || ''} - ${label}`);
    setModalCases(casesList);
    setIsModalOpen(false); // reset/close first to force re-render/animation
    setTimeout(() => {
      setIsModalOpen(true);
    }, 50);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Date and month filters
  const [filterType, setFilterType] = useState('current-month'); // 'current-month', 'last-month', 'custom'
  
  // Calculate initial dates for current-month so they don't start empty
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const end = new Date(year, month + 1, 0);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const requestVersionRef = useRef(0);

  const fetchData = async (silent = false) => {
    if (!startDate || !endDate) return;
    const currentVersion = ++requestVersionRef.current;
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const url = `/reports/mis?startDate=${startDate}&endDate=${endDate}`;
      const res = await api.get(url);
      if (currentVersion === requestVersionRef.current) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      if (currentVersion === requestVersionRef.current) {
        toast.error('Failed to load MIS Report data');
      }
    } finally {
      if (currentVersion === requestVersionRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
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
    fetchData(true);
  }, [startDate, endDate]);

  const canViewAllSpecialists = ['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role);
  const isPersonalScope = data?.scope === 'personal';

  const visibleAssigneePerformance = useMemo(() => {
    if (!data) return [];

    // Filter out Admin, Operation Head, and Accountant roles
    const filteredPerformance = (data.assigneePerformance || []).filter(p => {
      const roleLower = (p.role || '').toLowerCase().trim();
      return !['admin', 'super admin', 'superadmin', 'operation head', 'accountant'].includes(roleLower);
    });

    if (canViewAllSpecialists) return filteredPerformance;
    if (user?.role?.toLowerCase().trim() === 'operation head') {
      return filteredPerformance.filter(p =>
        (p.role || '').toLowerCase().trim() === 'operation review'
      );
    }
    const userFullName = (user?.fullName || '').trim().toLowerCase();
    const userEmail = (user?.email || '').trim().toLowerCase();
    return filteredPerformance.filter(p =>
      (p.name || '').trim().toLowerCase() === userFullName ||
      (p.email || '').trim().toLowerCase() === userEmail
    );
  }, [data, user, canViewAllSpecialists]);

  // Sync selectedSpecialistId when performance data loads/changes
  useEffect(() => {
    if (visibleAssigneePerformance.length > 0) {
      if (selectedSpecialistId === 'all') {
        if (!canViewAllSpecialists) {
          setSelectedSpecialistId(visibleAssigneePerformance[0].userId);
        }
        return;
      }
      if (!selectedSpecialistId || !visibleAssigneePerformance.some(p => p.userId === selectedSpecialistId)) {
        if (canViewAllSpecialists) {
          setSelectedSpecialistId('all');
        } else {
          setSelectedSpecialistId(visibleAssigneePerformance[0].userId);
        }
      }
    } else {
      setSelectedSpecialistId(null);
    }
  }, [visibleAssigneePerformance, selectedSpecialistId, canViewAllSpecialists, user]);

  const currentSpecialist = useMemo(() => {
    if (selectedSpecialistId === 'all') return null;
    if (!selectedSpecialistId) return visibleAssigneePerformance[0] || null;
    return visibleAssigneePerformance.find(p => p.userId === selectedSpecialistId) || visibleAssigneePerformance[0] || null;
  }, [visibleAssigneePerformance, selectedSpecialistId]);

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
    if (!data) {
      toast.error('No report data loaded to export');
      return;
    }

    if (selectedSpecialistId === 'all') {
      try {
        const rows = [
          ['All Specialists Performance Overview'],
          [],
          ['Specialist', 'Role', 'Total Cases', 'Total Amount', 'Pending Cases', 'Pending Amount', 'Resolved Cases', 'Amount Saved', 'Monthly Target']
        ];

        let sumTotalCases = 0;
        let sumTotalAmt = 0;
        let sumPendingCases = 0;
        let sumPendingAmt = 0;
        let sumResolvedCases = 0;
        let sumResolvedAmt = 0;
        let sumTarget = 0;

        visibleAssigneePerformance.forEach(spec => {
          sumTotalCases += (spec.totalCases || 0);
          sumTotalAmt += (spec.totalAmt || 0);
          sumPendingCases += (spec.pendingCases || 0);
          sumPendingAmt += (spec.pendingAmt || 0);
          sumResolvedCases += (spec.resolvedCases || 0);
          sumResolvedAmt += (spec.resolvedAmt || 0);
          sumTarget += (spec.target || 0);

          rows.push([
            spec.name,
            spec.role || '—',
            spec.totalCases || 0,
            spec.totalAmt || 0,
            spec.pendingCases || 0,
            spec.pendingAmt || 0,
            spec.resolvedCases || 0,
            spec.resolvedAmt || 0,
            spec.target || 0
          ]);
        });

        // Add Total Row
        rows.push([
          'Total',
          '',
          sumTotalCases,
          sumTotalAmt,
          sumPendingCases,
          sumPendingAmt,
          sumResolvedCases,
          sumResolvedAmt,
          sumTarget
        ]);

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(rows);

        worksheet['!cols'] = [
          { wch: 22 }, // Specialist
          { wch: 18 }, // Role
          { wch: 12 }, // Total Cases
          { wch: 15 }, // Total Amount
          { wch: 12 }, // Pending Cases
          { wch: 15 }, // Pending Amount
          { wch: 12 }, // Resolved Cases
          { wch: 15 }, // Amount Saved
          { wch: 15 }  // Monthly Target
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'All Specialists Overview');
        XLSX.writeFile(workbook, `MIS_All_Specialists_Report_${startDate || 'start'}_to_${endDate || 'end'}.xlsx`);
        toast.success('Excel Report for All Specialists exported successfully!');
      } catch (err) {
        console.error(err);
        toast.error('Failed to export Excel report');
      }
      return;
    }

    if (!currentSpecialist) {
      toast.error('No specialist data selected to export');
      return;
    }

    try {
      // 1. Determine Date Range
      let start = startDate;
      let end = endDate;

      if (!start || !end) {
        const cases = currentSpecialist.totalCasesList || [];
        if (cases.length > 0) {
          const dates = cases.map(c => {
            const d = c.createdAt || c.updatedAt;
            return d ? new Date(d) : new Date();
          });
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));

          const formatLocal = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          };
          start = formatLocal(minDate);
          end = formatLocal(maxDate);
        } else {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const sDate = new Date(year, month, 1);
          const eDate = new Date(year, month + 1, 0);
          const formatLocal = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          };
          start = formatLocal(sDate);
          end = formatLocal(eDate);
        }
      }

      // Generate date array
      const dateList = [];
      let currentDate = new Date(start);
      let stopDate = new Date(end);

      // Prevent future dates from being included in the export (e.g., capping at today)
      const today = new Date();
      const todayY = today.getFullYear();
      const todayM = String(today.getMonth() + 1).padStart(2, '0');
      const todayD = String(today.getDate()).padStart(2, '0');
      const maxStopDate = new Date(`${todayY}-${todayM}-${todayD}`);
      if (stopDate > maxStopDate) {
        stopDate = maxStopDate;
      }

      while (currentDate <= stopDate) {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        dateList.push(`${y}-${m}-${d}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // 2. Build rows array of arrays (AOA)
      const rows = [
        ['User Name:', currentSpecialist.name],
        ['Role:', currentSpecialist.role || 'Operations'],
        [], // blank row
        ['Date', 'Daily Target', 'Daily Target Achieved', 'Left Target', 'Saved Amount']
      ];

      let totalDailyTarget = 0;
      let totalAchieved = 0;
      let totalLeft = 0;
      let totalSaved = 0;

      dateList.forEach(dateStr => {
        const dailyTargetVal = Math.round((currentSpecialist.target || 0) / 30);

        // Find cases resolved on this date
        const casesResolvedToday = (currentSpecialist.resolvedCasesList || []).filter(c => {
          if (!c.updatedAt) return false;
          const resolvedDateStr = new Date(c.updatedAt).toISOString().split('T')[0];
          return resolvedDateStr === dateStr;
        });

        const savedAmtToday = casesResolvedToday.reduce((sum, c) => sum + (c.savedAmount || 0), 0);
        const leftTargetVal = Math.max(0, dailyTargetVal - savedAmtToday);

        totalDailyTarget += dailyTargetVal;
        totalAchieved += savedAmtToday;
        totalLeft += leftTargetVal;
        totalSaved += savedAmtToday;

        rows.push([
          dateStr,
          dailyTargetVal,
          savedAmtToday,
          leftTargetVal,
          savedAmtToday
        ]);
      });

      // Add totals row
      rows.push([
        'Total',
        totalDailyTarget,
        totalAchieved,
        totalLeft,
        totalSaved
      ]);

      // Add summary metrics section
      const excelTargetMetPct = currentSpecialist && currentSpecialist.target > 0
        ? Math.round((currentSpecialist.saved / currentSpecialist.target) * 100)
        : 0;

      rows.push(
        [], // blank
        ['Summary Metrics'],
        ['Total Cases', currentSpecialist.totalCases || 0],
        ['Resolved Cases', currentSpecialist.resolvedCases || 0],
        ['Total Amount Saved', currentSpecialist.saved || 0],
        ['Total Monthly Target Left', targetLeft],
        ['Target Percentage', `${excelTargetMetPct}%`],
        ['Pending Cases', currentSpecialist.pendingCases || 0],
        ['Pending Amount', currentSpecialist.pendingAmt || 0]
      );

      // Create workbook and write sheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(rows);

      // Adjust column widths for professional display
      worksheet['!cols'] = [
        { wch: 15 }, // Date
        { wch: 15 }, // Daily Target
        { wch: 22 }, // Daily Target Achieved
        { wch: 15 }, // Left Target
        { wch: 18 }  // Saved Amount
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Performance');
      XLSX.writeFile(workbook, `MIS_Daily_Report_${currentSpecialist.name.replace(/\s+/g, '_')}_${start}_to_${end}.xlsx`);
      toast.success(`Excel Report for ${currentSpecialist.name} exported successfully!`);
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
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-black rounded-full border border-green-500/20">Resolved</span>;
    }
    if (s.includes('critic') || s.includes('high')) {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-red/10 text-black rounded-full border border-red/20">Critical</span>;
    }
    if (s.includes('pend') || s.includes('progress') || s.includes('wait')) {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-yellow/10 text-black rounded-full border border-yellow/20">Pending</span>;
    }
    return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-black rounded-full border border-blue-500/20">Open</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase().trim();
    if (p === 'critical' || p === 'high') {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-red/10 text-black rounded-full">High</span>;
    }
    if (p === 'medium') {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-yellow/10 text-black rounded-full">Medium</span>;
    }
    return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-black rounded-full">Low</span>;
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
  const dailyTarget = currentSpecialist && currentSpecialist.target
    ? Math.round(currentSpecialist.target / 30)
    : 0;
  const savedTodayAmt = currentSpecialist ? (currentSpecialist.resolvedTodayAmt || 0) : 0;
  const dailyTargetCompleted = Math.min(dailyTarget, savedTodayAmt);
  const dailyTargetRemaining = Math.max(0, dailyTarget - savedTodayAmt);

  const displayedMonthlyTarget = currentSpecialist
    ? Math.max(0, currentSpecialist.target - dailyTargetCompleted)
    : 0;

  const targetMetPct = currentSpecialist
    ? (displayedMonthlyTarget > 0
      ? Math.min(100, Math.round((currentSpecialist.saved / displayedMonthlyTarget) * 100))
      : (currentSpecialist.saved > 0 || currentSpecialist.target > 0 ? 100 : 0))
    : 0;

  const targetLeft = currentSpecialist
    ? Math.max(0, displayedMonthlyTarget - (currentSpecialist.saved - dailyTargetCompleted))
    : 0;

  const barColor = targetMetPct >= 80 ? 'bg-[#4ACE8A]' : targetMetPct >= 50 ? 'bg-[#E8A84A]' : 'bg-[#E85B5B]';
  const textColor = 'text-black';

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
            <Download size={18} /> Export          </button>

          {['admin', 'super admin', 'superadmin'].includes(user?.role?.toLowerCase()) && (
            <button
              onClick={handleSendMailReport}
              disabled={sendingMail}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
              title="Trigger Daily Email Report to Admins Now"
            >
              <Mail size={18} className={sendingMail ? 'animate-pulse' : ''} />
              {sendingMail ? 'Sending...' : 'Send Mail Report'}
            </button>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-bg-card border-b border-border px-6 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Unified Grouped Filter Control Panel */}
          <div className="flex flex-wrap items-center bg-bg-input border-2 border-border rounded-xl p-1 divide-x divide-border shadow-sm">

            {/* Period Segment */}
            <div className="flex items-center gap-2 px-3 py-1">
              <Calendar size={14} className="text-accent shrink-0" />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Period:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-xs text-text-primary outline-none font-bold cursor-pointer"
              >
                <option value="current-month" className="bg-bg-card">Current Month</option>
                <option value="last-month" className="bg-bg-card">Last Month</option>
                <option value="custom" className="bg-bg-card">Custom Range</option>
              </select>
            </div>

            {/* Custom Dates Inputs */}
            {filterType === 'custom' && (
              <div className="flex items-center gap-2 px-3 py-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-xs text-text-primary outline-none font-medium w-[115px]"
                />
                <span className="text-[10px] text-text-muted font-bold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-xs text-text-primary outline-none font-medium w-[115px]"
                />
              </div>
            )}

            {/* User/Specialist Segment */}
            {visibleAssigneePerformance.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1">
                <User size={14} className="text-accent shrink-0" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">User:</span>
                <select
                  value={selectedSpecialistId || ''}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : (e.target.value ? parseInt(e.target.value, 10) : null);
                    setSelectedSpecialistId(val);
                    setEditingTargetId(null);
                  }}
                  className="bg-transparent text-xs text-text-primary outline-none font-bold cursor-pointer max-w-[160px]"
                >
                  {canViewAllSpecialists && (
                    <option value="all" className="bg-bg-card">All Users</option>
                  )}
                  {visibleAssigneePerformance.map((spec, idx) => (
                    <option key={idx} value={spec.userId} className="bg-bg-card">
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Selected Period Info */}
        {(filterType === 'current-month' || filterType === 'last-month') && startDate && endDate && (
          <div className="text-[10px] text-text-muted font-black uppercase tracking-wider bg-bg-input px-3 py-1.5 rounded-xl border border-border shadow-sm">
            Active Period: {new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* METRICS ROW */}
      <div className="p-6 md:p-8 space-y-8">
        {canViewAllSpecialists && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Total Active Cases */}
            <div onClick={() => navigate('/case-master', { state: { misFilter: 'active' } })} className="bg-bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-blue-400/30 transition-all cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[100px] flex items-center justify-center">
                <Clock size={20} className="text-blue-400/20 translate-x-2 -translate-y-2 group-hover:scale-110 transition-all" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Active Cases</span>
              <div className="text-3xl font-black text-black mt-2">{data.metrics.totalActiveCases}</div>
              <div className="text-xs font-black text-black/75 mt-1">{formatLargeCurrency(data.metrics.totalActiveCasesAmount || data.metrics.totalAmountAtRisk)}</div>
              <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide mt-1">
                {isPersonalScope ? 'Your assigned cases' : 'ALL Cases'}
              </div>
            </div>

            {/* Card 2: Pending/Overdue */}
            <div onClick={() => navigate('/case-master', { state: { misFilter: 'overdue' } })} className="bg-bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-yellow-400/30 transition-all cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-[100px] flex items-center justify-center">
                <AlertTriangle size={20} className="text-yellow-400/20 translate-x-2 -translate-y-2 group-hover:scale-110 transition-all" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Pending / Overdue</span>
              <div className="text-3xl font-black text-black mt-2">{data.metrics.pendingOverdueCases}</div>
              <div className="text-xs font-black text-black/75 mt-1">{formatLargeCurrency(data.metrics.pendingOverdueCasesAmount || 0)}</div>
              <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide mt-1">Attention Required</div>
            </div>

            {/* Card 3: Total Amount at Risk */}
            <div className="bg-bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red/5 rounded-bl-[100px] flex items-center justify-center">
                <Coins size={20} className="text-red/20 translate-x-2 -translate-y-2 group-hover:scale-110 transition-all" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Amount at Risk</span>
              <div className="text-3xl font-black text-black mt-2">{formatLargeCurrency(data.metrics.totalAmountAtRisk)}</div>
              <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide mt-2">Linked to Active Cases</div>
            </div>

            {/* Card 4: Cases Assigned Today */}
            <div onClick={() => navigate('/case-master', { state: { misFilter: 'today' } })} className="bg-bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md hover:border-green-400/30 transition-all cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-[100px] flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-400/20 translate-x-2 -translate-y-2 group-hover:scale-110 transition-all" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Assigned Today</span>
              <div className="text-3xl font-black text-black mt-2">{data.metrics.casesAssignedToday}</div>
              <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide mt-2">
                {isPersonalScope ? 'Your cases registered today' : 'Newly registered today'}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ASSIGNEE-WISE PERFORMANCE */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-accent rounded-full" />
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Specialist-wise Performance Matrix</h3>
          </div>



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
                <div
                  onClick={() => handleMetricClick('Total Cases', currentSpecialist.totalCasesList)}
                  className="bg-bg-input border border-border rounded-xl p-4 cursor-pointer hover:bg-bg-card-hover hover:border-accent/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Total cases</span>
                  <div className="text-lg font-black text-text-primary mt-1">{currentSpecialist.totalCases}</div>
                </div>
                <div
                  onClick={() => handleMetricClick('Total Amount', currentSpecialist.totalCasesList)}
                  className="bg-bg-input border border-border rounded-xl p-4 cursor-pointer hover:bg-bg-card-hover hover:border-accent/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Total amount</span>
                  <div className="text-lg font-black text-text-primary mt-1">{formatCurrency(currentSpecialist.totalAmt)}</div>
                </div>
                <div
                  onClick={() => handleMetricClick('Pending Cases', currentSpecialist.pendingCasesList)}
                  className="bg-bg-input border border-border rounded-xl p-4 border-red/10 cursor-pointer hover:bg-bg-card-hover hover:border-red/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-black uppercase tracking-wider">Pending cases</span>
                  <div className="text-lg font-black text-black mt-1">{currentSpecialist.pendingCases}</div>
                </div>
                <div
                  onClick={() => handleMetricClick('Pending Amount', currentSpecialist.pendingCasesList)}
                  className="bg-bg-input border border-border rounded-xl p-4 border-red/10 cursor-pointer hover:bg-bg-card-hover hover:border-red/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-black uppercase tracking-wider">Pending amount</span>
                  <div className="text-lg font-black text-black mt-1">{formatCurrency(currentSpecialist.pendingAmt)}</div>
                </div>
                <div
                  onClick={() => handleMetricClick('Resolved Cases', currentSpecialist.resolvedCasesList)}
                  className="bg-bg-input border border-border rounded-xl p-4 border-green-500/10 cursor-pointer hover:bg-bg-card-hover hover:border-green-500/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-black uppercase tracking-wider">Resolved cases</span>
                  <div className="text-lg font-black text-black mt-1">{currentSpecialist.resolvedCases}</div>
                </div>
                <div
                  onClick={() => handleMetricClick('Amount Saved', (currentSpecialist.resolvedCasesList || []).filter(c => (c.savedAmount || 0) > 0))}
                  className="bg-bg-input border border-border rounded-xl p-4 border-green-500/10 cursor-pointer hover:bg-bg-card-hover hover:border-green-500/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-black uppercase tracking-wider">Amount saved</span>
                  <div className="text-lg font-black text-black mt-1">{formatCurrency(currentSpecialist.resolvedAmt)}</div>
                </div>
                <div
                  onClick={() => handleMetricClick('Assigned Today', currentSpecialist.todayCasesList)}
                  className="bg-bg-input border border-border rounded-xl p-4 cursor-pointer hover:bg-bg-card-hover hover:border-accent/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Assigned today</span>
                  <div className="text-lg font-black text-text-primary mt-1">{currentSpecialist.todayCases}</div>
                </div>
                <div
                  onClick={() => handleMetricClick("Today's Amount", currentSpecialist.todayCasesList)}
                  className="bg-bg-input border border-border rounded-xl p-4 cursor-pointer hover:bg-bg-card-hover hover:border-accent/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Today's amount</span>
                  <div className="text-lg font-black text-text-primary mt-1">{formatCurrency(currentSpecialist.todayAmt)}</div>
                </div>
                <div
                  onClick={() => handleMetricClick('Resolved Today', currentSpecialist.resolvedTodayList)}
                  className="bg-bg-input border border-border rounded-xl p-4 border-green-500/10 cursor-pointer hover:bg-bg-card-hover hover:border-green-500/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-black uppercase tracking-wider">Resolved today</span>
                  <div className="text-lg font-black text-black mt-1">{currentSpecialist.resolvedToday}</div>
                </div>
                <div
                  onClick={() => handleMetricClick('Resolved Amt Today', (currentSpecialist.resolvedTodayList || []).filter(c => (c.savedAmount || 0) > 0))}
                  className="bg-bg-input border border-border rounded-xl p-4 border-green-500/10 cursor-pointer hover:bg-bg-card-hover hover:border-green-500/40 active:scale-95 transition-all duration-200"
                >
                  <span className="text-[9px] font-black text-black uppercase tracking-wider">Resolved amt today</span>
                  <div className="text-lg font-black text-black mt-1">{formatCurrency(currentSpecialist.resolvedTodayAmt)}</div>
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
                          <span className="text-sm font-black text-text-primary">{formatCurrency(dailyTargetRemaining)}</span>
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
                          <span className="text-sm font-black text-text-primary">{formatCurrency(displayedMonthlyTarget)}</span>
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
                    <span className="text-sm font-black text-black">
                      {targetLeft > 0 ? formatCurrency(targetLeft) : 'Achieved! 🎉'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedSpecialistId === 'all' && (
            <div className="bg-bg-card border-2 border-border rounded-2xl p-6 space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h4 className="text-base font-black text-text-primary uppercase tracking-wider">All Specialists Performance Overview</h4>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider bg-bg-input px-3 py-1 rounded-xl border border-border">
                  Count: {visibleAssigneePerformance.length} Users
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg-secondary border-b border-border text-[9px] font-black uppercase tracking-widest text-text-muted">
                      <th className="px-4 py-3">Specialist</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-center">Total Cases</th>
                      <th className="px-4 py-3 text-right">Total Amt</th>
                      <th className="px-4 py-3 text-center">Pending Cases</th>
                      <th className="px-4 py-3 text-right">Pending Amt</th>
                      <th className="px-4 py-3 text-center">Resolved Cases</th>
                      <th className="px-4 py-3 text-right">Amt Saved</th>
                      <th className="px-4 py-3 text-right">Monthly Target</th>
                      <th className="px-4 py-3 text-center">Target Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAssigneePerformance.map((spec, idx) => {
                      const avStyle = getAvatarStyle(spec.name);
                      const targetMetPct = spec.target > 0 ? Math.round((spec.saved / spec.target) * 100) : 0;
                      return (
                        <tr key={idx} className="border-b border-border hover:bg-bg-card-hover transition-colors text-xs font-bold text-text-primary">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[9px] ${avStyle.bg} ${avStyle.text}`}>
                                {(spec.name || 'UN').slice(0, 2).toUpperCase()}
                              </span>
                              <span className="font-bold text-text-primary">{spec.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-text-muted text-[10px] uppercase font-bold">{spec.role || '—'}</td>

                          <td
                            onClick={() => handleMetricClick('Total Cases', spec.totalCasesList, spec.name)}
                            className="px-4 py-3.5 text-center cursor-pointer hover:underline text-black font-black"
                          >
                            {spec.totalCases}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black">{formatCurrency(spec.totalAmt)}</td>

                          <td
                            onClick={() => handleMetricClick('Pending Cases', spec.pendingCasesList, spec.name)}
                            className="px-4 py-3.5 text-center cursor-pointer hover:underline text-black font-black"
                          >
                            {spec.pendingCases}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black">{formatCurrency(spec.pendingAmt)}</td>

                          <td
                            onClick={() => handleMetricClick('Resolved Cases', spec.resolvedCasesList, spec.name)}
                            className="px-4 py-3.5 text-center cursor-pointer hover:underline text-black font-black"
                          >
                            {spec.resolvedCases}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black">{formatCurrency(spec.resolvedAmt)}</td>

                          <td className="px-4 py-3.5 text-right font-black">{formatCurrency(spec.target || 0)}</td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-border rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-accent h-full rounded-full"
                                  style={{ width: `${Math.min(100, targetMetPct)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-black text-black">{targetMetPct}%</span>
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
      {/* Metric Cases Modal Popup */}
      {isModalOpen && (
        <div
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="bg-bg-card border-2 border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                {selectedMetricLabel}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-bg-input rounded-xl text-text-muted hover:text-text-primary transition-all active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border">
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Case ID</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Company</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Amount</th>
                    {(selectedMetricLabel.toLowerCase().includes('saved') || selectedMetricLabel.toLowerCase().includes('resolved amt')) && (
                      <>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right text-black">Refunded Amt</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right text-black">Saved Amt</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Priority</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {modalCases.map((c, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-bg-card-hover transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono font-bold text-text-secondary">{c.caseId}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-text-primary max-w-[200px] truncate">{c.companyName}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-black text-text-primary text-right">{formatCurrency(c.totalAmtPaid)}</td>
                      {(selectedMetricLabel.toLowerCase().includes('saved') || selectedMetricLabel.toLowerCase().includes('resolved amt')) && (
                        <>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-black text-black text-right">{formatCurrency(c.refundedAmount || 0)}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs font-black text-black text-right">{formatCurrency(c.savedAmount)}</td>
                        </>
                      )}
                      <td className="px-4 py-3.5 whitespace-nowrap">{getPriorityBadge(c.priority)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{getStatusBadge(c.currentStatus)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-text-muted">{c.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-3.5 border-t border-border bg-bg-secondary">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-bg-input border-2 border-border hover:bg-bg-card-hover px-4 py-2 rounded-xl text-xs font-bold text-text-primary transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisReportTab;
