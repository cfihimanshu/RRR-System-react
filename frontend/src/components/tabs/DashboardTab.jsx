import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { Badge } from '../shared/Badge';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import MultiSearchableSelect from '../shared/MultiSearchableSelect';
import {
  AlertCircle,
  AlertTriangle,
  IndianRupee,
  CheckCircle,
  Clock,
  Calendar,
  Folder,
  FileText,
  Users,
  Send,
  Receipt,
  ClipboardList,
  History,
  Edit3,
  Check,
  X,
  LayoutDashboard,
  Timer,
  Target,
  Zap,
  TrendingUp,
  BarChart,
  LogOut,
  Plus,
  ChevronDown,
  Search,
  ArrowRight,
  ChevronRight,
  Trash2,
  FolderOpen,
  ListChecks,
  Eye,
  Filter,
  Scale,
  Gavel,
  ShieldAlert,
  ShieldCheck,
  Hammer,
  FolderPlus,
  FileUp,
  PhoneOutgoing,
  Activity,
  Mail,
  PhoneIncoming,
  Building2,
  Phone,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const CHART_COLORS = [
  '#FF4D4D', // Red
  '#F97316', // Orange
  '#FACC15', // Yellow
  '#A855F7', // Purple
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

const DashboardTab = () => {
  const [stats, setStats] = useState(null);
  const [myRefunds, setMyRefunds] = useState([]);
  const [userCases, setUserCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [editingRefund, setEditingRefund] = useState(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [teamFilter, setTeamFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePeriod, setActivePeriod] = useState('7 Days');
  const [allUsers, setAllUsers] = useState([]);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('openSod') === 'true') {
      setIsReportModalOpen(true);
      setReportType('SOD');
    }
  }, [location.search]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 16) return 'Good Afternoon';
    return 'Good evening';
  };

  // Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('SOD');
  const [viewingReport, setViewingReport] = useState(null);
  const [myTodayTasks, setMyTodayTasks] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [reportFormData, setReportFormData] = useState({
    plannedTasks: '',
    checkInTime: '',
    checkOutTime: '',
    workDuration: '',
    completionStatus: 'Fully Completed',
    workSummary: '',
    progressScore: '',
    moodEnergy: '',
    challenges: '',
    sodCaseId: '',
    sodTaskTitle: '',
    sodCaseIds: [],
    sodTaskIds: [],
    eodCompletedTaskIds: [],
    sodTasks: [{ type: 'Case ID', caseId: '', task: '', mode: '' }] // Updated type and empty mode
  });

  const [expandedTaskIds, setExpandedTaskIds] = useState([]);
  const [isViolationsModalOpen, setIsViolationsModalOpen] = useState(false);
  const [violationType, setViolationType] = useState('SOD');

  const openViolationsModal = (type) => {
    setViolationType(type);
    setIsViolationsModalOpen(true);
  };

  const toggleTaskExpansion = (taskId) => {
    setExpandedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const fetchUserCases = async () => {
    try {
      const res = await api.get('/cases');
      setUserCases(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyTodayTasks = async () => {
    try {
      const res = await api.get('/tasks');
      // Fetch ALL pending tasks (To Do or In Progress) for the user
      const pending = res.data.filter(t => t.status !== 'Completed' && t.status !== 'Done');
      setMyTodayTasks(pending);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateDuration = (startTimeStr) => {
    try {
      if (!startTimeStr) return 'N/A';

      const now = new Date();
      const [time, modifier] = startTimeStr.split(' ');
      let [hours, minutes] = time.split(':');

      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;

      const startDate = new Date();
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

      const diffMs = now - startDate;
      if (diffMs < 0) return '0h 0m'; // Handles cases if SOD was logged for a future time

      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);

      return `${diffHrs}h ${diffMins}m`;
    } catch (e) {
      return 'Calculating...';
    }
  };

  const [hasSodToday, setHasSodToday] = useState(false);

  const checkSodStatus = async () => {
    if (user?.role === 'Admin') return;
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const res = await api.get('/reports');

      // Filter reports: must be SOD, today's date, and current user's email
      const todaysSod = res.data.find(r =>
        r.type === 'SOD' &&
        r.date === today &&
        r.userEmail?.trim().toLowerCase() === user?.email?.trim().toLowerCase()
      );

      setHasSodToday(!!todaysSod);

      // Auto-open SOD modal only if not filled today and user is NOT Admin
      if (!todaysSod && user?.role !== 'Admin') {
        setTimeout(() => {
          openReportModal('SOD');
        }, 800);
      }
    } catch (err) {
      console.error('Error checking SOD status:', err);
      setHasSodToday(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const [tlRes, reportsRes] = await Promise.allSettled([
        api.get('/timeline'),
        api.get('/reports')
      ]);

      const tlData = tlRes.status === 'fulfilled' ? tlRes.value.data : [];
      const reportsData = reportsRes.status === 'fulfilled' ? reportsRes.value.data : [];

      const tlActivities = (Array.isArray(tlData) ? tlData : [])
        .filter(item => {
          if (user?.role === 'Admin') return true;
          const myNames = [user?.fullName, user?.email].filter(Boolean).map(n => n.toLowerCase().trim());
          const source = (item.source || '').toLowerCase().trim();
          return myNames.includes(source);
        })
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
        .filter(item => {
          if (user?.role === 'Admin') return true;
          const myEmail = user?.email?.toLowerCase().trim();
          const myName = user?.fullName?.toLowerCase().trim();
          const itemEmail = (item.userEmail || '').toLowerCase().trim();
          const itemName = (item.userName || '').toLowerCase().trim();
          return itemEmail === myEmail || itemName === myName;
        })
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
    if (user?.email) {
      checkSodStatus();
      fetchActivities();
    }
  }, [user?.email]);

  const openReportModal = async (type) => {
    if (type === 'EOD' && user?.role !== 'Admin' && !hasSodToday) {
      toast.error('Please fill your SOD report first for today!', {
        icon: '⚠️',
        style: { borderRadius: '15px', fontWeight: 'bold' }
      });
      return;
    }
    setReportType(type);
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    if (type === 'SOD') {
      setReportFormData(prev => ({
        ...prev,
        checkInTime: nowStr,
        userName: user?.fullName
      }));
      fetchMyTodayTasks();
    } else {
      // Logic to find SOD check-in time for duration calculation
      let duration = 'Calculating...';
      try {
        const res = await api.get('/reports/stats'); // We can use the stats or a dedicated history call
        const today = new Date().toISOString().split('T')[0];
        const mySod = res.data.history.find(r => r.type === 'SOD' && r.email === user.email && new Date(r.createdAt).toISOString().split('T')[0] === today);

        const sodTime = mySod?.checkInTime || '09:00 AM'; // Fallback if SOD not found
        const duration = calculateDuration(sodTime);

        setReportFormData(prev => ({
          ...prev,
          checkOutTime: nowStr,
          workDuration: duration,
          workSummary: '',
          challenges: '',
          eodCompletedTaskIds: []
        }));
        fetchMyTodayTasks(); // Fetch tasks for EOD too
      } catch (err) {
        setReportFormData(prev => ({ ...prev, checkOutTime: nowStr }));
        fetchMyTodayTasks();
      }
    }
    setIsReportModalOpen(true);
  };

  const addSodTaskRow = () => {
    setReportFormData(prev => ({
      ...prev,
      sodTasks: [...(prev.sodTasks || []), { type: 'Case ID', caseId: '', task: '', mode: '' }]
    }));
  };

  const removeSodTaskRow = (index) => {
    setReportFormData(prev => ({
      ...prev,
      sodTasks: prev.sodTasks.filter((_, i) => i !== index)
    }));
  };

  const updateSodTaskRow = (index, field, value) => {
    setReportFormData(prev => {
      const updatedTasks = [...prev.sodTasks];
      updatedTasks[index] = { ...updatedTasks[index], [field]: value };
      return { ...prev, sodTasks: updatedTasks };
    });
  };

  const toggleEodTask = (taskId) => {
    setReportFormData(prev => {
      const current = prev.eodCompletedTaskIds || [];
      const updated = current.includes(taskId)
        ? current.filter(id => id !== taskId)
        : [...current, taskId];
      return { ...prev, eodCompletedTaskIds: updated };
    });
  };

  const addInstallment = () => {
    setInstallments([...installments, { amount: '', dueDate: '' }]);
  };

  const removeInstallment = (index) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleInstallmentChange = (index, field, value) => {
    const newInstallments = [...installments];
    newInstallments[index][field] = value;
    setInstallments(newInstallments);
  };

  useEffect(() => {
    if (editingRefund) {
      setTotalAmount(editingRefund.amount || '');
      setInstallments(editingRefund.installments || []);
    }
  }, [editingRefund]);

  useEffect(() => {
    if (installments.length > 0) {
      const sum = installments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      setTotalAmount(sum.toString());
    }
  }, [installments]);

  const fetchMyRefunds = async () => {
    try {
      const res = await api.get('/refunds');
      setMyRefunds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyReports = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/reports');
      const todayReports = res.data.filter(r => r.date === today);
      setMyReports(todayReports);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async (filter = '') => {
    try {
      let url = `/dashboard/stats?teamFilter=${filter}`;
      if (userFilter) url += `&userFilter=${encodeURIComponent(userFilter)}`;
      if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;

      const res = await api.get(url);
      const data = res.data;

      if (data.caseTypeWiseData) {
        // No remapping — use DB values as-is
        const dbData = data.caseTypeWiseData;

        // Fixed 6 types to always show — 0 if not in DB
        const fixedTypes = [
          'Legal Notice',
          '1930 Cyber Complaint',
          'Consumer Complaint',
          'Criminal Complaint/FIR',
          'Social Media',
          'Civil Case'
        ];

        const finalData = fixedTypes.map(type => {
          // Match DB entries that correspond to this display type
          const matchingItems = dbData.filter(i => {
            const key = (i.caseType || '').toLowerCase().trim();
            return key === type.toLowerCase().trim();
          });

          const totalCount = matchingItems.reduce((sum, i) => sum + i.count, 0);
          const totalAmt = matchingItems.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

          return {
            caseType: type,
            count: totalCount,
            totalAmount: totalAmt
          };
        });

        data.caseTypeWiseData = finalData;
      }

      setStats(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setAllUsers(res.data.filter(u => u.role !== 'Admin'));
      } catch (err) {
        console.error(err);
      }
    };
    if (user?.role === 'Admin') {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    fetchStats(teamFilter);
    fetchMyRefunds();
    fetchMyReports();
    fetchUserCases();
    fetchMyTodayTasks();

    // Auto-refresh stats every 30 seconds so case add/delete reflects immediately
    const statsInterval = setInterval(() => {
      fetchStats(teamFilter);
    }, 30000);

    return () => clearInterval(statsInterval);
  }, [teamFilter, userFilter, startDate, endDate]);

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.requestedBy = user.email;
    data.requestedByName = user.fullName;
    data.caseId = selectedCaseId;
    data.installments = installments;
    console.log("Submitting Refund Data:", data);

    try {
      if (editingRefund) {
        data.status = 'Pending Review';
        await api.put(`/refunds/${editingRefund._id}`, data);
        toast.success('Refund request updated successfully');
        setEditingRefund(null);
      } else {
        await api.post('/refunds', data);
        toast.success('Refund request submitted successfully');
      }
      e.target.reset();
      setSelectedCaseId('');
      setTotalAmount('');
      setInstallments([]);
      fetchMyRefunds();
    } catch (err) {
      toast.error('Failed to submit refund request');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(`Submitting ${reportType} report...`);
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const payload = {
        ...reportFormData,
        type: reportType,
        date: today,
        userName: user?.fullName,
        userEmail: user?.email,
        plannedTasks: reportType === 'SOD'
          ? (reportFormData.sodTasks?.map(t => `${t.type === 'Case ID' ? 'Case Follow-up' : 'Task'}: ${t.caseId || t.task} (${t.mode})`).join('\n') || reportFormData.plannedTasks)
          : '',
        workSummary: reportType === 'EOD' ? reportFormData.workSummary : '',
        completionStatus: reportType === 'EOD' ? reportFormData.completionStatus : 'Incomplete',
        progressScore: reportType === 'EOD' ? reportFormData.progressScore : '',
        moodEnergy: reportType === 'EOD' ? reportFormData.moodEnergy : ''
      };

      await api.post('/reports', payload);
      toast.success(`${reportType} report submitted successfully`, { id: loadingToast });
      setIsReportModalOpen(false);

      // Immediately update SOD status if this was a SOD submission
      if (reportType === 'SOD') {
        setHasSodToday(true);
      }

      // Re-fetch reports and stats
      await checkSodStatus();
      fetchStats();

      setReportFormData({
        plannedTasks: '',
        checkInTime: '',
        checkOutTime: '',
        workDuration: '',
        completionStatus: 'Fully Completed',
        workSummary: '',
        progressScore: '',
        moodEnergy: '',
        challenges: '',
        sodCaseId: '',
        sodTaskTitle: '',
        sodCaseIds: [],
        sodTaskIds: [],
        eodCompletedTaskIds: [],
        sodTasks: [{ type: 'Case ID', caseId: '', task: '', mode: '' }]
      });

      if (reportType === 'SOD') {
        // Create multiple tasks from sodTasks
        const d = new Date();
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const date = d.toLocaleDateString('en-IN');

        for (const t of reportFormData.sodTasks) {
          const isCaseTask = t.type === 'Case ID';
          const taskDescription = isCaseTask ? `Case Follow-up: ${t.caseId}` : t.task;

          if (isCaseTask || t.task.trim()) {
            await api.post('/tasks', {
              title: `SOD: ${t.mode} - ${taskDescription.substring(0, 40)}`,
              details: `Session Task: ${taskDescription}\nMode: ${t.mode}\nType: ${t.type}\nCreated on ${date} at ${time}`,
              priority: 'Medium',
              assignee: user?.fullName,
              dueDate: today, // Added due date
              caseId: isCaseTask ? t.caseId : '',
              status: 'To Do',
              source: 'SOD Auto'
            });
          }
        }
      }

      if (reportType === 'EOD') {
        // Mark checked tasks as completed
        for (const taskId of reportFormData.eodCompletedTaskIds) {
          await api.put(`/tasks/${taskId}`, {
            status: 'Completed',
            notes: `Marked completed in EOD on ${new Date().toLocaleDateString()}`
          });
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to submit ${reportType} report`;
      toast.error(errMsg, { id: loadingToast, duration: 5000 });
      console.error('Submission Error:', err.response?.data);
    }
  };

  if (!stats) return <div className="section active bg-[#f8fafc] h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div></div>;

  return (
    <div className="section active w-full pb-10 px-4 bg-[#f8fafc]">
      <div className="section-header flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 w-full gap-6 pt-4">
        <div className="flex-1 text-left">
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            {!hasSodToday && user?.role !== 'Admin' && (
              <div className="flex items-center justify-center gap-2 px-6 py-3 bg-red text-white border-none rounded-2xl text-[11px] font-black uppercase tracking-widest animate-bounce shadow-xl shadow-red-900/40">
                <AlertTriangle size={16} /> Pending SOD Submission
              </div>
            )}
            {user?.role !== 'Admin' && (
              <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => openReportModal('SOD')}
                  disabled={hasSodToday}
                  className={`px-4 sm:px-8 py-3.5 rounded-2xl text-[10px] md:text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-[0.15em] border-2 shadow-sm ${hasSodToday
                    ? 'bg-bg-input border-border text-text-muted cursor-not-allowed opacity-50'
                    : 'bg-bg-card border-accent text-accent hover:bg-accent-soft shadow-lg shadow-orange-900/10 active:scale-95'
                    }`}
                >
                  <Send size={16} className="rotate-[-20deg]" /> Fill SOD
                </button>
                <button
                  onClick={() => openReportModal('EOD')}
                  disabled={!hasSodToday}
                  className={`px-4 sm:px-8 py-3.5 rounded-2xl text-[10px] md:text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-[0.15em] shadow-xl active:scale-95 ${!hasSodToday
                    ? 'bg-bg-input text-text-muted cursor-not-allowed border-2 border-border opacity-50'
                    : 'bg-accent text-white hover:bg-accent-hover shadow-orange-900/20'
                    }`}
                >
                  <FileText size={16} /> Fill EOD
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SOD/EOD View Report Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setViewingReport(null)}>
          <div className="bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className={`p-8 flex items-center justify-between text-white ${viewingReport.type === 'SOD' ? 'bg-accent' : 'bg-purple'}`}>
              <div>
                <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                  {viewingReport.type === 'SOD' ? <Send size={24} className="rotate-[-20deg]" /> : <FileText size={24} />}
                  {viewingReport.type} Transmission — {viewingReport.date}
                </h2>
                <p className="text-[10px] opacity-80 font-black uppercase tracking-[0.2em] mt-2">Authenticated by {viewingReport.userName}</p>
              </div>
              <button onClick={() => setViewingReport(null)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-bg-card">
              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-bg-input rounded-2xl p-5 border border-border shadow-sm">
                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Technician Identifier</div>
                  <div className="font-black text-text-primary text-sm">{viewingReport.userName || '—'}</div>
                </div>
                <div className="bg-bg-input rounded-2xl p-5 border border-border shadow-sm">
                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">{viewingReport.type === 'SOD' ? 'Initialization Time' : 'Termination Time'}</div>
                  <div className="font-black text-text-primary text-sm">{viewingReport.type === 'SOD' ? viewingReport.checkInTime : viewingReport.checkOutTime || '—'}</div>
                </div>
              </div>
              {viewingReport.type === 'SOD' ? (
                <>
                  <div className="bg-accent-soft rounded-xl p-8 border-2 border-accent-soft shadow-inner">
                    <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Target size={16} /> Operational Objectives</div>
                    <p className="text-sm font-medium text-text-primary leading-relaxed whitespace-pre-wrap italic">"{viewingReport.plannedTasks || 'No planned objectives defined.'}"</p>
                  </div>
                  {viewingReport.sodCaseIds?.length > 0 && (
                    <div className="bg-bg-secondary rounded-xl p-8 border-2 border-border shadow-sm">
                      <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-5">Primary Engagement Focus</div>
                      <div className="flex flex-wrap gap-3">
                        {viewingReport.sodCaseIds.map(cid => (
                          <span key={cid} className="bg-bg-input border border-border text-text-primary text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm">{cid}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-input rounded-2xl p-4 border border-border">
                      <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Operational Duration</div>
                      <div className="font-black text-text-primary text-sm">{viewingReport.workDuration || '—'}</div>
                    </div>
                    <div className="bg-bg-input rounded-2xl p-4 border border-border">
                      <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Execution Index</div>
                      <div className="font-black text-text-primary text-sm">{viewingReport.completionStatus || '—'}</div>
                    </div>
                    <div className="bg-bg-input rounded-2xl p-4 border border-border">
                      <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Performance Matrix</div>
                      <div className="font-black text-text-primary text-sm">{viewingReport.progressScore ? `${viewingReport.progressScore}/10` : '—'}</div>
                    </div>
                    <div className="bg-bg-input rounded-2xl p-4 border border-border">
                      <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Energy Calibration</div>
                      <div className="font-black text-text-primary text-sm">{viewingReport.moodEnergy || '—'}</div>
                    </div>
                  </div>
                  <div className="bg-blue-soft rounded-xl p-8 border-2 border-blue-soft shadow-inner">
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ClipboardList size={16} /> Work Summary</div>
                    <p className="text-sm font-medium text-text-primary leading-relaxed whitespace-pre-wrap italic">"{viewingReport.workSummary || 'No technical summary provided.'}"</p>
                  </div>
                  {viewingReport.challenges && (
                    <div className="bg-red-soft rounded-xl p-8 border-2 border-red-soft">
                      <div className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><AlertCircle size={16} /> Operational Blockers</div>
                      <p className="text-sm font-medium text-text-primary leading-relaxed whitespace-pre-wrap italic">"{viewingReport.challenges}"</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-8 border-t-2 border-border flex justify-end bg-bg-secondary">
              <button onClick={() => setViewingReport(null)} className="px-12 py-4 bg-accent text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-accent-hover transition-all shadow-xl shadow-orange-900/20 active:scale-95">Acknowledge</button>
            </div>
          </div>
        </div>
      )}

      {/* SOD/EOD Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-visible animate-in zoom-in-95 duration-300">
            <div className={`p-8 flex items-center justify-between text-white ${reportType === 'SOD' ? 'bg-accent' : 'bg-purple'}`}>
              <div>
                <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                  {reportType === 'SOD' ? <Send size={24} className="rotate-[-20deg]" /> : <LogOut size={24} />}
                  New {reportType}
                </h2>
                <p className="text-[10px] opacity-80 font-black uppercase tracking-[0.2em] mt-2">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              {!(reportType === 'SOD' && !hasSodToday && user?.role !== 'Admin') && (
                <button onClick={() => setIsReportModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all text-white">
                  <X size={24} />
                </button>
              )}
            </div>

            <form onSubmit={handleReportSubmit} className="p-4 sm:p-8 space-y-8 text-left max-h-[75vh] overflow-y-auto hide-scrollbar bg-bg-card">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase mb-2 tracking-[0.2em] ml-1 flex items-center gap-2">
                    <Users size={12} className="text-accent" /> Name
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={user?.fullName}
                    className="w-full border-2 border-border rounded-2xl p-4 text-sm bg-bg-input font-black text-text-primary outline-none shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase mb-2 tracking-[0.2em] ml-1 flex items-center gap-2">
                    {reportType === 'SOD' ? <><Timer size={12} className="text-accent" /> Time</> : <><LogOut size={12} className="text-purple" /> Time</>}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={reportType === 'SOD' ? reportFormData.checkInTime : reportFormData.checkOutTime}
                    className="w-full border-2 border-border rounded-2xl p-4 text-sm bg-bg-input font-black text-text-primary outline-none shadow-inner"
                  />
                </div>
              </div>

              {reportType === 'SOD' ? (
                stats?.isEodMissed && !stats?.bypassEodCheck ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="text-red-500 bg-red-500/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-lg font-black text-text-primary uppercase">Access Blocked</h3>
                    <p className="text-[11px] font-bold text-text-muted">You missed filling your EOD report on a previous day. Please contact Admin to grant you access to fill SOD.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                          <Target size={14} className="text-accent" /> Today's Objectives
                        </label>
                        <button
                          type="button"
                          onClick={addSodTaskRow}
                          className="bg-accent/10 hover:bg-accent text-accent hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-accent/20 flex items-center gap-1.5"
                        >
                          <Plus size={12} /> Add Task
                        </button>
                      </div>

                      <div className="space-y-3">
                        {reportFormData.sodTasks.map((t, index) => (
                          <div key={index} className="flex flex-col lg:flex-row items-end gap-4 p-5 bg-bg-secondary/40 rounded-2xl border-2 border-border relative group shadow-sm transition-all hover:bg-bg-secondary/60">
                            {/* Task Type Selector */}
                            <div className="flex-1 space-y-2">
                              <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Selection</label>
                              <select
                                className="w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-[11px] font-black text-text-primary outline-none focus:border-accent transition-all uppercase cursor-pointer h-[48px]"
                                value={t.type}
                                onChange={(e) => updateSodTaskRow(index, 'type', e.target.value)}
                              >
                                <option value="Case ID">Case ID</option>
                                <option value="Tasks">Tasks</option>
                              </select>
                            </div>

                            {/* Dynamic Input (Case Search or Task Text) */}
                            <div className="flex-1 space-y-2 min-w-0">
                              <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                                {t.type === 'Case ID' ? 'Select Case File' : 'Enter Task Details'}
                              </label>
                              <div className="h-[48px] w-full">
                                {t.type === 'Case ID' ? (
                                  <SearchableCaseSelect
                                    value={t.caseId}
                                    onChange={(val) => updateSodTaskRow(index, 'caseId', val)}
                                    cases={userCases}
                                    className="h-full"
                                    required={true}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    required
                                    placeholder="Your task..."
                                    className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-3 text-[11px] font-bold text-text-primary outline-none focus:border-accent transition-all h-full placeholder:text-text-muted/50"
                                    value={t.task}
                                    onChange={(e) => updateSodTaskRow(index, 'task', e.target.value)}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Mode Selector */}
                            <div className="flex-1 space-y-2">
                              <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Mode</label>
                              <select
                                required
                                className="w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-[11px] font-black text-text-primary outline-none focus:border-accent transition-all uppercase tracking-widest cursor-pointer h-[48px]"
                                value={t.mode}
                                onChange={(e) => updateSodTaskRow(index, 'mode', e.target.value)}
                              >
                                <option value="" disabled>Select Mode</option>
                                <option value="Call">Call</option>
                                <option value="Email">Email</option>
                                <option value="Whatsapp">Whatsapp</option>
                                <option value="Meeting">Meeting</option>
                                {t.type === 'Case ID' && (
                                  <>
                                    <option value="Case uploaded">Case uploaded</option>
                                    <option value="Document Uploaded">Document Uploaded</option>
                                  </>
                                )}
                                {t.type === 'Tasks' && (
                                  <option value="Add New case">Add New case</option>
                                )}
                              </select>
                            </div>

                            {/* Action Button */}
                            <div className="flex items-center justify-center pb-0.5 lg:w-10">
                              <button
                                type="button"
                                onClick={() => removeSodTaskRow(index)}
                                disabled={reportFormData.sodTasks.length === 1}
                                className="p-2 text-text-muted hover:text-red hover:bg-red-soft rounded-lg transition-all disabled:opacity-0"
                                title="Remove row"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Tasks Section */}
                    <div className="mt-6 space-y-4">
                      <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                        <Target size={14} className="text-accent" /> Pending Tasks
                      </label>
                      <div className="bg-bg-secondary/40 rounded-2xl border-2 border-border p-4 space-y-2 max-h-[200px] overflow-y-auto hide-scrollbar">
                        {myTodayTasks.length > 0 ? (
                          myTodayTasks.map(task => (
                            <div key={task._id} className="flex items-center gap-3 p-3 bg-bg-card rounded-xl border border-border/50 hover:border-accent/30 transition-all">
                              <div className="w-2 h-2 rounded-full bg-accent/60"></div>
                              <span className="text-[11px] font-bold text-text-primary flex-1">{task.title || task.task}</span>
                              <span className="text-[9px] font-black text-text-muted uppercase bg-bg-secondary px-2 py-0.5 rounded-md">{task.priority || 'Normal'}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] font-black text-text-muted text-center py-4 uppercase tracking-widest">No pending tasks</div>
                        )}
                      </div>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase mb-2 tracking-[0.2em] ml-1 flex items-center gap-2">
                        <CheckCircle size={12} className="text-purple" /> Completion Status
                      </label>
                      <select
                        className="w-full border-2 border-border rounded-2xl p-4 text-sm bg-bg-input font-black text-text-primary outline-none focus:border-purple transition-all"
                        value={reportFormData.completionStatus}
                        onChange={(e) => setReportFormData({ ...reportFormData, completionStatus: e.target.value })}
                      >
                        <option value="Fully Completed">Fully Completed</option>
                        <option value="Partially Completed">Partially Completed</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Incomplete">Incomplete</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase mb-2 tracking-[0.2em] ml-1 flex items-center gap-2">
                        <TrendingUp size={12} className="text-purple" /> Progress Score (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="w-full border-2 border-border rounded-2xl p-4 text-sm bg-bg-input font-black text-text-primary outline-none focus:border-purple transition-all"
                        value={reportFormData.progressScore}
                        onChange={(e) => setReportFormData({ ...reportFormData, progressScore: e.target.value })}
                        placeholder="Rate your day"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase mb-2 tracking-[0.2em] ml-1 flex items-center gap-2">
                        <Zap size={12} className="text-purple" /> Mood / Energy
                      </label>
                      <select
                        className="w-full border-2 border-border rounded-2xl p-4 text-sm bg-bg-input font-black text-text-primary outline-none focus:border-purple transition-all"
                        value={reportFormData.moodEnergy}
                        onChange={(e) => setReportFormData({ ...reportFormData, moodEnergy: e.target.value })}
                      >
                        <option value="">Select Mood</option>
                        <option value="High Energy">High Energy</option>
                        <option value="Focused">Focused</option>
                        <option value="Normal">Normal</option>
                        <option value="Tired">Tired</option>
                        <option value="Low Energy">Low Energy</option>
                      </select>
                    </div>
                  </div>


                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-text-muted uppercase mb-3 tracking-[0.2em] ml-1 flex items-center gap-2">
                      <FileText size={14} className="text-purple" /> Work Summary
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Provide a brief summary of your session achievements..."
                      className="w-full border-2 border-border rounded-2xl p-6 text-sm font-medium text-text-primary focus:border-purple focus:ring-4 focus:ring-purple-soft outline-none bg-bg-input transition-all shadow-inner resize-none italic placeholder:text-text-muted"
                      value={reportFormData.workSummary}
                      onChange={(e) => setReportFormData({ ...reportFormData, workSummary: e.target.value })}
                    ></textarea>
                  </div>

                  {/* EOD Task Checklist */}
                  <div className="space-y-4 pt-4 border-t-2 border-border/30">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                      <CheckCircle size={14} className="text-purple" /> Task Completion Checklist
                    </label>

                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                      {myTodayTasks.length === 0 ? (
                        <div className="p-8 text-center bg-bg-input border-2 border-dashed border-border rounded-2xl opacity-50">
                          <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">No active tasks to review</div>
                        </div>
                      ) : (
                        myTodayTasks.map(task => (
                          <div key={task._id} className="flex flex-col bg-bg-input border-2 border-border rounded-2xl overflow-hidden transition-all hover:border-purple/30">
                            <div className={`flex items-center gap-4 p-4 ${reportFormData.eodCompletedTaskIds?.includes(task._id) ? 'bg-purple/5' : ''}`}>
                              {/* Checkbox Container */}
                              <div
                                onClick={(e) => { e.stopPropagation(); toggleEodTask(task._id); }}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${reportFormData.eodCompletedTaskIds?.includes(task._id)
                                  ? 'bg-purple border-purple text-white'
                                  : 'border-border hover:border-purple/50'
                                  }`}
                              >
                                {reportFormData.eodCompletedTaskIds?.includes(task._id) && <Check size={14} strokeWidth={3} />}
                              </div>

                              <div className="flex-1">
                                <div className={`text-[11px] font-bold uppercase tracking-tight transition-colors ${reportFormData.eodCompletedTaskIds?.includes(task._id) ? 'text-purple' : 'text-text-primary'}`}>
                                  {task.title}
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-60">
                                  {task.caseId || 'Personal Task'} • {task.priority}
                                </div>
                              </div>

                              {/* Expansion Toggle */}
                              <button
                                type="button"
                                onClick={() => toggleTaskExpansion(task._id)}
                                className={`p-2 rounded-xl transition-all ${expandedTaskIds.includes(task._id) ? 'bg-purple text-white shadow-lg' : 'hover:bg-bg-secondary text-text-muted'}`}
                              >
                                <ChevronRight size={16} className={`transition-transform duration-300 ${expandedTaskIds.includes(task._id) ? 'rotate-90' : ''}`} />
                              </button>
                            </div>

                            {/* Expandable Content */}
                            {expandedTaskIds.includes(task._id) && (
                              <div className="px-14 pb-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="p-4 bg-bg-secondary/50 rounded-xl border border-border/50">
                                  <div className="text-[9px] font-black text-purple uppercase tracking-[0.15em] mb-2">Task Details & Context</div>
                                  <p className="text-[11px] text-text-muted leading-relaxed whitespace-pre-line italic">
                                    {task.details || 'No additional details provided for this task.'}
                                  </p>
                                  {task.source && (
                                    <div className="mt-3 pt-3 border-t border-border/30 text-[8px] font-black text-text-muted uppercase tracking-widest">
                                      Source: {task.source}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-10 border-t-2 border-border">
                {!(reportType === 'SOD' && !hasSodToday && user?.role !== 'Admin') && (
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="w-full sm:w-auto px-6 sm:px-10 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-text-muted hover:bg-bg-input transition-all border-2 border-transparent hover:border-border"
                  >
                    {reportType === 'SOD' ? 'Skip For Now' : 'Cancel'}
                  </button>
                )}
                <button
                  type="submit"
                  className={`w-full sm:w-auto px-6 sm:px-12 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white shadow-sm transition-all flex items-center justify-center gap-3 active:scale-95 ${reportType === 'SOD' ? 'bg-accent hover:bg-accent-hover' : 'bg-purple hover:bg-purple-600'}`}
                >
                  <Send size={18} /> Submit {reportType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* War Room Overview */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Overview</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {user?.role === 'Admin' && (
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-bg-card border-2 border-border px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-text-primary shadow-sm hover:bg-bg-input transition-all outline-none"
              >
                <option value="">All Users</option>
                {allUsers.map(u => (
                  <option key={u._id} value={u.fullName || u.name}>{u.fullName || u.name}</option>
                ))}
              </select>
            )}
            {user?.role === 'Admin' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-bg-card border-2 border-border px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-text-primary shadow-sm hover:bg-bg-input transition-all outline-none"
                />
                <span className="text-text-muted font-black text-xs">TO</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-bg-card border-2 border-border px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-text-primary shadow-sm hover:bg-bg-input transition-all outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {user?.role === 'Operations' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              {/* TYPE OF THREAT - SUMMARY (Left, Wide) */}
              <div className="lg:col-span-9 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">TYPE OF THREAT – SUMMARY</div>
                <div className="flex justify-between items-start gap-4">
                  {[
                    { label: '1930 / Criminal FIR', type: 'Cyber Complaint', color: 'text-blue', bg: 'bg-blue-soft', icon: ShieldAlert },
                    { label: 'Consumer Complaint', type: 'Consumer Complaint', color: 'text-green', bg: 'bg-green-soft', icon: Users },
                    { label: 'Legal Notice', type: 'Legal Notice', color: 'text-purple', bg: 'bg-purple-soft', icon: Scale },
                    { label: 'Demand Pressure', type: 'Demand Pressure', color: 'text-orange', bg: 'bg-orange-soft', icon: AlertTriangle },
                    { label: 'Social Media', type: 'Social Media', color: 'text-cyan', bg: 'bg-cyan-soft', icon: MessageCircle },
                    { label: 'NA (Non-Agreement) Cases', type: 'FIR', color: 'text-yellow', bg: 'bg-yellow-soft', icon: HelpCircle },
                  ].map((item, index) => {
                    const dbItem = stats?.caseTypeWiseData?.find(c => c.caseType === item.type) || { count: 0, totalAmount: 0 };
                    const percentage = ((dbItem.count / (stats?.totalCases || 1)) * 100).toFixed(2);
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={index}
                        className="flex flex-col flex-1 min-w-[100px] border-r border-border last:border-r-0 pr-2 last:pr-0 cursor-pointer hover:bg-bg-secondary/30 transition-all rounded-lg"
                        onClick={() => navigate('/case-master', { state: { typeFilter: item.type } })}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className={`p-1 ${item.bg} rounded ${item.color}`}>
                            <IconComponent size={12} />
                          </div>
                          <div className={`text-[9px] font-black uppercase tracking-tight ${item.color}`} title={item.label}>{item.label}</div>
                        </div>
                        <div className="text-xl font-black text-text-primary tracking-tight">{dbItem.count}</div>
                        <div className="text-[9px] font-bold text-text-muted mt-0.5">₹{Number(dbItem.totalAmount || 0).toLocaleString('en-IN')}</div>
                        {/* <div className="text-[9px] font-black text-text-muted/60 mt-0.5">{percentage}%</div> */}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MY KEY NUMBERS (TODAY) (Right, Narrow) */}
              <div className="lg:col-span-3 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">MY KEY NUMBERS (TODAY)</div>
                <div className="grid grid-cols-4 gap-2 h-full items-center">
                  <div className="text-center cursor-pointer hover:bg-bg-secondary/30 transition-all rounded-lg p-1" onClick={() => navigate('/case-master')}>
                    <div className="text-[9px] font-black text-text-muted uppercase tracking-tight">Active Cases</div>
                    <div className="text-xl font-black text-text-primary mt-2">{(stats?.totalCases || 0) - (stats?.closedCases || 0)}</div>
                  </div>
                  <div className="text-center border-l border-border pl-2 cursor-pointer hover:bg-bg-secondary/30 transition-all rounded-lg p-1" onClick={() => navigate('/my-task', { state: { taskFilter: 'today' } })}>
                    <div className="text-[9px] font-black text-text-muted uppercase tracking-tight">Follow Ups</div>
                    <div className="text-xl font-black text-text-primary mt-2">{stats?.timeBoundActions?.dueToday || 0}</div>
                  </div>
                  <div className="text-center border-l border-border pl-2 cursor-pointer hover:bg-bg-secondary/30 transition-all rounded-lg p-1" onClick={() => navigate('/my-task')}>
                    <div className="text-[9px] font-black text-text-muted uppercase tracking-tight">Pending Actions</div>
                    <div className="text-xl font-black text-text-primary mt-2">{stats?.pendingTasksCount || 0}</div>
                  </div>
                  <div className="text-center border-l border-border pl-2 cursor-pointer hover:bg-bg-secondary/30 transition-all rounded-lg p-1" onClick={() => navigate('/my-task', { state: { taskFilter: 'overdue' } })}>
                    <div className="text-[9px] font-black text-text-muted uppercase tracking-tight">Overdue</div>
                    <div className="text-xl font-black text-red mt-2">{stats?.overdue || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* NEW GRID FOR TASKS & PERFORMANCE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 mt-6">
              {/* MY TASKS – SOD TO EOD */}
              <div className="lg:col-span-8 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">MY TASKS – SOD TO EOD</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* SOD SUBMISSION */}
                  <div className="bg-bg-secondary rounded-2xl p-4 shadow-sm border border-border/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-1.5 bg-orange-soft rounded-lg text-orange">
                          <Zap size={16} />
                        </div>
                        <div className="text-[10px] font-black uppercase text-text-muted tracking-widest text-right">SOD Submission</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Daily Checklist</span>
                          <span className="font-black">6 / 6</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Priority Cases Plan</span>
                          <span className="font-black">5 / 5</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Yesterday's EOD Review</span>
                          <span className="font-black">1 / 1</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-text-muted">SOD Submitted At</span>
                      <span className="text-green">09:15 AM</span>
                    </div>
                  </div>

                  {/* WORK TASK SUBMISSION */}
                  <div className="bg-bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-1.5 bg-blue-soft rounded-lg text-blue">
                          <ClipboardList size={16} />
                        </div>
                        <div className="text-[10px] font-black uppercase text-text-muted tracking-widest text-right">Work Task Submission</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Case Updates</span>
                          <span className="font-black">{stats?.progressUpdatesToday || 0}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Client Communications</span>
                          <span className="font-black">{stats?.communicationsToday || 0}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Legal Document Uploads</span>
                          <span className="font-black">{stats?.documentsUploadedToday || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-text-muted">Last Submission</span>
                      <span className="text-blue">12:30 PM</span>
                    </div>
                  </div>

                  {/* EOD SUBMISSION */}
                  <div className="bg-bg-secondary rounded-2xl p-4 shadow-sm border border-border/50 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-1.5 bg-purple-soft rounded-lg text-purple">
                          <Clock size={16} />
                        </div>
                        <div className="text-[10px] font-black uppercase text-text-muted tracking-widest text-right">EOD Submission</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Daily Case Summary</span>
                          <span className="font-black">0 / 1</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Calls & Meetings Log</span>
                          <span className="font-black">0 / 1</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                          <span>Next Day Plan</span>
                          <span className="font-black">0 / 1</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-text-muted">EOD Due By</span>
                      <span className="text-purple">08:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* MY PERFORMANCE */}
              <div className="lg:col-span-4 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-[10px] font-black uppercase text-text-primary tracking-widest">My Performance (Evaluation)</div>
                    <div className="flex gap-1">
                      {['7 Days', '1 Month', '3 Months'].map((label, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActivePeriod(label);
                            const end = new Date();
                            const start = new Date();
                            if (label === '7 Days') start.setDate(end.getDate() - 7);
                            else if (label === '1 Month') start.setMonth(end.getMonth() - 1);
                            else if (label === '3 Months') start.setMonth(end.getMonth() - 3);
                            setStartDate(start.toISOString().split('T')[0]);
                            setEndDate(end.toISOString().split('T')[0]);
                          }}
                          className={`px-2 py-1 text-[8px] font-black uppercase rounded ${activePeriod === label ? 'bg-blue-600 text-white' : 'bg-bg-secondary text-text-muted'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] font-black text-text-muted uppercase mb-1">Client Communication</div>
                      <div className="text-xl font-black text-green">{stats?.totalCommunications || 0}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-text-muted uppercase mb-1">Cases Resolved</div>
                      <div className="text-xl font-black text-green">54</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-text-muted uppercase mb-1">NA Cases</div>
                      <div className="text-xl font-black text-red">{stats?.caseTypeWiseData?.find(c => c.caseType === 'FIR')?.count || 0}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-text-muted uppercase mb-1">Overdue Cases</div>
                      <div className="text-xl font-black text-red">{stats?.overdueActions?.length || 0}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-text-muted uppercase mb-1">Callbacks Done</div>
                      <div className="text-xl font-black text-green">96</div>
                    </div>

                  </div>
                </div>
                {/* <div className="mt-4 text-right">
                  <a href="#" className="text-[9px] font-black text-blue uppercase tracking-widest hover:underline flex items-center justify-end gap-1">
                    View Full Performance Report <ArrowRight size={10} />
                  </a>
                </div> */}
              </div>
            </div>

            {/* Top Urgent Cases Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              {/* MY CASES OVERVIEW */}
              <div className="lg:col-span-4 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">My Cases Overview</div>
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-full h-32 mb-4 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Active', value: stats?.openCases || 0 },
                            { name: 'Resolved', value: stats?.settledCases || 0 },
                            { name: 'NA Cases', value: stats?.caseTypeWiseData?.find(c => c.caseType === 'FIR')?.count || 0 },
                            { name: 'Consumer Complaint', value: stats?.caseTypeWiseData?.find(c => c.caseType === 'Consumer Complaint')?.count || 0 }
                          ].filter(d => d.value > 0)}
                          innerRadius={35}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill="#3B82F6" /> {/* Blue */}
                          <Cell fill="#10B981" /> {/* Green */}
                          <Cell fill="#F59E0B" /> {/* Yellow */}
                          <Cell fill="#8B5CF6" /> {/* Purple */}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-lg font-black text-text-primary">{stats?.totalCases || 0}</div>
                      <div className="text-[8px] font-black text-text-muted uppercase">Total</div>
                    </div>
                  </div>
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>Active</span>
                      </div>
                      <span>{stats?.openCases || 0}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span>Resolved</span>
                      </div>
                      <span>{stats?.settledCases || 0}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span>NA Cases</span>
                      </div>
                      <span>{stats?.caseTypeWiseData?.find(c => c.caseType === 'FIR')?.count || 0}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span>Consumer Complaint</span>
                      </div>
                      <span>{stats?.caseTypeWiseData?.find(c => c.caseType === 'Consumer Complaint')?.count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOP URGENT CASES */}
              <div className="lg:col-span-8 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">Top Urgent Cases (My Cases)</div>
                <div className="table-wrap overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-secondary text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                        <th className="px-3 py-3">Case ID</th>
                        <th className="px-3 py-3">Type of Threat</th>
                        <th className="px-3 py-3">Amount Paid</th>
                        <th className="px-3 py-3">Last Updated</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userCases.filter(c => c.priority === 'High' && c.currentStatus !== 'Closed').slice(0, 5).map((c, idx) => {
                        return (
                          <tr key={idx} className="border-b border-border/50 hover:bg-bg-secondary/30 transition-all text-[11px] font-bold text-text-primary">
                            <td className="px-3 py-4 text-blue">{c.caseId}</td>
                            <td className="px-3 py-4">{c.typeOfComplaint}</td>
                            <td className="px-3 py-4">₹{Number(c.totalAmtPaid || c.amountPaid || 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-4 text-text-muted">
                              {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '--'}
                            </td>
                            <td className="px-3 py-4">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${c.currentStatus === 'Escalated' ? 'bg-red-soft text-red' : 'bg-orange-soft text-orange'}`}>
                                {c.currentStatus}
                              </span>
                            </td>
                            <td className="px-3 py-4">
                              <button
                                onClick={() => navigate('/case-master', { state: { searchId: c.caseId } })}
                                className="text-[9px] font-black text-blue uppercase tracking-widest hover:underline"
                              >
                                View Case
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* Time Bound Actions & Schedule Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              {/* TIME BOUND ACTIONS */}
              <div className="lg:col-span-4 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">Time Bound Actions</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg-secondary p-4 rounded-xl text-center">
                    <div className="text-[10px] font-black text-text-muted uppercase mb-1">Due Today</div>
                    <div className="text-2xl font-black text-red">{stats?.timeBoundActions?.dueToday || 0}</div>
                  </div>
                  <div className="bg-bg-secondary p-4 rounded-xl text-center">
                    <div className="text-[10px] font-black text-text-muted uppercase mb-1">Due Within 24 Hrs</div>
                    <div className="text-2xl font-black text-orange">{stats?.timeBoundActions?.dueWithin24h || 0}</div>
                  </div>
                  <div className="bg-bg-secondary p-4 rounded-xl text-center">
                    <div className="text-[10px] font-black text-text-muted uppercase mb-1">Due Within 48 Hrs</div>
                    <div className="text-2xl font-black text-yellow">{stats?.timeBoundActions?.dueWithin48h || 0}</div>
                  </div>
                  <div className="bg-bg-secondary p-4 rounded-xl text-center">
                    <div className="text-[10px] font-black text-text-muted uppercase mb-1">Overdue</div>
                    <div className="text-2xl font-black text-red">{stats?.timeBoundActions?.overdue || 0}</div>
                  </div>
                </div>
              </div>

              {/* TODAY'S SCHEDULE */}
              <div className="lg:col-span-4 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">Today's Schedule</div>
                <div className="space-y-4">
                  {myTodayTasks.slice(0, 5).map((t, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-[11px] font-bold text-text-primary">
                      <div className="text-text-muted w-16">{t.startTime || '10:00 AM'}</div>
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <div>{t.title || t.taskName}</div>
                        <div className="text-[9px] text-text-muted">{t.clientName || 'N/A'}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${t.status === 'Completed' ? 'bg-green-soft text-green' : 'bg-blue-soft text-blue'}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                  {myTodayTasks.length === 0 && (
                    <div className="text-[10px] font-black text-text-muted text-center py-4 uppercase tracking-widest">No tasks for today</div>
                  )}
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="lg:col-span-4 bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">Quick Actions</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { navigate('/work-report') }}
                    className="flex flex-col items-center justify-center p-3 bg-bg-secondary rounded-xl hover:bg-bg-card-hover transition-all"
                  >
                    <Activity size={16} className="text-orange mb-1" />
                    <span className="text-[9px] font-black uppercase text-text-primary">SOD Submission</span>
                  </button>
                  <button
                    onClick={() => navigate('/my-task')}
                    className="flex flex-col items-center justify-center p-3 bg-bg-secondary rounded-xl hover:bg-bg-card-hover transition-all"
                  >
                    <FolderPlus size={16} className="text-purple mb-1" />
                    <span className="text-[9px] font-black uppercase text-text-primary">Work Task</span>
                  </button>
                  {/* <button
                    onClick={() => { setReportType('EOD'); setIsReportModalOpen(true); }}
                    className="flex flex-col items-center justify-center p-3 bg-bg-secondary rounded-xl hover:bg-bg-card-hover transition-all"
                  >
                    <FileUp size={16} className="text-indigo mb-1" />
                    <span className="text-[9px] font-black uppercase text-text-primary">EOD Submission</span>
                  </button> */}
                  <button
                    onClick={() => navigate('/case-master')}
                    className="flex flex-col items-center justify-center p-3 bg-bg-secondary rounded-xl hover:bg-bg-card-hover transition-all"
                  >
                    <Activity size={16} className="text-green mb-1" />
                    <span className="text-[9px] font-black uppercase text-text-primary">Case Update</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Main Cards (Left) */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Total Cases */}
              <div className="bg-bg-card rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm cursor-pointer hover:bg-bg-card-hover" onClick={() => navigate('/case-master')}>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-soft rounded-lg text-blue">
                      <FolderOpen size={16} />
                    </div>
                    <div className="text-[10px] font-black uppercase text-text-muted tracking-widest">Total Cases</div>
                  </div>
                  <div className="text-3xl font-black text-text-primary tracking-tight">{stats?.totalCases || 0}</div>
                  <div className="text-xs font-bold text-text-muted mt-1">₹{Number(stats?.totalAmountPaid || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Card 2: Active Cases */}
              <div className="bg-bg-card rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm cursor-pointer hover:bg-bg-card-hover" onClick={() => navigate('/case-master')}>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-green-soft rounded-lg text-green">
                      <Activity size={16} />
                    </div>
                    <div className="text-[10px] font-black uppercase text-text-muted tracking-widest">Active Cases</div>
                  </div>
                  <div className="text-3xl font-black text-text-primary tracking-tight">{(stats?.totalCases || 0) - (stats?.closedCases || 0)}</div>
                  <div className="text-xs font-bold text-text-muted mt-1">₹{Number((stats?.totalAmountPaid || 0) - (stats?.closedAmount || 0)).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Card 3: High Risk Cases */}
              <div className="bg-red-soft/20 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm cursor-pointer hover:bg-red-soft/30" onClick={() => navigate('/case-master', { state: { priorityFilter: 'High' } })}>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-red-soft rounded-lg text-red">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="text-[10px] font-black uppercase text-text-muted tracking-widest">High Risk</div>
                  </div>
                  <div className="text-3xl font-black text-red tracking-tight">{stats?.highPriority || 0}</div>
                  <div className="text-xs font-bold text-text-muted mt-1">₹{Number(stats?.highPriorityAmount || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* Type of Threat (Right) */}
            <div className="lg:col-span-8 bg-bg-card rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest">Type of Complaint</div>
              </div>
              <div className="flex justify-between items-start gap-4">
                {stats?.caseTypeWiseData?.slice(0, 6).map((item, index) => {
                  const percentage = ((item.count / (stats?.totalCases || 1)) * 100).toFixed(2);
                  const colors = [
                    { bg: 'bg-blue-soft', text: 'text-blue' },
                    { bg: 'bg-green-soft', text: 'text-green' },
                    { bg: 'bg-purple-soft', text: 'text-purple' },
                    { bg: 'bg-orange-soft', text: 'text-orange' },
                    { bg: 'bg-cyan-soft', text: 'text-cyan' },
                    { bg: 'bg-yellow-soft', text: 'text-yellow' },
                  ];
                  const icons = [ShieldAlert, FileText, Gavel, AlertTriangle, MessageCircle, HelpCircle];
                  const color = colors[index % colors.length];
                  const IconComponent = icons[index % icons.length];

                  return (
                    <div
                      key={index}
                      className="flex flex-col flex-1 min-w-[120px] border-r border-border last:border-r-0 pr-4 last:pr-0 cursor-pointer hover:bg-bg-secondary/30 transition-all rounded-lg"
                      onClick={() => navigate('/case-master', { state: { typeFilter: item.caseType } })}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1 ${color.bg} rounded ${color.text}`}>
                          <IconComponent size={12} />
                        </div>
                        <div className="text-[10px] font-black text-text-primary uppercase tracking-tight" title={item.caseType}>{item.caseType}</div>
                      </div>
                      <div className="text-xl font-black text-text-primary tracking-tight">{item.count}</div>
                      <div className="text-[10px] font-bold text-text-muted mt-0.5">₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Refund Provisions & Stats Section */}
      {user?.role === 'Admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Refund Provisions (Left) */}
          <div className="lg:col-span-5 bg-bg-card rounded-2xl p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">Refund Provisions (Approved)</div>
            <div className="grid grid-cols-4 gap-4">
              <div className="border-r border-border last:border-r-0 pr-4 last:pr-0">
                <div className="text-[10px] font-black text-text-primary uppercase mb-2">Today</div>
                <div className="flex justify-between text-[8px] font-bold text-text-muted mb-1">
                  <span>No.</span>
                  <span>Amt.</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-black text-text-primary">{stats?.provisions?.today?.count || 0}</span>
                  <span className="text-[10px] font-black text-text-primary">₹ {Number(stats?.provisions?.today?.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="border-r border-border last:border-r-0 pr-4 last:pr-0">
                <div className="text-[10px] font-black text-text-primary uppercase mb-2">This Week</div>
                <div className="flex justify-between text-[8px] font-bold text-text-muted mb-1">
                  <span>No.</span>
                  <span>Amt.</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-black text-text-primary">{stats?.provisions?.thisWeek?.count || 0}</span>
                  <span className="text-[10px] font-black text-text-primary">₹ {Number(stats?.provisions?.thisWeek?.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="border-r border-border last:border-r-0 pr-4 last:pr-0">
                <div className="text-[10px] font-black text-text-primary uppercase mb-2">This Month</div>
                <div className="flex justify-between text-[8px] font-bold text-text-muted mb-1">
                  <span>No.</span>
                  <span>Amt.</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-black text-text-primary">{stats?.provisions?.thisMonth?.count || 0}</span>
                  <span className="text-[10px] font-black text-text-primary">₹ {Number(stats?.provisions?.thisMonth?.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="border-r border-border last:border-r-0 pr-4 last:pr-0">
                <div className="text-[10px] font-black text-text-primary uppercase mb-2">Next 6 Months</div>
                <div className="flex justify-between text-[8px] font-bold text-text-muted mb-1">
                  <span>No.</span>
                  <span>Amt.</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-black text-text-primary">{stats?.provisions?.next6Months?.count || 0}</span>
                  <span className="text-[10px] font-black text-text-primary">₹ {Number(stats?.provisions?.next6Months?.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Small Cards (Right) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Amount At Risk */}
            <div className="bg-bg-card rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="p-1.5 bg-blue-soft rounded-lg text-blue">
                  <IndianRupee size={16} />
                </div>
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest text-right">Amount At Risk</div>
              </div>
              <div className="mt-2">
                <div className="text-lg font-black text-text-primary">₹ {Number(stats?.amountAtRisk || 0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] font-bold text-text-muted mt-0.5">Approved Pending</div>
              </div>
              <div className="mt-2 text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest" onClick={() => navigate('/case-master')}>
                View Details <ArrowRight size={12} />
              </div>
            </div>

            {/* Overdue Callbacks */}
            <div className="bg-bg-card rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="p-1.5 bg-orange-soft rounded-lg text-orange">
                  <Clock size={16} />
                </div>
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest text-right">Overdue</div>
              </div>
              <div className="mt-2">
                <div className="text-lg font-black text-text-primary">{stats?.overdue || 0}</div>
                <div className="text-[10px] font-bold text-text-muted mt-0.5">Due for Follow-up</div>
              </div>
              <div className="mt-2 text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest" onClick={() => navigate('/my-task', { state: { taskFilter: 'overdue' } })}>
                View Details <ArrowRight size={12} />
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-bg-card rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="p-1.5 bg-blue-soft rounded-lg text-blue">
                  <ShieldCheck size={16} />
                </div>
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest text-right">Pending Approvals</div>
              </div>
              <div className="mt-2">
                <div className="text-lg font-black text-text-primary">₹ {Number(stats?.pendingApprovals || 0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] font-bold text-text-muted mt-0.5">Awaiting Action</div>
              </div>
              <div className="mt-2 text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest" onClick={() => navigate('/admin-panel#refund-actions')}>
                View Details <ArrowRight size={12} />
              </div>
            </div>

            {/* Linked By Cases */}
            <div className="bg-bg-card rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                  <FileText size={16} />
                </div>
                <div className="text-[10px] font-black uppercase text-text-muted tracking-widest text-right">Linked By</div>
              </div>
              <div className="mt-2">
                <div className="text-lg font-black text-text-primary">{stats?.linkedByCount || 0}</div>
                <div className="text-[10px] font-bold text-text-muted mt-0.5">Linked Cases</div>
              </div>
              <div className="mt-2 text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest" onClick={() => navigate('/case-master', { state: { linkedOnly: true } })}>
                View Details <ArrowRight size={12} />
              </div>
            </div>

            {/* Live Escalations */}

          </div>
        </div>
      )}

      {/* Threat Trends Section */}
      {user?.role === 'Admin' && (
        <div className="bg-bg-card rounded-2xl p-5 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-5">
            <div className="text-[10px] font-black uppercase text-text-muted tracking-widest">Threat Trends (Last 30 Days)</div>
            {/* <div className="text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest">
            View Analytics <ArrowRight size={12} />
          </div> */}
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.threatTrendData || []} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6', fontSize: '12px' }}
                  itemStyle={{ color: '#F3F4F6' }}
                  labelStyle={{ color: '#9CA3AF', fontWeight: 'bold' }}
                />
                <Legend
                  verticalAlign="top"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px' }}
                />
                {(stats?.threatTrendTypes || []).map((type, index) => {
                  const colors = ['#0066FF', '#094e2bff', '#7C3AED', '#d1593bff', '#0a8585ff', '#915c0eff'];
                  const color = colors[index % colors.length];
                  return (
                    <Line
                      key={type}
                      type="monotone"
                      dataKey={type}
                      stroke={color}
                      strokeWidth={1.5}
                      dot={{ r: 3, fill: color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {user?.role === 'Admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 mt-8">
          {/* Box 1: Staff Performance Analysis */}
          <div className="lg:col-span-5 bg-bg-card rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="text-[10px] font-black uppercase text-text-primary tracking-widest">Staff Performance Analysis</div>
              <div className="flex gap-2">
                {[
                  { label: 'Last 7 Days', value: '7days' },
                  { label: 'Last 1 Month', value: '1month' },
                  { label: 'Last 3 Months', value: '3months' }
                ].map((item) => (
                  <button
                    key={item.value}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${teamFilter === item.value || (teamFilter === '' && item.value === '7days') ? 'bg-blue-600 text-white shadow-sm' : 'bg-bg-secondary text-text-muted hover:bg-bg-input'}`}
                    onClick={() => setTeamFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-text-muted text-[8px] font-black uppercase tracking-widest border-b border-border">
                    <th className="py-2">Staff Name</th>
                    <th className="py-2 text-center">Cases Assigned</th>
                    <th className="py-2 text-center">Cases Closed</th>
                    {/* <th className="py-2 text-center">Avg. Response Time</th> */}
                    <th className="py-2 text-center">Overdue Cases</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-text-primary">
                  {(stats?.teamPerformance || []).slice(0, 5).map((member, index) => (
                    <tr key={index} className="border-b border-border/50 last:border-b-0 hover:bg-bg-secondary/50">
                      <td className="py-3 cursor-pointer hover:text-blue-600 hover:underline" onClick={() => navigate('/case-master', { state: { searchId: member.name } })}>{member.name}</td>
                      <td className="py-3 text-center">{member.assigned}</td>
                      <td className="py-3 text-center">{member.settled}</td>
                      {/* <td className="py-3 text-center text-text-muted">{member.responseTime || 'N/A'}</td> */}
                      <td className="py-3 text-center text-red-500">{member.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest" onClick={() => navigate('/case-master')}>
              View Full Staff Report <ArrowRight size={12} />
            </div>
          </div>

          {/* Box 2: Time Bound Actions */}
          <div className="lg:col-span-3 bg-bg-card rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-black uppercase text-text-primary tracking-widest mb-4">Time Bound Actions</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-500/10 p-3 rounded-xl flex flex-col items-center cursor-pointer bg-red-500/20 transition-all" onClick={() => navigate('/my-task', { state: { taskFilter: 'today' } })}>
                  <span className="text-[8px] font-black text-red-500 uppercase">Due Today</span>
                  <span className="text-2xl font-black text-red-500 mt-1">{stats?.timeBoundActions?.dueToday || 0}</span>
                </div>
                <div className="bg-orange-500/10 p-3 rounded-xl flex flex-col items-center cursor-pointer bg-orange-500/20 transition-all" onClick={() => navigate('/my-task', { state: { taskFilter: '24h' } })}>
                  <span className="text-[8px] font-black text-orange-500 uppercase">Due Within 24 Hrs</span>
                  <span className="text-2xl font-black text-orange-500 mt-1">{stats?.timeBoundActions?.dueWithin24h || 0}</span>
                </div>
                <div className="bg-orange-500/10 p-3 rounded-xl flex flex-col items-center cursor-pointer bg-orange-500/20 transition-all" onClick={() => navigate('/my-task', { state: { taskFilter: '48h' } })}>
                  <span className="text-[8px] font-black text-orange-500 uppercase">Due Within 48 Hrs</span>
                  <span className="text-2xl font-black text-orange-500 mt-1">{stats?.timeBoundActions?.dueWithin48h || 0}</span>
                </div>
                <div className="bg-red-500/10 p-3 rounded-xl flex flex-col items-center cursor-pointer bg-red-500/20 transition-all" onClick={() => navigate('/my-task', { state: { taskFilter: 'overdue' } })}>
                  <span className="text-[8px] font-black text-red-500 uppercase">Overdue</span>
                  <span className="text-2xl font-black text-red-500 mt-1">{stats?.timeBoundActions?.overdue || 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              {/* <div className="flex-1">
                <span className="text-text-muted">Compliance Rate</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-lg font-black text-green-500">{stats?.complianceRate || 0}%</div>
                  <div className="w-20 bg-bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: `${stats?.complianceRate || 0}%` }}></div>
                  </div>
                </div>
              </div> */}
              <div className="cursor-pointer hover:opacity-80 transition-all" onClick={() => navigate('/my-task', { state: { taskFilter: 'completed_today' } })}>
                <span className="text-text-muted">Action Taken (Today)</span>
                <div className="text-lg font-black text-green-500 mt-1">{stats?.timeBoundActions?.actionTakenToday || 0}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest" onClick={() => navigate('/my-task')}>
              View All Actions <ArrowRight size={12} />
            </div>
          </div>

          {/* Box 3: Violations */}
          <div className="lg:col-span-4 bg-bg-card rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-black uppercase text-text-primary tracking-widest mb-4">Violations</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-500/10 p-3 rounded-xl flex flex-col items-center cursor-pointer bg-purple-500/20 transition-all" onClick={() => openViolationsModal('SOD')}>
                  <span className="text-[8px] font-black text-purple-500 uppercase">SOD Not Submitted</span>
                  <span className="text-2xl font-black text-purple-500 mt-1">{stats?.violations?.sodNotSubmitted || 0}</span>
                </div>
                <div className="bg-purple-500/10 p-3 rounded-xl flex flex-col items-center cursor-pointer bg-purple-500/20 transition-all" onClick={() => openViolationsModal('EOD')}>
                  <span className="text-[8px] font-black text-purple-500 uppercase">EOD Not Submitted</span>
                  <span className="text-2xl font-black text-purple-500 mt-1">{stats?.violations?.eodNotSubmitted || 0}</span>
                </div>
                <div className="bg-orange-500/10 p-3 rounded-xl flex flex-col items-center cursor-pointer bg-orange-500/20 transition-all" onClick={() => openViolationsModal('48H')}>
                  <span className="text-[8px] font-black text-orange-500 uppercase">No Update &gt; 48 Hrs</span>
                  <span className="text-2xl font-black text-orange-500 mt-1">{stats?.violations?.noUpdate48Hrs || 0}</span>
                </div>
                <div className="bg-red-500/10 p-3 rounded-xl flex flex-col items-center cursor-pointer bg-red-500/20 transition-all">
                  <span className="text-[8px] font-black text-red-500 uppercase">SLA Breached</span>
                  <span className="text-2xl font-black text-red-500 mt-1">{stats?.violations?.slaBreached || 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <div>
                <span className="text-text-muted">Total Violations</span>
                <div className="text-lg font-black text-red-500 mt-1">{(stats?.violations?.sodNotSubmitted || 0) + (stats?.violations?.eodNotSubmitted || 0) + (stats?.violations?.noUpdate48Hrs || 0) + (stats?.violations?.slaBreached || 0)}</div>
              </div>
              <div>
                <span className="text-text-muted">Critical Violations</span>
                <div className="text-lg font-black text-red-500 mt-1">{stats?.violations?.slaBreached || 0}</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest" onClick={() => navigate('/work-report')}>
              View All Violations <ArrowRight size={12} />
            </div>
          </div>
        </div>
      )}

      {user?.role === 'Admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 mt-8">
          {/* Top Urgent Cases Table */}
          <div className="lg:col-span-7 bg-bg-card border-2 border-border rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6 px-2">
              <h3 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em]">Top Urgent Cases</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-text-muted text-[8px] font-black uppercase tracking-widest border-b border-border">
                    <th className="py-2">Case ID</th>
                    <th className="py-2">Client / Party</th>
                    <th className="py-2">Type of Threat</th>
                    <th className="py-2 text-right">Amount Paid</th>
                    <th className="py-2 text-center">Last Activity</th>
                    <th className="py-2 text-center">Status</th>
                    <th className="py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] font-bold text-text-primary">
                  {(stats?.highPriorityCases || []).slice(0, 5).map((item, index) => (
                    <tr key={index} className="border-b border-border/50 last:border-b-0 hover:bg-bg-secondary/50">
                      <td className="py-3 text-accent uppercase tracking-tighter">{item.caseId || item.caseid}</td>
                      <td className="py-3">{item.clientName || item.companyName || '-'}</td>
                      <td className="py-3">{item.typeOfComplaint || item.complaintType || 'N/A'}</td>
                      <td className="py-3 text-right font-black text-emerald-600">₹{Number(item.totalAmtPaid || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3 text-center text-text-muted">{item.lastUpdateDate || '2 Hrs Ago'}</td>
                      <td className="py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-black ${item.currentStatus === 'Escalated' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {item.currentStatus || 'High Risk'}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => navigate('/case-master', { state: { searchId: item.caseId || item.caseid } })}
                          className="text-blue hover:underline font-black text-[9px] uppercase tracking-widest"
                        >
                          View Case
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-[10px] font-black text-blue hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-widest" onClick={() => navigate('/case-master', { state: { priorityFilter: 'High' } })}>
              View All Urgent Cases <ArrowRight size={12} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {/* Quick Actions Card */}
            <div className="bg-bg-card border-2 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em]">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Plus, label: 'Add Case', path: '/new-case', color: 'text-blue bg-blue-500/10' },
                  { icon: ListChecks, label: 'Create Task', path: '/my-task', color: 'text-purple bg-purple-500/10' },
                  { icon: Activity, label: 'SOD Check', path: '/work-report', color: 'text-cyan bg-cyan-500/10' },
                  { icon: BarChart, label: 'Reports & MIS', path: '/work-report', color: 'text-indigo bg-indigo-500/10' },
                ].map((btn, index) => (
                  <div
                    key={index}
                    className="bg-bg-secondary hover:bg-bg-input p-3 rounded-xl transition-all active:scale-95 flex flex-col items-center gap-2 cursor-pointer"
                    onClick={() => btn.path !== '#' && navigate(btn.path)}
                  >
                    <div className={`p-2 rounded-lg ${btn.color.split(' ')[1]} ${btn.color.split(' ')[0]}`}>
                      <btn.icon size={16} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-text-primary text-center leading-tight">{btn.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-bg-card border-2 border-border rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6 px-2">
                <Clock size={18} className="text-blue" />
                <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Recent Activity</h3>
              </div>
              <div className="space-y-6 flex-1 overflow-y-auto scrollbar-thin max-h-[420px] pr-2">
                {activities.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                    <Timer size={40} className="mx-auto mb-4" />
                    <div className="text-[10px] font-black uppercase tracking-widest">Awaiting Pulse...</div>
                  </div>
                ) : (
                  activities.map((activity, idx) => (
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
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {user?.role === 'Admin' ? (
          <div className="lg:col-span-8 flex flex-col gap-8 self-stretch">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* <div className="xl:col-span-7 bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b-2 border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart size={18} className="text-blue" />
                    <h3 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em]">Summary Trend (7 Days)</h3>
                  </div>
                </div>
                <div className="p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats?.trendData || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#4a6080"
                        fontSize={8}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis
                        stroke="#4a6080"
                        fontSize={8}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#151b28', border: '1px solid #161d2b', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="newCases"
                        name="Case Logged"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 2, stroke: '#151b28' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="closedCases"
                        name="Settled"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#151b28' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="highPriority"
                        name="High"
                        stroke="#ef4444"
                        strokeWidth={3}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#151b28' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div> */}

              {/* Legal Heat (Moved here and rearranged) */}
              {/* <div className="xl:col-span-5 flex flex-col">
                <div className="flex items-center gap-3 mb-6 px-2">
                  <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">LEGAL CASES</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  {[
                    { label: 'FIR', type: 'FIR', count: stats?.caseTypeWiseData?.find(c => c.caseType === 'FIR')?.count || 0, amount: stats?.caseTypeWiseData?.find(c => c.caseType === 'FIR')?.totalAmount || 0, color: 'red', icon: Gavel },
                    { label: 'Consumer', type: 'Consumer Complaint', count: stats?.caseTypeWiseData?.find(c => c.caseType === 'Consumer Complaint')?.count || 0, amount: stats?.caseTypeWiseData?.find(c => c.caseType === 'Consumer Complaint')?.totalAmount || 0, color: 'yellow', icon: Users, },
                    { label: 'Cyber', type: 'Cyber Complaint', count: stats?.caseTypeWiseData?.find(c => c.caseType === 'Cyber Complaint')?.count || 0, amount: stats?.caseTypeWiseData?.find(c => c.caseType === 'Cyber Complaint')?.totalAmount || 0, color: 'purple', icon: ShieldAlert, },
                    { label: 'Legal', type: 'Legal Notice', count: stats?.caseTypeWiseData?.find(c => c.caseType === 'Legal Notice')?.count || 0, amount: stats?.caseTypeWiseData?.find(c => c.caseType === 'Legal Notice')?.totalAmount || 0, color: 'blue', icon: Scale, },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className={`bg-bg-card border-2 border-border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:border-${item.color}/30 transition-all cursor-pointer shadow-sm`}
                      onClick={() => navigate('/case-master', { state: { typeFilter: item.type } })}
                    >
                      <div className="space-y-0.5 sm:space-y-1">
                        <div className="text-[10px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">{item.label}</div>
                        <div className="flex items-baseline gap-2">
                          <div className={`text-xl sm:text-2xl font-black text-${item.color}`}>{item.count}</div>
                          <div className={`text-[10px] font-bold text-${item.color} opacity-60`}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className={`text-[10px] sm:text-[10px] font-bold text-${item.color} uppercase opacity-60`}>{item.status}</div>
                      </div>
                      <div className={`mt-2 sm:mt-0 p-2 sm:p-2.5 bg-${item.color}-soft rounded-xl text-${item.color} group-hover:scale-150 transition-transform`}>
                        <item.icon size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>

            {/* High Priority Cases Table */}
            {user?.role !== 'Admin' && (
              <div className="bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm self-stretch mt-8">
                <div className="px-8 py-6 border-b-2 border-border flex items-center gap-3">
                  <AlertCircle size={20} className="text-red" />
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">High Priority Cases</h3>
                </div>
                <div className="table-wrap overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-secondary text-text-primary text-[10px] font-semibold tracking-[0.2em] uppercase border-b border-border/30">
                        <th className="px-6 py-4 text-indigo-500">Case ID</th>
                        <th className="px-6 py-4 text-blue-500">Company Name</th>
                        <th className="px-6 py-4 text-emerald-500">Client Details</th>
                        <th className="px-6 py-4 text-orange-500 text-center">Priority </th>
                        <th className="px-6 py-4 text-red-500 text-center"> Status </th>
                        <th className="px-6 py-4 text-sky-500 text-right">Last Update</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] text-text-secondary divide-y divide-border/30">
                      {stats?.highPriorityCases?.slice(0, 5).map(c => (
                        <tr
                          key={c._id}
                          className="hover:bg-bg-input/50 transition-all cursor-pointer group"
                          onClick={() => navigate('/case-master', { state: { searchId: c.caseId || c.caseid } })}
                        >
                          <td className="px-6 py-5 font-black text-accent uppercase tracking-tighter">
                            {c.caseId || c.caseid}
                          </td>
                          <td className="px-6 py-5 font-black text-blue-500 uppercase tracking-tight">
                            {c.companyName || '-'}
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-black text-green-500 leading-tight">{c.clientName}</div>
                            <div className="text-[10px] text-text-muted font-bold mt-1 tracking-wider">{c.clientMobile || '-'}</div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <Badge status={c.priority} />
                          </td>
                          <td className="px-6 py-5 text-center">
                            <Badge status={c.currentStatus} />
                          </td>
                          <td className="px-6 py-5 text-right text-text-muted font-bold italic opacity-60">
                            {c.lastUpdateDate || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>


                {stats?.highPriorityCases?.length > 5 && (
                  <div className="bg-bg-secondary/50 p-4 border-t border-border flex justify-center">
                    <button
                      onClick={() => navigate('/case-master', { state: { priorityFilter: 'High' } })}
                      className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm shadow-orange-900/10 active:scale-95"
                    >
                      View More <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Source of Complaint Table */}
            <div className="bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm self-stretch mt-1">
              <div className="px-6 py-4 border-b-2 border-border flex items-center gap-2">
                <Target size={20} className="text-accent" />
                <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">Source of Complaint</h3>
              </div>
              <div className="table-wrap overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg-secondary text-text-primary text-[10px] font-semibold tracking-[0.2em] uppercase border-b border-border/30">
                      <th className="px-4 py-2">Source</th>
                      <th className="px-4 py-2 text-center">Count</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-text-secondary divide-y divide-border/30">
                    {stats?.sourceWiseData?.map((item, idx) => {
                      let Icon = HelpCircle;
                      let colorClass = 'text-blue-500';
                      let bgClass = 'bg-blue-500/10';

                      const sourceLower = item.source.toLowerCase();
                      if (sourceLower.includes('email')) { Icon = Mail; colorClass = 'text-yellow-500'; bgClass = 'bg-yellow-500/10'; }
                      else if (sourceLower.includes('call')) { Icon = PhoneIncoming; colorClass = 'text-orange-500'; bgClass = 'bg-orange-500/10'; }
                      else if (sourceLower.includes('visit')) { Icon = Building2; colorClass = 'text-red-500'; bgClass = 'bg-red-500/10'; }
                      else if (sourceLower.includes('toll')) { Icon = Phone; colorClass = 'text-pink-500'; bgClass = 'bg-pink-500/10'; }
                      else if (sourceLower.includes('notice')) { Icon = FileText; colorClass = 'text-purple-500'; bgClass = 'bg-purple-500/10'; }
                      else if (sourceLower.includes('social')) { Icon = MessageCircle; colorClass = 'text-green-500'; bgClass = 'bg-green-500/10'; }
                      else if (sourceLower.includes('unknown')) { Icon = HelpCircle; colorClass = 'text-blue-500'; bgClass = 'bg-blue-500/10'; }

                      return (
                        <tr key={idx} className="hover:bg-bg-input/50 transition-all cursor-pointer" onClick={() => navigate('/case-master', { state: { sourceFilter: item.source } })}>
                          <td className="px-4 py-2 flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${bgClass} ${colorClass}`}>
                              <Icon size={16} />
                            </div>
                            <span className="font-black text-text-primary uppercase tracking-wider">{item.source}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-black text-blue-600">
                            {item.count}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-600">
                            ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : user?.role === 'Admin' ? (
          <div className="lg:col-span-8 bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm self-stretch">
            <div className="px-8 py-6 border-b-2 border-border flex items-center gap-3">
              <History size={20} className="text-accent" />
              <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">Recent Cases</h3>
            </div>
            <div className="table-wrap overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-secondary text-text-primary text-[10px] font-semibold tracking-[0.2em] uppercase border-b border-border/30">
                    <th className="px-6 py-4 text-indigo-500">Case ID</th>
                    <th className="px-6 py-4 text-blue-500">Company Name</th>
                    <th className="px-6 py-4 text-emerald-500">Client Details</th>
                    <th className="px-6 py-4 text-orange-500 text-center">Priority </th>
                    <th className="px-6 py-4 text-red-500 text-center"> Status </th>
                    <th className="px-6 py-4 text-sky-500 text-right">Last Update</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-text-secondary divide-y divide-border/30">
                  {stats?.recentCases?.map(c => (
                    <tr
                      key={c._id}
                      className="hover:bg-bg-input/50 transition-all cursor-pointer group"
                      onClick={() => navigate('/case-master', { state: { searchId: c.caseId || c.caseid } })}
                    >
                      <td className="px-6 py-5 font-black text-accent uppercase tracking-tighter">
                        {c.caseId || c.caseid}
                      </td>
                      <td className="px-6 py-5 font-black text-blue-500 uppercase tracking-tight">
                        {c.companyName || '-'}
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-green-500 leading-tight">{c.clientName}</div>
                        <div className="text-[10px] text-text-muted font-bold mt-1 tracking-wider">{c.clientMobile || '-'}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <Badge status={c.priority} />
                      </td>
                      <td className="px-6 py-5 text-center">
                        <Badge status={c.currentStatus} />
                      </td>
                      <td className="px-6 py-5 text-right text-text-muted font-bold italic opacity-60">
                        {c.lastUpdateDate || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}



        {/* Live Activity Feed & Source Breakdown */}
        <div className="lg:col-span-4 flex flex-col gap-8">




          {/* Recent Activity moved to Quick Actions column */}

        </div>
      </div>


      {/* Violations Popup Modal */}
      {isViolationsModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsViolationsModalOpen(false)}>
          <div className="bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex items-center justify-between text-white bg-purple">
              <div>
                <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                  <AlertTriangle size={24} />
                  {violationType} Missing Users
                </h2>
                <p className="text-[10px] opacity-80 font-black uppercase tracking-[0.2em] mt-1">
                  Users who have not submitted {violationType} today
                </p>
              </div>
              <button onClick={() => setIsViolationsModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"><X size={20} /></button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 bg-bg-card">
              {(() => {
                const users = violationType === 'SOD' ? stats?.violations?.missingSodUsers :
                  violationType === 'EOD' ? stats?.violations?.missingEodUsers :
                    stats?.violations?.missingNoUpdateUsers;

                if (!users || users.length === 0) {
                  return (
                    <div className="text-center py-12 opacity-50">
                      <CheckCircle size={48} className="mx-auto mb-4 text-green" />
                      <div className="text-sm font-black uppercase tracking-widest text-text-primary">All {violationType}s Submitted</div>
                      <div className="text-[10px] font-bold text-text-muted uppercase mt-1">Great job team!</div>
                    </div>
                  );
                }

                return users.map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-bg-input rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center text-purple font-black text-lg">
                        {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="text-sm font-black text-text-primary">{u.name}</div>
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{u.email}</div>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 bg-red-soft text-red rounded-lg text-[9px] font-black uppercase tracking-widest">
                      Missing {violationType}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardTab;

