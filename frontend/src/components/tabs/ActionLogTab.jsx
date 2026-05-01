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

  const inputClass = "w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none transition-all font-medium placeholder:text-text-muted/30";
  const labelClass = "block text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-2 ml-1";

  return (
    <div className="section active w-full pb-10 px-8 bg-bg-primary overflow-y-auto h-full scrollbar-thin">

      {/* Page Header */}
      <div className="mb-10 pt-6">
        <h2 className="text-3xl font-black text-text-primary tracking-tight uppercase leading-none">Operational Action Log</h2>
        <p className="text-[10px] text-accent mt-3 font-black uppercase tracking-[0.3em] opacity-80">Autonomous Audit Trail • State Synchronization</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">

        {/* LEFT PANEL: Log New Action */}
        <div className="w-full xl:w-[35%] flex-shrink-0 bg-bg-card rounded-2xl shadow-sm border-2 border-border flex flex-col h-fit overflow-hidden animate-in slide-in-from-left-4 duration-500">
          <div className="p-8 border-b-2 border-border flex items-center gap-4 bg-bg-secondary/50">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white shadow-sm">
              <span className="font-black text-xl uppercase">⚡</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary tracking-tight uppercase leading-tight">Log Entry</h2>
              <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-0.5">Initialize Protocol Record</p>
            </div>
          </div>

          <form className="p-8 flex flex-col gap-8" onSubmit={handleSubmit}>

            <div className="bg-bg-input p-6 rounded-2xl border-2 border-border shadow-inner">
              <label className="block text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> TARGET CASE IDENTIFIER
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
                <label className={labelClass}>Action Modality</label>
                <select className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" value={formData.actionType} onChange={e => setFormData({ ...formData, actionType: e.target.value })}>
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
              <div className="space-y-3">
                <label className={labelClass}>Operator Node</label>
                <input type="text" className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" placeholder="ID" value={formData.doneBy} onChange={e => setFormData({ ...formData, doneBy: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3">
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Technical Remarks & Narrative</label>
              <textarea className="w-full bg-bg-input border-2 border-border rounded-xl px-6 py-5 text-sm font-medium text-text-primary focus:border-accent outline-none transition-all h-32 resize-none shadow-inner italic placeholder:text-text-muted/30" placeholder="Provide comprehensive technical documentation of this action..." value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} required></textarea>
            </div>

            <div className="space-y-3">
              <label className={labelClass}>Next Scheduled Synchronization</label>
              <input type="datetime-local" className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all shadow-sm" value={formData.nextActionDate} onChange={e => setFormData({ ...formData, nextActionDate: e.target.value })} />
            </div>

            <div className="bg-bg-input/50 border-2 border-border rounded-2xl p-6 space-y-5">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Document Evidence Attachment</label>
              <div className="mb-4">
                <FileUpload onUploadSuccess={(url) => setFormData({ ...formData, fileLink: url })} label="Attach verified file" />
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted text-[10px] font-black uppercase group-focus-within:text-accent transition-colors">LINK</div>
                <input type="text" className="w-full bg-bg-card border-2 border-border rounded-xl pl-16 pr-5 py-3 text-[10px] font-black text-text-primary outline-none focus:border-accent transition-all shadow-inner" placeholder="Paste cloud protocol URL..." value={formData.fileUrlStr} onChange={e => setFormData({ ...formData, fileUrlStr: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3">
              <label className={labelClass}>State Change Authorization</label>
              <select className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-xs font-black text-text-primary focus:border-accent outline-none transition-all uppercase tracking-widest shadow-sm" value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                <option value="">-- No state modification --</option>
                <option value="New">New</option>
                <option value="In-progress">In-progress</option>
                <option value="Settled">Settled</option>
                <option value="Stucked">Stucked</option>
              </select>
            </div>

            <button type="submit" className="mt-4 bg-accent hover:bg-accent-hover text-white font-black py-5 px-8 rounded-2xl shadow-sm flex items-center justify-center gap-4 transition-all text-xs uppercase tracking-[0.25em] active:scale-95 group">
              <span className="text-xl group-hover:rotate-12 transition-transform">✅</span> COMMIT ACTION ENTRY
            </button>
          </form>
        </div>

        {/* RIGHT PANEL: Action Log Table */}
        <div className="flex-1 bg-bg-card rounded-2xl shadow-sm border-2 border-border flex flex-col overflow-hidden h-fit max-h-full animate-in slide-in-from-right-4 duration-500">
          <div className="p-8 border-b-2 border-border flex items-center justify-between bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="w-2 h-8 bg-accent rounded-full shadow-[0_0_15px_rgba(255,102,0,0.4)]" />
              <div>
                <h2 className="text-lg font-black text-text-primary tracking-tight uppercase leading-tight">Historical Ledger</h2>
                <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-0.5">Chronological Activity Sequence</p>
              </div>
            </div>
            {selectedCase && (
              <div className="flex items-center gap-2 bg-accent-soft text-accent px-5 py-2 rounded-2xl border-2 border-accent-soft shadow-sm">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Active Search Anchor</span>
              </div>
            )}
          </div>

          <div className="flex-1 w-full overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
              <thead>
                <tr className="bg-bg-input/50 text-text-muted text-[10px] font-black tracking-[0.25em] uppercase border-b-2 border-border">
                  <th className="px-6 py-6 w-[8%]">NODE</th>
                  <th className="px-6 py-6 w-[14%]">CASE ID</th>
                  <th className="px-6 py-6 w-[14%]">TIME</th>
                  <th className="px-6 py-6 w-[14%]">MODALITY</th>
                  <th className="px-6 py-6 w-[14%]">OPERATOR</th>
                  <th className="px-6 py-6 w-[22%]">DOCUMENTATION</th>
                  <th className="px-6 py-6 w-[8%] text-center">INTEL</th>
                  <th className="px-6 py-6 w-[12%]">RESYNC</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
                {actions.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-32 text-center bg-bg-input/10">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-24 h-24 bg-bg-input rounded-full flex items-center justify-center border-4 border-dashed border-border animate-pulse">
                          <span className="text-5xl opacity-40">📭</span>
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase tracking-[0.3em] text-text-muted block">Neural Ledger Empty</span>
                          <span className="text-[9px] text-text-muted/50 font-bold uppercase tracking-widest mt-2 block">Awaiting operational commit synchronization</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  actions.map(a => (
                    <tr key={a._id} className="hover:bg-bg-input/50 transition-all group border-b border-border/30 last:border-0">
                      <td className="px-6 py-6 font-black text-[9px] text-text-muted align-top group-hover:text-accent transition-colors">
                        #{a._id.substring(a._id.length - 4).toUpperCase()}
                      </td>
                      <td className="px-6 py-6 align-top">
                        <div className="font-black text-accent uppercase tracking-tighter text-[11px] bg-accent-soft/20 px-3 py-1 rounded-lg border border-accent-soft inline-block" title={a.caseId}>{a.caseId}</div>
                      </td>
                      <td className="px-6 py-6 align-top leading-tight text-text-muted font-black uppercase tracking-tighter opacity-80">
                        {a.dateTime ? new Date(a.dateTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td className="px-6 py-6 align-top">
                        <span className="font-black uppercase text-[10px] tracking-tight text-text-primary px-3 py-1 bg-bg-input rounded-lg border border-border">{a.actionType}</span>
                      </td>
                      <td className="px-6 py-6 align-top text-text-primary font-black uppercase text-[10px] tracking-widest">{a.doneBy || '—'}</td>
                      <td className="px-6 py-6 align-top">
                        <div className="line-clamp-4 leading-relaxed text-text-secondary italic border-l-2 border-accent-soft pl-4 text-[10px]" title={a.remarks}>"{a.remarks || a.summary || '—'}"</div>
                      </td>
                      <td className="px-6 py-6 text-center align-top">
                        {a.fileLink ? (
                          <button
                            onClick={() => setPreviewFileUrl(a.fileLink)}
                            className="bg-bg-secondary hover:bg-accent text-text-primary hover:text-white font-black text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-xl border-2 border-border transition-all shadow-sm active:scale-90"
                          >
                            OPEN
                          </button>
                        ) : (
                          <span className="text-text-muted opacity-20">—</span>
                        )}
                      </td>
                      <td className="px-6 py-6 text-text-muted align-top leading-tight font-black text-[10px] uppercase tracking-tighter group-hover:text-text-primary transition-colors">
                        {a.nextActionDate ? new Date(a.nextActionDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
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
        title="Technical Intelligence Preview"
      >
        <div className="flex flex-col h-full min-h-[700px] bg-bg-card p-10 rounded-2xl animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-8 bg-bg-secondary p-6 rounded-2xl border-2 border-border">
            <div>
              <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mb-1">Authenticated Document Stream</p>
              <p className="text-xs text-text-primary font-black uppercase tracking-tight truncate max-w-md">{previewFileUrl}</p>
            </div>
            <a
              href={`${api.defaults.baseURL}/upload/download?url=${encodeURIComponent(previewFileUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-green text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-green-600 transition-all shadow-sm active:scale-95"
            >
              ⬇️ EXPORT ARCHIVE
            </a>
          </div>
          <div className="flex-1 bg-white rounded-2xl overflow-hidden border-8 border-border shadow-[inset_0_0_50px_rgba(0,0,0,0.1)]">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewFileUrl)}&embedded=true`}
              className="w-full h-full"
              title="Neural Document Preview"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ActionLogTab;
