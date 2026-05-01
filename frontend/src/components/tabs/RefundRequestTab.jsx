import React, { useEffect, useState, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import {
  IndianRupee,
  CheckCircle,
  ClipboardList,
  Plus,
  Trash2,
  X
} from 'lucide-react';

const RefundRequestTab = () => {
  const [userCases, setUserCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState([]);
  const { user } = useContext(AuthContext);

  const fetchUserCases = async () => {
    try {
      const res = await api.get('/cases');
      // For Staff, filter by initiatedBy
      if (user?.role === 'Staff') {
        setUserCases(res.data.filter(c => c.initiatedBy === user.email));
      } else {
        setUserCases(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUserCases();
  }, [user]);

  const addInstallment = () => {
    setInstallments([...installments, { amount: '', dueDate: '', status: 'Pending' }]);
  };

  const removeInstallment = (index) => {
    const newInst = installments.filter((_, i) => i !== index);
    setInstallments(newInst);

    // Recalculate total from remaining installments
    const newTotal = newInst.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
    setTotalAmount(newTotal > 0 ? newTotal : '');
  };

  const handleInstallmentChange = (index, field, value) => {
    const newInst = [...installments];
    newInst[index][field] = value;
    setInstallments(newInst);

    // Auto-calculate total amount based on installments
    const newTotal = newInst.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
    setTotalAmount(newTotal > 0 ? newTotal : '');
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Filter out any empty installments before submitting
    const cleanedInstallments = installments.filter(inst => inst.amount && inst.dueDate);

    const payload = {
      caseId: selectedCaseId,
      amount: totalAmount,
      summary: formData.get('summary'),
      bankName: formData.get('bankName'),
      accHolder: formData.get('accHolder'),
      ifsc: formData.get('ifsc'),
      accNum: formData.get('accNum'),
      branch: formData.get('branch'),
      accType: formData.get('accType'),
      requestedByName: user?.fullName || "",
      installments: cleanedInstallments
    };

    console.log("Submitting Refund Payload:", payload);

    try {
      await api.post('/refunds', payload);
      toast.success('Refund request submitted successfully');
      e.target.reset();
      setSelectedCaseId('');
      setTotalAmount('');
      setInstallments([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    }
  };

  return (
    <div className="section active w-full pb-10 px-4 md:px-8 bg-bg-primary overflow-y-auto">
      <div className="section-header flex justify-between items-center mb-8 pt-4">
        <div className="w-full">
          <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">Submit Refund Request</h2>
        </div>
      </div>

      <div className="bg-bg-card border-2 border-border rounded-2xl p-4 sm:p-10 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-green-soft rounded-2xl border border-green-soft/30 text-green">
            <IndianRupee size={22} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">Submit Refund Request </h3>
        </div>
        <form onSubmit={handleRefundSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Case Id</label>
            <SearchableCaseSelect
              cases={userCases}
              value={selectedCaseId}
              onChange={setSelectedCaseId}
              required
              className="!bg-bg-input !border-border !rounded-2xl !py-4"
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Total Credit Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted font-black text-sm">₹</span>
              <input
                type="number"
                name="amount"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                readOnly={installments.length > 0}
                required
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                }}
                className={`w-full bg-bg-input border-2 border-border rounded-2xl pl-10 pr-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green focus:ring-4 focus:ring-green-soft transition-all shadow-inner ${installments.length > 0 ? 'opacity-70 cursor-not-allowed bg-bg-secondary' : ''}`}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 md:col-span-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2"> Summary / Reason</label>
            <textarea
              name="summary"
              required
              rows={4}
              placeholder="Provide comprehensive reasoning for the credit disbursement..."
              className="w-full bg-bg-input border-2 border-border rounded-xl p-6 text-sm font-medium text-text-primary outline-none focus:border-green focus:ring-4 focus:ring-green-soft transition-all shadow-inner resize-none italic placeholder:text-text-muted"
            ></textarea>
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Bank Name</label>
            <input type="text" name="bankName" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="e.g. HDFC BANK" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Holder</label>
            <input type="text" name="accHolder" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="FULL NAME" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">IFSC Code</label>
            <input type="text" name="ifsc" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-[0.2em] placeholder:text-text-muted" placeholder="HDFC0001234" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Number</label>
            <input type="text" name="accNum" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner tracking-[0.1em] placeholder:text-text-muted" placeholder="0000 0000 0000" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Branch Location</label>
            <input type="text" name="branch" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="CITY CENTER" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Type</label>
            <select name="accType" defaultValue="Savings" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest">
              <option value="Savings" className="bg-bg-secondary">Savings Account</option>
              <option value="Current" className="bg-bg-secondary">Current Account</option>
            </select>
          </div>

          {/* Installments Section */}
          <div className="md:col-span-3 pt-6 border-t border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-soft rounded-xl text-yellow border border-yellow-soft/30">
                  <ClipboardList size={18} />
                </div>
                <h4 className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">Planned Installments</h4>
              </div>
              <button
                type="button"
                onClick={addInstallment}
                className="w-full sm:w-auto bg-bg-input hover:bg-bg-card-hover text-text-primary border-2 border-border px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus size={14} /> Add Installment
              </button>
            </div>

            {installments.length === 0 ? (
              <div className="bg-bg-input/50 border-2 border-dashed border-border rounded-2xl py-8 text-center text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">
                No installments defined. Total amount will be processed as a single payout.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4">
                {installments.map((inst, idx) => (
                  <div key={idx} className="bg-bg-input border-2 border-border rounded-[2rem] p-6 relative group hover:border-accent-soft transition-all shadow-sm">
                    <button
                      type="button"
                      onClick={() => removeInstallment(idx)}
                      className="absolute top-4 right-4 p-2 text-text-muted hover:text-red transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-6 h-6 bg-bg-card rounded-lg flex items-center justify-center text-[10px] font-black text-accent border border-border">
                        #{idx + 1}
                      </div>
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Installment</span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 block ml-1">Amount (₹)</label>
                        <input
                          type="number"
                          value={inst.amount}
                          onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                          className="w-full bg-bg-card border-2 border-border rounded-xl px-4 py-3 text-sm font-black text-text-primary outline-none focus:border-accent transition-all"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 block ml-1">Due Date</label>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => handleInstallmentChange(idx, 'dueDate', e.target.value)}
                          className="w-full bg-bg-card border-2 border-border rounded-xl px-4 py-3 text-sm font-black text-text-primary outline-none focus:border-accent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-5 mt-6 pt-8 border-t-2 border-border">
            <button type="submit" className="w-full sm:w-auto bg-green text-white font-black py-4 px-12 rounded-2xl transition-all shadow-xl shadow-green-900/20 text-xs flex items-center justify-center gap-3 uppercase tracking-[0.2em] hover:bg-green-600 active:scale-95">
              <CheckCircle size={18} /> Initialize Refund Sequence
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefundRequestTab;
