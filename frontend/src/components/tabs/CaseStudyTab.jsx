import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import {
  FileText,
  RefreshCcw,
  Settings,
  FileDown,
  Info,
  ShieldAlert,
  CheckSquare,
  History,
  Calendar,
  MessageSquare,
  Users,
  Printer,
  Loader2,
  Inbox,
  Eye,
  X
} from 'lucide-react';

const CaseStudyTab = ({ caseData = null }) => {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [generatedCase, setGeneratedCase] = useState(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetchingCases, setFetchingCases] = useState(true);

  const [timeline, setTimeline] = useState([]);
  const [actions, setActions] = useState([]);
  const [comms, setComms] = useState([]);
  const [docs, setDocs] = useState([]);

  const fetchCases = () => {
    setFetchingCases(true);
    api.get('/cases')
      .then(res => setCases(res.data))
      .catch(console.error)
      .finally(() => setFetchingCases(false));
  };

  useEffect(() => {
    if (caseData) {
      loadGeneratedStudy(caseData.caseId);
    } else {
      fetchCases();
    }
  }, [caseData]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .page-break-before { page-break-before: always; }
      #report-to-download table { border-spacing: 0; width: 100%; pointer-events: none; }
      #report-to-download th, #report-to-download td { word-wrap: break-word; }
      #report-to-download tbody tr:hover { background: transparent !important; }
      #report-to-download tbody tr { cursor: default !important; border-bottom: 1px solid #edf2f7 !important; }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);

  const handleGenerate = async () => {
    const targetId = caseData ? caseData.caseId : selectedCase;
    if (!targetId) return toast.error('Please select a Case ID first');
    setLoading(true);
    try {
      const now = new Date().toISOString();
      await api.put(`/cases/${targetId}`, { caseStudyGeneratedAt: now });

      let foundCase = caseData;
      if (!foundCase) {
        foundCase = cases.find(c => c.caseId === targetId);
      }

      if (foundCase) foundCase.caseStudyGeneratedAt = now;

      const [tlRes, actRes, commRes, docRes] = await Promise.all([
        api.get(`/timeline?caseId=${targetId}`),
        api.get(`/actions?caseId=${targetId}`),
        api.get(`/communications?caseId=${targetId}`),
        api.get(`/documents?caseId=${targetId}`)
      ]);

      setTimeline(tlRes.data);
      setActions(actRes.data);
      setComms(commRes.data);
      setDocs(docRes.data);

      setGeneratedCase({ ...foundCase, caseStudyGeneratedAt: now });
      if (!caseData) setShowMobilePreview(true);
      toast.success('Case study compiled successfully');
    } catch (err) {
      toast.error('Failed to generate case study');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGeneratedStudy = async (caseId) => {
    if (!caseId) return;
    setSelectedCase(caseId);

    setLoading(true);
    try {
      const [caseRes, tlRes, actRes, commRes, docRes] = await Promise.all([
        caseData ? Promise.resolve({ data: caseData }) : api.get(`/cases?caseId=${caseId}`),
        api.get(`/timeline?caseId=${caseId}`),
        api.get(`/actions?caseId=${caseId}`),
        api.get(`/communications?caseId=${caseId}`),
        api.get(`/documents?caseId=${caseId}`)
      ]);

      const foundCase = caseData || (Array.isArray(caseRes.data) ? caseRes.data.find(c => c.caseId === caseId) : caseRes.data);

      setTimeline(tlRes.data);
      setActions(actRes.data);
      setComms(commRes.data);
      setDocs(docRes.data);
      setGeneratedCase(foundCase);
      if (!caseData) setShowMobilePreview(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load related data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const dataToUse = generatedCase || caseData;
    if (!dataToUse) return;
    const element = document.getElementById('report-to-download');
    if (!element) return;

    const opt = {
      margin: [10, 10],
      filename: `Report_${dataToUse.caseId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    toast.loading('Generating PDF...', { id: 'pdf-gen' });
    html2pdf().set(opt).from(element).save().then(() => {
      toast.success('Download started!', { id: 'pdf-gen' });
    }).catch(err => {
      console.error(err);
      toast.error('Failed to generate PDF', { id: 'pdf-gen' });
    });
  };

  const generatedCases = cases.filter(c => c.caseStudyGeneratedAt).sort((a, b) => new Date(b.caseStudyGeneratedAt) - new Date(a.caseStudyGeneratedAt));

  const ReportContent = ({ data, timeline, actions, comms, docs, isMobile = false }) => {
    const totalMou = data?.servicesSold?.reduce((sum, s) => sum + (Number(s.signedMouAmount) || 0), 0) || 0;
    const totalPaid = data?.servicesSold?.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0) || 0;

    return (
      <div id="report-to-download" className="bg-white text-gray-900 w-full font-sans leading-normal">
        {/* Main Header */}
        <div className="bg-[#1e3a8a] text-white text-center py-6">
          <h1 className="text-3xl font-bold uppercase tracking-[0.2em]">CASE STUDY REPORT</h1>
        </div>

        {/* Client Sub-Header */}
        <div className="bg-[#3b82f6] text-white text-center py-8 px-6">
          <h2 className="text-2xl font-bold mb-1">Client: {data?.companyName || data?.clientName || 'N/A'}</h2>
          <div className="text-sm opacity-90 space-y-1 font-medium tracking-wide">
            <div>Reference Number: {data?.caseId || 'N/A'}</div>
            <div>Date Prepared: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div>Prepared by: StartupFlora (Acolyte Technologies)</div>
          </div>
        </div>

        <div className="p-10 space-y-12">
          {/* 1. Client Information */}
          <section>
            <h3 className="text-[#1e3a8a] text-xl font-bold border-b-2 border-[#1e3a8a] pb-2 mb-6">1. Client Information</h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm border-collapse">
                <tbody>
                  {[
                    ['Company Name', data?.companyName || '-'],
                    ['Contact Person', data?.clientName || '-'],
                    ['Contact Number', data?.clientMobile || '-'],
                    ['Email ID', data?.clientEmail || '-'],
                    ['Client Since', data?.createdDate ? new Date(data.createdDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'],
                    ['Total Services Enrolled', `${data?.servicesSold?.length || 0} Services`],
                    ['Total Amount Paid', `₹${totalPaid.toLocaleString('en-IN')}/-`],
                  ].map(([lbl, val], idx) => (
                    <tr key={lbl} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="w-1/3 p-4 font-bold text-gray-700 border-r border-gray-200">{lbl}</td>
                      <td className="w-2/3 p-4 text-gray-900">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. Services Enrolled & Current Status */}
          <section>
            <h3 className="text-[#1e3a8a] text-xl font-bold border-b-2 border-[#1e3a8a] pb-2 mb-6">2. Services Enrolled & Current Status</h3>
            <p className="text-xs text-gray-600 mb-4 italic">
              The following table summarizes all {data?.servicesSold?.length || 0} services availed by the client, their current processing status, MOU amounts, and responsible Business Development Associates (BDAs).
            </p>
            <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
              <table className="w-full min-w-[700px] text-left text-[11px] border-collapse">
                <thead className="bg-[#1e3a8a] text-white uppercase tracking-wider">
                  <tr>
                    <th className="p-3 border-r border-white/10">#</th>
                    <th className="p-3 border-r border-white/10">Service Name</th>
                    <th className="p-3 border-r border-white/10">Status</th>
                    <th className="p-3 border-r border-white/10">MOU Amount</th>
                    <th className="p-3 border-r border-white/10">BDA</th>
                    <th className="p-3">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.servicesSold?.map((s, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      <td className="p-3 text-center font-bold text-gray-500 border-r border-gray-100">{idx + 1}</td>
                      <td className="p-3 font-bold text-gray-800 border-r border-gray-100">{s.serviceName}</td>
                      <td className="p-3 border-r border-gray-100">
                        <span className={`font-bold ${s.workStatus === 'Completed' ? 'text-green-600' :
                          s.workStatus === 'In Progress' ? 'text-blue-600' :
                            'text-orange-500'
                          }`}>
                          {s.workStatus}
                        </span>
                      </td>
                      <td className="p-3 border-r border-gray-100">₹{Number(s.signedMouAmount || 0).toLocaleString('en-IN')}/-</td>
                      <td className="p-3 border-r border-gray-100 font-medium">{s.bda || '-'}</td>
                      <td className="p-3 font-bold">₹{Number(s.serviceAmount || 0).toLocaleString('en-IN')}/-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Chronological Timeline of Events */}
          <section className="page-break-before">
            <h3 className="text-[#1e3a8a] text-xl font-bold border-b-2 border-[#1e3a8a] pb-2 mb-6">3. Chronological Timeline of Events</h3>
            <p className="text-xs text-gray-600 mb-4 italic">
              The following timeline documents all key interactions between {data?.companyName || 'the client'} and StartupFlora from onboarding through the current escalation stage.
            </p>
            <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
              <table className="w-full min-w-[700px] text-left text-[11px] border-collapse">
                <thead className="bg-[#1e3a8a] text-white uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-32 border-r border-white/10">Date</th>
                    <th className="p-3 border-r border-white/10">Event</th>
                    <th className="p-3">Actor/Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {timeline.length === 0 ? (
                    <tr><td colSpan="3" className="p-10 text-center italic text-gray-400">No chronological events recorded.</td></tr>
                  ) : (
                    timeline.map((t, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="p-4 font-bold text-gray-700 whitespace-nowrap border-r border-gray-100">
                          {new Date(t.eventDate || t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-gray-800 leading-relaxed font-medium border-r border-gray-100">{t.summary}</td>
                        <td className="p-4 font-bold text-gray-600 italic">{t.source || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Client Concerns & Escalation Summary */}
          <section className="page-break-before">
            <h3 className="text-[#1e3a8a] text-xl font-bold border-b-2 border-[#1e3a8a] pb-2 mb-6">4. Client Concerns & Escalation Summary</h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
              <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                <thead className="bg-[#e53e3e] text-white uppercase tracking-widest">
                  <tr>
                    <th className="p-4 w-1/3 border-r border-white/10">Area of Concern</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="p-4 font-black text-red-700 bg-red-50 border-r border-gray-200 uppercase text-[10px] tracking-wider">Primary Allegation</td>
                    <td className="p-4 text-gray-800 italic leading-relaxed">"{data?.clientAllegation || 'No specific allegations recorded.'}"</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-black text-red-700 bg-red-50 border-r border-gray-200 uppercase text-[10px] tracking-wider">Case Summary</td>
                    <td className="p-4 text-gray-800 italic leading-relaxed">"{data?.caseSummary || data?.summary || 'No summary provided.'}"</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-black text-red-700 bg-red-50 border-r border-gray-200 uppercase text-[10px] tracking-wider">Social Media Risk</td>
                    <td className="p-4 font-bold text-gray-900">{data?.smRisk || 'None'}</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-black text-red-700 bg-red-50 border-r border-gray-200 uppercase text-[10px] tracking-wider">Legal Threat</td>
                    <td className="p-4 font-bold text-gray-900">{data?.policeThreat || 'None'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. Financial Summary */}
          <section>
            <h3 className="text-[#1e3a8a] text-xl font-bold border-b-2 border-[#1e3a8a] pb-2 mb-6">5. Financial Summary</h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
              <table className="w-full min-w-[600px] text-left text-sm border-collapse">
                <thead className="bg-[#1e3a8a] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-4 border-r border-white/10">Service</th>
                    <th className="p-4 border-r border-white/10">MOU Amount</th>
                    <th className="p-4">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.servicesSold?.map((s, idx) => (
                    <tr key={idx}>
                      <td className="p-4 text-gray-800 border-r border-gray-100">{idx + 1}. {s.serviceName}</td>
                      <td className="p-4 text-gray-700 border-r border-gray-100 text-right">₹{Number(s.signedMouAmount || 0).toLocaleString('en-IN')}/-</td>
                      <td className="p-4 text-gray-900 font-bold text-right">₹{Number(s.serviceAmount || 0).toLocaleString('en-IN')}/-</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#1e3a8a] text-white font-black">
                  <tr>
                    <td className="p-4 uppercase tracking-widest border-r border-white/10">TOTAL</td>
                    <td className="p-4 text-right border-r border-white/10">₹{totalMou.toLocaleString('en-IN')}/-</td>
                    <td className="p-4 text-right">₹{totalPaid.toLocaleString('en-IN')}/-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* 6. Current Status & Pending Actions */}
          <section className="page-break-before">
            <h3 className="text-[#1e3a8a] text-xl font-bold border-b-2 border-[#1e3a8a] pb-2 mb-6">6. Current Status & Pending Actions</h3>
            <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-green-50/50 p-6 border-r border-gray-200">
                <div className="bg-[#166534] text-white text-[10px] font-black uppercase tracking-widest p-3 text-center mb-6 rounded shadow-sm">Completed / Delivered</div>
                <ul className="space-y-4">
                  {data?.servicesSold?.filter(s => s.workStatus === 'Completed').map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs font-bold text-gray-800">
                      <span className="text-green-600 mt-1">•</span>
                      {s.serviceName}
                    </li>
                  ))}
                  {data?.servicesSold?.filter(s => s.workStatus === 'Completed').length === 0 && <li className="text-xs italic text-gray-400 text-center py-4">No completed services.</li>}
                </ul>
              </div>
              <div className="bg-red-50/50 p-6">
                <div className="bg-[#991b1b] text-white text-[10px] font-black uppercase tracking-widest p-3 text-center mb-6 rounded shadow-sm">Pending / On Hold / Disputed</div>
                <ul className="space-y-4">
                  {data?.servicesSold?.filter(s => s.workStatus !== 'Completed').map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs font-bold text-red-900">
                      <span className="text-red-600 mt-1">•</span>
                      {s.serviceName} — {s.workStatus}
                    </li>
                  ))}
                  {data?.smRisk === 'High' && <li className="flex items-start gap-2 text-xs font-bold text-red-900"><span className="text-red-600 mt-1">•</span> Social Media Risk: High</li>}
                  {data?.policeThreat === 'High' && <li className="flex items-start gap-2 text-xs font-bold text-red-900"><span className="text-red-600 mt-1">•</span> Police / Cyber Threat: High</li>}
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Recommended Next Steps */}
          <section>
            <h3 className="text-[#1e3a8a] text-xl font-bold border-b-2 border-[#1e3a8a] pb-2 mb-6">7. Recommended Next Steps</h3>
            <div className="space-y-6 text-sm text-gray-800 leading-relaxed">
              <p><strong>Immediate Acknowledgement:</strong> Formally acknowledge receipt of client's concerns and all previous communications in writing within 24-48 hours.</p>
              <p><strong>Internal Investigation:</strong> Expedite and conclude the internal inquiry regarding the sales team's conduct and service delivery metrics. Share findings with the client.</p>
              <p><strong>Refund Resolution:</strong> Determine the refundable amount based on services actually rendered vs. outstanding, and propose a structured settlement plan if applicable.</p>
              <p><strong>Legal Risk Mitigation:</strong> Engage legal counsel to respond to any formal notices and avoid further delays in resolution.</p>
            </div>
          </section>

          {/* Footer Branding */}
          <div className="pt-12 border-t border-gray-100 mt-20 flex justify-between items-end opacity-50">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              CONFIDENTIAL — INTERNAL USE ONLY | StartupFlora (Acolyte Technologies)
            </div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">
              Case Reference: {data?.caseId} | Generated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>
    );
  };



  if (caseData) {
    return (
      <div className="pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 size={48} className="animate-spin text-accent" />
            <span className="mt-4 font-black text-[10px] uppercase tracking-[0.3em] text-text-muted">Compiling Intelligence...</span>
          </div>
        ) : (
          <>
            {/* Mobile Interface: Action Card */}
            <div className="lg:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-bg-secondary p-10 rounded-[3rem] border-2 border-border shadow-xl flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-accent/10 rounded-[2rem] flex items-center justify-center text-accent mb-8 shadow-inner">
                  <FileText size={48} />
                </div>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-widest mb-3">Intelligence Summary</h3>
                <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mb-10 max-w-[200px] leading-relaxed">
                  Case synthesis complete. Review the full investigative study in high-fidelity view.
                </p>
                <button
                  onClick={() => setShowMobilePreview(true)}
                  className="w-full bg-accent hover:bg-accent-hover text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-orange-900/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Eye size={18} />
                  VIEW REPORT
                </button>
              </div>
            </div>

            {/* Desktop Interface: Full Inline View */}
            <div className="hidden lg:block animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col h-full">
                <div className="p-6 bg-bg-card border-b border-border flex justify-end gap-4 shadow-sm z-10 mb-8 rounded-2xl">
                  <button onClick={handleDownloadPDF} className="bg-green hover:bg-green-600 text-white px-8 py-3 rounded-2xl shadow-xl shadow-green-900/20 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 group">
                    <FileDown size={18} className="group-hover:scale-110 transition-transform" /> Export PDF
                  </button>
                  <button onClick={() => window.print()} className="bg-bg-input hover:bg-bg-card-hover text-text-primary border-2 border-border px-8 py-3 rounded-2xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest active:scale-95">
                    <Printer size={18} /> Print Record
                  </button>
                </div>
                <div className="max-w-[1000px] mx-auto shadow-2xl rounded-[2.5rem] overflow-hidden border-8 border-border">
                  <ReportContent data={generatedCase || caseData} timeline={timeline} actions={actions} comms={comms} docs={docs} />
                </div>
              </div>
            </div>

            {/* Mobile Modal (Popup) */}
            {showMobilePreview && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-bg-primary/90 backdrop-blur-md lg:hidden">
                <div className="bg-bg-secondary w-full h-full sm:h-[95vh] sm:max-w-3xl sm:rounded-[3rem] border-2 border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between px-8 py-6 bg-bg-card border-b border-border shadow-lg">
                    <span className="font-black uppercase tracking-[0.2em] text-[10px] text-text-muted">Intelligence Synthesis</span>
                    <div className="flex items-center gap-3">
                      <button onClick={handleDownloadPDF} className="bg-green hover:bg-green-600 text-white p-3 rounded-2xl shadow-lg shadow-green-900/20 transition-all active:scale-90"><FileDown size={20} /></button>
                      <button onClick={() => setShowMobilePreview(false)} className="bg-bg-input hover:bg-bg-card-hover text-text-primary p-3 rounded-2xl border-2 border-border transition-all active:scale-90"><X size={20} /></button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-bg-input p-6">
                    <div className="shadow-xl rounded-[2rem] overflow-hidden border-4 border-border">
                      <ReportContent data={generatedCase || caseData} timeline={timeline} actions={actions} comms={comms} docs={docs} isMobile={true} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="h-full bg-bg-primary p-4 md:p-8 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">Case Study Generator</h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[400px] flex-shrink-0 flex flex-col gap-8">
            <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border p-8">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 ml-1">Target Case ID</label>
              <SearchableCaseSelect cases={cases} value={selectedCase} onChange={setSelectedCase} />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full mt-6 bg-accent hover:bg-accent-hover text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-900/20 flex items-center justify-center gap-3 transition-all uppercase tracking-[0.2em] text-xs active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                INITIATE SYNTHESIS
              </button>
            </div>

            <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border overflow-hidden flex flex-col max-h-[500px]">
              <div className="p-6 bg-bg-card border-b border-border flex items-center gap-3">
                <div className="w-1.5 h-6 bg-accent rounded-full" />
                <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Synthesis History</h3>
              </div>
              <div className="overflow-auto scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
                    {generatedCases.length === 0 ? (
                      <tr><td className="px-6 py-10 text-center italic text-text-muted">No records found</td></tr>
                    ) : (
                      generatedCases.map(c => (
                        <tr key={c.caseId} className="hover:bg-bg-input transition-all cursor-pointer group" onClick={() => loadGeneratedStudy(c.caseId)}>
                          <td className="px-6 py-4 font-black text-accent group-hover:text-accent-hover uppercase tracking-tighter">{c.caseId}</td>
                          <td className="px-6 py-4 text-text-muted font-bold italic text-right">{new Date(c.caseStudyGeneratedAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border flex-col min-h-[800px] relative overflow-hidden">
            {!generatedCase ? (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-10"><FileText size={128} /></div>
            ) : loading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 size={64} className="animate-spin text-accent" />
                <span className="mt-4 font-black text-[10px] uppercase tracking-[0.3em] text-text-muted">Compiling Intelligence...</span>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-6 bg-bg-card border-b border-border flex justify-end gap-4 shadow-sm z-10">
                  <button onClick={handleDownloadPDF} className="bg-green hover:bg-green-600 text-white px-8 py-3 rounded-2xl shadow-xl shadow-green-900/20 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 group"><FileDown size={18} className="group-hover:scale-110 transition-transform" /> Export PDF</button>
                  <button onClick={() => window.print()} className="bg-bg-input hover:bg-bg-card-hover text-text-primary border-2 border-border px-8 py-3 rounded-2xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest active:scale-95"><Printer size={18} /> Print Record</button>
                </div>
                <div className="flex-1 overflow-auto bg-bg-input p-12 scrollbar-thin">
                  <div className="max-w-[850px] mx-auto shadow-2xl rounded-[2.5rem] overflow-hidden border-8 border-border">
                    <ReportContent data={generatedCase} timeline={timeline} actions={actions} comms={comms} docs={docs} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobilePreview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-bg-primary/90 backdrop-blur-md lg:hidden">
          <div className="bg-bg-secondary w-full h-full sm:h-[95vh] sm:max-w-3xl sm:rounded-[3rem] border-2 border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-8 py-6 bg-bg-card border-b border-border shadow-lg">
              <span className="font-black uppercase tracking-[0.2em] text-[10px] text-text-muted">Document Synthesis Preview</span>
              <div className="flex items-center gap-3">
                <button onClick={handleDownloadPDF} className="bg-green hover:bg-green-600 text-white p-3 rounded-2xl shadow-lg shadow-green-900/20 transition-all active:scale-90"><FileDown size={20} /></button>
                <button onClick={() => setShowMobilePreview(false)} className="bg-bg-input hover:bg-bg-card-hover text-text-primary p-3 rounded-2xl border-2 border-border transition-all active:scale-90"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-bg-input p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 size={48} className="animate-spin text-accent" />
                  <span className="mt-4 font-black text-[10px] uppercase tracking-[0.3em] text-text-muted">Assembling Data...</span>
                </div>
              ) : (
                <div className="shadow-xl rounded-[2rem] overflow-hidden border-4 border-border">
                  <ReportContent data={generatedCase} timeline={timeline} actions={actions} comms={comms} docs={docs} isMobile={true} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {generatedCase && !showMobilePreview && (
        <button onClick={() => setShowMobilePreview(true)} className="lg:hidden fixed bottom-8 right-8 z-[90] bg-accent text-white p-5 rounded-[2rem] shadow-2xl shadow-orange-900/40 animate-bounce transition-all active:scale-90 border-4 border-bg-primary">
          <FileText size={24} />
        </button>
      )}
    </div>
  );
};

export default CaseStudyTab;
