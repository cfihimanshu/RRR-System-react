import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import SearchableSelect from '../shared/SearchableSelect';
import { AuthContext } from '../../context/AuthContext';
import { Loader2, Clock, Filter, History, Inbox, CircleDot, User as UserIcon } from 'lucide-react';

const TimelineTab = () => {
  const { user } = useContext(AuthContext);
  const [cases, setCases] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const location = useLocation();
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchingCases, setFetchingCases] = useState(true);
  const [dateFilter, setDateFilter] = useState(location.state?.dateFilter || '');
  const [typeFilter, setTypeFilter] = useState(location.state?.typeFilter || '');

  useEffect(() => {
    setFetchingCases(true);
    api.get('/cases').then(res => setCases(res.data)).catch(console.error).finally(() => setFetchingCases(false));
    
    if (user?.role === 'Admin') {
      api.get('/auth/users').then(res => setUsers(res.data)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    let url = '/timeline';
    const params = new URLSearchParams();
    
    if (selectedCase) params.append('caseId', selectedCase);
    if (selectedUser) params.append('sourceFilter', selectedUser);
    if (dateFilter) params.append('date', dateFilter);
    if (typeFilter) params.append('type', typeFilter);

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    api.get(url).then(res => setTimeline(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [selectedCase, selectedUser, dateFilter, typeFilter]);

  return (
    <div className="min-h-full bg-bg-primary p-4 md:p-8 w-full flex justify-center pb-32">
      <div className="w-full max-w-6xl">
        
        {/* Header section */}
        <div className="mb-10 pt-4">
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">Activity Timeline</h1>
          <p className="text-xs text-text-muted mt-1 font-medium tracking-wide">Track all updates and actions across cases</p>
        </div>

        {/* Filter Section */}
        <div className="mb-12 flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-bg-secondary p-6 rounded-[2.5rem] border-2 border-border shadow-sm">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 ml-1">Filter by Case</label>
            <SearchableCaseSelect 
              cases={cases} 
              value={selectedCase} 
              onChange={setSelectedCase} 
              placeholder="-- All Cases --"
            />
          </div>

          {user?.role === 'Admin' && (
            <div className="flex-1 bg-bg-secondary p-6 rounded-[2.5rem] border-2 border-border shadow-sm">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 ml-1 text-center">Filter by User</label>
              <SearchableSelect
                options={users.map(u => u.fullName).filter(Boolean)}
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                placeholder="-- All Users --"
                icon={<UserIcon size={14} className="text-accent" />}
              />
            </div>
          )}
        </div>

        {/* Timeline List */}
        <div className="relative border-l-2 border-border ml-6 pb-20 min-h-[400px]">
          {loading ? (
            <div className="ml-12 py-24 flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin text-accent" />
              <span className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted">Synchronizing Ledger...</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="ml-12 py-12 text-[10px] text-text-muted font-black uppercase tracking-widest italic opacity-30">Archive context empty for this identifier.</div>
          ) : (
            timeline.map((t) => (
              <div key={t._id} className="mb-10 ml-12 relative group">
                {/* Timeline Bullet */}
                <span className="absolute -left-[57px] flex items-center justify-center w-[20px] h-[20px] bg-bg-primary rounded-full top-2 z-10">
                   <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
                </span>

                {/* Event Content */}
                <div className="flex flex-col bg-bg-secondary p-6 rounded-[2rem] border-2 border-border hover:border-accent-soft transition-all group-hover:translate-x-1">
                  <div className="flex items-center flex-wrap gap-3 text-[10px] text-text-muted font-black tracking-widest uppercase mb-3">
                    <span className="bg-bg-input px-3 py-1 rounded-full border border-border">{new Date(t.eventDate).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true
                      })}</span>
                    <span className="text-accent opacity-50">•</span>
                    <span className="text-text-primary">{t.caseId}</span>
                    <span className="text-accent opacity-50">•</span>
                    <span className="bg-accent-soft text-accent px-3 py-1 rounded-full border border-accent-soft">
                      {t.eventType}
                    </span>
                    <span className="text-accent opacity-50">•</span>
                    <span className="bg-purple-soft text-purple px-3 py-1 rounded-full border border-purple-soft">
                      {t.source || 'System'}
                    </span>
                  </div>
                  
                  <div className="text-[16px] text-text-primary font-black tracking-tight leading-tight">
                    {t.summary}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default TimelineTab;
