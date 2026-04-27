import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import FileUpload from '../shared/FileUpload';
import { AuthContext } from '../../context/AuthContext';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';

const ActionLogTab = () => {
  const [cases, setCases] = useState([]);
  const [actions, setActions] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const { user } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    actionType: 'Negotiation Call',
    dept: 'Negotiation',
    doneBy: user?.name || user?.email || '',
    nextActionBy: '',
    summary: '',
    notes: '',
    clientResp: '',
    observation: '',
    nextAction: '',
    nextActionDate: '',
    fileLink: '',
    fileUrlStr: '' // For manual URL pasting
  });

  useEffect(() => {
    api.get('/cases').then(res => setCases(res.data)).catch(console.error);
  }, []);

  const fetchActions = () => {
    const url = selectedCase ? `/actions?caseId=${selectedCase}` : '/actions';
    api.get(url).then(res => setActions(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchActions();
  }, [selectedCase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCase) return toast.error('Please select a case first');
    if (!formData.summary) return toast.error('Action summary is required');

    try {
      const finalFileLink = formData.fileUrlStr || formData.fileLink;
      
      const payload = {
        ...formData,
        caseId: selectedCase,
        dateTime: new Date().toISOString(),
        fileLink: finalFileLink
      };

      await api.post('/actions', payload);
      
      // Update Case Status if selected
      if (updateStatus && updateStatus !== '') {
        await api.put(`/cases/${selectedCase}`, { currentStatus: updateStatus });
      }

      toast.success('Action logged successfully');
      
      // Reset form
      setFormData({ 
        actionType: 'Negotiation Call', dept: 'Negotiation', doneBy: user?.name || user?.email || '', 
        nextActionBy: '', summary: '', notes: '', clientResp: '', observation: '', 
        nextAction: '', nextActionDate: '', fileLink: '', fileUrlStr: '' 
      });
      setUpdateStatus('');
      fetchActions();
    } catch (err) {
      toast.error('Failed to log action');
      console.error(err);
    }
  };

  const inputClass = "w-full border border-gray-300 rounded p-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1";

  return (
    <div className="section active w-full pb-10 px-4 bg-gray-50">
      
      {/* Page Header */}
      <div className="mb-6 pt-2">
        <h2 className="text-2xl font-bold text-gray-800">Action Log</h2>
        <p className="text-sm text-gray-500">Record every action taken on a case</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* LEFT PANEL: Log New Action */}
        <div className="w-full xl:w-[45%] flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-fit">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white rounded-t-lg">
            <span className="text-orange-500 font-bold">⚡</span>
            <h2 className="text-lg font-bold text-gray-800">Log New Action</h2>
          </div>
        
        <form className="p-4 flex flex-col gap-4" onSubmit={handleSubmit}>
          
          <div className="bg-yellow-50/50 p-3 rounded border border-yellow-100">
            <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Case ID</label>
            <SearchableCaseSelect 
              cases={cases} 
              value={selectedCase} 
              onChange={setSelectedCase} 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Action Type</label>
              <select className={inputClass} value={formData.actionType} onChange={e => setFormData({...formData, actionType: e.target.value})}>
                <option value="Negotiation Call">Negotiation Call</option>
                <option value="Legal Notice Sent">Legal Notice Sent</option>
                <option value="Meeting">Meeting</option>
                <option value="Email Sent">Email Sent</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Refund Request">Refund Request</option>
                <option value="Refund Processed">Refund Processed</option>
                <option value="Document Filed">Document Filed</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <select className={inputClass} value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                <option value="Negotiation">Negotiation</option>
                <option value="Legal">Legal</option>
                <option value="Accounts">Accounts</option>
                <option value="Tech">Tech</option>
                <option value="Management">Management</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Done By</label>
              <input type="text" className={inputClass} placeholder="Name" value={formData.doneBy} onChange={e => setFormData({...formData, doneBy: e.target.value})} />
            </div>
            <div>
              <label className={labelClass}>Next Action By</label>
              <input type="text" className={inputClass} placeholder="Name" value={formData.nextActionBy} onChange={e => setFormData({...formData, nextActionBy: e.target.value})} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Action Summary</label>
            <input type="text" className={inputClass} placeholder="Brief summary" value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} required />
          </div>

          <div>
            <label className={labelClass}>Detailed Notes</label>
            <textarea className={`${inputClass} h-16 resize-none`} placeholder="Detailed notes..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Client Response</label>
              <textarea className={`${inputClass} h-16 resize-none`} placeholder="How client responded..." value={formData.clientResp} onChange={e => setFormData({...formData, clientResp: e.target.value})}></textarea>
            </div>
            <div>
              <label className={labelClass}>Internal Observation</label>
              <textarea className={`${inputClass} h-16 resize-none`} placeholder="Internal notes..." value={formData.observation} onChange={e => setFormData({...formData, observation: e.target.value})}></textarea>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>Next Action Required</label>
              <input type="text" className={inputClass} placeholder="What needs to happen next" value={formData.nextAction} onChange={e => setFormData({...formData, nextAction: e.target.value})} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>Next Action Date</label>
              <input type="date" className={inputClass} value={formData.nextActionDate} onChange={e => setFormData({...formData, nextActionDate: e.target.value})} />
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-3 mt-1">
            <label className={labelClass}>Attach Proof / File (Or Paste URL)</label>
            <div className="mb-2">
              <FileUpload onUploadSuccess={(url) => setFormData({...formData, fileLink: url})} label="Click to browse or drag & drop" />
            </div>
            <input type="text" className={inputClass} placeholder="Or paste Google Drive / URL link..." value={formData.fileUrlStr} onChange={e => setFormData({...formData, fileUrlStr: e.target.value})} />
          </div>

          <div className="mt-1">
            <label className={labelClass}>Update Case Status To</label>
            <select className={inputClass} value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
              <option value="">-- No change --</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Response">Pending Response</option>
              <option value="Settled">Settled</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <button type="submit" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded shadow flex items-center justify-center gap-2 transition-colors text-sm">
            ✅ Log Action
          </button>
        </form>
      </div>

      {/* RIGHT PANEL: Action Log Table */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden h-fit max-h-full">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-lg">
          <h2 className="text-lg font-bold text-gray-800">Action Log</h2>
          {selectedCase && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">Filtered by Case ID</span>}
        </div>
        
        <div className="flex-1 w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-blue-800 text-white text-[9px] sm:text-[10px] font-bold tracking-wider uppercase">
                <th className="px-1.5 py-3 w-[8%]">Act ID</th>
                <th className="px-1.5 py-3 w-[10%]">Case ID</th>
                <th className="px-1.5 py-3 w-[10%]">Date</th>
                <th className="px-1.5 py-3 w-[10%]">Type</th>
                <th className="px-1.5 py-3 w-[8%]">Dept</th>
                <th className="px-1.5 py-3 w-[12%]">Done By</th>
                <th className="px-1.5 py-3 w-[18%]">Summary</th>
                <th className="px-1.5 py-3 w-[6%] text-center">File</th>
                <th className="px-1.5 py-3 w-[9%] text-center">Refund</th>
                <th className="px-1.5 py-3 w-[9%]">Next Dt</th>
              </tr>
            </thead>
            <tbody className="text-[10px] sm:text-[11px] text-gray-700 divide-y divide-gray-100">
              {actions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-16 text-center text-gray-500 text-xs">
                    {selectedCase ? "No actions logged yet for this case." : "No actions logged yet. Select a case or start logging."}
                  </td>
                </tr>
              ) : (
                actions.map(a => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-1.5 py-2 font-mono text-[9px] text-gray-500 align-top truncate">
                      #{a._id.substring(a._id.length - 6).toUpperCase()}
                    </td>
                    <td className="px-1.5 py-2 font-semibold text-blue-600 align-top truncate" title={a.caseId}>{a.caseId}</td>
                    <td className="px-1.5 py-2 align-top leading-tight">
                      {a.dateTime ? new Date(a.dateTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                    </td>
                    <td className="px-1.5 py-2 align-top break-words">{a.actionType}</td>
                    <td className="px-1.5 py-2 align-top break-words">{a.dept || '-'}</td>
                    <td className="px-1.5 py-2 align-top break-words">{a.doneBy || '-'}</td>
                    <td className="px-1.5 py-2 align-top">
                      <div className="line-clamp-2 leading-tight" title={a.summary}>{a.summary}</div>
                    </td>
                    <td className="px-1.5 py-2 text-center align-top">
                      {a.fileLink ? (
                        <a href={a.fileLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold text-[9px]">
                          View
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-1.5 py-2 text-center text-gray-400 align-top">-</td>
                    <td className="px-1.5 py-2 text-gray-600 align-top leading-tight">
                      {a.nextActionDate ? new Date(a.nextActionDate).toLocaleDateString('en-IN') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      </div>
    </div>
  );
};

export default ActionLogTab;
