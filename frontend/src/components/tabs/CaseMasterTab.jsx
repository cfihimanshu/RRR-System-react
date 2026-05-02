import React, { useState, useEffect, useCallback, memo } from 'react';
import FileUpload from '../shared/FileUpload';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Badge } from '../shared/Badge';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import {
  Upload,
  UploadCloud,
  Download,
  FileDown,
  Search,
  Inbox,
  Eye,
  Edit3,
  Check,
  X,
  ExternalLink,
  FileText,
  Trash2,
  Filter,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronDown,
  Zap,
  Mail,
  Paperclip,
  Activity,
  List,
  Plus
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import SearchableSelect from '../shared/SearchableSelect';
import CaseStudyTab from './CaseStudyTab';
import {
  Building2,
  Wrench,
  User as UserIcon,
  IndianRupee,
  AlertTriangle,
  Users,
  CheckCircle,
  PhoneIncoming,
  MessageCircle,
  Video
} from 'lucide-react';
import * as XLSX from 'xlsx';

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Delhi", "Puducherry",
  "Ladakh", "Jammu and Kashmir"
];

const initialService = {
  serviceName: '',
  serviceAmount: '',
  mouSigned: 'No',
  signedMouAmount: '',
  workStatus: 'Not Initiated',
  bda: '',
  department: 'Operations'
};

