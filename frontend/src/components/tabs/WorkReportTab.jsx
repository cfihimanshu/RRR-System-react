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
  RefreshCw,
  ChevronDown
} from 'lucide-react';

const WorkReportTab = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [dayActivities, setDayActivities] = useState([]);
  const [fetchingActivities, setFetchingActivities] = useState(false);

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

  const handleViewReport = async (report) => {
    if (viewingReport?._id === report._id) {
      setViewingReport(null);
      return;
    }
    setViewingReport(report);
    setFetchingActivities(true);
    setDayActivities([]);
    try {
      // Fetch activities for that specific day and user
      const res = await api.get(`/timeline?date=${report.date}&userEmail=${report.userEmail}`);
      // Filter by source to ensure it's the specific user's activity
      const myActivities = res.data.filter(act => 
        (act.source || '').toLowerCase().includes((report.userName || '').toLowerCase()) || 
        (act.source || '').toLowerCase().includes((report.userEmail || '').toLowerCase())
      );
      setDayActivities(myActivities);
    } catch (err) {
      console.error('Failed to fetch day activities:', err);
    } finally {
      setFetchingActivities(false);
    }
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
                  <th className="px-5 py-3.5 text-left">Duration</th>
                  <th className="px-5 py-3.5 text-left">Planned Task</th>
                  <th className="px-5 py-3.5">Completion</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5 text-center">Other activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[12px] text-text-primary">
                {filteredReports.map(report => (
                  <React.Fragment key={report._id}>
                    <tr
                      className={`hover:bg-bg-card-hover transition-colors group cursor-pointer ${viewingReport?._id === report._id ? 'bg-bg-input ring-1 ring-accent/20' : ''}`}
                      onClick={() => handleViewReport(report)}
                    >
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
                          <span className="font-black text-text-primary">{report.workDuration}</span>
                        ) : <span className="text-text-muted italic">—</span>}
                      </td>
                      <td className="px-5 py-3.5 max-w-[250px]">
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
                          className={`p-2 rounded-xl transition-all ${viewingReport?._id === report._id ? 'bg-accent text-white rotate-180' : 'bg-bg-input text-text-muted hover:text-accent'}`}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Activity Content */}
                    {viewingReport?._id === report._id && (
                      <tr className="bg-bg-input/30">
                        <td colSpan="10" className="px-8 py-6">
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                              {/* Communications */}
                              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[300px] max-h-[500px]">
                                <div className="px-4 py-3 border-b border-border bg-blue-soft/20 flex items-center gap-2">
                                  <Send size={12} className="text-blue" />
                                  <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest">Communications</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                                  {fetchingActivities ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-50">Loading...</div>
                                  ) : dayActivities.filter(a => ['Call', 'Email', 'Whatsapp', 'Meeting'].includes(a.eventType)).length === 0 ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-30">No activities</div>
                                  ) : (
                                    dayActivities.filter(a => ['Call', 'Email', 'Whatsapp', 'Meeting'].includes(a.eventType)).map((act, i) => (
                                      <div key={i} className="p-3 bg-bg-input rounded-xl border border-border/50">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[8px] font-black text-blue uppercase">{act.eventType}</span>
                                          <span className="text-[8px] font-bold text-text-muted">{act.caseId}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-text-primary">{act.summary}</p>
                                        {act.details && <p className="text-[8px] text-text-muted italic mt-1 leading-tight">{act.details}</p>}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Documents */}
                              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[300px] max-h-[500px]">
                                <div className="px-4 py-3 border-b border-border bg-green-soft/20 flex items-center gap-2">
                                  <FileText size={12} className="text-green" />
                                  <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest">Documents</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                                  {fetchingActivities ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-50">Loading...</div>
                                  ) : dayActivities.filter(a => a.eventType === 'Document Upload').length === 0 ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-30">No uploads</div>
                                  ) : (
                                    dayActivities.filter(a => a.eventType === 'Document Upload').map((act, i) => (
                                      <div key={i} className="p-3 bg-bg-input rounded-xl border border-border/50">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[8px] font-black text-green uppercase">DOCUMENT</span>
                                          <span className="text-[8px] font-bold text-text-muted">{act.caseId}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-text-primary">{act.summary}</p>
                                        {act.metadata?.fileLink && (
                                          <a href={act.metadata.fileLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[8px] font-black text-accent uppercase hover:underline">
                                            <Eye size={10} /> View
                                          </a>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Progress */}
                              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[300px] max-h-[500px]">
                                <div className="px-4 py-3 border-b border-border bg-purple-soft/20 flex items-center gap-2">
                                  <TrendingUp size={12} className="text-purple" />
                                  <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest">Progress Updates</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                                  {fetchingActivities ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-50">Loading...</div>
                                  ) : dayActivities.filter(a => a.eventType === 'Progress Update').length === 0 ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-30">No updates</div>
                                  ) : (
                                    dayActivities.filter(a => a.eventType === 'Progress Update').map((act, i) => (
                                      <div key={i} className="p-3 bg-bg-input rounded-xl border border-border/50">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[8px] font-black text-purple uppercase">PROGRESS</span>
                                          <span className="text-[8px] font-bold text-text-muted">{act.caseId}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-text-primary">{act.summary}</p>
                                        {act.metadata?.stage && <div className="text-[8px] font-black text-purple uppercase mt-1">Stage: {act.metadata.stage}</div>}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
