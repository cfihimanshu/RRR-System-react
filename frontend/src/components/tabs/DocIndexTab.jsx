import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import FileUpload from '../shared/FileUpload';
import { AuthContext } from '../../context/AuthContext';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';

const DocIndexTab = () => {
  const [cases, setCases] = useState([]);
  const [docs, setDocs] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    docType: 'Legal Notice',
    uploadedBy: user?.name || user?.email || '',
    fileSummary: '',
    fileLink: '',
    fileUrlStr: '',
    remarks: ''
  });

  useEffect(() => {
    api.get('/cases').then(res => setCases(res.data)).catch(console.error);
    fetchDocs(); // Initial fetch for all documents
  }, []);

  const fetchDocs = () => {
    // If selectedCase is empty, fetch all documents
    const url = selectedCase ? `/documents?caseId=${selectedCase}` : '/documents';
    api.get(url).then(res => setDocs(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchDocs();
  }, [selectedCase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCase) return toast.error('Select a case first');
    if (!formData.fileLink && !formData.fileUrlStr) return toast.error('Please attach a file or provide a URL');
    if (!formData.fileSummary) return toast.error('File summary is required');

    try {
      const finalFileLink = formData.fileUrlStr || formData.fileLink;

      await api.post('/documents', {
        ...formData,
        caseId: selectedCase,
        fileLink: finalFileLink,
        uploadDate: new Date().toISOString(),
        sourceForm: 'Manual Upload'
      });
      toast.success('Document saved to index');

      setFormData({
        docType: 'Legal Notice',
        uploadedBy: user?.name || user?.email || '',
        fileSummary: '',
        fileLink: '',
        fileUrlStr: '',
        remarks: ''
      });
      fetchDocs();
    } catch (err) {
      toast.error('Failed to save document');
      console.error(err);
    }
  };

  const filteredDocs = docs.filter(d => {
    const search = searchTerm.toLowerCase();
    return (
      (d.caseId || '').toLowerCase().includes(search) ||
      (d.fileSummary || '').toLowerCase().includes(search) ||
      (d.docType || '').toLowerCase().includes(search) ||
      (d.uploadedBy || '').toLowerCase().includes(search) ||
      (d.remarks || '').toLowerCase().includes(search)
    );
  });

  const inputClass = "w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none transition-all font-medium placeholder:text-text-muted/30";
  const labelClass = "block text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-2 ml-1";

  return (
    <div className="h-full bg-bg-primary p-4 md:p-8 overflow-y-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">Document Repository</h1>
        <p className="text-xs text-text-muted mt-1 font-medium tracking-wide">Securely manage and index all case-related legal documentation</p>
      </div>

      {/* Upload Form */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border mb-8 max-w-5xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-accent-soft rounded-2xl flex items-center justify-center text-accent">
            <span className="font-black text-lg">⬆</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Manual Repository Upload</h2>
        </div>

        <form className="p-5 flex flex-col gap-5" onSubmit={handleSubmit}>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-accent-soft2 p-5 rounded-3xl border border-accent-soft/30">
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Case Association</label>
              <SearchableCaseSelect
                cases={cases}
                value={selectedCase}
                onChange={setSelectedCase}
                required
              />
            </div>
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Document Type</label>
              <select className={inputClass} value={formData.docType} onChange={e => setFormData({ ...formData, docType: e.target.value })} required>
                <option value="Legal Notice">Legal Notice</option>
                <option value="Payment Receipt">Payment Receipt</option>
                <option value="MOI/Aggrement">MOI/Aggrement</option>
                <option value="Whatsapp">Whatsapp</option>
                <option value="Email">Email</option>
                <option value="Police Complaint">Police Complaint</option>
                <option value="Meeting">Meeting</option>
                <option value="Refund Proof">Refund Proof</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Uploaded By</label>
              <input type="text" className={inputClass} placeholder="Your name" value={formData.uploadedBy} onChange={e => setFormData({ ...formData, uploadedBy: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} after:content-['*'] after:text-red-500`}>File Description / Summary</label>
            <input type="text" className={inputClass} placeholder="Brief description of this document..." value={formData.fileSummary} onChange={e => setFormData({ ...formData, fileSummary: e.target.value })} required />
          </div>

          <div>
            <label className={`${labelClass} after:content-['*'] after:text-red`}>Document Attachment</label>
            <div className="bg-bg-input border-2 border-border border-dashed rounded-[2rem] p-8 mb-4 text-center transition-all hover:bg-bg-input/80 hover:border-accent-soft">
              <FileUpload onUploadSuccess={(url) => setFormData({ ...formData, fileLink: url })} label="Securely upload file from local storage" />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-[10px] font-black uppercase tracking-widest border-r border-border pr-4">External URL</div>
              <input type="text" className={`${inputClass} pl-36`} placeholder="Or paste a Google Drive / cloud storage link..." value={formData.fileUrlStr} onChange={e => setFormData({ ...formData, fileUrlStr: e.target.value })} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Remarks</label>
            <input type="text" className={inputClass} placeholder="Optional notes..." value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
          </div>

          <div className="flex justify-end mt-4">
            <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-orange-900/20 flex items-center justify-center gap-3 transition-all text-xs uppercase tracking-[0.2em] active:scale-95">
              <span className="text-lg">📁</span> INDEX DOCUMENT
            </button>
          </div>
        </form>
      </div>

      {/* Search & Table */}
      <div className="mb-10 max-w-5xl">
        <div className="relative w-80 mb-6 group">
          <span className="absolute inset-y-0 left-4 flex items-center text-text-muted group-focus-within:text-accent transition-colors">🔍</span>
          <input
            type="text"
            placeholder="Search indexed documents..."
            className="w-full bg-bg-card border-2 border-border rounded-full py-3 pl-12 pr-6 text-xs text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none transition-all shadow-sm font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border overflow-hidden">
          <div className="table-wrap overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                  <th className="px-4 py-5 whitespace-nowrap">Doc ID</th>
                  <th className="px-4 py-5 whitespace-nowrap">Case ID</th>
                  <th className="px-4 py-5 whitespace-nowrap">Upload Date</th>
                  <th className="px-4 py-5 whitespace-nowrap">Source</th>
                  <th className="px-4 py-5 whitespace-nowrap">Type</th>
                  <th className="px-4 py-5 min-w-[250px]">Summary / Remarks</th>
                  <th className="px-4 py-5 text-center">Action</th>
                  <th className="px-4 py-5 whitespace-nowrap">Uploader</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-30">
                        <span className="text-4xl">📁</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{searchTerm ? "No documents match criteria" : "Repository is currently empty"}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(d => (
                    <tr key={d._id} className="hover:bg-bg-input/30 transition-all group">
                      <td className="px-4 py-4 font-mono text-[9px] text-text-muted align-top group-hover:text-text-primary">
                        {d.docId || `#${d._id.substring(d._id.length - 4).toUpperCase()}`}
                      </td>
                      <td className="px-4 py-4 font-black text-accent whitespace-nowrap align-top text-[10px] tracking-tighter">{d.caseId}</td>
                      <td className="px-4 py-4 whitespace-nowrap align-top text-text-muted font-bold italic">
                        {d.uploadDate ? new Date(d.uploadDate).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap align-top">
                        <span className="bg-bg-input text-text-muted px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-border">{d.sourceForm || 'Manual'}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap align-top font-black uppercase tracking-tight text-text-primary">{d.docType}</td>
                      <td className="px-4 py-4 break-words leading-relaxed align-top">
                        <div className="font-bold text-text-primary line-clamp-2">{d.fileSummary}</div>
                        {d.remarks && <div className="text-[9px] text-text-muted mt-2 italic font-medium leading-relaxed">Note: {d.remarks}</div>}
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        {d.fileLink ? (
                          <a href={d.fileLink} target="_blank" rel="noreferrer" className="text-text-primary hover:text-white font-black text-[9px] uppercase tracking-widest bg-bg-input hover:bg-accent px-3 py-1.5 rounded-lg border border-border transition-all shadow-sm inline-flex items-center gap-1">
                            🔗 View
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-text-secondary align-top font-bold uppercase tracking-wider text-[10px]">{d.uploadedBy || '-'}</td>
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

export default DocIndexTab;
