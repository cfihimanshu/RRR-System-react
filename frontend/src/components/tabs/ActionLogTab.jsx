import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import FileUpload from '../shared/FileUpload';
import { AuthContext } from '../../context/AuthContext';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import Modal from '../shared/Modal';

const ActionLogTab = () => {
  const [cases, setCases] = useState([]);
  const [actions, setActions] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const { user } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    actionType: 'Negotiation Call',
    doneBy: user?.name || user?.email || '',
    remarks: '',
    nextActionDate: '',
    fileLink: '',
    fileUrlStr: ''
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
    if (!formData.remarks) return toast.error('Remarks are required');

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
        actionType: 'Negotiation Call', doneBy: user?.name || user?.email || '', 
        remarks: '', nextActionDate: '', fileLink: '', fileUrlStr: '' 
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
              <label className={labelClass}>Done By</label>
              <input type="text" className={inputClass} placeholder="Name" value={formData.doneBy} onChange={e => setFormData({...formData, doneBy: e.target.value})} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Remarks / Observations</label>
            <textarea className={`${inputClass} h-24 resize-none`} placeholder="Enter action details, observations or notes here..." value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} required></textarea>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Next Action Date & Time</label>
              <input type="datetime-local" className={inputClass} value={formData.nextActionDate} onChange={e => setFormData({...formData, nextActionDate: e.target.value})} />
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
              <option value="In-progress">In-progress</option>
              <option value="Settled">Settled</option>
              <option value="Stucked">Stucked</option>
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
                <th className="px-1.5 py-3 w-[12%]">Done By</th>
                <th className="px-1.5 py-3 w-[36%]">Remarks / Observations</th>
                <th className="px-1.5 py-3 w-[12%] text-center">Document</th>
                <th className="px-1.5 py-3 w-[14%]">Next Action Dt \u0026 Tm</th>
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
                    <td className="px-1.5 py-2 align-top break-words">{a.doneBy || '-'}</td>
                    <td className="px-1.5 py-2 align-top">
                      <div className="line-clamp-3 leading-tight" title={a.remarks}>{a.remarks || a.summary || '-'}</div>
                    </td>
                    <td className="px-1.5 py-2 text-center align-top">
                      {a.fileLink ? (
                        <button 
                          onClick={() => setPreviewFileUrl(a.fileLink)} 
                          className="text-blue-600 hover:text-blue-800 font-bold text-[9px] bg-blue-50 px-2 py-0.5 rounded"
                        >
                          View
                        </button>
                      ) : '-'}
                    </td>
                    <td className="px-1.5 py-2 text-gray-600 align-top leading-tight">
                      {a.nextActionDate ? new Date(a.nextActionDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      </div>

      <Modal 
        isOpen={!!previewFileUrl} 
        onClose={() => setPreviewFileUrl(null)}
        title="Document Preview"
      >
        <div className="flex flex-col h-full min-h-[500px]">
          <div className="flex justify-end mb-2">
            <a 
              href={`${api.defaults.baseURL}/upload/download?url=${encodeURIComponent(previewFileUrl)}`}
              target="_blank" 
              rel="noreferrer"
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors"
            >
              ⬇️ Download
            </a>
          </div>
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFileUrl)}&embedded=true`}
            className="w-full flex-1 border border-gray-200 rounded"
            title="File Preview"
          />
        </div>
      </Modal>
    </div>
  );
};

export default ActionLogTab;
