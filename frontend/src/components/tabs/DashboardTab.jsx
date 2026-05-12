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
  Scale,
  Gavel,
  ShieldAlert,
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
      const res = await api.get(`/dashboard/stats?teamFilter=${filter}`);
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

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
  }, [teamFilter]);

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
          <div className="section-title text-xl md:text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight leading-tight">
            {user?.fullName ? `${getGreeting()}, ${user.fullName}!` : `${getGreeting()}!`}
          </div>
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
              <button onClick={() => setIsReportModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all text-white">
                <X size={24} />
              </button>
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
                </>
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
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-full sm:w-auto px-6 sm:px-10 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-text-muted hover:bg-bg-input transition-all border-2 border-transparent hover:border-border"
                >
                  {reportType === 'SOD' ? 'Skip For Now' : 'Cancel'}
                </button>
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

      {/* Today's Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div
          className="bg-bg-card border-2 border-border rounded-2xl p-3 sm:p-4 shadow-sm hover:border-purple/30 transition-all cursor-pointer"
          onClick={() => navigate('/case-master', { state: { dateFilter: new Date().toISOString().split('T')[0] } })}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-purple-soft rounded-xl text-purple">
              <FolderPlus size={14} />
            </div>
            <div className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">Case Logged Today</div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-text-primary ml-1">{stats?.casesCreatedToday || 0}</div>
        </div>

        <div
          className="bg-bg-card border-2 border-border rounded-2xl p-3 sm:p-4 shadow-sm hover:border-blue/30 transition-all cursor-pointer"
          onClick={() => navigate('/timeline', { state: { dateFilter: new Date().toISOString().split('T')[0], typeFilter: 'Document Upload' } })}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-blue-soft rounded-xl text-blue">
              <FileUp size={14} />
            </div>
            <div className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">Document Uploaded</div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-text-primary ml-1">{stats?.documentsUploadedToday || 0}</div>
        </div>

        <div
          className="bg-bg-card border-2 border-border rounded-2xl p-3 sm:p-4 shadow-sm hover:border-green/30 transition-all cursor-pointer"
          onClick={() => navigate('/timeline', { state: { dateFilter: new Date().toISOString().split('T')[0], typeFilter: 'Communication' } })}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-green-soft rounded-xl text-green">
              <PhoneOutgoing size={14} />
            </div>
            <div className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">Communication</div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-text-primary ml-1">{stats?.communicationsToday || 0}</div>
        </div>

        <div
          className="bg-bg-card border-2 border-border rounded-2xl p-3 sm:p-4 shadow-sm hover:border-orange/30 transition-all cursor-pointer"
          onClick={() => navigate('/timeline', { state: { dateFilter: new Date().toISOString().split('T')[0], typeFilter: 'Progress Update' } })}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-accent-soft rounded-xl text-accent">
              <Activity size={14} />
            </div>
            <div className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">Progress Updated</div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-text-primary ml-1">{stats?.progressUpdatesToday || 0}</div>
        </div>

        <div
          className="bg-bg-card border-2 border-border rounded-2xl p-3 sm:p-4 shadow-sm hover:border-red/30 transition-all cursor-pointer"
          onClick={() => navigate('/case-master')}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-red-soft rounded-xl text-red">
              <IndianRupee size={14} />
            </div>
            <div className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">Amount At Risk</div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-text-primary ml-1">₹{Number(stats?.totalAmountPaid || 0).toLocaleString('en-IN')}</div>
        </div>

        <div
          className="bg-bg-card border-2 border-border rounded-2xl p-3 sm:p-4 shadow-sm hover:border-blue/30 transition-all cursor-pointer"
          onClick={() => navigate('/admin-panel#refund-actions')}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-blue-soft rounded-xl text-blue">
              <ListChecks size={14} />
            </div>
            <div className="text-[8px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest">Pending Approvals</div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-text-primary ml-1">{stats?.pendingApprovals || 0}</div>
        </div>
      </div>

      {/* Main Dashboard Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-3 sm:gap-4 md:gap-6 mb-8">
        <div className="stat cursor-pointer hover:border-purple-300 transition-all" onClick={() => navigate('/case-master')}>
          <div className="stat-icon bg-purple-soft text-purple">
            <Folder size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="val text-purple-300">{stats?.totalCases || 0}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-purple/60">₹{Number(stats?.totalAmountPaid || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="lbl">Total Cases</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-blue-300 transition-all" onClick={() => navigate('/case-master')}>
          <div className="stat-icon bg-blue-soft text-blue">
            <FolderOpen size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="val text-blue-300">{(stats?.totalCases || 0) - (stats?.closedCases || 0)}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-blue/60">₹{Number((stats?.totalAmountPaid || 0) - (stats?.closedAmount || 0)).toLocaleString('en-IN')}</div>
            </div>
            <div className="lbl">Active Cases</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-green-300 transition-all" onClick={() => navigate('/case-master', { state: { statusFilter: 'Settlement' } })}>
          <div className="stat-icon bg-green-soft text-green">
            <CheckCircle size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="val text-green-300">{stats?.settledCases || 0}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-green/60">₹{Number(stats?.settledAmount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="lbl">Settled</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-emerald-300 transition-all" onClick={() => navigate('/case-master', { state: { statusFilter: 'Closure' } })}>
          <div className="stat-icon bg-emerald-500/10 text-emerald-500">
            <Hammer size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="val text-emerald-300">{stats?.closedCases || 0}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-black">₹{Number(stats?.closedAmount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="lbl">Closure</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-red-300 transition-all" onClick={() => navigate('/case-master', { state: { priorityFilter: 'High' } })}>
          <div className="stat-icon bg-red-soft text-red">
            <AlertCircle size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="val text-red-300">{stats?.highPriority || 0}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-red/60">₹{Number(stats?.highPriorityAmount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="lbl">High</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-orange-300 transition-all" onClick={() => navigate('/case-master', { state: { priorityFilter: 'Medium' } })}>
          <div className="stat-icon bg-accent-soft text-accent">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="val text-orange-300">{stats?.mediumPriority || 0}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-accent/60">₹{Number(stats?.mediumPriorityAmount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="lbl">Medium</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-yellow-300 transition-all" onClick={() => navigate('/case-master', { state: { priorityFilter: 'Low' } })}>
          <div className="stat-icon bg-yellow-500/10 text-yellow-500">
            <AlertCircle size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="val text-yellow-300">{stats?.lowPriority || 0}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-black">₹{Number(stats?.lowPriorityAmount || 0).toLocaleString('en-IN')}</div>
            </div>
            <div className="lbl">Low</div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-icon bg-blue-soft text-blue">
            <IndianRupee size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base sm:text-lg font-black text-black truncate tracking-tight" title={`₹${Number(stats?.totalRefundAmount || 0).toLocaleString('en-IN')}`}>₹{Number(stats?.totalRefundAmount || 0).toLocaleString('en-IN')}</div>
            <div className="lbl mt-1">Refund Amount</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-red-300 transition-all" onClick={() => navigate('/case-master', { state: { hasDemand: true } })}>
          <div className="stat-icon bg-red-500/10 text-red-400">
            <IndianRupee size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base font-black text-black truncate tracking-tight" title={`₹${Number(stats?.amountAtRisk || 0).toLocaleString('en-IN')}`}>₹{Number(stats?.amountAtRisk || 0).toLocaleString('en-IN')}</div>
            <div className="lbl mt-1">Total Demanded</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {user?.role === 'Admin' ? (
          <div className="lg:col-span-8 flex flex-col gap-8 self-stretch">
            {/* Top Row: Pie Chart and Team Performance side-by-side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Case Type Wise Chart */}
              <div className="bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-6 py-4 border-b-2 border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target size={18} className="text-accent" />
                    <h3 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em]">Case Type Report</h3>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 mb-6">
                    <ResponsiveContainer width="100%" height={190} minWidth={180}>
                      <PieChart>
                        <Pie
                          data={stats?.caseTypeWiseData || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                        >
                          {(stats?.caseTypeWiseData || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-bg-card border-2 border-border p-3 rounded-xl shadow-2xl">
                                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">{data.caseType}</div>
                                  <div className="text-sm font-black text-text-primary">{data.count} Cases</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-xl font-black text-text-primary leading-none">
                        {stats?.caseTypeWiseData?.reduce((sum, item) => sum + item.count, 0) || 0}
                      </div>
                      <div className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-1">Total</div>
                    </div>
                  </div>

                  {/* Legend Compact */}
                  <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                    {stats?.caseTypeWiseData?.slice(0, 6).map((item, index) => (
                      <div key={index} className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                        <div className="text-[9px] font-bold text-text-muted uppercase tracking-tight truncate">{item.caseType}</div>
                        <div className="text-[10px] font-black text-text-primary ml-auto">{item.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team Performance Compact */}
              <div className="bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-6 py-4 border-b-2 border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-accent" />
                    <h3 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em]">Team Performance</h3>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { label: 'All', value: '' },
                      { label: 'Last 7 Days', value: '7days' },
                      { label: '1 Month', value: '1month' },
                      { label: '3 Months', value: '3months' }
                    ].map(btn => (
                      <button
                        key={btn.value}
                        onClick={() => setTeamFilter(btn.value)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                          teamFilter === btn.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-bg-secondary text-text-muted hover:bg-bg-input'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-secondary text-text-primary text-[9px] font-semibold tracking-widest uppercase border-b border-border/30">
                        <th className="px-4 py-3">Member</th>
                        <th className="px-2 py-3 text-center">Total</th>
                        <th className="px-2 py-3 text-center">Done</th>
                        <th className="px-2 py-3 text-center">Tasks</th>
                        <th className="px-2 py-3 text-center">Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] text-text-secondary divide-y divide-border/30">
                      {stats?.teamPerformance?.slice(0, 8).map(member => (
                        <tr key={member.id} className="hover:bg-bg-input/50 transition-all cursor-pointer" onClick={() => navigate('/work-report', { state: { userEmail: member.email } })}>
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-text-primary truncate max-w-[80px]">{member.name.split(' ')[0]}</div>
                          </td>
                          <td className="px-2 py-2.5 text-center font-black text-blue-600">{member.assigned}</td>
                          <td className="px-2 py-2.5 text-center font-black text-emerald-600">{member.settled}</td>
                          <td className="px-2 py-2.5 text-center font-black text-purple-600">{member.pendingTasks || 0}</td>
                          <td className="px-2 py-2.5 text-center font-black text-orange-600">{member.pending}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Compact Footer */}
                <div className="bg-bg-secondary/50 p-3 border-t border-border flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-text-muted">Total Active</span>
                  <span className="text-accent">{stats?.teamPerformance?.reduce((sum, m) => sum + m.assigned, 0) || 0}</span>
                </div>
              </div>
            </div>


            {/* Middle Row: Trend and Legal Heat side-by-side */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* Summary Trend Section */}
              <div className="xl:col-span-7 bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
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
              </div>

              {/* Legal Heat (Moved here and rearranged) */}
              <div className="xl:col-span-5 flex flex-col">
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
              </div>
            </div>

            {/* High Priority Cases Table */}
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

              {/* View More Button */}
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

            {/* Source of Complaint Table */}
            <div className="bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm self-stretch mt-8">
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
        ) : (
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
        )}



        {/* Live Activity Feed & Source Breakdown */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {user?.role === 'Admin' && (
            <div className="bg-bg-card border-2 border-border rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle size={18} className="text-[#1a2332]" />
                <h3 className="text-xs font-black text-[#1a2332] uppercase tracking-widest">Violations</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div
                  className="bg-white border-2 border-border rounded-2xl p-4 cursor-pointer hover:border-purple/50 transition-all shadow-sm"
                  onClick={() => openViolationsModal('SOD')}
                >
                  <div className="text-[11px] font-black text-[#7c3aed] uppercase tracking-tight mb-2">SOD Not Submitted</div>
                  <div className="text-3xl font-black text-[#7c3aed]">{stats?.violations?.sodNotSubmitted || 0}</div>
                </div>
                <div
                  className="bg-white border-2 border-border rounded-2xl p-4 cursor-pointer hover:border-purple/50 transition-all shadow-sm"
                  onClick={() => openViolationsModal('EOD')}
                >
                  <div className="text-[11px] font-black text-[#7c3aed] uppercase tracking-tight mb-2">EOD Not Submitted</div>
                  <div className="text-3xl font-black text-[#7c3aed]">{stats?.violations?.eodNotSubmitted || 0}</div>
                </div>
              </div>
              <div className="bg-white border-2 border-border rounded-2xl p-4 shadow-sm">
                <div className="text-[11px] font-black text-[#1a2332] uppercase tracking-tight mb-2">Total Violations</div>
                <div className="text-3xl font-black text-red-500">
                  {(stats?.violations?.sodNotSubmitted || 0) + (stats?.violations?.eodNotSubmitted || 0)}
                </div>
              </div>
            </div>
          )}

          {user?.role === 'Admin' && (
            <div className="bg-bg-card border-2 border-border rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <Clock size={18} className="text-[#1a2332]" />
                <h3 className="text-xs font-black text-[#1a2332] uppercase tracking-widest">Time Bound Actions</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div
                  className="bg-white border-2 border-border rounded-xl p-3 shadow-sm cursor-pointer hover:border-red-300 transition-all active:scale-95"
                  onClick={() => navigate('/my-task', { state: { taskFilter: 'today' } })}
                >
                  <div className="text-[10px] font-black text-red-500 uppercase tracking-tight mb-1">Due Today</div>
                  <div className="text-2xl font-black text-red-500">{stats?.timeBoundActions?.dueToday || 0}</div>
                </div>
                <div
                  className="bg-white border-2 border-border rounded-xl p-3 shadow-sm cursor-pointer hover:border-orange-300 transition-all active:scale-95"
                  onClick={() => navigate('/my-task', { state: { taskFilter: '24h' } })}
                >
                  <div className="text-[10px] font-black text-orange-500 uppercase tracking-tight mb-1">Due Within 24 Hrs</div>
                  <div className="text-2xl font-black text-orange-500">{stats?.timeBoundActions?.dueWithin24h || 0}</div>
                </div>
                <div
                  className="bg-white border-2 border-border rounded-xl p-3 shadow-sm cursor-pointer hover:border-orange-200 transition-all active:scale-95"
                  onClick={() => navigate('/my-task', { state: { taskFilter: '48h' } })}
                >
                  <div className="text-[10px] font-black text-orange-400 uppercase tracking-tight mb-1">Due Within 48 Hrs</div>
                  <div className="text-2xl font-black text-orange-400">{stats?.timeBoundActions?.dueWithin48h || 0}</div>
                </div>
                <div
                  className="bg-white border-2 border-border rounded-xl p-3 shadow-sm cursor-pointer hover:border-red-400 transition-all active:scale-95"
                  onClick={() => navigate('/my-task', { state: { taskFilter: 'overdue' } })}
                >
                  <div className="text-[10px] font-black text-red-600 uppercase tracking-tight mb-1">Overdue</div>
                  <div className="text-2xl font-black text-red-600">{stats?.timeBoundActions?.overdue || 0}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* <div className="bg-white border-2 border-border rounded-xl p-4 shadow-sm">
                  <div className="text-[11px] font-black text-[#1a2332] uppercase tracking-tight mb-1">Compliance Rate</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black text-green-500">{stats?.complianceRate || 100}%</div>
                    <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full" style={{ width: `${stats?.complianceRate || 100}%` }}></div>
                    </div>
                  </div>
                </div> */}
                <div className="bg-white border-2 border-border rounded-xl p-4 shadow-sm">
                  <div className="text-[11px] font-black text-[#1a2332] uppercase tracking-tight mb-1">Action Taken (Today)</div>
                  <div className="text-2xl font-black text-green-500">{stats?.timeBoundActions?.actionTakenToday || 0}</div>
                </div>
              </div>

              <div className="mt-4 text-right">
                {/* <button
                  onClick={() => navigate('/case-master')}
                  className="text-blue-500 hover:text-blue-600 text-xs font-black uppercase tracking-widest flex items-center gap-1 justify-end w-full"
                >
                  View All Actions <ArrowRight size={14} />
                </button> */}
              </div>
            </div>
          )}

          {user?.role === 'Admin' && (
            <div className="bg-bg-card border-2 border-border rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-xs font-black text-[#1a2332] uppercase tracking-widest">Active Users</h3>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                {stats?.activeUsers?.map((u, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border-2 border-border rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <div>
                        <div className="text-xs font-black text-text-primary uppercase tracking-tight">{u.name}</div>
                        <div className="text-[10px] text-text-muted font-bold">{u.role}</div>
                        <div className="text-[9px] text-text-muted mt-1 flex flex-col gap-0.5">
                          <div>{u.loginTime ? `Login: ${new Date(u.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Login: -'}</div>
                          {u.logoutTime && <div>Logout: {new Date(u.logoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
                          {u.lastActiveTime && <div>Active: {new Date(u.lastActiveTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
                        </div>
                      </div>
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'text-green-500' : 'text-text-muted opacity-60'}`}>
                      {u.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Quick Actions */}
          {user?.role === 'Admin' && (
            <div className="bg-bg-card border-2 border-border rounded-2xl p-6 shadow-sm flex flex-col mt-4">
              <div className="flex items-center gap-3 mb-4 px-2">
                <Zap size={18} className="text-accent" />
                <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/new-case')}
                  className="bg-bg-secondary hover:bg-bg-input p-3 rounded-xl transition-all active:scale-95 flex items-center gap-3"
                >
                  <div className="p-2 bg-purple-soft rounded-lg text-purple">
                    <Plus size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-primary">New Case</span>
                </button>
                <button
                  onClick={() => navigate('/my-task')}
                  className="bg-bg-secondary hover:bg-bg-input p-3 rounded-xl transition-all active:scale-95 flex items-center gap-3"
                >
                  <div className="p-2 bg-blue-soft rounded-lg text-blue">
                    <ClipboardList size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-primary">New Task</span>
                </button>
                <button
                  onClick={() => navigate('/work-report')}
                  className="bg-bg-secondary hover:bg-bg-input p-3 rounded-xl transition-all active:scale-95 flex items-center gap-3"
                >
                  <div className="p-2 bg-green-soft rounded-lg text-green">
                    <FileText size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-primary">Work Report</span>
                </button>
                <button
                  onClick={() => navigate('/admin-panel')}
                  className="bg-bg-secondary hover:bg-bg-input p-3 rounded-xl transition-all active:scale-95 flex items-center gap-3"
                >
                  <div className="p-2 bg-orange-soft rounded-lg text-orange">
                    <Users size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-primary">Admin Panel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Today's Reports */}
      {user?.role !== 'Admin' && myReports.length > 0 && (
        <div className="bg-bg-card border-2 border-border rounded-2xl p-8 shadow-sm mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-soft rounded-xl text-blue-400 border border-blue-soft/30">
              <FileText size={20} />
            </div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">Daily Operational Logs</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myReports.map(report => (
              <div key={report._id} className="flex items-center justify-between bg-bg-input rounded-2xl px-6 py-5 border-2 border-border hover:border-accent-soft transition-all group">
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl border ${report.type === 'SOD' ? 'bg-accent-soft text-accent border-accent-soft' : 'bg-purple-soft text-purple border-purple-soft'}`}>
                    {report.type === 'SOD' ? <Send size={20} className="rotate-[-20deg]" /> : <FileText size={20} />}
                  </div>
                  <div>
                    <div className="font-black text-text-primary text-sm uppercase tracking-tight">{report.type} Log Entry</div>
                    <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mt-1">
                      {report.type === 'SOD' ? `INIT: ${report.checkInTime}` : `TERM: ${report.checkOutTime}`} &nbsp;•&nbsp; {report.date}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewingReport(report)}
                  className="px-6 py-3 bg-bg-card border-2 border-border text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-accent transition-all flex items-center gap-2 group-hover:bg-accent group-hover:text-white group-hover:border-accent shadow-sm"
                >
                  <Eye size={14} /> Analyze
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                const users = violationType === 'SOD' ? stats?.violations?.missingSodUsers : stats?.violations?.missingEodUsers;

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

