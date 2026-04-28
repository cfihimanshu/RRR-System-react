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

  const inputClass = "w-full border border-gray-300 rounded p-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="h-full bg-gray-50 p-6 overflow-y-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Document Index</h1>
        <p className="text-xs text-gray-500 mt-1">Auto-indexed documents + manual uploads</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 max-w-5xl">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-blue-500 font-bold">⬆</span>
          <h2 className="text-[14px] font-bold text-gray-800">Upload Document Manually</h2>
        </div>

        <form className="p-5 flex flex-col gap-5" onSubmit={handleSubmit}>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Case ID</label>
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
                <option value="MOU / Agreement">MOU / Agreement</option>
                <option value="Payment Receipt">Payment Receipt</option>
                <option value="WhatsApp Screenshot">WhatsApp Screenshot</option>
                <option value="Email Screenshot">Email Screenshot</option>
                <option value="Police Complaint">Police Complaint</option>
                <option value="Court Document">Court Document</option>
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
            <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Attach File</label>
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg p-6 mb-2 text-center transition-colors hover:bg-gray-100">
              <FileUpload onUploadSuccess={(url) => setFormData({ ...formData, fileLink: url })} label="Click to browse or drag & drop any file here" />
            </div>
            <input type="text" className={inputClass} placeholder="Or paste a Google Drive / external URL instead..." value={formData.fileUrlStr} onChange={e => setFormData({ ...formData, fileUrlStr: e.target.value })} />
          </div>

          <div>
            <label className={labelClass}>Remarks</label>
            <input type="text" className={inputClass} placeholder="Optional notes..." value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
          </div>

          <div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-sm flex items-center justify-center gap-2 transition-colors text-[13px]">
              📁 Add to Document Index
            </button>
          </div>
        </form>
      </div>

      {/* Search & Table */}
      <div className="mb-4 max-w-5xl">
        <div className="relative w-64 mb-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-500">🔍</span>
          <input
            type="text"
            placeholder="Search documents..."
            className="w-full border border-gray-300 rounded-full py-1.5 pl-9 pr-4 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="table-wrap">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-blue-800 text-white text-[10px] font-bold tracking-wider uppercase">
                  <th className="px-4 py-3 whitespace-nowrap">Doc ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Case ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Upload Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Source</th>
                  <th className="px-4 py-3 whitespace-nowrap">Doc Type</th>
                  <th className="px-4 py-3 min-w-[200px]">File Name / Summary</th>
                  <th className="px-4 py-3 text-center">Link</th>
                  <th className="px-4 py-3 whitespace-nowrap">Uploaded By</th>
                </tr>
              </thead>
              <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-20 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">📁</span>
                        <span>{searchTerm ? "No documents match your search." : "No documents indexed yet."}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(d => (
                    <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-500 align-top">
                        {d.docId || `#${d._id.substring(d._id.length - 6).toUpperCase()}`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-600 whitespace-nowrap align-top">{d.caseId}</td>
                      <td className="px-4 py-3 whitespace-nowrap align-top">
                        {d.uploadDate ? new Date(d.uploadDate).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap align-top">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-semibold">{d.sourceForm || 'Manual Upload'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap align-top font-medium">{d.docType}</td>
                      <td className="px-4 py-3 break-words leading-tight align-top">
                        <div className="font-semibold text-gray-800">{d.fileSummary}</div>
                        {d.remarks && <div className="text-[10px] text-gray-500 mt-1 italic">Note: {d.remarks}</div>}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        {d.fileLink ? (
                          <a href={d.fileLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold text-[10px] flex items-center justify-center gap-1">
                            🔗 View
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 align-top">{d.uploadedBy || '-'}</td>
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
