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
  Download,
  FileText,
  Zap,
  Info,
  Phone,
  Mail,
  Building2,
  DollarSign,
  History,
  UserCheck,
  Trash2,
  ChevronDown
} from 'lucide-react';

const MyTaskTab = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [linkedCase, setLinkedCase] = useState(null);
  const [fetchingCase, setFetchingCase] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState({
    'To Do': false,
    'In Progress': false,
    'Completed': true // Start with some collapsed on mobile for better focus
  });
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    assignee: user?.fullName || '',
    dueDate: '',
    caseId: '',
    reminderDateTime: '',
    status: 'To Do'
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
      let opsUsers = res.data.filter(u => 
        (u.role === 'Operations' || u.role === 'Staff' || u.role === 'Admin') && 
        u.fullName && 
        !['User', 'Staff', 'Admin', 'Admin User', 'Test User', 'Accountant', 'Reviewer'].includes(u.fullName.trim())
      );

      if (user?.fullName && !opsUsers.some(u => u.fullName === user.fullName)) {
        opsUsers = [{ _id: 'current-user', fullName: user.fullName, role: user.role }, ...opsUsers];
      }

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

  useEffect(() => {
    if (isModalOpen && user?.fullName) {
      setNewTask(prev => ({ ...prev, assignee: prev.assignee || user.fullName }));
    }
  }, [isModalOpen, user?.fullName]);

  const handleOpenTaskPanel = (task) => {
    setSelectedTask(task);
    setLinkedCase(null);
    setIsSidePanelOpen(true);
    if (task.caseId && task.caseId !== 'Manual Task') {
      fetchCaseDetails(task.caseId);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, updates);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, ...res.data } : t));
      if (selectedTask?._id === taskId) {
        setSelectedTask(prev => ({ ...prev, ...res.data }));
      }
      toast.success('Task updated');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      setIsSidePanelOpen(false);
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const fetchCases = async () => {
    try {
      const res = await api.get('/cases');
      console.log('Fetched cases for task dropdown:', res.data.length);
      setCases(res.data);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

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

  const handleExportTasks = () => {
    const headers = ['Task ID', 'Title', 'Priority', 'Assignee', 'Case ID', 'Due Date', 'Status', 'Notes'];
    const rows = filteredTasks.map(t => [
      t.taskId || '',
      (t.title || '').replace(/,/g, ';').replace(/\n/g, ' '),
      t.priority || '',
      t.assignee || '',
      t.caseId || '',
      t.dueDate || '',
      t.status || '',
      (t.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `My_Tasks_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        assignee: user?.fullName || '',
        dueDate: '',
        caseId: '',
        reminderDateTime: '',
        status: 'To Do'
      });
      fetchTasks();
    } catch (err) {
      toast.error('Failed to create task');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 shrink-0">
            <Layout size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
              Task Management Board
            </h1>
            <p className="text-xs md:text-sm text-gray-500 font-medium">Manage your daily tasks and track case progress</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {user?.role === 'Admin' && (
            <select 
              className="bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="All Users">All Users</option>
              {users.map(u => (
                <option key={u._id} value={u.fullName}>{u.fullName}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-3">
            <button onClick={handleExportTasks} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95">
              <Download size={18} /> Export
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex-2 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
              <Plus size={20} /> New Task
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 flex flex-col h-full overflow-y-auto md:overflow-hidden">
        {/* Search Bar */}
        <div className="mb-8 relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" placeholder="Search by task title, case ID or assignee..." 
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-300 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm font-medium"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 h-full md:overflow-hidden pb-4">
          {columns.map(col => (
            <div key={col.id} className="flex flex-col h-full min-w-0" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.id)}>
              <div 
                className="flex items-center justify-between mb-4 px-3 py-2 bg-white md:bg-transparent rounded-2xl md:rounded-none border-2 border-gray-100 md:border-none cursor-pointer md:cursor-default shadow-sm md:shadow-none"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setCollapsedColumns(prev => ({ ...prev, [col.id]: !prev[col.id] }));
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-${col.color}-50 text-${col.color}-600 border border-${col.color}-100`}>{col.icon}</div>
                  <h2 className="font-black text-gray-800 uppercase tracking-widest text-xs">{col.label}</h2>
                  <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">{filteredTasks.filter(t => t.status === col.id).length}</span>
                </div>
                <div className="md:hidden">
                   <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${collapsedColumns[col.id] ? 'rotate-[-90deg]' : 'rotate-0'}`} />
                </div>
              </div>

              <div className={`flex-1 bg-gray-100/30 rounded-3xl border-2 border-gray-300 p-4 overflow-y-auto md:hide-scrollbar space-y-4 border-dashed min-h-[300px] ${collapsedColumns[col.id] ? 'hidden md:block' : 'block animate-in slide-in-from-top-2 duration-300'}`}>
                {filteredTasks.filter(t => t.status === col.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 opacity-30">
                    <AlertCircle size={32} className="mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No tasks here</p>
                  </div>
                ) : (
                  filteredTasks.filter(t => t.status === col.id).map(task => (
                    <div 
                      key={task._id} draggable onDragStart={(e) => onDragStart(e, task._id)}
                      onClick={() => handleOpenTaskPanel(task)}
                      className="bg-white rounded-2xl border-2 border-gray-300 p-5 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all group cursor-pointer relative overflow-hidden"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded border border-gray-200 group-hover:text-blue-600 transition-colors">
                          {task.taskId || 'TSK-NEW'}
                        </span>
                        <div className="flex gap-1 items-center">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${task.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : task.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                            {task.priority}
                          </span>
                          {task.source === 'Auto (Case)' && <Zap size={10} className="text-orange-500" title="Auto-generated" />}
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm mb-2 leading-tight group-hover:text-blue-600 transition-colors">{task.title}</h3>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 font-medium leading-relaxed">{task.details || task.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-[8px] font-black shadow-sm">{task.assignee?.charAt(0)}</div>
                          <span className="text-[10px] font-bold text-gray-600">{task.assignee}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           {task.dueDate && <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><Calendar size={10} /> {task.dueDate}</span>}
                           <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TASK DETAILS SIDE PANEL */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl z-[300] transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col ${isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
         {selectedTask && (
           <>
             {/* Side Panel Header */}
             <div className="p-6 bg-gray-900 text-white flex flex-col gap-4 relative">
                <button onClick={() => setIsSidePanelOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                  <X size={20} />
                </button>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                   <span>{selectedTask.taskId}</span>
                   <span>•</span>
                   <span>Case: {selectedTask.caseId || 'Manual'}</span>
                   <span>•</span>
                   <span>Source: {selectedTask.source}</span>
                </div>
                <h2 className="text-xl font-bold leading-tight">{selectedTask.title}</h2>
                <div className="flex gap-2">
                   {['To Do', 'In Progress', 'Completed'].map(s => (
                     <button 
                       key={s}
                       onClick={() => handleUpdateTask(selectedTask._id, { status: s })}
                       className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${selectedTask.status === s ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20'}`}
                     >
                       {s}
                     </button>
                   ))}
                </div>
             </div>

             {/* Side Panel Content */}
             <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-white">
                {/* Core Details Table */}
                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                      Task Information
                   </h3>
                   <div className="grid grid-cols-1 gap-4">
                      <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                         <span className="text-gray-500 font-bold text-xs">Priority</span>
                         <span className={`font-black uppercase text-[10px] px-3 py-1 rounded-full ${selectedTask.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{selectedTask.priority}</span>
                      </div>
                      <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                         <span className="text-gray-500 font-bold text-xs">Assigned To</span>
                         <span className="font-bold text-gray-800 flex items-center gap-2 text-sm"><User size={14} className="text-blue-500" /> {selectedTask.assignee}</span>
                      </div>
                      <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                         <span className="text-gray-500 font-bold text-xs">Due Date</span>
                         <span className="font-bold text-gray-800 text-sm flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> {selectedTask.dueDate || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                         <span className="text-gray-500 font-bold text-xs">Case ID</span>
                         <span className="font-bold text-blue-600 text-sm">{selectedTask.caseId || '---'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                         <span className="text-gray-500 font-bold text-xs">Creation Source</span>
                         <span className="font-bold text-gray-700 text-[10px] flex items-center gap-1.5 uppercase tracking-wide px-3 py-1 bg-white rounded-lg border border-gray-200">
                            {selectedTask.source === 'Manual' ? <Plus size={12} className="text-green-500" /> : <Zap size={12} className="text-orange-500" />} 
                            {selectedTask.source}
                         </span>
                      </div>
                   </div>
                </div>

                {/* Brief Section */}
                <div className="space-y-4">
                   <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                      Task Brief
                   </h3>
                   <div className="text-[13px] text-gray-600 font-medium leading-relaxed bg-blue-50/30 p-5 rounded-3xl border border-blue-100/50 shadow-inner min-h-[100px]">
                      {selectedTask.details || selectedTask.description || 'No detailed description provided.'}
                   </div>
                </div>

                {/* Reminder Section */}
                <div className="space-y-4">
                   <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                      Reminders
                   </h3>
                   <div className="flex gap-2">
                      <input 
                        type="datetime-local" 
                        className="flex-1 bg-white border-2 border-gray-100 rounded-2xl px-5 py-3 text-xs font-black text-gray-800 outline-none focus:border-blue-500 transition-all shadow-sm"
                        value={selectedTask.reminderDateTime || ''}
                        onChange={(e) => handleUpdateTask(selectedTask._id, { reminderDateTime: e.target.value })}
                      />
                      <button className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">Set</button>
                   </div>
                   {selectedTask.reminderDateTime && (
                     <div className="flex items-center gap-2 text-green-600 font-bold text-[10px] bg-green-50 px-3 py-2 rounded-xl border border-green-100 w-fit">
                        <CheckCircle2 size={12} /> Reminder active for {new Date(selectedTask.reminderDateTime).toLocaleString()}
                     </div>
                   )}
                </div>

                {/* Notes Section */}
                <div className="space-y-4">
                   <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                      Progress Notes
                   </h3>
                   <textarea 
                     className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all min-h-[150px] shadow-sm placeholder:text-gray-300"
                     placeholder="Add progress notes, observations, or next steps..."
                     value={selectedTask.notes || ''}
                     onChange={(e) => handleUpdateTask(selectedTask._id, { notes: e.target.value })}
                   />
                </div>
             </div>

             {/* Side Panel Footer */}
             <div className="p-8 bg-white border-t border-gray-100 flex gap-4">
                <button 
                  onClick={() => setIsSidePanelOpen(false)}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all"
                >
                  Save & Exit
                </button>
                <button 
                   onClick={() => handleDeleteTask(selectedTask._id)}
                   className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 hover:text-red-700 transition-all border border-red-100"
                   title="Delete Task"
                >
                   <Trash2 size={22} />
                </button>
             </div>
           </>
         )}
      </div>

      {/* OVERLAY for Side Panel */}
      {isSidePanelOpen && (
        <div onClick={() => setIsSidePanelOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[290] animate-in fade-in duration-300" />
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
                cases={cases}
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
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Task Details / Brief</label>
              <textarea 
                className="w-full bg-white border-2 border-gray-300 rounded-2xl px-5 py-3 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all min-h-[100px]"
                placeholder="Describe the task in detail..."
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Reminder Date & Time</label>
              <input 
                type="datetime-local" 
                className="w-full bg-white border-2 border-gray-300 rounded-2xl px-5 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                value={newTask.reminderDateTime}
                onChange={(e) => setNewTask({...newTask, reminderDateTime: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Initial Status</label>
              <select 
                className="w-full bg-white border-2 border-gray-300 rounded-2xl px-5 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
                value={newTask.status}
                onChange={(e) => setNewTask({...newTask, status: e.target.value})}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
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
              Create Task
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
