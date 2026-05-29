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
  FileText,
  Edit,
  MapPin,
  Send,
  Download
} from 'lucide-react';

import { useLocation } from 'react-router-dom';
import TourTab from './TourTab';
import * as XLSX from 'xlsx';

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
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const { user } = useContext(AuthContext);

  const [expandedCases, setExpandedCases] = useState({});
  const [editingRefund, setEditingRefund] = useState(null);
  const [summary, setSummary] = useState('');
  const [bankName, setBankName] = useState('');
  const [accHolder, setAccHolder] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accNum, setAccNum] = useState('');
  const [branch, setBranch] = useState('');
  const [accType, setAccType] = useState('Saving');
  const [paymentMethod, setPaymentMethod] = useState('Bank');
  const [upiQrLink, setUpiQrLink] = useState('');
  const containerRef = React.useRef(null);
  const [activeRequestType, setActiveRequestType] = useState(null);

  const [tourFormData, setTourFormData] = useState({
    purpose: '',
    startDate: '',
    endDate: '',
    destinationFrom: '',
    destinationTo: '',
    distanceKm: '',
    totalTravelAmount: 0,
    travellingBy: 'by car (personal)',
    food: {
      breakfast: false,
      lunch: false,
      dinner: false
    },
    foodAmounts: {
      breakfast: '',
      lunch: '',
      dinner: ''
    },
    hotelExpense: '',
    otherExpenses: [{ name: '', amount: '' }],
    details: ''
  });

  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: '',
    emergencyContact: ''
  });

  const [customLeaveType, setCustomLeaveType] = useState('');

  // Attendance Calendar States
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [attendanceReports, setAttendanceReports] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]);

  const fetchAllUsersForCalendar = async () => {
    try {
      const res = await api.get('/users');
      const nonAdmins = (res.data || []).filter(
        (u) => !['Admin', 'Super Admin', 'SuperAdmin'].includes(u.role)
      );
      setAllUsers(nonAdmins);
      if (nonAdmins.length > 0) {
        setSelectedUserEmail(nonAdmins[0].email);
      }
    } catch (err) {
      console.error("Error fetching users for calendar:", err);
    }
  };

  const fetchAttendanceReports = async (email) => {
    if (!email) return;
    try {
      const res = await api.get(`/reports?userEmail=${email}&limit=1000&light=true`);
      setAttendanceReports(res.data.reports || []);
    } catch (err) {
      console.error("Error fetching attendance reports:", err);
    }
  };

  const handleExportAttendance = () => {
    const userName = ['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role)
      ? (allUsers.find(u => u.email === selectedUserEmail)?.fullName || selectedUserEmail)
      : (user?.fullName || user?.name || user?.email);

    const emailToExport = ['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role)
      ? selectedUserEmail
      : user?.email;

    if (!emailToExport) {
      toast.error('No user selected for export');
      return;
    }

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const data = [];
    const todayIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const todayKey = todayIST.toISOString().split('T')[0];

    for (let d = 1; d <= totalDays; d++) {
      const day = new Date(year, month, d);
      const isSunday = day.getDay() === 0;
      const yearStr = day.getFullYear();
      const monthStr = String(day.getMonth() + 1).padStart(2, '0');
      const dateStr = String(day.getDate()).padStart(2, '0');
      const dayKey = `${yearStr}-${monthStr}-${dateStr}`;

      const sodReport = attendanceReports.find(r => r.date === dayKey && r.type === 'SOD');
      const eodReport = attendanceReports.find(r => r.date === dayKey && r.type === 'EOD');
      const hasApprovedLeave = leaves.some(l =>
        l.requestedBy === emailToExport &&
        l.status === 'Approved' &&
        l.startDate <= dayKey &&
        dayKey <= l.endDate
      );

      let status = 'Absent';
      if (isSunday) {
        status = 'Off Day';
      } else if (hasApprovedLeave) {
        status = 'Leave';
      } else if (sodReport) {
        status = 'Present';
      } else if (dayKey > todayKey) {
        status = 'Scheduled';
      }

      data.push({
        'Date': dayKey,
        'Day': day.toLocaleDateString('en-US', { weekday: 'long' }),
        'Status': status,
        'Check-In': sodReport?.checkInTime || '',
        'Check-Out': eodReport?.checkOutTime || '',
        'Duration': eodReport?.workDuration || '',
        'Work Summary': (eodReport?.workSummary || sodReport?.plannedTasks || '').replace(/\n/g, ' ')
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    // Auto-size columns
    const headers = ['Date', 'Day', 'Status', 'Check-In', 'Check-Out', 'Duration', 'Work Summary'];
    const maxWidths = headers.map(h => ({ wch: h.length + 5 }));
    data.forEach(row => {
      Object.values(row).forEach((val, i) => {
        const len = val ? val.toString().length : 0;
        if (len + 2 > maxWidths[i].wch) maxWidths[i].wch = len + 2;
      });
    });
    worksheet['!cols'] = maxWidths;

    const monthName = calendarDate.toLocaleString('default', { month: 'long' });
    XLSX.writeFile(workbook, `Attendance_${userName.replace(/\s+/g, '_')}_${monthName}_${year}.xlsx`);
    toast.success('Attendance exported successfully!');
  };

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const rawDay = firstDay.getDay();
    const startOffset = rawDay === 0 ? 6 : rawDay - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const handleDistanceChange = (val) => {
    const km = parseFloat(val) || 0;
    setTourFormData(prev => ({
      ...prev,
      distanceKm: val,
      totalTravelAmount: km * 10
    }));
  };

  const addOtherExpense = () => {
    setTourFormData(prev => ({
      ...prev,
      otherExpenses: [...prev.otherExpenses, { name: '', amount: '' }]
    }));
  };

  const removeOtherExpense = (index) => {
    setTourFormData(prev => ({
      ...prev,
      otherExpenses: prev.otherExpenses.filter((_, i) => i !== index)
    }));
  };

  const handleOtherExpenseChange = (index, field, value) => {
    setTourFormData(prev => {
      const updated = [...prev.otherExpenses];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, otherExpenses: updated };
    });
  };

  const handleTourSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tours', tourFormData);
      toast.success("Tour Request submitted successfully!", {
        style: { borderRadius: '15px', fontWeight: 'bold' }
      });
      setTourFormData({
        purpose: '',
        startDate: '',
        endDate: '',
        destinationFrom: '',
        destinationTo: '',
        distanceKm: '',
        totalTravelAmount: 0,
        travellingBy: 'by car (personal)',
        food: {
          breakfast: false,
          lunch: false,
          dinner: false
        },
        foodAmounts: {
          breakfast: '',
          lunch: '',
          dinner: ''
        },
        hotelExpense: '',
        otherExpenses: [{ name: '', amount: '' }],
        details: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit Tour Request");
      console.error(err);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...leaveFormData,
        leaveType: leaveFormData.leaveType === 'Other' ? customLeaveType : leaveFormData.leaveType
      };
      await api.post('/leaves', payload);
      toast.success("Leave Request submitted successfully!", {
        style: { borderRadius: '15px', fontWeight: 'bold' }
      });
      setLeaveFormData({
        leaveType: 'Casual Leave',
        startDate: '',
        endDate: '',
        reason: '',
        emergencyContact: ''
      });
      setCustomLeaveType('');
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit Leave Request");
      console.error(err);
    }
  };

  const handleStartEdit = (r) => {
    setActiveRequestType('Settlement');
    setEditingRefund(r);
    setSelectedCaseId(r.caseId || '');
    setTotalAmount(r.amount || '');
    setDocumentLink(r.documentLink || '');
    setInstallments(r.installments || []);
    setSummary(r.summary || '');
    setBankName(r.bankName || '');
    setAccHolder(r.accHolder || '');
    setIfsc(r.ifsc || '');
    setAccNum(r.accNum || '');
    setBranch(r.branch || '');
    setAccType(r.accType || 'Saving');

    if (r.accType === 'UPI' || r.bankName === 'UPI') {
      setPaymentMethod('UPI');
      setUpiQrLink('');
    } else if (r.accType === 'QR' || r.bankName === 'QR') {
      setPaymentMethod('QR');
      setUpiQrLink(r.branch !== 'N/A' ? r.branch : '');
    } else if (r.accType === 'Card' || r.bankName?.startsWith('CARD') || r.ifsc === 'CARD') {
      setPaymentMethod('Card');
    } else {
      setPaymentMethod('Bank');
    }

    // Smooth scroll the tab container to the top
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Also scroll the main layout container if applicable
    const mainScrollable = document.querySelector('.flex-1.overflow-auto');
    if (mainScrollable) {
      mainScrollable.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  useEffect(() => {
    if (location.state?.filter) {
      setStatusFilter(location.state.filter);
    }
    if (location.state?.activeRequestType) {
      setActiveRequestType(location.state.activeRequestType);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchDistance = async () => {
      const from = (tourFormData.destinationFrom || '').trim();
      const to = (tourFormData.destinationTo || '').trim();
      if (!from || !to) {
        setTourFormData(prev => ({
          ...prev,
          distanceKm: '',
          totalTravelAmount: 0
        }));
        return;
      }

      try {
        const res = await api.get('/distance', {
          params: { from, to }
        });
        if (res.data && res.data.success) {
          const km = res.data.distance_km;
          setTourFormData(prev => ({
            ...prev,
            distanceKm: km,
            totalTravelAmount: Math.round(km * 10)
          }));
        }
      } catch (err) {
        console.error("Error calculating distance:", err);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchDistance();
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [tourFormData.destinationFrom, tourFormData.destinationTo]);

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

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data);
    } catch (err) {
      console.error("Error fetching leave requests:", err);
    }
  };

  const handleLeaveStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/leaves/${id}/status`, { status: newStatus });
      toast.success(`Leave request ${newStatus.toLowerCase()} successfully!`);
      fetchLeaves();
      if (selectedUserEmail) {
        fetchAttendanceReports(selectedUserEmail);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update leave request status");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUserCases();
    fetchMyRefunds();
    fetchLeaves();
    if (['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role)) {
      fetchAllUsersForCalendar();
    } else if (user?.email) {
      setSelectedUserEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (selectedUserEmail) {
      fetchAttendanceReports(selectedUserEmail);
    }
  }, [selectedUserEmail]);

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

    // Filter out any empty installments before submitting
    const cleanedInstallments = installments.filter(inst => inst.amount && inst.dueDate);

    let finalBankName = bankName;
    let finalAccHolder = accHolder;
    let finalIfsc = ifsc;
    let finalAccNum = accNum;
    let finalBranch = branch;
    let finalAccType = accType;

    if (paymentMethod === 'UPI') {
      finalBankName = 'UPI';
      finalAccHolder = accHolder;
      finalIfsc = 'UPI';
      finalAccNum = accNum;
      finalBranch = 'N/A';
      finalAccType = 'UPI';
    } else if (paymentMethod === 'QR') {
      finalBankName = 'QR';
      finalAccHolder = accHolder;
      finalIfsc = 'QR';
      finalAccNum = 'QR Code';
      finalBranch = upiQrLink || 'N/A';
      finalAccType = 'QR';
    } else if (paymentMethod === 'Card') {
      finalBankName = bankName;
      finalAccHolder = accHolder;
      finalIfsc = 'CARD';
      finalAccNum = accNum;
      finalBranch = branch;
      finalAccType = 'Card';
    }

    const payload = {
      caseId: selectedCaseId,
      amount: totalAmount,
      summary,
      bankName: finalBankName,
      accHolder: finalAccHolder,
      ifsc: finalIfsc,
      accNum: finalAccNum,
      branch: finalBranch,
      accType: finalAccType,
      requestedByName: editingRefund ? editingRefund.requestedByName : (user?.fullName || ""),
      installments: cleanedInstallments,
      documentLink
    };

    console.log("Submitting Refund Payload:", payload);

    try {
      if (editingRefund) {
        // If editing, set status to Pending Review on update
        payload.status = 'Pending Review';
        await api.put(`/refunds/${editingRefund._id}`, payload);
        toast.success('Refund request updated successfully');
        setEditingRefund(null);
      } else {
        await api.post('/refunds', payload);
        toast.success('Refund request submitted successfully');
      }

      // Reset all form inputs and state
      e.target.reset();
      setSelectedCaseId('');
      setTotalAmount('');
      setInstallments([]);
      setDocumentLink('');
      setSummary('');
      setBankName('');
      setAccHolder('');
      setIfsc('');
      setAccNum('');
      setBranch('');
      setAccType('Saving');
      setPaymentMethod('Bank');
      setUpiQrLink('');
      fetchMyRefunds();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm("Are you sure you want to delete this refund request? This action cannot be undone.")) return;
    try {
      await api.delete(`/refunds/${id}`);
      toast.success("Refund request deleted successfully");
      fetchMyRefunds();
      if (selectedRefund && (selectedRefund._id === id || selectedRefund.parentRefundId === id)) {
        setSelectedRefund(null);
        setShowPaymentDetails(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete request");
    }
  };

  const handleDeleteInstallment = async (instIndex) => {
    if (!window.confirm("Are you sure you want to delete this installment?")) return;
    try {
      const updatedInstallments = selectedRefund.installments.filter((_, idx) => idx !== instIndex);
      const newAmount = updatedInstallments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);

      const res = await api.put(`/refunds/${selectedRefund._id}`, {
        installments: updatedInstallments,
        amount: String(newAmount)
      });

      toast.success("Installment deleted successfully");

      // Update selectedRefund and all refunds state
      setSelectedRefund(res.data);
      fetchMyRefunds();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete installment");
    }
  };

  const showRequesterColumn = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'SuperAdmin';

  const filteredRefunds = myRefunds.filter(r => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Paid') return r.status === 'Paid';
    if (statusFilter === 'Rejected') return r.status === 'Rejected';
    if (statusFilter === 'Pending') return !['Paid', 'Rejected'].includes(r.status);
    return true;
  });

  return (
    <div ref={containerRef} className="section active w-full pb-10 px-4 md:px-8 bg-bg-primary overflow-y-auto">
      {true && (
        <>
          <div className="section-header flex flex-col items-start gap-4 mb-8 pt-4">
            <div>
              <h2 className="text-3xl font-bold text-[#0b72b8] tracking-tight uppercase">
                Request
              </h2>
            </div>
            <div className="flex items-center justify-start gap-3">
              {['Tour', 'Settlement', 'Leave'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setActiveRequestType(type);
                    if (type !== 'Settlement') {
                      setEditingRefund(null);
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all border-2 cursor-pointer ${activeRequestType === type
                    ? 'bg-accent border-accent text-white shadow-lg active:scale-95'
                    : 'bg-bg-card border-border text-text-muted hover:text-text-primary hover:border-text-primary active:scale-95'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {activeRequestType === 'Settlement' && (
            <div className="bg-bg-card border-2 border-border rounded-2xl p-4 sm:p-10 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-green-soft rounded-2xl border border-green-soft/30 text-green">
                  <IndianRupee size={22} />
                </div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">
                  {editingRefund ? 'Edit Refund Request' : 'Settlement Request'}
                </h3>
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
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Amount (₹)</label>
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
                  {documentLink && (
                    <div className="mt-1 text-[9px] font-bold text-accent truncate">
                      Current: <a href={documentLink} target="_blank" rel="noopener noreferrer" className="underline">View Document</a>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 md:col-span-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2"> Summary / Reason</label>
                  <textarea
                    name="summary"
                    required
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Provide comprehensive reasoning for the credit disbursement..."
                    className="w-full bg-bg-input border-2 border-border rounded-xl p-6 text-sm font-medium text-text-primary outline-none focus:border-green focus:ring-4 focus:ring-green-soft transition-all shadow-inner resize-none italic placeholder:text-text-muted"
                  ></textarea>
                </div>
                <div className="flex flex-col gap-3 md:col-span-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Payment Method</label>
                  <div className="flex items-center justify-start gap-3">
                    {['Bank', 'UPI', 'Card', 'QR'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method);
                          setBankName('');
                          setAccHolder('');
                          setIfsc('');
                          setAccNum('');
                          setBranch('');
                          setAccType('Saving');
                          setUpiQrLink('');
                        }}
                        className={`px-5 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all border-2 cursor-pointer ${paymentMethod === method
                          ? 'bg-green border-green text-white shadow-lg active:scale-95'
                          : 'bg-bg-card border-border text-text-muted hover:text-text-primary hover:border-text-primary active:scale-95'
                          }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'Bank' && (
                  <>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Bank Name</label>
                      <input type="text" name="bankName" required value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="e.g. HDFC BANK" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Holder</label>
                      <input type="text" name="accHolder" required value={accHolder} onChange={(e) => setAccHolder(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="FULL NAME" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">IFSC Code</label>
                      <input type="text" name="ifsc" required value={ifsc} onChange={(e) => setIfsc(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-[0.2em] placeholder:text-text-muted" placeholder="" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Number</label>
                      <input type="text" name="accNum" required value={accNum} onChange={(e) => setAccNum(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner tracking-[0.1em] placeholder:text-text-muted" placeholder="" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Branch Location</label>
                      <input type="text" name="branch" required value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-gray text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="CITY" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Type</label>
                      <select name="accType" value={accType} onChange={(e) => setAccType(e.target.value)} required className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest">
                        <option value="Saving" className="bg-bg-secondary">Saving Account</option>
                        <option value="Current" className="bg-bg-secondary">Current Account</option>
                      </select>
                    </div>
                  </>
                )}

                {paymentMethod === 'UPI' && (
                  <>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">UPI ID</label>
                      <input type="text" name="accNum" required value={accNum} onChange={(e) => setAccNum(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner placeholder:text-text-muted" placeholder="e.g. name@okbank" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Holder Name</label>
                      <input type="text" name="accHolder" required value={accHolder} onChange={(e) => setAccHolder(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="FULL NAME" />
                    </div>
                  </>
                )}

                {paymentMethod === 'QR' && (
                  <>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Account Holder Name</label>
                      <input type="text" name="accHolder" required value={accHolder} onChange={(e) => setAccHolder(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="FULL NAME" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Upload QR Code</label>
                      <FileUpload
                        onUploadSuccess={setUpiQrLink}
                        label="Upload QR Code"
                        compact={true}
                      />
                      {upiQrLink && (
                        <div className="mt-1 text-[9px] font-bold text-accent truncate">
                          Current QR: <a href={upiQrLink} target="_blank" rel="noopener noreferrer" className="underline">View QR Code</a>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {paymentMethod === 'Card' && (
                  <>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Card Number</label>
                      <input type="text" name="accNum" required value={accNum} onChange={(e) => setAccNum(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner placeholder:text-text-muted" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Card Holder Name</label>
                      <input type="text" name="accHolder" required value={accHolder} onChange={(e) => setAccHolder(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="FULL NAME" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Card Network / Type</label>
                      <input type="text" name="bankName" required value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner uppercase tracking-widest placeholder:text-text-muted" placeholder="e.g. Visa, Mastercard, RuPay" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Expiry Date</label>
                      <input type="text" name="branch" required value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-black text-text-primary outline-none focus:border-green transition-all shadow-inner placeholder:text-text-muted" placeholder="MM/YY" />
                    </div>
                  </>
                )}



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
                    <CheckCircle size={18} /> {editingRefund ? 'Update Request' : 'Submit'}
                  </button>
                  {editingRefund && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRefund(null);
                        setSelectedCaseId('');
                        setTotalAmount('');
                        setInstallments([]);
                        setDocumentLink('');
                        setSummary('');
                        setBankName('');
                        setAccHolder('');
                        setIfsc('');
                        setAccNum('');
                        setBranch('');
                        setAccType('Saving');
                        setPaymentMethod('Bank');
                        setUpiQrLink('');
                      }}
                      className="w-full sm:w-auto bg-bg-card hover:bg-bg-card-hover text-text-primary border-2 border-border font-black py-4 px-12 rounded-2xl transition-all text-xs uppercase tracking-[0.2em] active:scale-95"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {activeRequestType === 'Tour' && (
            <TourTab user={user} api={api} />
          )}

          {activeRequestType === 'Leave' && (
            <div className="bg-bg-card border-2 border-border rounded-2xl p-4 sm:p-10 shadow-sm animate-zoom-in">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-purple-soft rounded-2xl border border-purple-soft/30 text-purple">
                  <CalendarDays size={22} />
                </div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">
                  Submit Leave Request
                </h3>
              </div>
              <form onSubmit={handleLeaveSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Leave Type</label>
                  <select
                    required
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] cursor-pointer"
                    value={leaveFormData.leaveType}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, leaveType: e.target.value })}
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Paid Leave">Paid Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {leaveFormData.leaveType === 'Other' && (
                  <div className="flex flex-col gap-3 animate-zoom-in">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Specify Leave Type <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Specify leave type..."
                      className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                      value={customLeaveType}
                      onChange={(e) => setCustomLeaveType(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Start Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={leaveFormData.startDate}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">End Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px]"
                    value={leaveFormData.endDate}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Reason for Leave</label>
                  <input
                    type="text"
                    required
                    placeholder="Please state the reason for leave..."
                    className="w-full bg-bg-input border-2 border-border rounded-2xl px-5 py-4 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[52px] placeholder:text-text-muted/50"
                    value={leaveFormData.reason}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white font-black py-4 px-12 rounded-2xl transition-all text-xs uppercase tracking-[0.2em] shadow-lg shadow-orange-950/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send size={16} /> Submit Leave Request
                  </button>
                </div>
              </form>

              {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                <div className="mt-12 border-t-2 border-border pt-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-soft rounded-2xl border border-purple-soft/30 text-purple">
                      <ClipboardList size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">
                        Leave Request Approvals
                      </h3>
                      <p className="text-[10px] text-text-muted font-bold mt-0.5">Approve or reject pending employee leave requests</p>
                    </div>
                  </div>

                  {leaves.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 animate-zoom-in">
                      {leaves.map((l) => (
                        <div key={l._id} className="bg-bg-input/10 border-2 border-border rounded-3xl p-6 flex flex-col gap-4 relative group hover:border-purple/50 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Requested By</span>
                              <span className="text-xs font-black text-text-primary mt-0.5 block">{l.requestedByName || l.requestedBy}</span>
                              <span className="text-[9px] font-bold text-text-muted block">{l.requestedBy}</span>
                            </div>
                            <span className={`status-badge text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border ${l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              l.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                'bg-orange-500/10 text-orange-500 border-orange-500/20'
                              }`}>
                              {l.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 bg-bg-card p-3 rounded-2xl border border-border/60">
                            <div>
                              <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block">Leave Type</span>
                              <span className="text-xs font-bold text-text-primary">{l.leaveType}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-text-muted uppercase tracking-wider block">Duration</span>
                              <span className="text-xs font-bold text-text-primary">{l.startDate} to {l.endDate}</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Reason</span>
                            <p className="text-xs font-medium text-text-secondary leading-relaxed mt-0.5">{l.reason || 'No reason provided'}</p>
                          </div>

                          {l.emergencyContact && (
                            <div>
                              <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">Emergency Contact</span>
                              <span className="text-xs font-bold text-text-primary mt-0.5 block">{l.emergencyContact}</span>
                            </div>
                          )}

                          {l.status === 'Pending Review' && (
                            <div className="flex gap-3 mt-2 pt-4 border-t border-border/40">
                              <button
                                type="button"
                                onClick={() => handleLeaveStatusUpdate(l._id, 'Approved')}
                                className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-emerald-500 text-emerald-500 bg-emerald-500/5 rounded-xl cursor-pointer hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-1 font-black"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLeaveStatusUpdate(l._id, 'Rejected')}
                                className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider border-2 border-rose-500 text-rose-500 bg-rose-500/5 rounded-xl cursor-pointer hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-1 font-black"
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-text-muted font-bold uppercase border-2 border-dashed border-border rounded-3xl mb-12">
                      No leave requests found.
                    </div>
                  )}
                </div>
              )}

              <div className="mt-12 border-t border-border pt-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-soft rounded-2xl border border-purple-soft/30 text-purple">
                      <CalendarDays size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">
                        User Attendance Calendar
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    {/* User Selection */}
                    {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) ? (
                      <div className="flex flex-col gap-1.5 min-w-[250px]">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Select User</span>
                        <select
                          className="bg-bg-input border-2 border-border rounded-xl px-4 py-2 text-sm font-bold text-text-primary outline-none focus:border-accent transition-all h-[42px] cursor-pointer"
                          value={selectedUserEmail}
                          onChange={(e) => setSelectedUserEmail(e.target.value)}
                        >
                          {allUsers.map((u) => (
                            <option key={u.email} value={u.email}>
                              {u.fullName || u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">User</span>
                        <span className="text-sm font-bold text-text-primary h-[42px] flex items-center bg-bg-input/30 px-4 rounded-xl border border-border/40 select-none">
                          {user?.fullName || user?.name || selectedUserEmail}
                        </span>
                      </div>
                    )}

                    {/* Month Navigation */}
                    <div className="flex items-center gap-3 self-end h-[42px] mt-auto">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-2 border-2 border-border rounded-xl text-text-primary hover:bg-bg-input hover:border-accent transition-all cursor-pointer flex items-center justify-center"
                      >
                        <ChevronRight size={18} className="rotate-180" />
                      </button>
                      <span className="text-sm font-black text-text-primary min-w-[140px] text-center select-none capitalize">
                        {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-2 border-2 border-border rounded-xl text-text-primary hover:bg-bg-input hover:border-accent transition-all cursor-pointer flex items-center justify-center"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    {/* Export Excel Button */}
                    <button
                      type="button"
                      onClick={handleExportAttendance}
                      className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all h-[42px] self-end mt-auto bg-accent hover:bg-accent/80 text-white shadow-md active:scale-95 cursor-pointer border border-accent/20"
                    >
                      <Download size={14} /> Export Excel
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-bg-card border-2 border-border rounded-2xl p-4 sm:p-6 overflow-x-auto">
                  <div className="min-w-[650px] md:min-w-0">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 gap-2 mb-3 text-center border-b border-border pb-3">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-2.5">
                      {(() => {
                        const days = getCalendarDays();
                        const todayIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
                        const todayKey = todayIST.toISOString().split('T')[0];

                        return days.map((day, idx) => {
                          if (!day) {
                            return <div key={`empty-${idx}`} className="bg-bg-input/20 rounded-xl min-h-[90px] border border-transparent" />;
                          }

                          const isSunday = day.getDay() === 0;
                          const yearStr = day.getFullYear();
                          const monthStr = String(day.getMonth() + 1).padStart(2, '0');
                          const dateStr = String(day.getDate()).padStart(2, '0');
                          const dayKey = `${yearStr}-${monthStr}-${dateStr}`;

                          const hasSod = attendanceReports.some(r => r.date === dayKey && r.type === 'SOD');
                          const hasApprovedLeave = leaves.some(l =>
                            l.requestedBy === selectedUserEmail &&
                            l.status === 'Approved' &&
                            l.startDate <= dayKey &&
                            dayKey <= l.endDate
                          );

                          let status = 'Absent';
                          if (isSunday) {
                            status = 'Sunday';
                          } else if (hasApprovedLeave) {
                            status = 'Leave';
                          } else if (hasSod) {
                            status = 'Present';
                          } else if (dayKey > todayKey) {
                            status = 'Future';
                          }

                          return (
                            <div
                              key={dayKey}
                              className={`flex flex-col justify-between p-3 rounded-xl border-2 min-h-[90px] transition-all hover:scale-[1.02] ${dayKey === todayKey ? 'border-accent bg-accent/5' : 'border-border bg-bg-input/10'
                                }`}
                            >
                              <span className="text-xs font-black text-text-primary self-end select-none">
                                {day.getDate()}
                              </span>

                              <div className="mt-2">
                                {status === 'Sunday' && (
                                  <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg w-full justify-center border border-blue-500/20 uppercase tracking-wider">
                                    Off Day
                                  </span>
                                )}
                                {status === 'Leave' && (
                                  <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-purple-500 bg-purple-500/10 px-2 py-1 rounded-lg w-full justify-center border border-purple-500/20 uppercase tracking-wider">
                                    Leave
                                  </span>
                                )}
                                {status === 'Present' && (
                                  <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg w-full justify-center border border-emerald-500/20 uppercase tracking-wider">
                                    Present
                                  </span>
                                )}
                                {status === 'Absent' && (
                                  <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg w-full justify-center border border-rose-500/20 uppercase tracking-wider">
                                    Absent
                                  </span>
                                )}
                                {status === 'Future' && (
                                  <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-text-muted/60 bg-bg-input px-2 py-1 rounded-lg w-full justify-center border border-border uppercase tracking-wider select-none">
                                    Scheduled
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              )
            </div>
          )}
        </>
      )}

      {activeRequestType === 'Settlement' && (
        <div className="mt-12 bg-bg-card border-2 border-border rounded-2xl p-4 sm:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-soft rounded-2xl border border-accent-soft/30 text-accent">
                <ClipboardList size={22} />
              </div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">
                {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) ? 'Refund Requests' : 'Submitted Requests'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Status Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-bg-input border-2 border-border rounded-xl px-4 py-2 text-[10px] font-black uppercase text-text-primary outline-none focus:border-green transition-all"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
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
                      {showRequesterColumn && <th className="px-4 py-4 whitespace-nowrap">Refund Requested By</th>}
                      <th className="px-4 py-4 whitespace-nowrap w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {groupRefundsByCase(filteredRefunds).map((g) => {
                      const isExpanded = !!expandedCases[g.caseId];
                      if (g.requests.length === 1) {
                        const r = g.requests[0];
                        return (
                          <tr
                            key={r._id}
                            className="hover:bg-bg-secondary/40 transition-colors cursor-pointer bg-bg-card font-bold select-none"
                            onClick={() => { setSelectedRefund(r); setShowPaymentDetails(false); }}
                          >
                            <td className="px-4 py-4 align-middle">
                              <div className="text-[11px] font-black text-text-primary uppercase tracking-tight">{g.caseId}</div>
                              <div className="text-[9px] font-bold text-accent uppercase tracking-widest mt-0.5">{g.companyName || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="text-sm font-black text-text-primary tracking-tight">₹{Number(r.amount || 0).toLocaleString('en-IN')}</div>
                              <div className="text-[9px] text-text-muted font-bold mt-1 uppercase tracking-wider">
                                {r.installments && r.installments.length > 0
                                  ? `${r.installments.length} Installment${r.installments.length > 1 ? 's' : ''}`
                                  : '1 Installment'}
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${r.status === 'Paid'
                                ? 'bg-green-soft text-green border-green-soft'
                                : r.status === 'Rejected'
                                  ? 'bg-red-soft text-red border-red-soft'
                                  : 'bg-yellow-soft text-yellow border-yellow-soft'
                                }`}>
                                {r.status}
                              </span>
                            </td>
                            {showRequesterColumn && (
                              <td className="px-4 py-4 align-middle">
                                <div className="text-[11px] font-semibold text-text-secondary">{r.requestedByName || 'N/A'}</div>
                                <div className="text-[9px] text-text-muted mt-0.5">{r.requestedBy || ''}</div>
                              </td>
                            )}
                            <td className="px-4 py-3 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(r)}
                                      className="p-1.5 rounded-lg hover:bg-accent-soft text-text-muted hover:text-accent transition-all"
                                      title="Edit Request"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRequest(r._id)}
                                      className="p-1.5 rounded-lg hover:bg-red-soft/30 text-text-muted hover:text-red transition-all"
                                      title="Delete Request"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                                <ChevronRight size={14} className="text-text-muted inline-block" />
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <React.Fragment key={g.caseId}>
                          {/* Parent Case Row */}
                          <tr
                            className="hover:bg-bg-secondary/40 transition-colors cursor-pointer bg-bg-secondary/20 font-bold select-none"
                            onClick={() => toggleCaseExpand(g.caseId)}
                          >
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-black text-accent">{isExpanded ? '▼' : '▶'}</span>
                                <div className="text-[11px] font-black text-text-primary uppercase tracking-tight">{g.caseId}</div>
                              </div>
                              <div className="text-[9px] font-bold text-accent uppercase tracking-widest mt-0.5 ml-4">{g.companyName || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="text-sm font-black text-text-primary tracking-tight">₹{Number(g.totalAmount).toLocaleString('en-IN')}</div>
                              <div className="text-[9px] text-text-muted font-bold mt-0.5">{g.requests.length} Requests</div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="flex flex-wrap gap-1 max-w-[120px]">
                                {[...new Set(g.requests.map(r => r.status))].map(status => (
                                  <span key={status} className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${status === 'Paid'
                                    ? 'bg-green-soft text-green border-green-soft'
                                    : status === 'Rejected'
                                      ? 'bg-red-soft text-red border-red-soft'
                                      : 'bg-yellow-soft text-yellow border-yellow-soft'
                                    }`}>
                                    {status}
                                  </span>
                                ))}
                              </div>
                            </td>
                            {showRequesterColumn && (
                              <td className="px-4 py-4 align-middle">
                                <div className="text-[11px] font-semibold text-text-secondary">
                                  {[...new Set(g.requests.map(r => r.requestedByName || 'N/A'))].join(', ')}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-3 align-middle text-right">
                              <span className="bg-accent-soft text-accent px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                {isExpanded ? 'Hide' : 'Expand'}
                              </span>
                            </td>
                          </tr>
                          {/* Expanded child request rows */}
                          {isExpanded && g.requests.map((r, idx) => (
                            <tr
                              key={r._id}
                              className="hover:bg-bg-secondary/40 transition-colors cursor-pointer group bg-bg-card border-l-4 border-accent"
                              onClick={() => { setSelectedRefund(r); setShowPaymentDetails(false); }}
                            >
                              <td className="px-4 py-4 align-middle pl-8">
                                <div className="text-[10px] font-black text-text-muted">Request #{idx + 1}</div>
                                <div className="text-[9px] font-bold text-text-muted mt-0.5">
                                  {r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-IN') : ''}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <div className="text-sm font-black text-text-primary tracking-tight">₹{Number(r.amount || 0).toLocaleString('en-IN')}</div>
                                <div className="text-[9px] text-text-muted font-bold mt-1 uppercase tracking-wider">
                                  {r.installments && r.installments.length > 0
                                    ? `${r.installments.length} Installment${r.installments.length > 1 ? 's' : ''}`
                                    : '1 Installment'}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border-2 ${r.status === 'Paid'
                                  ? 'bg-green-soft text-green border-green-soft'
                                  : r.status === 'Rejected'
                                    ? 'bg-red-soft text-red border-red-soft'
                                    : 'bg-yellow-soft text-yellow border-yellow-soft'
                                  }`}>
                                  {r.status}
                                </span>
                              </td>
                              {showRequesterColumn && (
                                <td className="px-4 py-4 align-middle">
                                  <div className="text-[11px] font-semibold text-text-secondary">{r.requestedByName || 'N/A'}</div>
                                  <div className="text-[9px] text-text-muted mt-0.5">{r.requestedBy || ''}</div>
                                </td>
                              )}
                              <td className="px-4 py-3 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                                    <>
                                      <button
                                        onClick={() => handleStartEdit(r)}
                                        className="p-1.5 rounded-lg hover:bg-accent-soft text-text-muted hover:text-accent transition-all"
                                        title="Edit Request"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRequest(r._id)}
                                        className="p-1.5 rounded-lg hover:bg-red-soft/30 text-text-muted hover:text-red transition-all"
                                        title="Delete Request"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                  <ChevronRight size={14} className="text-text-muted group-hover:text-accent transition-colors" />
                                </div>
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
          )}
        </div>
      )}

      {/* --- REFUND DETAIL POPUP MODAL --- */}
      {selectedRefund && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setSelectedRefund(null); setShowPaymentDetails(false); }}
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
                onClick={() => { setSelectedRefund(null); setShowPaymentDetails(false); }}
                className="p-2 rounded-xl hover:bg-red-soft/30 text-text-muted hover:text-red transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">
              {/* Status + Date */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 ${selectedRefund.status?.toLowerCase() === 'paid'
                  ? 'bg-green-soft text-green border-green-soft'
                  : selectedRefund.status?.toLowerCase() === 'rejected'
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
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Total Amount</div>
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

              {/* Payment Details / Payout Schedule */}
              {((selectedRefund.status?.toLowerCase() === 'paid') || (selectedRefund.installments && selectedRefund.installments.length > 0) || selectedRefund.transactionId) && (
                <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                    className="w-full flex items-center justify-between text-[9px] font-black text-text-muted uppercase tracking-widest border-b border-border/50 pb-2 outline-none select-none hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle size={12} className="text-green" /> Payment Details
                    </div>
                    <span className="text-[10px] font-black text-accent">{showPaymentDetails ? '▲' : '▼'}</span>
                  </button>

                  {showPaymentDetails && (
                    <div className="space-y-3 animate-in fade-in duration-250">
                      {selectedRefund.installments && selectedRefund.installments.length > 1 ? (
                        /* Multi-installment list */
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                          {selectedRefund.installments.map((inst, i) => {
                            const isInstPaid = inst.status?.toLowerCase() === 'paid' || selectedRefund.status?.toLowerCase() === 'paid';
                            const instProof = inst.paymentProof || (isInstPaid ? selectedRefund.paymentProof : '');
                            const instTxId = inst.transactionId || (isInstPaid ? selectedRefund.transactionId : '');
                            const instDate = inst.paymentDate || (isInstPaid ? selectedRefund.paymentDate : '');

                            return (
                              <div key={i} className="bg-bg-card rounded-lg p-2.5 border border-border/50 flex flex-col gap-1.5 text-[10px]">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-accent uppercase">Inst. #{i + 1} (₹{Number(inst.amount).toLocaleString('en-IN')})</span>
                                  <div className="flex items-center gap-2">
                                    {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteInstallment(i); }}
                                        className="p-1 rounded hover:bg-red-soft/30 text-text-muted hover:text-red transition-all"
                                        title="Delete Installment"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isInstPaid ? 'bg-green-soft text-green' : inst.status === 'Due' ? 'bg-red-soft text-red' : 'bg-yellow-soft text-yellow'}`}>
                                      {isInstPaid ? 'Paid' : (inst.status || 'Pending')}
                                    </span>
                                  </div>
                                </div>
                                {isInstPaid && (
                                  <div className="grid grid-cols-2 gap-2 text-[9px] text-text-secondary bg-bg-secondary/40 p-2 rounded-md">
                                    <div>
                                      <span className="text-[8px] text-text-muted font-bold block">UTR NO</span>
                                      <span className="font-mono font-bold break-all">{instTxId || '—'}</span>
                                    </div>
                                    <div>
                                      <span className="text-[8px] text-text-muted font-bold block">PAYMENT DATE</span>
                                      <span className="font-bold">{instDate || '—'}</span>
                                    </div>
                                    {instProof && (
                                      <div className="col-span-2 mt-1">
                                        <a
                                          href={instProof}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-accent hover:underline"
                                        >
                                          <Eye size={10} /> View Proof Document
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Single payout details */
                        (() => {
                          const isPaid = selectedRefund.status?.toLowerCase() === 'paid' || (selectedRefund.transactionId && selectedRefund.paymentProof);
                          const txId = selectedRefund.transactionId || (selectedRefund.installments?.[0]?.transactionId) || '—';
                          const pDate = selectedRefund.paymentDate || (selectedRefund.installments?.[0]?.paymentDate) || '—';
                          const proofDoc = selectedRefund.paymentProof || (selectedRefund.installments?.[0]?.paymentProof);

                          return (
                            <div className="space-y-2.5 text-[10px]">
                              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                <span className="font-black text-accent uppercase">Single Payout</span>
                                {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && selectedRefund.installments?.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInstallment(0)}
                                    className="p-1 rounded hover:bg-red-soft/30 text-text-muted hover:text-red transition-all flex items-center gap-1"
                                    title="Delete Installment"
                                  >
                                    <Trash2 size={12} /> <span className="text-[8px] font-black uppercase">Delete Payout</span>
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-[8px] text-text-muted uppercase font-black">UTR / Transaction ID</div>
                                  <div className="font-mono font-bold text-accent select-all mt-0.5 break-all">{txId}</div>
                                </div>
                                <div>
                                  <div className="text-[8px] text-text-muted uppercase font-black">Payment Date</div>
                                  <div className="font-black text-text-primary mt-0.5">{pDate}</div>
                                </div>
                              </div>
                              {proofDoc && (
                                <div className="pt-1.5">
                                  <a
                                    href={proofDoc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-soft text-green hover:bg-green hover:text-white border border-green-soft rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                  >
                                    <Eye size={12} /> View Payment Proof Document
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedRefund.summary && (
                <div className="bg-bg-secondary rounded-xl p-4">
                  <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Summary</div>
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