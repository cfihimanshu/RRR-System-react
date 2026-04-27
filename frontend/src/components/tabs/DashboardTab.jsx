import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Badge } from '../shared/Badge';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
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
  LogOut
} from 'lucide-react';

const DashboardTab = () => {
  const [stats, setStats] = useState(null);
  const [myRefunds, setMyRefunds] = useState([]);
  const [userCases, setUserCases] = useState([]); 
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [editingRefund, setEditingRefund] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('SOD');
  const [myTodayTasks, setMyTodayTasks] = useState([]);
  const [reportFormData, setReportFormData] = useState({ 
    plannedTasks: '', 
    priorityArea: '',
    checkInTime: '',
    checkOutTime: '',
    workDuration: '',
    completionStatus: 'Fully Completed',
    workSummary: '',
    progressScore: '8',
    moodEnergy: 'High Energy',
    challenges: '',
    sodCaseId: '',
    sodTaskTitle: ''
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
      const today = new Date().toISOString().split('T')[0];
      const filtered = res.data.filter(t => {
        if (!t.createdAt) return false;
        try {
          const taskDate = new Date(t.createdAt).toISOString().split('T')[0];
          return taskDate === today && t.status !== 'Completed';
        } catch (e) {
          return false;
        }
      });
      setMyTodayTasks(filtered);
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
    if (user?.role === 'Admin') return; // Admin is always allowed
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/reports');
      const hasSod = res.data.some(r => r.type === 'SOD' && r.date === today && r.userEmail === user.email);
      setHasSodToday(hasSod);
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
        // Map common fields for backward compatibility if needed
        plannedTasks: reportType === 'SOD' ? reportFormData.plannedTasks : '',
        workSummary: reportType === 'EOD' ? reportFormData.workSummary : ''
      };
      
      console.log('Submitting Report Payload:', payload);
      
      await api.post('/reports', payload);
      toast.success(`${reportType} report submitted successfully`, { id: loadingToast });
      setIsReportModalOpen(false);
      checkSodStatus();
      fetchStats();
      
      // Reset form
      setReportFormData({ 
        plannedTasks: '', 
        priorityArea: '',
        checkInTime: '',
        checkOutTime: '',
        workDuration: '',
        completionStatus: 'Fully Completed',
        workSummary: '',
        progressScore: '80',
        moodEnergy: 'High Energy',
        challenges: '',
        sodCaseId: '',
        sodTaskTitle: ''
      });

      // Handle Task Creation from SOD if provided
      if (reportType === 'SOD' && reportFormData.sodCaseId && reportFormData.sodTaskTitle) {
        await api.post('/tasks', {
          title: `Task: ${reportFormData.sodTaskTitle}`,
          description: reportFormData.sodTaskTitle,
          priority: 'Medium',
          assignee: user?.fullName,
          caseId: reportFormData.sodCaseId,
          status: 'To Do'
        });
        toast.success('Work task added to your To-Do list');
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
            {user?.fullName ? `Welcome, ${user.fullName}!` : 'Welcome User'}
          </div>
          <div className="section-sub text-blue-600 font-semibold">{user?.role} Dashboard Overview</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
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
          <div className="bg-blue-50 border border-blue-300 px-4 py-2 rounded-lg text-right hidden lg:block">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Logged in as</div>
            <div className="text-sm font-bold text-gray-800">{user?.email}</div>
          </div>
        </div>
      </div>

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
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none"
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
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm bg-gray-50 font-bold text-gray-700 outline-none"
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
                      className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/20 resize-none transition-all"
                      value={reportFormData.plannedTasks}
                      onChange={(e) => setReportFormData({...reportFormData, plannedTasks: e.target.value})}
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-2 tracking-widest flex items-center gap-2">
                      <AlertTriangle size={12} /> Priority Focused Area
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Critical Settlements, Client Onboarding"
                      className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/20 transition-all"
                      value={reportFormData.priorityArea}
                      onChange={(e) => setReportFormData({...reportFormData, priorityArea: e.target.value})}
                    />
                  </div>

                  {/* New Feature: Create Task from SOD */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                       <Zap size={16} />
                       <h3 className="text-xs font-black uppercase tracking-widest">Create Task for Today</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Select Assigned Case</label>
                          <SearchableCaseSelect 
                            cases={userCases.map(c => ({ caseId: c.caseId, companyName: c.companyName }))}
                            value={reportFormData.sodCaseId}
                            onChange={(val) => setReportFormData({...reportFormData, sodCaseId: val})}
                            placeholder="Search Case ID..."
                          />
                       </div>
                       <div>
                          <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">What will you do on this case?</label>
                          <input 
                            type="text"
                            placeholder="e.g. Call client for docs"
                            className="w-full border-2 border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 transition-all bg-white"
                            value={reportFormData.sodTaskTitle}
                            onChange={(e) => setReportFormData({...reportFormData, sodTaskTitle: e.target.value})}
                          />
                       </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium italic mt-2">
                      * Selecting a case and adding a title will automatically create a new task in your "To Do" list.
                    </p>
                  </div>
                  
                  
                  {/* My Tasks Today Section */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-3 tracking-widest flex items-center gap-2">
                      <ClipboardList size={12} /> My Tasks Today (Assigned)
                    </label>
                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-300 max-h-40 overflow-y-auto hide-scrollbar space-y-2">
                      {myTodayTasks.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">No tasks assigned for today yet.</p>
                      ) : (
                        myTodayTasks.map(task => (
                          <div key={task._id} className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-blue-200">
                            <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'High' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <span className="text-xs font-semibold text-gray-700">{task.title}</span>
                            <span className="ml-auto text-[9px] font-bold text-blue-500 uppercase">{task.caseId || 'GEN'}</span>
                          </div>
                        ))
                      )}
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
                  Cancel
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
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-blue-700">
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
            <input type="number" name="amount" defaultValue={editingRefund?.amount} required />
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
