import React, { useEffect, useState, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import SearchableCaseSelect from '../shared/SearchableCaseSelect';
import FileUpload from '../shared/FileUpload';
import {
  IndianRupee,
  CheckCircle,
  ClipboardList,
  Plus,
  Trash2,
  X,
  Eye,
  ChevronRight,
  Building2,
  CreditCard,
  CalendarDays,
  FileText
} from 'lucide-react';

import { useLocation } from 'react-router-dom';

const RefundRequestTab = () => {
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState('All');
  const [userCases, setUserCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState([]);
  const [documentLink, setDocumentLink] = useState('');
  const [myRefunds, setMyRefunds] = useState([]);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (location.state?.filter) {
      setStatusFilter(location.state.filter);
    }
  }, [location.state]);

  const fetchUserCases = async () => {
    try {
      const res = await api.get('/cases/summary');
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

  const fetchMyRefunds = async () => {
    try {
      const res = await api.get('/refunds');
      setMyRefunds(res.data);
    } catch (err) {
      console.error("Error fetching refunds:", err);
    }
  };

  useEffect(() => {
    fetchUserCases();
    fetchMyRefunds();
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
      installments: cleanedInstallments,
      documentLink
    };

    console.log("Submitting Refund Payload:", payload);

    try {
      await api.post('/refunds', payload);
      toast.success('Refund request submitted successfully');
      e.target.reset();
      setSelectedCaseId('');
      setTotalAmount('');
      setInstallments([]);
      setDocumentLink('');
      fetchMyRefunds();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    }
  };

  const filteredRefunds = myRefunds.filter(r => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Paid') return r.status === 'Paid';
      if (statusFilter === 'Rejected') return r.status === 'Rejected';
      if (statusFilter === 'Pending') return !['Paid', 'Rejected'].includes(r.status);
      return true;
    });

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
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Upload Document</label>
              <FileUpload
                onUploadSuccess={setDocumentLink}
                label="Upload document"
                compact={true}
              />
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
              <input type="text" name="ifsc" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-[0.2em] placeholder:text-text-muted" placeholder="" />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Number</label>
              <input type="text" name="accNum" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner tracking-[0.1em] placeholder:text-text-muted" placeholder="" />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Branch Location</label>
              <input type="text" name="branch" required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-gray text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="CITY" />
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
                <CheckCircle size={18} /> Submit
              </button>
            </div>
          </form>
        </div>

        <div className="mt-12 bg-bg-card border-2 border-border rounded-2xl p-4 sm:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-soft rounded-2xl border border-accent-soft/30 text-accent">
                <ClipboardList size={22} />
              </div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">My Submitted Requests</h3>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Status Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-bg-input border-2 border-border rounded-xl px-4 py-2 text-[10px] font-black uppercase text-text-primary outline-none focus:border-green transition-all"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {filteredRefunds.length === 0 ? (
            <div className="py-12 text-center bg-bg-input/30 border-2 border-dashed border-border rounded-2xl text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">
              No matching refund requests found.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b-2 border-border text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">
                      <th className="px-4 py-4 whitespace-nowrap">Case Details</th>
                      <th className="px-4 py-4 whitespace-nowrap">Amount</th>
                      <th className="px-4 py-4 whitespace-nowrap">Status</th>
                      <th className="px-4 py-4 whitespace-nowrap w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredRefunds.map((r) => (
                      <tr
                        key={r._id}
                        className="hover:bg-bg-secondary/40 transition-colors cursor-pointer group"
                        onClick={() => setSelectedRefund(r)}
                      >
                        <td className="px-4 py-4 align-middle">
                          <div className="text-[11px] font-black text-text-primary uppercase tracking-tight">{r.caseId}</div>
                          <div className="text-[9px] font-bold text-accent uppercase tracking-widest mt-0.5">{r.companyName || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="text-sm font-black text-text-primary tracking-tight">₹{Number(r.amount || 0).toLocaleString('en-IN')}</div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border-2 ${
                            r.status === 'Paid'
                              ? 'bg-green-soft text-green border-green-soft'
                              : r.status === 'Rejected'
                                ? 'bg-red-soft text-red border-red-soft'
                                : 'bg-yellow-soft text-yellow border-yellow-soft'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          <ChevronRight size={14} className="text-text-muted group-hover:text-accent transition-colors" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* --- REFUND DETAIL POPUP MODAL --- */}
        {selectedRefund && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedRefund(null)}
          >
            <div
              className="bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-soft rounded-xl text-accent"><FileText size={18} /></div>
                  <div>
                    <div className="text-[11px] font-black text-text-primary uppercase tracking-widest">{selectedRefund.caseId}</div>
                    <div className="text-[9px] font-bold text-accent uppercase tracking-widest mt-0.5">{selectedRefund.companyName || 'N/A'}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRefund(null)}
                  className="p-2 rounded-xl hover:bg-red-soft/30 text-text-muted hover:text-red transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-6 space-y-5">
                {/* Status + Date */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 ${
                    selectedRefund.status === 'Paid'
                      ? 'bg-green-soft text-green border-green-soft'
                      : selectedRefund.status === 'Rejected'
                        ? 'bg-red-soft text-red border-red-soft'
                        : 'bg-yellow-soft text-yellow border-yellow-soft'
                  }`}>{selectedRefund.status}</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted">
                    <CalendarDays size={12} />
                    {selectedRefund.timestamp ? new Date(selectedRefund.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-bg-secondary rounded-xl p-4 flex items-center justify-between">
                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Total Credit Amount</div>
                  <div className="text-xl font-black text-text-primary">₹{Number(selectedRefund.amount || 0).toLocaleString('en-IN')}</div>
                </div>

                {/* Rejection Reason */}
                {selectedRefund.status === 'Rejected' && selectedRefund.reviewerRemark && (
                  <div className="bg-red-soft/20 border border-red-soft/50 rounded-xl p-4">
                    <div className="text-[9px] font-black text-red uppercase tracking-widest mb-1">Reason for Rejection</div>
                    <div className="text-[11px] font-bold text-red">{selectedRefund.reviewerRemark}</div>
                  </div>
                )}

                {/* Bank Details */}
                <div className="bg-bg-secondary rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">
                    <CreditCard size={12} /> Bank Details
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div>
                      <div className="text-[8px] text-text-muted uppercase font-black">Bank Name</div>
                      <div className="font-black text-text-primary uppercase mt-0.5">{selectedRefund.bankName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-text-muted uppercase font-black">Account Holder</div>
                      <div className="font-black text-text-primary uppercase mt-0.5">{selectedRefund.accHolder || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-text-muted uppercase font-black">Account No.</div>
                      <div className="font-black text-text-primary mt-0.5 tracking-widest">{selectedRefund.accNum || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-text-muted uppercase font-black">IFSC Code</div>
                      <div className="font-black text-text-primary mt-0.5 tracking-widest">{selectedRefund.ifsc || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-text-muted uppercase font-black">Branch</div>
                      <div className="font-black text-text-primary uppercase mt-0.5">{selectedRefund.branch || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-text-muted uppercase font-black">Account Type</div>
                      <div className="font-black text-text-primary uppercase mt-0.5">{selectedRefund.accType || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {selectedRefund.summary && (
                  <div className="bg-bg-secondary rounded-xl p-4">
                    <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Summary / Reason</div>
                    <div className="text-[11px] font-bold text-text-primary">{selectedRefund.summary}</div>
                  </div>
                )}

                {/* Document */}
                {selectedRefund.documentLink && (
                  <a
                    href={selectedRefund.documentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-accent/10 hover:bg-accent text-accent hover:text-white border-2 border-accent/20 hover:border-accent rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    <Eye size={14} /> View Supporting Document
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default RefundRequestTab;