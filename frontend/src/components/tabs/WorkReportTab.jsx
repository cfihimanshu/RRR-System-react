import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import TabLoader from '../shared/TabLoader';
import * as XLSX from 'xlsx';
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
  ChevronDown,
  MapPin,
  Camera
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
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterUser, setFilterUser] = useState(location.state?.userEmail || 'All');
  const [dateFilterPreset, setDateFilterPreset] = useState('All');

  const handlePresetChange = (preset) => {
    setDateFilterPreset(preset);
    const todayIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const todayStr = todayIST.toISOString().split('T')[0];

    if (preset === 'Today') {
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === 'Current Month') {
      const year = todayIST.getFullYear();
      const month = String(todayIST.getMonth() + 1).padStart(2, '0');
      const firstDay = `${year}-${month}-01`;
      
      const lastDayObj = new Date(year, todayIST.getMonth() + 1, 0);
      const lastDay = `${year}-${month}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
      
      setFilterStartDate(firstDay);
      setFilterEndDate(lastDay);
    } else {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };
  const [dayActivities, setDayActivities] = useState([]);
  const [dayTasks, setDayTasks] = useState([]);
  const [fetchingActivities, setFetchingActivities] = useState(false);
  const [previewSelfie, setPreviewSelfie] = useState(null);

  // Calendar Specific States
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarUserEmail, setCalendarUserEmail] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date(Date.now() + (5.5 * 60 * 60 * 1000)));
  const [leaves, setLeaves] = useState([]);
  const [blockedEmails, setBlockedEmails] = useState([]);

  const calendarUsersList = useMemo(() => {
    const userRole = (stats?.role || user?.role || '').toLowerCase().trim();
    const isUserAdmin = ['admin', 'super admin', 'superadmin'].includes(userRole);
    if (!isUserAdmin) {
      return users;
    }
    const restrictedRoles = ['admin', 'super admin', 'superadmin', 'accountant', 'reviewer', 'operation head', 'operation review'];
    return users.filter(u => {
      const roleLower = (u.role || '').toLowerCase().trim();
      return !restrictedRoles.includes(roleLower);
    });
  }, [users, stats?.role, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, reportsRes, leavesRes] = await Promise.all([
        api.get('/reports/stats'),
        api.get('/reports?limit=1000'),
        api.get('/leaves').catch(err => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      const reportList = reportsRes.data.reports || (Array.isArray(reportsRes.data) ? reportsRes.data : []);
      setReports(reportList || []);
      setLeaves(leavesRes.data || []);

      if (['Admin', 'Super Admin', 'SuperAdmin'].includes(statsRes.data?.role)) {
        try {
          const [usersRes, missedRes] = await Promise.all([
            api.get('/auth/users'),
            api.get('/users/missed-eod').catch(() => ({ data: [] }))
          ]);
          setUsers(usersRes.data || []);
          const blockedList = (missedRes.data || []).filter(u => !u.bypassEodCheck).map(u => u._id || u.email);
          setBlockedEmails(blockedList);
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
    if (user && users.length === 0) {
      setUsers([{ email: user.email, fullName: user.fullName || user.name || user.email }]);
    }
  }, [user, users]);

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
    const dateMatch = (!filterStartDate || r.date >= filterStartDate) &&
                      (!filterEndDate || r.date <= filterEndDate);
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

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const handleExportCalendar = () => {
    if (!calendarUserEmail) return;
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const rows = [];
    const todayIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const todayKey = todayIST.toISOString().split('T')[0];

    for (let d = 1; d <= totalDays; d++) {
      const dayObj = new Date(year, month, d);
      const dayOfWeek = dayObj.toLocaleDateString('default', { weekday: 'long' });
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const dayReports = reports.filter(r => r.date === dateStr && r.userEmail === calendarUserEmail);
      const hasSod = dayReports.some(r => r.type === 'SOD');
      const hasEod = dayReports.some(r => r.type === 'EOD');
      
      const aggRep = aggregatedReports.find(r => r.date === dateStr && r.userEmail === calendarUserEmail);

      const hasApprovedLeave = leaves.some(l =>
        l.requestedBy === calendarUserEmail &&
        l.status === 'Approved' &&
        l.startDate <= dateStr &&
        dateStr <= l.endDate
      );

      const isSunday = dayObj.getDay() === 0;

      let status = 'Absent';
      let checkIn = '—';
      let checkOut = '—';
      let duration = '—';

      if (isSunday) {
        status = 'Off Day';
      } else if (hasApprovedLeave) {
        status = 'Leave';
      } else if (hasSod && hasEod) {
        status = 'SOD+EOD';
      } else if (hasSod) {
        status = 'SOD';
      } else if (hasEod) {
        status = 'EOD';
      } else if (dateStr > todayKey) {
        status = 'Scheduled';
      }

      if (aggRep) {
        checkIn = aggRep.checkInTime || '—';
        checkOut = aggRep.checkOutTime || '—';
        duration = aggRep.duration || '—';
      }

      rows.push({
        'Date': dateStr,
        'Day': dayOfWeek,
        'Status': status,
        'Check-In': checkIn,
        'Check-Out': checkOut,
        'Duration': duration
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Date
      { wch: 12 }, // Day
      { wch: 15 }, // Status
      { wch: 15 }, // Check-In
      { wch: 15 }, // Check-Out
      { wch: 15 }  // Duration
    ];

    const userObj = users.find(u => u.email === calendarUserEmail);
    const userName = userObj ? (userObj.fullName || userObj.name) : calendarUserEmail;
    const monthName = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    XLSX.writeFile(workbook, `Attendance_Report_${userName.replace(/\s+/g, '_')}_${monthName.replace(/\s+/g, '_')}.xlsx`);
  };

  // ── Download as CSV with Full Details ──
  const handleDownload = async () => {
    setLoading(true);
    try {
      const detailedRows = [];

      // 1. Determine date range
      let start = filterStartDate;
      let end = filterEndDate;
      const todayIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
      const todayStr = todayIST.toISOString().split('T')[0];

      if (!start || !end) {
        const dates = reports.map(r => r.date).filter(Boolean).sort();
        if (dates.length > 0) {
          if (!start) start = dates[0];
          if (!end) end = todayStr; // Use current day as the end date for All Time/open-ended filters!
        } else {
          const past30 = new Date(todayIST.getTime() - 30 * 24 * 60 * 60 * 1000);
          const past30Str = past30.toISOString().split('T')[0];
          if (!start) start = past30Str;
          if (!end) end = todayStr;
        }
      }

      // 2. Generate all dates in range
      const dateList = [];
      let current = new Date(start);
      const stopDate = new Date(end);
      current.setHours(0, 0, 0, 0);
      stopDate.setHours(0, 0, 0, 0);

      while (current <= stopDate) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        dateList.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 1);
      }

      // 3. Determine target users
      let targetUsers = [];
      if (filterUser && filterUser !== 'All') {
        targetUsers = users.filter(u => u.email === filterUser);
      } else {
        targetUsers = calendarUsersList.length > 0 
          ? calendarUsersList 
          : users.filter(u => u.role !== 'Admin' && u.role !== 'Super Admin' && u.role !== 'SuperAdmin');
      }

      // 4. Generate rows
      for (const u of targetUsers) {
        const userEmail = u.email;
        const userName = u.fullName || u.name || u.email;

        for (const dateStr of dateList) {
          const parts = dateStr.split('-');
          const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayOfWeek = daysOfWeek[dateObj.getDay()];

          // Find matching report in aggregated reports and apply type filter
          let r = aggregatedReports.find(rep => rep.date === dateStr && rep.userEmail === userEmail);
          if (r) {
            const matchesType = filterType === 'All'
              || (filterType === 'SOD' && (r.type === 'SOD' || r.type === 'SOD+EOD'))
              || (filterType === 'EOD' && (r.type === 'EOD' || r.type === 'SOD+EOD'));
            if (!matchesType) {
              r = null;
            }
          }

          const hasApprovedLeave = leaves.some(l =>
            l.requestedBy === userEmail &&
            l.status === 'Approved' &&
            l.startDate <= dateStr &&
            dateStr <= l.endDate
          );

          let status = 'Absent';
          if (r) {
            status = 'Present';
            if (dateObj.getDay() === 0) {
              status = 'Off Day';
            } else if (hasApprovedLeave) {
              status = 'Leave';
            }
          } else {
            if (dateObj.getDay() === 0) {
              status = 'Off Day';
            } else if (hasApprovedLeave) {
              status = 'Leave';
            } else if (dateStr > todayStr) {
              status = 'Scheduled';
            }
          }

          let comms = '';
          let docs = '';
          let progress = '';
          let tasks = '';
          let type = r?.type || '—';
          let checkInTime = r?.checkInTime || '—';
          let checkOutTime = r?.checkOutTime || '—';
          let duration = r?.duration || '—';
          let plannedTasks = r?.plannedTasks || '';
          let workSummary = r?.workSummary || '';
          let completionStatus = r ? getCompletionStatus(r) : '—';
          let progressScore = r?.progressScore || '';
          let moodEnergy = r?.moodEnergy || '';
          let totalActivityCount = r ? ((r.commCount || 0) + (r.docCount || 0) + (r.progressCount || 0) + (r.taskCount || 0)) : 0;

          if (r) {
            // Fetch detailed logs and tasks
            const params = new URLSearchParams();
            params.append('date', dateStr);
            params.append('userEmail', userEmail);

            const taskParams = new URLSearchParams();
            taskParams.append('date', dateStr);
            taskParams.append('assignee', userName);

            try {
              const [timelineRes, tasksRes] = await Promise.all([
                api.get(`/timeline?${params.toString()}`),
                api.get(`/tasks?${taskParams.toString()}`)
              ]);

              const timelineData = timelineRes.data.logs || timelineRes.data.timeline || (Array.isArray(timelineRes.data) ? timelineRes.data : []);
              const taskData = tasksRes.data.tasks || (Array.isArray(tasksRes.data) ? tasksRes.data : []);

              comms = timelineData
                .filter(a => ['Call', 'Email', 'Whatsapp', 'WhatsApp', 'Meeting'].includes(a.eventType))
                .map(a => `• ${a.caseId || 'N/A'}: ${a.summary}`)
                .join('\n');

              docs = timelineData
                .filter(a => a.eventType === 'Document Upload')
                .map(a => `• ${a.caseId || 'N/A'}: ${a.summary}`)
                .join('\n');

              progress = timelineData
                .filter(a => a.eventType === 'Progress Update')
                .map(a => `• ${a.caseId || 'N/A'}: ${a.summary}`)
                .join('\n');

              tasks = taskData
                .map(t => `• ${t.taskId || 'N/A'}: ${t.title} [${t.status}]`)
                .join('\n');
            } catch (apiErr) {
              console.error(`Error fetching details for ${userEmail} on ${dateStr}:`, apiErr);
            }
          }

          detailedRows.push([
            dateStr,
            dayOfWeek,
            status,
            type,
            userName,
            checkInTime,
            checkOutTime,
            duration,
            plannedTasks,
            workSummary,
            completionStatus,
            progressScore,
            moodEnergy,
            comms,
            docs,
            progress,
            tasks,
            totalActivityCount
          ]);
        }
      }

      const headers = [
        'Date', 'Day', 'Status', 'Type', 'Submitted By', 'Check-In', 'Check-Out', 'Duration',
        'Planned Tasks', 'Work Summary', 'Completion', 'Progress Score', 'Mood',
        'Communication Details (ID: Summary)', 'Document Details (ID: Summary)',
        'Progress Updates (ID: Summary)', 'Task Details (ID: Title [Status])', 'Total Activity Count'
      ];

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...detailedRows]);

      // Calculate column widths for clean structure
      const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        detailedRows.forEach(row => {
          const val = String(row[i] || '');
          if (val.length > maxLen) {
            maxLen = val.length;
          }
        });
        // Limit max width to 50 characters to prevent extremely wide columns, min width 10
        return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Detailed Work Report');

      const fileName = `Detailed_Work_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Detailed Export Error:', err);
      alert('Failed to generate detailed report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full w-full min-h-[400px]">
      <TabLoader minHeight="400px" text="Loading Work Analytics" />
    </div>
  );

  const isAdmin = ['Admin', 'Super Admin', 'SuperAdmin'].includes(stats?.role);

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
            type="button"
            onClick={() => {
              const defaultEmail = calendarUsersList.find(u => u.email === user?.email)
                ? user?.email
                : (calendarUsersList[0]?.email || user?.email || '');
              setCalendarUserEmail(defaultEmail);
              setShowCalendarModal(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all bg-bg-card border-2 border-border text-text-primary hover:bg-bg-input hover:border-accent hover:text-accent shadow-md active:scale-95 cursor-pointer"
          >
            <Calendar size={18} className="text-accent" /> Calendar
          </button>
          {isAdmin && (
            <button
              onClick={handleDownload}
              className="btn btn-primary !py-3 !px-6 !rounded-xl shadow-lg shadow-blue-900/20"
            >
              <Download size={18} /> Export
            </button>
          )}
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
            {/* Date Preset Dropdown */}
            <div className="flex items-center gap-2 bg-bg-input border-2 border-border rounded-xl px-3 py-2 shadow-inner">
              <span className="text-text-secondary">
                <Calendar size={16} className="text-accent" />
              </span>
              <select
                className="bg-transparent outline-none text-xs font-bold text-text-primary cursor-pointer"
                value={dateFilterPreset}
                onChange={e => handlePresetChange(e.target.value)}
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Current Month">Current Month</option>
                <option value="Custom Range">Custom Range</option>
              </select>
            </div>

            {/* Custom Range Date Pickers */}
            {dateFilterPreset === 'Custom Range' && (
              <>
                <div className="flex items-center gap-2 bg-bg-input border-2 border-border rounded-xl px-3 py-2 shadow-inner">
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">From</span>
                  <input
                    type="date"
                    className="bg-transparent text-xs font-bold text-text-primary outline-none"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                  />
                  {filterStartDate && (
                    <button onClick={() => setFilterStartDate('')} className="text-gray-400 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-bg-input border-2 border-border rounded-xl px-3 py-2 shadow-inner">
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">To</span>
                  <input
                    type="date"
                    className="bg-transparent text-xs font-bold text-text-primary outline-none"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                  />
                  {filterEndDate && (
                    <button onClick={() => setFilterEndDate('')} className="text-gray-400 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </>
            )}

            {isAdmin && (
              <div className="flex items-center gap-2 bg-bg-input border-2 border-border rounded-xl px-3 py-2.5 shadow-inner">
                {/* <span className="text-[10px] uppercase tracking-widest text-text-secondary">User</span> */}
                <span className="text-text-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <select
                  className="bg-transparent outline-none text-xs font-bold text-text-primary"
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                >
                  <option value="All">All Users</option>
                  {users
                    .filter(u => u.role !== 'Admin' && u.role !== 'Super Admin' && u.role !== 'SuperAdmin')
                    .map(u => (
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
                        <td colSpan="9" className="px-8 py-6">
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            {/* Report Details & GPS Verification Grid */}
                            <div className={`grid grid-cols-1 ${report.sod?.selfieUrl || report.eod?.selfieUrl ? 'lg:grid-cols-3' : ''} gap-6 mb-6`}>
                              <div className={`${report.sod?.selfieUrl || report.eod?.selfieUrl ? 'lg:col-span-2' : ''} p-5 bg-bg-card rounded-2xl border border-border flex flex-col justify-between`}>
                                <div>
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
                                        <h4 className="text-[10px] font-black uppercase text-text-secondary mb-1">Planned Tasks</h4>
                                        <p className="text-[12px] font-bold text-text-secondary whitespace-pre-wrap leading-relaxed italic">
                                          "{report.plannedTasks || 'No tasks listed'}"
                                        </p>
                                      </div>
                                      <div className="border-t border-border/50 pt-3">
                                        <h4 className="text-[10px] font-black uppercase text-text-secondary mb-1">Work Summary</h4>
                                        <p className="text-[12px] font-bold text-text-secondary whitespace-pre-wrap leading-relaxed italic">
                                          "{report.workSummary || 'No summary listed'}"
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[12px] font-bold text-text-secondary whitespace-pre-wrap leading-relaxed italic">
                                      "{report.type === 'SOD' ? (report.plannedTasks || 'No tasks listed') : (report.workSummary || 'No summary listed')}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              {(report.sod?.selfieUrl || report.eod?.selfieUrl) && (
                                <div className="p-5 bg-bg-card rounded-2xl border border-border flex flex-col justify-between gap-4 overflow-y-auto max-h-[350px] scrollbar-thin">
                                  {report.sod?.selfieUrl && (
                                    <div className="flex flex-col sm:flex-row lg:flex-col justify-between gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted uppercase tracking-widest">
                                          <MapPin size={12} className="text-accent" /> SOD Location lock
                                        </div>
                                        <div className="p-3 bg-bg-input rounded-xl border border-border/50">
                                          <div className="text-[8px] font-black text-text-muted uppercase">Coordinates</div>
                                          <div className="font-mono text-[10px] font-bold text-text-primary mt-0.5">
                                            {report.sod.latitude?.toFixed(6)}°, {report.sod.longitude?.toFixed(6)}°
                                          </div>
                                          {report.sod.latitude && report.sod.longitude && (
                                            <a
                                              href={`https://www.google.com/maps?q=${report.sod.latitude},${report.sod.longitude}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="mt-2 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-accent hover:text-accent-hover hover:underline"
                                            >
                                              <MapPin size={8} /> Track on Map →
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted uppercase tracking-widest self-start mb-2 lg:mb-1">
                                          <Camera size={12} className="text-accent" /> SOD Selfie Proof
                                        </div>
                                        <div
                                          className="w-32 h-24 rounded-lg overflow-hidden border border-border shadow bg-black transition-all hover:scale-[1.04] active:scale-95 cursor-pointer relative group"
                                          title="Click to view full image"
                                          onClick={() => setPreviewSelfie({ url: report.sod.selfieUrl, type: 'SOD Checkpoint', userName: report.userName, lat: report.sod.latitude, lng: report.sod.longitude })}
                                        >
                                          <img src={report.sod.selfieUrl} alt="SOD GPS Selfie" className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all">
                                            <Eye size={16} />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {report.eod?.selfieUrl && (
                                    <div className="flex flex-col sm:flex-row lg:flex-col justify-between gap-4 pt-2">
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted uppercase tracking-widest">
                                          <MapPin size={12} className="text-purple" /> EOD Location lock
                                        </div>
                                        <div className="p-3 bg-bg-input rounded-xl border border-border/50">
                                          <div className="text-[8px] font-black text-text-muted uppercase">Coordinates</div>
                                          <div className="font-mono text-[10px] font-bold text-text-primary mt-0.5">
                                            {report.eod.latitude?.toFixed(6)}°, {report.eod.longitude?.toFixed(6)}°
                                          </div>
                                          {report.eod.latitude && report.eod.longitude && (
                                            <a
                                              href={`https://www.google.com/maps?q=${report.eod.latitude},${report.eod.longitude}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="mt-2 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-purple hover:text-purple/80 hover:underline"
                                            >
                                              <MapPin size={8} /> Track on Map →
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-text-muted uppercase tracking-widest self-start mb-2 lg:mb-1">
                                          <Camera size={12} className="text-purple" /> EOD Selfie Proof
                                        </div>
                                        <div
                                          className="w-32 h-24 rounded-lg overflow-hidden border border-border shadow bg-black transition-all hover:scale-[1.04] active:scale-95 cursor-pointer relative group"
                                          title="Click to view full image"
                                          onClick={() => setPreviewSelfie({ url: report.eod.selfieUrl, type: 'EOD Checkpoint', userName: report.userName, lat: report.eod.latitude, lng: report.eod.longitude })}
                                        >
                                          <img src={report.eod.selfieUrl} alt="EOD GPS Selfie" className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all">
                                            <Eye size={16} />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
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

      {/* Premium Lightbox Selfie Preview Modal */}
      {previewSelfie && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="relative w-full max-w-[500px] bg-bg-card border-2 border-border rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-bg-secondary/40">
              <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <Camera size={14} className="text-accent" /> GPS Selfie Proof
              </span>
              <button
                type="button"
                onClick={() => setPreviewSelfie(null)}
                className="p-2 text-text-muted hover:text-accent bg-bg-input rounded-xl border border-border hover:border-accent/30 transition-all active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content / Picture */}
            <div className="p-6 flex flex-col items-center gap-4 bg-black/20">
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-black shadow-inner">
                <img src={previewSelfie.url} alt="Selfie Proof" className="w-full h-full object-cover" />
              </div>

              {/* Telemetry info */}
              <div className="w-full p-4 bg-bg-input rounded-2xl border border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-text-muted uppercase tracking-widest">Verification Target</div>
                  <div className="text-xs font-black text-text-primary uppercase">
                    {previewSelfie.type} • {previewSelfie.userName}
                  </div>
                </div>
                {previewSelfie.lat && previewSelfie.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${previewSelfie.lat},${previewSelfie.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-[10px] font-black uppercase tracking-wider text-accent border border-accent/20 bg-accent/5 hover:bg-accent hover:text-white transition-all active:scale-95"
                  >
                    <MapPin size={12} /> Track Location →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="relative w-full max-w-[800px] bg-bg-card border-2 border-border rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-secondary/40">
              <span className="text-sm font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar size={18} className="text-accent" /> Attendance Calendar
              </span>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="p-2 text-text-muted hover:text-accent bg-bg-input rounded-xl border border-border hover:border-accent/30 transition-all active:scale-95 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 scrollbar-thin">
              {/* User Selection & Month Navigation */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                
                {/* User Dropdown & Export Button */}
                <div className="flex flex-wrap items-end gap-3 min-w-[250px] flex-1">
                  <div className="flex flex-col gap-1.5 min-w-[220px]">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Select User</span>
                    <select
                      className="bg-bg-input border-2 border-border rounded-xl px-4 py-2 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[42px] cursor-pointer"
                      value={calendarUserEmail}
                      onChange={(e) => setCalendarUserEmail(e.target.value)}
                    >
                      {calendarUsersList.map((u) => (
                        <option key={u.email} value={u.email}>
                          {u.fullName || u.name || u.email} ({u.role || ''})
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Month Navigation */}
                <div className="flex items-center gap-3 h-[42px] self-end sm:self-center mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(calendarDate);
                      d.setMonth(d.getMonth() - 1);
                      setCalendarDate(d);
                    }}
                    className="p-2 border-2 border-border rounded-xl text-text-primary hover:bg-bg-input hover:border-accent transition-all cursor-pointer flex items-center justify-center"
                  >
                    <ChevronDown size={18} className="rotate-90 text-text-primary" />
                  </button>
                  <span className="text-sm font-black text-text-primary min-w-[140px] text-center select-none capitalize">
                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(calendarDate);
                      d.setMonth(d.getMonth() + 1);
                      setCalendarDate(d);
                    }}
                    className="p-2 border-2 border-border rounded-xl text-text-primary hover:bg-bg-input hover:border-accent transition-all cursor-pointer flex items-center justify-center"
                  >
                    <ChevronDown size={18} className="-rotate-90 text-text-primary" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="bg-bg-card border-2 border-border rounded-2xl p-4 sm:p-6">
                {/* Days Header */}
                <div className="grid grid-cols-7 gap-2 mb-3 text-center border-b border-border pb-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-2.5">
                  {(() => {
                    const days = getCalendarDays();
                    const todayIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
                    const todayKey = todayIST.toISOString().split('T')[0];

                    return days.map((day, idx) => {
                      if (!day) {
                        return <div key={`empty-${idx}`} className="bg-bg-input/20 rounded-xl min-h-[80px] border border-transparent" />;
                      }

                      const isSunday = day.getDay() === 0;
                      const yearStr = day.getFullYear();
                      const monthStr = String(day.getMonth() + 1).padStart(2, '0');
                      const dateStr = String(day.getDate()).padStart(2, '0');
                      const dayKey = `${yearStr}-${monthStr}-${dateStr}`;

                      // Check if user has submitted SOD/EOD for this date
                      const dayReports = reports.filter(r => r.date === dayKey && r.userEmail === calendarUserEmail);
                      const hasSod = dayReports.some(r => r.type === 'SOD');
                      const hasEod = dayReports.some(r => r.type === 'EOD');
                      
                      // Check for approved leaves
                      const hasApprovedLeave = leaves.some(l =>
                        l.requestedBy === calendarUserEmail &&
                        l.status === 'Approved' &&
                        l.startDate <= dayKey &&
                        dayKey <= l.endDate
                      );

                      let status = 'Absent';
                      if (isSunday) {
                        status = 'Sunday';
                      } else if (hasApprovedLeave) {
                        status = 'Leave';
                      } else if (hasSod && hasEod) {
                        status = 'SOD+EOD';
                      } else if (hasSod) {
                        status = 'SOD';
                      } else if (hasEod) {
                        status = 'EOD';
                      } else if (dayKey > todayKey) {
                        status = 'Future';
                      }

                      return (
                        <div
                          key={dayKey}
                          className={`flex flex-col justify-between p-2 rounded-xl border-2 min-h-[80px] transition-all hover:scale-[1.02] ${dayKey === todayKey ? 'border-accent bg-accent/5' : 'border-border bg-bg-input/10'
                            }`}
                        >
                          <span className="text-[10px] font-black text-text-primary self-end select-none">
                            {day.getDate()}
                          </span>

                          <div className="mt-1">
                            {status === 'Sunday' && (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-lg w-full justify-center border border-blue-500/20 uppercase tracking-wider">
                                Off Day
                              </span>
                            )}
                            {status === 'Leave' && (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-lg w-full justify-center border border-amber-500/20 uppercase tracking-wider">
                                Leave
                              </span>
                            )}
                            {status === 'SOD+EOD' && (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-lg w-full justify-center border border-emerald-500/20 uppercase tracking-wider">
                                SOD+EOD
                              </span>
                            )}
                            {status === 'SOD' && (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-blue-400 bg-blue-500/5 px-1.5 py-0.5 rounded-lg w-full justify-center border border-blue-500/20 uppercase tracking-wider">
                                SOD
                              </span>
                            )}
                            {status === 'EOD' && (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-violet-400 bg-violet-500/5 px-1.5 py-0.5 rounded-lg w-full justify-center border border-violet-500/20 uppercase tracking-wider">
                                EOD
                              </span>
                            )}
                            {status === 'Absent' && (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-lg w-full justify-center border border-rose-500/20 uppercase tracking-wider">
                                Absent
                              </span>
                            )}
                            {status === 'Future' && (
                              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-text-muted/60 bg-bg-input px-1.5 py-0.5 rounded-lg w-full justify-center border border-border uppercase tracking-wider select-none">
                                Scheduled
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

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
