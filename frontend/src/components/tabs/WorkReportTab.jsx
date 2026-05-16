import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState(location.state?.userEmail || 'All');
  const [dayActivities, setDayActivities] = useState([]);
  const [dayTasks, setDayTasks] = useState([]);
  const [fetchingActivities, setFetchingActivities] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, reportsRes] = await Promise.all([
        api.get('/reports/stats'),
        api.get('/reports')
      ]);
      setStats(statsRes.data);
      const reportList = reportsRes.data.reports || (Array.isArray(reportsRes.data) ? reportsRes.data : []);
      setReports(reportList || []);

      if (statsRes.data?.role === 'Admin') {
        try {
          const usersRes = await api.get('/auth/users');
          setUsers(usersRes.data || []);
        } catch (userErr) {
          console.error('Failed to fetch users for filter:', userErr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch work report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.userEmail) {
      setFilterUser(location.state.userEmail);
    }
  }, [location.state?.userEmail]);

  const parseTimeString = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toLowerCase();
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  const formatDuration = (startTime, endTime) => {
    const start = parseTimeString(startTime);
    const end = parseTimeString(endTime);
    if (!start || !end) return '';
    let diff = (end - start) / 1000 / 60;
    if (diff < 0) diff += 24 * 60;
    const hours = Math.floor(diff / 60);
    const minutes = Math.round(diff % 60);
    return `${hours}h ${minutes}m`;
  };

  const aggregatedReports = useMemo(() => {
    const groups = {};

    reports.forEach(r => {
      const key = `${r.date || 'unknown'}_${r.userEmail || r.userName || 'unknown'}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          date: r.date,
          userEmail: r.userEmail,
          userName: r.userName,
          sod: null,
          eod: null,
          commCount: 0,
          docCount: 0,
          progressCount: 0,
          taskCount: 0,
          reports: []
        };
      }

      groups[key].reports.push(r);
      if (r.type === 'SOD') groups[key].sod = r;
      if (r.type === 'EOD') groups[key].eod = r;
      groups[key].commCount = Math.max(groups[key].commCount, r.commCount || 0);
      groups[key].docCount = Math.max(groups[key].docCount, r.docCount || 0);
      groups[key].progressCount = Math.max(groups[key].progressCount, r.progressCount || 0);
      groups[key].taskCount = Math.max(groups[key].taskCount, r.taskCount || 0);
    });

    return Object.values(groups).map(group => {
      const hasSod = !!group.sod;
      const hasEod = !!group.eod;
      const type = hasSod && hasEod ? 'SOD+EOD' : hasSod ? 'SOD' : 'EOD';
      const checkInTime = group.sod?.checkInTime || group.eod?.checkInTime || '';
      const checkOutTime = group.eod?.checkOutTime || group.sod?.checkOutTime || '';
      const duration = group.eod?.workDuration || formatDuration(checkInTime, checkOutTime);
      return {
        ...group,
        type,
        checkInTime,
        checkOutTime,
        duration,
        plannedTasks: group.sod?.plannedTasks || '',
        workSummary: group.eod?.workSummary || group.sod?.plannedTasks || '',
        progressScore: group.eod?.progressScore || null,
        moodEnergy: group.eod?.moodEnergy || '',
        completionStatus: hasSod && hasEod ? 'Fully Completed' : 'Incomplete',
        commCount: group.commCount,
        docCount: group.docCount,
        progressCount: group.progressCount,
        taskCount: group.taskCount
      };
    });
  }, [reports]);

  const filteredReports = aggregatedReports.filter(r => {
    const typeMatch = filterType === 'All'
      || (filterType === 'SOD' && (r.type === 'SOD' || r.type === 'SOD+EOD'))
      || (filterType === 'EOD' && (r.type === 'EOD' || r.type === 'SOD+EOD'));
    const dateMatch = !filterDate || r.date === filterDate;
    const userMatch = filterUser === 'All' || r.userEmail === filterUser;
    return typeMatch && dateMatch && userMatch;
  });

  const getCompletionStatus = (report) => {
    return report.completionStatus;
  };

  const handleViewReport = async (report) => {
    if (viewingReport?.key === report.key) {
      setViewingReport(null);
      return;
    }
    setViewingReport(report);
    setFetchingActivities(true);
    setDayActivities([]);
    setDayTasks([]);
    try {
      const params = new URLSearchParams();
      if (report.date) params.append('date', report.date);
      if (report.userEmail) params.append('userEmail', report.userEmail);
      if (report.userName) params.append('userName', report.userName);
      
      const timelinePromise = api.get(`/timeline?${params.toString()}`);
      
      // For tasks, we need to find the fullName from users list if possible
      const targetUser = users.find(u => u.email === report.userEmail);
      const taskParams = new URLSearchParams();
      if (report.date) taskParams.append('date', report.date);
      if (targetUser) taskParams.append('assignee', targetUser.fullName);
      else if (report.userName) taskParams.append('assignee', report.userName);
      
      const tasksPromise = api.get(`/tasks?${taskParams.toString()}`);

      const [timelineRes, tasksRes] = await Promise.all([timelinePromise, tasksPromise]);
      const tlData = timelineRes.data.logs || timelineRes.data.timeline || (Array.isArray(timelineRes.data) ? timelineRes.data : []);
      const taskData = tasksRes.data.tasks || (Array.isArray(tasksRes.data) ? tasksRes.data : []);
      
      setDayActivities(tlData);
      setDayTasks(taskData);
    } catch (err) {
      console.error('Failed to fetch day activities or tasks:', err);
    } finally {
      setFetchingActivities(false);
    }
  };

  // ── Download as CSV with Full Details ──
  const handleDownload = async () => {
    if (filteredReports.length === 0) return;
    
    setLoading(true);
    try {
      const detailedRows = await Promise.all(filteredReports.map(async (r) => {
        const params = new URLSearchParams();
        if (r.date) params.append('date', r.date);
        if (r.userEmail) params.append('userEmail', r.userEmail);
        
        // Fetch specific activities for this report row
        const [timelineRes, tasksRes] = await Promise.all([
          api.get(`/timeline?${params.toString()}`),
          // We try to find the fullName from our users list to match the assignee
          api.get(`/tasks?date=${r.date}&assignee=${users.find(u => u.email === r.userEmail)?.fullName || r.userName}`)
        ]);

        const timelineData = timelineRes.data.logs || timelineRes.data.timeline || (Array.isArray(timelineRes.data) ? timelineRes.data : []);
        const taskData = tasksRes.data.tasks || (Array.isArray(tasksRes.data) ? tasksRes.data : []);

        const comms = timelineData
          .filter(a => ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'].includes(a.eventType))
          .map(a => `${a.caseId || 'N/A'}: ${a.summary}`)
          .join(' | ');

        const docs = timelineData
          .filter(a => a.eventType === 'Document Upload')
          .map(a => `${a.caseId || 'N/A'}: ${a.summary}`)
          .join(' | ');

        const progress = timelineData
          .filter(a => a.eventType === 'Progress Update')
          .map(a => `${a.caseId || 'N/A'}: ${a.summary}`)
          .join(' | ');

        const tasks = taskData
          .map(t => `${t.taskId || 'N/A'}: ${t.title} [${t.status}]`)
          .join(' | ');

        return [
          r.date || '',
          r.type || '',
          r.userName || '',
          r.checkInTime || '',
          r.checkOutTime || '',
          r.duration || '',
          (r.plannedTasks || '').replace(/\n/g, ' '),
          (r.workSummary || '').replace(/\n/g, ' '),
          getCompletionStatus(r) || '',
          r.progressScore || '',
          r.moodEnergy || '',
          comms,
          docs,
          progress,
          tasks,
          (r.commCount || 0) + (r.docCount || 0) + (r.progressCount || 0) + (r.taskCount || 0)
        ];
      }));

      const headers = [
        'Date', 'Type', 'Submitted By', 'Check-In', 'Check-Out', 'Duration', 
        'Planned Tasks', 'Work Summary', 'Completion', 'Progress Score', 'Mood',
        'Communication Details (ID: Summary)', 'Document Details (ID: Summary)', 
        'Progress Updates (ID: Summary)', 'Task Details (ID: Title [Status])', 'Total Activity Count'
      ];

      const csvContent = [headers, ...detailedRows].map(row => 
        row.map(v => {
          const content = String(v || '');
          return `"${content.replace(/"/g, '""')}"`;
        }).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Detailed_Work_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Detailed Export Error:', err);
      alert('Failed to generate detailed report. Please try again.');
    } finally {
      setLoading(false);
    }
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

            {isAdmin && (
              <div className="flex items-center gap-2 bg-bg-input border-2 border-border rounded-xl px-3 py-2.5 shadow-inner">
                <span className="text-[10px] uppercase tracking-widest text-text-secondary">User</span>
                <select
                  className="bg-transparent outline-none text-xs font-bold text-text-primary"
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                >
                  <option value="All">All Users</option>
                  {users.map(u => (
                    <option key={u.email} value={u.email}>{u.fullName}</option>
                  ))}
                </select>
              </div>
            )}

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
                  <React.Fragment key={report.key}>
                    <tr
                      className={`hover:bg-bg-card-hover transition-colors group cursor-pointer ${viewingReport?.key === report.key ? 'bg-bg-input ring-1 ring-accent/20' : ''}`}
                      onClick={() => handleViewReport(report)}
                    >
                      <td className="px-5 py-3.5 font-bold text-text-primary whitespace-nowrap">{report.date || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${report.type === 'SOD' ? 'bg-blue-soft text-blue-400' : report.type === 'EOD' ? 'bg-purple-soft text-purple-400' : 'bg-slate-soft text-slate-500'}`}>
                          {report.type === 'SOD' ? <Send size={9} /> : report.type === 'EOD' ? <FileText size={9} /> : <CheckCircle2 size={9} />}
                          {report.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-text-secondary">{report.userName || '—'}</td>
                      <td className="px-5 py-3.5 font-bold text-green-400">{report.checkInTime || '—'}</td>
                      <td className="px-5 py-3.5 font-bold text-blue-400">{report.checkOutTime || '—'}</td>
                      <td className="px-5 py-3.5">
                        {report.duration ? (
                          <span className="font-black text-text-primary">{report.duration}</span>
                        ) : <span className="text-text-muted italic">—</span>}
                      </td>
                      <td className="px-5 py-3.5 max-w-[250px]">
                        <p className="truncate text-gray-600" title={report.plannedTasks}>
                          {report.plannedTasks || <span className="text-gray-300 italic">—</span>}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        {(() => {
                          const completionStatus = getCompletionStatus(report);
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
                        <div className="text-[11px] font-black text-text-secondary">
                          {(report.commCount || 0) + (report.docCount || 0) + (report.progressCount || 0) + (report.taskCount || 0)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {report.commCount || 0}C · {report.docCount || 0}D · {report.progressCount || 0}P · {report.taskCount || 0}T
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          className={`p-2 rounded-xl transition-all ${viewingReport?.key === report.key ? 'bg-accent text-white rotate-180' : 'bg-bg-input text-text-muted hover:text-accent'}`}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Activity Content */}
                    {viewingReport?.key === report.key && (
                      <tr className="bg-bg-input/30">
                        <td colSpan="10" className="px-8 py-6">
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            {/* Report Details */}
                            <div className="mb-6 p-4 bg-bg-card rounded-2xl border border-border">
                              <div className="flex items-center gap-2 mb-3">
                                <ClipboardList size={16} className="text-accent" />
                                <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                  {report.type === 'SOD'
                                    ? 'Planned Tasks (SOD)'
                                    : report.type === 'EOD'
                                      ? 'Work Summary (EOD)'
                                      : 'SOD + EOD Details'}
                                </h3>
                              </div>
                              {report.type === 'SOD+EOD' ? (
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-[11px] font-black uppercase text-text-secondary mb-2">Planned Tasks</h4>
                                    <p className="text-[12px] font-bold text-text-secondary whitespace-pre-wrap leading-relaxed">
                                      {report.plannedTasks || 'No tasks listed'}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-[11px] font-black uppercase text-text-secondary mb-2">Work Summary</h4>
                                    <p className="text-[12px] font-bold text-text-secondary whitespace-pre-wrap leading-relaxed">
                                      {report.workSummary || 'No summary listed'}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[12px] font-bold text-text-secondary whitespace-pre-wrap leading-relaxed">
                                  {report.type === 'SOD' ? (report.plannedTasks || 'No tasks listed') : (report.workSummary || 'No summary listed')}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                              {/* Communications */}
                              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[300px] max-h-[500px]">
                                <div className="px-4 py-3 border-b border-border bg-blue-soft/20 flex items-center gap-2">
                                  <Send size={12} className="text-blue" />
                                  <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest">Communications</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                                  {fetchingActivities ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-50">Loading...</div>
                                  ) : dayActivities.filter(a => ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting', 'Communication'].includes(a.eventType)).length === 0 ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-30">No activities</div>
                                  ) : (
                                    dayActivities.filter(a => ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting', 'Communication'].includes(a.eventType)).map((act, i) => (
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
                                  ) : dayActivities.filter(a => ['Document Upload', 'Document Uploaded', 'Document Indexed'].includes(a.eventType)).length === 0 ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-30">No uploads</div>
                                  ) : (
                                    dayActivities.filter(a => ['Document Upload', 'Document Uploaded', 'Document Indexed'].includes(a.eventType)).map((act, i) => (
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
                                  ) : dayActivities.filter(a => ['Progress Update', 'Status Update', 'Progress Updated'].includes(a.eventType)).length === 0 ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-30">No updates</div>
                                  ) : (
                                    dayActivities.filter(a => ['Progress Update', 'Status Update', 'Progress Updated'].includes(a.eventType)).map((act, i) => (
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

                              {/* Tasks Overview */}
                              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[300px] max-h-[500px]">
                                <div className="px-4 py-3 border-b border-border bg-yellow-soft/20 flex items-center gap-2">
                                  <ClipboardList size={12} className="text-yellow-600" />
                                  <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest">Tasks Overview</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                                  {fetchingActivities ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-50">Loading...</div>
                                  ) : dayTasks.length === 0 ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-30">No tasks updated</div>
                                  ) : (
                                    ['To Do', 'In Progress', 'Completed'].map(status => {
                                      const statusTasks = dayTasks.filter(t => t.status === status);
                                      if (statusTasks.length === 0) return null;
                                      return (
                                        <div key={status} className="space-y-2">
                                          <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded w-fit ${status === 'Completed' ? 'bg-green-soft text-green' :
                                              status === 'In Progress' ? 'bg-blue-soft text-blue' :
                                                'bg-slate-soft text-slate-500'
                                            }`}>
                                            {status} ({statusTasks.length})
                                          </div>
                                          <div className="space-y-1.5">
                                            {statusTasks.map((task, idx) => (
                                              <div key={idx} className="p-3 bg-bg-input rounded-xl border border-border/50">
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-[8px] font-bold text-text-muted">{task.taskId}</span>
                                                  {task.priority && <span className={`text-[7px] font-black uppercase ${task.priority === 'High' ? 'text-red' : 'text-blue'}`}>{task.priority}</span>}
                                                </div>
                                                <p className="text-[10px] font-bold text-text-primary leading-tight">{task.title}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* All Activity */}
                              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[300px] max-h-[500px]">
                                <div className="px-4 py-3 border-b border-border bg-slate-100 flex items-center gap-2">
                                  <Clock size={12} className="text-slate-600" />
                                  <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest">All Activity</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                                  {fetchingActivities ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-50">Loading...</div>
                                  ) : dayActivities.length === 0 ? (
                                    <div className="h-full flex items-center justify-center italic text-[9px] uppercase font-bold tracking-widest opacity-30">No activity logged</div>
                                  ) : (
                                    dayActivities.map((act, i) => (
                                      <div key={i} className="p-3 bg-bg-input rounded-xl border border-border/50">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[8px] font-black uppercase text-text-secondary">{act.eventType}</span>
                                          <span className="text-[8px] font-bold text-text-muted">{act.caseId}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-text-primary">{act.summary}</p>
                                        {act.details && <p className="text-[8px] text-text-muted italic mt-1 leading-tight">{act.details}</p>}
                                        {act.metadata?.fileLink && (
                                          <a href={act.metadata.fileLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[8px] font-black text-accent uppercase hover:underline">
                                            <Eye size={10} /> View file
                                          </a>
                                        )}
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
