import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { AuthContext } from '../../context/AuthContext';

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
        status: 'Approved', // Backend will convert this to 'Pending Payment' because role is Admin
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

  const inputClass = "w-full border border-gray-300 rounded p-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="h-full bg-gray-50 p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        <p className="text-xs text-gray-500 mt-1">Approve refunds and create users</p>
      </div>

      {/* SECTION 1: Refund Requests & Approvals */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 max-w-7xl">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-orange-500 font-bold">💰</span>
          <h2 className="text-[14px] font-bold text-gray-800">Pending Refund Approvals</h2>
        </div>
        
        <div className="table-wrap">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white text-[10px] font-bold tracking-wider uppercase">
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Case ID</th>
                <th className="px-4 py-3 text-center">Amount</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3 text-center">Action / Status</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
              {pendingRefunds.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-500 font-medium">
                    No refunds pending for Admin approval.
                  </td>
                </tr>
              ) : (
                pendingRefunds.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.timestamp).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => { setSelectedRefund(r); setIsDetailOpen(true); }}
                        className="font-semibold text-blue-600 hover:underline hover:text-blue-800 cursor-pointer text-left"
                      >
                        {r.caseId}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">
                      ₹{r.amount}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.requestedBy}</td>
                    <td className="px-4 py-3 text-center align-top">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleApproveRefund(r._id)} className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-sm uppercase tracking-wide">Approve</button>
                        <button onClick={() => handleRejectRefund(r._id)} className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow-sm uppercase tracking-wide">Reject</button>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-6xl">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-blue-600 font-bold">👤</span>
          <h2 className="text-[14px] font-bold text-gray-800">Create New User</h2>
        </div>
        
        <form className="p-6" onSubmit={handleCreateUser}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className={labelClass}>FULL NAME</label>
              <input 
                type="text" 
                className={inputClass} 
                placeholder="Full Name" 
                value={formData.fullName} 
                onChange={e => setFormData({...formData, fullName: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className={labelClass}>EMAIL</label>
              <input 
                type="email" 
                className={inputClass} 
                placeholder="user@company.com" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                required 
              />
            </div>
            <div>
              <label className={labelClass}>PASSWORD</label>
              <input 
                type="text" 
                className={inputClass} 
                placeholder="Temporary password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                required 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <label className={labelClass}>ROLE</label>
              <select 
                className={inputClass} 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})} 
                required
              >
                <option value="Admin">Admin</option>
                <option value="Operations">Operations</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Accountant">Accountant</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow-sm transition-colors text-[13px]">
                Create User
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Detail View Modal for Admin */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Refund Request Full Details">
        {selectedRefund && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Case ID</p>
                <p className="font-bold text-blue-700">{selectedRefund.caseId}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Amount</p>
                <p className="font-bold text-gray-900">₹{selectedRefund.amount}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Requested By</p>
                <p className="text-gray-700">{selectedRefund.requestedBy}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Status</p>
                <p className="font-semibold text-orange-600">{selectedRefund.status}</p>
              </div>
            </div>

            <div className="border border-blue-100 rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 font-bold text-blue-800 text-xs uppercase">
                Bank & Account Information
              </div>
              <div className="p-4 grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 font-bold">Bank Name</p>
                  <p className="font-semibold">{selectedRefund.bankName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold">Account Holder</p>
                  <p className="font-semibold">{selectedRefund.accHolder}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold">Account Number</p>
                  <p className="font-mono">{selectedRefund.accNum}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold">IFSC Code</p>
                  <p className="font-mono">{selectedRefund.ifsc}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold">Account Type</p>
                  <p>{selectedRefund.accType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold">Branch</p>
                  <p>{selectedRefund.branch}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Summary / Reason</p>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "{selectedRefund.summary}"
              </p>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button 
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow-sm text-sm"
                onClick={() => { setIsDetailOpen(false); handleApproveRefund(selectedRefund._id); }}
              >
                Approve Now
              </button>
              <button 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded shadow-sm text-sm"
                onClick={() => { setIsDetailOpen(false); handleRejectRefund(selectedRefund._id); }}
              >
                Reject Request
              </button>
              <button className="btn btn-outline" onClick={() => setIsDetailOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPanelTab;