// Modernized Case Master with Integrated Detail View
const CaseMasterTab = () => {
  const [cases, setCases] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCases, setSelectedCases] = useState([]);
  const [bulkAssignUser, setBulkAssignUser] = useState('');
  const [importing, setImporting] = useState(false);
  const [viewCase, setViewCase] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('Case Details');
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [caseComms, setCaseComms] = useState([]);
  const [caseDocs, setCaseDocs] = useState([]);
  const [commFormData, setCommFormData] = useState({
    direction: 'Incoming',
    mode: 'Call',
    fromTo: '',
    summary: '',
    exactDemand: '',
    refundDemanded: '0',
    legalThreat: 'No',
    smMentioned: 'No',
    fileLink: '',
    dateTime: new Date().toISOString().substring(0, 16)
  });
  const [docFormData, setDocFormData] = useState({
    docType: 'Legal Notice',
    summary: '',
    fileLink: '',
    remarks: ''
  });
  const checklistTemplate = [
    { id: 1, label: 'Initial contact made', completed: false },
    { id: 2, label: 'Documents received from client', completed: false },
    { id: 3, label: 'MOU draft prepared', completed: false },
    { id: 4, label: 'Signed MOU received', completed: false },
    { id: 5, label: 'Final settlement agreed', completed: false },
    { id: 6, label: 'Case closed', completed: false }
  ];

  const stageChecklistMap = {
    'Case Logged': [1],
    'Assigned': [1, 2],
    'Agreement': [1, 2, 3],
    'Negotiation': [1, 2, 3, 4],
    'Resolution': [1, 2, 3, 4, 5, 6]
  };

  const buildChecklistForStage = (stage) => checklistTemplate.map((item) => ({
    ...item,
    completed: stageChecklistMap[stage]?.includes(item.id) || false
  }));

  const [progressFormData, setProgressFormData] = useState({
    stage: 'Case Logged',
    percentage: 20,
    summary: '',
    nextAction: '',
    blockers: '',
    followUpDate: '',
    escalateTo: ''
  });
  const [mouFormData, setMouFormData] = useState({
    mouType: 'Legal Notice',
    mouDate: '',
    signatoryName: '',
    remarks: '',
    fileLink: ''
  });
  const [emailFormData, setEmailFormData] = useState({
    subject: '',
    emailDate: '',
    emailFileLink: '',
    otherDocsLink: ''
  });
  const [actionLogFormData, setActionLogFormData] = useState({
    actionModality: 'Call',
    operatorNode: '',
    remarks: '',
    nextScheduledDate: '',
    attachment: '',
    stateChangeAuthorization: 'New'
  });
  const [caseActionLogs, setCaseActionLogs] = useState([]);
  const [caseProgressLogs, setCaseProgressLogs] = useState([]);
  const [checklist, setChecklist] = useState(buildChecklistForStage('Case Logged'));
  const [opsUsers, setOpsUsers] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState('Status');
  const [tempFilters, setTempFilters] = useState({
    status: 'All Status',
    priority: 'All Priority',
    assignee: 'All Assignees',
    date: null
  });
  const [appliedFilters, setAppliedFilters] = useState({
    status: 'All Status',
    priority: 'All Priority',
    assignee: 'All Assignees',
    date: null
  });
  const { user } = useContext(AuthContext);

  // Form states for editable case details
  const [formData, setFormData] = useState({
    companyName: '', caseTitle: '', priority: 'Medium', sourceOfComplaint: '',
    typeOfComplaint: '', brandName: '',
    engagementNote: '',
    clientName: '', clientMobile: '', clientEmail: '', state: '',
    totalAmtPaid: '', mouSigned: 'No', totalMouValue: '', amtInDispute: '',
    smRisk: 'None', consumerComplaintFiled: 'No', policeThreat: 'None', caseSummary: '', clientAllegation: '',
    proofCallRec: 'No', proofWaChat: 'No', proofVideoCall: 'No', proofFundingEmail: 'No',
    initiatedBy: '', accountable: '', legalOfficer: '', accounts: '',
    firNumber: '', firFileLink: '', grievanceNumber: '',
    assignedTo: '',
    lienMarkedOn: '', lienBank: '', refundStatus: '',
    acc1No: '', acc1Ifsc: '', acc2No: '', acc2Ifsc: '',
    keyPendingIssue: '', recommendedNextSteps: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [serviceMode, setServiceMode] = useState('Single Service');
  const [services, setServices] = useState([{ ...initialService }]);
  const [cyberAcks, setCyberAcks] = useState(['']);
  const [formErrors, setFormErrors] = useState({});

  const inputClass = "w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent-soft outline-none transition-all bg-bg-input text-text-primary font-medium placeholder:text-text-muted shadow-inner";
  const labelClass = "block text-[11px] font-black text-text-muted uppercase tracking-[0.1em] mb-2";
  const sectionTitleClass = "text-md font-black flex items-center gap-2 mb-6 text-accent uppercase tracking-wider";
  const cardClass = "bg-bg-card rounded-2xl border-2 border-border p-8 mb-8 shadow-sm transition-all duration-300";

  const fetchCases = async () => {
    try {
      const res = await api.get('/cases');
      setCases(res.data);
    } catch (err) {
      toast.error('Failed to fetch cases');
    }
  };

  const fetchOpsUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      // Filter for Operations users and remove duplicates by fullName
      const filtered = res.data.filter(u => u.role === 'Operations' || u.role === 'Admin');

      const uniqueUsers = [];
      const seenNames = new Set();

      filtered.forEach(u => {
        const name = u.fullName?.trim() || '';
        const lowerName = name.toLowerCase();
        if (name && !seenNames.has(lowerName)) {
          seenNames.add(lowerName);
          uniqueUsers.push(u);
        }
      });

      setOpsUsers(uniqueUsers);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchAvailableDates = async () => {
    try {
      const res = await api.get('/cases/available-dates');
      setAvailableDates(res.data);
    } catch (err) {
      console.error('Failed to fetch available dates', err);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchOpsUsers();
    fetchAvailableDates();
    // Check for auto-filter from Dashboard
    if (location.state?.statusFilter) {
      setAppliedFilters(prev => ({ ...prev, status: location.state.statusFilter }));
      setTempFilters(prev => ({ ...prev, status: location.state.statusFilter }));
      // Clear state after applying so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
    if (location.state?.priorityFilter) {
      setAppliedFilters(prev => ({ ...prev, priority: location.state.priorityFilter }));
      setTempFilters(prev => ({ ...prev, priority: location.state.priorityFilter }));
      window.history.replaceState({}, document.title);
    }
    if (location.state?.searchId) {
      setSearchTerm(location.state.searchId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return toast.error('Please upload a valid CSV file');
    }

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    const loadingToast = toast.loading('Importing cases...');

    try {
      const res = await api.post('/cases/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Import successful', { id: loadingToast });
      fetchCases();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed', { id: loadingToast });
    } finally {
      setImporting(false);
      e.target.value = null;
    }
  };

  const handleExportExcel = () => {
    if (cases.length === 0) return toast.error('No data to export');

    const headers = ['Case ID', 'Created', 'Company', 'Client', 'Services', 'Amount Paid', 'Priority', 'Status', 'Assigned To'];
    const data = cases.map(c => {
      const svcs = Array.isArray(c.servicesSold)
        ? c.servicesSold.map(s => s.serviceName).join(' | ')
        : (c.servicesSold || '');

      return {
        'Case ID': c.caseId,
        'Created': c.createdDate ? format(new Date(c.createdDate), 'dd/MM/yyyy') : '',
        'Company': c.companyName,
        'Client': c.clientName,
        'Services': svcs,
        'Amount Paid': c.totalAmtPaid || '0',
        'Priority': c.priority,
        'Status': c.currentStatus || c.status || 'Active',
        'Assigned To': c.assignedTo || c.initiatedBy || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cases");

    // Auto-size columns
    const maxWidths = headers.map(h => ({ wch: h.length + 5 }));
    data.forEach(row => {
      Object.values(row).forEach((val, i) => {
        const len = val ? val.toString().length : 0;
        if (len + 2 > maxWidths[i].wch) maxWidths[i].wch = len + 2;
      });
    });
    worksheet['!cols'] = maxWidths;

    XLSX.writeFile(workbook, `Case_Master_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm(`Are you sure you want to delete case ${caseId}? This action cannot be undone.`)) return;

    try {
      await api.delete(`/cases/${caseId}`);
      toast.success('Case deleted successfully');
      fetchCases();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete case');
    }
  };

  const filteredCases = cases.filter(c => {
    const matchSearch = (c.caseId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    let matchStatus = false;
    if (appliedFilters.status === 'All Status') {
      matchStatus = true;
    } else if (appliedFilters.status === 'Active') {
      matchStatus = c.currentStatus !== 'Closed' && c.currentStatus !== 'Settled';
    } else if (appliedFilters.status === 'Closed') {
      matchStatus = c.currentStatus === 'Closed' || c.currentStatus === 'Settled';
    } else {
      matchStatus = c.status === appliedFilters.status || c.currentStatus === appliedFilters.status;
    }

    const matchPriority = appliedFilters.priority === 'All Priority' || c.priority === appliedFilters.priority;

    const assignedPerson = c.assignedTo || c.initiatedBy || '';
    const matchAssignee = appliedFilters.assignee === 'All Assignees' ||
      assignedPerson.toLowerCase() === appliedFilters.assignee.toLowerCase();

    let matchDate = true;
    if (appliedFilters.date) {
      const caseDate = c.createdDate ? new Date(c.createdDate).toISOString().split('T')[0] : null;
      matchDate = caseDate === appliedFilters.date;
    }

    return matchSearch && matchStatus && matchPriority && matchAssignee && matchDate;
  });

  const handleApplyFilters = () => {
    setAppliedFilters(tempFilters);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    const reset = {
      status: 'All Status',
      priority: 'All Priority',
      assignee: 'All Assignees',
      date: null
    };
    setTempFilters(reset);
    setAppliedFilters(reset);
    setIsFilterOpen(false);
  };

  const handleViewCase = async (c) => {
    setViewCase(c);
    setActiveDetailTab('Case Study');
    setTimelineLogs([]);
    setCaseComms([]);

    // Initialize editable form data
    setFormData({
      companyName: c.companyName || '',
      caseTitle: c.caseTitle || '',
      priority: c.priority || 'Medium',
      sourceOfComplaint: c.sourceOfComplaint || '',
      typeOfComplaint: c.typeOfComplaint || '',
      brandName: c.brandName || '',
      clientName: c.clientName || '',
      clientMobile: c.clientMobile || '',
      clientEmail: c.clientEmail || '',
      state: c.state || '',
      engagementNote: c.engagementNote || '',
      caseSummary: c.caseSummary || c.summary || '',
      clientAllegation: c.clientAllegation || c.allegation || '',
      totalAmtPaid: c.totalAmtPaid || c.amountPaid || '',
      totalMouValue: c.totalMouValue || c.mouValue || '',
      amtInDispute: c.amtInDispute || c.disputeAmount || '',
      initiatedBy: c.initiatedBy || c.initiator || '',
      accountable: c.accountable || '',
      legalOfficer: c.legalOfficer || '',
      accounts: c.accounts || '',
      assignedTo: c.assignedTo || c.owner || '',
      firNumber: c.firNumber || '',
      firFileLink: c.firFileLink || '',
      grievanceNumber: c.grievanceNumber || '',
      proofCallRec: c.proofCallRec || 'No',
      proofWaChat: c.proofWaChat || 'No',
      proofVideoCall: c.proofVideoCall || 'No',
      proofFundingEmail: c.proofFundingEmail || 'No',
      mouSigned: c.mouSigned || 'No',
      smRisk: c.smRisk || 'None',
      consumerComplaintFiled: c.consumerComplaintFiled || 'No',
      policeThreat: c.policeThreat || 'None',
      lienMarkedOn: c.lienMarkedOn || '',
      lienBank: c.lienBank || '',
      refundStatus: c.refundStatus || '',
      acc1No: c.bankAccountDetails?.acc1No || '',
      acc1Ifsc: c.bankAccountDetails?.acc1Ifsc || '',
      acc2No: c.bankAccountDetails?.acc2No || '',
      acc2Ifsc: c.bankAccountDetails?.acc2Ifsc || '',
      keyPendingIssue: c.keyPendingIssue || '',
      recommendedNextSteps: c.recommendedNextSteps || ''
    });

    setProgressFormData({
      stage: c.currentStatus || 'Case Logged',
      percentage: c.progressPercentage || 0,
      summary: '',
      nextAction: '',
      blockers: '',
      followUpDate: '',
      escalateTo: ''
    });

    setCommFormData(prev => ({
      ...prev,
      fromTo: c.clientName || ''
    }));

    setServiceMode(c.serviceMode || 'Single Service');
    if (c.servicesSold && Array.isArray(c.servicesSold) && c.servicesSold.length > 0) {
      setServices(c.servicesSold);
    } else {
      setServices([{ ...initialService }]);
    }

    if (c.cyberAckNumbers) {
      setCyberAcks(c.cyberAckNumbers.split(',').filter(Boolean));
    } else {
      setCyberAcks(['']);
    }

    setIsEditing(false);

    // Auto-fill signatory name with client name
    setMouFormData(prev => ({
      ...prev,
      signatoryName: c.clientName || ''
    }));

    try {
      const res = await api.get(`/timeline?caseId=${c.caseId}`);
      setTimelineLogs(res.data);
      fetchCaseComms(c.caseId);
      fetchCaseDocs(c.caseId);
      fetchProgressData(c.caseId);
      fetchActionLogs(c.caseId);
    } catch (err) {
      console.error('Failed to fetch timeline for case', err);
    }
  };

  // Auto-calculate financial details from services
  useEffect(() => {
    if (!viewCase) return;
    const totalPaid = services.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0);
    const totalMou = services.reduce((sum, s) => sum + (Number(s.signedMouAmount) || 0), 0);
    const dispute = totalPaid - totalMou;

    setFormData(prev => ({
      ...prev,
      totalAmtPaid: totalPaid || '',
      totalMouValue: totalMou || '',
      amtInDispute: dispute || ''
    }));
  }, [services, viewCase]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let updates = { [name]: value };

    if (name === 'companyName' || name === 'typeOfComplaint') {
      const comp = name === 'companyName' ? value : formData.companyName;
      const typeC = name === 'typeOfComplaint' ? value : formData.typeOfComplaint;
      updates.caseTitle = `${comp || 'Company'} - ${typeC || 'Type'}`;
    }

    // Inline Validations
    if (name === 'clientEmail') {
      if (value && !value.includes('@')) {
        setFormErrors(prev => ({ ...prev, clientEmail: 'Pattern not valid! Must contain @' }));
      } else {
        setFormErrors(prev => ({ ...prev, clientEmail: '' }));
      }
    }

    if (name === 'clientMobile') {
      const clean = value.replace(/\s+/g, '');
      if (clean && !/^\d{10}$/.test(clean)) {
        setFormErrors(prev => ({ ...prev, clientMobile: 'Pattern not valid! Must be 10 digits' }));
      } else {
        setFormErrors(prev => ({ ...prev, clientMobile: '' }));
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleServiceChange = (index, field, value) => {
    const updatedServices = [...services];
    updatedServices[index][field] = value;
    setServices(updatedServices);
  };

  const addService = () => setServices([...services, { ...initialService }]);
  const removeService = (index) => setServices(services.filter((_, i) => i !== index));

  const handleCyberAckChange = (index, value) => {
    const newAcks = [...cyberAcks];
    newAcks[index] = value;
    setCyberAcks(newAcks);
  };

  const addCyberAck = () => setCyberAcks([...cyberAcks, '']);
  const removeCyberAck = (index) => setCyberAcks(cyberAcks.filter((_, i) => i !== index));

  const handleCaseUpdate = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Updating case profile...');
    try {
      const payload = {
        ...formData,
        serviceMode,
        servicesSold: services,
        cyberAckNumbers: cyberAcks.filter(Boolean).join(','),
        bankAccountDetails: {
          acc1No: formData.acc1No,
          acc1Ifsc: formData.acc1Ifsc,
          acc2No: formData.acc2No,
          acc2Ifsc: formData.acc2Ifsc
        }
      };

      await api.put(`/cases/${viewCase.caseId}`, payload);
      toast.success('Case profile updated successfully', { id: loadingToast });
      fetchCases();
      // Optional: Refresh the viewCase data if needed
      const res = await api.get(`/cases`);
      const updatedCase = res.data.find(c => c.caseId === viewCase.caseId);
      if (updatedCase) setViewCase(updatedCase);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update case', { id: loadingToast });
    }
  };

  const handleMarkResolved = async () => {
    if (!window.confirm('Are you sure you want to mark this case as resolved?')) return;

    const loadingToast = toast.loading('Marking case as resolved...');
    try {
      // 1. Update Case status
      await api.put(`/cases/${viewCase.caseId}`, {
        currentStatus: 'Settled',
        progressPercentage: 100
      });

      // 2. Log in progress history
      await api.post('/progress', {
        caseId: viewCase.caseId,
        stage: 'Resolution',
        percentage: 100,
        summary: 'Case marked as resolved manually by user.',
        updatedBy: user?.fullName || user?.email
      });

      toast.success('Case marked as resolved', { id: loadingToast });
      fetchCases();
      // Update local view
      setViewCase(prev => ({ ...prev, currentStatus: 'Settled', progressPercentage: 100 }));
    } catch (err) {
      toast.error('Failed to resolve case', { id: loadingToast });
    }
  };

  const fetchCaseComms = useCallback(async (caseId) => {
    try {
      const res = await api.get(`/communications?caseId=${caseId}`);
      setCaseComms(res.data);
    } catch (err) {
      console.error('Failed to fetch communications', err);
    }
  }, []);

  const fetchCaseDocs = useCallback(async (caseId) => {
    try {
      const res = await api.get(`/documents?caseId=${caseId}`);
      setCaseDocs(res.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  }, []);

  const fetchProgressData = useCallback(async (caseId) => {
    try {
      const res = await api.get(`/progress?caseId=${caseId}`);
      if (res.data.logs && res.data.logs.length > 0) {
        setCaseProgressLogs(res.data.logs);
        const latest = res.data.logs[0];

        const stageOrder = ['Case Logged', 'Assigned', 'Agreement', 'Negotiation', 'Resolution'];
        const stage = latest.stage || 'Case Logged';
        const stageIndex = stageOrder.indexOf(stage);
        const newPercentage = stageIndex >= 0 ? (stageIndex + 1) * 20 : Math.floor((latest.percentage || 0) / 20) * 20;

        setProgressFormData(prev => ({
          ...prev,
          percentage: newPercentage,
          stage
        }));

        if (res.data.checklist && res.data.checklist.length > 0) {
          setChecklist(res.data.checklist);
        } else {
          setChecklist(buildChecklistForStage(stage));
        }
      } else {
        // Auto-initialize if empty (Fail-safe)
        const initialLog = {
          caseId,
          stage: viewCase?.currentStatus || 'Case Logged',
          percentage: 20,
          summary: `Case Registered: ${viewCase?.typeOfComplaint || 'Inquiry'} setup complete.`,
          updatedBy: viewCase?.initiatedBy || user?.fullName || user?.email,
          checklist: buildChecklistForStage(viewCase?.currentStatus || 'Case Logged')
        };
        await api.post('/progress', initialLog);
        // Refresh
        const refresh = await api.get(`/progress?caseId=${caseId}`);
        setCaseProgressLogs(refresh.data.logs || []);
        if (refresh.data.checklist) setChecklist(refresh.data.checklist);
      }
    } catch (err) {
      console.error('Failed to fetch progress data', err);
    }
  }, [viewCase, user]);

  const fetchActionLogs = useCallback(async (caseId) => {
    try {
      const res = await api.get(`/actions?caseId=${caseId}`);
      setCaseActionLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch action logs', err);
    }
  }, []);

  const toggleChecklistItem = (id) => {
    setChecklist(prev => {
      // If prev is empty, it means we're using the default list but haven't saved it to state yet
      const currentList = prev.length > 0 ? prev : [
        { id: 1, label: 'Initial contact made', completed: false },
        { id: 2, label: 'Documents received from client', completed: false },
        { id: 3, label: 'MOU draft prepared', completed: false },
        { id: 4, label: 'Signed MOU received', completed: false },
        { id: 5, label: 'Final settlement agreed', completed: false },
        { id: 6, label: 'Case closed', completed: false }
      ];
      const newList = currentList.map(item => item.id === id ? { ...item, completed: !item.completed } : item);

      // Auto-calculate percentage based on checklist - DISABLED to favor stage-based percentage
      // const completed = newList.filter(i => i.completed).length;
      // const total = newList.length;
      // const percentage = Math.round((completed / total) * 100);
      // setProgressFormData(prev => ({ ...prev, percentage }));

      return newList;
    });
  };

  useEffect(() => {
    if (viewCase) {
      if (activeDetailTab === 'Communications') fetchCaseComms(viewCase.caseId);
      if (activeDetailTab === 'Documents & MOU') fetchCaseDocs(viewCase.caseId);
      if (activeDetailTab === 'Progress Update') fetchProgressData(viewCase.caseId);
    }
  }, [viewCase, activeDetailTab, fetchCaseComms, fetchCaseDocs, fetchProgressData]);

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!progressFormData.summary) return toast.error('Update summary is required');

    const loadingToast = toast.loading('Saving progress update...');
    try {
      await api.post('/progress', {
        ...progressFormData,
        stage: progressFormData.stage, // Explicitly send the derived stage
        caseId: viewCase.caseId,
        updatedBy: user?.fullName || user?.email,
        checklist // Include current checklist state
      });
      toast.success('Progress updated', { id: loadingToast });

      // Update local viewCase to reflect new status/percentage
      const updatedCase = {
        ...viewCase,
        currentStatus: progressFormData.stage,
        progressPercentage: progressFormData.percentage
      };
      setViewCase(updatedCase);

      setProgressFormData({
        ...progressFormData,
        summary: '',
        nextAction: '',
        blockers: ''
      });
      fetchProgressData(viewCase.caseId);
      fetchCases(); // Refresh global list
    } catch (err) {
      toast.error('Failed to update progress', { id: loadingToast });
    }
  };

  const handleCommSubmit = async (e) => {
    e.preventDefault();
    if (!commFormData.summary) return toast.error('Summary is required');

    const loadingToast = toast.loading('Logging communication...');
    try {
      await api.post('/communications', {
        ...commFormData,
        caseId: viewCase.caseId,
        loggedBy: user?.fullName || user?.email
      });
      toast.success('Communication logged', { id: loadingToast });
      setCommFormData({
        direction: 'Incoming',
        mode: 'Call',
        fromTo: '',
        summary: '',
        exactDemand: '',
        refundDemanded: '0',
        legalThreat: 'No',
        smMentioned: 'No',
        fileLink: '',
        dateTime: new Date().toISOString().substring(0, 16)
      });
      fetchCaseComms(viewCase.caseId);
    } catch (err) {
      toast.error('Failed to log communication', { id: loadingToast });
    }
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!docFormData.summary) return toast.error('Description is required');

    const loadingToast = toast.loading('Indexing document...');
    try {
      await api.post('/documents', {
        ...docFormData,
        caseId: viewCase.caseId,
        uploadedBy: user?.fullName || user?.email,
        source: 'Manual Upload'
      });
      toast.success('Document indexed successfully', { id: loadingToast });
      setDocFormData({
        docType: 'Legal Notice',
        summary: '',
        fileLink: '',
        remarks: ''
      });
      fetchCaseDocs(viewCase.caseId);
    } catch (err) {
      toast.error('Failed to index document', { id: loadingToast });
    }
  };

  const handleMouSubmit = async (e) => {
    e.preventDefault();
    if (!mouFormData.fileLink) return toast.error('MOU file is required');

    const loadingToast = toast.loading('Uploading MOU...');
    try {
      await api.post('/documents', {
        caseId: viewCase.caseId,
        docType: 'MOU / Agreement',
        summary: `MOU: ${mouFormData.mouType} - ${mouFormData.signatoryName}`,
        fileLink: mouFormData.fileLink,
        remarks: `${mouFormData.remarks} (Date: ${mouFormData.mouDate})`,
        uploadedBy: user?.email || 'System'
      });
      toast.success('MOU uploaded successfully', { id: loadingToast });
      setMouFormData({
        mouType: 'Signed MOU (Final)',
        mouDate: '',
        signatoryName: viewCase?.clientName || '',
        remarks: '',
        fileLink: ''
      });
      fetchCaseDocs(viewCase.caseId);
    } catch (err) {
      toast.error('Failed to upload MOU', { id: loadingToast });
    }
  };

  const handleActionLogSubmit = async (e) => {
    e.preventDefault();
    if (!actionLogFormData.remarks) return toast.error('Remarks are required');

    const loadingToast = toast.loading('Saving action log...');
    try {
      await api.post('/actions', {
        ...actionLogFormData,
        caseId: viewCase.caseId,
        doneBy: user?.fullName || user?.email || 'System',
        dateTime: new Date().toISOString()
      });
      toast.success('Action log saved', { id: loadingToast });
      setActionLogFormData({
        actionModality: 'Call',
        operatorNode: '',
        remarks: '',
        nextScheduledDate: '',
        attachment: '',
        stateChangeAuthorization: actionLogFormData.stateChangeAuthorization
      });
      fetchActionLogs(viewCase.caseId);
      // Also update timeline
      const resTime = await api.get(`/timeline?caseId=${viewCase.caseId}`);
      setTimelineLogs(resTime.data);
    } catch (err) {
      toast.error('Failed to save action log', { id: loadingToast });
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailFormData.emailFileLink && !emailFormData.otherDocsLink) return toast.error('At least one file is required');

    const loadingToast = toast.loading('Uploading email documents...');
    try {
      if (emailFormData.emailFileLink) {
        await api.post('/documents', {
          caseId: viewCase.caseId,
          docType: 'Email Proof',
          summary: `Email: ${emailFormData.subject}`,
          fileLink: emailFormData.emailFileLink,
          remarks: `Email Date: ${emailFormData.emailDate}`,
          uploadedBy: user?.email || 'System'
        });
      }

      if (emailFormData.otherDocsLink) {
        await api.post('/documents', {
          caseId: viewCase.caseId,
          docType: 'Others',
          summary: `Supporting Docs for Email: ${emailFormData.subject}`,
          fileLink: emailFormData.otherDocsLink,
          remarks: `Related to email dated ${emailFormData.emailDate}`,
          uploadedBy: user?.email || 'System'
        });
      }

      toast.success('Email documents uploaded', { id: loadingToast });
      setEmailFormData({
        subject: '',
        emailDate: '',
        emailFileLink: '',
        otherDocsLink: ''
      });
      fetchCaseDocs(viewCase.caseId);
    } catch (err) {
      toast.error('Failed to upload email docs', { id: loadingToast });
    }
  };


  const [assignmentInputs, setAssignmentInputs] = useState({});

  const handleAssign = async (caseId) => {
    const name = assignmentInputs[caseId];
    if (!name) return toast.error("Enter a name to assign");

    try {
      await api.put(`/cases/${caseId}`, { assignedTo: name });
      toast.success(`Case assigned to ${name}`);
      fetchCases(); // Refresh list
    } catch (err) {
      toast.error("Failed to assign case");
    }
  };

  const handleBulkAssign = async (name) => {
    if (!name) return;
    if (selectedCases.length === 0) {
      return toast.error("Please select at least one case to assign.");
    }

    const loadingToast = toast.loading(`Assigning ${selectedCases.length} cases to ${name}...`);
    try {
      await api.put('/cases/bulk-assign', { caseIds: selectedCases, assignedTo: name });
      toast.success(`Successfully assigned ${selectedCases.length} cases to ${name}`, { id: loadingToast });
      setSelectedCases([]);
      setBulkAssignUser('');
      fetchCases();
    } catch (err) {
      toast.error("Failed to bulk assign cases", { id: loadingToast });
    }
  };

  const toggleSelectAll = () => {
    if (selectedCases.length === filteredCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(filteredCases.map(c => c.caseId));
    }
  };

  const toggleSelectCase = useCallback((caseId) => {
    setSelectedCases(prev => {
      if (prev.includes(caseId)) return prev.filter(id => id !== caseId);
      return [...prev, caseId];
    });
  }, []);

  const handleAssignmentInputChange = useCallback((caseId, value) => {
    setAssignmentInputs(prev => ({ ...prev, [caseId]: value }));
  }, []);

  return (
    <div className="section active w-full min-h-full bg-bg-primary pb-32">
      {!viewCase && (
        <>
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-bg-secondary p-6 rounded-2xl shadow-sm border border-border">
            <div>
              <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">My Cases</h2>

            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 mt-4 md:mt-0 w-full md:w-auto">
              {user?.role === 'Admin' && (
                <div className="relative overflow-hidden cursor-pointer flex-1 sm:flex-none">
                  <button className={`w-full bg-purple text-white font-black py-2.5 px-4 md:px-6 rounded-2xl shadow-sm text-[10px] md:text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${importing ? 'opacity-70 cursor-wait' : 'hover:bg-purple-600 active:scale-95'}`} disabled={importing}>
                    {importing ? '⏳ IMPORTING...' : <><UploadCloud size={16} /> IMPORT</>}
                  </button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    disabled={importing}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Upload CSV File"
                  />
                </div>
              )}

              {user?.role === 'Admin' && (
                <button onClick={handleExportExcel} className="flex-1 sm:flex-none bg-bg-card hover:bg-bg-input text-text-primary border-2 border-border font-black py-2.5 px-4 md:px-6 rounded-2xl shadow-sm text-[10px] md:text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95">
                  <FileDown size={16} /> Export
                </button>
              )}
              <button
                onClick={() => navigate('/new-case')}
                className="flex-1 sm:flex-none bg-accent text-white font-black py-2.5 px-4 md:px-6 rounded-2xl shadow-sm text-[10px] md:text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-accent-hover active:scale-95"
              >
                <Plus size={16} /> New Case
              </button>
            </div>
          </div>

          {/* Filters Area */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-full sm:min-w-[300px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search by Case ID, Client Name, Status..."
                className="w-full bg-bg-card border-2 border-border rounded-2xl pl-12 pr-4 py-3 text-sm text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none transition-all shadow-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-6 py-3 border-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${isFilterOpen || appliedFilters.status !== 'All Status' || appliedFilters.priority !== 'All Priority' || appliedFilters.assignee !== 'All Assignees' || appliedFilters.date
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-bg-card text-text-secondary border-border hover:bg-bg-card-hover'
                  }`}
              >
                <Filter size={16} />
                Filters
                {(appliedFilters.status !== 'All Status' || appliedFilters.priority !== 'All Priority' || appliedFilters.assignee !== 'All Assignees' || appliedFilters.date) && (
                  <span className="bg-white text-accent rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                    {[appliedFilters.status !== 'All Status', appliedFilters.priority !== 'All Priority', appliedFilters.assignee !== 'All Assignees', !!appliedFilters.date].filter(Boolean).length}
                  </span>
                )}
              </button>

              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:bg-black/40 md:backdrop-blur-none" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="fixed md:absolute top-24 md:top-full left-4 right-4 md:left-auto md:right-0 mt-3 md:w-[450px] bg-bg-card rounded-2xl shadow-2xl border-2 border-border z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-1 min-h-[300px] md:min-h-[350px]">
                      {/* Left Sidebar */}
                      <div className="w-[100px] md:w-1/3 bg-bg-secondary border-r border-border py-4">
                        {['Status', 'Priority', 'Assignees', 'Date'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setActiveFilterType(type)}
                            className={`w-full text-left px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-between transition-all ${activeFilterType === type
                              ? 'bg-bg-card text-accent border-l-4 border-accent'
                              : 'text-text-muted hover:bg-bg-card-hover'
                              }`}
                          >
                            {type}
                            <ChevronRight size={14} className={activeFilterType === type ? 'opacity-100' : 'opacity-0'} />
                          </button>
                        ))}
                      </div>

                      {/* Right Content */}
                      <div className="w-2/3 p-6 overflow-y-auto max-h-[400px] bg-bg-card">
                        {activeFilterType === 'Status' && (
                          <div className="space-y-3">
                            {['All Status', 'New', 'In-progress', 'Settled', 'Stucked'].map((s) => (
                              <label key={s} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                <input
                                  type="radio"
                                  name="status"
                                  checked={tempFilters.status === s}
                                  onChange={() => setTempFilters({ ...tempFilters, status: s })}
                                  className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input"
                                />
                                <span className={`text-sm font-bold ${tempFilters.status === s ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{s}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {activeFilterType === 'Priority' && (
                          <div className="space-y-3">
                            {['All Priority', 'High', 'Medium', 'Low'].map((p) => (
                              <label key={p} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                <input
                                  type="radio"
                                  name="priority"
                                  checked={tempFilters.priority === p}
                                  onChange={() => setTempFilters({ ...tempFilters, priority: p })}
                                  className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input"
                                />
                                <span className={`text-sm font-bold ${tempFilters.priority === p ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{p}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {activeFilterType === 'Assignees' && (
                          <div className="space-y-3">
                            <label className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                              <input
                                type="radio"
                                name="assignee"
                                checked={tempFilters.assignee === 'All Assignees'}
                                onChange={() => setTempFilters({ ...tempFilters, assignee: 'All Assignees' })}
                                className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input"
                              />
                              <span className={`text-sm font-bold ${tempFilters.assignee === 'All Assignees' ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>All Assignees</span>
                            </label>
                            {opsUsers.map((u) => (
                              <label key={u._id} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                <input
                                  type="radio"
                                  name="assignee"
                                  checked={tempFilters.assignee === u.fullName}
                                  onChange={() => setTempFilters({ ...tempFilters, assignee: u.fullName })}
                                  className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input"
                                />
                                <span className={`text-sm font-bold ${tempFilters.assignee === u.fullName ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{u.fullName}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {activeFilterType === 'Date' && (
                          <div className="calendar-container dark-calendar">
                            <Calendar
                              onChange={(val) => setTempFilters({ ...tempFilters, date: format(val, 'yyyy-MM-dd') })}
                              value={tempFilters.date ? new Date(tempFilters.date) : null}
                              tileClassName={({ date, view }) => {
                                if (view === 'month') {
                                  const dateStr = format(date, 'yyyy-MM-dd');
                                  if (availableDates.includes(dateStr)) {
                                    return 'has-cases';
                                  }
                                }
                                return null;
                              }}
                              tileDisabled={({ date, view }) => {
                                if (view === 'month') {
                                  const dateStr = format(date, 'yyyy-MM-dd');
                                  return !availableDates.includes(dateStr);
                                }
                                return false;
                              }}
                              className="border-none shadow-none text-sm bg-transparent"
                            />
                            {tempFilters.date && (
                              <div className="mt-4 text-center">
                                <button
                                  onClick={() => setTempFilters({ ...tempFilters, date: null })}
                                  className="text-xs text-red font-black uppercase tracking-widest hover:underline"
                                >
                                  Clear Selection
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="p-4 md:p-6 bg-bg-secondary border-t-2 border-border flex flex-col sm:flex-row justify-between items-center gap-4">
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-black uppercase tracking-widest text-text-muted hover:text-text-primary transition-all"
                      >
                        Reset All
                      </button>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setIsFilterOpen(false)}
                          className="px-6 py-2 text-xs font-black uppercase tracking-widest text-text-secondary hover:bg-bg-input rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleApplyFilters}
                          className="px-8 py-3 text-xs font-black uppercase tracking-widest text-white bg-accent hover:bg-accent-hover rounded-xl shadow-sm transition-all active:scale-95"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {user?.role === 'Admin' && (
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto md:ml-auto">
                <select
                  className={`border-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none shadow-sm min-w-[200px] transition-all ${bulkAssignUser ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-bg-card text-text-secondary'}`}
                  value={bulkAssignUser}
                  onChange={(e) => {
                    setBulkAssignUser(e.target.value);
                    if (!e.target.value) {
                      setSelectedCases([]);
                    }
                  }}
                >
                  <option value="">Bulk Assign Mode...</option>
                  {opsUsers.map(u => (
                    <option key={`bulk-${u._id}`} value={u.fullName}>Assign: {u.fullName}</option>
                  ))}
                </select>

                {bulkAssignUser && selectedCases.length > 0 && (
                  <button
                    onClick={() => handleBulkAssign(bulkAssignUser)}
                    className="bg-accent hover:bg-accent-hover text-white font-black py-3 px-6 rounded-2xl shadow-sm text-xs transition-all flex items-center gap-2 whitespace-nowrap uppercase tracking-widest animate-pulse"
                  >
                    <Check size={18} /> Confirm ({selectedCases.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {viewCase ? (
        <div className="animate-in fade-in duration-300 pb-20">
          {/* Top Navigation */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
            <div>
              <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">Case Detail</h1>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted font-bold mt-1">
                <span>CFI247</span>
                <ChevronRight size={10} />
                <span>My Cases</span>
                <ChevronRight size={10} />
                <span className="text-accent">Case Detail</span>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right hidden sm:block mr-4">
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">{format(new Date(), 'eee hh:mm aaa')}</div>
              </div>
              <button
                onClick={() => navigate('/new-case')}
                className="bg-accent text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
              >
                + New Case
              </button>
            </div>
          </div>

          <button
            onClick={() => setViewCase(null)}
            className="flex items-center gap-2 text-white hover:text-text-primary mb-10 text-[10px] font-black uppercase tracking-widest transition-all group"
          >
            ← Back to Cases
          </button>

          {/* Case Header Card */}
          <div className="bg-bg-card rounded-2xl border-2 border-border p-8 mb-8 shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-black text-accent uppercase tracking-widest">{viewCase.caseId}</span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${viewCase.priority === 'High' ? 'bg-red-soft text-red' : 'bg-yellow-soft text-yellow'}`}>
                    {viewCase.priority || 'NORMAL'}
                  </span>
                  <span className="bg-accent-soft text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    ESCALATED
                  </span>
                </div>
                <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">
                  {viewCase.typeOfComplaint || 'Payment Dispute'} — {viewCase.companyName}
                </h2>
              </div>
              <div className="flex gap-3">
                {!isEditing && activeDetailTab === 'Case Details' && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-accent text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95 flex items-center gap-2"
                  >
                    <Edit3 size={14} /> Edit Case
                  </button>
                )}

              </div>
            </div>

            {/* Case Progress Bar */}
            <div className="mb-10">
              <div className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-4 opacity-50">Case Progress</div>
              <div className="flex w-full rounded-lg overflow-hidden h-10 ">
                {['Case Logged', 'Assigned', 'Agreement', 'Negotiation', 'Resolution'].map((step, idx) => {
                  const steps = ['Case Logged', 'Assigned', 'Agreement', 'Negotiation', 'Resolution'];
                  const currentIdx = steps.indexOf(viewCase.currentStatus) === -1 ? 1 : steps.indexOf(viewCase.currentStatus);
                  const isCompleted = idx < currentIdx;
                  const isActive = idx === currentIdx;

                  return (
                    <div
                      key={step}
                      className={`flex-1 flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-all ${isCompleted ? 'bg-green-soft text-green' :
                        isActive ? 'bg-accent-soft text-accent border-x border-accent/20' :
                          'bg-bg-secondary text-white opacity-40'
                        }`}
                    >
                      {isCompleted && <Check size={10} className="mr-2" strokeWidth={4} />}
                      {isActive && <div className="w-1.5 h-1.5 bg-accent rounded-full mr-2 animate-pulse" />}
                      {step}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0">
              <div>
                <div className="text-[9px] font-black text-white uppercase tracking-widest mb-1 opacity-50">Client</div>
                <div className="text-sm font-black text-text-primary truncate">{viewCase.clientName}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-white uppercase tracking-widest mb-1 opacity-50">Contact</div>
                <div className="text-sm font-black text-text-primary">{viewCase.clientMobile || '—'}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-white uppercase tracking-widest mb-1 opacity-50">Channel</div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-soft rounded flex items-center justify-center text-blue text-[8px]"><FileText size={10} /></div>
                  <div className="text-sm font-black text-text-primary uppercase">{viewCase.source || 'Email'}</div>
                </div>
              </div>
              <div>
                <div className="text-[9px] font-black text-white uppercase tracking-widest mb-1 opacity-50">Assigned To</div>
                <div className="text-sm font-black text-text-primary truncate">{viewCase.assignedTo || viewCase.initiatedBy || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-white uppercase tracking-widest mb-1 opacity-50">Created</div>
                <div className="text-sm font-black text-text-primary whitespace-nowrap">{viewCase.createdDate ? format(new Date(viewCase.createdDate), 'dd MMM yyyy') : '—'}</div>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="flex gap-10 border-b border-border mb-10 overflow-x-auto scrollbar-none">
            {['Case Details', 'Communications', 'Documents', 'Progress Update', 'History', 'Case Study'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveDetailTab(tab)}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap relative ${activeDetailTab === tab ? 'text-accent' : 'text-text-muted hover:text-text-primary'}`}
              >
                {tab}
                {activeDetailTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-accent rounded-t-full shadow-[0_-4px_10px_rgba(255,102,0,0.3)]" />}
              </button>
            ))}
          </div>

          {/* Detail Sections */}
          {activeDetailTab === 'Case Details' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              <form onSubmit={handleCaseUpdate} className="space-y-0">

                {/* Case Identification */}
                <div className={cardClass}>
                  <h3 className={sectionTitleClass}><Building2 size={18} className="text-accent" />Company & Case Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Company Name</label>
                      <input type="text" className={inputClass} name="companyName" value={formData.companyName || ''} onChange={handleFormChange} placeholder="e.g. ABC Solutions Pvt Ltd" required disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Case Title</label>
                      <input type="text" className={`${inputClass} !bg-bg-secondary !border-dashed`} value={formData.caseTitle || ''} placeholder="Auto generated title" readOnly required disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Priority</label>
                      <select className={inputClass} name="priority" value={formData.priority || 'Medium'} onChange={handleFormChange} required disabled={!isEditing}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Source of Complaint</label>
                      <select className={inputClass} name="sourceOfComplaint" value={formData.sourceOfComplaint || ''} onChange={handleFormChange} disabled={!isEditing}>
                        <option value="">-- Select --</option>
                        <option value="Email">Email</option>
                        <option value="Call">Call</option>
                        <option value="Office Visit">Office Visit</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Toll Free">Toll Free</option>
                      </select>
                    </div>
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Type of Complaint</label>
                      <select className={inputClass} name="typeOfComplaint" value={formData.typeOfComplaint || ''} onChange={handleFormChange} required disabled={!isEditing}>
                        <option value="">-- Select --</option>
                        <option value="Legal Notice">Legal Notice</option>
                        <option value="Cyber Complaint">Cyber Complaint</option>
                        <option value="Consumer Complaint">Consumer Complaint</option>
                        <option value="FIR">FIR</option>
                        <option value="Litigation">Litigation</option>
                        <option value="Escalation">Escalation</option>
                        <option value="General Query">General Query</option>
                        <option value="Lien">Lien</option>
                      </select>
                    </div>
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Brand Name</label>
                      <select className={inputClass} name="brandName" value={formData.brandName || ''} onChange={handleFormChange} required disabled={!isEditing}>
                        <option value="">-- Select --</option>
                        <option value="Startupflora">Startupflora</option>
                      </select>
                    </div>
                  </div>

                  {/* Conditional Complaint Fields */}
                  {(formData.typeOfComplaint === 'Cyber Complaint' || formData.typeOfComplaint === 'FIR' || formData.typeOfComplaint === 'Consumer Complaint') && (
                    <div className="mt-6 pt-6 border-t border-border bg-red-soft/20 -mx-8 px-8 pb-4">
                      {formData.typeOfComplaint === 'Cyber Complaint' && (
                        <div className="mb-4">
                          <label className={labelClass}>Acknowledgment Numbers</label>
                          {cyberAcks.map((ack, idx) => (
                            <div key={idx} className="flex gap-3 mb-3">
                              <input
                                type="text"
                                className={inputClass}
                                placeholder="e.g. 1234567890"
                                value={ack}
                                onChange={(e) => handleCyberAckChange(idx, e.target.value)}
                                disabled={!isEditing}
                              />
                              {cyberAcks.length > 1 && isEditing && (
                                <button type="button" onClick={() => removeCyberAck(idx)} className="bg-red-soft text-red px-4 rounded-xl font-black hover:bg-red hover:text-white transition-all">×</button>
                              )}
                            </div>
                          ))}
                          {isEditing && (
                            <button type="button" onClick={addCyberAck} className="text-xs text-accent font-black hover:underline mt-1 uppercase tracking-widest">+ Add Another Number</button>
                          )}
                        </div>
                      )}
                      {formData.typeOfComplaint === 'FIR' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                          <div>
                            <label className={labelClass}>FIR Number</label>
                            <input type="text" className={inputClass} name="firNumber" value={formData.firNumber} onChange={handleFormChange} disabled={!isEditing} />
                          </div>
                          <div>
                            <FileUpload onUploadSuccess={(url) => setFormData(p => ({ ...p, firFileLink: url }))} label="Upload FIR Document" disabled={!isEditing} />
                          </div>
                        </div>
                      )}
                      {formData.typeOfComplaint === 'Consumer Complaint' && (
                        <div className="mb-4">
                          <label className={labelClass}>Grievance Number</label>
                          <input type="text" className={inputClass} name="grievanceNumber" value={formData.grievanceNumber} onChange={handleFormChange} disabled={!isEditing} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Services Sold Configuration */}
                <div className={`${cardClass} border-yellow-soft/50 shadow-[0_0_10px_rgba(250,204,21,0.05)]`}>
                  <h3 className={sectionTitleClass}><Wrench size={18} className="text-yellow" /> Services Sold Configuration</h3>

                  <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-border pb-8">
                    <div className="w-full md:w-1/4">
                      <label className={labelClass}>Service Mode</label>
                      <select className={`${inputClass} font-black uppercase text-[11px] tracking-widest`} value={serviceMode} onChange={(e) => {
                        setServiceMode(e.target.value);
                        if (e.target.value === 'Single Service') setServices([services[0]]);
                      }} disabled={!isEditing}>
                        <option value="Single Service">Single Service</option>
                        <option value="Multiple Services">Multiple Services</option>
                      </select>
                    </div>
                    <div className="w-full md:w-3/4">
                      <label className={labelClass}>Engagement Note</label>
                      <textarea
                        className={`${inputClass} h-12 border-dashed !bg-bg-secondary italic`}
                        name="engagementNote"
                        value={formData.engagementNote}
                        onChange={handleFormChange}
                        placeholder="Brief summary of what was promised/sold..."
                        disabled={!isEditing}
                      ></textarea>
                    </div>
                  </div>

                  {services.map((svc, idx) => (
                    <div key={idx} className="relative bg-bg-input p-6 rounded-2xl border border-border mb-6">
                      {services.length > 1 && isEditing && (
                        <button type="button" onClick={() => removeService(idx)} className="absolute top-4 right-4 text-red hover:bg-red-soft p-2 rounded-xl transition-all" title="Remove Service">
                          <X size={18} />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                          <label className={labelClass}>Service Name</label>
                          <input type="text" className={inputClass} placeholder="Enter service name" value={svc.serviceName} onChange={e => handleServiceChange(idx, 'serviceName', e.target.value)} disabled={!isEditing} />
                        </div>
                        <div>
                          <label className={labelClass}>Service Amount</label>
                          <input type="text" className={inputClass} placeholder="₹" value={svc.serviceAmount} onChange={e => handleServiceChange(idx, 'serviceAmount', e.target.value)} disabled={!isEditing} />
                        </div>
                        <div>
                          <label className={labelClass}>MOU Signed</label>
                          <select className={inputClass} value={svc.mouSigned} onChange={e => handleServiceChange(idx, 'mouSigned', e.target.value)} disabled={!isEditing}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Signed MOU Amount</label>
                          <input type="text" className={inputClass} placeholder="₹" value={svc.signedMouAmount} onChange={e => handleServiceChange(idx, 'signedMouAmount', e.target.value)} disabled={!isEditing} />
                        </div>
                        <div>
                          <label className={labelClass}>Work Status</label>
                          <select className={inputClass} value={svc.workStatus} onChange={e => handleServiceChange(idx, 'workStatus', e.target.value)} disabled={!isEditing}>
                            <option value="Not Initiated">Not Initiated</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="On Hold">On Hold</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>BDA</label>
                          <input type="text" className={inputClass} placeholder="BDA Name" value={svc.bda} onChange={e => handleServiceChange(idx, 'bda', e.target.value)} disabled={!isEditing} />
                        </div>
                        <div>
                          <label className={labelClass}>Department</label>
                          <select className={inputClass} value={svc.department} onChange={e => handleServiceChange(idx, 'department', e.target.value)} disabled={!isEditing}>
                            <option value="Operations">Operations</option>
                            <option value="Legal">Legal</option>
                            <option value="Accounts">Accounts</option>
                            <option value="Tech">Tech</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {serviceMode === 'Multiple Services' && (
                    <button type="button" onClick={addService} className="mt-2 text-xs bg-bg-secondary hover:bg-bg-input text-text-primary font-black py-3 px-6 rounded-2xl border-2 border-border transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm">
                      <Plus size={16} /> Add Another Service
                    </button>
                  )}
                </div>

                {/* Client Information */}
                <div className={cardClass}>
                  <h3 className={sectionTitleClass}><UserIcon size={18} className="text-blue" /> Client Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Client Name</label>
                      <input type="text" className={inputClass} name="clientName" value={formData.clientName} onChange={handleFormChange} placeholder="Full name" required disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={labelClass}>Mobile</label>
                      <input type="text" className={`${inputClass} ${formErrors.clientMobile ? 'border-red bg-red-soft' : ''}`} name="clientMobile" value={formData.clientMobile} onChange={handleFormChange} placeholder="10 Digit Number" required disabled={!isEditing} />
                      {formErrors.clientMobile && <p className="text-[9px] text-red font-black mt-2 uppercase tracking-widest">{formErrors.clientMobile}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" className={`${inputClass} ${formErrors.clientEmail ? 'border-red bg-red-soft' : ''}`} name="clientEmail" value={formData.clientEmail || ''} onChange={handleFormChange} placeholder="example@gmail.com" disabled={!isEditing} />
                      {formErrors.clientEmail && <p className="text-[9px] text-red font-black mt-2 uppercase tracking-widest">{formErrors.clientEmail}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>State</label>
                      <SearchableSelect
                        name="state"
                        options={indianStates}
                        value={formData.state}
                        onChange={handleFormChange}
                        placeholder="Search state..."
                        className="bg-bg-input text-text-primary"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className={cardClass}>
                  <h3 className={sectionTitleClass}><IndianRupee size={18} className="text-yellow" /> Financial Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div>
                      <label className={labelClass}>Total Amount Paid (₹)</label>
                      <input type="text" className={`${inputClass} !bg-bg-secondary !border-dashed font-black`} name="totalAmtPaid" value={formData.totalAmtPaid || ''} readOnly placeholder="Auto calculated" disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={labelClass}>MOU Signed?</label>
                      <select className={inputClass} name="mouSigned" value={formData.mouSigned || 'No'} onChange={handleFormChange} disabled={!isEditing}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Total MOU Value (₹)</label>
                      <input type="text" className={`${inputClass} !bg-bg-secondary !border-dashed font-black`} name="totalMouValue" value={formData.totalMouValue || ''} readOnly placeholder="Auto calculated" disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={labelClass}>Amount In Dispute (₹)</label>
                      <input type="text" className={`${inputClass} bg-blue-soft font-black text-blue border-blue-soft`} name="amtInDispute" value={formData.amtInDispute || ''} readOnly placeholder="Auto calculated" disabled={!isEditing} />
                    </div>
                  </div>
                </div>

                {/* Risk & Threat Assessment */}
                <div className={cardClass}>
                  <h3 className={sectionTitleClass}><AlertTriangle size={18} className="text-red" /> Risk & Threat Assessment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div>
                      <label className={labelClass}>Social Media Risk</label>
                      <select className={inputClass} name="smRisk" value={formData.smRisk || 'None'} onChange={handleFormChange} disabled={!isEditing}>
                        <option value="None">None</option>
                        <option value="Low">Low</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Consumer Complaint Filed?</label>
                      <select className={inputClass} name="consumerComplaintFiled" value={formData.consumerComplaintFiled || 'No'} onChange={handleFormChange} disabled={!isEditing}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Police / Cyber Threat</label>
                      <select className={inputClass} name="policeThreat" value={formData.policeThreat || 'None'} onChange={handleFormChange} disabled={!isEditing}>
                        <option value="None">None</option>
                        <option value="Low">Low</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Case Narrative */}
                <div className={cardClass}>
                  <h3 className={sectionTitleClass}><FileText size={18} className="text-text-muted" /> Case Narrative</h3>
                  <div className="grid grid-cols-1 gap-6 mb-8">
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Case Summary</label>
                      <textarea className={`${inputClass} min-h-[100px]`} name="caseSummary" value={formData.caseSummary || ''} onChange={handleFormChange} placeholder="Brief overview of the case..." required disabled={!isEditing}></textarea>
                    </div>
                    <div>
                      <label className={labelClass}>Client's Main Allegation</label>
                      <textarea className={`${inputClass} min-h-[100px]`} name="clientAllegation" value={formData.clientAllegation || ''} onChange={handleFormChange} placeholder="What the client claims..." disabled={!isEditing}></textarea>
                    </div>
                  </div>

                  <div className="bg-bg-secondary border-2 border-border rounded-2xl p-8 mb-8">
                    <label className="block text-[11px] font-black text-text-muted mb-6 uppercase tracking-widest"> Proofs</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="flex items-center justify-between bg-bg-card border-2 border-border p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <PhoneIncoming size={16} className="text-accent" />
                          <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Call Recording</span>
                        </div>
                        <select className="bg-bg-input border border-border rounded-xl text-xs font-black p-2 outline-none" name="proofCallRec" value={formData.proofCallRec || 'No'} onChange={handleFormChange} disabled={!isEditing}>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between bg-bg-card border-2 border-border p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <MessageCircle size={16} className="text-green" />
                          <span className="text-xs font-black text-text-secondary uppercase tracking-widest">WhatsApp Chat</span>
                        </div>
                        <select className="bg-bg-input border border-border rounded-xl text-xs font-black p-2 outline-none" name="proofWaChat" value={formData.proofWaChat || 'No'} onChange={handleFormChange} disabled={!isEditing}>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between bg-bg-card border-2 border-border p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Video size={16} className="text-purple" />
                          <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Video Call</span>
                        </div>
                        <select className="bg-bg-input border border-border rounded-xl text-xs font-black p-2 outline-none" name="proofVideoCall" value={formData.proofVideoCall || 'No'} onChange={handleFormChange} disabled={!isEditing}>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between bg-bg-card border-2 border-border p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <Mail size={16} className="text-blue" />
                          <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Funding Email</span>
                        </div>
                        <select className="bg-bg-input border border-border rounded-xl text-xs font-black p-2 outline-none" name="proofFundingEmail" value={formData.proofFundingEmail || 'No'} onChange={handleFormChange} disabled={!isEditing}>
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Case Study Intelligence (For PDF Generation) */}
                <div className={cardClass}>
                  <h3 className={sectionTitleClass}><Zap size={18} className="text-accent" /> Case Study Intelligence</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div>
                      <label className={labelClass}>Lien Marked On (Details)</label>
                      <input type="text" className={inputClass} name="lienMarkedOn" value={formData.lienMarkedOn || ''} onChange={handleFormChange} placeholder="e.g. Acc No: ... - Rs. 5,000" disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={labelClass}>Lien Bank / IFSC</label>
                      <input type="text" className={inputClass} name="lienBank" value={formData.lienBank || ''} onChange={handleFormChange} placeholder="e.g. Axis Bank | UTIB0001645" disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={labelClass}>Refund Status</label>
                      <input type="text" className={inputClass} name="refundStatus" value={formData.refundStatus || ''} onChange={handleFormChange} placeholder="e.g. Fully Refunded / Pending" disabled={!isEditing} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-bg-secondary p-6 rounded-2xl border-2 border-dashed border-border">
                    <div className="col-span-full mb-2">
                      <h4 className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} /> Client Bank Details
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Acc 1 Number</label>
                        <input type="text" className={inputClass} name="acc1No" value={formData.acc1No || ''} onChange={handleFormChange} disabled={!isEditing} />
                      </div>
                      <div>
                        <label className={labelClass}>Acc 1 IFSC</label>
                        <input type="text" className={inputClass} name="acc1Ifsc" value={formData.acc1Ifsc || ''} onChange={handleFormChange} disabled={!isEditing} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Acc 2 Number</label>
                        <input type="text" className={inputClass} name="acc2No" value={formData.acc2No || ''} onChange={handleFormChange} disabled={!isEditing} />
                      </div>
                      <div>
                        <label className={labelClass}>Acc 2 IFSC</label>
                        <input type="text" className={inputClass} name="acc2Ifsc" value={formData.acc2Ifsc || ''} onChange={handleFormChange} disabled={!isEditing} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Key Pending Issue</label>
                      <textarea className={`${inputClass} min-h-[80px]`} name="keyPendingIssue" value={formData.keyPendingIssue || ''} onChange={handleFormChange} placeholder="e.g. Unresolved Lien on Company Account..." disabled={!isEditing}></textarea>
                    </div>
                    <div>
                      <label className={labelClass}>Recommended Next Steps</label>
                      <textarea className={`${inputClass} min-h-[80px]`} name="recommendedNextSteps" value={formData.recommendedNextSteps || ''} onChange={handleFormChange} placeholder="e.g. Follow up with Cyber Cell..." disabled={!isEditing}></textarea>
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-4 pt-6 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-bg-input hover:bg-bg-secondary text-text-primary px-10 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-accent hover:bg-accent-hover text-white px-10 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
                    >
                      Save Case
                    </button>
                  </div>
                )}
              </form>
            </div>
          ) : activeDetailTab === 'Communications' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
              <div className="lg:col-span-12">
                <div className="bg-bg-card rounded-2xl border-2 border-border overflow-hidden">
                  <div className="p-8 border-b-2 border-border bg-bg-secondary/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg">💬</div>
                      <div>
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">Communication</h3>
                        <div className="text-[10px] font-black text-accent uppercase tracking-widest mt-0.5 opacity-80">
                          Case ID: {viewCase.caseId}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <form onSubmit={handleCommSubmit} className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                      {/* Form Part */}
                      <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">DATE & TIME</label>
                            <input
                              type="datetime-local"
                              value={commFormData.dateTime}
                              onChange={(e) => setCommFormData({ ...commFormData, dateTime: e.target.value })}
                              className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">MODE</label>
                            <select
                              value={commFormData.mode}
                              onChange={(e) => setCommFormData({ ...commFormData, mode: e.target.value })}
                              className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all uppercase tracking-widest shadow-sm"
                            >
                              <option value="Call">Call</option>
                              <option value="WhatsApp">WhatsApp</option>
                              <option value="Email">Email</option>
                              <option value="Meeting">Meeting</option>
                              <option value="Legal Notice">Legal Notice</option>
                              <option value="SMS">SMS</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">DIRECTION</label>
                            <select
                              value={commFormData.direction}
                              onChange={(e) => setCommFormData({ ...commFormData, direction: e.target.value })}
                              className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all uppercase tracking-widest shadow-sm"
                            >
                              <option value="Incoming">Incoming</option>
                              <option value="Outgoing">Outgoing</option>

                            </select>
                          </div>
                          {/* <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">
                              {commFormData.direction === 'Outgoing' ? 'TO' : 'FROM'}
                            </label>
                            <input
                              type="text"
                              value={commFormData.fromTo}
                              onChange={(e) => setCommFormData({ ...commFormData, fromTo: e.target.value })}
                              placeholder={commFormData.direction === 'Outgoing' ? 'Sent to' : 'Received from'}
                              className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all uppercase tracking-widest shadow-sm"
                            />
                          </div> */}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-accent uppercase tracking-[0.2em] ml-1 after:content-['*'] after:ml-0.5">SUMMARY</label>
                          <textarea
                            value={commFormData.summary}
                            onChange={(e) => setCommFormData({ ...commFormData, summary: e.target.value })}
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-6 py-5 text-sm font-medium text-text-primary focus:border-accent outline-none transition-all h-24 resize-none italic shadow-inner"
                            placeholder="What was communicated..."
                            required
                          ></textarea>
                        </div>

                        {/* <div className="space-y-2">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">DEMAND</label>
                          <textarea
                            value={commFormData.exactDemand}
                            onChange={(e) => setCommFormData({ ...commFormData, exactDemand: e.target.value })}
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-6 py-5 text-sm font-medium text-text-primary focus:border-accent outline-none transition-all h-24 resize-none italic shadow-inner"
                            placeholder="Verbatim if important..."
                          ></textarea>
                        </div> */}

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Refund Demanded (₹)</label>
                            <input
                              type="text"
                              value={commFormData.refundDemanded}
                              onChange={(e) => setCommFormData({ ...commFormData, refundDemanded: e.target.value })}
                              placeholder="0"
                              className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Legal Threat?</label>
                            <select
                              value={commFormData.legalThreat}
                              onChange={(e) => setCommFormData({ ...commFormData, legalThreat: e.target.value })}
                              className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all uppercase tracking-widest shadow-sm"
                            >
                              <option value="No">No</option>
                              <option value="Yes - Verbal">Yes - Verbal</option>
                              <option value="Yes - Written">Yes - Written</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Social Media Mentioned?</label>
                            <select
                              value={commFormData.smMentioned}
                              onChange={(e) => setCommFormData({ ...commFormData, smMentioned: e.target.value })}
                              className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent transition-all uppercase tracking-widest shadow-sm"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Logged By</label>
                            <input
                              type="text"
                              readOnly
                              value={user?.fullName || user?.email || 'System'}
                              className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none opacity-50 shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="bg-bg-input/50 border-2 border-dashed border-border rounded-2xl p-6 space-y-4">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">ATTACH PROOF FILE (OR PASTE URL)</label>
                          <div className="mb-4">
                            <label className="block text-[9px] font-black text-text-muted uppercase tracking-widest mb-3 ml-1">ATTACHMENT</label>
                            <FileUpload onUploadSuccess={(url) => setCommFormData({ ...commFormData, fileLink: url })} label="Click to browse or drag & drop (Max 10MB)" />
                          </div>
                          <div className="relative group">
                            <input
                              type="text"
                              value={commFormData.fileLink}
                              onChange={(e) => setCommFormData({ ...commFormData, fileLink: e.target.value })}
                              placeholder="Or paste Google Drive / URL link..."
                              className="w-full bg-bg-card border-2 border-border rounded-xl px-5 py-3 text-[10px] font-black text-text-primary outline-none focus:border-accent transition-all shadow-inner"
                            />
                          </div>
                        </div>

                        <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-5 px-8 rounded-2xl shadow-lg shadow-orange-900/10 text-xs uppercase tracking-[0.25em] transition-all active:scale-95 w-full flex items-center justify-center gap-3">
                          <Check size={18} /> Log Communication
                        </button>
                        <div className="text-center pt-2">
                          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest bg-bg-card border border-border px-4 py-2 rounded-lg">
                            Case ID: <span className="text-accent">{viewCase.caseId}</span>
                          </span>
                        </div>
                      </div>

                      {/* Ledger Part */}
                      <div className="bg-bg-input/20 rounded-2xl border-2 border-border p-6 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-1.5 h-6 bg-accent rounded-full" />
                          <h4 className="text-[10px] font-black text-text-primary uppercase tracking-widest">Recent Signals</h4>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto scrollbar-thin max-h-[450px] pr-2">
                          {caseComms.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                              <div className="text-4xl mb-4">📡</div>
                              <div className="text-[10px] font-black uppercase tracking-widest">No Signals Recorded</div>
                            </div>
                          ) : (
                            caseComms.slice(0, 5).map((comm) => (
                              <div key={comm._id} className="bg-bg-card p-5 rounded-xl border border-border shadow-sm group hover:border-accent transition-all cursor-pointer">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                    {format(new Date(comm.dateTime || comm.createdAt), 'dd MMM, hh:mm aaa')}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${comm.direction === 'Incoming' ? 'bg-green-soft text-green' : 'bg-blue-soft text-blue'}`}>
                                    {comm.direction}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-text-secondary line-clamp-2 italic leading-relaxed">"{comm.summary}"</p>
                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[9px] font-black text-accent uppercase tracking-widest">{comm.mode} via {comm.fromTo || 'Client'}</span>
                                  <div className="flex gap-2">
                                    <div className="w-1 h-1 bg-accent rounded-full" />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {caseComms.length > 5 && (
                          <div className="text-center pt-6 border-t border-border mt-4">
                            <button className="text-[9px] font-black text-text-muted uppercase tracking-widest hover:text-accent transition-colors underline decoration-dashed">Load Entire Transmission History</button>
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ) : activeDetailTab === 'Documents' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* MOU Upload Section */}
                <div className="bg-bg-card rounded-2xl border-2 border-border shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-border bg-bg-secondary/30 flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                      <FileText size={16} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Case Documents</h3>
                      <div className="text-[9px] font-black text-accent uppercase tracking-widest mt-1 opacity-80">
                        Case ID: {viewCase.caseId}
                      </div>
                    </div>
                  </div>
                  <div className="p-8 flex-1">
                    <form onSubmit={handleMouSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Document Type</label>
                        <SearchableSelect
                          name="mouType"
                          options={['Legal Notice', 'Payment Receipt', 'MOU/Agreement', 'Whatsapp', 'Email', 'Police Complaint', 'Meeting', 'Refund Proof', 'Other']}
                          value={mouFormData.mouType}
                          onChange={(e) => setMouFormData({ ...mouFormData, mouType: e.target.value })}
                          placeholder="Select Document Type..."
                          className="bg-bg-input text-text-primary"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1 after:content-['*'] after:text-red after:ml-0.5">UPLOAD DOCUMENT</label>
                        <FileUpload
                          onUploadSuccess={(url) => setMouFormData({ ...mouFormData, fileLink: url })}
                          label="Click to upload or drag & drop. PDF, DOCX - Max 20MB"
                          icon={FileText}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1"> DATE</label>
                          <input
                            type="date"
                            value={mouFormData.mouDate}
                            onChange={(e) => setMouFormData({ ...mouFormData, mouDate: e.target.value })}
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">SIGNATORY NAME (CLIENT)</label>
                          <input
                            type="text"
                            value={mouFormData.signatoryName}
                            onChange={(e) => setMouFormData({ ...mouFormData, signatoryName: e.target.value })}
                            placeholder="Name of client signatory"
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">UPLOADED BY</label>
                          <input
                            type="text"
                            value={user?.fullName || user?.email || 'System'}
                            readOnly
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none opacity-50 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">REMARKS</label>
                        <textarea
                          rows="2"
                          value={mouFormData.remarks}
                          onChange={(e) => setMouFormData({ ...mouFormData, remarks: e.target.value })}
                          placeholder="Any notes about this MOU version..."
                          className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent min-h-[80px]"
                        ></textarea>
                      </div>

                      <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-4 px-10 rounded-xl shadow-lg shadow-orange-900/20 text-[10px] uppercase tracking-[0.25em] transition-all active:scale-95">
                        Submit
                      </button>
                      <div className="text-center pt-2">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest bg-bg-card border border-border px-4 py-2 rounded-lg">
                          Case ID: <span className="text-accent">{viewCase.caseId}</span>
                        </span>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Case Documents Table - Moved to Right */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-bg-secondary rounded-lg flex items-center justify-center text-text-muted">
                      <FileText size={16} />
                    </div>
                    <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Document Index</h3>
                  </div>

                  <div className="bg-bg-card rounded-2xl border-2 border-border shadow-sm overflow-hidden min-h-[450px]">
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-bg-input/50 text-text-muted text-[9px] font-black uppercase tracking-widest border-b border-border sticky top-0 z-10 backdrop-blur-md">
                            <th className="px-4 py-4">ID</th>
                            <th className="px-4 py-4">FILE</th>
                            <th className="px-4 py-4">TYPE</th>
                            <th className="px-4 py-4">DATE</th>
                            <th className="px-4 py-4">REMARKS</th>
                            <th className="px-4 py-4 text-right pr-6">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {caseDocs.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-6 py-20 text-center">
                                <div className="flex flex-col items-center gap-3 opacity-30">
                                  <FileText size={40} />
                                  <div className="text-[10px] font-black uppercase tracking-widest">No documents yet</div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            caseDocs.map(doc => {
                              let label = 'DOCUMENT';
                              let colorClass = 'bg-bg-secondary text-text-muted';
                              let Icon = FileText;

                              if (doc.docType?.includes('MOU')) {
                                label = 'MOU';
                                colorClass = 'bg-yellow-soft text-yellow';
                              } else if (doc.docType === 'Email' || doc.docType === 'Whatsapp') {
                                label = doc.docType.toUpperCase();
                                colorClass = 'bg-blue-soft text-blue';
                                Icon = Mail;
                              } else if (doc.docType === 'Legal Notice' || doc.docType === 'Police Complaint') {
                                label = 'LEGAL';
                                colorClass = 'bg-red-soft text-red';
                              } else if (doc.docType === 'Payment Receipt' || doc.docType === 'Refund Proof') {
                                label = 'FINANCE';
                                colorClass = 'bg-green-soft text-green';
                              }

                              return (
                                <tr key={doc._id} className="hover:bg-bg-input/50 transition-all group border-b border-border last:border-0">
                                  <td className="px-4 py-4 font-mono text-[9px] text-accent font-black">
                                    {doc.docId || '---'}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <Icon size={12} className="text-text-muted" />
                                      <span className="text-[10px] font-bold text-text-primary truncate max-w-[120px]" title={doc.fileLink?.split('/').pop()}>
                                        {doc.fileLink?.split('/').pop() || doc.summary}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${colorClass}`}>
                                      {label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-[9px] font-bold text-text-muted">
                                    {doc.createdAt ? format(new Date(doc.createdAt), 'dd MMM yy') : '--'}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-[9px] text-text-secondary line-clamp-2 max-w-[150px]" title={doc.remarks}>
                                      {doc.remarks || '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-right pr-6">
                                    <a
                                      href={doc.fileLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-accent-soft hover:bg-accent text-accent hover:text-white p-2 rounded-lg transition-all inline-flex items-center justify-center"
                                      title="View Document"
                                    >
                                      <Eye size={12} />
                                    </a>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeDetailTab === 'Action Log' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Action Log Form */}
                <div className="bg-bg-card rounded-2xl border-2 border-border shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-border bg-bg-secondary/30 flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                      <Activity size={16} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Action Log</h3>
                      <div className="text-[9px] font-black text-accent uppercase tracking-widest mt-1 opacity-80">
                        Case ID: {viewCase.caseId}
                      </div>
                    </div>
                  </div>
                  <div className="p-8 flex-1">
                    <form onSubmit={handleActionLogSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Action Modality</label>
                          <select
                            value={actionLogFormData.actionModality}
                            onChange={(e) => setActionLogFormData({ ...actionLogFormData, actionModality: e.target.value })}
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent uppercase tracking-widest shadow-sm"
                          >
                            <option value="Call">Call</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Email">Email</option>
                            <option value="Meeting">Meeting</option>
                            <option value="Visit">Visit</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Update By</label>
                          <input
                            type="text"
                            value={user?.fullName || user?.email || 'System'}
                            readOnly
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none opacity-50 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Next Scheduled Date</label>
                          <input
                            type="date"
                            value={actionLogFormData.nextScheduledDate}
                            onChange={(e) => setActionLogFormData({ ...actionLogFormData, nextScheduledDate: e.target.value })}
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">State Change Authorization</label>
                          <select
                            value={actionLogFormData.stateChangeAuthorization}
                            onChange={(e) => setActionLogFormData({ ...actionLogFormData, stateChangeAuthorization: e.target.value })}
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent uppercase tracking-widest shadow-sm"
                          >
                            <option value="New">New</option>
                            <option value="In-progress">In-progress</option>
                            <option value="Settled">Settled</option>
                            <option value="Stucked">Stucked</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <FileUpload
                          onUploadSuccess={(url) => setActionLogFormData({ ...actionLogFormData, attachment: url })}
                          label="Attachment (Proof/File)"
                        />
                        {actionLogFormData.attachment && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-blue-soft rounded-lg">
                            <Paperclip size={14} className="text-blue" />
                            <span className="text-[10px] font-black text-blue truncate">{actionLogFormData.attachment}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">REMARKS</label>
                        <textarea
                          rows="3"
                          value={actionLogFormData.remarks}
                          onChange={(e) => setActionLogFormData({ ...actionLogFormData, remarks: e.target.value })}
                          placeholder="What happened during this action?"
                          className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent min-h-[100px]"
                        ></textarea>
                      </div>

                      <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-4 px-10 rounded-xl shadow-lg shadow-orange-900/20 text-[10px] uppercase tracking-[0.25em] transition-all active:scale-95 w-full">
                        Save Action Entry
                      </button>
                    </form>
                  </div>
                </div>

                {/* Action Log Table */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-bg-secondary rounded-lg flex items-center justify-center text-text-muted">
                      <List size={16} />
                    </div>
                    <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Operational History</h3>
                  </div>

                  <div className="bg-bg-card rounded-2xl border-2 border-border shadow-sm overflow-hidden min-h-[450px]">
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-bg-input/50 text-text-muted text-[9px] font-black uppercase tracking-widest border-b border-border sticky top-0 z-10 backdrop-blur-md">
                            <th className="px-4 py-4">MODALITY</th>
                            <th className="px-4 py-4">NODE</th>
                            <th className="px-4 py-4">REMARKS</th>
                            <th className="px-4 py-4">STATE</th>
                            <th className="px-4 py-4">DATE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {caseActionLogs.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-20 text-center text-text-muted text-[10px] font-black uppercase tracking-widest">No actions logged yet</td>
                            </tr>
                          ) : (
                            caseActionLogs.map((log) => (
                              <tr key={log._id} className="hover:bg-bg-input/50 transition-colors">
                                <td className="px-4 py-4">
                                  <span className="text-[10px] font-black text-text-primary uppercase">{log.actionModality}</span>
                                </td>
                                <td className="px-4 py-4 text-[10px] text-text-secondary">{log.operatorNode}</td>
                                <td className="px-4 py-4">
                                  <p className="text-[10px] text-text-secondary line-clamp-1 italic">"{log.remarks}"</p>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.stateChangeAuthorization === 'Settled' ? 'bg-green-soft text-green' :
                                    log.stateChangeAuthorization === 'Stucked' ? 'bg-red-soft text-red' :
                                      'bg-blue-soft text-blue'
                                    }`}>
                                    {log.stateChangeAuthorization}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-[9px] text-text-muted">
                                  {format(new Date(log.dateTime || log.createdAt), 'dd MMM yyyy')}
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
          ) : activeDetailTab === 'Progress Update' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              {/* Left Column - Update Form */}
              <div className="lg:col-span-7 bg-bg-card rounded-2xl border-2 border-border p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                    <Activity size={18} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Update Case Progress</h3>
                    <div className="text-[9px] font-black text-accent uppercase tracking-widest mt-1 opacity-80">
                      Case ID: {viewCase.caseId}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProgressSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-text-muted uppercase tracking-widest ml-1">CURRENT STAGE</label>
                    <select
                      className="w-full bg-bg-input border-2 rounded-xl px-3 py-2 text-[10px] font-black outline-none transition-all border-border text-text-secondary"
                      value={progressFormData.stage}
                      onChange={(e) => {
                        const stageOrder = ['Case Logged', 'Assigned', 'Agreement', 'Negotiation', 'Resolution'];
                        const newStage = e.target.value;
                        const newPercentage = (stageOrder.indexOf(newStage) + 1) * 20;
                        const updatedChecklist = buildChecklistForStage(newStage);

                        setProgressFormData({
                          ...progressFormData,
                          stage: newStage,
                          percentage: newPercentage
                        });
                        setChecklist(updatedChecklist);
                      }}
                    >
                      <option value="Case Logged">Case Logged</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Agreement">Agreement</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Resolution">Resolution</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest after:content-['*'] after:text-red after:ml-0.5">PROGRESS %</label>
                      <span className="text-[10px] font-black text-accent">{progressFormData.percentage}%</span>
                    </div>
                    <div className="relative pt-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progressFormData.percentage}
                        readOnly
                        disabled
                        className="w-full h-1.5 bg-bg-input rounded-lg appearance-none cursor-default accent-accent transition-all opacity-50"
                      />
                      <div className="flex justify-between mt-2">
                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">0%</span>
                        <span className="text-[8px] font-black text-accent uppercase tracking-widest">{progressFormData.percentage}%</span>
                        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1 after:content-['*'] after:text-red after:ml-0.5">UPDATE SUMMARY</label>
                    <textarea
                      value={progressFormData.summary}
                      onChange={(e) => setProgressFormData({ ...progressFormData, summary: e.target.value })}
                      placeholder="What has been done? What's the current status?"
                      className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-3 text-xs font-black text-text-primary focus:border-accent outline-none transition-all h-20 resize-none shadow-sm"
                    ></textarea>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">NEXT ACTION PLANNED</label>
                    <input
                      type="text"
                      value={progressFormData.nextAction}
                      onChange={(e) => setProgressFormData({ ...progressFormData, nextAction: e.target.value })}
                      placeholder="e.g. Send final MOU for signature"
                      className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-3.5 text-xs font-black text-text-primary outline-none focus:border-accent transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">BLOCKERS / ISSUES</label>
                    <textarea
                      value={progressFormData.blockers}
                      onChange={(e) => setProgressFormData({ ...progressFormData, blockers: e.target.value })}
                      placeholder="Any blockers slowing the resolution?"
                      className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-3 text-xs font-black text-text-primary focus:border-accent outline-none transition-all h-16 resize-none shadow-sm"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">DATE</label>
                      <input
                        type="date"
                        value={progressFormData.followUpDate}
                        onChange={(e) => setProgressFormData({ ...progressFormData, followUpDate: e.target.value })}
                        className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-3.5 text-xs font-black text-text-primary outline-none focus:border-accent shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">ESCALATE TO</label>
                      <select
                        value={progressFormData.escalateTo}
                        onChange={(e) => setProgressFormData({ ...progressFormData, escalateTo: e.target.value })}
                        className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-3.5 text-xs font-black text-text-primary outline-none focus:border-accent uppercase tracking-widest"
                      >
                        <option value="">— No escalation —</option>
                        <option>Manager</option>
                        <option>Team Lead</option>
                        <option>Director</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-4 px-10 rounded-xl shadow-lg shadow-orange-900/20 text-[10px] uppercase tracking-[0.25em] transition-all active:scale-95">
                    Submit
                  </button>
                  <div className="text-center pt-2">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest bg-bg-card border border-border px-4 py-2 rounded-lg">
                      Case ID: <span className="text-accent">{viewCase.caseId}</span>
                    </span>
                  </div>
                </form>
              </div>

              {/* Right Column - Timeline & Checklist */}
              <div className="lg:col-span-5 space-y-6">
                {/* Timeline Section */}
                <div className="bg-bg-card rounded-2xl border-2 border-border p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-soft/30 rounded-lg flex items-center justify-center text-blue">
                      <FileText size={18} />
                    </div>
                    <h3 className="text-xs font-black text-accent uppercase tracking-widest">Progress Timeline</h3>
                  </div>

                  <div className="space-y-6 relative before:absolute before:left-[4px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border/50">
                    {caseProgressLogs.length === 0 ? (
                      <div className="pl-6 opacity-40 italic text-[10px] font-black uppercase tracking-widest">No progress records yet.</div>
                    ) : (
                      caseProgressLogs.map((log, idx) => {
                        const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500'];
                        const color = colors[idx % colors.length];
                        return (
                          <div key={idx} className="relative pl-6">
                            <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full -translate-x-1/2 z-10 border-2 border-bg-card ${color}`} />
                            <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
                              {format(new Date(log.createdAt), 'dd MMM')} — <span className="text-accent">{log.percentage}% complete</span>
                            </div>
                            <p className="text-[11px] font-bold text-text-secondary leading-relaxed mb-1">{log.summary}</p>
                            <div className="text-[9px] font-black text-accent uppercase tracking-widest opacity-80">Updated by: {log.updatedBy === user?.email ? 'You' : log.updatedBy?.split('@')[0] || 'System'}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Resolution Checklist Section */}
                <div className="bg-bg-card rounded-2xl border-2 border-border p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-5 h-5 bg-green rounded flex items-center justify-center text-white">
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <h3 className="text-xs font-black text-accent uppercase tracking-widest">Resolution Checklist</h3>
                  </div>

                  <div className="divide-y divide-[#ffffff05]">
                    {(checklist.length > 0 ? checklist : [
                      { id: 1, label: 'Initial contact made', completed: false },
                      { id: 2, label: 'Documents received ', completed: false },
                      { id: 3, label: 'MOU draft prepared', completed: false },
                      { id: 4, label: 'Signed MOU received', completed: false },
                      { id: 5, label: 'Final settlement agreed', completed: false },
                      { id: 6, label: 'Case closed', completed: false }
                    ]).map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-4 py-3 group cursor-pointer first:pt-0 last:pb-0"
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleChecklistItem(item.id)}
                            className="peer hidden"
                          />
                          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-300 flex items-center justify-center 
                            ${item.completed ? 'bg-accent border-accent shadow-[0_0_10px_rgba(255,102,0,0.2)]' : 'bg-bg-input border-border group-hover:border-accent/50'}
                          `}>
                            {item.completed && <Check size={12} className="text-white" strokeWidth={4} />}
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-all duration-300 
                          ${item.completed ? 'text-text-muted line-through opacity-40' : 'text-text-secondary group-hover:text-text-primary'}
                        `}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeDetailTab === 'History' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              <div className="bg-bg-card rounded-2xl border-2 border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-bg-secondary/30 flex items-center gap-3">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                    <FileText size={16} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black text-accent uppercase tracking-widest">Full Audit Trail</h3>
                    <div className="text-[9px] font-black text-accent uppercase tracking-widest mt-1 opacity-80">
                      Case ID: {viewCase.caseId}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-input/50 text-text-muted text-[9px] font-black uppercase tracking-widest border-b border-border">
                        <th className="px-6 py-4">DATE & TIME</th>
                        <th className="px-6 py-4">ACTION</th>
                        <th className="px-6 py-4">DETAILS</th>
                        <th className="px-6 py-4">BY</th>
                        <th className="px-6 py-4">TYPE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {timelineLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-20 text-center text-text-muted text-[10px] font-black uppercase tracking-widest">
                            No history records found
                          </td>
                        </tr>
                      ) : (
                        timelineLogs.map((log) => {
                          let typeLabel = 'SYSTEM';
                          let typeColor = 'border-green text-green bg-green-soft/20';

                          if (log.eventType?.toLowerCase().includes('document')) {
                            typeLabel = 'DOCUMENT';
                            typeColor = 'border-blue text-blue bg-blue-soft/20';
                          } else if (log.eventType?.toLowerCase().includes('escalat') || log.eventType?.toLowerCase().includes('status')) {
                            typeLabel = 'ESCALATION';
                            typeColor = 'border-red text-red bg-red-soft/20';
                          }

                          return (
                            <tr key={log._id || Math.random()} className="hover:bg-bg-input/50 transition-colors">
                              <td className="px-6 py-4 text-[10px] font-black text-text-muted">
                                {format(new Date(log.eventDate || log.createdAt), 'dd MMM HH:mm')}
                              </td>
                              <td className="px-6 py-4 text-[11px] font-bold text-text-primary">
                                {log.eventType || 'System Update'}
                              </td>
                              <td className="px-6 py-4 text-[10px] text-text-secondary">
                                {log.summary}
                              </td>
                              <td className="px-6 py-4 text-[10px] font-bold text-text-primary">
                                {log.source || 'System'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${typeColor}`}>
                                  {typeLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeDetailTab === 'Case Study' ? (
            <CaseStudyTab caseData={viewCase} />
          ) : (
            <div className="bg-bg-card rounded-2xl border-2 border-border p-20 flex flex-col items-center justify-center gap-6 text-center animate-in zoom-in-95 duration-300 pb-20 mb-20">
              <div className="w-24 h-24 bg-bg-input rounded-full flex items-center justify-center text-4xl opacity-20 border-4 border-dashed border-border">🔒</div>
              <div>
                <h3 className="text-lg font-black text-text-primary uppercase tracking-widest mb-2">{activeDetailTab} Module</h3>
                <p className="text-xs text-text-muted font-medium uppercase tracking-widest">Protocol implementation pending in next phase</p>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-bg-card rounded-2xl shadow-sm border-2 border-border overflow-hidden flex-1 flex flex-col">
          <div className="table-wrap overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-secondary text-text-muted text-[10px] font-black tracking-[0.2em] uppercase border-b border-border">
                  {bulkAssignUser && (
                    <th className="px-3 py-3 w-[3%] text-center">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={filteredCases.length > 0 && selectedCases.length === filteredCases.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-2 py-3 w-[7%]">Case ID</th>
                  <th className="px-2 py-3 w-[8%]">Created</th>
                  <th className="px-2 py-3 w-[10%]">Company</th>
                  <th className="px-2 py-3 w-[10%]">Client</th>
                  <th className="px-2 py-3 w-[10%]">Services</th>
                  <th className="px-2 py-3 w-[7%]">Amount Paid</th>
                  <th className="px-2 py-3 w-[5%]">Priority</th>
                  <th className="px-2 py-3 w-[5%]">Status</th>
                  {user?.role === 'Admin' && <th className="px-2 py-3 w-[10%]">Assigned To</th>}
                  <th className="px-2 py-4 w-[8%]">Last Update</th>
                  <th className="px-2 py-4 w-[15%] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-text-secondary divide-y divide-border">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-6 py-20 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="p-6 bg-bg-input rounded-full">
                          <Inbox size={48} className="text-text-muted opacity-20" />
                        </div>
                      </div>
                      <div className="text-text-muted font-black uppercase tracking-widest text-xs">No matching cases found</div>
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(c => (
                    <CaseRow
                      key={c._id}
                      c={c}
                      isSelected={selectedCases.includes(c.caseId)}
                      bulkAssignUser={bulkAssignUser}
                      toggleSelectCase={toggleSelectCase}
                      handleViewCase={handleViewCase}
                      navigate={navigate}
                      assignmentInput={assignmentInputs[c.caseId]}
                      handleAssignmentInputChange={handleAssignmentInputChange}
                      opsUsers={opsUsers}
                      handleAssign={handleAssign}
                      handleDeleteCase={handleDeleteCase}
                      user={user}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

// Extracted to memoize and prevent full table re-renders on checkbox/input changes
const CaseRow = memo(({
  c,
  isSelected,
  bulkAssignUser,
  toggleSelectCase,
  handleViewCase,
  navigate,
  assignmentInput,
  handleAssignmentInputChange,
  opsUsers,
  handleAssign,
  handleDeleteCase,
  user
}) => {
  const svcs = Array.isArray(c.servicesSold)
    ? c.servicesSold.slice(0, 3).map(s => s.serviceName).join(', ') + (c.servicesSold.length > 3 ? '...' : '')
    : (c.servicesSold || '-');

  return (
    <tr
      onClick={() => handleViewCase(c)}
      className={`hover:bg-bg-input/50 transition-all border-b border-border/50 group cursor-pointer ${isSelected ? 'bg-accent-soft2' : ''}`}
    >
      {bulkAssignUser && (
        <td className="px-4 py-5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded cursor-pointer"
            checked={isSelected}
            onChange={() => toggleSelectCase(c.caseId)}
          />
        </td>
      )}
      <td className="px-3 py-5 font-black text-accent break-words max-w-[100px] leading-tight text-[11px] uppercase tracking-tighter">
        {c.caseId || c.caseid}
      </td>
      <td className="px-3 py-5 text-text-muted">
        {c.createdDate ? (
          <>
            <div className="font-bold text-text-secondary">{new Date(c.createdDate).toLocaleDateString('en-IN')}</div>
            <div className="text-[10px] opacity-60 mt-0.5">{new Date(c.createdDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </>
        ) : '-'}
      </td>
      <td className="px-3 py-5 break-words max-w-[120px] leading-tight text-text-secondary font-medium" title={c.companyName}>{c.companyName || '-'}</td>
      <td className="px-3 py-5">
        <div className="font-black text-text-primary leading-tight break-words text-sm">{c.clientName || '-'}</div>
        {c.clientMobile && <div className="text-[10px] text-text-muted font-bold mt-1 tracking-wider">{c.clientMobile}</div>}
      </td>
      <td className="px-3 py-5 break-words max-w-[120px] leading-tight text-text-muted italic text-[11px]" title={svcs}>{svcs}</td>
      <td className="px-3 py-5 font-black text-text-primary whitespace-nowrap">₹{Number(c.totalAmtPaid || 0).toLocaleString('en-IN')}</td>
      <td className="px-3 py-5">
        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${c.priority === 'High' ? 'bg-red-soft text-red' :
          c.priority === 'Medium' ? 'bg-yellow-soft text-yellow' :
            'bg-blue-soft text-blue'
          }`}>
          {c.priority || 'Medium'}
        </span>
      </td>
      <td className="px-3 py-5">
        <span className="bg-accent-soft text-accent border border-accent-soft px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
          {c.currentStatus || 'New'}
        </span>
      </td>
      {user?.role === 'Admin' && <td className="px-3 py-5 break-words max-w-[120px] leading-tight text-text-secondary font-black text-[10px] uppercase tracking-wider">{c.assignedTo || c.initiatedBy || '-'}</td>}
      <td className="px-3 py-5 text-text-muted">
        {c.lastUpdateDate ? (
          <>
            <div className="text-[11px] font-bold text-text-secondary">{new Date(c.lastUpdateDate).toLocaleDateString('en-IN')}</div>
            <div className="text-[10px] opacity-60 mt-0.5">{new Date(c.lastUpdateDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </>
        ) : '-'}
      </td>
      <td className="px-3 py-5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-2 w-[160px] mx-auto">
          {/* Top Row: Action Icons */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <button
              onClick={() => handleViewCase(c)}
              className="bg-[#121826] hover:bg-[#1a2236] text-[#4b5563] p-2.5 rounded-xl border border-[#1e293b] transition-all shadow-sm flex items-center justify-center w-full"
              title="View Profile"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => navigate('/new-case', { state: { editCase: c } })}
              className="bg-[#2a1b12] hover:bg-[#3d261a] text-accent p-2.5 rounded-xl border border-[#452a1e] transition-all shadow-sm flex items-center justify-center w-full"
              title="Edit Case"
            >
              <Edit3 size={16} />
            </button>
            {user?.role === 'Admin' ? (
              <button
                onClick={() => handleDeleteCase(c.caseId)}
                className="bg-[#2a1212] hover:bg-[#3d1a1a] text-red p-2.5 rounded-xl border border-[#451e1e] transition-all shadow-sm active:scale-95 flex items-center justify-center w-full"
                title="Delete Case"
              >
                <Trash2 size={16} />
              </button>
            ) : (
              <div className="w-full" /> // Placeholder to maintain grid
            )}
          </div>

          {/* Bottom Row: Assignment Section */}
          {user?.role === 'Admin' && (
            <div className="flex gap-2 w-full">
              <select
                className="flex-1 bg-[#0f172a] border-2 border-[#1e293b] rounded-xl text-[9px] px-2 py-2.5 outline-none focus:border-accent shadow-sm min-w-0 text-blue-400 font-black uppercase tracking-widest cursor-pointer"
                value={assignmentInput !== undefined ? assignmentInput : (c.assignedTo || '')}
                onChange={(e) => handleAssignmentInputChange(c.caseId, e.target.value)}
              >
                <option value="">Assign</option>
                {opsUsers.map(u => (
                  <option key={u._id} value={u.fullName} className="bg-[#0f172a] text-white">{u.fullName}</option>
                ))}
              </select>
              <button
                onClick={() => handleAssign(c.caseId)}
                className="bg-[#2a1b12] hover:bg-[#3d261a] text-accent font-black text-[9px] w-10 h-10 flex items-center justify-center rounded-xl border border-[#452a1e] transition-all uppercase active:scale-90 flex-shrink-0"
                title="Confirm Assignment"
              >
                <Check size={14} />
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
});

export default CaseMasterTab;
