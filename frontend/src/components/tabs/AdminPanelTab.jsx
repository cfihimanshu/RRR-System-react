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
  const [auditLogs, setAuditLogs] = useState([]);
  const [logPage, setLogPage] = useState(1);
  const [totalLogPages, setTotalLogPages] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const { user } = useContext(AuthContext);

  const [expandedCases, setExpandedCases] = useState({});

  const toggleCaseExpand = (caseId) => {
    setExpandedCases(prev => ({ ...prev, [caseId]: !prev[caseId] }));
  };

  const [expandedInstallments, setExpandedInstallments] = useState({});

  const toggleInstallmentExpand = (refundId, index) => {
    const key = `${refundId}_${index}`;
    setExpandedInstallments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredAllRefunds = React.useMemo(() => {
    return allRefunds.filter(r => ['Pending Admin Approval', 'Pending Payment', 'Paid'].includes(r.status));
  }, [allRefunds]);

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

  const fetchAuditLogs = async (page = 1) => {
    try {
      const res = await api.get(`/auditLogs?page=${page}&limit=20`);
      setAuditLogs(res.data.logs || []);
      setTotalLogPages(res.data.pages || 1);
      setTotalLogsCount(res.data.total || 0);
      setLogPage(res.data.page || 1);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
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
    fetchAuditLogs(1);

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
      {/* SECTION 2: Create New User & Change User Role Layout */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border max-w-full my-8 overflow-hidden">
        <div className="p-8 grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Form: Add New User */}
          <div className="xl:col-span-5 bg-bg-card rounded-[2rem] border-2 border-border p-6 flex flex-col justify-between min-h-[480px]">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-soft rounded-2xl flex items-center justify-center text-blue">
                  <span className="font-black text-lg">👤</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Add New User</h3>
                  <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-1">Register a new system user account</p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ex: John Doe"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Email Address</label>
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
                    <label className={labelClass}>Secure Password</label>
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
                <div>
                  <label className={labelClass}>Assigned System Role</label>
                  <select
                    className={inputClass}
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Operations">Operations</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Staff">Staff</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white font-black py-3.5 rounded-2xl shadow-lg shadow-orange-955/20 transition-all text-xs uppercase tracking-[0.2em] active:scale-95">
                    Create User Account
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Table: Change User Role */}
          <div className="xl:col-span-7 bg-bg-card rounded-[2rem] border-2 border-border p-6 flex flex-col justify-between min-h-[480px]">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent-soft rounded-2xl flex items-center justify-center text-accent">
                  <span className="font-black text-lg">🔧</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary uppercase tracking-tight">Change User Role</h3>
                  <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-1">Select a new role and submit to update a user.</p>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[340px] pr-1 scrollbar-thin border border-border/30 rounded-2xl bg-bg-secondary/20">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead className="sticky top-0 z-10 bg-bg-card shadow-sm">
                    <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                      <th className="px-4 py-3.5">User Name</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5 text-center">Records Module</th>
                      <th className="px-4 py-3.5">Change Role</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-10 text-center text-text-muted uppercase tracking-[0.2em]">No users available.</td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u._id} className="hover:bg-bg-input/30 transition-all">
                          <td className="px-4 py-3 font-black text-text-primary uppercase tracking-tight">{u.fullName}</td>
                          <td className="px-4 py-3 font-bold text-text-muted italic">{u.role}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleToggleRecordsAccess(u._id, u.canAccessRecords)}
                              className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all shadow-sm ${u.canAccessRecords
                                ? 'bg-green-soft text-green border border-green-soft hover:bg-green hover:text-white'
                                : 'bg-bg-input text-text-muted border border-border hover:border-accent hover:text-accent'
                                }`}
                            >
                              {u.canAccessRecords ? 'ENABLED' : 'DISABLED'}
                            </button>
                          </td>
                          <td className="px-4 py-3 min-w-[130px]">
                            <select
                              className="w-full bg-bg-input border border-border rounded-xl px-2 py-1.5 text-[10px] text-text-primary focus:border-accent outline-none transition-all font-bold"
                              value={roleUpdates[u._id] || u.role}
                              onChange={e => handleChangeUserRole(u._id, e.target.value)}
                            >
                              <option value="Super Admin">Super Admin</option>
                              <option value="Admin">Admin</option>
                              <option value="Operations">Operations</option>
                              <option value="Reviewer">Reviewer</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Staff">Staff</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleUpdateUserRole(u._id)}
                              className="bg-accent hover:bg-accent-hover text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl transition-all active:scale-95 whitespace-nowrap"
                            >
                              Update
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
      </div>

      {/* SECTION: Missed EOD Users */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border mb-10 max-w-full overflow-hidden mt-10">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-red-soft rounded-2xl flex items-center justify-center text-red">
            <span className="font-black text-lg">⚠️</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Missed EOD Users</h2>
        </div>

        <div className="overflow-y-auto max-h-[300px] scrollbar-thin border-b border-border">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-bg-card shadow-sm">
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
                groupRefundsByCase(pendingRefunds).map(g => {
                  const isExpanded = !!expandedCases[g.caseId];
                  return (
                    <React.Fragment key={g.caseId}>
                      {/* Parent Case Row */}
                      <tr
                        onClick={() => toggleCaseExpand(g.caseId)}
                        className="hover:bg-bg-input/40 cursor-pointer transition-all bg-bg-card font-bold select-none"
                      >
                        <td className="px-4 py-5 text-text-muted font-bold">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-[12px] font-black text-accent">{isExpanded ? '▼' : '▶'}</span>
                            Group ({g.requests.length})
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col items-start gap-1">
                            <span className="bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-soft hover:bg-accent hover:text-white transition-all shadow-sm">
                              {g.caseId}
                            </span>
                            {g.companyName && (
                              <span className="text-[10px] text-text-muted font-bold tracking-normal normal-case ml-1">{g.companyName}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="text-lg font-black text-green tracking-tight">₹{Number(g.totalAmount).toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-4 py-5 font-black text-text-primary uppercase text-[10px] tracking-wider">
                          {g.requests.length === 1 ? (g.requests[0].requestedByName || g.requests[0].requestedBy) : 'Multiple Requesters'}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                            {isExpanded ? 'Hide Details' : 'Show Requests'}
                          </span>
                        </td>
                      </tr>
                      {/* Expanded Sub-Rows for each individual request */}
                      {isExpanded && g.requests.map((r, idx) => (
                        <tr key={r._id} className="bg-bg-input/20 hover:bg-bg-input/35 transition-all border-l-4 border-accent">
                          <td className="px-4 py-5 text-text-muted font-bold italic pl-8">
                            Request #{idx + 1} — {new Date(r.timestamp).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedRefund(r); setIsDetailOpen(true); }}
                              className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-accent-soft hover:bg-accent hover:text-white transition-all shadow-sm"
                            >
                              View Details 🔍
                            </button>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className="text-base font-black text-green tracking-tight">₹{Number(r.amount).toLocaleString('en-IN')}</span>
                          </td>
                          <td className="px-4 py-5 font-black text-text-secondary uppercase text-[10px] tracking-wider">
                            {r.requestedByName || r.requestedBy}
                          </td>
                          <td className="px-4 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-3">
                              <button onClick={() => handleApproveRefund(r._id)} className="bg-green hover:bg-green-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-lg shadow-green-900/20 uppercase tracking-widest transition-all active:scale-95">Approve</button>
                              <button onClick={() => handleRejectRefund(r._id)} className="bg-red hover:bg-red-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-lg shadow-red-900/20 uppercase tracking-widest transition-all active:scale-95">Reject</button>
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



      {/* SECTION 3: Global Refund Audit Trail */}
      <div id="refund-actions" className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border max-w-full overflow-hidden mt-10">
        <div className="p-6 border-b border-border flex items-center gap-3 bg-bg-card">
          <div className="w-10 h-10 bg-purple-soft rounded-2xl flex items-center justify-center text-purple">
            <span className="font-black text-lg">📋</span>
          </div>
          <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">Refund Actions</h2>
        </div>

        <div className="overflow-y-auto max-h-[350px] scrollbar-thin border-b border-border">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-bg-card shadow-sm">
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-4 py-5 whitespace-nowrap">Case ID</th>
                <th className="px-4 py-5 whitespace-nowrap">Total Amount</th>
                <th className="px-4 py-5">Requested By</th>
                <th className="px-4 py-5 text-center">Current Lifecycle State</th>
                <th className="px-4 py-5 text-center">View</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {filteredAllRefunds.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-text-muted italic">No refund records found in the ledger.</td>
                </tr>
              ) : (
                groupRefundsByCase(filteredAllRefunds).map(g => {
                  const isExpanded = !!expandedCases[`all_${g.caseId}`];
                  return (
                    <React.Fragment key={g.caseId}>
                      {/* Parent Case Row */}
                      <tr
                        onClick={() => toggleCaseExpand(`all_${g.caseId}`)}
                        className="hover:bg-bg-input/40 cursor-pointer transition-all bg-bg-card font-bold select-none"
                      >
                        <td className="px-4 py-5 font-black text-accent uppercase tracking-tighter">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-black text-accent">{isExpanded ? '▼' : '▶'}</span>
                            <div>{g.caseId}</div>
                          </div>
                          {g.companyName && (
                            <div className="text-[10px] text-text-muted font-bold tracking-normal normal-case mt-0.5 ml-5">{g.companyName}</div>
                          )}
                        </td>
                        <td className="px-4 py-5 font-black text-green">
                          <div className="text-lg tracking-tight">₹{Number(g.totalAmount).toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-text-muted font-bold mt-1 ml-0.5">{g.requests.length} Requests</div>
                        </td>
                        <td className="px-4 py-5 font-bold uppercase text-[10px]">
                          {g.requests.length === 1 ? (g.requests[0].requestedByName || g.requests[0].requestedBy) : 'Multiple Requesters'}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-wrap justify-center gap-1 max-w-[150px] mx-auto">
                            {[...new Set(g.requests.map(r => r.status))].map(status => (
                              <span key={status} className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${status === 'Paid' ? 'bg-green-soft text-green border-green-soft' :
                                status === 'Rejected' ? 'bg-red-soft text-red border-red-soft' :
                                  status === 'Pending Admin Approval' ? 'bg-yellow-soft text-yellow border-yellow-soft' :
                                    'bg-bg-input text-text-muted border-border'
                                }`}>
                                {status}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                            {isExpanded ? 'Hide' : 'Expand'}
                          </span>
                        </td>
                      </tr>
                      {/* Child Request Rows */}
                      {isExpanded && g.requests.map((r, idx) => (
                        <tr key={r._id} className="bg-bg-input/20 hover:bg-bg-input/35 transition-all border-l-4 border-accent">
                          <td className="px-4 py-5 font-black text-accent uppercase tracking-tighter pl-8">
                            <div className="text-[10px] text-text-muted font-bold">Request #{idx + 1} — {new Date(r.timestamp).toLocaleDateString('en-IN')}</div>
                          </td>
                          <td className="px-4 py-5 font-black text-green">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-5 font-bold uppercase text-[10px] text-text-secondary">{r.requestedByName || r.requestedBy}</td>
                          <td className="px-4 py-5 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${r.status === 'Paid' ? 'bg-green-soft text-green border-green-soft' :
                              r.status === 'Rejected' ? 'bg-red-soft text-red border-red-soft' :
                                r.status === 'Pending Admin Approval' ? 'bg-yellow-soft text-yellow border-yellow-soft' :
                                  'bg-bg-input text-text-muted border-border'
                              }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { setSelectedRefund(r); setIsDetailOpen(true); }} className="p-2 bg-bg-input hover:bg-bg-card-hover rounded-xl text-text-primary transition-all border border-border">
                              <Eye size={14} />
                            </button>
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

      {/* SECTION 4: System Access & Audit Ledger */}
      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border max-w-full overflow-hidden mt-10">
        <div className="p-6 border-b border-border flex items-center justify-between bg-bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-soft rounded-2xl flex items-center justify-center text-accent">
              <span className="font-black text-lg">🛡️</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary tracking-tight uppercase">System Access & Audit Ledger</h2>
              <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-0.5">Real-time device & IP geolocation access monitoring</p>
            </div>
          </div>
          <button
            onClick={() => fetchAuditLogs(logPage)}
            className="bg-accent hover:bg-accent-hover text-white text-[10px] font-black py-2.5 px-6 rounded-2xl shadow-lg shadow-orange-900/20 uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
          >
            <span>Refresh Logs</span> 🔄
          </button>
        </div>

        <div className="overflow-y-auto max-h-[450px] scrollbar-thin border-b border-border">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="sticky top-0 z-10 bg-bg-card shadow-sm">
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-6 py-5 w-[15%]">Timestamp</th>
                <th className="px-6 py-5 w-[15%]">User Account</th>
                <th className="px-6 py-5 w-[10%]">Role</th>
                <th className="px-6 py-5 w-[12%]">Category</th>
                <th className="px-6 py-5 w-[28%]">Audit Details</th>
                <th className="px-6 py-5 w-[10%]">Source IP</th>
                <th className="px-6 py-5 w-[10%]">Client Device</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-text-muted italic">No activity logs recorded.</td>
                </tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log._id || log.id} className="hover:bg-bg-input/30 transition-all">
                    <td className="px-6 py-5 font-bold text-text-muted">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : '—'}
                    </td>
                    <td className="px-6 py-5 font-black text-text-primary uppercase tracking-tight">{log.user}</td>
                    <td className="px-6 py-5 font-bold text-text-muted italic">{log.role || 'System'}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.category === 'Login' ? 'bg-green-soft text-green' :
                        log.category === 'Security' ? 'bg-red-soft text-red' :
                          log.category === 'User Management' ? 'bg-blue-soft text-blue' :
                            'bg-bg-input text-text-muted border-border'
                        }`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="line-clamp-2 max-w-sm" title={log.description}>{log.description || '—'}</div>
                    </td>
                    <td className="px-6 py-5 font-mono text-accent font-black">
                      {log.ipAddress === '::1' || log.ipAddress === '127.0.0.1' ? 'Local PC (127.0.0.1)' : (log.ipAddress || 'Intranet')}
                    </td>
                    <td className="px-6 py-5 font-bold text-text-primary uppercase tracking-tighter">
                      {log.userAgent || 'API client'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalLogPages > 1 && (
          <div className="px-6 py-5 bg-bg-card border-t border-border flex justify-between items-center">
            <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">
              Showing Page {logPage} of {totalLogPages} ({totalLogsCount} total logs)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchAuditLogs(logPage - 1)}
                disabled={logPage === 1}
                className="bg-bg-input hover:bg-bg-card-hover disabled:opacity-40 text-text-primary text-[10px] font-black py-2 px-4 rounded-xl border border-border uppercase tracking-widest transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => fetchAuditLogs(logPage + 1)}
                disabled={logPage === totalLogPages}
                className="bg-bg-input hover:bg-bg-card-hover disabled:opacity-40 text-text-primary text-[10px] font-black py-2 px-4 rounded-xl border border-border uppercase tracking-widest transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail View Modal for Admin */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Refund Request" size="lg">
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
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Amount</p>
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


              {(() => {
                const finalInstallments = (refundToRender.installments && refundToRender.installments.length > 0)
                  ? refundToRender.installments
                  : [{
                    amount: refundToRender.amount,
                    dueDate: refundToRender.paymentDate || refundToRender.timestamp,
                    status: refundToRender.status,
                    transactionId: refundToRender.transactionId,
                    paymentDate: refundToRender.paymentDate,
                    paymentProof: refundToRender.paymentProof,
                    paidBy: refundToRender.paidBy,
                    isSingle: true
                  }];

                return (
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
                          {finalInstallments.map((inst, i) => {
                            const isPaid = inst.status === 'Paid' || refundToRender.status === 'Paid' || isSinglePaidFallback;
                            const payDate = inst.paymentDate || (isPaid ? refundToRender.paymentDate : null);
                            const utr = inst.transactionId || (isPaid ? refundToRender.transactionId : null);
                            const paidBy = inst.paidBy || (isPaid ? refundToRender.paidBy : null);
                            const proofUrl = inst.paymentProof || (isPaid ? refundToRender.paymentProof : null);

                            const releaseDateFormatted = inst.isSingle
                              ? (inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')
                              : inst.dueDate;

                            const isExpanded = !!expandedInstallments[`${refundToRender._id}_${i}`];

                            return (
                              <React.Fragment key={i}>
                                <tr
                                  className="hover:bg-bg-input/20 transition-colors cursor-pointer select-none"
                                  onClick={() => toggleInstallmentExpand(refundToRender._id, i)}
                                >
                                  <td className="px-6 py-4 font-black">
                                    {inst.isSingle ? 'Single Payout' : `Inst. #${i + 1}`} {isPaid ? (isExpanded ? '▼' : '▶') : ''}
                                  </td>
                                  <td className="px-6 py-4 font-bold">{releaseDateFormatted}</td>
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
                                {isExpanded && isPaid && (
                                  <tr className="bg-bg-secondary/40">
                                    <td colSpan="6" className="px-6 py-4">
                                      <div className="bg-bg-card border-2 border-border/80 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-3 duration-150 shadow-sm text-left">
                                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                          <div className="flex items-center gap-2 text-[10px] font-black text-green uppercase tracking-widest">
                                            <span>✅ Payment Receipt Details</span>
                                          </div>
                                          <span className="text-[8px] text-text-muted font-bold uppercase tracking-wider">
                                            {inst.isSingle ? 'Single Payout' : `Installment #${i + 1}`}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[10px]">
                                          <div>
                                            <div className="text-[8px] text-text-muted uppercase font-black mb-1">Payment Date</div>
                                            <div className="font-black text-text-primary uppercase tracking-tight">
                                              {payDate ? new Date(payDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-[8px] text-text-muted uppercase font-black mb-1">Transaction UTR</div>
                                            <div className="font-mono font-black text-accent select-all tracking-wider uppercase break-all">
                                              {utr || '—'}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-[8px] text-text-muted uppercase font-black mb-1">Paid By</div>
                                            <div className="text-text-primary font-black uppercase tracking-wider break-all text-[9px]">
                                              {paidBy || '—'}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-[8px] text-text-muted uppercase font-black mb-1.5">Verification Document</div>
                                            {proofUrl ? (
                                              <a
                                                href={proofUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-white border border-accent/20 hover:border-accent rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                              >
                                                📄 View Proof
                                              </a>
                                            ) : (
                                              <span className="text-text-muted font-bold italic">No proof uploaded</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
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
                );
              })()}

              <div className="bg-bg-input p-6 rounded-[2.5rem] border border-border shadow-inner">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3 ml-2">Summary</p>
                <p className="text-sm text-text-secondary leading-relaxed italic border-l-4 border-accent pl-5">
                  "{refundToRender.summary}"
                </p>
              </div>

              {refundToRender.documentLink && (
                <div className="bg-bg-input p-6 rounded-[2.5rem] border border-border shadow-inner mt-4">
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3 ml-2">Supporting Document / Proof</p>
                  <a
                    href={refundToRender.documentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-accent-hover transition-all active:scale-95 shadow-sm"
                  >
                    <Eye size={14} /> View Supporting Document
                  </a>
                </div>
              )}


            </div>
          )
        })()}
      </Modal>
    </div>
  );
};

export default AdminPanelTab;
