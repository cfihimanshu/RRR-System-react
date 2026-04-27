import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import Modal from '../shared/Modal';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  User,
  ArrowRight,
  RefreshCw,
  Layout,
  X,
  FileText,
  Zap,
  Info,
  Phone,
  Mail,
  Building2,
  DollarSign,
  History,
  UserCheck
} from 'lucide-react';

const MyTaskTab = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [linkedCase, setLinkedCase] = useState(null);
  const [fetchingCase, setFetchingCase] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    assignee: '',
    dueDate: '',
    caseId: ''
  });

  const fetchTasks = async (showToast = false) => {
    try {
      if (showToast) setLoading(true);
      const assigneeFilter = selectedUser === 'All Users' ? 'All Users' : selectedUser;
      const res = await api.get(`/tasks?assignee=${assigneeFilter}`);
      const prevCount = tasks.length;
      setTasks(res.data);
      if (showToast) {
        if (res.data.length === prevCount && prevCount > 0) {
          toast.success('Already imported the cases', { icon: '✅' });
        } else {
          toast.success(`Successfully synced ${res.data.length} tasks/cases`);
        }
      }
    } catch (err) {
      if (showToast) toast.error('Failed to sync tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      const opsUsers = res.data.filter(u => 
        (u.role === 'Operations' || u.role === 'Staff' || u.role === 'Admin') && 
        u.fullName && 
        !['User', 'Staff', 'Admin', 'Admin User', 'Test User', 'Accountant', 'Reviewer'].includes(u.fullName.trim())
      );
      setUsers(opsUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchCaseDetails = async (caseId) => {
    if (!caseId) return;
    try {
      setFetchingCase(true);
      const res = await api.get(`/cases?search=${caseId}`);
      if (res.data && res.data.length > 0) {
        // Find the exact match
        const exactCase = res.data.find(c => c.caseId === caseId);
        setLinkedCase(exactCase || res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching case details:', err);
    } finally {
      setFetchingCase(false);
    }
  };

  const handleOpenViewModal = (task) => {
    setSelectedTask(task);
    setLinkedCase(null);
    setIsViewModalOpen(true);
    if (task.caseId && task.caseId !== 'Manual Task') {
      fetchCaseDetails(task.caseId);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [selectedUser]);

  const updateTaskStatus = async (id, status) => {
    try {
      await api.put(`/tasks/${id}`, { status });
      setTasks(prev => prev.map(t => t._id === id ? { ...t, status } : t));
    } catch (err) {
      toast.error('Failed to update status');
      fetchTasks();
    }
  };

  const onDragStart = (e, id) => { e.dataTransfer.setData('taskId', id); };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (e, status) => {
    const id = e.dataTransfer.getData('taskId');
    updateTaskStatus(id, status);
  };

  const filteredTasks = tasks.filter(t => 
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.caseId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.assignee?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { id: 'To Do', label: 'To Do', color: 'blue', icon: <Clock size={16} /> },
    { id: 'In Progress', label: 'In Progress', color: 'orange', icon: <Zap size={16} /> },
    { id: 'Completed', label: 'Completed', color: 'green', icon: <CheckCircle2 size={16} /> }
  ];

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', newTask);
      toast.success('Task created successfully');
      setIsModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'Medium',
        assignee: '',
        dueDate: '',
        caseId: ''
      });
      fetchTasks();
    } catch (err) {
      toast.error('Failed to create task');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
            <Layout className="text-blue-600" size={28} />
            Task Management Board
          </h1>
          <p className="text-sm text-gray-500 ml-10 font-medium">Manage your daily tasks and track case progress</p>
        </div>
        
        <div className="flex items-center gap-3">
          {user?.role === 'Admin' && (
            <select 
              className="bg-white border-2 border-gray-300 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="All Users">All Users</option>
              {users.map(u => (
                <option key={u._id} value={u.fullName}>{u.fullName}</option>
              ))}
            </select>
          )}
          <button onClick={() => fetchTasks(true)} className="flex items-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-5 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Import My Cases
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
            <Plus size={20} /> New Task
          </button>
        </div>
      </div>

      <div className="p-8 flex flex-col h-full overflow-hidden">
        {/* Search Bar */}
        <div className="mb-8 relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" placeholder="Search by task title, case ID or assignee..." 
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-300 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm font-medium"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full overflow-hidden pb-4">
          {columns.map(col => (
            <div key={col.id} className="flex flex-col h-full min-w-[320px]" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.id)}>
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-${col.color}-50 text-${col.color}-600 border border-${col.color}-100`}>{col.icon}</div>
                  <h2 className="font-black text-gray-800 uppercase tracking-widest text-xs">{col.label}</h2>
                  <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">{filteredTasks.filter(t => t.status === col.id).length}</span>
                </div>
              </div>

              <div className="flex-1 bg-gray-100/30 rounded-3xl border-2 border-gray-300 p-4 overflow-y-auto hide-scrollbar space-y-4 border-dashed">
                {filteredTasks.filter(t => t.status === col.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 opacity-30">
                    <AlertCircle size={32} className="mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No tasks here</p>
                  </div>
                ) : (
                  filteredTasks.filter(t => t.status === col.id).map(task => (
                    <div 
                      key={task._id} draggable onDragStart={(e) => onDragStart(e, task._id)}
                      onClick={() => handleOpenViewModal(task)}
                      className="bg-white rounded-2xl border-2 border-gray-300 p-5 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all group cursor-pointer relative overflow-hidden"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded border border-gray-200 group-hover:text-blue-600 transition-colors">
                          {task.caseId || 'Manual Task'}
                        </span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : task.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                          {task.priority}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm mb-2 leading-tight group-hover:text-blue-600 transition-colors">{task.title}</h3>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 font-medium leading-relaxed">{task.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-[8px] font-black shadow-sm">{task.assignee?.charAt(0)}</div>
                          <span className="text-[10px] font-bold text-gray-600">{task.assignee}</span>
                        </div>
                        <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VIEW MODAL: Enhanced Case/Task Details */}
      {isViewModalOpen && selectedTask && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300 my-8">
            {/* Header Area */}
            <div className="p-8 border-b border-gray-100 flex justify-between items-start relative">
               <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border-2 border-blue-100">
                      {selectedTask.caseId || 'Task Detail'}
                    </span>
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${selectedTask.priority === 'High' ? 'bg-red-50 text-red-600 border-2 border-red-100' : 'bg-orange-50 text-orange-600 border-2 border-orange-100'}`}>
                      {selectedTask.priority} Priority
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-gray-800 leading-tight tracking-tight max-w-2xl">{selectedTask.title}</h2>
               </div>
               <button onClick={() => setIsViewModalOpen(false)} className="bg-gray-100 hover:bg-red-50 hover:text-red-600 p-3 rounded-2xl transition-all text-gray-500">
                <X size={24} />
               </button>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto max-h-[70vh] hide-scrollbar">
               {/* Left Column: Core Info Cards */}
               <div className="lg:col-span-2 space-y-6">
                  {/* Detailed Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3 mb-3 text-gray-400">
                           <Building2 size={18} className="group-hover:text-blue-500 transition-colors" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Company</span>
                        </div>
                        <div className="font-bold text-gray-800 text-sm">{linkedCase?.companyName || '---'}</div>
                     </div>
                     <div className="bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3 mb-3 text-gray-400">
                           <Phone size={18} className="group-hover:text-blue-500 transition-colors" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Mobile</span>
                        </div>
                        <div className="font-bold text-gray-800 text-sm">{linkedCase?.mobile || '---'}</div>
                     </div>
                     <div className="bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3 mb-3 text-gray-400">
                           <Mail size={18} className="group-hover:text-blue-500 transition-colors" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Email</span>
                        </div>
                        <div className="font-bold text-gray-800 text-sm truncate">{linkedCase?.email || '---'}</div>
                     </div>
                     <div className="bg-gray-50 border-2 border-gray-100 rounded-3xl p-5 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3 mb-3 text-gray-400">
                           <DollarSign size={18} className="group-hover:text-blue-500 transition-colors" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Amt Paid</span>
                        </div>
                        <div className="font-bold text-gray-800 text-sm">₹{linkedCase?.totalAmount || '0'}</div>
                     </div>
                  </div>

                  {/* Summary/Description Area */}
                  <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 space-y-4">
                     <div className="flex items-center gap-2 text-gray-400">
                        <FileText size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Case Summary</span>
                     </div>
                     <p className="text-gray-600 text-sm font-medium leading-relaxed whitespace-pre-wrap italic">
                        {linkedCase?.summary || selectedTask.description || "No specific summary details provided for this entry."}
                     </p>
                  </div>
               </div>

               {/* Right Column: Ownership & Timeline */}
               <div className="space-y-6">
                  <div className="bg-blue-600 text-white rounded-[2rem] p-6 shadow-xl shadow-blue-100">
                     <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-6">Execution Team</div>
                     <div className="space-y-4">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30"><UserCheck size={20} /></div>
                           <div>
                              <div className="text-[9px] font-black uppercase opacity-60">Assigned To</div>
                              <div className="text-sm font-black">{linkedCase?.assignedTo || selectedTask.assignee}</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30"><Plus size={20} /></div>
                           <div>
                              <div className="text-[9px] font-black uppercase opacity-60">Initiated By</div>
                              <div className="text-sm font-black">{linkedCase?.initiatedBy || 'System/Admin'}</div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Micro Timeline Preview */}
                  <div className="bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6">
                     <div className="flex items-center gap-2 mb-4 text-gray-400">
                        <History size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Recent Activity</span>
                     </div>
                     <div className="space-y-4">
                        {!linkedCase?.timeline || linkedCase.timeline.length === 0 ? (
                           <p className="text-[10px] font-bold text-gray-400 italic">No activity logs found</p>
                        ) : (
                           linkedCase.timeline.slice(0, 3).map((log, idx) => (
                              <div key={idx} className="flex gap-3 relative pb-2 last:pb-0">
                                 {idx !== 2 && <div className="absolute left-1.5 top-4 bottom-0 w-0.5 bg-gray-200" />}
                                 <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white relative z-10 mt-1" />
                                 <div>
                                    <div className="text-[10px] font-black text-gray-800 line-clamp-1 uppercase tracking-tight">{log.status || 'Updated'}</div>
                                    <div className="text-[9px] font-bold text-gray-400">{new Date(log.date).toLocaleDateString()}</div>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="px-12 py-4 bg-blue-600 text-white rounded-[1.5rem] text-sm font-black shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                Close Detailed View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create New Task"
        size="lg"
      >
        <form onSubmit={handleCreateTask} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Task Title</label>
              <input 
                type="text" 
                className="w-full bg-white border-2 border-gray-300 rounded-2xl px-5 py-3 text-sm font-bold text-gray-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                placeholder="Enter task title..."
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Link Case ID</label>
              <SearchableCaseSelect 
                cases={tasks.filter(t => t.isCase).map(t => ({ caseId: t.caseId, companyName: t.title.replace('Case: ', '') }))}
                value={newTask.caseId}
                onChange={(val) => setNewTask({...newTask, caseId: val})}
                placeholder="Search case ID..."
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Assign To</label>
              <select 
                className="w-full bg-white border-2 border-gray-300 rounded-2xl px-5 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
                value={newTask.assignee}
                onChange={(e) => setNewTask({...newTask, assignee: e.target.value})}
                required
              >
                <option value="">Select User</option>
                {users.map(u => (
                  <option key={u._id} value={u.fullName}>{u.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Priority</label>
              <select 
                className="w-full bg-white border-2 border-gray-300 rounded-2xl px-5 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
                value={newTask.priority}
                onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Date</label>
              <input 
                type="date" 
                className="w-full bg-white border-2 border-gray-300 rounded-2xl px-5 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Task Description</label>
              <textarea 
                className="w-full bg-white border-2 border-gray-300 rounded-2xl px-5 py-3 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all min-h-[120px]"
                placeholder="Write detailed task description here..."
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              />
            </div>
          </div>

          <div className="mt-10 flex justify-end gap-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-10 py-3.5 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-12 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              Create New Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const Activity = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
);

export default MyTaskTab;
