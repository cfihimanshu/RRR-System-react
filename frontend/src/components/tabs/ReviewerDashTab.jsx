import React, { useState, useEffect, useContext } from 'react';
import FilePreviewModal from '../shared/FilePreviewModal';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';

const ReviewerDashTab = () => {
  const [refunds, setRefunds] = useState([]);
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');

  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [remark, setRemark] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [expandedCases, setExpandedCases] = useState({});
  const [expandedInst, setExpandedInst] = useState({});

  const toggleInstExpand = (idx) => {
    setExpandedInst(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleCaseExpand = (caseId) => {
    setExpandedCases(prev => ({ ...prev, [caseId]: !prev[caseId] }));
  };

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

  const [activeTab, setActiveTab] = useState('pending');

  const fetchRefunds = async () => {
    try {
      const res = await api.get('/refunds');
      setRefunds(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const isReviewer = user?.role === 'Reviewer';

  const filteredRefunds = React.useMemo(() => {
    return refunds.filter(r => {
      const statusLower = r.status?.toLowerCase();
      if (activeTab === 'pending') {
        return statusLower === 'pending review';
      }
      if (activeTab === 'approved') {
        if (!isReviewer) {
          return ['paid', 'pending payment', 'pending admin approval'].includes(statusLower);
        }
        const isReviewedByMe = !!r.reviewedBy && r.reviewedBy.toLowerCase() === user?.email?.toLowerCase() && statusLower !== 'rejected';
        const isPastApproved = (!r.reviewedBy || r.reviewedBy.trim() === '') && ['paid', 'pending payment', 'pending admin approval'].includes(statusLower);
        return isReviewedByMe || isPastApproved;
      }
      if (activeTab === 'rejected') {
        if (!isReviewer) {
          return statusLower === 'rejected';
        }
        const isRejectedByMe = statusLower === 'rejected' && r.reviewedBy.toLowerCase() === user?.email?.toLowerCase();
        const isPastRejected = statusLower === 'rejected' && (!r.reviewedBy || r.reviewedBy.trim() === '');
        return isRejectedByMe || isPastRejected;
      }
      return false;
    });
  }, [refunds, activeTab, user?.email, isReviewer]);

  const handleApprove = async (id) => {
    try {
      await api.put(`/refunds/${id}`, {
        status: 'Pending Admin Approval',
        approvedBy: user.email,
        reviewedBy: user.email,        // track reviewer for "My Approved" tab
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

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { id: 'pending', label: 'Pending Review', activeColor: 'bg-accent text-white shadow-lg shadow-orange-950/20' },
          { id: 'approved', label: isReviewer ? 'My Approved' : 'Approved Requests', activeColor: 'bg-green text-white shadow-lg shadow-green-950/20' },
          { id: 'rejected', label: isReviewer ? 'My Rejected' : 'Rejected Requests', activeColor: 'bg-red text-white shadow-lg shadow-red-950/20' }
        ].map(tab => {
          const count = refunds.filter(r => {
            const statusLower = r.status?.toLowerCase();
            if (tab.id === 'pending') return statusLower === 'pending review';
            if (tab.id === 'approved') {
              if (!isReviewer) {
                return ['paid', 'pending payment', 'pending admin approval'].includes(statusLower);
              }
              const isReviewedByMe = !!r.reviewedBy && r.reviewedBy.toLowerCase() === user?.email?.toLowerCase() && statusLower !== 'rejected';
              const isPastApproved = (!r.reviewedBy || r.reviewedBy.trim() === '') && ['paid', 'pending payment', 'pending admin approval'].includes(statusLower);
              return isReviewedByMe || isPastApproved;
            }
            if (tab.id === 'rejected') {
              if (!isReviewer) {
                return statusLower === 'rejected';
              }
              const isRejectedByMe = statusLower === 'rejected' && r.reviewedBy.toLowerCase() === user?.email?.toLowerCase();
              const isPastRejected = statusLower === 'rejected' && (!r.reviewedBy || r.reviewedBy.trim() === '');
              return isRejectedByMe || isPastRejected;
            }
            return false;
          }).length;

          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 active:scale-95 ${isActive
                ? tab.activeColor
                : 'bg-bg-secondary text-text-secondary border-2 border-border hover:bg-bg-card'
                }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-bg-input text-text-muted border border-border'
                }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-bg-secondary rounded-2xl shadow-sm border-2 border-border overflow-hidden mb-10">
        <div className="p-6 border-b border-border bg-bg-card flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${activeTab === 'pending' ? 'bg-yellow-soft text-yellow' : activeTab === 'approved' ? 'bg-green-soft text-green' : 'bg-red-soft text-red'
            }`}>
            {activeTab === 'pending' ? '⚖️' : activeTab === 'approved' ? '✅' : '❌'}
          </div>
          <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">
            {activeTab === 'pending' ? 'Pending for Review' : activeTab === 'approved' ? (isReviewer ? 'Approved by Me' : 'Approved Requests') : (isReviewer ? 'Rejected by Me' : 'Rejected Requests')}
          </h3>
        </div>

        <div className="table-wrap overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-bg-input text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                <th className="px-6 py-5">Case Id</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Refund Requested By</th>
                <th className="px-6 py-5">Bank Details</th>
                <th className="px-6 py-5">Details</th>
                <th className="px-6 py-5 min-w-[200px]">Summary</th>
                <th className="px-6 py-5 text-center">Document</th>
                <th className="px-6 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-text-secondary divide-y divide-border/50">
              {filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <div className="p-6 bg-bg-input rounded-full">
                        <span className="text-4xl">💎</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                        No {activeTab} reviews recorded
                      </span>
                    </div>
                  </td>
                </tr>
              ) : groupRefundsByCase(filteredRefunds).map(g => {
                const isExpanded = !!expandedCases[g.caseId];
                if (g.requests.length === 1) {
                  const r = g.requests[0];
                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-bg-input/40 cursor-pointer transition-all bg-bg-card font-bold select-none"
                      onClick={() => { setSelectedRefund(r); setExpandedInst({}); setIsDetailOpen(true); }}
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-start gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/case-master', { state: { searchId: g.caseId } }); }}
                            className="bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-soft hover:bg-accent hover:text-white transition-all shadow-sm"
                          >
                            {g.caseId}
                          </button>
                          {g.companyName && (
                            <span className="text-[10px] text-text-muted font-bold tracking-normal normal-case ml-1 mt-0.5">{g.companyName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-black text-green text-sm tracking-tight">
                        <div>₹{Number(r.amount).toLocaleString('en-IN')}</div>
                        <div className="text-[9px] text-text-muted font-bold mt-1 uppercase tracking-wider">
                          {r.installments && r.installments.length > 0
                            ? `${r.installments.length} Installment${r.installments.length > 1 ? 's' : ''}`
                            : '1 Installment'}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-black text-text-primary uppercase text-[10px] tracking-wider">
                        {r.requestedByName || r.requestedBy}
                      </td>
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
                      <td className="px-6 py-5 text-text-muted leading-relaxed font-medium italic max-w-md whitespace-pre-wrap">"{r.summary}"</td>
                      <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                        {r.documentLink ? (
                          <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFileUrl(r.documentLink);
                                setPreviewFileName('Supporting Document');
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-accent-hover transition-all active:scale-95 shadow-sm text-left"
                            >
                              <Eye size={12} /> View Doc
                            </button>
                        ) : (
                          <span className="text-[9px] text-text-muted font-bold">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                        {activeTab === 'pending' ? (
                          <div className="flex justify-center gap-3">
                            <button className="bg-green hover:bg-green-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-sm uppercase tracking-widest transition-all active:scale-95" onClick={() => handleApprove(r._id)}>Approve</button>
                            <button className="bg-red hover:bg-red-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-sm uppercase tracking-widest transition-all active:scale-95" onClick={() => { setSelectedRefund(r); setModalOpen(true); }}>Reject</button>
                          </div>
                        ) : (
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${r.status === 'Paid'
                            ? 'bg-green-soft text-green border-green-soft'
                            : r.status === 'Rejected'
                              ? 'bg-red-soft text-red border-red-soft'
                              : 'bg-yellow-soft text-yellow border-yellow-soft'
                            }`}>
                            {r.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }
                return (
                  <React.Fragment key={g.caseId}>
                    {/* Parent Row */}
                    <tr
                      className="hover:bg-bg-input/40 cursor-pointer transition-all bg-bg-card font-bold select-none"
                      onClick={() => toggleCaseExpand(g.caseId)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-start gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/case-master', { state: { searchId: g.caseId } }); }}
                            className="bg-accent-soft text-accent px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-soft hover:bg-accent hover:text-white transition-all shadow-sm"
                          >
                            <span className="mr-1">{isExpanded ? '▼' : '▶'}</span> {g.caseId}
                          </button>
                          {g.companyName && (
                            <span className="text-[10px] text-text-muted font-bold tracking-normal normal-case ml-1 mt-0.5">{g.companyName}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-black text-green text-sm tracking-tight">₹{Number(g.totalAmount).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-5 font-black text-text-primary uppercase text-[10px] tracking-wider">
                        {g.requests.length === 1 ? (g.requests[0].requestedByName || g.requests[0].requestedBy) : 'Multiple Requesters'}
                      </td>
                      <td className="px-6 py-5 text-text-muted font-bold" colSpan="4">
                        <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider mr-2">
                          {g.requests.length} Requests
                        </span>
                        <span>Click to view individual details</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                          {isExpanded ? 'Hide Requests' : 'Show Requests'}
                        </span>
                      </td>
                    </tr>
                    {/* Expanded child request rows */}
                    {isExpanded && g.requests.map((r, idx) => (
                      <tr
                        key={r._id}
                        className="bg-bg-input/20 hover:bg-bg-input/35 transition-all border-l-4 border-accent cursor-pointer"
                        onClick={() => { setSelectedRefund(r); setExpandedInst({}); setIsDetailOpen(true); }}
                      >
                        <td className="px-6 py-5 text-text-muted font-bold pl-8">
                          Request #{idx + 1}
                        </td>
                        <td className="px-6 py-5 font-black text-green text-sm tracking-tight">
                          <div>₹{Number(r.amount).toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-text-muted font-bold mt-1 uppercase tracking-wider">
                            {r.installments && r.installments.length > 0
                              ? `${r.installments.length} Installment${r.installments.length > 1 ? 's' : ''}`
                              : '1 Installment'}
                          </div>
                        </td>
                        <td className="px-6 py-5 font-black text-text-primary uppercase text-[10px] tracking-wider">
                          {r.requestedByName || r.requestedBy}
                        </td>
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
                        <td className="px-6 py-5 text-text-muted leading-relaxed font-medium italic max-w-md whitespace-pre-wrap">"{r.summary}"</td>
                        {/* Document Link Column */}
                        <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                          {r.documentLink ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFileUrl(r.documentLink);
                                setPreviewFileName('Supporting Document');
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-accent-hover transition-all active:scale-95 shadow-sm text-left"
                            >
                              <Eye size={12} /> View Doc
                            </button>
                          ) : (
                            <span className="text-[9px] text-text-muted font-bold">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                          {activeTab === 'pending' ? (
                            <div className="flex justify-center gap-3">
                              <button className="bg-green hover:bg-green-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-sm uppercase tracking-widest transition-all active:scale-95" onClick={() => handleApprove(r._id)}>Approve</button>
                              <button className="bg-red hover:bg-red-600 text-white text-[9px] font-black py-2 px-5 rounded-xl shadow-sm uppercase tracking-widest transition-all active:scale-95" onClick={() => { setSelectedRefund(r); setModalOpen(true); }}>Reject</button>
                            </div>
                          ) : (
                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${r.status === 'Paid'
                              ? 'bg-green-soft text-green border-green-soft'
                              : r.status === 'Rejected'
                                ? 'bg-red-soft text-red border-red-soft'
                                : 'bg-yellow-soft text-yellow border-yellow-soft'
                              }`}>
                              {r.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
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
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Case ID</p>
                <p className="font-black text-accent text-sm tracking-tighter uppercase">{selectedRefund.caseId}</p>
                {selectedRefund.companyName && (
                  <p className="text-[10px] text-text-muted font-bold tracking-normal normal-case mt-1">{selectedRefund.companyName}</p>
                )}
              </div>
              <div className="bg-bg-input p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Amount</p>
                <p className="font-black text-green text-sm tracking-tight">₹{Number(selectedRefund.amount).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-bg-input p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Refund Requested By</p>
                <p className="text-text-primary font-black uppercase text-[10px] tracking-widest break-all">
                  {selectedRefund.requestedByName || selectedRefund.requestedBy}
                </p>
              </div>
              <div className="bg-bg-input p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-2">Status</p>
                <p className="font-black text-orange-400 uppercase text-[10px] tracking-widest">{selectedRefund.status}</p>
              </div>
            </div>

            <div className="bg-bg-secondary rounded-2xl border-2 border-border overflow-hidden shadow-sm">
              <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                Bank Details
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-sm">
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Bank Name</p>
                  <p className="font-black text-text-primary uppercase tracking-tight">{selectedRefund.bankName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Account Holder</p>
                  <p className="font-black text-text-primary uppercase tracking-tight">{selectedRefund.accHolder}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Account Number</p>
                  <p className="font-mono font-black text-accent select-all">{selectedRefund.accNum}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">IFSC Code</p>
                  <p className="font-mono font-black text-accent select-all">{selectedRefund.ifsc}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Account Type</p>
                  <p className="text-text-secondary font-bold uppercase text-[10px]">{selectedRefund.accType}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-1">Branch Name</p>
                  <p className="text-text-secondary font-bold uppercase text-[10px]">{selectedRefund.branch}</p>
                </div>
              </div>
            </div>

            {selectedRefund.installments && selectedRefund.installments.length > 0 ? (
              <div className="bg-bg-secondary rounded-2xl border-2 border-border overflow-hidden shadow-sm">
                <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                  Installments Details(Click for More Details)
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-input text-text-muted text-[9px] font-black uppercase tracking-widest border-b border-border">
                        <th className="px-6 py-4">S.No</th>
                        <th className="px-6 py-4">Expected Date</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] text-text-secondary divide-y divide-border/50">
                      {selectedRefund.installments.map((inst, i) => {
                        const isInstExpanded = !!expandedInst[i];
                        const isInstPaid = inst.status?.toLowerCase() === 'paid' ||
                          selectedRefund.status?.toLowerCase() === 'paid' ||
                          (selectedRefund.installments.length <= 1 && (selectedRefund.status?.toLowerCase() === 'paid' || (selectedRefund.transactionId && selectedRefund.paymentProof)));

                        const pDate = inst.paymentDate || (isInstPaid ? selectedRefund.paymentDate : '');
                        const txId = inst.transactionId || (isInstPaid ? selectedRefund.transactionId : '');
                        const pProof = inst.paymentProof || (isInstPaid ? selectedRefund.paymentProof : '');

                        return (
                          <React.Fragment key={i}>
                            <tr
                              className="hover:bg-bg-input/50 cursor-pointer transition-all select-none"
                              onClick={() => toggleInstExpand(i)}
                            >
                              <td className="px-6 py-4 font-black">
                                <span className="mr-1.5 text-[8px] text-accent inline-block transition-transform duration-200" style={{ transform: isInstExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                #{i + 1}
                              </td>
                              <td className="px-6 py-4 font-bold">{inst.dueDate}</td>
                              <td className="px-6 py-4 font-black text-green">₹{Number(inst.amount).toLocaleString('en-IN')}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isInstPaid
                                  ? 'bg-green-soft text-green'
                                  : inst.status === 'Due'
                                    ? 'bg-red-soft text-red'
                                    : 'bg-yellow-soft text-yellow'
                                  }`}>
                                  {isInstPaid ? 'Paid' : (inst.status || 'Pending')}
                                </span>
                              </td>
                            </tr>
                            {isInstExpanded && (
                              <tr className="bg-bg-input/20">
                                <td colSpan="4" className="px-8 py-4 border-l-4 border-accent">
                                  {isInstPaid ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs py-2">
                                      <div>
                                        <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-1">Payment Date</p>
                                        <p className="font-bold text-text-primary">{pDate || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-1">UTR / Transaction ID</p>
                                        <p className="font-mono font-bold text-accent select-all">{txId || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-1">Payment Proof</p>
                                        {pProof ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPreviewFileUrl(pProof);
                                              setPreviewFileName('Payment Proof');
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green text-white rounded-xl text-[8px] font-black uppercase tracking-wider hover:bg-green-600 transition-all active:scale-95 shadow-sm text-left"
                                          >
                                            <Eye size={10} /> View Proof
                                          </button>
                                        ) : (
                                          <p className="text-text-muted italic text-[10px]">No proof uploaded</p>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[9px] text-text-muted font-black uppercase tracking-widest italic py-1">
                                      This installment is not paid yet.
                                    </p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-bg-secondary rounded-2xl border-2 border-border overflow-hidden shadow-sm">
                <div className="bg-bg-card px-6 py-4 border-b border-border font-black text-text-muted text-[10px] uppercase tracking-[0.2em]">
                  Payment Details (Single Payment)
                </div>
                <div className="p-6">
                  {selectedRefund.status === 'Paid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                      <div>
                        <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">Payment Date</p>
                        <p className="font-black text-text-primary">{selectedRefund.paymentDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">UTR / Transaction ID</p>
                        <p className="font-mono font-black text-accent select-all">{selectedRefund.transactionId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mb-1">Payment Proof</p>
                        {selectedRefund.paymentProof ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFileUrl(selectedRefund.paymentProof);
                              setPreviewFileName('Payment Proof');
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-green-600 transition-all active:scale-95 shadow-sm text-left"
                          >
                            <Eye size={12} /> View Proof
                          </button>
                        ) : (
                          <p className="text-text-muted italic">No proof uploaded</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-center py-4">
                      No installments scheduled & Payment is not processed yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-bg-input p-6 rounded-2xl border border-border shadow-inner">
              <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3 ml-2">Narrative</p>
              <p className="text-sm text-text-secondary leading-relaxed italic border-l-4 border-accent pl-5">
                "{selectedRefund.summary}"
              </p>
            </div>

            {selectedRefund.documentLink && (
              <div className="bg-bg-input p-6 rounded-2xl border border-border shadow-inner">
                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mb-3 ml-2">Supporting Document / Proof</p>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewFileUrl(selectedRefund.documentLink);
                    setPreviewFileName('Supporting Document');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-accent-hover transition-all active:scale-95 shadow-sm"
                >
                  <Eye size={14} /> View Supporting Document
                </button>
              </div>
            )}

            {/* <div className="flex gap-4 justify-end mt-4">
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
            </div> */}
          </div>
        )}
      </Modal>

      <FilePreviewModal
        isOpen={!!previewFileUrl}
        onClose={() => setPreviewFileUrl(null)}
        fileUrl={previewFileUrl}
        fileName={previewFileName}
      />
    </div>
  );
};

export default ReviewerDashTab;
