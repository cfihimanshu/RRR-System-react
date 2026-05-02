import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import FileUpload from '../shared/FileUpload';
import { AuthContext } from '../../context/AuthContext';
import { Image, CheckCircle, UploadCloud } from 'lucide-react';

const AccountantDashTab = () => {
  const [refunds, setRefunds] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [paymentData, setPaymentData] = useState({ transactionId: '', paymentDate: '', paymentProof: '' });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastUTR, setLastUTR] = useState('');
  const { user } = useContext(AuthContext);

  const fetchRefunds = async () => {
    try {
      const res = await api.get('/refunds?status=Pending Payment');
      setRefunds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleMarkPaid = async () => {
    if (!paymentData.transactionId || !paymentData.paymentDate || !paymentData.paymentProof) {
      return toast.error('Please fill all details and upload payment proof');
    }
    try {
      await api.put(`/refunds/${selectedRefund._id}`, {
        status: 'Paid',
        transactionId: paymentData.transactionId,
        paymentDate: paymentData.paymentDate,
        paymentProof: paymentData.paymentProof,
        paidBy: user.email
      });
      setLastUTR(paymentData.transactionId);
      setModalOpen(false);
      setIsSuccessModalOpen(true);
      setPaymentData({ transactionId: '', paymentDate: '', paymentProof: '' });
      fetchRefunds();
    } catch (err) {
      toast.error('Failed to mark as paid');
    }
  };

  return (
    <div className="section active w-full pb-10 px-6 bg-bg-primary">
      <div className="section-header flex justify-between items-center mb-8 pt-4">
        <div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">Accountant Dashboard</h2>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border overflow-hidden mb-8">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-1.5 h-6 bg-green rounded-full" />
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Payments </h3>
        </div>
        <div className="table-wrap overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-4 py-5">Case ID</th>
                <th className="px-4 py-5">Beneficiary Details</th>
                <th className="px-4 py-5">Payout Amount</th>
                <th className="px-4 py-5">Audit History</th>
                <th className="px-4 py-5">Final Execution</th>
                <th className="px-4 py-5">Verification Doc</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {refunds.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <div className="p-6 bg-bg-input rounded-full">
                        <CheckCircle size={48} className="text-text-muted" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">No pending payouts recorded</span>
                    </div>
                  </td>
                </tr>
              ) : refunds.map(r => (
                <tr key={r._id} className="hover:bg-bg-input/30 transition-all group">
                  <td className="px-4 py-5 align-top">
                    <span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-accent-soft">
                      {r.caseId}
                    </span>
                  </td>
                  <td className="px-4 py-5 align-top">
                    <div className="font-black text-text-primary mb-1 uppercase text-xs tracking-tight">{r.bankName}</div>
                    <div className="text-text-muted font-bold">A/C: <span className="text-text-secondary">{r.accNum}</span> ({r.accType})</div>
                    <div className="text-text-muted font-bold">IFSC: <span className="text-text-secondary">{r.ifsc}</span></div>
                    <div className="text-text-muted font-bold">Holder: <span className="text-text-secondary uppercase">{r.accHolder}</span></div>
                  </td>
                  <td className="px-4 py-5 align-top">
                    <div className="text-lg font-black text-green tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</div>
                  </td>
                  <td className="px-4 py-5 align-top">
                    <div className="text-text-primary font-bold mb-1">Req: <span className="text-text-secondary font-medium">{r.requestedByName || r.requestedBy}</span></div>
                    <div className="text-text-primary font-bold mb-2">Appr: <span className="text-text-secondary font-medium">{r.approvedBy}</span></div>
                    <div className="text-[10px] text-text-muted leading-relaxed italic border-l-2 border-border pl-3">"{r.summary}"</div>
                  </td>
                  <td className="px-4 py-5 align-top">
                    <button
                      className={`font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95 whitespace-nowrap ${paymentData.paymentProof ? 'bg-green text-white shadow-lg shadow-green-900/20' : 'bg-bg-input text-text-muted/40 cursor-not-allowed border border-border'}`}
                      onClick={() => {
                        if (!paymentData.paymentProof) return toast.error('Please upload proof first');
                        setSelectedRefund(r);
                        setModalOpen(true);
                      }}
                    >
                      Process Payment
                    </button>
                  </td>
                  <td className="px-4 py-5 align-top">
                    <div className="flex flex-col items-center gap-3">
                      {paymentData.paymentProof ? (
                        <div className="flex flex-col items-center gap-2 animate-in zoom-in-95">
                          <div className="p-3 bg-green-soft rounded-2xl text-green border border-green-soft shadow-sm">
                            <CheckCircle size={24} />
                          </div>
                          <button
                            onClick={() => setPaymentData({ ...paymentData, paymentProof: '' })}
                            className="text-[9px] text-red font-black uppercase tracking-[0.2em] hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-full min-w-[140px]">
                          <FileUpload
                            onUploadSuccess={(url) => setPaymentData({ ...paymentData, paymentProof: url })}
                            label="Attach Screenshot"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Execution Details">
        <div className="p-4 flex flex-col gap-6">
          {selectedRefund && selectedRefund.installments && selectedRefund.installments.length > 0 && (
            <div className="bg-bg-secondary rounded-2xl border-2 border-border overflow-hidden mb-2">
              <div className="p-4 border-b border-border bg-bg-card font-black text-text-muted text-[9px] uppercase tracking-widest">
                Authorized Payout Schedule
              </div>
              <div className="p-0">
                <table className="w-full text-left border-collapse">
                  <tbody className="text-[10px] text-text-secondary divide-y divide-border/50">
                    {selectedRefund.installments.map((inst, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-black text-accent uppercase tracking-tighter">Inst. #{i + 1}</td>
                        <td className="px-4 py-3 font-bold">{inst.dueDate}</td>
                        <td className="px-4 py-3 font-black text-green">₹{Number(inst.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 ml-1">Bank UTR / Transaction Hash</label>
            <input
              type="text"
              className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm text-text-primary focus:border-accent outline-none font-bold placeholder:text-text-muted/30"
              placeholder="Ex: 123456789012"
              value={paymentData.transactionId}
              onChange={e => setPaymentData({ ...paymentData, transactionId: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 ml-1">Dispatch Date</label>
            <input
              type="date"
              className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm text-text-primary focus:border-accent outline-none font-bold"
              value={paymentData.paymentDate}
              onChange={e => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button className="flex-1 bg-green hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-900/20 transition-all text-xs uppercase tracking-widest active:scale-95" onClick={handleMarkPaid}>
              Confirm Settlement
            </button>
            <button className="flex-1 bg-bg-input hover:bg-bg-card-hover text-text-secondary border-2 border-border font-black py-4 rounded-2xl transition-all text-xs uppercase tracking-widest active:scale-95" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
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
    </div>
  );
};

export default AccountantDashTab;
