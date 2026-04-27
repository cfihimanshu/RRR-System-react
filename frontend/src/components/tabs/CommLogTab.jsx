import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import FileUpload from '../shared/FileUpload';
import { AuthContext } from '../../context/AuthContext';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';

const CommLogTab = () => {
  const [cases, setCases] = useState([]);
  const [comms, setComms] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const { user } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    dateTime: '',
    mode: 'Call',
    direction: 'Incoming',
    fromTo: '',
    summary: '',
    exactDemand: '',
    refundDemanded: '0',
    legalThreat: 'No',
    smMentioned: 'No',
    fileLink: '',
    fileUrlStr: '',
    loggedBy: user?.name || user?.email || ''
  });

  useEffect(() => {
    api.get('/cases').then(res => setCases(res.data)).catch(console.error);
  }, []);

  const fetchComms = () => {
    const url = selectedCase ? `/communications?caseId=${selectedCase}` : '/communications';
    api.get(url).then(res => setComms(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchComms();
  }, [selectedCase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCase) return toast.error('Please select a case first');
    if (!formData.summary) return toast.error('Summary is required');

    try {
      const finalFileLink = formData.fileUrlStr || formData.fileLink;
      
      const payload = {
        ...formData,
        caseId: selectedCase,
        fileLink: finalFileLink
      };
      
      if (!payload.dateTime) {
        payload.dateTime = new Date().toISOString();
      }

      await api.post('/communications', payload);
      toast.success('Communication logged successfully');
      
      setFormData({ 
        dateTime: '', mode: 'Call', direction: 'Incoming', fromTo: '', summary: '', 
        exactDemand: '', refundDemanded: '0', legalThreat: 'No', smMentioned: 'No', 
        fileLink: '', fileUrlStr: '', loggedBy: user?.name || user?.email || ''
      });
      fetchComms();
    } catch (err) {
      toast.error('Failed to log communication');
      console.error(err);
    }
  };

  const inputClass = "w-full border border-gray-300 rounded p-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1";

  return (
    <div className="h-full flex flex-col lg:flex-row gap-5 p-4 bg-gray-50 overflow-y-auto">
      
      {/* LEFT PANEL: Log New Communication */}
      <div className="w-full lg:w-[450px] flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-fit">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-white rounded-t-lg">
          <span className="text-green-500 font-bold">💬</span>
          <h2 className="text-lg font-bold text-gray-800">Log Communication</h2>
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
              <label className={labelClass}>Date & Time</label>
              <input type="datetime-local" className={inputClass} value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})} />
            </div>
            <div>
              <label className={labelClass}>Mode</label>
              <select className={inputClass} value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value})}>
                <option value="Call">Call</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="Meeting">Meeting</option>
                <option value="Legal Notice">Legal Notice</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Direction</label>
              <select className={inputClass} value={formData.direction} onChange={e => setFormData({...formData, direction: e.target.value})}>
                <option value="Incoming">Incoming</option>
                <option value="Outgoing">Outgoing</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>From / To</label>
              <input type="text" className={inputClass} placeholder="Person name / number" value={formData.fromTo} onChange={e => setFormData({...formData, fromTo: e.target.value})} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Summary</label>
            <textarea className={`${inputClass} h-16 resize-none`} placeholder="What was communicated..." value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} required></textarea>
          </div>

          <div>
            <label className={labelClass}>Exact Demand / Promise / Threat</label>
            <textarea className={`${inputClass} h-16 resize-none`} placeholder="Verbatim if important..." value={formData.exactDemand} onChange={e => setFormData({...formData, exactDemand: e.target.value})}></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Refund Demanded (₹)</label>
              <input type="text" className={inputClass} placeholder="0" value={formData.refundDemanded} onChange={e => setFormData({...formData, refundDemanded: e.target.value})} />
            </div>
            <div>
              <label className={labelClass}>Legal Threat?</label>
              <select className={inputClass} value={formData.legalThreat} onChange={e => setFormData({...formData, legalThreat: e.target.value})}>
                <option value="No">No</option>
                <option value="Yes - Verbal">Yes - Verbal</option>
                <option value="Yes - Written">Yes - Written</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Social Media Mentioned?</label>
              <select className={inputClass} value={formData.smMentioned} onChange={e => setFormData({...formData, smMentioned: e.target.value})}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Logged By</label>
              <input type="text" className={inputClass} placeholder="Your name" value={formData.loggedBy} onChange={e => setFormData({...formData, loggedBy: e.target.value})} />
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-3 mt-1">
            <label className={labelClass}>Attach Proof File (Or Paste URL)</label>
            <div className="mb-2">
              <FileUpload onUploadSuccess={(url) => setFormData({...formData, fileLink: url})} label="Click to browse or drag & drop" />
            </div>
            <input type="text" className={inputClass} placeholder="Or paste Google Drive / URL link..." value={formData.fileUrlStr} onChange={e => setFormData({...formData, fileUrlStr: e.target.value})} />
          </div>

          <button type="submit" className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded shadow flex items-center justify-center gap-2 transition-colors text-sm">
            ✅ Log Communication
          </button>
        </form>
      </div>

      {/* RIGHT PANEL: Communication Log Table */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden h-fit max-h-full">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-lg">
          <h2 className="text-lg font-bold text-gray-800">Communication Log</h2>
          {selectedCase && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">Filtered by Case ID</span>}
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white text-[10px] font-bold tracking-wider uppercase">
                <th className="px-3 py-3 whitespace-nowrap">Comm ID</th>
                <th className="px-3 py-3 whitespace-nowrap">Case ID</th>
                <th className="px-3 py-3 whitespace-nowrap">Date/Time</th>
                <th className="px-3 py-3 whitespace-nowrap">Mode</th>
                <th className="px-3 py-3 whitespace-nowrap">Dir</th>
                <th className="px-3 py-3 whitespace-nowrap">From/To</th>
                <th className="px-3 py-3 min-w-[200px]">Summary</th>
                <th className="px-3 py-3 text-center">File</th>
                <th className="px-3 py-3 whitespace-nowrap text-center">Legal?</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
              {comms.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center text-gray-500">
                    {selectedCase ? "No communications logged yet for this case." : "No communications logged yet. Select a case or start logging."}
                  </td>
                </tr>
              ) : (
                comms.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-mono text-[10px] text-gray-500 align-top">
                      #{c._id.substring(c._id.length - 6).toUpperCase()}
                    </td>
                    <td className="px-3 py-3 font-semibold text-blue-600 whitespace-nowrap align-top">{c.caseId}</td>
                    <td className="px-3 py-3 whitespace-nowrap align-top">
                      {c.dateTime ? new Date(c.dateTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap align-top font-semibold">{c.mode}</td>
                    <td className="px-3 py-3 whitespace-nowrap align-top">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.direction === 'Incoming' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {c.direction}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap align-top">{c.fromTo || '-'}</td>
                    <td className="px-3 py-3 break-words leading-tight align-top max-w-[250px]">
                      <div className="font-semibold text-gray-800">{c.summary}</div>
                      {c.exactDemand && <div className="text-[10px] text-gray-500 mt-1 italic">"{c.exactDemand}"</div>}
                    </td>
                    <td className="px-3 py-3 text-center align-top">
                      {c.fileLink ? (
                        <a href={c.fileLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold text-[10px]">
                          View
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center align-top">
                      {c.legalThreat && c.legalThreat !== 'No' ? (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Yes</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default CommLogTab;
