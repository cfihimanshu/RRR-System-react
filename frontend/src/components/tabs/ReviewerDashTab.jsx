import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';

const ReviewerDashTab = () => {
  const [refunds, setRefunds] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [remark, setRemark] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchRefunds = async () => {
    try {
      const res = await api.get('/refunds?status=Pending Review');
      setRefunds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.put(`/refunds/${id}`, {
        status: 'Pending Admin Approval',
        approvedBy: user.email,
        approvedAt: new Date().toISOString()
      });
      toast.success('Refund approved');
      fetchRefunds();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!remark) return toast.error('Remark is required to reject');
    try {
      await api.put(`/refunds/${selectedRefund._id}`, {
        status: 'Rejected',
        reviewerRemark: remark,
        reviewedBy: user.email
      });
      toast.success('Refund rejected');
      setModalOpen(false);
      setRemark('');
      fetchRefunds();
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  return (
    <div className="section active w-full h-full bg-bg-primary p-4 md:p-8 overflow-y-auto">
      <div className="section-header flex justify-between items-center mb-8">
        <div className="w-full">
          <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">Reviewer Dashboard</h2>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-2xl shadow-sm border-2 border-border overflow-hidden mb-10">
        <div className="p-6 border-b border-border bg-bg-card flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-soft rounded-2xl flex items-center justify-center text-yellow">
            <span className="font-black text-lg">⚖️</span>
          </div>
          <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Pending for Review</h3>
        </div>

        <div className="table-wrap overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-6 py-5">Case Id</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Bank Details</th>
                <th className="px-6 py-5">Holder Details</th>
                <th className="px-6 py-5 min-w-[200px]">Summary</th>
                <th className="px-6 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {refunds.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <div className="p-6 bg-bg-input rounded-full">
                        <span className="text-4xl">💎</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Review Queue Exhausted</span>
                    </div>
                  </td>
                </tr>
              ) : refunds.map(r => (
                <tr
                  key={r._id}
                  className="hover:bg-bg-input/30 transition-all group cursor-pointer"
                  onClick={() => { setSelectedRefund(r); setIsDetailOpen(true); }}
                >
                  <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate('/case-master', { state: { searchId: r.caseId } })}
                      className="bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-soft hover:bg-accent hover:text-white transition-all shadow-sm"
                    >
                      {r.caseId}
                    </button>
                  </td>
                  <td className="px-6 py-5 font-black text-green text-sm tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-5">
                    <div className="font-black text-text-primary uppercase tracking-tight">{r.bankName}</div>
                    <div className="text-[9px] text-text-muted font-bold mt-1">IFSC: <span className="text-accent">{r.ifsc}</span></div>
                    <div className="text-[9px] text-text-muted font-bold italic">{r.branch}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-black text-text-primary uppercase tracking-tight">{r.accHolder}</div>
                    <div className="text-[9px] text-text-muted font-bold font-mono mt-1">{r.accNum}</div>
                    <div className="text-[9px] text-accent font-black uppercase tracking-widest mt-1 opacity-50">{r.accType}</div>
                  </td>
                  <td className="px-6 py-5 text-text-muted leading-relaxed font-medium italic max-w-xs line-clamp-2">"{r.summary}"</td>
                  <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center gap-3">
                      <button className="bg-green hover:bg-green-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-sm uppercase tracking-widest transition-all active:scale-95" onClick={() => handleApprove(r._id)}>Approve</button>
                      <button className="bg-red hover:bg-red-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-sm uppercase tracking-widest transition-all active:scale-95" onClick={() => { setSelectedRefund(r); setModalOpen(true); }}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Rejection of Refund">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 ml-1">Reason for Rejection</label>
            <textarea
              className="w-full bg-bg-input border-2 border-border rounded-2xl px-6 py-4 text-sm text-text-primary focus:border-red focus:ring-4 focus:ring-red-soft outline-none transition-all font-medium min-h-[150px] resize-none"
              placeholder="Detail the specific regulatory or policy breach justifying rejection..."
              value={remark}
              onChange={e => setRemark(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-4">
            <button className="flex-1 bg-red hover:bg-red-600 text-white font-black py-4 rounded-2xl shadow-sm transition-all text-xs uppercase tracking-widest active:scale-95" onClick={handleReject}>CONFIRM REJECTION</button>
            <button className="flex-1 bg-bg-input hover:bg-bg-card-hover text-text-secondary font-black py-4 rounded-2xl border-2 border-border transition-all text-xs uppercase tracking-widest active:scale-95" onClick={() => setModalOpen(false)}>cancel</button>
          </div>
        </div>
      </Modal>

      {/* Detail View Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Refund Details">
        {selectedRefund && (
          <div className="p-6 flex flex-col gap-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-bg-input p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Protocol ID</p>
                <p className="font-black text-accent text-sm tracking-tighter uppercase">{selectedRefund.caseId}</p>
              </div>
              <div className="bg-bg-input p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Payment Volume</p>
                <p className="font-black text-green text-sm tracking-tight">₹{Number(selectedRefund.amount).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-bg-input p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Initiated By</p>
                <p className="text-text-primary font-black uppercase text-[10px] tracking-widest break-all">
                  {selectedRefund.requestedByName || selectedRefund.requestedBy}
                </p>
              </div>
              <div className="bg-bg-input p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Lifecycle Stage</p>
                <p className="font-black text-orange-400 uppercase text-[10px] tracking-widest">{selectedRefund.status}</p>
              </div>
            </div>

            <div className="bg-bg-secondary rounded-2xl border-2 border-border overflow-hidden shadow-sm">
              <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                Verified Bank Configuration
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Target Institution</p>
                  <p className="font-black text-text-primary uppercase tracking-tight">{selectedRefund.bankName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Identified Holder</p>
                  <p className="font-black text-text-primary uppercase tracking-tight">{selectedRefund.accHolder}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Ledger Number</p>
                  <p className="font-mono font-black text-accent select-all">{selectedRefund.accNum}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Routing Code (IFSC)</p>
                  <p className="font-mono font-black text-accent select-all">{selectedRefund.ifsc}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Categorization</p>
                  <p className="text-text-secondary font-bold uppercase text-[10px]">{selectedRefund.accType}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Operational Branch</p>
                  <p className="text-text-secondary font-bold uppercase text-[10px]">{selectedRefund.branch}</p>
                </div>
              </div>
            </div>

            {selectedRefund.installments && selectedRefund.installments.length > 0 ? (
              <div className="bg-bg-secondary rounded-2xl border-2 border-border overflow-hidden shadow-sm">
                <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                  Refund Installments
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-input text-text-muted text-[9px] font-black uppercase tracking-widest border-b border-border">
                        <th className="px-6 py-4">Serial</th>
                        <th className="px-6 py-4">Expected Date</th>
                        <th className="px-6 py-4">Disbursement Amount</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] text-text-secondary divide-y divide-border/50">
                      {selectedRefund.installments.map((inst, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 font-black">#{i + 1}</td>
                          <td className="px-6 py-4 font-bold">{inst.dueDate}</td>
                          <td className="px-6 py-4 font-black text-green">₹{Number(inst.amount).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 font-black uppercase tracking-widest text-[9px] opacity-60">{inst.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-bg-input p-6 rounded-2xl border-2 border-dashed border-border text-center">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">No installments scheduled (Single Payment)</p>
              </div>
            )}

            <div className="bg-bg-input p-6 rounded-2xl border border-border shadow-inner">
              <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3 ml-2">Justification Narrative</p>
              <p className="text-sm text-text-secondary leading-relaxed italic border-l-4 border-accent pl-5">
                "{selectedRefund.summary}"
              </p>
            </div>

            <div className="flex gap-4 justify-end mt-4">
              <button
                className="bg-bg-input hover:bg-bg-card-hover text-text-secondary font-black py-4 px-10 rounded-2xl border-2 border-border transition-all text-xs uppercase tracking-widest active:scale-95"
                onClick={() => setIsDetailOpen(false)}
              >
                Exit Audit
              </button>
              <button
                className="bg-red hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl shadow-sm transition-all text-xs uppercase tracking-widest active:scale-95"
                onClick={() => { setIsDetailOpen(false); setModalOpen(true); }}
              >
                Cancel Request
              </button>
              <button
                className="bg-green hover:bg-green-600 text-white font-black py-4 px-10 rounded-2xl shadow-sm transition-all text-xs uppercase tracking-widest active:scale-95"
                onClick={() => { setIsDetailOpen(false); handleApprove(selectedRefund._id); }}
              >
                Make Payment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewerDashTab;
