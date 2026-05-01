import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import FileUpload from '../shared/FileUpload';
import { AuthContext } from '../../context/AuthContext';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import { Check, Phone, Mail, MessageSquare, Users, FileText, Send, Clock, Trash2, Shield, AlertTriangle, UploadCloud } from 'lucide-react';

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

  const inputClass = "w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none transition-all font-medium placeholder:text-text-muted/30";
  const labelClass = "block text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-2 ml-1";

  return (
    <div className="h-full flex flex-col lg:flex-row gap-10 p-6 md:p-10 bg-bg-primary overflow-y-auto scrollbar-thin">

      {/* LEFT PANEL: Log New Communication */}
      <div className="w-full lg:w-[480px] flex-shrink-0 bg-bg-card rounded-2xl shadow-sm border-2 border-border flex flex-col h-fit overflow-hidden animate-in slide-in-from-left-4 duration-500">
        <div className="p-8 border-b-2 border-border flex items-center gap-4 bg-bg-secondary/50 backdrop-blur-md">
          <div className="w-12 h-12 bg-green rounded-xl flex items-center justify-center text-white shadow-sm">
            <span className="font-black text-xl">💬</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-text-primary tracking-tight uppercase leading-tight">Communication </h2>

          </div>
        </div>

        <form className="p-8 flex flex-col gap-8" onSubmit={handleSubmit}>

          <div className="bg-bg-input p-6 rounded-2xl border-2 border-border shadow-inner">
            <label className="block text-[10px] font-black text-green uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green rounded-full animate-pulse" /> ACTIVE CASE ANCHOR
            </label>
            <SearchableCaseSelect
              cases={cases}
              value={selectedCase}
              onChange={setSelectedCase}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className={labelClass}>DATE & TIME</label>
              <input type="datetime-local" className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all shadow-sm" value={formData.dateTime} onChange={e => setFormData({ ...formData, dateTime: e.target.value })} />
            </div>
            <div className="space-y-3">
              <label className={labelClass}>MODE</label>
              <select className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" value={formData.mode} onChange={e => setFormData({ ...formData, mode: e.target.value })}>
                <option value="Call">Call</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="Meeting">Meeting</option>
                <option value="Legal Notice">Legal Notice</option>Intercept Registry
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className={labelClass}>DIRECTION</label>
              <select className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" value={formData.direction} onChange={e => setFormData({ ...formData, direction: e.target.value })}>
                <option value="Incoming">Incoming</option>
                <option value="Outgoing">Outgoing</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className={labelClass}>FROM</label>
              <input type="text" className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" placeholder="Received from (name / number)" value={formData.fromTo} onChange={e => setFormData({ ...formData, fromTo: e.target.value })} />
            </div>
          </div>

          <div className="space-y-3">
            <label className={`${labelClass} after:content-['*'] after:text-red-500`}>SUMMARY</label>
            <textarea className="w-full bg-bg-input border-2 border-border rounded-xl px-6 py-5 text-sm font-medium text-text-primary focus:border-accent outline-none transition-all h-24 resize-none shadow-inner italic placeholder:text-text-muted/30" placeholder="What was communicated..." value={formData.summary} onChange={e => setFormData({ ...formData, summary: e.target.value })} required></textarea>
          </div>

          <div className="space-y-3">
            <label className={labelClass}>EXACT DEMAND / PROMISE / THREAT</label>
            <textarea className="w-full bg-bg-input border-2 border-border rounded-xl px-6 py-5 text-sm font-medium text-text-primary focus:border-accent outline-none transition-all h-24 resize-none shadow-inner italic placeholder:text-text-muted/30" placeholder="Verbatim if important..." value={formData.exactDemand} onChange={e => setFormData({ ...formData, exactDemand: e.target.value })}></textarea>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className={labelClass}>Refund Volume (₹)</label>
              <input type="text" className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all shadow-sm" placeholder="0" value={formData.refundDemanded} onChange={e => setFormData({ ...formData, refundDemanded: e.target.value })} />
            </div>
            <div className="space-y-3">
              <label className={labelClass}>Legal Threat Vector</label>
              <select className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" value={formData.legalThreat} onChange={e => setFormData({ ...formData, legalThreat: e.target.value })}>
                <option value="No">No</option>
                <option value="Yes - Verbal">Yes - Verbal</option>
                <option value="Yes - Written">Yes - Written</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className={labelClass}>Social Escalation?</label>
              <select className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" value={formData.smMentioned} onChange={e => setFormData({ ...formData, smMentioned: e.target.value })}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className={labelClass}>Logging Operator</label>
              <input type="text" className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" placeholder="Name" value={formData.loggedBy} onChange={e => setFormData({ ...formData, loggedBy: e.target.value })} />
            </div>
          </div>

          <div className="bg-bg-input/50 border-2 border-border rounded-2xl p-6 space-y-5">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">ATTACH PROOF FILE (OR PASTE URL)</label>
            <div className="mb-4">
              <label className="block text-[9px] font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ATTACHMENT</label>
              <FileUpload onUploadSuccess={(url) => setFormData({ ...formData, fileLink: url })} label="Click to browse or drag & drop (Max 10MB)" />
            </div>
            <div className="relative group">
              <input type="text" className="w-full bg-bg-card border-2 border-border rounded-xl px-5 py-3 text-[10px] font-black text-text-primary outline-none focus:border-accent transition-all shadow-inner" placeholder="Or paste Google Drive / URL link..." value={formData.fileUrlStr} onChange={e => setFormData({ ...formData, fileUrlStr: e.target.value })} />
            </div>
          </div>

          <button type="submit" className="mt-4 bg-accent hover:bg-accent-hover text-white font-black py-4 px-6 rounded-2xl shadow-sm flex items-center justify-center gap-3 transition-all text-xs uppercase tracking-[0.2em] active:scale-95">
            <Check size={18} /> Log Communication
          </button>
        </form>
      </div>

      {/* RIGHT PANEL: Communication Log Table */}
      <div className="flex-1 bg-bg-card rounded-2xl shadow-sm border-2 border-border flex flex-col overflow-hidden h-fit max-h-full animate-in slide-in-from-right-4 duration-500">
        <div className="p-8 border-b-2 border-border flex items-center justify-between bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-green rounded-full shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
            <div>
              <h2 className="text-lg font-black text-text-primary tracking-tight uppercase leading-tight">Transmission Ledger</h2>
              <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-0.5">Global Signal Log</p>
            </div>
          </div>
          {selectedCase && (
            <div className="flex items-center gap-2 bg-green-soft text-green px-5 py-2 rounded-2xl border-2 border-green-soft shadow-sm">
              <span className="w-1.5 h-1.5 bg-green rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Target Context Anchor</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto flex-1 scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-bg-input/50 text-text-muted text-[10px] font-black tracking-[0.25em] uppercase border-b-2 border-border">
                <th className="px-6 py-6 w-[100px]">SIGNAL ID</th>
                <th className="px-6 py-6 w-[120px]">CASE LINK</th>
                <th className="px-6 py-6 w-[150px]">TIME</th>
                <th className="px-6 py-6 w-[120px]">PROTOCOL</th>
                <th className="px-6 py-6 w-[120px]">TRAFFIC</th>
                <th className="px-6 py-6 w-[150px]">ENDPOINT</th>
                <th className="px-6 py-6 min-w-[300px]">SIGNAL CONTENT</th>
                <th className="px-6 py-6 w-[100px] text-center">DATA</th>
                <th className="px-6 py-6 w-[120px] text-center">THREAT</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {comms.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-32 text-center bg-bg-input/10">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 bg-bg-input rounded-full flex items-center justify-center border-4 border-dashed border-border animate-pulse">
                        <span className="text-5xl opacity-40">📡</span>
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-text-muted block">No Active Signals Detected</span>
                        <span className="text-[9px] text-text-muted/50 font-bold uppercase tracking-widest mt-2 block">Awaiting neural network interception</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                comms.map(c => (
                  <tr key={c._id} className="hover:bg-bg-input/50 transition-all group border-b border-border/30 last:border-0">
                    <td className="px-6 py-6 font-black text-[9px] text-text-muted align-top tracking-tighter opacity-60">
                      {c.commId || `#${c._id.substring(c._id.length - 6).toUpperCase()}`}
                    </td>
                    <td className="px-6 py-6 align-top">
                      <div className="font-black text-accent uppercase tracking-tighter text-[11px] bg-accent-soft/20 px-3 py-1 rounded-lg border border-accent-soft inline-block">{c.caseId}</div>
                    </td>
                    <td className="px-6 py-6 align-top leading-tight text-text-muted font-black uppercase tracking-tighter opacity-80 italic">
                      {c.dateTime ? new Date(c.dateTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="px-6 py-6 align-top">
                      <span className="font-black uppercase text-[10px] tracking-widest text-text-primary px-3 py-1 bg-bg-input rounded-lg border border-border inline-block">{c.mode}</span>
                    </td>
                    <td className="px-6 py-6 align-top">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border-2 shadow-sm transition-all ${c.direction === 'Incoming' ? 'bg-green-soft text-green border-green-soft shadow-green-900/10' : 'bg-blue-soft text-blue border-blue-soft shadow-blue-900/10'}`}>
                        {c.direction}
                      </span>
                    </td>
                    <td className="px-6 py-6 align-top">
                      <div className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1.5 opacity-50">{c.direction === 'Incoming' ? 'SIGNAL SOURCE' : 'TARGET ENDPOINT'}</div>
                      <div className="font-black text-text-primary text-[10px] uppercase truncate max-w-[120px]" title={c.fromTo}>{c.fromTo || '—'}</div>
                    </td>
                    <td className="px-6 py-6 align-top">
                      <div className="font-black text-text-primary text-[11px] leading-relaxed uppercase tracking-tight">{c.summary}</div>
                      {c.exactDemand && <div className="text-[10px] text-text-muted mt-3 italic border-l-4 border-accent-soft pl-4 py-1 bg-bg-input/30 rounded-r-xl">"{c.exactDemand}"</div>}
                    </td>
                    <td className="px-6 py-6 text-center align-top">
                      {c.fileLink ? (
                        <a href={c.fileLink} target="_blank" rel="noreferrer" className="bg-bg-secondary hover:bg-green text-text-primary hover:text-white font-black text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-xl border-2 border-border transition-all shadow-sm active:scale-90 inline-block">
                          OPEN
                        </a>
                      ) : (
                        <span className="text-text-muted opacity-20">—</span>
                      )}
                    </td>
                    <td className="px-6 py-6 text-center align-top">
                      {c.legalThreat && c.legalThreat !== 'No' ? (
                        <span className="bg-red text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm animate-pulse border border-red-600">CRITICAL</span>
                      ) : (
                        <div className="flex justify-center items-center h-full pt-1 opacity-20">
                          <div className="w-1.5 h-1.5 bg-text-muted rounded-full" />
                        </div>
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
