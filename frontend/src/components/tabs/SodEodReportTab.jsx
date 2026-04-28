import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  User, 
  Search, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  Activity,
  Zap,
  Layout,
  FileText,
  Target,
  Smile,
  X,
  History,
  Download
} from 'lucide-react';

const SodEodReportTab = () => {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All, SOD, EOD
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports');
      setReports(res.data);
    } catch (err) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter(r => {
    const matchesFilter = filter === 'All' || r.type === filter;
    const matchesSearch = r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.plannedTasks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.workSummary?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExportReports = () => {
    const headers = ['Date', 'Type', 'Submitted By', 'Check-In', 'Check-Out', 'Duration', 'Planned Tasks', 'Work Summary', 'Completion', 'Progress Score', 'Mood'];
    const rows = filteredReports.map(r => [
      r.date || '',
      r.type || '',
      r.userName || '',
      r.checkInTime || '',
      r.checkOutTime || '',
      r.workDuration || '',
      (r.plannedTasks || '').replace(/,/g, ';').replace(/\n/g, ' '),
      (r.workSummary || '').replace(/,/g, ';').replace(/\n/g, ' '),
      r.completionStatus || '',
      r.progressScore || '',
      r.moodEnergy || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SOD_EOD_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenDetails = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
            <Activity className="text-blue-600" size={28} />
            SOD/EOD Report Center
          </h1>
          <p className="text-sm text-gray-500 ml-10 font-medium">View your daily progress logs</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl border-2 border-gray-200">
            {['All', 'SOD', 'EOD'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  filter === type 
                  ? 'bg-white text-blue-600 shadow-md border border-blue-100' 
                  : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {type} Reports
              </button>
            ))}
          </div>
          {user?.role === 'Admin' && (
            <button 
              onClick={handleExportReports}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Download size={18} /> Export
            </button>
          )}
        </div>
      </div>

      <div className="p-8 flex flex-col h-full overflow-hidden">
        {/* Table Container */}
        <div className="bg-white rounded-[2.5rem] border-2 border-gray-300 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <History className="text-blue-500" size={20} />
               <h2 className="text-lg font-black text-gray-800">Recent Submission Logs</h2>
            </div>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search by name or summary..."
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1 hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Type</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Timing</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Work Detail Summary</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Performance / Energy</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="6" className="py-20 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan="6" className="py-20 text-center text-gray-400 font-bold">No reports found for this period.</td></tr>
                ) : filteredReports.map((report) => (
                  <tr key={report._id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-black text-gray-800 text-sm">{new Date(report.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] font-bold text-gray-400">{new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                        report.type === 'SOD' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-gray-600 text-xs font-bold">
                        <Clock size={14} className="text-gray-400" />
                        {report.type === 'SOD' ? `IN: ${report.checkInTime}` : `OUT: ${report.checkOutTime || '---'}`}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-xs font-medium text-gray-600 line-clamp-2 max-w-xs italic">
                        {report.plannedTasks || report.workSummary || '---'}
                      </p>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                          <Zap size={12} fill="currentColor" />
                          {report.moodEnergy || report.progressScore || '---'}
                        </div>
                        {report.progressScore && (
                          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500" style={{ width: `${report.progressScore}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleOpenDetails(report)}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center gap-1 ml-auto"
                      >
                        View Details <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Report Details Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300 border-t-8 border-blue-600">
             <div className="p-8 border-b border-gray-100 flex justify-between items-start">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                        selectedReport.type === 'SOD' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {selectedReport.type} Report
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                   </div>
                   <h2 className="text-2xl font-black text-gray-800">{selectedReport.userName || 'Team Member'}</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-xl text-gray-400 hover:text-red-500 transition-all">
                  <X size={24} />
                </button>
             </div>

             <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto hide-scrollbar">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-300">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Clock size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Timing Log</span>
                      </div>
                      <div className="text-lg font-black text-gray-800">
                        {selectedReport.type === 'SOD' ? selectedReport.checkInTime : selectedReport.checkOutTime}
                      </div>
                      {selectedReport.workDuration && (
                        <div className="text-[10px] font-bold text-blue-600 mt-1">Duration: {selectedReport.workDuration}</div>
                      )}
                   </div>
                   <div className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-300">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Smile size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Energy / Score</span>
                      </div>
                      <div className="text-lg font-black text-gray-800">
                        {selectedReport.moodEnergy || `${selectedReport.progressScore}/100` || '---'}
                      </div>
                   </div>
                </div>

                {/* Content Section */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-gray-400">
                      {selectedReport.type === 'SOD' ? <Target size={18} /> : <FileText size={18} />}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {selectedReport.type === 'SOD' ? 'Planned Tasks & Goals' : 'Work Summary & Outcomes'}
                      </span>
                   </div>
                   <div className="bg-white border-2 border-gray-300 rounded-[1.5rem] p-6 text-sm text-gray-600 font-medium leading-relaxed italic whitespace-pre-wrap shadow-sm">
                      {selectedReport.plannedTasks || selectedReport.workSummary || 'No details provided.'}
                   </div>
                </div>

                {/* Additional Info for SOD */}
                {selectedReport.type === 'SOD' && selectedReport.priorityArea && (
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 text-gray-400">
                        <Zap size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Priority Focused Area</span>
                     </div>
                     <div className="bg-blue-50 border-2 border-blue-300 rounded-[1.5rem] p-6 text-sm text-blue-800 font-black tracking-tight">
                        {selectedReport.priorityArea}
                     </div>
                  </div>
                )}
             </div>

             <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button onClick={() => setIsModalOpen(false)} className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
                   Close Report
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SodEodReportTab;
