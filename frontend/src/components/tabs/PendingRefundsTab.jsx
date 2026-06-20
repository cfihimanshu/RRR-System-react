import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { AuthContext } from '../../context/AuthContext';
import { Eye, IndianRupee } from 'lucide-react';

const PendingRefundsTab = () => {
  const { user } = useContext(AuthContext);
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [allRefunds, setAllRefunds] = useState([]);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedCases, setExpandedCases] = useState({});
  const [expandedInstallments, setExpandedInstallments] = useState({});

  const toggleCaseExpand = (caseId) => setExpandedCases(prev => ({ ...prev, [caseId]: !prev[caseId] }));
  const toggleInstallmentExpand = (refundId, index) => {
    const key = `${refundId}_${index}`;
    setExpandedInstallments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredAllRefunds = React.useMemo(() =>
    allRefunds.filter(r => ['Pending Admin Approval', 'Pending Payment', 'Paid'].includes(r.status)),
    [allRefunds]);

  const groupRefundsByCase = (list) => {
    const groups = {};
    list.forEach(r => {
      if (!groups[r.caseId]) groups[r.caseId] = { caseId: r.caseId, companyName: r.companyName || '', requests: [], totalAmount: 0 };
      groups[r.caseId].requests.push(r);
      groups[r.caseId].totalAmount += Number(r.amount) || 0;
    });
    return Object.values(groups);
  };

  const fetchPendingRefunds = async () => {
    try {
      const res = await api.get('/refunds?status=Pending Admin Approval');
      const parsedData = (res.data || []).map(r => {
        let insts = r.installments;
        if (typeof insts === 'string') {
          try { insts = JSON.parse(insts); } catch (e) { insts = []; }
        }
        return {
          ...r,
          installments: Array.isArray(insts) ? insts : []
        };
      });
      setPendingRefunds(parsedData);
    }
    catch (err) { console.error('Failed to fetch refunds', err); }
  };

  const fetchAllRefunds = async () => {
    try {
      const res = await api.get('/refunds');
      const parsedData = (res.data || []).map(r => {
        let insts = r.installments;
        if (typeof insts === 'string') {
          try { insts = JSON.parse(insts); } catch (e) { insts = []; }
        }
        return {
          ...r,
          installments: Array.isArray(insts) ? insts : []
        };
      });
      setAllRefunds(parsedData);
    }
    catch (err) { console.error('Failed to fetch all refunds', err); }
  };

  const handleApproveRefund = async (id) => {
    try {
      await api.put(`/refunds/${id}`, { status: 'Pending Payment', approvedBy: user.email, approvedAt: new Date().toISOString() });
      toast.success('Refund Approved & Sent to Accountant');
      fetchPendingRefunds();
    } catch (err) { toast.error('Approval failed'); }
  };

  const handleRejectRefund = async (id) => {
    const remark = prompt("Enter rejection reason:");
    if (!remark) return;
    try {
      await api.put(`/refunds/${id}`, { status: 'Rejected', reviewerRemark: remark, reviewedBy: user.email });
      toast.success('Refund Rejected');
      fetchPendingRefunds();
    } catch (err) { toast.error('Rejection failed'); }
  };

  useEffect(() => { fetchPendingRefunds(); fetchAllRefunds(); }, []);

  return (
    <div className="h-full bg-bg-primary p-4 md:p-8 overflow-y-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-accent-soft rounded-2xl flex items-center justify-center text-accent">
          <IndianRupee size={22} />
        </div>
        <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">Pending Refunds</h1>
      </div>

      {/* Pending Refunds Table */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border mb-10 max-w-full overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-accent-soft rounded-2xl flex items-center justify-center text-accent">
            <span className="font-black text-lg">💰</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Pending Refunds</h2>
        </div>
        <div className="overflow-y-auto max-h-[350px] scrollbar-thin border-b border-border">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-bg-card shadow-sm">
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-4 py-5 whitespace-nowrap">Submission Date</th>
                <th className="px-4 py-5 whitespace-nowrap">Case Link</th>
                <th className="px-4 py-5 text-center">Amount Requested</th>
                <th className="px-4 py-5">Assign To</th>
                <th className="px-4 py-5 text-center">Final Decision</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {pendingRefunds.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30">
                    <div className="p-6 bg-bg-input rounded-full"><span className="text-4xl">💎</span></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Authorization Queue Clear</span>
                  </div>
                </td></tr>
              ) : (
                groupRefundsByCase(pendingRefunds).map(g => {
                  const isExpanded = !!expandedCases[g.caseId];
                  if (g.requests.length === 1) {
                    const r = g.requests[0];
                    return (
                      <tr key={r._id} onClick={() => { setSelectedRefund(r); setIsDetailOpen(true); }} className="hover:bg-bg-input/40 cursor-pointer transition-all bg-bg-card font-bold select-none">
                        <td className="px-4 py-5 text-text-muted font-bold">{r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col items-start gap-1">
                            <span className="bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-soft">{g.caseId}</span>
                            {g.companyName && <span className="text-[10px] text-text-muted font-bold ml-1">{g.companyName}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="text-lg font-black text-green tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</span>
                          <div className="text-[9px] text-text-muted font-bold mt-1 uppercase tracking-wider">{r.installments?.length > 0 ? `${r.installments.length} Installment${r.installments.length > 1 ? 's' : ''}` : '1 Installment'}</div>
                        </td>
                        <td className="px-4 py-5 font-black text-text-primary uppercase text-[10px] tracking-wider">{r.requestedByName || r.requestedBy}</td>
                        <td className="px-4 py-5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-center gap-3">
                            <button onClick={() => handleApproveRefund(r._id)} className="bg-green hover:bg-green-600 text-white text-[9px] font-black py-2 px-5 rounded-xl uppercase tracking-widest transition-all active:scale-95">Approve</button>
                            <button onClick={() => handleRejectRefund(r._id)} className="bg-red hover:bg-red-600 text-white text-[9px] font-black py-2 px-5 rounded-xl uppercase tracking-widest transition-all active:scale-95">Reject</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <React.Fragment key={g.caseId}>
                      <tr onClick={() => toggleCaseExpand(g.caseId)} className="hover:bg-bg-input/40 cursor-pointer transition-all bg-bg-card font-bold select-none">
                        <td className="px-4 py-5 text-text-muted font-bold"><span className="inline-flex items-center gap-2"><span className="text-[12px] font-black text-accent">{isExpanded ? '▼' : '▶'}</span>Group ({g.requests.length})</span></td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col items-start gap-1">
                            <span className="bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-soft">{g.caseId}</span>
                            {g.companyName && <span className="text-[10px] text-text-muted font-bold ml-1">{g.companyName}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center"><span className="text-lg font-black text-green tracking-tight">₹{Number(g.totalAmount).toLocaleString('en-IN')}</span></td>
                        <td className="px-4 py-5 font-black text-text-primary uppercase text-[10px] tracking-wider">{g.requests.length === 1 ? (g.requests[0].requestedByName || g.requests[0].requestedBy) : 'Multiple Requesters'}</td>
                        <td className="px-4 py-5 text-center"><span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{isExpanded ? 'Hide Details' : 'Show Requests'}</span></td>
                      </tr>
                      {isExpanded && g.requests.map((r, idx) => (
                        <tr key={r._id} onClick={() => { setSelectedRefund(r); setIsDetailOpen(true); }} className="bg-bg-input/20 hover:bg-bg-input/35 cursor-pointer transition-all border-l-4 border-accent">
                          <td className="px-4 py-5 text-text-muted font-bold italic pl-8">Request #{idx + 1} — {new Date(r.timestamp).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-5" onClick={e => e.stopPropagation()}><button onClick={e => { e.stopPropagation(); setSelectedRefund(r); setIsDetailOpen(true); }} className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-accent-soft hover:bg-accent hover:text-white transition-all">View Details 🔍</button></td>
                          <td className="px-4 py-5 text-center"><span className="text-base font-black text-green tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</span></td>
                          <td className="px-4 py-5 font-black text-text-secondary uppercase text-[10px] tracking-wider">{r.requestedByName || r.requestedBy}</td>
                          <td className="px-4 py-5 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-center gap-3">
                              <button onClick={() => handleApproveRefund(r._id)} className="bg-green hover:bg-green-600 text-white text-[9px] font-black py-2 px-5 rounded-xl uppercase tracking-widest transition-all active:scale-95">Approve</button>
                              <button onClick={() => handleRejectRefund(r._id)} className="bg-red hover:bg-red-600 text-white text-[9px] font-black py-2 px-5 rounded-xl uppercase tracking-widest transition-all active:scale-95">Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Refund Request" size="lg">
        {selectedRefund && (() => {
          const r = allRefunds.find(x => x._id === selectedRefund._id) || pendingRefunds.find(x => x._id === selectedRefund._id) || selectedRefund;
          const totalAmount = Number(r.amount) || 0;
          const isSinglePaidFallback = r.transactionId && (r.installments || []).length === 1;
          const paidAmount = r.status === 'Paid' || isSinglePaidFallback ? totalAmount : (r.installments || []).reduce((sum, inst) => inst.status === 'Paid' ? sum + (Number(inst.amount) || 0) : sum, 0);
          const leftAmount = Math.max(0, totalAmount - paidAmount);
          return (
            <div className="p-6 flex flex-col gap-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm"><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Case Id</p><p className="font-black text-accent text-sm tracking-tighter uppercase">{r.caseId}</p></div>
                <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm"><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Amount</p><p className="font-black text-green text-sm tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</p></div>
                <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm"><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Requested by</p><p className="text-text-primary font-black uppercase text-[10px] tracking-wider">{r.requestedByName || r.requestedBy}</p></div>
                <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm"><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Status</p><p className="font-black text-orange-400 uppercase text-[10px] tracking-widest">{r.status === 'Paid' || isSinglePaidFallback ? 'Paid' : r.status}</p></div>
              </div>
              <div className="bg-bg-secondary rounded-[2rem] border-2 border-border overflow-hidden shadow-sm">
                <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">Bank Details</div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
                  <div><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Bank Name</p><p className="font-black text-text-primary uppercase tracking-tight">{r.bankName}</p></div>
                  <div><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Account holder name</p><p className="font-black text-text-primary uppercase tracking-tight">{r.accHolder}</p></div>
                  <div><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Acc Number</p><p className="font-mono font-black text-accent select-all">{r.accNum}</p></div>
                  <div><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">IFSC Code</p><p className="font-mono font-black text-accent select-all">{r.ifsc}</p></div>
                  <div><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Account type</p><p className="text-text-secondary font-bold uppercase text-[10px]">{r.accType}</p></div>
                  <div><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Branch</p><p className="text-text-secondary font-bold uppercase text-[10px]">{r.branch}</p></div>
                </div>
              </div>
              <div className="bg-bg-input p-6 rounded-[2.5rem] border border-border shadow-inner"><p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3 ml-2">Summary</p><p className="text-sm text-text-secondary leading-relaxed italic border-l-4 border-accent pl-5">"{r.summary}"</p></div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default PendingRefundsTab;
