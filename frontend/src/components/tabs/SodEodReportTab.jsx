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
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-soft rounded-2xl text-blue-400">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
              Report
            </h1>

          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex bg-bg-input p-1 rounded-2xl border-2 border-border shadow-inner">
            {['All', 'SOD', 'EOD'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${filter === type
                  ? 'bg-accent text-white shadow-md border border-accent-soft'
                  : 'text-text-muted hover:text-text-primary'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
          {user?.role === 'Admin' && (
            <button
              onClick={handleExportReports}
              className="btn btn-primary !py-2.5 !px-6 !rounded-xl shadow-lg shadow-orange-900/20"
            >
              <Download size={18} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="p-4 md:p-8 flex flex-col h-full overflow-hidden bg-bg-primary">
        {/* Table Container */}
        <div className="bg-bg-card rounded-[2rem] md:rounded-[2.5rem] border-2 border-border shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="p-4 md:p-6 border-b border-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-soft rounded-lg text-accent"><History size={20} /></div>
              <h2 className="text-base md:text-lg font-black text-text-primary uppercase tracking-tight">Recent Submission Logs</h2>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full pl-12 pr-4 py-3 bg-bg-input border-2 border-border rounded-2xl text-sm font-bold text-text-primary outline-none focus:border-accent transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-bg-secondary text-text-secondary border-b border-border">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Type</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Timing</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Work Detail Summary</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Performance / Energy</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan="6" className="py-20 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full" /></td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan="6" className="py-20 text-center text-text-muted font-bold">No reports found for this period.</td></tr>
                ) : filteredReports.map((report) => (
                  <tr key={report._id} className="hover:bg-bg-card-hover transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-black text-text-primary text-sm">{new Date(report.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] font-bold text-text-muted">{new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${report.type === 'SOD' ? 'bg-blue-soft text-blue-400 border-blue-soft' : 'bg-purple-soft text-purple-400 border-purple-soft'
                        }`}>
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2 text-text-secondary text-xs font-bold">
                        <Clock size={14} className="text-text-muted" />
                        {report.type === 'SOD' ? `IN: ${report.checkInTime}` : `OUT: ${report.checkOutTime || '---'}`}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-xs font-medium text-text-muted line-clamp-2 max-w-xs italic">
                        {report.plannedTasks || report.workSummary || '---'}
                      </p>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 uppercase tracking-tighter">
                          <Zap size={12} fill="currentColor" />
                          {report.moodEnergy || report.progressScore || '---'}
                        </div>
                        {report.progressScore && (
                          <div className="w-16 h-1 bg-bg-input rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${report.progressScore}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => handleOpenDetails(report)}
                        className="text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-accent transition-colors flex items-center gap-1 ml-auto"
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-bg-card rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300 border-t-8 border-accent">
            <div className="p-8 border-b border-border flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${selectedReport.type === 'SOD' ? 'bg-blue-soft text-blue-400 border-blue-soft' : 'bg-purple-soft text-purple-400 border-purple-soft'
                    }`}>
                    {selectedReport.type} Report
                  </span>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                </div>
                <h2 className="text-2xl font-black text-text-primary">{selectedReport.userName || 'Team Member'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-bg-input p-2 rounded-xl text-text-muted hover:text-red-500 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto hide-scrollbar bg-bg-card">
              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-input p-6 rounded-3xl border-2 border-border">
                  <div className="flex items-center gap-2 text-text-muted mb-2">
                    <Clock size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Timing Log</span>
                  </div>
                  <div className="text-lg font-black text-text-primary">
                    {selectedReport.type === 'SOD' ? selectedReport.checkInTime : selectedReport.checkOutTime}
                  </div>
                  {selectedReport.workDuration && (
                    <div className="text-[10px] font-bold text-accent mt-1">Duration: {selectedReport.workDuration}</div>
                  )}
                </div>
                <div className="bg-bg-input p-6 rounded-3xl border-2 border-border">
                  <div className="flex items-center gap-2 text-text-muted mb-2">
                    <Smile size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Energy / Score</span>
                  </div>
                  <div className="text-lg font-black text-text-primary">
                    {selectedReport.moodEnergy || `${selectedReport.progressScore}/100` || '---'}
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-text-muted">
                  {selectedReport.type === 'SOD' ? <Target size={18} /> : <FileText size={18} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {selectedReport.type === 'SOD' ? 'Planned Tasks & Goals' : 'Work Summary & Outcomes'}
                  </span>
                </div>
                <div className="bg-bg-input border-2 border-border rounded-[1.5rem] p-6 text-sm text-text-primary font-medium leading-relaxed italic whitespace-pre-wrap shadow-sm">
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

            <div className="p-8 bg-bg-secondary border-t border-border flex justify-end">
              <button onClick={() => setIsModalOpen(false)} className="btn btn-primary !py-3 !px-10 !rounded-2xl shadow-lg shadow-orange-900/20">
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
