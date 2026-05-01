import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import {
  BarChart3,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  ClipboardList,
  Download,
  FileText,
  Eye,
  X,
  Send,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';

const WorkReportTab = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, reportsRes] = await Promise.all([
        api.get('/reports/stats'),
        api.get('/reports')
      ]);
      setStats(statsRes.data);
      setReports(reportsRes.data);
    } catch (err) {
      console.error('Failed to fetch work report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredReports = reports.filter(r => {
    const typeMatch = filterType === 'All' || r.type === filterType;
    const dateMatch = !filterDate || r.date === filterDate;
    return typeMatch && dateMatch;
  });

  // Get completion status: FULLY COMPLETED only when both SOD and EOD exist for same date
  const getCompletionStatus = (date, userEmail) => {
    const hasSod = reports.some(r => r.date === date && r.type === 'SOD' && r.userEmail === userEmail);
    const hasEod = reports.some(r => r.date === date && r.type === 'EOD' && r.userEmail === userEmail);

    if (hasSod && hasEod) return 'Fully Completed';
    if (hasSod || hasEod) return 'Incomplete';
    return 'Pending';
  };

  // ── Download as CSV ──
  const handleDownload = () => {
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
      getCompletionStatus(r.date, r.userEmail) || '',
      r.progressScore || '',
      r.moodEnergy || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Work_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
    </div>
  );

  const isAdmin = stats?.role === 'Admin';

  return (
    <div className="flex flex-col h-full bg-bg-primary p-4 md:p-8 overflow-hidden">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-soft rounded-2xl text-blue-400 shrink-0">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight leading-tight">
              {isAdmin ? 'Work Report' : 'My Work Report'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchData}
            className="flex-1 md:flex-none flex justify-center items-center p-3 rounded-xl bg-bg-card border-2 border-border text-text-muted hover:border-accent hover:text-text-primary transition-all shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleDownload}
            className="btn btn-primary !py-3 !px-6 !rounded-xl shadow-lg shadow-blue-900/20"
          >
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>


      {/* Reports Table */}
      <div className="bg-bg-card rounded-[2rem] border-2 border-border shadow-sm overflow-hidden flex flex-col flex-1">
        {/* Table Header + Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 md:p-6 border-b border-border gap-4">
          <h2 className="text-xs md:text-sm font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} className="text-accent" /> Report History
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-bg-input border-2 border-border rounded-xl px-4 py-2.5 shadow-inner">
              <Calendar size={18} className="text-white" />
              <input
                type="date"
                className="bg-transparent text-xs font-bold text-text-primary outline-none flex-1"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-gray-400 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center bg-bg-input border-2 border-border rounded-xl overflow-hidden p-1 shadow-inner">
              {['All', 'SOD', 'EOD'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${filterType === t ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-accent'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="py-20 text-center text-gray-400 font-bold text-sm italic">No reports found for the selected filters.</div>
        ) : (
          <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="bg-bg-secondary text-text-secondary text-[10px] font-black uppercase tracking-wider border-b border-border">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Submitted By</th>
                  <th className="px-5 py-3.5">Check-In</th>
                  <th className="px-5 py-3.5">Check-Out</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Planned Task</th>
                  <th className="px-5 py-3.5">Completion</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[12px] text-text-primary">
                {filteredReports.map(report => (
                  <tr key={report._id} className="hover:bg-bg-card-hover transition-colors group">
                    <td className="px-5 py-3.5 font-bold text-text-primary whitespace-nowrap">{report.date || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${report.type === 'SOD' ? 'bg-blue-soft text-blue-400' : 'bg-purple-soft text-purple-400'}`}>
                        {report.type === 'SOD' ? <Send size={9} /> : <FileText size={9} />}
                        {report.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-text-secondary">{report.userName || '—'}</td>
                    <td className="px-5 py-3.5 font-bold text-green-400">{report.checkInTime || '—'}</td>
                    <td className="px-5 py-3.5 font-bold text-blue-400">{report.checkOutTime || '—'}</td>
                    <td className="px-5 py-3.5">
                      {report.workDuration ? (
                        <span className="font-black text-gray-800">{report.workDuration}</span>
                      ) : <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-5 py-3.5 max-w-[180px]">
                      <p className="truncate text-gray-600" title={report.plannedTasks}>
                        {report.plannedTasks || <span className="text-gray-300 italic">—</span>}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const completionStatus = getCompletionStatus(report.date, report.userEmail);
                        return (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${completionStatus === 'Fully Completed' ? 'bg-green-100 text-green-700' :
                              completionStatus === 'Incomplete' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {completionStatus}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      {report.progressScore ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-bg-input rounded-full overflow-hidden">
                            <div className="h-full bg-blue rounded-full" style={{ width: `${(report.progressScore / 10) * 100}%` }} />
                          </div>
                          <span className="font-black text-text-secondary text-[10px]">{report.progressScore}/10</span>
                        </div>
                      ) : <span className="text-text-muted italic">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setViewingReport(report)}
                        className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all group-hover:scale-110"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-3 border-t border-border bg-bg-secondary text-[10px] font-bold text-text-muted uppercase tracking-widest">
          Showing {filteredReports.length} of {reports.length} records
        </div>
      </div>

      {/* View Report Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setViewingReport(null)}>
          <div className="bg-bg-card border border-border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className={`p-6 flex items-center justify-between text-white ${viewingReport.type === 'SOD' ? 'bg-blue-600' : 'bg-purple-600'}`}>
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  {viewingReport.type === 'SOD' ? <Send size={18} /> : <FileText size={18} />}
                  {viewingReport.type} Report — {viewingReport.date}
                </h2>
                <p className="text-[10px] opacity-75 font-bold uppercase tracking-widest mt-0.5">By {viewingReport.userName}</p>
              </div>
              <button onClick={() => setViewingReport(null)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-bg-card">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Check-In', value: viewingReport.checkInTime },
                  { label: 'Check-Out', value: viewingReport.checkOutTime },
                  { label: 'Duration', value: viewingReport.workDuration },
                  { label: 'Completion', value: viewingReport.completionStatus },
                  { label: 'Progress Score', value: viewingReport.progressScore ? `${viewingReport.progressScore}/10` : null },
                  { label: 'Mood / Energy', value: viewingReport.moodEnergy },
                ].map(item => item.value ? (
                  <div key={item.label} className="bg-bg-input rounded-2xl p-4 border border-border">
                    <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">{item.label}</div>
                    <div className="font-black text-text-primary text-sm">{item.value}</div>
                  </div>
                ) : null)}
              </div>
              {viewingReport.plannedTasks && (
                <div className="bg-accent-soft rounded-2xl p-5 border border-accent-soft">
                  <div className="text-[9px] font-black text-accent uppercase tracking-widest mb-2">Planned Tasks</div>
                  <p className="text-sm text-text-primary font-medium leading-relaxed whitespace-pre-wrap">{viewingReport.plannedTasks}</p>
                </div>
              )}
              {viewingReport.sodCaseIds?.length > 0 && (
                <div className="bg-bg-input rounded-2xl p-4 border border-border">
                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Selected Cases</div>
                  <div className="flex flex-wrap gap-2">
                    {viewingReport.sodCaseIds.map(cid => (
                      <span key={cid} className="bg-accent text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase">{cid}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewingReport.workSummary && (
                <div className="bg-blue-soft rounded-2xl p-5 border border-blue-soft">
                  <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Work Summary</div>
                  <p className="text-sm text-text-primary font-medium leading-relaxed whitespace-pre-wrap">{viewingReport.workSummary}</p>
                </div>
              )}
              {viewingReport.challenges && (
                <div className="bg-red-soft rounded-2xl p-5 border border-red-soft">
                  <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Challenges / Blockers</div>
                  <p className="text-sm text-text-primary font-medium leading-relaxed whitespace-pre-wrap">{viewingReport.challenges}</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border bg-bg-card flex justify-end gap-3">
              <button onClick={() => setViewingReport(null)} className="px-6 py-2.5 bg-bg-secondary text-text-primary border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-bg-input transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const StatCard = ({ icon, title, value, subtext, trend, isProgress }) => (
  <div className="bg-bg-card rounded-2xl border-2 border-border p-6 shadow-sm hover:border-accent transition-all duration-300 group cursor-default">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 rounded-2xl bg-bg-input group-hover:bg-accent-soft transition-colors border border-border">
        {icon}
      </div>
      <div className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${trend === 'LIVE' ? 'bg-green-soft text-green animate-pulse' :
          trend === 'ONGOING' ? 'bg-yellow-soft text-yellow animate-pulse' : 'bg-blue-soft text-blue'
        }`}>
        {trend}
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">{title}</h3>
      <div className="text-3xl font-black text-text-primary">{value}</div>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-tight">{subtext}</p>
    </div>
    {isProgress && (
      <div className="mt-4 h-1.5 w-full bg-bg-input rounded-full overflow-hidden">
        <div className="h-full bg-green rounded-full" style={{ width: trend }} />
      </div>
    )}
  </div>
);

export default WorkReportTab;
