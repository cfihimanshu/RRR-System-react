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
    <div className="section active w-full pb-10 px-4">
      <div className="section-header flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Accountant Dashboard</h2>
      
        </div>
      </div>

      <div className="card w-full shadow-md border border-gray-200 overflow-hidden" style={{ borderTop: '4px solid #34a853', padding: '0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #eee', background: '#fff' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#444' }}>Queue: Ready for Payment</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Bank Details</th>
                <th>Amount</th>
                <th>Request Details</th>
                <th>Action</th>
                <th>Payment Proof</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted">No pending payments</td></tr>
              ) : refunds.map(r => (
                <tr key={r._id}>
                  <td><span className="case-id-display">{r.caseId}</span></td>
                  <td>
                    <div><strong>Bank:</strong> {r.bankName}</div>
                    <div><strong>A/C:</strong> {r.accNum} ({r.accType})</div>
                    <div><strong>IFSC:</strong> {r.ifsc}</div>
                    <div><strong>Holder:</strong> {r.accHolder}</div>
                  </td>
                  <td><strong>₹{r.amount}</strong></td>
                  <td>
                    <div>Req By: {r.requestedBy}</div>
                    <div>Appr By: {r.approvedBy}</div>
                    <div style={{fontSize: '11px', color: '#5f6368', marginTop: '4px'}}>{r.summary}</div>
                  </td>
                  <td>
                    <button 
                      className={`btn btn-sm ${paymentData.paymentProof ? 'btn-success' : 'bg-gray-400 cursor-not-allowed opacity-50'}`} 
                      onClick={() => { 
                        if(!paymentData.paymentProof) return toast.error('Please upload proof first');
                        setSelectedRefund(r); 
                        setModalOpen(true); 
                      }}
                    >
                      Mark Paid
                    </button>
                  </td>
                  <td>
                    <div className="flex flex-col items-center gap-2">
                      {paymentData.paymentProof ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 bg-green-50 rounded border border-green-200 flex items-center justify-center text-green-600">
                            <CheckCircle size={20} />
                          </div>
                          <button 
                            onClick={() => setPaymentData({...paymentData, paymentProof: ''})}
                            className="text-[10px] text-red-500 hover:underline font-bold uppercase"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-full max-w-[150px]">
                          <FileUpload 
                            onUploadSuccess={(url) => setPaymentData({...paymentData, paymentProof: url})} 
                            label="Upload Screenshot"
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

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Confirm Payment Dispatch">
        <div className="field">
          <label className="required">Transaction ID / UTR</label>
          <input type="text" value={paymentData.transactionId} onChange={e => setPaymentData({...paymentData, transactionId: e.target.value})} required />
        </div>
        <div className="field" style={{marginTop: '10px'}}>
          <label className="required">Payment Date</label>
          <input type="date" value={paymentData.paymentDate} onChange={e => setPaymentData({...paymentData, paymentDate: e.target.value})} required />
        </div>
        <div className="btn-row">
          <button className="btn btn-success" onClick={handleMarkPaid}>Submit Payment Info</button>
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
        </div>
      </Modal>

      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="Payment Confirmed">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Payment Successfully Processed!</h3>
          <p className="text-gray-500 mb-4">The refund has been marked as paid in the database.</p>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 inline-block px-8">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Confirmed UTR / Transaction ID</p>
            <p className="text-lg font-mono font-bold text-blue-700">{lastUTR}</p>
          </div>
          <div className="mt-8">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-10 rounded-lg shadow-md transition-all" onClick={() => setIsSuccessModalOpen(false)}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AccountantDashTab;
