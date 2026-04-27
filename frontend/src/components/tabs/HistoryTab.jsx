import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import FileUpload from '../shared/FileUpload';
import Modal from '../shared/Modal';
import { AuthContext } from '../../context/AuthContext';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';

const HistoryTab = () => {
  const [cases, setCases] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const { user } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    caseId: '', eventDate: '', histType: 'Complaint', summary: '', notes: '', fileLink: '', source: '', enteredBy: ''
  });

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history');
      setHistoryLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    api.get('/cases').then(res => setCases(res.data));
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.caseId) return toast.error('Select a case first');
    try {
      await api.post('/history', formData);
      toast.success('History entry added');
      setFormData({ 
        caseId: '', eventDate: '', histType: 'Complaint', summary: '', notes: '', fileLink: '', source: '', enteredBy: '' 
      });
      fetchHistory();
    } catch (err) {
      toast.error('Failed to add history');
    }
  };

  const handleCaseChange = (caseId) => {
    setFormData({ ...formData, caseId });
  };

  const isImage = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.pdf')) return false;
    return lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/) != null || lowerUrl.includes('image/upload');
  };

  const getDownloadUrl = (url) => {
    if (!url) return '#';
    // Use the backend proxy to force download seamlessly
    return `http://localhost:5000/api/upload/download?url=${encodeURIComponent(url)}`;
  };

  const inputClass = "w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1";
  
  return (
    <div className="section active w-full h-full flex flex-col bg-gray-50 pb-8 relative">
      {/* Header Area */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">History Upload</h2>
        <p className="text-sm text-gray-500">Add pre-case or background history entries</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Form Panel */}
        <div className="w-full lg:w-[450px] flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 p-5 h-fit">
          <h3 className="text-md font-bold flex items-center gap-2 mb-5 text-gray-800">
            <span className="text-orange-400">📜</span> Add History Entry
          </h3>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Case ID</label>
              <SearchableCaseSelect 
                cases={cases} 
                value={formData.caseId} 
                onChange={handleCaseChange} 
                required 
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Historical Event Date</label>
                <input type="date" className={inputClass} value={formData.eventDate} onChange={(e) => setFormData({...formData, eventDate: e.target.value})} required />
              </div>
              <div className="flex-1">
                <label className={labelClass}>History Type</label>
                <select className={inputClass} value={formData.histType} onChange={(e) => setFormData({...formData, histType: e.target.value})}>
                  <option value="Complaint">Complaint</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Payment">Payment</option>
                  <option value="Legal Notice">Legal Notice</option>
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Event Summary</label>
              <input type="text" className={inputClass} placeholder="One-line summary" value={formData.summary} onChange={(e) => setFormData({...formData, summary: e.target.value})} required />
            </div>

            <div>
              <label className={labelClass}>Detailed Notes</label>
              <textarea className={`${inputClass} min-h-[80px]`} placeholder="Additional details..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>

            <div>
              <label className={labelClass}>Attach File (Or Paste URL)</label>
              <div className="border border-dashed border-gray-300 rounded bg-gray-50 hover:bg-gray-100 transition-colors mb-2">
                <FileUpload onUploadSuccess={(url) => setFormData({...formData, fileLink: url})} label="Click to browse or drag & drop any file" />
              </div>
              <input type="text" className={inputClass} placeholder="Or paste Google Drive / URL link..." value={formData.fileLink} onChange={(e) => setFormData({...formData, fileLink: e.target.value})} />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className={labelClass}>Source</label>
                <input type="text" className={inputClass} placeholder="e.g. Email, WhatsApp" value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Entered By</label>
                <input type="text" className={inputClass} placeholder="Your name" value={formData.enteredBy} onChange={(e) => setFormData({...formData, enteredBy: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded shadow-sm transition-colors flex items-center justify-center gap-2 mt-2">
              ✅ Add History Entry
            </button>
          </form>
        </div>

        {/* Right Table Panel */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-fit">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-md font-bold text-gray-800">History Log</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-blue-800 text-white text-[11px] font-bold tracking-wider uppercase">
                  <th className="px-4 py-3">Hist ID</th>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Event Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3 text-center">File</th>
                  <th className="px-4 py-3">Entered By</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No history entries yet
                    </td>
                  </tr>
                ) : (
                  historyLogs.map(log => (
                    <tr key={log._id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-500">{log.histId || log._id.slice(-6)}</td>
                      <td className="px-4 py-3 font-bold text-blue-700">{log.caseId}</td>
                      <td className="px-4 py-3">{log.eventDate ? new Date(log.eventDate).toLocaleDateString('en-IN') : '-'}</td>
                      <td className="px-4 py-3">{log.histType}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={log.summary}>{log.summary}</td>
                      <td className="px-4 py-3 text-center">
                        {log.fileLink ? (
                          <button 
                            type="button"
                            onClick={() => setPreviewFileUrl(log.fileLink)} 
                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded transition-colors inline-block"
                          >
                            View
                          </button>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">{log.enteredBy}</td>
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
        title="File Preview"
        size="lg"
        titleActions={
          <a 
            href={getDownloadUrl(previewFileUrl)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1 transition-colors"
          >
            ⬇ Download
          </a>
        }
      >
        <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[400px] p-4">
          {previewFileUrl && (
            isImage(previewFileUrl) ? (
              <img src={previewFileUrl} alt="Preview" className="max-w-full max-h-[70vh] object-contain rounded" />
            ) : (
              <iframe 
                src={previewFileUrl.toLowerCase().endsWith('.pdf') ? previewFileUrl : `https://docs.google.com/gview?url=${encodeURIComponent(previewFileUrl)}&embedded=true`} 
                className="w-full h-[70vh] border-0 rounded" 
                title="File Preview" 
              />
            )
          )}
        </div>
      </Modal>

    </div>
  );
};

export default HistoryTab;
