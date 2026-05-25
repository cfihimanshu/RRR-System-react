import React, { useEffect, useState, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import {
  AlertTriangle,
  Send,
  FileText,
  X,
  Target,
  Users,
  Timer,
  LogOut,
  Trash2,
  Check,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Zap,
  Building2,
  ChevronRight,
  Plus,
  Scale,
  ShieldAlert,
  MessageCircle,
  HelpCircle,
  Clock,
  Camera,
  MapPin,
  RefreshCw
} from 'lucide-react';

const LegalDashboardTab = () => {
  const { user } = useContext(AuthContext);
  const [hasSodToday, setHasSodToday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('SOD');
  const [userCases, setUserCases] = useState([]);
  const [myTodayTasks, setMyTodayTasks] = useState([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState([]);
  const [timeStr, setTimeStr] = useState('');
  const [isEodMissed, setIsEodMissed] = useState(false);
  const [bypassEodCheck, setBypassEodCheck] = useState(false);
  const [stats, setStats] = useState(null);

  const [reportFormData, setReportFormData] = useState({
    plannedTasks: '',
    checkInTime: '',
    checkOutTime: '',
    workDuration: '',
    completionStatus: 'Fully Completed',
    workSummary: '',
    progressScore: '',
    moodEnergy: '',
    eodCompletedTaskIds: [],
    sodTasks: [{ type: 'Case ID', caseId: '', task: '', mode: '' }]
  });

  const [selfie, setSelfie] = useState('');
  const [coords, setCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsError, setGpsError] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef(null);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300, facingMode: 'user' } });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access failed:', err);
      setIsCameraActive(false);
      toast.error('Camera access blocked! Please click the camera icon with the red line in your browser address bar (top left of the page) and select "Allow".', {
        duration: 7000,
        style: { borderRadius: '15px', fontWeight: 'bold' }
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelfie(dataUrl);
      stopCamera();
      toast.success('Selfie captured successfully!');
    }
  };

  const fetchGPSLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGpsStatus('success');
      },
      (err) => {
        console.error('GPS fetch failed:', err);
        setGpsStatus('error');
        setGpsError(err.message || 'Permission denied or timed out');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (isReportModalOpen && (reportType === 'SOD' || reportType === 'EOD')) {
      setSelfie('');
      setCoords(null);
      setGpsStatus('idle');
      setGpsError('');
      fetchGPSLocation();
      startCamera();
    } else {
      stopCamera();
    }
  }, [isReportModalOpen, reportType]);

  // Live Clock Effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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
      if (diffMs < 0) return '0h 0m';

      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);

      return `${diffHrs}h ${diffMins}m`;
    } catch (e) {
      return 'Calculating...';
    }
  };

  const fetchUserCases = async () => {
    try {
      const res = await api.get('/cases?limit=100');
      setUserCases(res.data.cases || (Array.isArray(res.data) ? res.data : []));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyTodayTasks = async () => {
    try {
      const res = await api.get('/tasks');
      const taskList = res.data.tasks || (Array.isArray(res.data) ? res.data : []);
      const pending = taskList.filter(t => t.status !== 'Completed' && t.status !== 'Done');
      setMyTodayTasks(pending);
    } catch (err) {
      console.error(err);
    }
  };

  const checkSodStatus = async () => {
    if (['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant'].includes(user?.role)) return;
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const res = await api.get('/reports?limit=100');
      const reportList = res.data.reports || (Array.isArray(res.data) ? res.data : res.data || []);

      const todaysSod = reportList.find(r =>
        r.type === 'SOD' &&
        r.date === today &&
        r.userEmail?.trim().toLowerCase() === user?.email?.trim().toLowerCase()
      );

      setHasSodToday(!!todaysSod);

      // Check EOD Missed status via reports stats endpoint
      try {
        const statsRes = await api.get('/reports/stats');
        // If they missed EOD, they are blocked unless bypass is active
        setIsEodMissed(statsRes.data?.isEodMissed || false);
        setBypassEodCheck(statsRes.data?.bypassEodCheck || false);
      } catch (e) {
        console.error('Failed to fetch report stats', e);
      }

      if (!todaysSod && !['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant'].includes(user?.role)) {
        setTimeout(() => {
          openReportModal('SOD');
        }, 800);
      }
    } catch (err) {
      console.error('Error checking SOD status:', err);
      setHasSodToday(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      const data = res.data;

      if (data.caseTypeWiseData) {
        const dbData = data.caseTypeWiseData;
        const fixedTypes = [
          '1930 Cyber Complaint',
          'Consumer Complaint',
          'Legal Notice',
          'Demand Pressure',
          'Social Media',
          'NA Non Agreement'
        ];

        const finalData = fixedTypes.map(type => {
          const matchingItems = dbData.filter(i => {
            const key = (i.caseType || '').toLowerCase().trim();
            const label = type === 'NA Non Agreement' ? 'na non agreement' : type.toLowerCase().trim();
            return key === label;
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
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    }
  };

  useEffect(() => {
    if (user?.email) {
      checkSodStatus();
      fetchUserCases();
      fetchMyTodayTasks();
      fetchDashboardStats();
    }
  }, [user]);

  const openReportModal = async (type) => {
    if (type === 'EOD' && !hasSodToday) {
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
      let duration = 'Calculating...';
      try {
        const res = await api.get('/reports?limit=10');
        const today = new Date().toISOString().split('T')[0];
        const reportList = res.data.reports || (Array.isArray(res.data) ? res.data : res.data || []);
        const mySod = reportList.find(r => r.type === 'SOD' && r.date === today);

        const sodTime = mySod?.checkInTime || '09:00 AM';
        const duration = calculateDuration(sodTime);

        setReportFormData(prev => ({
          ...prev,
          checkOutTime: nowStr,
          workDuration: duration,
          workSummary: '',
          challenges: '',
          eodCompletedTaskIds: []
        }));
        fetchMyTodayTasks();
      } catch (err) {
        setReportFormData(prev => ({ ...prev, checkOutTime: nowStr }));
        fetchMyTodayTasks();
      }
    }
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const loadingToast = toast.loading(`Submitting ${reportType} report...`);
    
    // GPS & Selfie Verification Validation
    if (!selfie) {
      toast.error('Please capture your GPS Verification Selfie first!', { id: loadingToast });
      setIsSubmitting(false);
      return;
    }
    if (gpsStatus !== 'success' || !coords) {
      toast.error('GPS coordinates are required to submit the report!', { id: loadingToast });
      setIsSubmitting(false);
      return;
    }

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
        moodEnergy: reportType === 'EOD' ? reportFormData.moodEnergy : '',
        selfieUrl: selfie,
        latitude: coords?.latitude,
        longitude: coords?.longitude
      };

      await api.post('/reports', payload);
      toast.success(`${reportType} report submitted successfully`, { id: loadingToast });
      setIsReportModalOpen(false);

      if (reportType === 'SOD') {
        setHasSodToday(true);
      }

      await checkSodStatus();
      await fetchDashboardStats();

      setReportFormData({
        plannedTasks: '',
        checkInTime: '',
        checkOutTime: '',
        workDuration: '',
        completionStatus: 'Fully Completed',
        workSummary: '',
        progressScore: '',
        moodEnergy: '',
        eodCompletedTaskIds: [],
        sodTasks: [{ type: 'Case ID', caseId: '', task: '', mode: '' }]
      });

      setSelfie('');
      setCoords(null);

      if (reportType === 'SOD') {
        for (const t of reportFormData.sodTasks) {
          const isCaseTask = t.type === 'Case ID';
          const taskDescription = isCaseTask ? `Case Follow-up: ${t.caseId}` : t.task;

          if (isCaseTask || t.task.trim()) {
            await api.post('/tasks', {
              title: `SOD: ${t.mode} - ${taskDescription.substring(0, 40)}`,
              details: `Session Task: ${taskDescription}\nMode: ${t.mode}\nType: ${t.type}\nCreated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`,
              priority: 'Medium',
              assignee: user?.fullName,
              dueDate: today,
              caseId: isCaseTask ? t.caseId : '',
              status: 'To Do',
              source: 'SOD Auto'
            });
          }
        }
      }

      if (reportType === 'EOD') {
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
    } finally {
      setIsSubmitting(false);
    }
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

  const toggleTaskExpansion = (taskId) => {
    setExpandedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  return (
    <div className="section active w-full pb-10 px-8 bg-bg-primary min-h-screen overflow-x-hidden">
      {/* Header Greeting */}
      <div className="section-header flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 w-full gap-6 pt-4 border-b border-border/50 pb-6">
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-bg-card text-text-primary border border-border rounded-2xl shadow-md">
              <Scale size={24} />
            </div>
            <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">Overview</h1>
          </div>
        </div>

        {/* SOD/EOD Action Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            {!hasSodToday && !['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant'].includes(user?.role) && (
              <div className="flex items-center justify-center gap-2 px-6 py-3 bg-red text-white border-none rounded-2xl text-[11px] font-black uppercase tracking-widest animate-bounce shadow-xl shadow-red-900/40">
                <AlertTriangle size={16} /> Pending SOD Submission
              </div>
            )}
            {!['Admin', 'Super Admin', 'SuperAdmin', 'Reviewer', 'Accountant'].includes(user?.role) && (
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

      {/* Main Content Layout */}
      <div className="space-y-6 mb-8">
        {/* TYPE OF THREAT - SUMMARY */}
        <div className="bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
          <div className="text-[10px] font-black uppercase text-text-muted tracking-widest mb-4">TYPE OF THREAT – SUMMARY</div>
          <div className="grid grid-cols-2 md:grid-cols-3 2xl:flex 2xl:justify-between 2xl:items-start gap-4">
            {[
              { label: '1930 Cyber Complaint', type: '1930 Cyber Complaint', color: 'text-blue', bg: 'bg-blue-soft', icon: ShieldAlert },
              { label: 'Consumer Complaint', type: 'Consumer Complaint', color: 'text-green', bg: 'bg-green-soft', icon: Users },
              { label: 'Legal Notice', type: 'Legal Notice', color: 'text-purple', bg: 'bg-purple-soft', icon: Scale },
              { label: 'Demand Pressure', type: 'Demand Pressure', color: 'text-orange', bg: 'bg-orange-soft', icon: AlertTriangle },
              { label: 'Social Media', type: 'Social Media', color: 'text-cyan', bg: 'bg-cyan-soft', icon: MessageCircle },
              { label: 'NA (Non-Agreement)', type: 'NA Non Agreement', color: 'text-yellow', bg: 'bg-yellow-soft', icon: HelpCircle },
            ].map((item, index) => {
              const dbItem = stats?.caseTypeWiseData?.find(c => c.caseType === item.type) || { count: 0, totalAmount: 0 };
              const IconComponent = item.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col flex-1 min-w-[100px] 2xl:border-r border-border last:border-r-0 2xl:pr-2 hover:bg-bg-secondary/30 transition-all rounded-lg p-2 2xl:p-0"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className={`p-1 ${item.bg} rounded ${item.color}`}>
                      <IconComponent size={12} />
                    </div>
                    <div className={`text-[9px] font-black uppercase tracking-tight ${item.color}`} title={item.label}>{item.label}</div>
                  </div>
                  <div className="text-xl font-black text-text-primary tracking-tight">{dbItem.count}</div>
                  <div className="text-[9px] font-bold text-text-muted mt-0.5">₹{Number(dbItem.totalAmount || 0).toLocaleString('en-IN')}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MY TASKS – SOD TO EOD */}
        <div className="bg-bg-card rounded-2xl p-5 shadow-sm border border-border/50">
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
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Daily Checklist</span>
                    <span className="font-black whitespace-nowrap">{stats?.timeBoundActions?.completedTasksToday || 0} / {stats?.timeBoundActions?.totalTasksToday || 0}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Priority Cases Plan</span>
                    <span className="font-black whitespace-nowrap">{stats?.closedCriticalCases || 0} / {stats?.totalCriticalCases || 0}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Yesterday's EOD</span>
                    <span className="font-black whitespace-nowrap">{stats?.yesterdayEodFilled ? 'Filled' : 'Pending'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-t border-border/30 pt-3">
                <span className="text-text-muted">SOD Submitted At</span>
                <span className={stats?.todaySod ? "text-green font-bold" : "text-red font-bold"}>
                  {stats?.todaySod ? new Date(stats.todaySod.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pending'}
                </span>
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
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Case Updates</span>
                    <span className="font-black whitespace-nowrap">{stats?.progressUpdatesToday || 0}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Client Comms</span>
                    <span className="font-black whitespace-nowrap">{stats?.communicationsToday || 0}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Doc Uploads</span>
                    <span className="font-black whitespace-nowrap">{stats?.documentsUploadedToday || 0}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-t border-border/30 pt-3">
                <span className="text-text-muted">Last Submission</span>
                <span className="text-blue font-bold">
                  {stats?.lastTimeline ? new Date(stats.lastTimeline.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'No Activity'}
                </span>
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
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Daily Case Summary</span>
                    <span className="font-black whitespace-nowrap">{stats?.progressUpdatesToday > 0 ? '1 / 1' : '0 / 1'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Calls & Meetings</span>
                    <span className="font-black whitespace-nowrap">{stats?.communicationsToday > 0 ? '1 / 1' : '0 / 1'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-text-secondary gap-2">
                    <span className="truncate">Next Day Plan</span>
                    <span className="font-black whitespace-nowrap">{stats?.todayEod ? '1 / 1' : '0 / 1'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-t border-border/30 pt-3">
                <span className="text-text-muted">EOD Due By</span>
                <span className="text-purple font-bold">08:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SOD/EOD Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-bg-card border-2 border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-visible animate-in zoom-in-95 duration-300">
            <div className={`p-8 flex items-center justify-between text-white rounded-t-3xl ${reportType === 'SOD' ? 'bg-accent' : 'bg-purple'}`}>
              <div>
                <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight">
                  {reportType === 'SOD' ? <Send size={24} className="rotate-[-20deg]" /> : <LogOut size={24} />}
                  New {reportType}
                </h2>
                <p className="text-[10px] opacity-80 font-black uppercase tracking-[0.2em] mt-2">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              {!(reportType === 'SOD' && !hasSodToday) && (
                <button onClick={() => setIsReportModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all text-white">
                  <X size={24} />
                </button>
              )}
            </div>

            <form onSubmit={handleReportSubmit} className="p-4 sm:p-8 space-y-8 text-left max-h-[70vh] overflow-y-auto hide-scrollbar bg-bg-card rounded-b-3xl">
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
                isEodMissed && !bypassEodCheck ? (
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
                          <div key={index} className="flex flex-col lg:flex-row items-end gap-4 p-5 bg-bg-secondary/50 rounded-2xl border-2 border-border relative group shadow-sm transition-all hover:bg-bg-secondary">
                            {/* Task Type Selector */}
                            <div className="flex-1 space-y-2 w-full">
                              <label className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Selection</label>
                              <select
                                className="w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-[11px] font-black text-text-primary outline-none focus:border-accent transition-all uppercase tracking-widest cursor-pointer h-[48px]"
                                value={t.type}
                                onChange={(e) => updateSodTaskRow(index, 'type', e.target.value)}
                              >
                                <option value="Case ID">Case ID</option>
                                <option value="Tasks">Tasks</option>
                              </select>
                            </div>

                            {/* Dynamic Input (Case Search or Task Text) */}
                            <div className="flex-2 space-y-2 min-w-0 w-full">
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
                            <div className="flex-1 space-y-2 w-full">
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
                      <div className="bg-bg-input border-2 border-border rounded-2xl p-4 space-y-2 max-h-[200px] overflow-y-auto hide-scrollbar">
                        {myTodayTasks.length > 0 ? (
                          myTodayTasks.map(task => (
                            <div key={task._id} className="flex items-center gap-3 p-3 bg-bg-card rounded-xl border border-border hover:border-accent/30 transition-all">
                              <div className="w-2 h-2 rounded-full bg-accent/60"></div>
                              <span className="text-[11px] font-bold text-text-primary flex-1">{task.title || task.task}</span>
                              <span className="text-[9px] font-black text-text-muted uppercase bg-bg-input px-2 py-0.5 rounded-md">{task.priority || 'Normal'}</span>
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
                  <div className="space-y-4 pt-4 border-t-2 border-border">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                      <CheckCircle size={14} className="text-purple" /> Task Completion Checklist
                    </label>

                    <div className="grid grid-cols-1 gap-3 max-h-[260px] overflow-y-auto pr-2 scrollbar-thin">
                      {myTodayTasks.length === 0 ? (
                        <div className="p-8 text-center bg-bg-input border-2 border-dashed border-border rounded-2xl opacity-50">
                          <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">No active tasks to review</div>
                        </div>
                      ) : (
                        myTodayTasks.map(task => (
                          <div key={task._id} className="flex flex-col bg-bg-input border-2 border-border rounded-2xl overflow-hidden transition-all hover:border-purple/30">
                            <div className={`flex items-center gap-4 p-4 ${reportFormData.eodCompletedTaskIds?.includes(task._id) ? 'bg-purple/5' : ''}`}>
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
                                {task.caseId && userCases?.find(c => c.caseId === task.caseId)?.companyName && (
                                  <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5 text-accent opacity-80 flex items-center gap-1">
                                    <Building2 size={10} /> {userCases.find(c => c.caseId === task.caseId).companyName}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleTaskExpansion(task._id)}
                                className={`p-2 rounded-xl transition-all ${expandedTaskIds.includes(task._id) ? 'bg-purple text-white shadow-lg' : 'hover:bg-bg-secondary text-text-muted'}`}
                              >
                                <ChevronRight size={16} className={`transition-transform duration-300 ${expandedTaskIds.includes(task._id) ? 'rotate-90' : ''}`} />
                              </button>
                            </div>

                            {expandedTaskIds.includes(task._id) && (
                              <div className="px-14 pb-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="p-4 bg-bg-card rounded-xl border border-border">
                                  <div className="text-[9px] font-black text-purple uppercase tracking-[0.15em] mb-2">Task Details & Context</div>
                                  <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-line italic">
                                    {task.details || 'No additional details provided for this task.'}
                                  </p>
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

              {(reportType === 'SOD' || reportType === 'EOD') && (
                <div className="flex flex-col gap-6 bg-bg-secondary/40 p-6 rounded-3xl border-2 border-border mt-6">
                  {/* GPS Tracking Panel */}
                  <div className="p-5 bg-bg-card rounded-2xl border border-border shadow-sm w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-text-muted uppercase mb-2 tracking-[0.2em] flex items-center gap-2">
                          <MapPin size={14} className="text-accent" /> GPS Verification
                        </label>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                            <MapPin size={20} />
                            {gpsStatus === 'success' && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black uppercase text-text-primary">
                              {gpsStatus === 'loading' && 'Acquiring Satellites...'}
                              {gpsStatus === 'success' && 'Coordinates Locked'}
                              {gpsStatus === 'error' && 'Satellite Lock Failed'}
                              {gpsStatus === 'idle' && 'GPS Inactive'}
                            </div>
                            <div className="text-[10px] font-bold text-text-muted mt-0.5 leading-relaxed">
                              {gpsStatus === 'loading' && 'Querying browser geolocation telemetry...'}
                              {gpsStatus === 'success' && coords && (
                                <div className="font-mono text-[10px] text-green-400 font-bold bg-green-500/10 px-2.5 py-0.5 rounded-md mt-1 inline-block border border-green-500/20">
                                  LAT: {coords.latitude.toFixed(6)} | LNG: {coords.longitude.toFixed(6)}
                                </div>
                              )}
                              {gpsStatus === 'error' && (
                                <span className="text-red-400 font-bold block text-[9px]">{gpsError || 'Please enable GPS permissions.'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center sm:self-end">
                        {gpsStatus === 'error' && (
                          <button
                            type="button"
                            onClick={fetchGPSLocation}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-[10px] font-black uppercase tracking-wider text-accent border border-accent/20 bg-accent/5 hover:bg-accent hover:text-white transition-all active:scale-95"
                          >
                            <RefreshCw size={12} className="animate-spin" /> Retry GPS Lock
                          </button>
                        )}
                        {gpsStatus === 'success' && (
                          <div className="py-2 px-4 bg-green-500/5 rounded-xl border border-green-500/10 text-center">
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                              <Check size={12} strokeWidth={3} className="text-green-400" /> Location Locked
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selfie Verification Panel */}
                  <div className="flex flex-col items-center p-4 sm:p-6 bg-bg-card rounded-2xl border border-border shadow-sm w-full">
                    <label className="block text-[10px] font-black text-text-muted uppercase mb-4 tracking-[0.2em] flex items-center gap-2 self-start ml-1">
                      <Camera size={14} className="text-accent" /> GPS Selfie Capture
                    </label>

                    <div className="w-full flex flex-col items-center mt-1">
                      {selfie ? (
                        <div className="w-full flex flex-col items-center">
                          <div className="w-full max-w-[480px] aspect-[4/3] rounded-2xl overflow-hidden border border-border shadow-lg bg-black">
                            <img src={selfie} alt="Selfie" className="w-full h-full object-cover animate-in fade-in duration-300" />
                          </div>
                          <button
                            type="button"
                            onClick={() => { setSelfie(''); startCamera(); }}
                            className="mt-4 w-full max-w-[480px] bg-bg-input hover:bg-bg-secondary border border-border/80 p-3.5 rounded-2xl text-text-primary transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            <RefreshCw size={14} /> Retake Photo
                          </button>
                        </div>
                      ) : isCameraActive ? (
                        <div className="w-full flex flex-col items-center">
                          <div className="relative w-full max-w-[480px] aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-black shadow-lg">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover transform -scale-x-100"
                            />
                            <div className="absolute inset-0 border-4 border-accent/40 rounded-full m-8 pointer-events-none border-dashed animate-pulse"></div>
                          </div>
                          <button
                            type="button"
                            onClick={captureSelfie}
                            className="mt-4 w-full max-w-[480px] bg-accent hover:bg-accent-hover py-3.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest shadow-xl border border-accent/20 active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Camera size={16} /> Capture Selfie
                          </button>
                        </div>
                      ) : (
                        <div className="w-full max-w-[480px] aspect-[4/3] rounded-2xl border-2 border-dashed border-border bg-bg-secondary/20 flex flex-col items-center justify-center p-6 text-center">
                          <div className="p-4 bg-accent/5 rounded-full text-accent/50 border border-accent/10 mb-4 animate-bounce">
                            <Camera size={32} />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={startCamera}
                              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                            >
                              Activate Camera
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-10 border-t-2 border-border mt-6">
                {!(reportType === 'SOD' && !hasSodToday) && (
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="w-full sm:w-auto px-6 sm:px-10 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-text-secondary hover:bg-bg-secondary transition-all border-2 border-transparent hover:border-border"
                  >
                    {reportType === 'SOD' ? 'Skip For Now' : 'Cancel'}
                  </button>
                )}
                {!(reportType === 'SOD' && isEodMissed && !bypassEodCheck) && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full sm:w-auto px-6 sm:px-12 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white shadow-sm transition-all flex items-center justify-center gap-3 active:scale-95 ${isSubmitting ? 'opacity-70 cursor-wait' : ''
                      } ${reportType === 'SOD' ? 'bg-accent hover:bg-accent-hover' : 'bg-purple hover:bg-purple-600'}`}
                  >
                    <Send size={18} /> {isSubmitting ? 'Submitting...' : `Submit ${reportType}`}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalDashboardTab;
