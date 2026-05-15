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
  const [progressLogs, setProgressLogs] = useState([]);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showCommsModal, setShowCommsModal] = useState(false);

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

      const [tlRes, actRes, commRes, docRes, progRes] = await Promise.all([
        api.get(`/timeline?caseId=${targetId}`),
        api.get(`/actions?caseId=${targetId}`),
        api.get(`/communications?caseId=${targetId}`),
        api.get(`/documents?caseId=${targetId}`),
        api.get(`/progress?caseId=${targetId}`)
      ]);

      setTimeline(tlRes.data);
      setActions(actRes.data);
      setComms(commRes.data);
      setDocs(docRes.data);
      setProgressLogs(progRes.data.logs || []);

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
      const [caseRes, tlRes, actRes, commRes, docRes, progRes] = await Promise.all([
        caseData ? Promise.resolve({ data: caseData }) : api.get(`/cases?caseId=${caseId}`),
        api.get(`/timeline?caseId=${caseId}`),
        api.get(`/actions?caseId=${caseId}`),
        api.get(`/communications?caseId=${caseId}`),
        api.get(`/documents?caseId=${caseId}`),
        api.get(`/progress?caseId=${caseId}`)
      ]);

      const foundCase = caseData || (Array.isArray(caseRes.data) ? caseRes.data.find(c => c.caseId === caseId) : caseRes.data);

      setTimeline(tlRes.data);
      setActions(actRes.data);
      setComms(commRes.data);
      setDocs(docRes.data);
      setProgressLogs(progRes.data.logs || []);
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

    const element = document.getElementById('report-to-download');
    if (!element) return toast.error('Preview not found to generate PDF');

    toast.loading('Generating PDF from preview...', { id: 'pdf-gen' });
    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `CaseStudy_${dataToUse.caseId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().from(element).set(opt).save();
      toast.success('Download complete!', { id: 'pdf-gen' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF', { id: 'pdf-gen' });
    }
  };

  const handlePrint = () => {
    const reportContent = document.getElementById('report-to-download');
    if (!reportContent) return toast.error('Print content not found');

    const printWrapper = document.createElement('div');
    printWrapper.id = 'temp-print-wrapper';
    printWrapper.style.position = 'absolute';
    printWrapper.style.top = '0';
    printWrapper.style.left = '0';
    printWrapper.style.width = '100%';
    printWrapper.style.backgroundColor = 'white';
    printWrapper.style.zIndex = '999999';
    printWrapper.innerHTML = reportContent.outerHTML;

    const style = document.createElement('style');
    style.id = 'temp-print-style';
    style.innerHTML = `
      @media print {
        #root { display: none !important; }
        body { background: white !important; margin: 0; padding: 0; }
        .page-break-before { page-break-before: always !important; }
      }
    `;

    document.body.appendChild(style);
    document.body.appendChild(printWrapper);

    window.print();

    document.body.removeChild(printWrapper);
    document.body.removeChild(style);
  };

  const generatedCases = cases.filter(c => c.caseStudyGeneratedAt).sort((a, b) => new Date(b.caseStudyGeneratedAt) - new Date(a.caseStudyGeneratedAt));

  const ReportContent = ({ data, timeline, actions, comms, docs, progressLogs = [], isMobile = false }) => {
    const totalPaid = data?.servicesSold?.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0) || 0;
    const totalMou = data?.servicesSold?.reduce((sum, s) => sum + (Number(s.signedMouAmount) || 0), 0) || 0;


    const labelClass = "w-1/3 bg-[#f0f7ff] p-3 border border-gray-200 text-[11px] font-bold text-gray-700 uppercase tracking-tighter";
    const valueClass = "w-2/3 bg-white p-3 border border-gray-200 text-[11px] font-medium text-gray-900";

    let sectionNum = 1;

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
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Client Profile</h2>
          <table className="w-full border-collapse border border-gray-200">
            <tbody>
              {data?.companyName && <tr><td className={labelClass}>Company Name</td><td className={valueClass}>{data.companyName}</td></tr>}
              {data?.clientName && <tr><td className={labelClass}>Contact Person</td><td className={valueClass}>{data.clientName}</td></tr>}
              {data?.clientMobile && <tr><td className={labelClass}>Contact Number</td><td className={valueClass}>{data.clientMobile}</td></tr>}
              {data?.clientEmail && <tr><td className={labelClass}>Email ID</td><td className={valueClass}>{data.clientEmail}</td></tr>}
              {(data?.cyberAckNumbers || data?.grievanceNumber) && (
                <tr><td className={labelClass}>Acknowledgment No.</td><td className={valueClass}>{data.cyberAckNumbers || data.grievanceNumber}</td></tr>
              )}
              {data?.createdAt && <tr><td className={labelClass}>Client Since</td><td className={valueClass}>{new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>}
            </tbody>
          </table>
        </section>

        {/* 2. Service Details */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Service Details</h2>
          {data?.servicesSold?.map((s, idx) => (
            <table key={idx} className="w-full border-collapse border border-gray-200 mb-6 last:mb-0">
              <tbody>
                {s.serviceName && <tr><td className={labelClass}>Service Engaged</td><td className={`${valueClass} font-bold text-gray-950`}>{s.serviceName}</td></tr>}
                {s.workStatus && (
                  <tr>
                    <td className={labelClass}>Service Status</td>
                    <td className={valueClass}>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${s.workStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {s.workStatus}
                      </span>
                    </td>
                  </tr>
                )}
                {data?.mouSigned && <tr><td className={labelClass}>MOU Signed</td><td className={valueClass}>{data.mouSigned}</td></tr>}
                {s.signedMouAmount && <tr><td className={labelClass}>MOU Signed Amount</td><td className={valueClass}>Rs. {Number(s.signedMouAmount).toLocaleString('en-IN')}/-</td></tr>}
                {s.bda && <tr><td className={labelClass}>Business Development Associate</td><td className={valueClass}>{s.bda}</td></tr>}
                {s.serviceAmount && <tr><td className={labelClass}>Amount Paid</td><td className={`${valueClass} font-bold text-gray-950`}>Rs. {Number(s.serviceAmount).toLocaleString('en-IN')}/-</td></tr>}
              </tbody>
            </table>
          ))}
        </section>

        {/* 3. Financial Summary */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Financial Summary</h2>
          <table className="w-full border-collapse border border-gray-200">
            <tbody>
              {totalPaid > 0 && <tr><td className={labelClass}>Total Amount Paid by Client</td><td className={`${valueClass} font-black text-gray-950`}>Rs. {totalPaid.toLocaleString('en-IN')}/-</td></tr>}

              {totalMou > 0 && <tr><td className={labelClass}>Total MOU Amount</td><td className={valueClass}>Rs. {totalMou.toLocaleString('en-IN')}/-</td></tr>}
              {data?.refundStatus && <tr><td className={labelClass}>Refund Status</td><td className={`${valueClass} text-[#1e3a8a] font-black uppercase tracking-widest`}>{data.refundStatus}</td></tr>}
              {data?.lienMarkedOn && <tr><td className={labelClass}>Lien Marked On</td><td className={valueClass}>{data.lienMarkedOn}</td></tr>}
              {data?.lienBank && <tr><td className={labelClass}>Bank</td><td className={valueClass}>{data.lienBank}</td></tr>}
            </tbody>
          </table>
        </section>

        {/* 4. Bank Details */}
        {(data?.bankAccountDetails?.acc1No || data?.bankAccountDetails?.acc2No) && (
          <section className="mb-10">
            <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Client Bank Account Details</h2>
            <table className="w-full border-collapse border border-gray-200">
              <tbody>
                {data?.bankAccountDetails?.acc1No && <tr><td className={labelClass}>Account 1</td><td className={valueClass}>Number: {data.bankAccountDetails.acc1No} | IFSC: {data.bankAccountDetails.acc1Ifsc || '—'}</td></tr>}
                {data?.bankAccountDetails?.acc2No && <tr><td className={labelClass}>Account 2</td><td className={valueClass}>Number: {data.bankAccountDetails.acc2No} | IFSC: {data.bankAccountDetails.acc2Ifsc || '—'}</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {/* 5. Case Background */}
        {(data?.caseSummary || data?.clientAllegation) && (
          <section className="mb-10">
            <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Case Background & Allegations</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
              {data?.caseSummary && (
                <div>
                  <div className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest mb-1">Case Summary:</div>
                  <div className="text-[11px] text-gray-600 leading-relaxed italic">{data.caseSummary}</div>
                </div>
              )}
              {data?.clientAllegation && (
                <div>
                  <div className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest mb-1">Primary Allegation:</div>
                  <ul className="text-[11px] text-gray-900 font-bold border-l-2 border-red-200 pl-4 list-disc list-inside space-y-1">
                    {data.clientAllegation.split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                      <li key={idx}>{line.trim()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 6. Key Pending Issue */}
        {data?.keyPendingIssue && (
          <section className="mb-10">
            <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Key Pending Issue</h2>
            <div className="bg-red-50 border border-red-100 rounded-lg p-5 text-[11px] font-bold text-red-700 uppercase tracking-wide">
              {data.keyPendingIssue}
            </div>
          </section>
        )}

        {/* 7. Timeline */}
        <section className="mb-10">
          <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Case Timeline of Events</h2>
          <div className="space-y-3">
            {timeline.map((t, idx) => (
              <div key={idx} className="flex gap-6 items-start pb-3 border-b border-gray-50 last:border-0">
                <div className="w-20 text-[10px] font-bold text-[#2563eb] pt-1">{new Date(t.eventDate || t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-gray-800">{t.summary}</div>
                  {t.metadata?.nextAction && (
                    <div className="text-[10px] font-bold text-[#2563eb] mt-1">Next Action: {t.metadata.nextAction}</div>
                  )}
                  <div className="text-[8px] text-gray-400 font-black uppercase mt-0.5 tracking-widest">Source: {t.source || 'System'}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Recommended Steps */}
        {data?.recommendedNextSteps && (
          <section className="mb-10">
            <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Recommended Next Steps</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-[11px] font-medium text-[#1e3a8a] leading-relaxed whitespace-pre-line">
              {data.recommendedNextSteps}
            </div>
          </section>
        )}

        {/* 8.5 Next Action Planned */}
        {progressLogs && progressLogs.length > 0 && progressLogs[0].nextAction && (
          <section className="mb-10">
            <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Next Action Planned</h2>
            <div className="bg-green-50 border border-green-100 rounded-lg p-6 text-[11px] font-medium text-green-700 leading-relaxed whitespace-pre-line">
              {progressLogs[0].nextAction}
              {progressLogs[0].followUpDate && (
                <div className="text-[9px] text-green-600 font-bold mt-2 uppercase tracking-widest">
                  Follow Up Date: {new Date(progressLogs[0].followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 9. Communication Logs */}
        {comms && comms.length > 0 && (
          <section className="mb-10 page-break-before">
            <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Communication Logs</h2>
            <table className="w-full border-collapse border border-gray-200 text-[10px]">
              <thead className="bg-white border-b border-gray-300">
                <tr>
                  <th className="bg-white p-2 border border-gray-200 text-left font-bold uppercase text-[#1e3a8a] w-24">Date</th>
                  <th className="bg-white p-2 border border-gray-200 text-left font-bold uppercase text-[#1e3a8a] w-24">Mode/Dir</th>
                  <th className="bg-white p-2 border border-gray-200 text-left font-bold uppercase text-[#1e3a8a]">From/To</th>
                  <th className="bg-white p-2 border border-gray-200 text-left font-bold uppercase text-[#1e3a8a]">Summary</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {comms.map((c, i) => {
                  const rawDate = c.dateTime || c.createdAt || data?.createdAt;
                  const dateObj = new Date(rawDate);
                  const displayDate = (!rawDate) ? '—' : (isNaN(dateObj.getTime()) ? rawDate : dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
                  return (
                    <tr key={i}>
                      <td className="bg-white p-2 border border-gray-200 text-gray-700">{displayDate}</td>
                      <td className="bg-white p-2 border border-gray-200 font-medium text-gray-900">{c.mode} / {c.direction}</td>
                      <td className="bg-white p-2 border border-gray-200 text-gray-700">{c.fromTo || '—'}</td>
                      <td className="bg-white p-2 border border-gray-200 text-gray-700 italic">{c.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* 10. Document Logs */}
        {docs && docs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[#1e3a8a] text-sm font-bold border-b border-[#3b82f6] pb-2 mb-4 uppercase tracking-wider">{sectionNum++}. Case Documents Index</h2>
            <table className="w-full border-collapse border border-gray-200 text-[10px]">
              <thead className="bg-white border-b border-gray-300">
                <tr>
                  <th className="bg-white p-2 border border-gray-200 text-left font-bold uppercase text-[#1e3a8a] w-24">Date</th>
                  <th className="bg-white p-2 border border-gray-200 text-left font-bold uppercase text-[#1e3a8a] w-32">Type</th>
                  <th className="bg-white p-2 border border-gray-200 text-left font-bold uppercase text-[#1e3a8a]">Summary</th>
                  <th className="bg-white p-2 border border-gray-200 text-left font-bold uppercase text-[#1e3a8a]">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {docs.map((d, i) => {
                  const rawDate = d.uploadDate || d.createdAt || data?.createdAt;
                  const dateObj = new Date(rawDate);
                  const displayDate = (!rawDate) ? '—' : (isNaN(dateObj.getTime()) ? rawDate : dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
                  return (
                    <tr key={i}>
                      <td className="bg-white p-2 border border-gray-200 text-gray-700">{displayDate}</td>
                      <td className="bg-white p-2 border border-gray-200 font-medium text-gray-900">{d.docType || d.sourceForm || '—'}</td>
                      <td className="bg-white p-2 border border-gray-200 text-gray-900 font-bold">{d.fileSummary || '—'}</td>
                      <td className="bg-white p-2 border border-gray-200 text-gray-700 italic">{d.remarks || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

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
                <div className="p-6 bg-bg-card border-b border-border flex justify-between items-center shadow-sm z-10 mb-8 rounded-2xl">
                  <div className="flex gap-4">
                    <button onClick={() => setShowDocsModal(true)} className="bg-blue-soft text-blue px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/10 hover:-translate-y-0.5">
                      <Inbox size={18} /> View Documents ({docs.length})
                    </button>
                    <button onClick={() => setShowCommsModal(true)} className="bg-orange-soft text-accent px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-orange-900/10 hover:-translate-y-0.5">
                      <MessageSquare size={18} /> View Communications ({comms.length})
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleDownloadPDF} className="bg-green hover:bg-green-600 text-white px-8 py-3 rounded-2xl shadow-xl shadow-green-900/20 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 group">
                      <FileDown size={18} className="group-hover:scale-110 transition-transform" /> Export PDF
                    </button>
                    <button onClick={handlePrint} className="bg-bg-input hover:bg-bg-card-hover text-text-primary border-2 border-border px-8 py-3 rounded-2xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest active:scale-95">
                      <Printer size={18} /> Print Record
                    </button>
                  </div>
                </div>
                <div className="max-w-[1000px] mx-auto shadow-2xl rounded-[2.5rem] overflow-hidden border-8 border-border">
                  <ReportContent data={generatedCase || caseData} timeline={timeline} actions={actions} comms={comms} docs={docs} progressLogs={progressLogs} />
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
                      <ReportContent data={generatedCase || caseData} timeline={timeline} actions={actions} comms={comms} docs={docs} progressLogs={progressLogs} isMobile={true} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Modal (for caseData view) */}
            {showDocsModal && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-bg-primary/95 backdrop-blur-xl">
                <div className="bg-bg-secondary w-full max-w-2xl rounded-[2.5rem] border-2 border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between px-8 py-6 bg-bg-card border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-soft rounded-2xl flex items-center justify-center text-blue">
                        <Inbox size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-black uppercase tracking-widest">Case Documents</h3>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{generatedCase?.caseId || caseData?.caseId}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowDocsModal(false)} className="bg-bg-input hover:bg-bg-card-hover text-text-primary p-3 rounded-2xl border-2 border-border transition-all active:scale-90">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-thin">
                    {docs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                        <Inbox size={48} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No documents attached to this case</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {docs.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.fileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-5 bg-bg-card border-2 border-border rounded-2xl hover:border-accent/50 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                                <FileText size={20} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-black uppercase tracking-tight">{doc.fileSummary || doc.docType || doc.docId}</p>
                                <p className="text-[8px] text-text-muted font-bold uppercase mt-0.5">{doc.docType || 'Uncategorized'}</p>
                              </div>
                            </div>
                            <Eye size={16} className="text-text-muted group-hover:text-accent transition-all" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Communications Modal (for caseData view) */}
            {showCommsModal && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-bg-primary/95 backdrop-blur-xl">
                <div className="bg-bg-secondary w-full max-w-2xl rounded-[2.5rem] border-2 border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between px-8 py-6 bg-bg-card border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-soft rounded-2xl flex items-center justify-center text-accent">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-black uppercase tracking-widest">Communication Attachments</h3>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{generatedCase?.caseId || caseData?.caseId}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowCommsModal(false)} className="bg-bg-input hover:bg-bg-card-hover text-text-primary p-3 rounded-2xl border-2 border-border transition-all active:scale-90">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-thin">
                    {comms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                        <MessageSquare size={48} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No communications recorded</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {comms.map((comm, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col p-5 bg-bg-card border-2 border-border rounded-2xl hover:border-accent/50 transition-all group"
                          >
                            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${comm.direction === 'Incoming' ? 'bg-green-soft text-green' : 'bg-blue-soft text-blue'}`}>
                                  {comm.direction === 'Incoming' ? <Inbox size={18} /> : <MessageSquare size={18} />}
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-black uppercase tracking-tight line-clamp-1">{comm.mode || 'Email'}</p>
                                  <p className="text-[8px] text-text-muted font-bold uppercase mt-0.5">{new Date(comm.dateTime || comm.createdAt).toLocaleDateString()} • {comm.fromTo || 'Client'}</p>
                                </div>
                              </div>
                              {comm.fileLink && (
                                <a
                                  href={comm.fileLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-accent text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-accent-hover transition-all"
                                >
                                  <Eye size={12} /> VIEW FILE
                                </a>
                              )}
                            </div>
                            <p className="text-[11px] text-text-secondary italic leading-relaxed">"{comm.summary}"</p>
                          </div>
                        ))}
                      </div>
                    )}
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
                <div className="p-6 bg-bg-card border-b border-border flex justify-between items-center shadow-sm z-10">
                  <div className="flex gap-4">
                    <button onClick={() => setShowDocsModal(true)} className="bg-blue-soft text-blue px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                      <Inbox size={18} /> View Documents ({docs.length})
                    </button>
                    <button onClick={() => setShowCommsModal(true)} className="bg-orange-soft text-accent px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                      <MessageSquare size={18} /> View Communications ({comms.length})
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleDownloadPDF} className="bg-green hover:bg-green-600 text-white px-8 py-3 rounded-2xl shadow-xl shadow-green-900/20 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 group"><FileDown size={18} className="group-hover:scale-110 transition-transform" /> Export PDF</button>
                    <button onClick={handlePrint} className="bg-bg-input hover:bg-bg-card-hover text-text-primary border-2 border-border px-8 py-3 rounded-2xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest active:scale-95"><Printer size={18} /> Print Record</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto bg-bg-input p-12 scrollbar-thin">
                  <div className="max-w-[850px] mx-auto shadow-2xl rounded-[2.5rem] overflow-hidden border-8 border-border">
                    <ReportContent data={generatedCase} timeline={timeline} actions={actions} comms={comms} docs={docs} progressLogs={progressLogs} />
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
                  <ReportContent data={generatedCase} timeline={timeline} actions={actions} comms={comms} docs={docs} progressLogs={progressLogs} isMobile={true} />
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

      {/* Documents Modal */}
      {showDocsModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-bg-primary/95 backdrop-blur-xl">
          <div className="bg-bg-secondary w-full max-w-2xl rounded-[2.5rem] border-2 border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-8 py-6 bg-bg-card border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-soft rounded-2xl flex items-center justify-center text-blue">
                  <Inbox size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Case Documents</h3>
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{generatedCase?.caseId}</p>
                </div>
              </div>
              <button onClick={() => setShowDocsModal(false)} className="bg-bg-input hover:bg-bg-card-hover text-text-primary p-3 rounded-2xl border-2 border-border transition-all active:scale-90">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                  <Inbox size={48} className="mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No documents attached to this case</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {docs.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.fileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 bg-bg-card border-2 border-border rounded-2xl hover:border-accent/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-black uppercase tracking-tight">{doc.fileSummary || doc.docType || doc.docId}</p>
                          <p className="text-[8px] text-text-muted font-bold uppercase mt-0.5">{doc.docType || 'Uncategorized'}</p>
                        </div>
                      </div>
                      <Eye size={16} className="text-text-muted group-hover:text-accent transition-all" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 bg-bg-card border-t border-border text-center">
              <p className="text-[8px] text-text-muted font-black uppercase tracking-widest">Only authorized personnel can access these documents</p>
            </div>
          </div>
        </div>
      )}

      {/* Communications Modal */}
      {showCommsModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-bg-primary/95 backdrop-blur-xl">
          <div className="bg-bg-secondary w-full max-w-2xl rounded-[2.5rem] border-2 border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-8 py-6 bg-bg-card border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-soft rounded-2xl flex items-center justify-center text-accent">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Communication Attachments</h3>
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{generatedCase?.caseId}</p>
                </div>
              </div>
              <button onClick={() => setShowCommsModal(false)} className="bg-bg-input hover:bg-bg-card-hover text-text-primary p-3 rounded-2xl border-2 border-border transition-all active:scale-90">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {comms.filter(c => c.fileLink).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                  <MessageSquare size={48} className="mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No attachments found in communications</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {comms.filter(c => c.fileLink).map((comm, idx) => (
                    <a
                      key={idx}
                      href={comm.fileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 bg-bg-card border-2 border-border rounded-2xl hover:border-accent/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-black uppercase tracking-tight line-clamp-1">{comm.summary || 'Attached File'}</p>
                          <p className="text-[8px] text-text-muted font-bold uppercase mt-0.5">{comm.mode || 'Email'} • {new Date(comm.dateTime).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Eye size={16} className="text-text-muted group-hover:text-accent transition-all flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 bg-bg-card border-t border-border text-center">
              <p className="text-[8px] text-text-muted font-black uppercase tracking-widest">Showing files attached via communication logs</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseStudyTab;
