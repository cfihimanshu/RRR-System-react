import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
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
  BarChart,
  LogOut,
  Plus,
  ChevronDown,
  Search,
  ArrowRight,
  Trash2,
  Eye
} from 'lucide-react';

const DashboardTab = () => {
  const [stats, setStats] = useState(null);
  const [myRefunds, setMyRefunds] = useState([]);
  const [userCases, setUserCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [editingRefund, setEditingRefund] = useState(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState([]);
  const [activities, setActivities] = useState([]);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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
    progressScore: '8',
    moodEnergy: 'High Energy',
    challenges: '',
    sodCaseId: '',
    sodTaskTitle: '',
    sodCaseIds: [],
    sodTaskIds: []
  });

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
      const [tlRes, reportsRes] = await Promise.all([
        api.get('/timeline'),
        api.get('/reports')
      ]);

      const tlActivities = tlRes.data.map(item => ({
        id: item._id,
        type: 'timeline',
        title: item.summary,
        subtitle: `${item.caseId} — ${item.eventType}`,
        user: item.source || 'System',
        date: new Date(item.eventDate || item.createdAt),
        color: item.eventType?.toLowerCase().includes('mou') ? 'green' :
          item.eventType?.toLowerCase().includes('escalat') ? 'red' : 'blue'
      }));

      const reportActivities = reportsRes.data.map(item => ({
        id: item._id,
        type: 'report',
        title: `${item.type} Submitted Successfully`,
        subtitle: item.userEmail,
        user: item.userName || item.userEmail,
        date: new Date(item.createdAt),
        color: item.type === 'SOD' ? 'purple' : 'orange'
      }));

      const merged = [...tlActivities, ...reportActivities]
        .sort((a, b) => b.date - a.date)
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
          checkInTime: sodTime,
          checkOutTime: nowStr,
          workDuration: duration,
          workSummary: '',
          challenges: ''
        }));
      } catch (err) {
        setReportFormData(prev => ({ ...prev, checkOutTime: nowStr }));
      }
    }
    setIsReportModalOpen(true);
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

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchMyRefunds();
    fetchMyReports();
    fetchUserCases();
    fetchMyTodayTasks();
  }, []);

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
        plannedTasks: reportType === 'SOD' ? reportFormData.plannedTasks : '',
        workSummary: reportType === 'EOD' ? reportFormData.workSummary : ''
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
        progressScore: '8',
        moodEnergy: 'High Energy',
        challenges: '',
        sodCaseId: '',
        sodTaskTitle: '',
        sodCaseIds: [],
        sodTaskIds: []
      });

      if (reportType === 'SOD') {
        if (reportFormData.sodTaskTitle) {
          await api.post('/tasks', {
            title: reportFormData.sodTaskTitle,
            details: reportFormData.plannedTasks,
            priority: 'Medium',
            assignee: user?.fullName,
            caseId: reportFormData.sodCaseIds[0] || '',
            status: 'To Do',
            source: 'Manual'
          });
        }

        for (const taskId of reportFormData.sodTaskIds) {
          await api.put(`/tasks/${taskId}`, {
            status: 'In Progress',
            notes: `Planned in SOD on ${new Date().toLocaleDateString()}`
          });
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to submit ${reportType} report`;
      toast.error(errMsg, { id: loadingToast, duration: 5000 });
      console.error('Submission Error:', err.response?.data);
    }
  };

  if (!stats) return <div className="section active"><div className="empty-state">Loading...</div></div>;

  return (
    <div className="section active w-full pb-10 px-4">
      <div className="section-header flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 w-full gap-6 pt-4">
        <div className="flex-1 text-left">
          <div className="section-title text-xl md:text-2xl lg:text-3xl font-semibold text-text-primary tracking-tight leading-tight">
            {user?.fullName ? `${getGreeting()}, ${user.fullName}!` : `${getGreeting()}!`}
          </div>
          <div className="section-sub text-[10px] md:text-xs text-accent font-semibold tracking-[0.16em] mt-2 opacity-80">{user?.role} Operational Hub</div>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            {!hasSodToday && user?.role !== 'Admin' && (
              <div className="flex items-center justify-center gap-2 px-6 py-3 bg-red text-white border-none rounded-2xl text-[11px] font-black uppercase tracking-widest animate-bounce shadow-xl shadow-red-900/40">
                <AlertTriangle size={16} /> Pending SOD Submission
              </div>
            )}
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
                disabled={user?.role !== 'Admin' && !hasSodToday}
                className={`px-4 sm:px-8 py-3.5 rounded-2xl text-[10px] md:text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-[0.15em] shadow-xl active:scale-95 ${user?.role !== 'Admin' && !hasSodToday
                  ? 'bg-bg-input text-text-muted cursor-not-allowed border-2 border-border opacity-50'
                  : 'bg-accent text-white hover:bg-accent-hover shadow-orange-900/20'
                  }`}
              >
                <FileText size={16} /> Fill EOD
              </button>
            </div>
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
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-text-muted uppercase mb-2 tracking-[0.2em] ml-1 flex items-center gap-2">
                      <Target size={14} className="text-accent" /> Objectives for Today
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Define your primary operational goals for this session..."
                      className="w-full border-2 border-border rounded-xl p-6 text-sm font-medium text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none bg-bg-input transition-all shadow-inner resize-none italic placeholder:text-text-muted"
                      value={reportFormData.plannedTasks}
                      onChange={(e) => setReportFormData({ ...reportFormData, plannedTasks: e.target.value })}
                    ></textarea>
                  </div>

                  {/* Enhanced Case/Task Selection for SOD */}
                  <div className="bg-bg-secondary border-2 border-border rounded-2xl p-4 sm:p-8 space-y-8 shadow-sm">
                    <div className="flex items-center gap-3 text-accent mb-2">
                      <div className="p-3 bg-accent-soft rounded-2xl border border-accent-soft"><Zap size={22} /></div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em]">Daily Execution Task</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                          <Folder size={12} className="text-accent" /> Case Priority
                        </label>
                        <MultiSearchableSelect
                          options={userCases.map(c => ({ value: c.caseId, label: c.companyName }))}
                          selectedValues={reportFormData.sodCaseIds}
                          onChange={(vals) => setReportFormData({ ...reportFormData, sodCaseIds: vals })}
                          placeholder="Select priority case files..."
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase mb-3 tracking-[0.2em] ml-1 flex items-center gap-2">
                        <Clock size={12} className="text-purple" />Total Work Duration
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={reportFormData.workDuration}
                        className="w-full border-2 border-purple-soft/50 rounded-2xl p-4 text-sm bg-purple-soft font-black text-purple outline-none shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase mb-3 tracking-[0.2em] ml-1 flex items-center gap-2">
                        <CheckCircle size={12} className="text-purple" /> Task Completion Status
                      </label>
                      <select
                        className="w-full border-2 border-border rounded-2xl p-4 text-sm focus:border-purple outline-none bg-bg-input transition-all font-black text-text-primary uppercase tracking-widest shadow-sm"
                        value={reportFormData.completionStatus}
                        onChange={(e) => setReportFormData({ ...reportFormData, completionStatus: e.target.value })}
                      >
                        <option value="Fully Completed">Fully Completed ✅</option>
                        <option value="Partially Completed">Partially Completed ⏳</option>
                        <option value="Pending for Tomorrow">Pending for Tomorrow 📅</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-text-muted uppercase mb-3 tracking-[0.2em] ml-1 flex items-center gap-2">
                      <FileText size={14} className="text-purple" /> Work Summary
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Provide a comprehensive breakdown of technical achievements and state changes..."
                      className="w-full border-2 border-border rounded-2xl p-6 text-sm font-medium text-text-primary focus:border-purple focus:ring-4 focus:ring-purple-soft outline-none bg-bg-input transition-all shadow-inner resize-none italic placeholder:text-text-muted"
                      value={reportFormData.workSummary}
                      onChange={(e) => setReportFormData({ ...reportFormData, workSummary: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase mb-3 tracking-[0.2em] ml-1 flex items-center gap-2">
                        <BarChart size={12} className="text-purple" />Progress Score (1-10)
                      </label>
                      <select
                        className="w-full border-2 border-border rounded-2xl p-4 text-sm focus:border-purple outline-none bg-bg-input transition-all font-black text-text-primary uppercase tracking-widest shadow-sm"
                        value={reportFormData.progressScore}
                        onChange={(e) => setReportFormData({ ...reportFormData, progressScore: e.target.value })}
                      >
                        {[...Array(10)].map((_, i) => (
                          <option key={i + 1} value={i + 1} className="bg-bg-secondary">{i + 1} - {i < 4 ? 'Low' : i < 7 ? 'Average' : 'Peak Performance'}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase mb-3 tracking-[0.2em] ml-1 flex items-center gap-2">
                        <Zap size={12} className="text-purple" /> Mood / Energy
                      </label>
                      <select
                        className="w-full border-2 border-border rounded-2xl p-4 text-sm focus:border-purple outline-none bg-bg-input transition-all font-black text-text-primary uppercase tracking-widest shadow-sm"
                        value={reportFormData.moodEnergy}
                        onChange={(e) => setReportFormData({ ...reportFormData, moodEnergy: e.target.value })}
                      >
                        <option value="High Energy" className="bg-bg-secondary">🔥 Maximum Velocity</option>
                        <option value="Balanced" className="bg-bg-secondary">⚖️ Optimal Equilibrium</option>
                        <option value="Tired but Productive" className="bg-bg-secondary">😴 Fatigue/High Focus</option>
                        <option value="Low Energy" className="bg-bg-secondary">🔋 Critical Battery</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-text-muted uppercase mb-3 tracking-[0.2em] ml-1 flex items-center gap-2">
                      <AlertCircle size={14} className="text-red" />Blockers / Challenges
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Identify any architectural or operational bottlenecks encountered..."
                      className="w-full border-2 border-border rounded-2xl p-5 text-sm font-medium text-text-primary focus:border-red focus:ring-4 focus:ring-red-soft outline-none bg-bg-input transition-all shadow-inner resize-none italic placeholder:text-text-muted"
                      value={reportFormData.challenges}
                      onChange={(e) => setReportFormData({ ...reportFormData, challenges: e.target.value })}
                    ></textarea>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-10 border-t-2 border-border">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-full sm:w-auto px-6 sm:px-10 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-text-muted hover:bg-bg-input transition-all border-2 border-transparent hover:border-border"
                >
                  {reportType === 'SOD' ? 'Skip For Now' : 'Cancel Sync'}
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

      {/* Main Dashboard Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-8">
        <div className="stat cursor-pointer hover:border-blue-300 transition-all" onClick={() => navigate('/case-master')}>
          <div className="stat-icon bg-purple-soft text-purple">
            <Folder size={18} />
          </div>
          <div>
            <div className="val text-purple-300">{stats.totalCases}</div>
            <div className="lbl">Total Cases</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-green-300 transition-all" onClick={() => navigate('/case-master', { state: { statusFilter: 'Closed' } })}>
          <div className="stat-icon bg-green-soft text-green">
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="val text-green-300">{stats.settledCases}</div>
            <div className="lbl">Settled / Closed</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-red-300 transition-all" onClick={() => navigate('/case-master', { state: { priorityFilter: 'High' } })}>
          <div className="stat-icon bg-red-soft text-red">
            <AlertCircle size={18} />
          </div>
          <div>
            <div className="val text-red-300">{stats.highPriority}</div>
            <div className="lbl">High Priority</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-orange-300 transition-all" onClick={() => navigate('/case-master', { state: { priorityFilter: 'Medium' } })}>
          <div className="stat-icon bg-accent-soft text-accent">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="val text-orange-300">{stats.mediumPriority}</div>
            <div className="lbl">Medium Priority</div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-icon bg-blue-soft text-blue">
            <IndianRupee size={18} />
          </div>
          <div>
            <div className="val text-teal-300">₹{Number(stats.totalRefundAmount || 0).toLocaleString('en-IN')}</div>
            <div className="lbl">Refund Amount</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {/* Recent Cases Table */}
        <div className="lg:col-span-8 bg-bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm self-stretch">
          <div className="px-8 py-6 border-b-2 border-border flex items-center gap-3">
            <History size={20} className="text-accent" />
            <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">Recent Cases</h3>
          </div>
          <div className="table-wrap overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-secondary text-text-primary text-[10px] font-semibold tracking-[0.2em] uppercase border-b border-border/30">
                  <th className="px-6 py-4 text-indigo-200">Case ID</th>
                  <th className="px-6 py-4 text-cyan-200">Company Name</th>
                  <th className="px-6 py-4 text-emerald-200">Client Details</th>
                  <th className="px-6 py-4 text-orange-200 text-center">Priority </th>
                  <th className="px-6 py-4 text-fuchsia-200 text-center"> Status </th>
                  <th className="px-6 py-4 text-sky-200 text-right">Last Update</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-text-secondary divide-y divide-border/30">
                {stats.recentCases.map(c => (
                  <tr
                    key={c._id}
                    className="hover:bg-bg-input/50 transition-all cursor-pointer group"
                    onClick={() => navigate('/case-master', { state: { searchId: c.caseId || c.caseid } })}
                  >
                    <td className="px-6 py-5 font-black text-accent uppercase tracking-tighter">
                      {c.caseId || c.caseid}
                    </td>
                    <td className="px-6 py-5 font-black text-blue-300 uppercase tracking-tight">
                      {c.companyName || '-'}
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-black text-green-300 leading-tight">{c.clientName}</div>
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

        {/* Live Activity Feed */}
        <div className="lg:col-span-4 bg-bg-card border-2 border-border rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6 px-2">
            <Clock size={18} className="text-blue" />
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Live Activity</h3>
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

    </div>
  );
};

export default DashboardTab;
