import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { AuthContext } from '../../context/AuthContext';

const ReviewerDashTab = () => {
  const [refunds, setRefunds] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [remark, setRemark] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { user } = useContext(AuthContext);

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
        status: 'Approved',
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
    <div className="section active w-full pb-10 px-4">
      <div className="section-header flex justify-between items-center mb-6">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-gray-800">Reviewer Dashboard</h2>
          
        </div>
      </div>

      <div className="card w-full shadow-md border border-gray-200 overflow-hidden" style={{ borderTop: '4px solid #fbbc04', padding: '0', width: '100%' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #eee', background: '#fff' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#444' }}>Queue: Pending for Review</h3>
        </div>

        <div className="table-wrap">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: '#2557a7', color: '#fff' }}>
                <th style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Case ID</th>
                <th style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Bank Info</th>
                <th style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Account Details</th>
                <th style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Summary / Reason</th>
                <th style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-gray-700">
              {refunds.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-medium">
                    No pending refunds for review.
                  </td>
                </tr>
              ) : refunds.map(r => (
                <tr key={r._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => { setSelectedRefund(r); setIsDetailOpen(true); }}
                      className="font-bold text-blue-700 hover:underline hover:text-blue-900 cursor-pointer text-left"
                    >
                      {r.caseId}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900 text-sm">₹{r.amount}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.bankName}</div>
                    <div className="text-gray-500">IFSC: {r.ifsc}</div>
                    <div className="text-gray-500">Branch: {r.branch}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.accHolder}</div>
                    <div className="text-gray-600">A/C: {r.accNum}</div>
                    <div className="text-gray-500">Type: {r.accType}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">{r.summary}</td>
                  <td className="px-4 py-3">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn btn-sm btn-success" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => handleApprove(r._id)}>Approve</button>
                      <button className="btn btn-sm btn-danger" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => { setSelectedRefund(r); setModalOpen(true); }}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Reject Refund Request">
        <div className="field">
          <label className="required">Reason for Rejection</label>
          <textarea value={remark} onChange={e => setRemark(e.target.value)} required></textarea>
        </div>
        <div className="btn-row">
          <button className="btn btn-danger" onClick={handleReject}>Confirm Reject</button>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
        </div>
      </Modal>
      
      {/* Detail View Modal */}
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
                onClick={() => { setIsDetailOpen(false); handleApprove(selectedRefund._id); }}
              >
                Approve Now
              </button>
              <button 
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded shadow-sm text-sm"
                onClick={() => { setIsDetailOpen(false); setModalOpen(true); }}
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

export default ReviewerDashTab;
