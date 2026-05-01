import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { AuthContext } from '../../context/AuthContext';
import { Eye } from 'lucide-react';

const AdminPanelTab = () => {
  const [formData, setFormData] = useState({ email: '', password: '', role: 'Admin', fullName: '' });
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [allRefunds, setAllRefunds] = useState([]);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { user } = useContext(AuthContext);

  const fetchPendingRefunds = async () => {
    try {
      const res = await api.get('/refunds?status=Pending Admin Approval');
      setPendingRefunds(res.data);
    } catch (err) {
      console.error('Failed to fetch refunds', err);
    }
  };

  const fetchAllRefunds = async () => {
    try {
      const res = await api.get('/refunds');
      setAllRefunds(res.data);
    } catch (err) {
      console.error('Failed to fetch all refunds', err);
    }
  };

  useEffect(() => {
    fetchPendingRefunds();
    fetchAllRefunds();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/create-user', formData);
      toast.success('User created successfully');
      setFormData({ email: '', password: '', role: 'Admin', fullName: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleApproveRefund = async (id) => {
    try {
      await api.put(`/refunds/${id}`, {
        status: 'Pending Payment',
        approvedBy: user.email,
        approvedAt: new Date().toISOString()
      });
      toast.success('Refund Approved & Sent to Accountant');
      fetchPendingRefunds();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleRejectRefund = async (id) => {
    const remark = prompt("Enter rejection reason:");
    if (!remark) return;
    try {
      await api.put(`/refunds/${id}`, {
        status: 'Rejected',
        reviewerRemark: remark,
        reviewedBy: user.email
      });
      toast.success('Refund Rejected');
      fetchPendingRefunds();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  const inputClass = "w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-xs text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none transition-all font-medium placeholder:text-text-muted/30";
  const labelClass = "block text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-2 ml-1";

  return (
    <div className="h-full bg-bg-primary p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">ADMIN PANEL</h1>

      </div>

      {/* SECTION 1: Refund Requests & Approvals */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border mb-10 max-w-7xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-accent-soft rounded-2xl flex items-center justify-center text-accent">
            <span className="font-black text-lg">💰</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Pending Refunds</h2>
        </div>

        <div className="table-wrap overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-4 py-5 whitespace-nowrap">Submission Date</th>
                <th className="px-4 py-5 whitespace-nowrap">Case Link</th>
                <th className="px-4 py-5 text-center">Amount Requested</th>
                <th className="px-4 py-5">Initiated By</th>
                <th className="px-4 py-5 text-center">Final Decision</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {pendingRefunds.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <div className="p-6 bg-bg-input rounded-full">
                        <span className="text-4xl">💎</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Authorization Queue Clear</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingRefunds.map(r => (
                  <tr key={r._id} className="hover:bg-bg-input/30 transition-all group">
                    <td className="px-4 py-5 text-text-muted font-bold italic">
                      {new Date(r.timestamp).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-5">
                      <button
                        onClick={() => { setSelectedRefund(r); setIsDetailOpen(true); }}
                        className="bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-soft hover:bg-accent hover:text-white transition-all shadow-sm"
                      >
                        {r.caseId}
                      </button>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className="text-lg font-black text-green tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-5 font-black text-text-primary uppercase text-[10px] tracking-wider">{r.requestedByName || r.requestedBy}</td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleApproveRefund(r._id)} className="bg-green hover:bg-green-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-lg shadow-green-900/20 uppercase tracking-widest transition-all active:scale-95">Approve</button>
                        <button onClick={() => handleRejectRefund(r._id)} className="bg-red hover:bg-red-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-lg shadow-red-900/20 uppercase tracking-widest transition-all active:scale-95">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Create New User */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border max-w-6xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-blue-soft rounded-2xl flex items-center justify-center text-blue">
            <span className="font-black text-lg">👤</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Add New User</h2>
        </div>

        <form className="p-8" onSubmit={handleCreateUser}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <label className={labelClass}> FULL NAME</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex: John Doe"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={labelClass}>EMAIL</label>
              <input
                type="email"
                className={inputClass}
                placeholder="user@rrr-system.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={labelClass}>PASSWORD</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Secure password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div>
              <label className={labelClass}>ROLE</label>
              <select
                className={inputClass}
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="Admin">Core Administrator</option>
                <option value="Operations">Operations Lead</option>
                <option value="Reviewer">Compliance Reviewer</option>
                <option value="Accountant">Financial Accountant</option>
                <option value="Staff">General Staff</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-900/20 transition-all text-xs uppercase tracking-[0.2em] active:scale-95">
                CREATE USER
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SECTION 3: Global Refund Audit Trail */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border max-w-7xl overflow-hidden mt-10">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-purple-soft rounded-2xl flex items-center justify-center text-purple">
            <span className="font-black text-lg">📋</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Refund Actions</h2>
        </div>

        <div className="table-wrap overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-4 py-5 whitespace-nowrap">Case ID</th>
                <th className="px-4 py-5 whitespace-nowrap">Total Amount</th>
                <th className="px-4 py-5">Requested By</th>
                <th className="px-4 py-5 text-center">Current Lifecycle State</th>
                <th className="px-4 py-5 text-center">View</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {allRefunds.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-text-muted italic">No refund records found in the ledger.</td>
                </tr>
              ) : (
                allRefunds.map(r => (
                  <tr key={r._id} className="hover:bg-bg-input/30 transition-all">
                    <td className="px-4 py-5 font-black text-accent uppercase tracking-tighter">{r.caseId}</td>
                    <td className="px-4 py-5 font-black text-green">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-5 font-bold uppercase text-[10px]">{r.requestedByName || r.requestedBy}</td>
                    <td className="px-4 py-5 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${r.status === 'Paid' ? 'bg-green-soft text-green border-green-soft' :
                        r.status === 'Rejected' ? 'bg-red-soft text-red border-red-soft' :
                          r.status === 'Pending Admin Approval' ? 'bg-yellow-soft text-yellow border-yellow-soft' :
                            'bg-bg-input text-text-muted border-border'
                        }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <button onClick={() => { setSelectedRefund(r); setIsDetailOpen(true); }} className="p-2 bg-bg-input hover:bg-bg-card-hover rounded-xl text-text-primary transition-all border border-border">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail View Modal for Admin */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Audit Disclosure: Refund Request">
        {selectedRefund && (
          <div className="p-6 flex flex-col gap-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Case Anchor</p>
                <p className="font-black text-accent text-sm tracking-tighter uppercase">{selectedRefund.caseId}</p>
              </div>
              <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Payout Volume</p>
                <p className="font-black text-green text-sm tracking-tight">₹{Number(selectedRefund.amount).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Requester</p>
                <p className="text-text-primary font-black uppercase text-[10px] tracking-wider">{selectedRefund.requestedByName || selectedRefund.requestedBy}</p>
              </div>
              <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">System Status</p>
                <p className="font-black text-orange-400 uppercase text-[10px] tracking-widest">{selectedRefund.status}</p>
              </div>
            </div>

            <div className="bg-bg-secondary rounded-[2rem] border-2 border-border overflow-hidden shadow-sm">
              <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                Verified Beneficiary Configuration
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
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Classification</p>
                  <p className="text-text-secondary font-bold uppercase text-[10px]">{selectedRefund.accType}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Operational Branch</p>
                  <p className="text-text-secondary font-bold uppercase text-[10px]">{selectedRefund.branch}</p>
                </div>
              </div>
            </div>

            {selectedRefund.installments && selectedRefund.installments.length > 0 && (
              <div className="bg-bg-secondary rounded-[2rem] border-2 border-border overflow-hidden shadow-sm">
                <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                  Authorized Installment Structure
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-input text-text-muted text-[9px] font-black uppercase tracking-widest border-b border-border">
                        <th className="px-6 py-4">Milestone</th>
                        <th className="px-6 py-4">Release Date</th>
                        <th className="px-6 py-4">Credit Amount</th>
                        <th className="px-6 py-4">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] text-text-secondary divide-y divide-border/50">
                      {selectedRefund.installments && selectedRefund.installments.length > 0 ? (
                        selectedRefund.installments.map((inst, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4 font-black">Inst. #{i + 1}</td>
                            <td className="px-6 py-4 font-bold">{inst.dueDate}</td>
                            <td className="px-6 py-4 font-black text-green">₹{Number(inst.amount).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 font-black uppercase tracking-widest text-[9px] opacity-60">{inst.status}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-[10px] font-black text-text-muted uppercase tracking-widest italic">
                            Single installment payment structure
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-bg-input p-6 rounded-[2.5rem] border border-border shadow-inner">
              <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3 ml-2">Disclosure Narrative / Justification</p>
              <p className="text-sm text-text-secondary leading-relaxed italic border-l-4 border-accent pl-5">
                "{selectedRefund.summary}"
              </p>
            </div>

            <div className="flex gap-4 justify-end mt-4">
              <button
                className="bg-bg-input hover:bg-bg-card-hover text-text-secondary font-black py-4 px-10 rounded-2xl border-2 border-border transition-all text-xs uppercase tracking-widest active:scale-95"
                onClick={() => setIsDetailOpen(false)}
              >
                Close Audit
              </button>
              <button
                className="bg-red hover:bg-red-600 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-red-900/20 transition-all text-xs uppercase tracking-widest active:scale-95"
                onClick={() => { setIsDetailOpen(false); handleRejectRefund(selectedRefund._id); }}
              >
                Deny Disbursement
              </button>
              <button
                className="bg-green hover:bg-green-600 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-green-900/20 transition-all text-xs uppercase tracking-widest active:scale-95"
                onClick={() => { setIsDetailOpen(false); handleApproveRefund(selectedRefund._id); }}
              >
                Authorize Payout
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPanelTab;
