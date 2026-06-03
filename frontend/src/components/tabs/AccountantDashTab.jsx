import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import FileUpload from '../shared/FileUpload';
import { AuthContext } from '../../context/AuthContext';
import { Image, CheckCircle, UploadCloud, Eye } from 'lucide-react';
import FilePreviewModal from '../shared/FilePreviewModal';

const AccountantDashTab = () => {
  const [refunds, setRefunds] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [paymentData, setPaymentData] = useState({ transactionId: '', paymentDate: '', paymentProof: '' });
  const [selectedInstIndex, setSelectedInstIndex] = useState(null);
  const [instPaymentData, setInstPaymentData] = useState({ transactionId: '', paymentDate: '', paymentProof: '' });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastUTR, setLastUTR] = useState('');
  const { user } = useContext(AuthContext);
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  const [expandedCases, setExpandedCases] = useState({});

  const toggleCaseExpand = (caseId) => {
    setExpandedCases(prev => ({ ...prev, [caseId]: !prev[caseId] }));
  };

  const groupRefundsByCase = (list) => {
    const groups = {};
    list.forEach(r => {
      if (!groups[r.caseId]) {
        groups[r.caseId] = {
          caseId: r.caseId,
          companyName: r.companyName || '',
          requests: [],
          totalAmount: 0
        };
      }
      groups[r.caseId].requests.push(r);
      groups[r.caseId].totalAmount += Number(r.amount) || 0;
    });
    return Object.values(groups);
  };

  const [activeTab, setActiveTab] = useState('pending');

  const fetchRefunds = async () => {
    try {
      const res = await api.get('/refunds');
      setRefunds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const filteredRefunds = React.useMemo(() => {
    return refunds.filter(r => {
      const statusLower = r.status?.toLowerCase();
      
      let statusMatch = false;
      if (activeTab === 'pending') statusMatch = statusLower === 'pending payment';
      else if (activeTab === 'paid') statusMatch = statusLower === 'paid';
      else if (activeTab === 'rejected') statusMatch = statusLower === 'rejected';

      if (!statusMatch) return false;

      let searchMatch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        searchMatch = 
          (r.caseId && r.caseId.toLowerCase().includes(q)) ||
          (r.companyName && r.companyName.toLowerCase().includes(q)) ||
          (r.requestedByName && r.requestedByName.toLowerCase().includes(q)) ||
          (r.requestedBy && r.requestedBy.toLowerCase().includes(q));
      }

      return searchMatch;
    });
  }, [refunds, activeTab, searchQuery]);

  const handlePayInstallment = async () => {
    if (!instPaymentData.paymentDate || !instPaymentData.paymentProof) {
      return toast.error('Please select payment date and upload payment proof');
    }
    try {
      const updatedInstallments = (selectedRefund.installments || []).map((inst, idx) => {
        if (idx === selectedInstIndex) {
          return {
            ...inst,
            status: 'Paid',
            transactionId: instPaymentData.transactionId,
            paymentDate: instPaymentData.paymentDate,
            paymentProof: instPaymentData.paymentProof,
            paidBy: user.email
          };
        }
        return inst;
      });

      const allPaid = updatedInstallments.every(inst => inst.status === 'Paid');

      await api.put(`/refunds/${selectedRefund._id}`, {
        status: allPaid ? 'Paid' : 'Pending Payment',
        transactionId: instPaymentData.transactionId,
        paymentDate: instPaymentData.paymentDate,
        paymentProof: instPaymentData.paymentProof,
        paidBy: user.email,
        installments: updatedInstallments
      });

      setLastUTR(instPaymentData.transactionId);
      setModalOpen(false);
      setIsSuccessModalOpen(true);
      setInstPaymentData({ transactionId: '', paymentDate: '', paymentProof: '' });
      setSelectedInstIndex(null);
      fetchRefunds();
    } catch (err) {
      toast.error('Failed to process installment payment');
    }
  };

  const handleMarkPaid = async () => {
    if (!instPaymentData.paymentDate || !instPaymentData.paymentProof) {
      return toast.error('Please select payment date and upload payment proof');
    }
    try {
      const updatedInstallments = (selectedRefund.installments || []).map(inst => ({
        ...inst,
        status: 'Paid',
        transactionId: instPaymentData.transactionId,
        paymentDate: instPaymentData.paymentDate,
        paymentProof: instPaymentData.paymentProof,
        paidBy: user.email
      }));
      await api.put(`/refunds/${selectedRefund._id}`, {
        status: 'Paid',
        transactionId: instPaymentData.transactionId,
        paymentDate: instPaymentData.paymentDate,
        paymentProof: instPaymentData.paymentProof,
        paidBy: user.email,
        installments: updatedInstallments
      });
      setLastUTR(instPaymentData.transactionId);
      setModalOpen(false);
      setIsSuccessModalOpen(true);
      setInstPaymentData({ transactionId: '', paymentDate: '', paymentProof: '' });
      fetchRefunds();
    } catch (err) {
      toast.error('Failed to mark as paid');
    }
  };

  const handleSaveEditPayout = async () => {
    if (!instPaymentData.paymentDate || !instPaymentData.paymentProof) {
      return toast.error('Please select payment date and upload payment proof');
    }
    try {
      if (selectedInstIndex === -1) {
        // Single payout edit
        await api.put(`/refunds/${selectedRefund._id}`, {
          transactionId: instPaymentData.transactionId,
          paymentDate: instPaymentData.paymentDate,
          paymentProof: instPaymentData.paymentProof
        });
      } else {
        // Installment payout edit
        const updatedInstallments = (selectedRefund.installments || []).map((inst, idx) => {
          if (idx === selectedInstIndex) {
            return {
              ...inst,
              transactionId: instPaymentData.transactionId,
              paymentDate: instPaymentData.paymentDate,
              paymentProof: instPaymentData.paymentProof
            };
          }
          return inst;
        });

        await api.put(`/refunds/${selectedRefund._id}`, {
          installments: updatedInstallments
        });
      }

      toast.success('Payout details updated successfully');
      setModalOpen(false);
      setIsEditMode(false);
      setSelectedInstIndex(null);
      setInstPaymentData({ transactionId: '', paymentDate: '', paymentProof: '' });
      fetchRefunds();
    } catch (err) {
      toast.error('Failed to update payout details');
    }
  };

  return (
    <div className="section active w-full pb-10 px-6 bg-bg-primary">
      <div className="section-header flex justify-between items-center mb-8 pt-4">
        <div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">Accountant Dashboard</h2>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { id: 'pending', label: 'Pending Payouts', activeColor: 'bg-accent text-white shadow-lg shadow-orange-950/20' },
          { id: 'paid', label: 'Paid Payouts', activeColor: 'bg-green text-white shadow-lg shadow-green-950/20' }
        ].map(tab => {
          const count = refunds.filter(r => {
            const statusLower = r.status?.toLowerCase();
            if (tab.id === 'pending') return statusLower === 'pending payment';
            if (tab.id === 'paid') return statusLower === 'paid';
            return false;
          }).length;

          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 active:scale-95 ${isActive
                ? tab.activeColor
                : 'bg-bg-secondary text-text-secondary border-2 border-border hover:bg-bg-card'
                }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-bg-input text-text-muted border border-border'
                }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border overflow-hidden mb-8">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-bg-card">
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-6 rounded-full ${activeTab === 'pending' ? 'bg-orange-500' : 'bg-green'}`} />
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">
              {activeTab === 'pending' ? 'Pending Payments' : 'Settled Payments'}
            </h3>
          </div>
          <div className="w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by Case ID, Company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[300px] bg-bg-input border-2 border-border rounded-xl px-4 py-2 text-[10px] font-black text-text-primary outline-none focus:border-green transition-all"
            />
          </div>
        </div>
        <div className="table-wrap overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-4 py-5">Case ID</th>
                <th className="px-4 py-5">Bank Details</th>
                <th className="px-4 py-5">Amount</th>
                <th className="px-4 py-5">History</th>
                <th className="px-4 py-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <div className="p-6 bg-bg-input rounded-full">
                        <CheckCircle size={48} className="text-text-muted" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                        No {activeTab} payouts recorded
                      </span>
                    </div>
                  </td>
                </tr>
              ) : groupRefundsByCase(filteredRefunds).map(g => {
                const isExpanded = !!expandedCases[g.caseId];
                if (g.requests.length === 1) {
                  const r = g.requests[0];
                  return (
                    <tr key={r._id} className="hover:bg-bg-input/40 transition-all bg-bg-card font-bold">
                      <td className="px-4 py-5 align-top flex flex-col items-start gap-2">
                        <span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-accent-soft">
                          {g.caseId}
                        </span>
                        {g.companyName && (
                          <div className="text-[10px] text-text-secondary font-black tracking-wide uppercase bg-bg-input/60 px-2.5 py-1 rounded-xl border border-border inline-block shadow-sm">
                            🏢 {g.companyName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="font-black text-text-primary mb-1 uppercase text-xs tracking-tight">{r.bankName}</div>
                        <div className="text-text-muted font-bold">A/C: <span className="text-text-secondary">{r.accNum}</span> ({r.accType})</div>
                        <div className="text-text-muted font-bold">IFSC: <span className="text-text-secondary">{r.ifsc}</span></div>
                        <div className="text-text-muted font-bold">Holder: <span className="text-text-secondary uppercase">{r.accHolder}</span></div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="text-base font-black text-green tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</div>
                        <div className="text-[9px] font-black uppercase text-accent mt-2 tracking-wider">
                          {r.installments && r.installments.length > 0
                            ? `${r.installments.filter(i => i.status === 'Paid').length} of ${r.installments.length} PAID`
                            : 'Single Payout'}
                        </div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="text-text-primary font-bold mb-1">Req: <span className="text-text-secondary font-medium">{r.requestedByName || r.requestedBy}</span></div>
                        <div className="text-text-primary font-bold mb-2">Appr: <span className="text-text-secondary font-medium">{r.approvedBy}</span></div>
                        <div className="text-[10px] text-text-muted leading-relaxed italic border-l-2 border-border pl-3">"{r.summary}"</div>
                      </td>
                      <td className="px-4 py-5 align-top text-right">
                        <button
                          className="bg-accent hover:bg-accent-hover text-white font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md shadow-orange-950/20 active:scale-95 whitespace-nowrap"
                          onClick={() => {
                            setSelectedRefund(r);
                            setSelectedInstIndex(null);
                            setModalOpen(true);
                          }}
                        >
                          {activeTab === 'pending' ? 'Manage Payouts 💰' : 'View Details 👁️'}
                        </button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <React.Fragment key={g.caseId}>
                    {/* Parent Case Row */}
                    <tr
                      onClick={() => toggleCaseExpand(g.caseId)}
                      className="hover:bg-bg-input/40 cursor-pointer transition-all bg-bg-card font-bold"
                    >
                      <td className="px-4 py-5 align-top flex flex-col items-start gap-2">
                        <span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-accent-soft">
                          <span className="mr-1">{isExpanded ? '▼' : '▶'}</span> {g.caseId}
                        </span>
                        {g.companyName && (
                          <div className="text-[10px] text-text-secondary font-black tracking-wide uppercase bg-bg-input/60 px-2.5 py-1 rounded-xl border border-border inline-block shadow-sm">
                            🏢 {g.companyName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-5 align-top" colSpan="1">
                        <div className="text-text-muted font-bold">
                          {g.requests.length} pending requests grouped for payout
                        </div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="text-lg font-black text-green tracking-tight">₹{Number(g.totalAmount).toLocaleString('en-IN')}</div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="text-[9px] text-text-muted font-bold mt-1">Click to expand & pay individual requests</div>
                      </td>
                      <td className="px-4 py-5 align-top text-right">
                        <span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                          {isExpanded ? 'Hide Details' : 'Show Requests'}
                        </span>
                      </td>
                    </tr>
                    {/* Expanded child request rows */}
                    {isExpanded && g.requests.map((r, idx) => (
                      <tr key={r._id} className="bg-bg-input/20 hover:bg-bg-input/35 transition-all border-l-4 border-accent">
                        <td className="px-4 py-5 align-top pl-8">
                          <div className="font-black text-text-muted">Request #{idx + 1}</div>
                        </td>
                        <td className="px-4 py-5 align-top">
                          <div className="font-black text-text-primary mb-1 uppercase text-xs tracking-tight">{r.bankName}</div>
                          <div className="text-text-muted font-bold">A/C: <span className="text-text-secondary">{r.accNum}</span> ({r.accType})</div>
                          <div className="text-text-muted font-bold">IFSC: <span className="text-text-secondary">{r.ifsc}</span></div>
                          <div className="text-text-muted font-bold">Holder: <span className="text-text-secondary uppercase">{r.accHolder}</span></div>
                        </td>
                        <td className="px-4 py-5 align-top">
                          <div className="text-base font-black text-green tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</div>
                          <div className="text-[9px] font-black uppercase text-accent mt-2 tracking-wider">
                            {r.installments && r.installments.length > 0
                              ? `${r.installments.filter(i => i.status === 'Paid').length} of ${r.installments.length} PAID`
                              : 'Single Payout'}
                          </div>
                        </td>
                        <td className="px-4 py-5 align-top">
                          <div className="text-text-primary font-bold mb-1">Req: <span className="text-text-secondary font-medium">{r.requestedByName || r.requestedBy}</span></div>
                          <div className="text-text-primary font-bold mb-2">Appr: <span className="text-text-secondary font-medium">{r.approvedBy}</span></div>
                          <div className="text-[10px] text-text-muted leading-relaxed italic border-l-2 border-border pl-3">"{r.summary}"</div>
                        </td>
                        <td className="px-4 py-5 align-top text-right">
                          <button
                            className="bg-accent hover:bg-accent-hover text-white font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md shadow-orange-950/20 active:scale-95 whitespace-nowrap"
                            onClick={() => {
                              setSelectedRefund(r);
                              setSelectedInstIndex(null);
                              setModalOpen(true);
                            }}
                          >
                            {activeTab === 'pending' ? 'Manage Payouts 💰' : 'View Details 👁️'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setModalOpen(false); setSelectedInstIndex(null); setIsEditMode(false); }} title="Payout Details">
        <div className="p-4 flex flex-col gap-6">
          {selectedRefund && (
            <>
              <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm flex flex-col gap-1 mb-2">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">Case ID</p>
                <p className="font-black text-accent text-sm tracking-tighter uppercase mb-1">{selectedRefund.caseId}</p>
                {selectedRefund.companyName && (
                  <div className="text-[10px] text-text-secondary font-black tracking-wide uppercase bg-bg-card px-2.5 py-1 rounded-xl border border-border inline-block self-start shadow-sm mt-1">
                    🏢 {selectedRefund.companyName}
                  </div>
                )}
              </div>
              {selectedInstIndex === null ? (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">

                  {/* Document Link */}
                  {selectedRefund.documentLink && (
                    <div className="bg-bg-input p-4 rounded-2xl border border-border flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-0.5">Supporting Document / Proof</p>
                        <p className="text-[10px] text-text-secondary font-bold">Submitted by requester — click to view</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewFileUrl(selectedRefund.documentLink);
                          setPreviewFileName('Supporting Document');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-accent-hover transition-all active:scale-95 shadow-sm whitespace-nowrap"
                      >
                        <Eye size={13} /> View
                      </button>
                    </div>
                  )}

                  <div className="bg-bg-secondary rounded-2xl border-2 border-border overflow-hidden">
                    <div className="p-4 border-b border-border bg-bg-card font-black text-text-muted text-[9px] uppercase tracking-widest">
                      Payout Details
                    </div>
                    <div className="p-0">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-bg-input text-text-muted text-[8px] font-black uppercase tracking-widest border-b border-border">
                            <th className="px-4 py-3">Installments</th>
                            <th className="px-4 py-3">Due Date</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Documents</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-[10px] text-text-secondary divide-y divide-border/50">
                          {selectedRefund.installments && selectedRefund.installments.length > 0 ? (
                            selectedRefund.installments.map((inst, i) => {
                              const isInstPaid = inst.status?.toLowerCase() === 'paid' ||
                                selectedRefund.status?.toLowerCase() === 'paid' ||
                                (selectedRefund.installments.length <= 1 && (selectedRefund.status?.toLowerCase() === 'paid' || (selectedRefund.transactionId && selectedRefund.paymentProof)));
                              const proofUrl = inst.paymentProof || (isInstPaid ? selectedRefund.paymentProof : '');
                              const txId = inst.transactionId || (isInstPaid ? selectedRefund.transactionId : '');

                              return (
                                <tr key={i} className="hover:bg-bg-input/20 transition-colors">
                                  <td className="px-4 py-3 font-black text-accent uppercase tracking-tighter">Inst. #{i + 1}</td>
                                  <td className="px-4 py-3 font-bold">{inst.dueDate}</td>
                                  <td className="px-4 py-3 font-black text-green">₹{Number(inst.amount).toLocaleString('en-IN')}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isInstPaid ? 'bg-green-soft text-green' : inst.status === 'Due' ? 'bg-red-soft text-red' : 'bg-yellow-soft text-yellow'
                                      }`}>
                                      {isInstPaid ? 'Paid' : (inst.status || 'Pending')}
                                    </span>
                                    {isInstPaid && txId && (
                                      <div className="text-[9px] font-bold text-text-muted font-mono mt-1 select-all">
                                        UTR: {txId}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {proofUrl ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPreviewFileUrl(proofUrl);
                                          setPreviewFileName('Payment Proof');
                                        }}
                                        className="inline-flex items-center gap-1 text-accent text-[8px] font-black py-1 px-2.5 rounded-lg transition-all text-left"
                                      >
                                        <Eye size={10} /> View
                                      </button>
                                    ) : (
                                      <span className="text-[9px] text-text-muted font-bold">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {isInstPaid ? (
                                      <div className="flex flex-col items-end gap-1">
                                        <span className="text-[9px] font-bold text-text-muted">Settled ✅</span>
                                        {['Accountant', 'Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedInstIndex(i);
                                              setIsEditMode(true);
                                              setInstPaymentData({
                                                transactionId: inst.transactionId || selectedRefund.transactionId || '',
                                                paymentDate: inst.paymentDate || selectedRefund.paymentDate || new Date().toISOString().split('T')[0],
                                                paymentProof: inst.paymentProof || selectedRefund.paymentProof || ''
                                              });
                                            }}
                                            className="text-accent hover:text-accent-hover text-[8px] font-black uppercase tracking-wider underline cursor-pointer"
                                          >
                                            Edit Payout
                                          </button>
                                        )}
                                      </div>
                                    ) : selectedRefund.status?.toLowerCase() === 'rejected' ? (
                                      <span className="text-[9px] font-bold text-red-500">Rejected ❌</span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setSelectedInstIndex(i);
                                          setInstPaymentData({ transactionId: '', paymentDate: new Date().toISOString().split('T')[0], paymentProof: '' });
                                        }}
                                        className="bg-accent hover:bg-accent-hover text-white text-[8px] font-black py-1 px-3 rounded-lg shadow-sm uppercase tracking-widest transition-all active:scale-95"
                                      >
                                        Pay
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr className="hover:bg-bg-input/20 transition-colors">
                              <td className="px-4 py-4 font-black text-accent uppercase tracking-tighter">Single Payout</td>
                              <td className="px-4 py-4 font-bold">{selectedRefund.paymentDate || selectedRefund.timestamp ? new Date(selectedRefund.paymentDate || selectedRefund.timestamp).toLocaleDateString('en-IN') : '—'}</td>
                              <td className="px-4 py-4 font-black text-green">₹{Number(selectedRefund.amount).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${selectedRefund.status === 'Paid' ? 'bg-green-soft text-green' : 'bg-yellow-soft text-yellow'
                                  }`}>
                                  {selectedRefund.status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                {selectedRefund.paymentProof ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewFileUrl(selectedRefund.paymentProof);
                                      setPreviewFileName('Payment Proof');
                                    }}
                                    className="inline-flex items-center gap-1  text-accent hover:text-white text-[8px] font-black py-1 px-2.5 rounded-lg transition-all text-left"
                                  >
                                    <Eye size={10} /> View
                                  </button>
                                ) : (
                                  <span className="text-[9px] text-text-muted font-bold">—</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {selectedRefund.status === 'Paid' ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-[9px] font-bold text-text-muted">Settled ✅</span>
                                    {['Accountant', 'Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedInstIndex(-1);
                                          setIsEditMode(true);
                                          setInstPaymentData({
                                            transactionId: selectedRefund.transactionId || '',
                                            paymentDate: selectedRefund.paymentDate || new Date().toISOString().split('T')[0],
                                            paymentProof: selectedRefund.paymentProof || ''
                                          });
                                        }}
                                        className="text-accent hover:text-accent-hover text-[8px] font-black uppercase tracking-wider underline cursor-pointer"
                                      >
                                        Edit Payout
                                      </button>
                                    )}
                                  </div>
                                ) : selectedRefund.status === 'Rejected' ? (
                                  <span className="text-[9px] font-bold text-red-500">Rejected ❌</span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedInstIndex(-1);
                                      setInstPaymentData({ transactionId: '', paymentDate: new Date().toISOString().split('T')[0], paymentProof: '' });
                                    }}
                                    className="bg-accent hover:bg-accent-hover text-white text-[8px] font-black py-1 px-3 rounded-lg shadow-sm uppercase tracking-widest transition-all active:scale-95"
                                  >
                                    Pay Payout
                                  </button>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button className="flex-1 bg-bg-input hover:bg-bg-card-hover text-text-secondary border-2 border-border font-black py-3.5 rounded-2xl transition-all text-xs uppercase tracking-widest active:scale-95" onClick={() => setModalOpen(false)}>
                      Close Schedule
                    </button>
                  </div>
                </div>
              ) : (
                /* Installment Payout Form */
                <div className="flex flex-col gap-6 animate-in zoom-in-95 duration-200">
                  <div className="bg-bg-input p-4 rounded-2xl border border-border/80 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-0.5 font-bold">
                        {isEditMode ? 'Edit Target' : 'Settle Target'}
                      </p>
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-tight">
                        {selectedInstIndex === -1 ? 'Single Payout' : `Installment #${selectedInstIndex + 1}`}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-0.5">Amount</p>
                      <h4 className="text-sm font-black text-green tracking-tight">
                        ₹{Number(selectedInstIndex === -1 ? selectedRefund.amount : selectedRefund.installments[selectedInstIndex].amount).toLocaleString('en-IN')}
                      </h4>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 ml-1">Bank UTR / Transaction Hash</label>
                    <input
                      type="text"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm text-text-primary focus:border-accent outline-none font-bold placeholder:text-text-muted/30"
                      placeholder="Ex: 123456789012"
                      value={instPaymentData.transactionId}
                      onChange={e => setInstPaymentData({ ...instPaymentData, transactionId: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 ml-1">Payment Date</label>
                    <input
                      type="date"
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm text-text-primary focus:border-accent outline-none font-bold"
                      value={instPaymentData.paymentDate}
                      onChange={e => setInstPaymentData({ ...instPaymentData, paymentDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 ml-1">Attach Payment Screenshot / Proof</label>
                    <div className="p-1.5 bg-bg-input border-2 border-border rounded-2xl">
                      {instPaymentData.paymentProof ? (
                        <div className="flex justify-between items-center p-3.5 bg-green-soft text-green rounded-xl border border-green-soft animate-in zoom-in-95">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Screenshot Attached</span>
                          </div>
                          <button
                            onClick={() => setInstPaymentData({ ...instPaymentData, paymentProof: '' })}
                            className="text-[9px] text-red font-black uppercase tracking-widest hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <FileUpload
                          onUploadSuccess={(url) => setInstPaymentData({ ...instPaymentData, paymentProof: url })}
                          label="Attach Screenshot"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-2">
                    <button
                      className="flex-1 bg-green hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-900/20 transition-all text-xs uppercase tracking-widest active:scale-95"
                      onClick={isEditMode ? handleSaveEditPayout : (selectedInstIndex === -1 ? handleMarkPaid : handlePayInstallment)}
                    >
                      {isEditMode ? 'Save Changes 💾' : 'Submit Payment✅'}
                    </button>
                    <button
                      className="flex-1 bg-bg-input hover:bg-bg-card-hover text-text-secondary border-2 border-border font-black py-4 rounded-2xl transition-all text-xs uppercase tracking-widest active:scale-95"
                      onClick={() => { setSelectedInstIndex(null); setIsEditMode(false); setInstPaymentData({ transactionId: '', paymentDate: '', paymentProof: '' }); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="Confirmation Successful">
        <div className="text-center py-10 px-6">
          <div className="w-24 h-24 bg-green-soft text-green rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner border-2 border-green-soft">
            <CheckCircle size={56} />
          </div>
          <h3 className="text-2xl font-black text-text-primary tracking-tight mb-3">Settlement Processed!</h3>
          <p className="text-sm text-text-muted font-medium mb-8">Outbound refund record has been finalized in the core ledger.</p>

          <div className="bg-bg-input p-6 rounded-[2rem] border-2 border-border inline-block min-w-[300px]">
            <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mb-3">Verification ID / UTR</p>
            <p className="text-xl font-mono font-black text-accent select-all tracking-wider uppercase">{lastUTR}</p>
          </div>

          <div className="mt-10">
            <button className="bg-accent hover:bg-accent-hover text-white font-black py-4 px-16 rounded-2xl shadow-xl shadow-orange-900/20 transition-all text-xs uppercase tracking-[0.2em] active:scale-95" onClick={() => setIsSuccessModalOpen(false)}>
              Acknowledge & Close
            </button>
          </div>
        </div>
      </Modal>

      <FilePreviewModal
        isOpen={!!previewFileUrl}
        onClose={() => setPreviewFileUrl(null)}
        fileUrl={previewFileUrl}
        fileName={previewFileName}
      />
    </div>
  );
};

export default AccountantDashTab;
