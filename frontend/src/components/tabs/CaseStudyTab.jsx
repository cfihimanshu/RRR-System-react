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

  const handleDownloadPDF = async () => {
    const dataToUse = generatedCase || caseData;
    if (!dataToUse) return;

    toast.loading('Generating Standardized PDF...', { id: 'pdf-gen' });
    try {
      const response = await api.post('/case-study/generate', { caseId: dataToUse.caseId }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CaseStudy_${dataToUse.caseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Download started!', { id: 'pdf-gen' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate standardized PDF', { id: 'pdf-gen' });
    }
  };

  const generatedCases = cases.filter(c => c.caseStudyGeneratedAt).sort((a, b) => new Date(b.caseStudyGeneratedAt) - new Date(a.caseStudyGeneratedAt));

  const ReportContent = ({ data, timeline, actions, comms, docs, isMobile = false }) => {
    const totalPaid = data?.servicesSold?.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0) || 0;
    const totalMou = data?.servicesSold?.reduce((sum, s) => sum + (Number(s.signedMouAmount) || 0), 0) || 0;
    const breakdown = data?.servicesSold?.map(s => `Rs. ${Number(s.serviceAmount || 0).toLocaleString('en-IN')}`).join(' + ') + ` = Rs. ${totalPaid.toLocaleString('en-IN')}`;

    const labelClass = "w-1/3 bg-[#f0f7ff] p-3 border border-gray-200 text-[11px] font-bold text-gray-700 uppercase tracking-tighter";
    const valueClass = "w-2/3 bg-white p-3 border border-gray-200 text-[11px] font-medium text-gray-900";

    return (
      <div id="report-to-download" className="bg-white text-gray-900 w-full font-sans leading-relaxed p-10 max-w-[850px] mx-auto shadow-2xl border border-gray-100">
        <div className="border-t-[1px] border-[#3b82f6] mb-8"></div>

        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-[#1e3a8a] text-3xl font-extrabold uppercase tracking-widest mb-1">CLIENT CASE STUDY</h1>
          <div className="text-[#2563eb] text-lg font-bold">{data?.typeOfComplaint || 'Case Analysis'} — {data?.companyName || data?.clientName || 'N/A'}</div>
          <div className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-widest">
            Reference Number: {data?.caseId} | Date Prepared: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </header>

        {/* 1. Client Profile */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">1. Client Profile</h2>
          <table className="w-full border-collapse border border-gray-200">
            <tbody>
              <tr><td className={labelClass}>Company Name</td><td className={valueClass}>{data?.companyName || '-'}</td></tr>
              <tr><td className={labelClass}>Contact Person</td><td className={valueClass}>{data?.clientName || '-'}</td></tr>
              <tr><td className={labelClass}>Contact Number</td><td className={valueClass}>{data?.clientMobile || '-'}</td></tr>
              <tr><td className={labelClass}>Email ID</td><td className={valueClass}>{data?.clientEmail || '-'}</td></tr>
              <tr><td className={labelClass}>Acknowledgment No.</td><td className={valueClass}>{data?.cyberAckNumbers || data?.grievanceNumber || 'N/A'}</td></tr>
              <tr><td className={labelClass}>Client Since</td><td className={valueClass}>{data?.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td></tr>
            </tbody>
          </table>
        </section>

        {/* 2. Service Details */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">2. Service Details</h2>
          {data?.servicesSold?.map((s, idx) => (
            <table key={idx} className="w-full border-collapse border border-gray-200 mb-6 last:mb-0">
              <tbody>
                <tr><td className={labelClass}>Service Engaged</td><td className={`${valueClass} font-bold text-gray-950`}>{s.serviceName}</td></tr>
                <tr>
                  <td className={labelClass}>Service Status</td>
                  <td className={valueClass}>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${s.workStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {s.workStatus}
                    </span>
                  </td>
                </tr>
                <tr><td className={labelClass}>MOU Signed</td><td className={valueClass}>{data?.mouSigned || 'No'}</td></tr>
                <tr><td className={labelClass}>MOU Signed Amount</td><td className={valueClass}>{s.signedMouAmount ? `Rs. ${Number(s.signedMouAmount).toLocaleString('en-IN')}/-` : 'NA'}</td></tr>
                <tr><td className={labelClass}>Business Development Associate</td><td className={valueClass}>{s.bda || '-'}</td></tr>
                <tr><td className={labelClass}>Amount Paid</td><td className={`${valueClass} font-bold text-gray-950`}>Rs. {Number(s.serviceAmount || 0).toLocaleString('en-IN')}/-</td></tr>
              </tbody>
            </table>
          ))}
        </section>

        {/* 3. Financial Summary */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">3. Financial Summary</h2>
          <table className="w-full border-collapse border border-gray-200">
            <tbody>
              <tr><td className={labelClass}>Total Amount Paid by Client</td><td className={`${valueClass} font-black text-gray-950`}>Rs. {totalPaid.toLocaleString('en-IN')}/-</td></tr>
              <tr><td className={labelClass}>Breakdown</td><td className={valueClass}>{breakdown}</td></tr>
              <tr><td className={labelClass}>Total MOU Amount</td><td className={valueClass}>{totalMou > 0 ? `Rs. ${totalMou.toLocaleString('en-IN')}/-` : 'NA (No MOU signed)'}</td></tr>
              <tr><td className={labelClass}>Refund Status</td><td className={`${valueClass} text-[#1e3a8a] font-black uppercase tracking-widest`}>{data?.refundStatus || 'Analysis Pending'}</td></tr>
              <tr><td className={labelClass}>Lien Marked On</td><td className={valueClass}>{data?.lienMarkedOn || 'No Active Lien Recorded'}</td></tr>
              <tr><td className={labelClass}>Bank</td><td className={valueClass}>{data?.lienBank || 'N/A'}</td></tr>
            </tbody>
          </table>
        </section>

        {/* 4. Bank Details */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">4. Client Bank Account Details</h2>
          <table className="w-full border-collapse border border-gray-200">
            <tbody>
              <tr><td className={labelClass}>Account 1</td><td className={valueClass}>Number: {data?.bankAccountDetails?.acc1No || '—'} | IFSC: {data?.bankAccountDetails?.acc1Ifsc || '—'}</td></tr>
              <tr><td className={labelClass}>Account 2</td><td className={valueClass}>Number: {data?.bankAccountDetails?.acc2No || '—'} | IFSC: {data?.bankAccountDetails?.acc2Ifsc || '—'}</td></tr>
            </tbody>
          </table>
        </section>

        {/* 5. Case Background */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">5. Case Background & Allegations</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <div className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest mb-1">Case Summary:</div>
              <div className="text-[11px] text-gray-600 leading-relaxed italic">{data?.caseSummary || 'No summary available.'}</div>
            </div>
            <div>
              <div className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest mb-1">Primary Allegation:</div>
              <div className="text-[11px] text-gray-900 font-bold border-l-2 border-red-200 pl-3">"{data?.clientAllegation || 'No specific allegations recorded.'}"</div>
            </div>
          </div>
        </section>

        {/* 6. Key Pending Issue */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">6. Key Pending Issue</h2>
          <div className="bg-red-50 border border-red-100 rounded-lg p-5 text-[11px] font-bold text-red-700 uppercase tracking-wide">
            {data?.keyPendingIssue || 'No critical pending issues recorded.'}
          </div>
        </section>

        {/* 7. Timeline */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">7. Case Timeline of Events</h2>
          <div className="space-y-3">
            {timeline.map((t, idx) => (
              <div key={idx} className="flex gap-6 items-start pb-3 border-b border-gray-50 last:border-0">
                <div className="w-20 text-[10px] font-bold text-[#2563eb] pt-1">{new Date(t.eventDate || t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-gray-800">{t.summary}</div>
                  <div className="text-[8px] text-gray-400 font-black uppercase mt-0.5 tracking-widest">Source: {t.source || 'System'}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Recommended Steps */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">8. Recommended Next Steps</h2>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-[11px] font-medium text-[#1e3a8a] leading-relaxed whitespace-pre-line">
            {data?.recommendedNextSteps || '1. Continue standard follow-up.\n2. Monitor for further escalations.'}
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-gray-100 text-center text-[9px] text-gray-400 font-black uppercase tracking-widest opacity-60">
          CONFIDENTIAL — FOR INTERNAL REVIEW ONLY | StartupFlora (Acolyte Technologies) | Reference: {data?.caseId}
        </footer>
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
