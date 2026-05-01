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
    caseId: '', eventDate: '', histType: 'Complaint', notes: '', fileLink: '', enteredBy: user?.fullName || user?.email || ''
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, enteredBy: user?.fullName || user?.email || '' }));
  }, [user]);

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
        caseId: '', eventDate: '', histType: 'Complaint', notes: '', fileLink: '', enteredBy: user?.fullName || user?.email || '' 
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
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://api.cfi247.com';
    return `${baseUrl}/api/upload/download?url=${encodeURIComponent(url)}`;
  };

  const inputClass = "w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none transition-all font-medium placeholder:text-text-muted/30";
  const labelClass = "block text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-2 ml-1";
  
  return (
    <div className="section active w-full h-full flex flex-col bg-bg-primary pb-10 px-8 overflow-y-auto scrollbar-thin">
      {/* Header Area */}
      <div className="mb-10 pt-8">
        <h2 className="text-3xl font-black text-text-primary tracking-tight uppercase leading-none">Historical Chronicle Archive</h2>
        <p className="text-[10px] text-accent mt-3 font-black uppercase tracking-[0.3em] opacity-80">Chronological State Preservation • Immutable Records</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Form Panel */}
        <div className="w-full lg:w-[480px] flex-shrink-0 bg-bg-card rounded-2xl shadow-sm border-2 border-border p-10 h-fit overflow-hidden animate-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white shadow-sm">
               <span className="font-black text-xl">📜</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-text-primary uppercase tracking-tight leading-tight">Event Ingestion</h3>
              <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-0.5">Initialize Ledger Update</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="bg-bg-input p-6 rounded-2xl border-2 border-border shadow-inner">
              <label className="block text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> SUBJECT CASE IDENTITY
              </label>
              <SearchableCaseSelect 
                cases={cases} 
                value={formData.caseId} 
                onChange={handleCaseChange} 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className={`${labelClass} after:content-['*'] after:text-red`}>Occurrence Date</label>
                <input type="date" className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all shadow-sm" value={formData.eventDate} onChange={(e) => setFormData({...formData, eventDate: e.target.value})} required />
              </div>
              <div className="space-y-3">
                <label className={labelClass}>Classification</label>
                <select className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" value={formData.histType} onChange={(e) => setFormData({...formData, histType: e.target.value})}>
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

            <div className="space-y-3">
              <label className={labelClass}>Chronicle Narratives</label>
              <textarea className="w-full bg-bg-input border-2 border-border rounded-xl px-6 py-5 text-sm font-medium text-text-primary focus:border-accent outline-none transition-all h-32 resize-none shadow-inner italic placeholder:text-text-muted/30" placeholder="Provide a detailed technical abstract of this historical event..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>

            <div className="bg-bg-input/50 border-2 border-border rounded-2xl p-6 space-y-5">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Material Proof (OCR/PDF)</label>
              <div className="mb-4">
                <FileUpload onUploadSuccess={(url) => setFormData({...formData, fileLink: url})} label="Commit Supporting Asset" />
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted text-[10px] font-black uppercase group-focus-within:text-accent transition-colors">LINK</div>
                <input type="text" className="w-full bg-bg-card border-2 border-border rounded-xl pl-16 pr-5 py-3 text-[10px] font-black text-text-primary outline-none focus:border-accent transition-all shadow-inner" placeholder="Direct Asset URL..." value={formData.fileLink} onChange={(e) => setFormData({...formData, fileLink: e.target.value})} />
              </div>
            </div>

            <div className="space-y-3">
              <label className={labelClass}>Registrar Authority</label>
              <input type="text" className="w-full bg-bg-input/50 border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-muted uppercase tracking-widest cursor-not-allowed" value={formData.enteredBy} disabled />
            </div>

            <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-5 px-8 rounded-2xl shadow-sm flex items-center justify-center gap-4 mt-4 text-xs uppercase tracking-[0.25em] active:scale-95 transition-all group">
              <span className="text-xl group-hover:rotate-12 transition-transform">✅</span> AUTHORIZE ENTRY
            </button>
          </form>
        </div>

        {/* Right Table Panel */}
        <div className="flex-1 bg-bg-card rounded-2xl shadow-sm border-2 border-border overflow-hidden flex flex-col h-fit animate-in slide-in-from-right-4 duration-500">
          <div className="p-8 border-b-2 border-border bg-bg-secondary/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
             <div className="flex items-center gap-4">
              <div className="w-2 h-8 bg-accent rounded-full shadow-[0_0_15px_rgba(255,102,0,0.4)]" />
              <div>
                <h3 className="text-lg font-black text-text-primary uppercase tracking-tight leading-tight">Audit Archive Ledger</h3>
                <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-0.5">Historical Event Sequence</p>
              </div>
             </div>
          </div>
          
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-bg-input/50 text-text-muted text-[10px] font-black tracking-[0.25em] uppercase border-b-2 border-border">
                  <th className="px-6 py-6 w-[120px]">ARCHIVE ID</th>
                  <th className="px-6 py-6 w-[150px]">CASE LINK</th>
                  <th className="px-6 py-6 w-[150px]">OCCURRENCE</th>
                  <th className="px-6 py-6 w-[150px]">CATEGORY</th>
                  <th className="px-6 py-6 min-w-[300px]">CHRONICLE DIGEST</th>
                  <th className="px-6 py-6 w-[120px] text-center">ASSET</th>
                  <th className="px-6 py-6 w-[150px]">REGISTRAR</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-32 text-center bg-bg-input/10">
                       <div className="flex flex-col items-center gap-6">
                          <div className="w-24 h-24 bg-bg-input rounded-full flex items-center justify-center border-4 border-dashed border-border animate-pulse">
                             <span className="text-5xl opacity-40">📜</span>
                          </div>
                          <div>
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-text-muted block">Neural Archive Empty</span>
                            <span className="text-[9px] text-text-muted/50 font-bold uppercase tracking-widest mt-2 block">Awaiting historical data synchronization</span>
                          </div>
                       </div>
                    </td>
                  </tr>
                ) : (
                  historyLogs.map(log => (
                    <tr key={log._id} className="hover:bg-bg-input/50 transition-all group border-b border-border/30 last:border-0">
                      <td className="px-6 py-6 font-black text-[9px] text-text-muted tracking-tighter uppercase opacity-60 group-hover:text-accent transition-colors">#{log.histId || log._id.slice(-6).toUpperCase()}</td>
                      <td className="px-6 py-6">
                        <div className="font-black text-accent uppercase tracking-tighter text-[11px] bg-accent-soft/20 px-3 py-1 rounded-lg border border-accent-soft inline-block">{log.caseId}</div>
                      </td>
                      <td className="px-6 py-6 font-black text-text-muted uppercase tracking-tighter italic opacity-80">{log.eventDate ? new Date(log.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td className="px-6 py-6">
                         <span className="bg-bg-input text-blue px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border-2 border-border shadow-sm">
                            {log.histType}
                         </span>
                      </td>
                      <td className="px-6 py-6 leading-relaxed">
                        <div className="font-black text-text-primary text-[11px] uppercase tracking-tight line-clamp-2" title={log.notes}>{log.notes}</div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        {log.fileLink ? (
                          <button 
                            type="button"
                            onClick={() => setPreviewFileUrl(log.fileLink)} 
                            className="bg-bg-secondary hover:bg-accent text-text-primary hover:text-white font-black text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-xl border-2 border-border transition-all shadow-sm active:scale-90"
                          >
                            PREVIEW
                          </button>
                        ) : (
                          <span className="text-text-muted opacity-20">—</span>
                        )}
                      </td>
                      <td className="px-6 py-6 font-black text-text-muted uppercase text-[9px] tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{log.enteredBy}</td>
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
        title="Archive Asset Disclosure"
        size="lg"
        titleActions={
          <a 
            href={getDownloadUrl(previewFileUrl)}
            className="bg-green hover:bg-green-600 text-white text-[10px] font-black py-3 px-8 rounded-xl flex items-center gap-3 transition-all uppercase tracking-[0.2em] active:scale-95 shadow-sm"
          >
            ⬇ SECURE EXPORT
          </a>
        }
      >
        <div className="bg-bg-card rounded-2xl overflow-hidden flex items-center justify-center min-h-[600px] p-10 border-4 border-border shadow-[inset_0_0_100px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300">
          {previewFileUrl && (
            isImage(previewFileUrl) ? (
              <div className="relative group">
                <img src={previewFileUrl} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded-3xl border-8 border-bg-secondary shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]" />
                <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] pointer-events-none" />
              </div>
            ) : (
              <div className="w-full h-[75vh] rounded-2xl overflow-hidden border-8 border-bg-secondary shadow-2xl bg-white">
                <iframe 
                  src={previewFileUrl.toLowerCase().endsWith('.pdf') ? previewFileUrl : `https://docs.google.com/gview?url=${encodeURIComponent(previewFileUrl)}&embedded=true`} 
                  className="w-full h-full border-0" 
                  title="Neural Asset Preview" 
                />
              </div>
            )
          )}
        </div>
      </Modal>

    </div>
  );
};

export default HistoryTab;
