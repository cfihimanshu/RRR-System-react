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
  X
} from 'lucide-react';

const CaseStudyTab = () => {
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
    fetchCases();
  }, []);

  const handleGenerate = async () => {
    if (!selectedCase) return toast.error('Please select a Case ID first');
    setLoading(true);
    try {
      const now = new Date().toISOString();
      await api.put(`/cases/${selectedCase}`, { caseStudyGeneratedAt: now });
      
      const foundCase = cases.find(c => c.caseId === selectedCase);
      if (foundCase) foundCase.caseStudyGeneratedAt = now;
      
      const [tlRes, actRes, commRes, docRes] = await Promise.all([
        api.get(`/timeline?caseId=${selectedCase}`),
        api.get(`/actions?caseId=${selectedCase}`),
        api.get(`/communications?caseId=${selectedCase}`),
        api.get(`/documents?caseId=${selectedCase}`)
      ]);
      
      setTimeline(tlRes.data);
      setActions(actRes.data);
      setComms(commRes.data);
      setDocs(docRes.data);
      
      setGeneratedCase({ ...foundCase, caseStudyGeneratedAt: now });
      setShowMobilePreview(true);
      toast.success('Case study compiled successfully');
    } catch (err) {
      toast.error('Failed to generate case study');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGeneratedStudy = async (caseId) => {
    setSelectedCase(caseId);
    const foundCase = cases.find(c => c.caseId === caseId);
    if (!foundCase) return;
    
    setLoading(true);
    try {
      const [tlRes, actRes, commRes, docRes] = await Promise.all([
        api.get(`/timeline?caseId=${caseId}`),
        api.get(`/actions?caseId=${caseId}`),
        api.get(`/communications?caseId=${caseId}`),
        api.get(`/documents?caseId=${caseId}`)
      ]);
      setTimeline(tlRes.data);
      setActions(actRes.data);
      setComms(commRes.data);
      setDocs(docRes.data);
      setGeneratedCase(foundCase);
      setShowMobilePreview(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load related data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedCase) return;
    const element = document.getElementById('report-to-download');
    if (!element) return;

    const opt = {
      margin: [10, 10],
      filename: `Report_${generatedCase.caseId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
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

  const ReportContent = ({ data, timeline, actions, comms, isMobile = false }) => (
    <div id="report-to-download" className={`${isMobile ? 'p-6 md:p-10' : 'p-10 lg:p-14'} overflow-y-auto print:p-0 print:overflow-visible bg-white`}>
      <div className="border-b-2 border-blue-600 pb-6 mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><FileText size={isMobile ? 24 : 32} /></div>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-black text-gray-900 tracking-tight`}>CASE STUDY REPORT</h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Confidential Investigative Document</p>
          </div>
        </div>
        <div className="text-left sm:text-right w-full sm:w-auto">
          <div className="text-xl font-black text-blue-700 leading-none">{data.caseId}</div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">Report Reference ID</div>
        </div>
      </div>

      {/* Case Overview */}
      <div className="mb-10">
        <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
          <Info size={16} /> Case Overview
        </div>
        <div className="border-x border-b border-gray-200 rounded-b-lg overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse text-left">
            <tbody className="text-[11px]">
              {[
                ['Case ID', data.caseId],
                ['Created', data.createdDate ? new Date(data.createdDate).toLocaleString('en-IN') : '-'],
                ['Brand Name', data.brandName || '-'],
                ['Company', data.companyName || '-'],
                ['Case Title', data.caseTitle || '-'],
                ['Client', data.clientName || '-'],
                ['Mobile', data.clientMobile || '-'],
                ['Email', data.clientEmail || '-'],
                ['State', data.state || '-'],
                ['Services', data.servicesSold?.map(s => s.serviceName).join(', ') || '-'],
                ['Source', data.sourceOfComplaint || '-'],
                ['Type', data.typeOfComplaint || '-'],
                ['MOU Value', data.totalMouValue ? `₹${Number(data.totalMouValue).toLocaleString('en-IN')}` : '-'],
                ['Amount Paid', `₹${Number(data.totalAmtPaid || 0).toLocaleString('en-IN')}`],
                ['Dispute Amt', `₹${Number(data.amtInDispute || 0).toLocaleString('en-IN')}`],
                ['MOU Signed', data.mouSigned || '-'],
                ['Priority', data.priority || 'Medium'],
                ['Status', data.currentStatus || 'New'],
              ].map(([lbl, val]) => (
                <tr key={lbl}>
                  <td className="w-1/3 p-2.5 border border-gray-100 bg-gray-50/50 font-bold text-gray-800">{lbl}</td>
                  <td className="w-2/3 p-2.5 border border-gray-100 text-gray-600">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline & Actions (Summarized for space) */}
      <div className="mb-10">
        <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
          <History size={16} /> Case Timeline & Actions
        </div>
        <div className="border-x border-b border-gray-200 rounded-b-lg overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead className="bg-gray-50 font-bold text-gray-800 text-[10px] uppercase">
              <tr>
                <th className="p-2.5 border border-gray-100">Date</th>
                <th className="p-2.5 border border-gray-100">Type</th>
                <th className="p-2.5 border border-gray-100 w-1/2">Summary</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-gray-600">
              {timeline.length === 0 && actions.length === 0 ? (
                <tr><td colSpan="3" className="p-4 text-center">No history logged</td></tr>
              ) : (
                [...timeline, ...actions.map(a => ({...a, eventDate: a.dateTime, eventType: a.actionType}))]
                  .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
                  .map((t, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 border border-gray-100 whitespace-nowrap">{new Date(t.eventDate).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 border border-gray-100 font-bold">{t.eventType}</td>
                      <td className="p-2.5 border border-gray-100">{t.summary}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-right border-t border-gray-100 pt-8 mt-12 mb-4 opacity-60">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Generated Timestamp</div>
        <div className="text-[11px] font-bold text-gray-600">{new Date(data.caseStudyGeneratedAt).toLocaleString('en-IN')}</div>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-gray-50/50 p-4 md:p-6 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Case Study Generator</h1>
            <p className="text-xs text-gray-500 mt-1">Compile full case reports into PDF</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[400px] flex-shrink-0 flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Select Case ID</label>
              <SearchableCaseSelect cases={cases} value={selectedCase} onChange={setSelectedCase} />
              <button 
                onClick={handleGenerate} 
                disabled={loading}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                Generate Study
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col max-h-[500px]">
              <div className="p-4 bg-gray-50/80 border-b border-gray-200 font-black text-gray-800 uppercase tracking-tight text-xs">Reports History</div>
              <div className="overflow-auto">
                <table className="w-full text-left">
                  <tbody className="text-[11px] divide-y divide-gray-100">
                    {generatedCases.map(c => (
                      <tr key={c.caseId} className="hover:bg-gray-50 cursor-pointer" onClick={() => loadGeneratedStudy(c.caseId)}>
                        <td className="px-4 py-3 font-bold text-blue-600">{c.caseId}</td>
                        <td className="px-4 py-3 text-gray-400">{new Date(c.caseStudyGeneratedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex-col min-h-[700px] relative">
            {!generatedCase ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300"><FileText size={64} className="opacity-10" /></div>
            ) : loading ? (
              <div className="flex-1 flex flex-col items-center justify-center"><Loader2 size={48} className="animate-spin text-blue-500" /></div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-100 flex justify-end gap-3">
                  <button onClick={handleDownloadPDF} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><FileDown size={14} /> Download PDF</button>
                  <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><Printer size={14} /> Print</button>
                </div>
                <div className="flex-1 overflow-auto"><ReportContent data={generatedCase} timeline={timeline} actions={actions} comms={comms} /></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobilePreview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm lg:hidden">
          <div className="bg-white w-full h-full sm:h-[95vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white shadow-lg">
              <span className="font-black uppercase tracking-widest text-[10px]">Report Preview</span>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadPDF} className="bg-green-500 hover:bg-green-600 p-2 rounded-xl"><FileDown size={20} /></button>
                <button onClick={() => setShowMobilePreview(false)} className="bg-white/20 p-2 rounded-xl"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? <div className="p-20 text-center"><Loader2 size={48} className="animate-spin mx-auto text-blue-500" /></div> : <ReportContent data={generatedCase} timeline={timeline} actions={actions} comms={comms} isMobile={true} />}
            </div>
          </div>
        </div>
      )}

      {generatedCase && !showMobilePreview && (
        <button onClick={() => setShowMobilePreview(true)} className="lg:hidden fixed bottom-6 right-6 z-[90] bg-blue-600 text-white p-4 rounded-full shadow-2xl animate-bounce"><FileText size={24} /></button>
      )}
    </div>
  );
};

export default CaseStudyTab;
