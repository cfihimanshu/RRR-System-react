import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { 
  BarChart3, 
  Target, 
  CheckCircle2, 
  Clock, 
  Users, 
  TrendingUp,
  Layout,
  Activity,
  ArrowUpRight,
  ClipboardList
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

const WorkReportTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch report stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
    </div>
  );

  const isAdmin = stats?.role === 'Admin';
  const chartData = [
    { name: 'SOD Reports', value: stats?.sodToday || 0, color: '#3B82F6' },
    { name: 'EOD Reports', value: stats?.eodToday || 0, color: '#6366F1' },
    { name: 'Tasks Completed', value: stats?.tasksCompleted || 0, color: '#10B981' }
  ].filter(d => d.value !== undefined);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] p-8 overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 tracking-tight">
          <BarChart3 className="text-blue-600" size={32} />
          {isAdmin ? 'Work Report' : 'My Work Report'}
        </h1>
        <p className="text-sm text-gray-500 ml-11 font-medium italic">
          {isAdmin ? 'Advanced team performance tracking overview' : 'Your personal daily engagement and task metrics'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          icon={<ClipboardList className="text-blue-600" />}
          title={isAdmin ? "Total Tasks" : "My Tasks"}
          value={stats?.tasksAssigned || 0}
          subtext={isAdmin ? "Assigned across team" : "Tasks assigned to you"}
          trend={isAdmin ? "+12%" : "ACTIVE"}
        />
        <StatCard 
          icon={<CheckCircle2 className="text-emerald-600" />}
          title="Completed"
          value={stats?.tasksCompleted || 0}
          subtext={isAdmin ? "Total tasks finished" : "Your completed tasks"}
          trend={stats?.tasksAssigned > 0 ? `${Math.round((stats.tasksCompleted/stats.tasksAssigned)*100)}%` : "0%"}
          isProgress
        />
        <StatCard 
          icon={<Clock className="text-indigo-600" />}
          title={isAdmin ? "Active SODs" : "My SOD Status"}
          value={stats?.sodToday || 0}
          subtext={isAdmin ? "Reports filed today" : (stats?.sodToday > 0 ? "Filed for today" : "Not filed yet")}
          trend="LIVE"
        />
        <StatCard 
          icon={<Target className="text-rose-600" />}
          title={isAdmin ? "Pending EODs" : "My EOD Status"}
          value={isAdmin ? ((stats?.sodToday || 0) - (stats?.eodToday || 0)) : stats?.eodToday}
          subtext={isAdmin ? "Awaiting checkout" : (stats?.eodToday > 0 ? "Completed" : "Pending Checkout")}
          trend={isAdmin ? "Action Required" : "DAILY"}
        />
      </div>


    </div>
  );
};

const StatCard = ({ icon, title, value, subtext, trend, isProgress }) => (
  <div className="bg-white rounded-[2rem] border-2 border-gray-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 rounded-2xl bg-gray-50 group-hover:bg-blue-50 transition-colors border border-gray-100">
        {icon}
      </div>
      <div className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
        trend === 'LIVE' ? 'bg-green-50 text-green-600 animate-pulse' : 'bg-blue-50 text-blue-600'
      }`}>
        {trend}
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</h3>
      <div className="text-3xl font-black text-gray-800">{value}</div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{subtext}</p>
    </div>
    {isProgress && (
      <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: trend }} />
      </div>
    )}
  </div>
);

export default WorkReportTab;
