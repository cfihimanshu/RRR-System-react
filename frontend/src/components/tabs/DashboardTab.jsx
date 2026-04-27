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
  ArrowRight
} from 'lucide-react';

const DashboardTab = () => {
  const [stats, setStats] = useState(null);
  const [myRefunds, setMyRefunds] = useState([]);
  const [userCases, setUserCases] = useState([]); 
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [editingRefund, setEditingRefund] = useState(null);
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
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/reports');
      const hasSod = res.data.some(r => r.type === 'SOD' && r.date === today && r.userEmail === user.email);
      setHasSodToday(hasSod);
      
      // Auto-open SOD modal if not filled today
      if (!hasSod) {
        setTimeout(() => {
          openReportModal('SOD');
        }, 1000);
      }
    } catch (err) {
      console.error('Error checking SOD status:', err);
    }
  };

  useEffect(() => {
    checkSodStatus();
  }, [user]);

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
      fetchMyRefunds();
    } catch (err) {
      toast.error('Failed to submit refund request');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(`Submitting ${reportType} report...`);
    try {
      const today = new Date().toISOString().split('T')[0];
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
      checkSodStatus();
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
      <div className="section-header flex justify-between items-center mb-6 w-full">
        <div className="flex-1 text-left">
          <div className="section-title text-2xl font-bold text-gray-800">
            {user?.fullName ? `${getGreeting()}, ${user.fullName}!` : `${getGreeting()}!`}
          </div>
          <div className="section-sub text-blue-600 font-semibold">{user?.role} Dashboard Overview</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            {!hasSodToday && user?.role !== 'Admin' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-red-600 text-[10px] font-black uppercase tracking-wider animate-pulse">
                <AlertTriangle size={12} /> SOD Pending
              </div>
            )}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/new-case')}
                className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} /> New Case
              </button>
              <button 
                onClick={() => openReportModal('SOD')}
                className="bg-white border-2 border-blue-300 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Send size={14} className="rotate-[-20deg]" /> Fill SOD
              </button>
              <button 
                onClick={() => openReportModal('EOD')}
                className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
              >
                <FileText size={14} /> Fill EOD
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SOD/EOD View Report Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setViewingReport(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className={`p-6 flex items-center justify-between text-white ${viewingReport.type === 'SOD' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-indigo-600 to-indigo-700'}`}>
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  {viewingReport.type === 'SOD' ? <Send size={20} /> : <FileText size={20} />}
                  {viewingReport.type} Report — {viewingReport.date}
                </h2>
                <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-1">Submitted by {viewingReport.userName}</p>
              </div>
              <button onClick={() => setViewingReport(null)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Submitted By</div>
                  <div className="font-black text-gray-800 text-sm">{viewingReport.userName || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{viewingReport.type === 'SOD' ? 'Check-In Time' : 'Check-Out Time'}</div>
                  <div className="font-black text-gray-800 text-sm">{viewingReport.type === 'SOD' ? viewingReport.checkInTime : viewingReport.checkOutTime || '—'}</div>
                </div>
              </div>
              {viewingReport.type === 'SOD' ? (
                <>
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Target size={12} /> Today's Planned Tasks</div>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{viewingReport.plannedTasks || 'No planned tasks provided.'}</p>
                  </div>
                  {viewingReport.sodCaseIds?.length > 0 && (
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Assigned Cases for Today</div>
                      <div className="flex flex-wrap gap-2">
                        {viewingReport.sodCaseIds.map(cid => (
                          <span key={cid} className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wide">{cid}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Work Duration</div>
                      <div className="font-black text-gray-800 text-sm">{viewingReport.workDuration || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Completion Status</div>
                      <div className="font-black text-gray-800 text-sm">{viewingReport.completionStatus || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Progress Score</div>
                      <div className="font-black text-gray-800 text-sm">{viewingReport.progressScore ? `${viewingReport.progressScore}/10` : '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mood / Energy</div>
                      <div className="font-black text-gray-800 text-sm">{viewingReport.moodEnergy || '—'}</div>
                    </div>
                  </div>
                  <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                    <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Work Summary</div>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{viewingReport.workSummary || 'No summary provided.'}</p>
                  </div>
                  {viewingReport.challenges && (
                    <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                      <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Challenges / Blockers</div>
                      <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{viewingReport.challenges}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button onClick={() => setViewingReport(null)} className="px-8 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* SOD/EOD Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-visible animate-in zoom-in duration-300">
            <div className={`p-6 flex items-center justify-between text-white ${reportType === 'SOD' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-indigo-600 to-indigo-700'}`}>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {reportType === 'SOD' ? <Send size={24} /> : <LogOut size={24} />} 
                  New {reportType} Report
                </h2>
                <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit} className="p-8 space-y-6 text-left max-h-[80vh] overflow-y-auto hide-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                    <Users size={12} /> Your Name
                  </label>
                  <input 
                    type="text" 
                    readOnly 
                    value={user?.fullName} 
                    className="w-full border-2 border-gray-400 rounded-xl p-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                    {reportType === 'SOD' ? <><Timer size={12} /> Check-in Time</> : <><LogOut size={12} /> Check-out Time</>}
                  </label>
                  <input 
                    type="text" 
                    readOnly 
                    value={reportType === 'SOD' ? reportFormData.checkInTime : reportFormData.checkOutTime} 
                    className="w-full border-2 border-gray-400 rounded-xl p-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none"
                  />
                </div>
              </div>

              {reportType === 'SOD' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                      <Target size={12} /> Today's Planned Task
                    </label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="What are your main goals for today?"
                      className="w-full border-2 border-gray-500 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50/20 resize-none transition-all"
                      value={reportFormData.plannedTasks}
                      onChange={(e) => setReportFormData({...reportFormData, plannedTasks: e.target.value})}
                    ></textarea>
                  </div>
                  {/* Priority area removed as per request */}

                  {/* New Feature: Create Task from SOD                   {/* Enhanced Case/Task Selection for SOD */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                       <div className="p-2 bg-blue-100 rounded-lg"><Zap size={20} /></div>
                       <h3 className="text-sm font-black uppercase tracking-widest">Today's Execution Plan</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                       <div className="space-y-3">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <Folder size={12} /> Select Assigned Cases (Multi-Select)
                          </label>
                          <MultiSearchableSelect 
                            options={userCases.map(c => ({ value: c.caseId, label: c.companyName }))}
                            selectedValues={reportFormData.sodCaseIds}
                            onChange={(vals) => setReportFormData({...reportFormData, sodCaseIds: vals})}
                            placeholder="Pick cases to work on today..."
                          />
                       </div>

                       <div className="space-y-4 pt-2">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <ClipboardList size={12} /> Pick from Pending Tasks
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[180px] overflow-y-auto hide-scrollbar p-1">
                             {myTodayTasks.length === 0 ? (
                               <div className="col-span-2 py-8 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-widest">No pending tasks found</div>
                             ) : (
                               myTodayTasks.map(task => (
                                 <div 
                                   key={task._id} 
                                   onClick={() => {
                                      const newIds = reportFormData.sodTaskIds.includes(task._id) 
                                        ? reportFormData.sodTaskIds.filter(id => id !== task._id)
                                        : [...reportFormData.sodTaskIds, task._id];
                                      setReportFormData({...reportFormData, sodTaskIds: newIds});
                                   }}
                                   className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${reportFormData.sodTaskIds.includes(task._id) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200 shadow-sm'}`}
                                 >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${reportFormData.sodTaskIds.includes(task._id) ? 'bg-white border-white' : 'bg-gray-50 border-gray-200'}`}>
                                       {reportFormData.sodTaskIds.includes(task._id) && <Check size={10} className="text-blue-600" strokeWidth={4} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="text-[10px] font-black truncate leading-tight uppercase tracking-tight">{task.title}</div>
                                       <div className={`text-[8px] font-bold uppercase ${reportFormData.sodTaskIds.includes(task._id) ? 'text-white/70' : 'text-gray-400'}`}>ID: {task.taskId || '---'}</div>
                                    </div>
                                 </div>
                               ))
                             )}
                          </div>
                       </div>

                       <div className="pt-4 border-t border-gray-200">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Or create a new one-off task</label>
                          <div className="relative group">
                             <input 
                               type="text"
                               placeholder="What else will you do today?"
                               className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-500 transition-all shadow-sm"
                               value={reportFormData.sodTaskTitle}
                               onChange={(e) => setReportFormData({...reportFormData, sodTaskTitle: e.target.value})}
                             />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 rounded-lg text-blue-600 group-focus-within:bg-blue-600 group-focus-within:text-white transition-all">
                                <ArrowRight size={14} />
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  

                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                        <Clock size={12} /> Total Work Duration
                      </label>
                      <input 
                        type="text" 
                        readOnly 
                        value={reportFormData.workDuration} 
                        className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-blue-50/50 font-bold text-blue-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                        <CheckCircle size={12} /> Task Completion Status
                      </label>
                      <select 
                        className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all font-semibold"
                        value={reportFormData.completionStatus}
                        onChange={(e) => setReportFormData({...reportFormData, completionStatus: e.target.value})}
                      >
                        <option value="Fully Completed">Fully Completed ✅</option>
                        <option value="Partially Completed">Partially Completed ⏳</option>
                        <option value="Pending for Tomorrow">Pending for Tomorrow 📅</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                      <FileText size={12} /> Work Summary
                    </label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Describe what you achieved today..."
                      className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/20 resize-none transition-all"
                      value={reportFormData.workSummary}
                      onChange={(e) => setReportFormData({...reportFormData, workSummary: e.target.value})}
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                        <BarChart size={12} /> Progress Score (1-10)
                      </label>
                      <select 
                        className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all font-semibold"
                        value={reportFormData.progressScore}
                        onChange={(e) => setReportFormData({...reportFormData, progressScore: e.target.value})}
                      >
                        {[...Array(10)].map((_, i) => (
                          <option key={i+1} value={i+1}>{i+1} - {i < 4 ? 'Low' : i < 7 ? 'Average' : 'Excellent'}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                        <Zap size={12} /> Mood / Energy
                      </label>
                      <select 
                        className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all font-semibold"
                        value={reportFormData.moodEnergy}
                        onChange={(e) => setReportFormData({...reportFormData, moodEnergy: e.target.value})}
                      >
                        <option value="High Energy">🔥 High Energy</option>
                        <option value="Balanced">⚖️ Balanced</option>
                        <option value="Tired but Productive">😴 Tired but Productive</option>
                        <option value="Low Energy">🔋 Low Energy</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} /> Challenges / Blockers
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Any blockers or help needed?"
                      className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/20 resize-none transition-all"
                      value={reportFormData.challenges}
                      onChange={(e) => setReportFormData({...reportFormData, challenges: e.target.value})}
                    ></textarea>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-8 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                >
                  {reportType === 'SOD' ? 'Skip for now' : 'Cancel'}
                </button>
                <button 
                  type="submit"
                  className={`px-10 py-3 rounded-2xl text-sm font-bold text-white shadow-xl transition-all flex items-center gap-2 ${reportType === 'SOD' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                >
                  <Send size={18} /> Submit {reportType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Dashboard Stats Grid */}
      <div className="stats-grid">
        <div className="stat cursor-pointer hover:border-blue-300 transition-all" onClick={() => navigate('/case-master')}>
          <div className="stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
            <Folder size={18} />
          </div>
          <div>
            <div className="val" style={{ color: '#111827' }}>{stats.totalCases}</div>
            <div className="lbl">Total Cases</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-blue-300 transition-all" onClick={() => navigate('/case-master', { state: { statusFilter: 'Active' } })}>
          <div className="stat-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <FileText size={18} />
          </div>
          <div>
            <div className="val" style={{ color: '#111827' }}>{stats.openCases}</div>
            <div className="lbl">Open Cases</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-blue-300 transition-all" onClick={() => navigate('/case-master', { state: { statusFilter: 'Closed' } })}>
          <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="val" style={{ color: '#111827' }}>{stats.settledCases}</div>
            <div className="lbl">Settled / Closed</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-red-300 transition-all" onClick={() => navigate('/case-master', { state: { priorityFilter: 'High' } })}>
          <div className="stat-icon" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
            <AlertCircle size={18} />
          </div>
          <div>
            <div className="val" style={{ color: '#111827' }}>{stats.highPriority}</div>
            <div className="lbl">High Priority</div>
          </div>
        </div>

        <div className="stat cursor-pointer hover:border-orange-300 transition-all" onClick={() => navigate('/case-master', { state: { priorityFilter: 'Medium' } })}>
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="val" style={{ color: '#111827' }}>{stats.mediumPriority}</div>
            <div className="lbl">Medium Priority</div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <IndianRupee size={18} />
          </div>
          <div>
            <div className="val" style={{ color: '#111827' }}>₹{Number(stats.totalRefundAmount || 0).toLocaleString('en-IN')}</div>
            <div className="lbl">Refund Amount</div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <Clock size={18} />
          </div>
          <div>
            <div className="val" style={{ color: '#111827' }}>{stats.overdueActions.length}</div>
            <div className="lbl">Overdue Actions</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-title flex items-center gap-2">
          <History size={18} className="text-blue-600" />
          Recent Cases
        </div>
        <div className="table-wrap">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-blue-800 text-white text-[10px] font-bold tracking-wider uppercase">
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Client Details</th>
                <th className="px-4 py-3 text-center">Priority</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Last Update</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-gray-700 divide-y divide-gray-100">
              {stats.recentCases.map(c => (
                <tr 
                  key={c._id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate('/case-master', { state: { searchId: c.caseId || c.caseid } })}
                  title="View in Case Master"
                >
                  <td className="px-4 py-3 font-bold text-blue-700 group-hover:underline">
                    {c.caseId || c.caseid}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {c.companyName || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold">{c.clientName}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{c.clientMobile || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={c.priority} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={c.currentStatus} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 italic">
                    {c.lastUpdateDate || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Today's Reports */}
      {user?.role !== 'Admin' && myReports.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="card-title flex items-center gap-2">
            <FileText size={18} className="text-blue-600" /> Today's Submitted Reports
          </div>
          <div className="space-y-3 mt-4">
            {myReports.map(report => (
              <div key={report._id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4 border border-gray-200 hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${report.type === 'SOD' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {report.type === 'SOD' ? <Send size={16} /> : <FileText size={16} />}
                  </div>
                  <div>
                    <div className="font-black text-gray-800 text-sm">{report.type} Report</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {report.type === 'SOD' ? `Check-in: ${report.checkInTime}` : `Check-out: ${report.checkOutTime}`} &nbsp;•&nbsp; {report.date}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewingReport(report)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center gap-1.5"
                >
                  <FileText size={12} /> View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-title flex items-center gap-2 text-left">
          <IndianRupee size={18} className="text-green-600" />
          Submit Refund Request
        </div>
        <form key={editingRefund ? editingRefund._id : 'new'} onSubmit={handleRefundSubmit} className="form-grid cols3 text-left">
          <div className="field">
            <label className="required">Case ID</label>
            <SearchableCaseSelect 
              cases={userCases} 
              value={selectedCaseId} 
              onChange={setSelectedCaseId} 
              required 
            />
          </div>
          <div className="field">
            <label className="required">Amount</label>
            <input 
              type="number" 
              name="amount" 
              defaultValue={editingRefund?.amount} 
              required 
              onKeyDown={(e) => {
                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
              }}
              className="no-spinner"
              placeholder="0.00"
            />
          </div>
          <div className="field span3">
            <label className="required">Summary / Reason</label>
            <textarea name="summary" defaultValue={editingRefund?.summary} required></textarea>
          </div>
          <div className="field">
            <label className="required text-left">Bank Name</label>
            <input type="text" name="bankName" defaultValue={editingRefund?.bankName} required />
          </div>
          <div className="field">
            <label className="required">Account Holder</label>
            <input type="text" name="accHolder" defaultValue={editingRefund?.accHolder} required />
          </div>
          <div className="field">
            <label className="required">Account Number</label>
            <input type="text" name="accNum" defaultValue={editingRefund?.accNum} required />
          </div>
          <div className="field">
            <label className="required">IFSC Code</label>
            <input type="text" name="ifsc" defaultValue={editingRefund?.ifsc} required />
          </div>
          <div className="field">
            <label className="required">Branch</label>
            <input type="text" name="branch" defaultValue={editingRefund?.branch} required />
          </div>
          <div className="field">
            <label className="required">Account Type</label>
            <select name="accType" defaultValue={editingRefund?.accType || "Savings"} required>
              <option value="Savings">Savings</option>
              <option value="Current">Current</option>
            </select>
          </div>
          <div className="span3 flex flex-row items-center gap-3 mt-4">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm text-sm flex items-center gap-2">
              <Send size={14} /> {editingRefund ? 'Update Request' : 'Submit Request'}
            </button>
            {editingRefund && (
              <button 
                type="button" 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors text-sm flex items-center gap-2" 
                onClick={() => { setEditingRefund(null); setSelectedCaseId(''); }}
              >
                <X size={14} /> Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DashboardTab;
