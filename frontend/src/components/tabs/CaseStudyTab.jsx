import React, { useState, useEffect } from 'react';
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
  Inbox
} from 'lucide-react';

const CaseStudyTab = () => {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [generatedCase, setGeneratedCase] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [fetchingCases, setFetchingCases] = useState(true);
  
  // Data for the compiled view
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
      if (foundCase) {
        foundCase.caseStudyGeneratedAt = now;
      }
      
      // Fetch all related data for the report
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to load related data');
    } finally {
      setLoading(false);
    }
  };

  const generatedCases = cases.filter(c => c.caseStudyGeneratedAt).sort((a, b) => new Date(b.caseStudyGeneratedAt) - new Date(a.caseStudyGeneratedAt));

  return (
    <div className="h-full bg-gray-50/50 p-6 overflow-y-auto print:bg-white print:p-0">
      
      {/* Page Layout Container */}
      <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Case Study Generator</h1>
        <p className="text-xs text-gray-500 mt-1">Auto-compiles case data into a formatted study document</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT PANEL */}
        <div className="print:hidden w-full lg:w-[420px] flex-shrink-0 flex flex-col gap-6">
          
          {/* Generate Block */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-300 overflow-visible transition-all hover:shadow-md">
            <div className="p-4 bg-gray-50/80 border-b-2 border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCcw size={18} className="text-purple-600" />
                <h2 className="text-[14px] font-black text-gray-800 uppercase tracking-tight">Generate Study</h2>
              </div>
              <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">AUTO-COMPILE</div>
            </div>
            <div className="p-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Select Case ID</label>
              <SearchableCaseSelect 
                cases={cases} 
                value={selectedCase} 
                onChange={setSelectedCase} 
              />
              <div className="mb-4"></div> {/* Spacer */}
              
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg shadow transition-all flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                {loading ? 'Compiling Study...' : 'Generate Case Study'}
              </button>
            </div>
          </div>

          {/* Control Block */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-300 overflow-hidden flex flex-col max-h-[500px] transition-all hover:shadow-md">
            <div className="p-4 bg-gray-50/80 border-b-2 border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-orange-500" />
                <h2 className="text-[14px] font-black text-gray-800 uppercase tracking-tight">Generated Studies</h2>
              </div>
              <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{generatedCases.length} REPORTS</div>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-blue-800 text-white text-[9px] font-bold tracking-wider uppercase sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 whitespace-nowrap">Case ID</th>
                    <th className="px-3 py-2 whitespace-nowrap text-center">Status</th>
                    <th className="px-3 py-2 whitespace-nowrap">Last Refresh</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-gray-700 divide-y divide-gray-100">
                  {generatedCases.length === 0 ? (
                    <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400 italic">No case studies generated yet.</td></tr>
                  ) : (
                    generatedCases.map(c => (
                      <tr key={c.caseId} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => loadGeneratedStudy(c.caseId)}>
                        <td className="px-3 py-2 font-mono text-blue-600 font-bold whitespace-normal break-words max-w-[80px]">
                          {c.caseId.replace(/-/g, '-\u200B')}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="bg-green-100 text-green-800 border border-green-200 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap block">Study Generated</span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {new Date(c.caseStudyGeneratedAt).toLocaleString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' })}<br/>
                          {new Date(c.caseStudyGeneratedAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border-2 border-gray-300 flex flex-col min-h-[700px] h-fit relative print:border-none print:shadow-none print:m-0 print:p-0">
          {!generatedCase ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <FileText size={40} className="text-gray-200" />
              </div>
              <h3 className="text-lg font-bold text-gray-600 mb-2">No Study Loaded</h3>
              <p className="text-sm max-w-[250px] mx-auto text-gray-400">Select a Case ID and click Generate to compile the full case study document.</p>
            </div>
          ) : loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-gray-700">Compiling Report...</h3>
              <p className="text-sm text-gray-500">Fetching all timeline, communication, and action logs.</p>
            </div>
          ) : (
            <>
              {/* PDF Download Button */}
              <div className="absolute top-6 right-8 print:hidden flex gap-3">
                <button 
                  onClick={() => window.print()} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Printer size={18} /> Print / Save PDF
                </button>
              </div>

              <div className="p-10 lg:p-14 overflow-y-auto print:p-0 print:overflow-visible bg-white">
                <div className="border-b-2 border-blue-600 pb-6 mb-10 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                      <FileText size={32} className="text-blue-600" />
                      CASE STUDY REPORT
                    </h1>
                    <p className="text-gray-500 font-bold text-sm mt-1 uppercase tracking-widest">Confidential Investigative Document</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-700 leading-none">{generatedCase.caseId}</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase font-black">Report Reference ID</div>
                  </div>
                </div>

                {/* CASE OVERVIEW */}
                <div className="mb-10 group">
                  <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
                    <Info size={16} /> Case Overview
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <tbody className="text-[11px]">
                      <tr>
                        <td className="w-1/3 p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Case ID</td>
                        <td className="w-2/3 p-2 border border-gray-200 text-gray-600">{generatedCase.caseId}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Created</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.createdDate ? new Date(generatedCase.createdDate).toLocaleString('en-IN') : '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Brand Name</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.brandName || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Company</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.companyName || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Case Title</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.caseTitle || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Client</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.clientName || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Mobile</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.clientMobile || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Email</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.clientEmail || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">State</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.state || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Services</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.servicesSold?.map(s => s.serviceName).join(', ') || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Source of Complaint</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.sourceOfComplaint || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Type of Complaint</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.typeOfComplaint || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Engagement Note</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.engagementNote || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Total MOU Value</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.totalMouValue ? `₹${Number(generatedCase.totalMouValue).toLocaleString('en-IN')}` : '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Amount Paid</td>
                        <td className="p-2 border border-gray-200 text-gray-600">₹{Number(generatedCase.totalAmtPaid || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Amount In Dispute</td>
                        <td className="p-2 border border-gray-200 text-gray-600">₹{Number(generatedCase.amtInDispute || 0).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">MOU Signed</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.mouSigned || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Priority</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.priority || 'Medium'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Status</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.currentStatus || 'New'}</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* RISK PROFILE */}
                <div className="mb-10">
                  <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
                    <ShieldAlert size={16} /> Risk Profile & Legal Assessment
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <tbody className="text-[11px]">
                      <tr>
                        <td className="w-1/3 p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Social Media Risk</td>
                        <td className="w-2/3 p-2 border border-gray-200 text-gray-600">{generatedCase.smRisk || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Consumer Complaint (Grievance)</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.grievanceNumber || (generatedCase.grievanceNumber ? 'Yes' : '-')}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Police/Cyber Threat</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.policeThreat || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Cyber Ack Numbers</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.cyberAckNumbers || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">FIR Number</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.firNumber || '-'} {generatedCase.firFileLink ? `(File Attached)` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* PROOFS ATTACHED */}
                <div className="mb-10">
                  <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
                    <CheckSquare size={16} /> Evidence & Verification Proofs
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <tbody className="text-[11px]">
                      <tr>
                        <td className="w-1/3 p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Call Recording</td>
                        <td className="w-2/3 p-2 border border-gray-200 text-gray-600">{generatedCase.proofCallRec === 'true' ? '✅ Available' : '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">WhatsApp Chat</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.proofWaChat === 'true' ? '✅ Available' : '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Video Call Proof</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.proofVideoCall === 'true' ? '✅ Available' : '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Funding Email</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.proofFundingEmail === 'true' ? '✅ Available' : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* CASE NARRATIVE */}
                <div className="mb-10">
                  <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
                    <FileText size={16} /> Detailed Case Narrative
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <tbody className="text-[11px]">
                      <tr>
                        <td className="w-1/3 p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Case Summary</td>
                        <td className="w-2/3 p-2 border border-gray-200 text-gray-600 whitespace-pre-wrap">{generatedCase.caseSummary || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Client Allegation</td>
                        <td className="p-2 border border-gray-200 text-gray-600 whitespace-pre-wrap">{generatedCase.clientAllegation || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* TEAM */}
                <div className="mb-10">
                  <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
                    <Users size={16} /> Responsible Team & Officers
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <tbody className="text-[11px]">
                      <tr>
                        <td className="w-1/3 p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">BDE / Initiated By</td>
                        <td className="w-2/3 p-2 border border-gray-200 text-gray-600">{generatedCase.initiatedBy || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Assigned To</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.assignedTo || generatedCase.accountable || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Legal Officer</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.legalOfficer || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-gray-200 bg-gray-50 font-bold text-gray-800">Accounts Department</td>
                        <td className="p-2 border border-gray-200 text-gray-600">{generatedCase.accounts || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* TIMELINE */}
                <div className="mb-10">
                  <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
                    <History size={16} /> Complete Chronological Timeline ({timeline.length})
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <thead className="bg-gray-50 font-bold text-gray-800 text-[10px] uppercase">
                      <tr>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Date</th>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Source</th>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Type</th>
                        <th className="p-2 border border-gray-200 w-1/2">Summary</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] text-gray-600">
                      {timeline.length === 0 ? (
                        <tr><td colSpan="4" className="p-2 border border-gray-200 text-center">No timeline events</td></tr>
                      ) : timeline.map(t => (
                        <tr key={t._id}>
                          <td className="p-2 border border-gray-200 whitespace-nowrap">{new Date(t.eventDate).toLocaleString('en-IN')}</td>
                          <td className="p-2 border border-gray-200">{t.source}</td>
                          <td className="p-2 border border-gray-200">{t.eventType}</td>
                          <td className="p-2 border border-gray-200">{t.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mb-10">
                  <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
                    <Calendar size={16} /> Verified Actions Log ({actions.length})
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <thead className="bg-gray-50 font-bold text-gray-800 text-[10px] uppercase">
                      <tr>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Date</th>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Type</th>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Done By</th>
                        <th className="p-2 border border-gray-200 w-1/2">Summary</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] text-gray-600">
                      {actions.length === 0 ? (
                        <tr><td colSpan="4" className="p-2 border border-gray-200 text-center">No actions</td></tr>
                      ) : actions.map(a => (
                        <tr key={a._id}>
                          <td className="p-2 border border-gray-200 whitespace-nowrap">{new Date(a.dateTime).toLocaleString('en-IN')}</td>
                          <td className="p-2 border border-gray-200">{a.actionType}</td>
                          <td className="p-2 border border-gray-200">{a.doneBy}</td>
                          <td className="p-2 border border-gray-200">{a.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* COMMUNICATIONS */}
                <div className="mb-10">
                  <div className="bg-blue-600 text-white font-bold text-xs uppercase p-3 tracking-widest flex items-center gap-2 rounded-t-lg shadow-sm">
                    <MessageSquare size={16} /> Communication History ({comms.length})
                  </div>
                  <div className="border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full border-collapse border border-gray-200 text-left">
                    <thead className="bg-gray-50 font-bold text-gray-800 text-[10px] uppercase">
                      <tr>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Date</th>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Mode</th>
                        <th className="p-2 border border-gray-200 whitespace-nowrap">Direction</th>
                        <th className="p-2 border border-gray-200 w-1/2">Summary</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] text-gray-600">
                      {comms.length === 0 ? (
                        <tr><td colSpan="4" className="p-2 border border-gray-200 text-center">No communications</td></tr>
                      ) : comms.map(c => (
                        <tr key={c._id}>
                          <td className="p-2 border border-gray-200 whitespace-nowrap">{new Date(c.dateTime).toLocaleString('en-IN')}</td>
                          <td className="p-2 border border-gray-200">{c.mode}</td>
                          <td className="p-2 border border-gray-200">{c.direction}</td>
                          <td className="p-2 border border-gray-200">{c.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                <div className="text-right border-t-2 border-gray-100 pt-8 mt-12 mb-4">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Generated System Timestamp</div>
                  <div className="text-xs font-bold text-gray-600">
                    {new Date(generatedCase.caseStudyGeneratedAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true
                    })}
                  </div>
                  <div className="mt-4 text-[9px] text-gray-400 italic">This is an auto-generated report from RRR Engine. No signature required.</div>
                </div>

              </div>
            </>
          )}
        </div>

      </div>
    </div>
  </div>
);
};

export default CaseStudyTab;
