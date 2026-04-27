import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import { Loader2, Clock, Filter, History, Inbox, CircleDot } from 'lucide-react';

const TimelineTab = () => {
  const [cases, setCases] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchingCases, setFetchingCases] = useState(true);

  useEffect(() => {
    setFetchingCases(true);
    api.get('/cases').then(res => setCases(res.data)).catch(console.error).finally(() => setFetchingCases(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = selectedCase ? `/timeline?caseId=${selectedCase}` : '/timeline';
    api.get(url).then(res => setTimeline(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [selectedCase]);

  return (
    <div className="h-full bg-gray-50 p-6 overflow-y-auto w-full flex justify-center">
      <div className="w-full max-w-5xl">
        
        {/* Header section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Timeline View</h1>
          <p className="text-sm text-gray-500 mt-1">Full chronological event log per case</p>
        </div>

        {/* Filter Section */}
        <div className="mb-8 bg-white p-6 rounded-lg border border-gray-100 inline-block w-full max-w-md shadow-sm">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Filter By Case ID</label>
          <SearchableCaseSelect 
            cases={cases} 
            value={selectedCase} 
            onChange={setSelectedCase} 
            placeholder="-- All Cases --"
          />
        </div>

        {/* Timeline List */}
        <div className="relative border-l border-gray-300 ml-4 pb-10 min-h-[300px]">
          {loading ? (
            <div className="ml-8 py-20 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="font-semibold text-sm">Fetching timeline data...</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="ml-8 py-10 text-sm text-gray-500 italic">No timeline events found.</div>
          ) : (
            timeline.map((t) => (
              <div key={t._id} className="mb-6 ml-8 relative group">
                {/* Timeline Bullet - Matching Screenshot */}
                <span className="absolute -left-[41px] flex items-center justify-center w-[20px] h-[20px] bg-white rounded-full top-1 z-10">
                  <CircleDot size={20} className="text-blue-600 fill-white" />
                </span>

                {/* Event Content - Flat Layout as per screenshot */}
                <div className="flex flex-col pt-0.5">
                  <div className="flex items-center gap-2 text-[12px] text-gray-500 font-medium">
                    <span>{new Date(t.eventDate).toLocaleString('en-IN', {
                        day: 'numeric', month: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
                      })}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-600">{t.caseId}</span>
                    <span className="text-gray-300">|</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {t.eventType}
                    </span>
                  </div>
                  
                  <div className="text-[15px] mt-1 text-gray-900 font-extrabold">
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
