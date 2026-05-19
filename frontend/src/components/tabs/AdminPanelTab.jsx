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
  const [users, setUsers] = useState([]);
  const [roleUpdates, setRoleUpdates] = useState({});
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [missedEodUsers, setMissedEodUsers] = useState([]);
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

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
      setRoleUpdates(res.data.reduce((acc, item) => ({ ...acc, [item._id]: item.role }), {}));
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchMissedEodUsers = async () => {
    try {
      const res = await api.get('/users/missed-eod');
      setMissedEodUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch missed EOD users', err);
    }
  };

  const handleGrantSodAccess = async (email) => {
    try {
      await api.post(`/users/${email}/grant-sod-access`);
      toast.success(`Access granted to ${email}`);
      fetchMissedEodUsers();
    } catch (err) {
      toast.error('Failed to grant access');
    }
  };

  useEffect(() => {
    fetchPendingRefunds();
    fetchAllRefunds();
    fetchUsers();
    fetchMissedEodUsers();

    if (window.location.hash === '#refund-actions') {
      setTimeout(() => {
        const element = document.getElementById('refund-actions');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    }
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/create-user', formData);
      toast.success('User created successfully');
      setFormData({ email: '', password: '', role: 'Admin', fullName: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleChangeUserRole = (userId, role) => {
    setRoleUpdates(prev => ({ ...prev, [userId]: role }));
  };

  const handleUpdateUserRole = async (userId) => {
    const newRole = roleUpdates[userId];
    const userItem = users.find(u => u._id === userId);
    if (!userItem) return;
    if (newRole === userItem.role) {
      toast('No role change detected');
      return;
    }

    try {
      await api.put(`/auth/users/${userId}/role`, { role: newRole });
      toast.success('User role updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleToggleRecordsAccess = async (userId, currentStatus) => {
    try {
      await api.put(`/auth/users/${userId}/records-access`, { canAccessRecords: !currentStatus });
      toast.success(`Records access ${!currentStatus ? 'enabled' : 'disabled'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update access');
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
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase">ADMIN PANEL</h1>
        {/* <button 
          onClick={async () => {
            const loadToast = toast.loading('Syncing latest financial logs...');
            try {
              await Promise.all([
                fetchPendingRefunds(),
                fetchAllRefunds(),
                fetchUsers(),
                fetchMissedEodUsers()
              ]);
              toast.success('System database successfully synced!', { id: loadToast });
            } catch (err) {
              toast.error('Failed to sync system logs', { id: loadToast });
            }
          }}
          className="bg-accent hover:bg-accent-hover text-white text-[10px] font-black py-2.5 px-6 rounded-2xl shadow-lg shadow-orange-900/20 uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
        >
          <span>Sync Database</span> 🔄
        </button> */}
      </div>
      {/* SECTION 2: Create New User */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border max-w-full my-8 overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-blue-soft rounded-2xl flex items-center justify-center text-blue">
            <span className="font-black text-lg">👤</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Add New User</h2>
        </div>

        <div className="p-8 grid grid-cols-1 xl:grid-cols-[minmax(320px,1fr)_minmax(430px,1.3fr)] gap-8">
          <div className="bg-bg-card rounded-[2rem] border-2 border-border p-6">
            <form className="space-y-8" onSubmit={handleCreateUser}>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-120 items-end">
                <div>
                  <label className={labelClass}>ROLE</label>
                  <select
                    className={inputClass}
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="Admin">Admin</option>
                    <option value="Operations">Operations</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Staff">Staff</option>
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

          <div className="bg-bg-card rounded-[2rem] border-2 border-border p-6 overflow-x-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-accent-soft rounded-2xl flex items-center justify-center text-accent">
                <span className="font-black text-lg">🔧</span>
              </div>
              <div>
                <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Change User Role</h3>
                <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-1">Select a new role and submit to update a user.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                    <th className="px-4 py-4">User Name</th>
                    <th className="px-4 py-4">Role</th>
                    <th className="px-4 py-4 text-center">Records Module</th>
                    <th className="px-4 py-4">Change Role</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center text-text-muted uppercase tracking-[0.2em]">No users available for role change.</td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u._id} className="hover:bg-bg-input/30 transition-all">
                        <td className="px-4 py-4 font-black text-text-primary uppercase tracking-tight">{u.fullName}</td>
                        <td className="px-4 py-4 font-bold text-text-muted italic">{u.role}</td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleToggleRecordsAccess(u._id, u.canAccessRecords)}
                            className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${u.canAccessRecords
                              ? 'bg-green-soft text-green border border-green-soft hover:bg-green hover:text-white'
                              : 'bg-bg-input text-text-muted border border-border hover:border-accent hover:text-accent'
                              }`}
                          >
                            {u.canAccessRecords ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            className={inputClass}
                            value={roleUpdates[u._id] || u.role}
                            onChange={e => handleChangeUserRole(u._id, e.target.value)}
                          >
                            <option value="Admin">Admin</option>
                            <option value="Operations">Operations</option>
                            <option value="Reviewer">Reviewer</option>
                            <option value="Accountant">Accountant</option>
                            <option value="Staff">Staff</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleUpdateUserRole(u._id)}
                            className="bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-2xl transition-all active:scale-95 whitespace-nowrap"
                          >
                            Update Role
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Missed EOD Users */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border mb-10 max-w-full overflow-hidden mt-10">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-red-soft rounded-2xl flex items-center justify-center text-red">
            <span className="font-black text-lg">⚠️</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Missed EOD Users</h2>
        </div>

        <div className="table-wrap overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-4 py-5 whitespace-nowrap">User Name</th>
                <th className="px-4 py-5 whitespace-nowrap">Email</th>
                <th className="px-4 py-5">Missed Dates</th>
                <th className="px-4 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {missedEodUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-text-muted italic">No users have missed EOD.</td>
                </tr>
              ) : (
                missedEodUsers.map(u => (
                  <tr key={u._id} className="hover:bg-bg-input/30 transition-all">
                    <td className="px-4 py-5 font-black text-text-primary uppercase tracking-tighter">{u.name || u._id}</td>
                    <td className="px-4 py-5 font-bold text-text-muted">{u._id}</td>
                    <td className="px-4 py-5">
                      <div className="flex flex-wrap gap-1">
                        {u.missedDates.map(d => (
                          <span key={d} className="bg-red-soft text-red px-2 py-0.5 rounded-md text-[9px] font-black">{d}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      {u.bypassEodCheck ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="bg-green-soft text-green border border-green-soft text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap">
                            ✨ ACCESS GRANTED
                          </span>
                          {u.sodAccessGrantedAt && (
                            <span className="text-[8px] text-green font-black uppercase tracking-wider opacity-85 whitespace-nowrap">
                              {new Date(u.sodAccessGrantedAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGrantSodAccess(u._id)}
                          className="bg-accent hover:bg-accent-hover text-white text-[9px] font-black py-2 px-4 rounded-xl shadow-lg shadow-orange-900/20 uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
                        >
                          Grant Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 1: Refund Requests & Approvals */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border mb-10 max-w-5xl overflow-hidden">
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
                <th className="px-4 py-5">Assign To</th>
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



      {/* SECTION 3: Global Refund Audit Trail */}
      <div id="refund-actions" className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border max-w-5xl overflow-hidden mt-10">
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
                    <td className="px-4 py-5 font-black text-accent uppercase tracking-tighter">
                      <div>{r.caseId}</div>
                      {r.companyName && (
                        <div className="text-[10px] text-text-muted font-bold tracking-normal normal-case mt-0.5">{r.companyName}</div>
                      )}
                    </td>
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
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Refund Request">
        {selectedRefund && (() => {
          const refundToRender = allRefunds.find(r => r._id === selectedRefund._id) || pendingRefunds.find(r => r._id === selectedRefund._id) || selectedRefund;
          const totalAmount = Number(refundToRender.amount) || 0;
          const isSinglePaidFallback = refundToRender.transactionId && (refundToRender.installments || []).length === 1;
          const paidAmount = refundToRender.status === 'Paid' || isSinglePaidFallback
            ? totalAmount
            : (refundToRender.installments || []).reduce((sum, inst) => {
              const isPaidInst = inst.status === 'Paid' || refundToRender.status === 'Paid';
              return isPaidInst ? sum + (Number(inst.amount) || 0) : sum;
            }, 0);
          const leftAmount = Math.max(0, totalAmount - paidAmount);

          return (
            <div className="p-6 flex flex-col gap-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm">
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Case Id</p>
                  <p className="font-black text-accent text-sm tracking-tighter uppercase">{refundToRender.caseId}</p>
                  {refundToRender.companyName && (
                    <p className="text-[10px] text-text-muted font-bold tracking-normal normal-case mt-1">{refundToRender.companyName}</p>
                  )}
                </div>
                <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm">
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Payout amount</p>
                  <p className="font-black text-green text-sm tracking-tight">₹{Number(refundToRender.amount).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm">
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Requested by</p>
                  <p className="text-text-primary font-black uppercase text-[10px] tracking-wider">{refundToRender.requestedByName || refundToRender.requestedBy}</p>
                </div>
                <div className="bg-bg-input p-5 rounded-3xl border border-border shadow-sm">
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Status</p>
                  <p className="font-black text-orange-400 uppercase text-[10px] tracking-widest">
                    {refundToRender.status === 'Paid' || isSinglePaidFallback ? 'Paid' : refundToRender.status}
                  </p>
                </div>
              </div>

              <div className="bg-bg-secondary rounded-[2rem] border-2 border-border overflow-hidden shadow-sm">
                <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                  Bank Details
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
                  <div>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Bank Name</p>
                    <p className="font-black text-text-primary uppercase tracking-tight">{refundToRender.bankName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Account holder name</p>
                    <p className="font-black text-text-primary uppercase tracking-tight">{refundToRender.accHolder}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Acc Number</p>
                    <p className="font-mono font-black text-accent select-all">{refundToRender.accNum}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">IFSC Code</p>
                    <p className="font-mono font-black text-accent select-all">{refundToRender.ifsc}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Account type</p>
                    <p className="text-text-secondary font-bold uppercase text-[10px]">{refundToRender.accType}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Branch</p>
                    <p className="text-text-secondary font-bold uppercase text-[10px]">{refundToRender.branch}</p>
                  </div>
                </div>
              </div>

              {refundToRender.installments && refundToRender.installments.length > 0 && (
                <div className="bg-bg-secondary rounded-[2rem] border-2 border-border overflow-hidden shadow-sm">
                  <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                    Installment Details
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bg-input text-text-muted text-[9px] font-black uppercase tracking-widest border-b border-border">
                          <th className="px-6 py-4">Installment Number</th>
                          <th className="px-6 py-4">Release Date</th>
                          <th className="px-6 py-4">Credit Amount</th>
                          <th className="px-6 py-4">Payment Date</th>
                          <th className="px-6 py-4">Bank UTR</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px] text-text-secondary divide-y divide-border/50">
                        {refundToRender.installments && refundToRender.installments.length > 0 ? (
                          refundToRender.installments.map((inst, i) => {
                            const isPaid = inst.status === 'Paid' || refundToRender.status === 'Paid' || isSinglePaidFallback;
                            const payDate = inst.paymentDate || (isPaid ? refundToRender.paymentDate : null);
                            const utr = inst.transactionId || (isPaid ? refundToRender.transactionId : null);

                            return (
                              <tr key={i} className="hover:bg-bg-input/20 transition-colors">
                                <td className="px-6 py-4 font-black">Inst. #{i + 1}</td>
                                <td className="px-6 py-4 font-bold">{inst.dueDate}</td>
                                <td className="px-6 py-4 font-black text-green">₹{Number(inst.amount).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 font-bold text-text-secondary">
                                  {payDate ? new Date(payDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                </td>
                                <td className="px-6 py-4 font-mono font-black text-accent select-all">
                                  {utr || '—'}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isPaid
                                                                        ? 'bg-green-soft text-green'
                                    : inst.status === 'Due'
                                    ? 'bg-red-soft text-red'
                                    : 'bg-yellow-soft text-yellow'
                                    }`}>
                                    {isPaid ? 'Paid' : inst.status || 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-[10px] font-black text-text-muted uppercase tracking-widest italic">
                              Single installment payment structure
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* financial details ledger card */}
                  <div className="bg-bg-input px-8 py-5 border-t border-border flex flex-wrap justify-between items-center gap-6">
                    <div className="flex gap-8">
                      <div>
                        <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">Total Payout</p>
                        <p className="text-sm font-black text-text-primary">₹{Number(totalAmount).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="border-l border-border/80 pl-6">
                        <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">Disbursed (Paid)</p>
                        <p className="text-sm font-black text-green">₹{Number(paidAmount).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="border-l border-border/80 pl-6">
                        <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">Remaining (Left)</p>
                        <p className={`text-sm font-black ${leftAmount > 0 ? 'text-accent' : 'text-text-muted'}`}>
                          ₹{Number(leftAmount).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${leftAmount === 0 ? 'bg-green' : 'bg-accent'}`}></span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">
                        {leftAmount === 0 ? 'Fully Settled' : 'Partially Settled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(refundToRender.status === 'Paid' || isSinglePaidFallback || refundToRender.transactionId || refundToRender.paymentDate || refundToRender.paymentProof) && (
                <div className="bg-bg-secondary rounded-[2rem] border-2 border-border overflow-hidden shadow-sm animate-in fade-in duration-300">
                  <div className="bg-green-soft px-6 py-4 border-b border-border font-black text-green text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                    <span>✅ Payment Receipt</span>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
                    <div>
                      <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Date</p>
                      <p className="font-black text-text-primary uppercase tracking-tight">
                        {refundToRender.paymentDate ? new Date(refundToRender.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Transaction UTR</p>
                      <p className="font-mono font-black text-accent select-all tracking-wider uppercase">{refundToRender.transactionId || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Paid By</p>
                      <p className="text-text-primary font-black uppercase text-[10px] tracking-wider">{refundToRender.paidBy || '—'}</p>
                    </div>
                    {refundToRender.paymentProof && (
                      <div className="md:col-span-2 lg:col-span-3 border-t border-border/50 pt-6">
                        <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3">Verification Document</p>
                        <a
                          href={refundToRender.paymentProof}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-bg-input hover:bg-bg-card-hover border-2 border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary transition-all"
                        >
                          📄 View Uploaded Screenshot / Proof
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-bg-input p-6 rounded-[2.5rem] border border-border shadow-inner">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3 ml-2">Summary</p>
                <p className="text-sm text-text-secondary leading-relaxed italic border-l-4 border-accent pl-5">
                  "{refundToRender.summary}"
                </p>
              </div>


            </div>
          )
        })()}
      </Modal>
    </div>
  );
};

export default AdminPanelTab;
