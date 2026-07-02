import { confirmDelete } from '../../utils/confirmAlert';
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  Plus,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  ListFilterPlus
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import SearchableSelect from '../shared/SearchableSelect';
import CaseStudyTab from './CaseStudyTab';
import FilePreviewModal from '../shared/FilePreviewModal';
import Modal from '../shared/Modal';
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
  Video,
  PlusCircle,
  Archive,
  MoreVertical,
  RefreshCw,
  Sparkles
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

const formatDateForInput = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {
    // Ignore
  }
  return '';
};

// Normalize legacy/incorrect status values to correct display labels
const normalizeStatus = (status, assignedTo, initiatedBy) => {
  const legacyMap = {
    'New': 'Case Logged',
    'Intake': 'Case Logged',
    'Case Intake': 'Case Logged',
    'Open': 'Case Logged',
    'Registered': 'Case Logged',
    'Pending': 'Case Logged',
    'Active': 'Assigned',
    'In Progress': 'Negotiation',
    'Resolution': 'Closure',
    'Resolved': 'Closure',
    'Done': 'Closure',
    'Complete': 'Closure',
    'Completed': 'Closure',
    'Settled': 'Settlement',
  };
  let normalized = legacyMap[status] || status || 'Case Logged';

  // Keep unassigned cases unassigned when no staff assignee exists
  if (status === 'Active' && (!assignedTo || assignedTo.trim() === '')) {
    normalized = 'Case Logged';
  }

  // If normalized is still 'Case Logged' but has an assignee OR a real initiator, call it 'Assigned'
  const hasRealAssignee = (assignedTo && assignedTo.trim() !== '');
  const hasRealInitiator = (initiatedBy && initiatedBy.toLowerCase() !== 'system' && initiatedBy.trim() !== '');

  if (normalized === 'Case Logged' && (hasRealAssignee || hasRealInitiator)) {
    return 'Assigned';
  }
  return normalized;
};

const isDashboardClosedStatus = (status) => {
  return ['Closure', 'closure', 'Resolution', 'resolution', 'Resolved', 'resolved',
    'Done', 'done', 'Complete', 'complete', 'Completed', 'completed', 'Closed', 'closed']
    .includes(status);
};

const isDashboardSettledStatus = (status) => {
  return ['Settled', 'settled', 'Settlement', 'settlement'].includes(status);
};

const isOdooSourceCase = (c) => String(c.sourceOfComplaint || '').toLowerCase().includes('odoo');

const getDefaultCaseMasterFilters = () => ({
  status: ['All Status'],
  priority: ['All Priority'],
  assignee: ['All Assignees'],
  typeOfComplaint: ['All Types'],
  amountSort: '',
  date: null,
  state: ['All States'],
  refundStatus: ['All Refunds'],
  sourceOfComplaint: '',
  serviceMode: '',
  serviceName: '',
  city: ['All Cities'],
  lastPaymentStart: '',
  lastPaymentEnd: '',
  linkedOnly: false,
  caseNumbers: '',
  selectedCaseNumbers: [],
  showNumberTypes: ['Ack', 'Grievance', 'FIR'],
  excludeOdoo: false,
  createdDateStart: '',
  createdDateEnd: '',
  dashboardUserFilter: '',
  dashboardExcludeArchived: false,
  dashboardExcludeClosed: false,
  dashboardSettledOnly: false,
  dashboardClosureOnly: false,
  customFilters: {
    companyName: '',
    clientName: '',
    clientEmail: '',
    clientMobile: '',
    anyDetail: '',
    selectedField: '',
    selectedValue: '',
    conditions: []
  }
});

const filterableFields = [
  { label: 'Case ID', key: 'caseId' },
  { label: 'Company Name', key: 'companyName' },
  { label: 'Case Title', key: 'caseTitle' },
  { label: 'Priority', key: 'priority' },
  { label: 'Source of Complaint', key: 'sourceOfComplaint' },
  { label: 'Type of Complaint', key: 'typeOfComplaint' },
  { label: 'Brand Name', key: 'brandName' },
  { label: 'Engagement Note', key: 'engagementNote' },
  { label: 'Client Name', key: 'clientName' },
  { label: 'Client Mobile', key: 'clientMobile' },
  { label: 'Client Email', key: 'clientEmail' },
  { label: 'State', key: 'state' },
  { label: 'City', key: 'city' },
  { label: 'Pincode', key: 'pincode' },
  { label: 'Total Amount Paid', key: 'totalAmtPaid' },
  { label: 'Total Amount Paid by Client', key: 'totalAmtPaid' },
  { label: 'MOU Signed', key: 'mouSigned' },
  { label: 'Total MOU Value', key: 'totalMouValue' },
  { label: 'Amount in Dispute', key: 'amtInDispute' },
  { label: 'Date of Last Payment', key: 'dateOfLastPayment' },
  { label: 'SM Risk', key: 'smRisk' },
  { label: 'Consumer Complaint Filed', key: 'consumerComplaintFiled' },
  { label: 'Police Threat', key: 'policeThreat' },
  { label: 'Case Summary', key: 'caseSummary' },
  { label: 'Client Allegation', key: 'clientAllegation' },
  { label: 'Initiated By', key: 'initiatedBy' },
  { label: 'Accountable', key: 'accountable' },
  { label: 'Legal Officer', key: 'legalOfficer' },
  { label: 'Accounts', key: 'accounts' },
  { label: 'FIR Number', key: 'firNumber' },
  { label: 'Grievance Number', key: 'grievanceNumber' },
  { label: 'Acknowledgment Number', key: 'cyberAckNumbers' },
  { label: 'Assigned To', key: 'assignedTo' },
  { label: 'Lien Marked On', key: 'lienMarkedOn' },
  { label: 'Lien Bank', key: 'lienBank' },
  { label: 'Refund Status', key: 'refundStatus' },
  { label: 'Key Pending Issue', key: 'keyPendingIssue' },
  { label: 'Recommended Next Steps', key: 'recommendedNextSteps' },
  { label: 'Service Name', key: 'serviceName' },
  { label: 'BDA', key: 'bda' },
  { label: 'Work Status', key: 'workStatus' },
  { label: 'Service Status', key: 'workStatus' },
  { label: 'Service Amount', key: 'serviceAmount' },
  { label: 'Service MOU Signed', key: 'serviceMouSigned' },
  { label: 'Service Signed MOU Amount', key: 'signedMouAmount' },
  { label: 'Service Department', key: 'department' },
  { label: 'Account 1 Number', key: 'bankAccountDetails.acc1No' },
  { label: 'Account 1 IFSC', key: 'bankAccountDetails.acc1Ifsc' },
  { label: 'Account 2 Number', key: 'bankAccountDetails.acc2No' },
  { label: 'Account 2 IFSC', key: 'bankAccountDetails.acc2Ifsc' }
];

// Modernized Case Master with Integrated Detail View
const CaseMasterTab = ({ isArchiveMode = false }) => {
  const [cases, setCases] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [autoOpenCaseId, setAutoOpenCaseId] = useState(null);
  const [selectedCases, setSelectedCases] = useState([]);
  const [bulkAssignUser, setBulkAssignUser] = useState('');
  const [importing, setImporting] = useState(false);
  const [viewCase, setViewCase] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('Case Details');
  const [legalProcessHistory, setLegalProcessHistory] = useState([]);
  const [isLegalProcessLoading, setIsLegalProcessLoading] = useState(false);
  const [isLegalProcessSubmitting, setIsLegalProcessSubmitting] = useState(false);
  const [legalProcessForm, setLegalProcessForm] = useState({
    stage: 'Case Study',
    mouDocChecked: false,
    invoicesChecked: false,
    paymentReceiptChecked: false,
    caseStudyDocChecked: false,
    summary: ''
  });
  const [editingHistoryItem, setEditingHistoryItem] = useState(null);
  const [editFormStage, setEditFormStage] = useState('');
  const [editFormPayload, setEditFormPayload] = useState({});
  const [editFormUploading, setEditFormUploading] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('caseMasterVisibleCols');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return ['caseId', 'createdDate', 'company', 'client', 'typeOfComplaint', 'totalAmtPaid', 'priority', 'dueDate', 'status', 'refund', 'assignedTo', 'lastUpdateDate'];
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  useEffect(() => {
    localStorage.setItem('caseMasterVisibleCols', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (key) => {
    setVisibleColumns(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      return [...prev, key];
    });
  };

  const [timelineLogs, setTimelineLogs] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [refundsList, setRefundsList] = useState([]);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [compliancePendingChecked, setCompliancePendingChecked] = useState(false);
  const [openColFilter, setOpenColFilter] = useState(null);    // which col dropdown is open
  const [colFilterSearch, setColFilterSearch] = useState('');  // search text in dropdown
  const [colSortConfig, setColSortConfig] = useState({ key: null, direction: null }); // { key, direction }
  const [tempColFilters, setTempColFilters] = useState([]);    // temp selection list for open dropdown
  const [colFilterPos, setColFilterPos] = useState({ top: 0, left: 0 }); // screen position of dropdown

  // AI Summary State
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showAIPromptModal, setShowAIPromptModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTargetField, setAiTargetField] = useState('caseSummary');

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenColFilter = (colKey, uniqueVals, e) => {
    if (openColFilter === colKey) {
      setOpenColFilter(null);
      setTempColFilters([]);
    } else {
      // Capture button position for fixed-position dropdown
      if (e?.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        setColFilterPos({ top: rect.bottom + 6, left: rect.left });
      }
      setOpenColFilter(colKey);
      setColFilterSearch('');
      if (columnFilters[colKey] && columnFilters[colKey].length > 0) {
        setTempColFilters(columnFilters[colKey]);
      } else {
        setTempColFilters(uniqueVals);
      }
    }
  };

  const handleToggleTempFilter = (val) => {
    setTempColFilters(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  // Close column-filter dropdown when user clicks outside
  useEffect(() => {
    if (!openColFilter) return;
    const close = () => {
      setOpenColFilter(null);
      setTempColFilters([]);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openColFilter]);

  const [caseComms, setCaseComms] = useState([]);
  const [caseDocs, setCaseDocs] = useState([]);
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
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
    'Analysis': [1, 2, 3],
    'Negotiation': [1, 2, 3, 4],
    'Settlement': [1, 2, 3, 4, 5],
    'Closure': [1, 2, 3, 4, 5, 6]
  };

  const buildChecklistForStage = (stage) => checklistTemplate.map((item) => ({
    ...item,
    completed: stageChecklistMap[stage]?.includes(item.id) || false
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressFormData, setProgressFormData] = useState({
    stage: 'Case Logged',
    percentage: 20,
    summary: '',
    nextAction: '',
    blockers: '',
    followUpDate: '',
    escalateTo: '',
    refundedAmount: '',
    savedAmount: '',
    attachment: ''
  });
  const [closureReady, setClosureReady] = useState(false); // true when a Closure progress update was submitted
  const [isResolvedDisplay, setIsResolvedDisplay] = useState(false); // true when case is already closed/resolved
  const [mouFormData, setMouFormData] = useState({
    mouType: 'Legal Notice',
    otherType: '',
    mouDate: '',
    signatoryName: '',
    remarks: '',
    fileLink: ''
  });
  const [mouUploadKey, setMouUploadKey] = useState(0);
  const [editingComm, setEditingComm] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editingProgress, setEditingProgress] = useState(null);
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
  const [availableStates, setAvailableStates] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState('Status');
  const [columnFilters, setColumnFilters] = useState({});       // { colKey: [val1, val2] }
  const [expandedCustomFields, setExpandedCustomFields] = useState({});

  const [tempFilters, setTempFilters] = useState({
    status: ['All Status'],
    priority: ['All Priority'],
    assignee: ['All Assignees'],
    typeOfComplaint: ['All Types'],
    amountSort: '',
    date: null,
    state: ['All States'],
    refundStatus: ['All Refunds'],
    sourceOfComplaint: '',
    serviceMode: '',
    serviceName: '',
    city: ['All Cities'],
    lastPaymentStart: '',
    lastPaymentEnd: '',
    caseNumbers: '',
    selectedCaseNumbers: [],
    showNumberTypes: ['Ack', 'Grievance', 'FIR'],
    customFilters: {
      companyName: '',
      clientName: '',
      clientEmail: '',
      clientMobile: '',
      anyDetail: '',
      selectedField: '',
      selectedValue: ''
    }
  });
  const [appliedFilters, setAppliedFilters] = useState(() => {
    const saved = localStorage.getItem('caseMasterFilters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.state) parsed.state = ['All States'];
        if (!parsed.refundStatus) parsed.refundStatus = ['All Refunds'];
        if (parsed.sourceOfComplaint === undefined) parsed.sourceOfComplaint = '';
        if (parsed.serviceMode === undefined) parsed.serviceMode = '';
        if (parsed.serviceName === undefined) parsed.serviceName = '';
        if (!parsed.city || !Array.isArray(parsed.city)) parsed.city = ['All Cities'];
        if (parsed.lastPaymentStart === undefined) parsed.lastPaymentStart = '';
        if (parsed.lastPaymentEnd === undefined) parsed.lastPaymentEnd = '';
        if (parsed.amountSort === undefined) parsed.amountSort = '';
        if (parsed.caseNumbers === undefined) parsed.caseNumbers = '';
        if (!parsed.selectedCaseNumbers) parsed.selectedCaseNumbers = [];
        if (!parsed.showNumberTypes) parsed.showNumberTypes = ['Ack', 'Grievance', 'FIR'];
        if (!parsed.customFilters) parsed.customFilters = {
          companyName: '',
          clientName: '',
          clientEmail: '',
          clientMobile: '',
          anyDetail: '',
          selectedField: '',
          selectedValue: '',
          conditions: []
        };
        if (parsed.customFilters.anyDetail === undefined) parsed.customFilters.anyDetail = '';
        if (parsed.customFilters.selectedField === undefined) parsed.customFilters.selectedField = '';
        if (parsed.customFilters.selectedValue === undefined) parsed.customFilters.selectedValue = '';
        if (!parsed.customFilters.conditions) parsed.customFilters.conditions = [];
        if (parsed.excludeOdoo === undefined) parsed.excludeOdoo = false;
        if (parsed.createdDateStart === undefined) parsed.createdDateStart = '';
        if (parsed.createdDateEnd === undefined) parsed.createdDateEnd = '';
        if (parsed.dashboardUserFilter === undefined) parsed.dashboardUserFilter = '';
        if (parsed.dashboardExcludeArchived === undefined) parsed.dashboardExcludeArchived = false;
        if (parsed.dashboardExcludeClosed === undefined) parsed.dashboardExcludeClosed = false;
        if (parsed.dashboardSettledOnly === undefined) parsed.dashboardSettledOnly = false;
        if (parsed.dashboardClosureOnly === undefined) parsed.dashboardClosureOnly = false;
        return parsed;
      } catch (e) { }
    }
    return {
      status: ['All Status'],
      priority: ['All Priority'],
      assignee: ['All Assignees'],
      typeOfComplaint: ['All Types'],
      amountSort: '',
      date: null,
      state: ['All States'],
      refundStatus: ['All Refunds'],
      sourceOfComplaint: '',
      serviceMode: '',
      serviceName: '',
      city: ['All Cities'],
      lastPaymentStart: '',
      lastPaymentEnd: '',
      linkedOnly: false,
      caseNumbers: '',
      selectedCaseNumbers: [],
      showNumberTypes: ['Ack', 'Grievance', 'FIR'],
      excludeOdoo: false,
      createdDateStart: '',
      createdDateEnd: '',
      dashboardUserFilter: '',
      dashboardExcludeArchived: false,
      dashboardExcludeClosed: false,
      dashboardSettledOnly: false,
      dashboardClosureOnly: false,
      customFilters: {
        companyName: '',
        clientName: '',
        clientEmail: '',
        clientMobile: '',
        anyDetail: '',
        selectedField: '',
        selectedValue: ''
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('caseMasterFilters', JSON.stringify(appliedFilters));
  }, [appliedFilters]);

  // Handle navigation from MIS Report metric cards
  useEffect(() => {
    const misFilter = location.state?.misFilter;
    if (!misFilter) return;

    const today = new Date().toISOString().split('T')[0];

    const baseFilters = {
      status: ['All Status'],
      priority: ['All Priority'],
      assignee: ['All Assignees'],
      typeOfComplaint: ['All Types'],
      amountSort: '',
      date: null,
      state: ['All States'],
      refundStatus: ['All Refunds'],
      sourceOfComplaint: '',
      serviceMode: '',
      serviceName: '',
      city: ['All Cities'],
      lastPaymentStart: '',
      lastPaymentEnd: '',
      caseNumbers: '',
      selectedCaseNumbers: [],
      showNumberTypes: ['Ack', 'Grievance', 'FIR'],
      customFilters: {
        companyName: '', clientName: '', clientEmail: '',
        clientMobile: '', anyDetail: '', selectedField: '', selectedValue: ''
      }
    };

    const stateExcludeOdoo = location.state?.excludeOdoo;
    const stateSourceFilter = location.state?.sourceFilter;

    const targetFilters = {
      ...baseFilters,
      excludeOdoo: stateExcludeOdoo !== undefined ? stateExcludeOdoo : baseFilters.excludeOdoo,
      sourceOfComplaint: stateSourceFilter || baseFilters.sourceOfComplaint
    };

    if (misFilter === 'active') {
      setAppliedFilters({ ...targetFilters, status: ['Active'] });
      setTempFilters(prev => ({ ...prev, ...targetFilters, status: ['Active'] }));
    } else if (misFilter === 'overdue') {
      setAppliedFilters({ ...targetFilters, status: ['Active'] });
      setTempFilters(prev => ({ ...prev, ...targetFilters, status: ['Active'] }));
    } else if (misFilter === 'today') {
      setAppliedFilters({ ...targetFilters, date: today });
      setTempFilters(prev => ({ ...prev, ...targetFilters, date: today }));
    } else if (misFilter === 'resolved') {
      setAppliedFilters({ ...targetFilters, status: ['Closure'] });
      setTempFilters(prev => ({ ...prev, ...targetFilters, status: ['Closure'] }));
    } else if (misFilter === 'all') {
      setAppliedFilters(targetFilters);
      setTempFilters(prev => ({ ...prev, ...targetFilters }));
    }

    // Clear navigation state so it doesn't re-trigger on re-render
    window.history.replaceState({}, '');
  }, [location.state]);

  // Keep resolved display in sync with loaded case
  useEffect(() => {
    if (viewCase) {
      setIsResolvedDisplay((viewCase.currentStatus === 'Closure') || (viewCase.progressPercentage >= 100));
      // clear any transient closure-ready flag when a fresh case is loaded
      setClosureReady(false);
    } else {
      setIsResolvedDisplay(false);
      setClosureReady(false);
    }
  }, [viewCase]);
  const { user } = useContext(AuthContext);

  const [legalRequests, setLegalRequests] = useState([]);
  const [isAddDraftOpen, setIsAddDraftOpen] = useState(false);
  const [isMyRequestsStatusOpen, setIsMyRequestsStatusOpen] = useState(false);
  const [draftCaseId, setDraftCaseId] = useState('');
  const [draftDocName, setDraftDocName] = useState('');
  const [draftFileLink, setDraftFileLink] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [draftRemark, setDraftRemark] = useState('');
  const [draftFileUploading, setDraftFileUploading] = useState(false);
  const [isDraftSubmitting, setIsDraftSubmitting] = useState(false);
  const [isPendingRequestsExpanded, setIsPendingRequestsExpanded] = useState(true);

  // Pack & AD ready stage form states
  const [packReceiverName, setPackReceiverName] = useState('');
  const [packReceiverAddress, setPackReceiverAddress] = useState('');
  const [packCompanyAddress, setPackCompanyAddress] = useState('');
  const [packRemark, setPackRemark] = useState('');

  const [courierDateTime, setCourierDateTime] = useState('');
  const [courierSenderName, setCourierSenderName] = useState('');
  const [courierDocName, setCourierDocName] = useState('');
  const [courierSenderCompany, setCourierSenderCompany] = useState('');

  // Reply Received stage form states
  const [replyDate, setReplyDate] = useState('');
  const [repliedBy, setRepliedBy] = useState('');
  const [replyFileLink, setReplyFileLink] = useState('');
  const [replyRemark, setReplyRemark] = useState('');
  const [replyFileUploading, setReplyFileUploading] = useState(false);
  const [selectedCycleToView, setSelectedCycleToView] = useState(null);

  const [seenResolvedCount, setSeenResolvedCount] = useState(() => {
    try {
      const val = localStorage.getItem(`seen_legal_resolved_count_${user?.email || 'guest'}`);
      return val ? parseInt(val, 10) : 0;
    } catch (e) {
      return 0;
    }
  });

  useEffect(() => {
    if (isAddDraftOpen && user?.email) {
      const resolvedCount = legalRequests.filter(r => r.status === 'Approved' || r.status === 'Rejected').length;
      localStorage.setItem(`seen_legal_resolved_count_${user.email}`, resolvedCount.toString());
      setSeenResolvedCount(resolvedCount);
    }
  }, [isAddDraftOpen, legalRequests, user]);

  const fetchLegalRequests = useCallback(async () => {
    try {
      const res = await api.get('/legal-requests');
      setLegalRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch legal requests:', err);
    }
  }, []);

  const handleLegalStatusUpdate = async (id, newStatus, customRejectRemark = '') => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'Rejected') {
        payload.rejectRemark = customRejectRemark || 'Rejected by Admin';
      }
      await api.put(`/legal-requests/${id}/status`, payload);
      toast.success(`Legal draft request ${newStatus.toLowerCase()} successfully!`);
      fetchLegalRequests();
      if (viewCase?.caseId) {
        fetchLegalProcessData(viewCase.caseId);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update legal request status");
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.role === 'Legal') {
      fetchLegalRequests();
    }
  }, [user]);

  const handleLegalDraftUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDraftFileUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || 'https://serenity.herosite.pro/~fmojnedg/uploads/upload.php';
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const uploadData = await res.json();
      if (uploadData && uploadData.success && uploadData.url) {
        setDraftFileLink(uploadData.url);
        toast.success('Document uploaded successfully');
      } else {
        throw new Error(uploadData?.error || 'No URL returned');
      }
    } catch (err) {
      console.error(err);
      toast.error('File upload failed');
    } finally {
      setDraftFileUploading(false);
    }
  };

  const handleReplyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReplyFileUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || 'https://serenity.herosite.pro/~fmojnedg/uploads/upload.php';
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const uploadData = await res.json();
      if (uploadData && uploadData.success && uploadData.url) {
        setReplyFileLink(uploadData.url);
        toast.success('Reply Document uploaded successfully');
      } else {
        throw new Error(uploadData?.error || 'No URL returned');
      }
    } catch (err) {
      console.error(err);
      toast.error('File upload failed');
    } finally {
      setReplyFileUploading(false);
    }
  };

  const handleLegalDraftSubmit = async (e) => {
    e.preventDefault();
    if (!draftCaseId) {
      toast.error('Please select a Case ID');
      return;
    }
    if (!draftDocName) {
      toast.error('Please enter a Document Name');
      return;
    }
    try {
      const payload = {
        caseId: draftCaseId,
        documentName: draftDocName,
        fileLink: draftFileLink,
        remark: draftRemark
      };
      await api.post('/legal-requests', payload);
      toast.success('Legal draft request submitted for approval');
      setDraftCaseId('');
      setDraftDocName('');
      setDraftFileLink('');
      setDraftRemark('');
      fetchLegalRequests();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit legal draft request');
    }
  };

  // Form states for editable case details
  const [formData, setFormData] = useState({
    companyName: '', caseTitle: '', priority: 'Medium', sourceOfComplaint: '',
    typeOfComplaint: '', brandName: '',
    engagementNote: '',
    clientName: '', clientMobile: '', clientEmail: '', state: '', city: '', pincode: '',
    totalAmtPaid: '', mouSigned: 'No', totalMouValue: '', amtInDispute: '', dateOfLastPayment: '',
    refundedAmount: '', savedAmount: '', dueDate: '',
    smRisk: 'None', consumerComplaintFiled: 'No', policeThreat: 'None', caseSummary: '', clientAllegation: '',
    importDocumentLink: '',
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

  const [linkedCases, setLinkedCases] = useState([]);

  const canEditCase = useMemo(() => {
    if (!user || !viewCase) return false;
    const role = user.role;
    if (role === 'Admin' || role === 'Super Admin' || role === 'SuperAdmin' || role === 'Operations' || role === 'Operation Head' || role === 'BD Head') {
      return true;
    }
    const assignedName = (viewCase.assignedTo || '').trim().toLowerCase();
    const myName = (user.fullName || user.name || '').trim().toLowerCase();
    const myEmail = (user.email || '').trim().toLowerCase();
    if (['Staff', 'Operation Admin', 'operation admin', 'Operation Review'].includes(role)) {
      return assignedName !== '' && (assignedName === myName || assignedName === myEmail);
    }
    return false;
  }, [user, viewCase]);

  const sourceOptions = useMemo(() => {
    const unique = new Set(["Email", "Call", "Office Visit", "Social Media", "Toll Free", "Notice", "Odoo"]);
    cases.forEach((c) => {
      const value = c.sourceOfComplaint?.trim();
      if (value) unique.add(value);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cases]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    cases.forEach((c) => {
      const s = normalizeStatus(c.currentStatus || c.status, c.assignedTo, c.initiatedBy);
      if (s && s !== '—') statuses.add(s);
    });

    const orderMap = {
      'Case Logged': 0,
      'Assigned': 1,
      'Analysis': 2,
      'Negotiation': 3,
      'Settlement': 4,
      'Closure': 5
    };

    return ['All Status', ...Array.from(statuses).sort((a, b) => {
      const indexA = orderMap[a];
      const indexB = orderMap[b];

      if (indexA !== undefined && indexB !== undefined) {
        return indexA - indexB;
      }
      if (indexA !== undefined) return -1;
      if (indexB !== undefined) return 1;

      return a.localeCompare(b);
    })];
  }, [cases]);

  const uniquePriorities = useMemo(() => {
    const priorities = new Set();
    cases.forEach((c) => {
      if (c.priority && c.priority !== '—') priorities.add(c.priority);
    });
    return ['All Priority', ...Array.from(priorities).sort()];
  }, [cases]);

  const allDynamicAssignees = useMemo(() => {
    const seen = new Set();
    const list = [];

    // Helper map of user fullName to role from opsUsers
    const userRoles = {};
    opsUsers.forEach(u => {
      if (u.fullName) {
        userRoles[u.fullName.trim().toLowerCase()] = (u.role || '').toLowerCase().trim();
      }
    });

    // Add unique assignees/initiators who actually have cases
    cases.forEach(c => {
      const a = c.assignedTo || c.initiatedBy;
      if (a && a !== '—') {
        const name = a.trim();
        const lower = name.toLowerCase();

        // Exclude system/null strings
        if (lower === 'system' || lower === 'null' || lower === 'undefined' || lower === '') return;

        // Exclude if role or name is super admin or staff
        const role = userRoles[lower];
        if (role === 'super admin' || role === 'superadmin' || role === 'staff') return;
        if (lower === 'super admin' || lower === 'superadmin' || lower === 'staff') return;

        if (!seen.has(lower)) {
          seen.add(lower);
          list.push({ _id: `case-${name}`, fullName: name });
        }
      }
    });

    // Sort alphabetically by fullName
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [cases, opsUsers]);

  const uniqueAssignees = useMemo(() => {
    let assignees = allDynamicAssignees.map(u => u.fullName);

    // If user role is Operations, only show their own name
    if (user?.role === 'Operations' && user?.fullName) {
      assignees = assignees.filter(name => name.toLowerCase() === user.fullName.toLowerCase());
      if (assignees.length === 0) {
        assignees = [user.fullName];
      }
    }

    return ['All Assignees', 'Unassigned', ...Array.from(new Set(assignees)).sort()];
  }, [allDynamicAssignees, user]);

  const uniqueTypes = useMemo(() => {
    const types = new Set();
    cases.forEach((c) => {
      if (c.typeOfComplaint && c.typeOfComplaint !== '—') types.add(c.typeOfComplaint);
    });
    return ['All Types', ...Array.from(types).sort()];
  }, [cases]);

  const uniqueStates = useMemo(() => {
    const states = new Set();
    cases.forEach((c) => {
      if (c.state && c.state !== '—') states.add(c.state);
    });
    return ['All States', 'Blank', ...Array.from(states).sort()];
  }, [cases]);

  const uniqueCities = useMemo(() => {
    const cities = new Set();
    cases.forEach((c) => {
      if (c.city && c.city !== '—') cities.add(c.city.trim());
    });
    return ['All Cities', 'Blank', ...Array.from(cities).sort()];
  }, [cases]);

  const uniqueRefundStatuses = useMemo(() => {
    const refunds = new Set();
    cases.forEach((c) => {
      const r = refundsList.find(x => x.caseId === c.caseId);
      let refVal = 'No Refund';
      if (r) {
        const paid = r.transactionId && (r.installments || []).length <= 1;
        refVal = (r.status === 'Paid' || paid) ? 'Paid' : 'Pending';
      }
      refunds.add(refVal);
    });
    return ['All Refunds', ...Array.from(refunds).sort()];
  }, [cases, refundsList]);

  const getCustomFilterSuggestions = (inputVal) => {
    if (!inputVal || inputVal.trim() === '') return [];
    const query = inputVal.toLowerCase().trim();

    const suggestions = [];
    const seen = new Set();

    filterableFields.forEach(field => {
      const vals = new Set();
      const serviceKeys = ['serviceName', 'bda', 'workStatus', 'serviceAmount', 'signedMouAmount', 'department', 'serviceMouSigned'];
      const propKey = field.key === 'serviceMouSigned' ? 'mouSigned' : field.key;

      cases.forEach(c => {
        if (serviceKeys.includes(field.key)) {
          if (c[propKey]) {
            vals.add(c[propKey].toString().trim());
          }
          if (c.servicesSold && Array.isArray(c.servicesSold)) {
            c.servicesSold.forEach(s => {
              if (s[propKey]) {
                vals.add(s[propKey].toString().trim());
              }
            });
          }
        } else if (field.key.includes('.')) {
          const [parent, child] = field.key.split('.');
          const val = c[parent]?.[child];
          if (val !== undefined && val !== null) {
            vals.add(val.toString().trim());
          }
        } else {
          let val = c[field.key];
          if (val !== undefined && val !== null) {
            let valStr = '';
            if (field.key === 'dateOfLastPayment' || field.key === 'lienMarkedOn' || field.key === 'createdDate') {
              try {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                  valStr = d.toISOString().split('T')[0];
                }
              } catch (e) { }
            }
            if (!valStr) {
              valStr = val.toString().trim();
            }
            if (valStr !== '') {
              vals.add(valStr);
            }
          }
        }
      });

      const labelMatches = field.label.toLowerCase().includes(query) || field.key.toLowerCase().includes(query);
      const isDescriptive = [
        'caseSummary',
        'clientAllegation',
        'engagementNote',
        'keyPendingIssue',
        'recommendedNextSteps'
      ].includes(field.key);

      Array.from(vals).forEach(val => {
        const valStr = val.toLowerCase();
        const matches = isDescriptive ? labelMatches : (labelMatches || valStr.includes(query));
        if (matches) {
          const key = `${field.key}::${val}`;
          if (!seen.has(key)) {
            seen.add(key);
            suggestions.push({
              fieldKey: field.key,
              fieldLabel: field.label,
              value: val
            });
          }
        }
      });
    });

    return suggestions.slice(0, 30);
  };

  useEffect(() => {
    const fetchLinkedCases = async () => {
      const name = viewCase?.clientName || formData.clientName;
      const mobile = viewCase?.clientMobile || formData.clientMobile;
      if (!name && !mobile) {
        setLinkedCases([]);
        return;
      }
      try {
        const res = await api.get(`/cases/search-client?name=${encodeURIComponent(name)}&mobile=${encodeURIComponent(mobile)}`);
        const uniqueCases = [];
        const seenIds = new Set();
        res.data.forEach(c => {
          if (!seenIds.has(c.caseId)) {
            seenIds.add(c.caseId);
            uniqueCases.push(c);
          }
        });
        setLinkedCases(uniqueCases.filter(c => c.caseId !== viewCase?.caseId));
      } catch (err) {
        console.error('Failed to fetch linked cases', err);
      }
    };

    const debounceTimer = setTimeout(fetchLinkedCases, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.clientName, formData.clientMobile]);

  const inputClass = "w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent-soft outline-none transition-all bg-bg-input text-text-primary font-medium placeholder:text-text-muted shadow-inner";
  const labelClass = "block text-[11px] font-black text-text-muted uppercase tracking-[0.1em] mb-2";
  const sectionTitleClass = "text-md font-black flex items-center gap-2 mb-6 text-accent uppercase tracking-wider";
  const cardClass = "bg-bg-card rounded-2xl border-2 border-border p-4 md:p-8 mb-8 shadow-sm transition-all duration-300";

  // Helper to parse legal process summary strings into structured descriptions
  const parseLegalProcessSummary = (summary) => {
    if (!summary) return '';
    if (summary.startsWith('PACK_AD_READY_JSON:')) {
      try {
        const data = JSON.parse(summary.replace('PACK_AD_READY_JSON:', ''));
        return `Pack & AD ready: Receiver: ${data.receiverName || ''}, Address: ${data.receiverAddress || ''}, Remark: ${data.remark || ''}`;
      } catch (e) {
        return 'Pack & AD ready details saved';
      }
    }
    if (summary.startsWith('COURIER_SENT_JSON:')) {
      try {
        const data = JSON.parse(summary.replace('COURIER_SENT_JSON:', ''));
        return `Courier Sent: Date: ${data.dateTime || ''}, Sender: ${data.senderName || ''}, Doc: ${data.documentName || ''}, Company: ${data.senderCompany || ''}`;
      } catch (e) {
        return 'Courier Sent details saved';
      }
    }
    if (summary.startsWith('REPLY_RECEIVED_JSON:')) {
      try {
        const data = JSON.parse(summary.replace('REPLY_RECEIVED_JSON:', ''));
        return `Reply Received: Date: ${data.replyDate || ''}, Replied By: ${data.repliedBy || ''}, Remark: ${data.remark || ''}`;
      } catch (e) {
        return 'Reply Received details saved';
      }
    }
    if (summary.startsWith('DRAFT_JSON:')) {
      try {
        const data = JSON.parse(summary.replace('DRAFT_JSON:', ''));
        return `Draft Request: Doc: ${data.documentName || ''}, Remark: ${data.remark || ''}, Status: ${data.status || ''}`;
      } catch (e) {
        return 'Draft request details saved';
      }
    }
    if (summary.startsWith('DRAFT_STATUS_JSON:')) {
      try {
        const data = JSON.parse(summary.replace('DRAFT_STATUS_JSON:', ''));
        return `Draft Status Update: Doc: ${data.documentName || ''}, Status: ${data.status || ''}, Remark: ${data.rejectRemark || ''}`;
      } catch (e) {
        return 'Draft status updated';
      }
    }
    return summary;
  };

  // Helper to parse legacy summary strings into structured data
  const parseLegacySummary = (summary) => {
    if (!summary || typeof summary !== 'string') return null;
    // Pattern: "Field changed: Old Value → New Value" or "Field changed: Old Value -> New Value"
    const match = summary.match(/(.+) changed:\s*(.*)\s*[→\->]\s*(.*)/i);
    if (match) {
      return {
        field: match[1].trim(),
        old: match[2].trim() === 'N/A' || match[2].trim() === 'undefined' ? '' : match[2].trim(),
        new: match[3].trim() === 'N/A' || match[3].trim() === 'undefined' ? '' : match[3].trim()
      };
    }
    return null;
  };

  // Consolidate all case-related events for a full audit trail
  const fullHistory = useMemo(() => {
    if (!viewCase) return [];

    const getDocUploadDate = (doc) => {
      if (doc.uploadDate) return doc.uploadDate;
      if (doc.createdAt) return doc.createdAt;

      // Parse timestamp from fileLink prefix if available
      if (doc.fileLink) {
        const filename = doc.fileLink.split('/').pop() || '';
        const match = filename.match(/^(\d{13})_/);
        if (match) {
          const ts = parseInt(match[1]);
          if (!isNaN(ts)) {
            return new Date(ts).toISOString();
          }
        }
      }

      // Fallback to MongoDB ObjectID timestamp
      if (doc._id && typeof doc._id === 'string' && doc._id.length === 24) {
        try {
          const timestamp = parseInt(doc._id.substring(0, 8), 16) * 1000;
          if (!isNaN(timestamp)) {
            return new Date(timestamp).toISOString();
          }
        } catch (e) {
          // ignore
        }
      }

      return viewCase?.createdAt || viewCase?.createdDate || new Date().toISOString();
    };

    const commTypes = ['Call', 'WhatsApp', 'Email', 'Meeting', 'SMS', 'Legal Notice'];

    const events = [
      // 1. Core Timeline Logs (Backend tracks Comms, Progress, Actions here)
      ...timelineLogs.map(log => ({
        id: log._id || `tl-${log.createdAt}`,
        date: log.eventDate || log.createdAt || viewCase?.createdAt || viewCase?.createdDate || new Date().toISOString(),
        type: log.eventType?.toLowerCase().includes('document') ? 'DOCUMENT' :
          commTypes.includes(log.eventType) ? 'COMMUNICATION' :
            (log.eventType?.toLowerCase().includes('status') || log.eventType?.toLowerCase().includes('stage') || log.eventType === 'Progress Update') ? 'PROGRESS' :
              (log.eventType === 'Manual Action' || log.eventType === 'Action Logged') ? 'ACTION' : 'SYSTEM',
        action: log.eventType || 'System Update',
        details: log.summary,
        user: log.source || 'System',
        fieldChanged: log.fieldChanged || parseLegacySummary(log.summary)?.field,
        oldValue: log.oldValue !== undefined ? log.oldValue : parseLegacySummary(log.summary)?.old,
        newValue: log.newValue !== undefined ? log.newValue : parseLegacySummary(log.summary)?.new
      })),

      // 2. Document Indexing (Documents are tracked in a separate collection without timeline entries)
      ...caseDocs.map(doc => ({
        id: doc._id,
        date: getDocUploadDate(doc),
        type: 'DOCUMENT',
        action: `Document Indexed: ${doc.docType || 'Unknown'}`,
        details: `File: ${doc.fileLink?.split('/').pop() || 'Untitled'}${doc.remarks ? ` - ${doc.remarks}` : ''}`,
        user: doc.uploadedBy || 'System'
      })),

      // 3. Legal Process Logs (excluding Draft stages to avoid duplication with mapped legal requests)
      ...legalProcessHistory.filter(h => !['Draft', 'Draft Approved', 'Draft Rejected'].includes(h.stage)).map(h => ({
        id: `lp-${h.id || h._id}`,
        date: h.createdAt,
        type: 'PROGRESS',
        action: `Legal Notice: ${h.stage}`,
        details: parseLegalProcessSummary(h.summary),
        user: h.submittedBy || 'System'
      })),

      // 4. Legal Request Logs (Draft requests and their status changes)
      ...legalRequests.filter(r => r.caseId === viewCase.caseId).flatMap(r => {
        const eventsList = [];
        eventsList.push({
          id: `lr-create-${r.id || r._id}`,
          date: r.createdAt,
          type: 'PROGRESS',
          action: 'Legal Notice: Draft Request',
          details: `Draft Request: Doc: ${r.documentName || ''}, Remark: ${r.remark || ''}, Status: ${r.status || ''}`,
          user: r.requestedByName || r.requestedBy || 'System'
        });
        if (r.status && r.status !== 'Pending') {
          eventsList.push({
            id: `lr-status-${r.id || r._id}`,
            date: r.updatedAt || r.createdAt,
            type: 'PROGRESS',
            action: r.status === 'Approved' ? 'Legal Notice: Draft Approved' : 'Legal Notice: Draft Rejected',
            details: `Draft Status Update: Doc: ${r.documentName || ''}, Status: ${r.status}${r.rejectRemark ? `, Remark: ${r.rejectRemark}` : ''}`,
            user: 'Admin'
          });
        }
        return eventsList;
      })
    ];

    // De-duplicate "Case Created" events - keep only the EARLIEST one (actual creation)
    const creationEvents = events.filter(e => e.action === 'Case Created');
    let finalEvents = events;
    let earliestCreation = null;

    if (creationEvents.length > 0) {
      earliestCreation = creationEvents.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      if (creationEvents.length > 1) {
        finalEvents = events.filter(e => e.action !== 'Case Created' || e.id === earliestCreation.id);
      }

      // Filter out any entries that have a date older than the case creation date
      const cutoffTime = new Date(earliestCreation.date).getTime() - 60000; // 1 min buffer
      finalEvents = finalEvents.filter(e => new Date(e.date).getTime() >= cutoffTime || e.action === 'Case Created');
    }

    // Sort by date descending (latest first)
    return finalEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [viewCase, timelineLogs, caseDocs, legalProcessHistory, legalRequests]);

  const groupedHistory = useMemo(() => {
    const raw = fullHistory;
    const groups = [];
    raw.forEach(item => {
      const prev = groups[groups.length - 1];
      // Group items that occurred within 2 seconds of each other by the same user with the same action type
      const isSimilar = prev &&
        Math.abs(new Date(prev.date) - new Date(item.date)) < 2000 &&
        prev.user === item.user &&
        prev.action === item.action &&
        item.fieldChanged;

      if (isSimilar) {
        if (!prev.changes) {
          prev.changes = [{
            field: prev.fieldChanged,
            old: prev.oldValue,
            new: prev.newValue,
            details: prev.details
          }];
        }
        prev.changes.push({
          field: item.fieldChanged,
          old: item.oldValue,
          new: item.newValue,
          details: item.details
        });
        prev.details = `${prev.changes.length} fields updated`;
      } else {
        groups.push({ ...item });
      }
    });
    return groups;
  }, [fullHistory]);

  const fetchCases = async (hasDemand = false, pageNum = 1) => {
    try {
      if (pageNum === 1) setCases([]); // Reset for new search/filter

      const limit = 1000;
      const url = hasDemand
        ? `/cases?hasDemand=true&page=${pageNum}&limit=${limit}&isArchived=${isArchiveMode}`
        : `/cases?page=${pageNum}&limit=${limit}&isArchived=${isArchiveMode}`;

      const res = await api.get(url);

      if (res.data && res.data.cases) {
        if (pageNum === 1) {
          setCases(res.data.cases);
        } else {
          setCases(prev => [...prev, ...res.data.cases]);
        }
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
        setArchivedCount(res.data.archivedCount || 0);
      } else {
        const data = Array.isArray(res.data) ? res.data : [];
        setCases(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      toast.error('Failed to fetch cases');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      setIsLoadingMore(true);
      fetchCases(!!location.state?.hasDemand, nextPage);
    }
  };

  const fetchOpsUsers = async () => {
    if (!user || (!['Admin', 'Operations', 'Super Admin', 'Legal', 'Operation Head', 'BD Head'].includes(user.role))) {
      return;
    }
    try {
      const res = await api.get('/auth/users');
      // Get all active users without hardcoded exclusions
      const filtered = res.data.filter(u => u.fullName && u.fullName.trim() !== '');

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

  const fetchAvailableStates = async () => {
    try {
      const res = await api.get('/cases/available-states');
      setAvailableStates(res.data);
    } catch (err) {
      console.error('Failed to fetch available states', err);
    }
  };

  const fetchRefundsList = async () => {
    try {
      const res = await api.get('/refunds');
      setRefundsList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch refunds list', err);
    }
  };

  useEffect(() => {
    const hasDemandFilter = location.state?.hasDemand;

    fetchCases(!!hasDemandFilter);
    fetchOpsUsers();
    fetchAvailableDates();
    fetchAvailableStates();
    fetchRefundsList();

    const navState = location.state;
    if (!navState) {
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.has('search')) {
        setSearchTerm(searchParams.get('search'));
      }
      return;
    }

    if (navState.fromDashboard) {
      let filters = getDefaultCaseMasterFilters();

      if (navState.excludeOdoo) filters.excludeOdoo = true;
      if (navState.createdDateStart) filters.createdDateStart = navState.createdDateStart;
      if (navState.createdDateEnd) filters.createdDateEnd = navState.createdDateEnd;
      if (navState.dashboardUserFilter) filters.dashboardUserFilter = navState.dashboardUserFilter;

      if (navState.statusFilter) {
        const sf = Array.isArray(navState.statusFilter) ? navState.statusFilter[0] : navState.statusFilter;
        if (sf === 'Settlement') {
          filters.dashboardSettledOnly = true;
        } else if (sf === 'Closure') {
          filters.dashboardClosureOnly = true;
          filters.status = ['Closure'];
        } else {
          filters.status = Array.isArray(navState.statusFilter) ? navState.statusFilter : [navState.statusFilter];
          if (sf === 'Active') filters.dashboardExcludeArchived = true;
        }
      }

      if (navState.priorityFilter) {
        filters.priority = Array.isArray(navState.priorityFilter) ? navState.priorityFilter : [navState.priorityFilter];
        filters.dashboardExcludeArchived = true;
        filters.dashboardExcludeClosed = true;
      }

      if (navState.typeFilter) {
        filters.typeOfComplaint = Array.isArray(navState.typeFilter) ? navState.typeFilter : [navState.typeFilter];
      }
      if (navState.unassignedOnly) filters.assignee = ['Unassigned'];
      if (navState.dateFilter) filters.date = navState.dateFilter;
      if (navState.sourceFilter) filters.sourceOfComplaint = navState.sourceFilter;
      if (navState.refundStatusFilter) {
        filters.refundStatus = Array.isArray(navState.refundStatusFilter) ? navState.refundStatusFilter : [navState.refundStatusFilter];
      }
      if (navState.assigneeFilter) {
        filters.assignee = Array.isArray(navState.assigneeFilter) ? navState.assigneeFilter : [navState.assigneeFilter];
      }
      if (navState.linkedOnly) filters.linkedOnly = true;

      setAppliedFilters(filters);
      setTempFilters(filters);
    } else {
      if (navState.linkedOnly) {
        setAppliedFilters(prev => ({ ...prev, linkedOnly: true }));
      }
      if (navState.statusFilter) {
        const sf = navState.statusFilter;
        const statusArray = Array.isArray(sf) ? sf : [sf];
        setAppliedFilters(prev => ({ ...prev, status: statusArray }));
        setTempFilters(prev => ({ ...prev, status: statusArray }));
      }
      if (navState.priorityFilter) {
        const pf = navState.priorityFilter;
        const pfArray = Array.isArray(pf) ? pf : [pf];
        setAppliedFilters(prev => ({ ...prev, priority: pfArray }));
        setTempFilters(prev => ({ ...prev, priority: pfArray }));
      }
      if (navState.searchId) {
        setSearchTerm(navState.searchId);
        setAutoOpenCaseId(navState.searchId);
      }
      if (navState.typeFilter) {
        const tf = navState.typeFilter;
        const tfArray = Array.isArray(tf) ? tf : [tf];
        setAppliedFilters(prev => ({ ...prev, typeOfComplaint: tfArray }));
        setTempFilters(prev => ({ ...prev, typeOfComplaint: tfArray }));
      }
      if (navState.unassignedOnly) {
        setAppliedFilters(prev => ({ ...prev, assignee: ['Unassigned'] }));
        setTempFilters(prev => ({ ...prev, assignee: ['Unassigned'] }));
      }
      if (navState.dateFilter) {
        const df = navState.dateFilter;
        setAppliedFilters(prev => ({ ...prev, date: df }));
        setTempFilters(prev => ({ ...prev, date: df }));
      }
      if (navState.sourceFilter) {
        const sf = navState.sourceFilter;
        setAppliedFilters(prev => ({ ...prev, sourceOfComplaint: sf }));
        setTempFilters(prev => ({ ...prev, sourceOfComplaint: sf }));
      }
      if (navState.refundStatusFilter) {
        const rf = navState.refundStatusFilter;
        const rfArray = Array.isArray(rf) ? rf : [rf];
        setAppliedFilters(prev => ({ ...prev, refundStatus: rfArray }));
        setTempFilters(prev => ({ ...prev, refundStatus: rfArray }));
      }
      if (navState.assigneeFilter) {
        const af = navState.assigneeFilter;
        const afArray = Array.isArray(af) ? af : [af];
        setAppliedFilters(prev => ({ ...prev, assignee: afArray }));
        setTempFilters(prev => ({ ...prev, assignee: afArray }));
      }
    }

    window.history.replaceState({}, document.title);

    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('search')) {
      setSearchTerm(searchParams.get('search'));
    }
  }, [location.state, location.search]);



  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('search') && cases.length > 0) {
      const searchId = searchParams.get('search');
      const foundCase = cases.find(c => c.caseId === searchId);
      if (foundCase && (!viewCase || viewCase.caseId !== searchId)) {
        handleViewCase(foundCase);
      }
    }
  }, [location.search, cases]);

  useEffect(() => {
    if (autoOpenCaseId && cases.length > 0) {
      const foundCase = cases.find(c => c.caseId === autoOpenCaseId);
      if (foundCase) {
        handleViewCase(foundCase);
        setAutoOpenCaseId(null);
      }
    }
  }, [cases, autoOpenCaseId]);

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
    if (user?.role === 'BD Head') {
      toast.error('Export is disabled for your role.');
      return;
    }
    if (filteredCases.length === 0) return toast.error('No data to export');

    const columnDefs = [
      { label: 'Case ID', key: 'caseId', getVal: c => c.caseId || c.caseid || '' },
      { label: 'Created', key: 'createdDate', getVal: c => c.createdDate ? format(new Date(c.createdDate), 'dd/MM/yyyy') : '' },
      { label: 'Company', key: 'company', getVal: c => c.companyName || '' },
      { label: 'Client', key: 'client', getVal: c => c.clientName || '' },
      { label: 'Type of Complaint', key: 'typeOfComplaint', getVal: c => c.typeOfComplaint || '' },
      { label: 'Amount Received', key: 'totalAmtPaid', getVal: c => c.totalAmtPaid || '0' },
      { label: 'Priority', key: 'priority', getVal: c => c.priority || '' },
      { label: 'Due Date', key: 'dueDate', getVal: c => c.dueDate ? format(new Date(c.dueDate), 'dd/MM/yyyy') : '' },
      { label: 'Status', key: 'status', getVal: c => normalizeStatus(c.currentStatus || c.status, c.assignedTo, c.initiatedBy) },
      {
        label: 'Refund', key: 'refund', getVal: c => {
          const r = refundsList.find(x => x.caseId === c.caseId);
          if (!r) return 'No Refund';
          const paid = r.transactionId && (r.installments || []).length <= 1;
          return (r.status?.toLowerCase() === 'paid' || paid) ? 'Paid' : 'Pending';
        }
      },
      { label: 'Assigned To', key: 'assignedTo', getVal: c => c.assignedTo || c.initiatedBy || '' },
      { label: 'Last Update', key: 'lastUpdateDate', getVal: c => c.lastUpdateDate ? format(new Date(c.lastUpdateDate), 'dd/MM/yyyy') : '' },
      ...filterableFields.filter(f => ['clientMobile', 'clientEmail', 'state', 'city', 'sourceOfComplaint', 'amtInDispute', 'bda', 'workStatus', 'legalOfficer', 'serviceName', 'dateOfLastPayment', 'mouSigned', 'totalMouValue', 'clientAllegation', 'caseSummary'].includes(f.key)).map(f => ({
        label: f.label,
        key: f.key,
        getVal: c => {
          if (f.key.includes('.')) {
            const [p, ch] = f.key.split('.');
            return c[p]?.[ch] || '';
          }
          let val = c[f.key];
          if (val === undefined || val === null) return '';
          if (['dateOfLastPayment', 'lienMarkedOn', 'createdDate'].includes(f.key)) {
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            } catch (e) { }
          }
          return String(val);
        }
      }))
    ];

    const activeCols = columnDefs.filter(col => visibleColumns.includes(col.key));
    if (activeCols.length === 0) {
      return toast.error('No columns selected for export');
    }

    const headers = activeCols.map(c => c.label);
    const data = filteredCases.map(c => {
      const rowData = {};
      activeCols.forEach(col => {
        rowData[col.label] = col.getVal(c);
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cases");

    // Auto-size columns
    const maxWidths = headers.map(h => ({ wch: h.length + 5 }));
    data.forEach(row => {
      Object.values(row).forEach((val, i) => {
        const len = val ? String(val).length : 0;
        if (len + 2 > maxWidths[i].wch) maxWidths[i].wch = len + 2;
      });
    });
    worksheet['!cols'] = maxWidths;

    XLSX.writeFile(workbook, `Case_Master_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleDeleteCase = async (caseId) => {
    const isConfirmed = await confirmDelete('Delete Case?', `Are you sure you want to delete case ${caseId}? This action cannot be undone.`);
    if (!isConfirmed) return;

    try {
      await api.delete(`/cases/${caseId}`);
      toast.success('Case deleted successfully');
      try {
        const channel = new BroadcastChannel('case_updates');
        channel.postMessage({ type: 'CASE_PROGRESS_UPDATED' });
        channel.close();
      } catch (e) { }
      fetchCases();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete case');
    }
  };

  const uniqueCaseNumbersList = useMemo(() => {
    const list = [];
    const seenKeys = new Set();

    (cases || []).forEach((c) => {
      if (c.cyberAckNumbers) {
        const acks = c.cyberAckNumbers.split(',').map(x => x.trim()).filter(Boolean);
        acks.forEach(ack => {
          const key = `ack-${ack}-${c.caseId}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            list.push({ type: 'Ack', value: ack, caseId: c.caseId });
          }
        });
      }
      if (c.grievanceNumber) {
        const g = c.grievanceNumber.trim();
        if (g) {
          const key = `grievance-${g}-${c.caseId}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            list.push({ type: 'Grievance', value: g, caseId: c.caseId });
          }
        }
      }
      if (c.firNumber) {
        const f = c.firNumber.trim();
        if (f) {
          const key = `fir-${f}-${c.caseId}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            list.push({ type: 'FIR', value: f, caseId: c.caseId });
          }
        }
      }
    });

    return list.sort((a, b) => a.value.localeCompare(b.value));
  }, [cases]);

  const filteredNumbersList = useMemo(() => {
    const search = (tempFilters.caseNumbers || '').toLowerCase().trim();
    const showTypes = tempFilters.showNumberTypes || ['Ack', 'Grievance', 'FIR'];
    let list = uniqueCaseNumbersList.filter(item => showTypes.includes(item.type));
    if (!search) return list;
    return list.filter(item =>
      item.value.toLowerCase().includes(search) ||
      item.caseId.toLowerCase().includes(search)
    );
  }, [uniqueCaseNumbersList, tempFilters.caseNumbers, tempFilters.showNumberTypes]);

  const filteredCases = cases.filter(c => {
    // Archive mode filter
    if (isArchiveMode) {
      if (!c.isArchived) return false;
    } else {
      if (c.isArchived) return false;
    }

    // Reviewer filter: only show cases that are in "Pending Review" status in refunds
    if (user?.role === 'Reviewer') {
      const pendingCaseIds = refundsList
        .filter(r => r.status === 'Pending Review')
        .map(r => r.caseId);
      if (!pendingCaseIds.includes(c.caseId)) {
        return false;
      }
    }

    if (appliedFilters.excludeOdoo && isOdooSourceCase(c)) return false;

    if (appliedFilters.dashboardUserFilter) {
      const filter = appliedFilters.dashboardUserFilter.toLowerCase().trim();
      const assignedTo = (c.assignedTo || '').toLowerCase();
      const initiatedBy = (c.initiatedBy || '').toLowerCase();
      const isUnassigned = !c.assignedTo || c.assignedTo.trim() === '';
      const match = assignedTo.includes(filter) || (isUnassigned && initiatedBy.includes(filter));
      if (!match) return false;
    }

    if (appliedFilters.createdDateStart || appliedFilters.createdDateEnd) {
      const rawDate = c.createdDate || c.createdAt;
      if (!rawDate) return false;
      const caseCreated = new Date(rawDate);
      if (Number.isNaN(caseCreated.getTime())) return false;
      if (appliedFilters.createdDateStart) {
        const start = new Date(appliedFilters.createdDateStart);
        start.setHours(0, 0, 0, 0);
        if (caseCreated < start) return false;
      }
      if (appliedFilters.createdDateEnd) {
        const end = new Date(appliedFilters.createdDateEnd);
        end.setHours(23, 59, 59, 999);
        if (caseCreated > end) return false;
      }
    }

    if (appliedFilters.dashboardExcludeArchived && c.isArchived) return false;
    if (appliedFilters.dashboardExcludeClosed && isDashboardClosedStatus(c.currentStatus || c.status)) return false;
    if (appliedFilters.dashboardSettledOnly && !isDashboardSettledStatus(c.currentStatus || c.status)) return false;
    if (appliedFilters.dashboardClosureOnly && !isDashboardClosedStatus(c.currentStatus || c.status)) return false;

    const matchSearch = (c.caseId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.assignedTo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.cyberAckNumbers?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.grievanceNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.firNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    let matchStatus = false;
    const normalizedCaseStatus = normalizeStatus(c.currentStatus || c.status, c.assignedTo, c.initiatedBy);

    if (appliedFilters.status.includes('All Status') || appliedFilters.status.length === 0) {
      matchStatus = true;
    } else {
      matchStatus = appliedFilters.status.some(selectedStatus => {
        if (selectedStatus === 'Active') {
          const caseStatusLower = (c.currentStatus || c.status || '').toLowerCase().trim();
          const closureList = [
            'closure', 'resolution', 'resolved', 'done',
            'complete', 'completed', 'closed', 'na', 'na non agreement', 'non agreement'
          ];
          const isStatusNotClosure = !closureList.some(s => {
            if (s === 'na') return caseStatusLower === 'na';
            return caseStatusLower.includes(s) || caseStatusLower === s;
          });
          return isStatusNotClosure;
        } else if (selectedStatus === 'Closed' || selectedStatus === 'Closure') {
          return normalizedCaseStatus === 'Closure' || normalizedCaseStatus === 'Closed' || normalizedCaseStatus === 'Resolution';
        } else if (selectedStatus === 'Unassigned') {
          return false;
        } else {
          return normalizedCaseStatus === selectedStatus;
        }
      });
    }

    const matchPriority = appliedFilters.priority.includes('All Priority') || appliedFilters.priority.length === 0 || appliedFilters.priority.includes(c.priority);

    const assignedPerson = c.assignedTo || c.initiatedBy || '';
    let matchAssignee = false;
    if (appliedFilters.assignee.includes('All Assignees') || appliedFilters.assignee.length === 0) {
      matchAssignee = true;
    } else {
      const hasUnassigned = appliedFilters.assignee.includes('Unassigned');
      const otherAssignees = appliedFilters.assignee.filter(a => a !== 'Unassigned');
      const initiatedByValue = c.initiatedBy?.toString?.() || '';
      const assignedToValue = c.assignedTo?.toString?.() || '';
      const isInitiatedByBlank = initiatedByValue.trim() === '' || initiatedByValue.trim().toLowerCase() === 'null' || initiatedByValue.trim().toLowerCase() === 'undefined';
      const isAssignedToBlank = assignedToValue.trim() === '' || assignedToValue.trim().toLowerCase() === 'null' || assignedToValue.trim().toLowerCase() === 'undefined';
      const isUnassigned = isInitiatedByBlank && isAssignedToBlank;
      const matchesName = otherAssignees.some(a => a.toLowerCase() === assignedPerson.toLowerCase());
      matchAssignee = (hasUnassigned && isUnassigned) || matchesName;
    }

    let matchDate = true;
    if (appliedFilters.date) {
      const caseDate = c.createdDate ? new Date(c.createdDate).toISOString().split('T')[0] : null;
      matchDate = caseDate === appliedFilters.date;
    }

    let matchState = true;
    if (appliedFilters.state && !appliedFilters.state.includes('All States') && appliedFilters.state.length > 0) {
      const caseState = c.state ? String(c.state).trim() : '';
      matchState = appliedFilters.state.some(selectedState => {
        if (selectedState === 'Blank') {
          return !caseState || caseState.trim() === '';
        }
        return caseState.toLowerCase() === selectedState.trim().toLowerCase();
      });
    }

    const matchType = appliedFilters.typeOfComplaint.includes('All Types') ||
      appliedFilters.typeOfComplaint.length === 0 ||
      appliedFilters.typeOfComplaint.some(t => String(t || '').trim().toLowerCase() === String(c.typeOfComplaint || '').trim().toLowerCase());

    const matchSourceOfComplaint = !appliedFilters.sourceOfComplaint ||
      (appliedFilters.sourceOfComplaint.toLowerCase() === 'unknown'
        ? (!c.sourceOfComplaint || c.sourceOfComplaint.toLowerCase().trim() === '' || c.sourceOfComplaint.toLowerCase() === 'unknown')
        : c.sourceOfComplaint?.toLowerCase().includes(appliedFilters.sourceOfComplaint.toLowerCase()));
    const matchServiceMode = !appliedFilters.serviceMode || c.serviceMode?.toLowerCase().includes(appliedFilters.serviceMode.toLowerCase());
    const matchServiceName = !appliedFilters.serviceName || c.serviceName?.toLowerCase().includes(appliedFilters.serviceName.toLowerCase());
    let matchCity = true;
    if (appliedFilters.city && !appliedFilters.city.includes('All Cities') && appliedFilters.city.length > 0) {
      const caseCity = c.city ? String(c.city).trim() : '';
      matchCity = appliedFilters.city.some(selectedCity => {
        if (selectedCity === 'Blank') {
          return !caseCity || caseCity.trim() === '' || caseCity === '—';
        }
        return caseCity.toLowerCase() === selectedCity.trim().toLowerCase();
      });
    }

    let matchLastPayment = true;
    if (appliedFilters.lastPaymentStart || appliedFilters.lastPaymentEnd) {
      const lastPaymentDate = c.dateOfLastPayment ? new Date(c.dateOfLastPayment) : null;
      if (!lastPaymentDate || Number.isNaN(lastPaymentDate.getTime())) {
        matchLastPayment = false;
      } else {
        if (appliedFilters.lastPaymentStart) {
          const startDate = new Date(appliedFilters.lastPaymentStart);
          matchLastPayment = matchLastPayment && lastPaymentDate >= startDate;
        }
        if (appliedFilters.lastPaymentEnd) {
          const endDate = new Date(appliedFilters.lastPaymentEnd);
          matchLastPayment = matchLastPayment && lastPaymentDate <= endDate;
        }
      }
    }

    const matchLinkedOnly = !appliedFilters.linkedOnly || (c.linkedBy && c.linkedBy.trim() !== '');

    let matchRefund = true;
    if (appliedFilters.refundStatus && !appliedFilters.refundStatus.includes('All Refunds') && appliedFilters.refundStatus.length > 0) {
      const caseRefundStatus = c.refundStatus || '';
      matchRefund = appliedFilters.refundStatus.some(selectedRefund => {
        return caseRefundStatus.toLowerCase() === selectedRefund.toLowerCase();
      });
    }

    let matchCaseNumbers = true;
    if (appliedFilters.selectedCaseNumbers && appliedFilters.selectedCaseNumbers.length > 0) {
      const selected = appliedFilters.selectedCaseNumbers.map(n => n.toLowerCase());
      const cyberAck = (c.cyberAckNumbers || '').toLowerCase();
      const grievance = (c.grievanceNumber || '').toLowerCase();
      const fir = (c.firNumber || '').toLowerCase();
      matchCaseNumbers = selected.some(searchNum =>
        cyberAck.split(',').map(x => x.trim()).includes(searchNum) ||
        grievance === searchNum ||
        fir === searchNum
      );
    } else if (appliedFilters.caseNumbers) {
      const searchNum = appliedFilters.caseNumbers.toLowerCase().trim();
      const cyberAck = (c.cyberAckNumbers || '').toLowerCase();
      const grievance = (c.grievanceNumber || '').toLowerCase();
      const fir = (c.firNumber || '').toLowerCase();
      matchCaseNumbers = cyberAck.includes(searchNum) || grievance.includes(searchNum) || fir.includes(searchNum);
    }

    let matchCustom = true;
    if (appliedFilters.customFilters) {
      const customFilters = appliedFilters.customFilters;
      if (customFilters.companyName && !c.companyName?.toLowerCase().includes(customFilters.companyName.toLowerCase())) {
        matchCustom = false;
      }
      if (customFilters.clientName && !c.clientName?.toLowerCase().includes(customFilters.clientName.toLowerCase())) {
        matchCustom = false;
      }
      if (customFilters.clientEmail && !c.clientEmail?.toLowerCase().includes(customFilters.clientEmail.toLowerCase())) {
        matchCustom = false;
      }
      if (customFilters.clientMobile && !c.clientMobile?.toLowerCase().includes(customFilters.clientMobile.toLowerCase())) {
        matchCustom = false;
      }

      if (customFilters.conditions && customFilters.conditions.length > 0) {
        for (const cond of customFilters.conditions) {
          if (!cond.field) continue;
          let cVal = '';
          if (cond.field.includes('.')) {
            const [p, ch] = cond.field.split('.');
            cVal = String(c[p]?.[ch] || '');
          } else {
            cVal = String(c[cond.field] || '');
          }
          cVal = cVal.toLowerCase().trim();
          const vVal = String(cond.value || '').toLowerCase().trim();

          let condMatch = true;
          switch (cond.operator) {
            case 'contains': condMatch = cVal.includes(vVal); break;
            case 'equals': condMatch = cVal === vVal; break;
            case 'not_equals': condMatch = cVal !== vVal; break;
            case 'starts_with': condMatch = cVal.startsWith(vVal); break;
            case 'is_empty': condMatch = (!cVal || cVal === '—' || cVal === '-'); break;
            case 'is_not_empty': condMatch = !!(cVal && cVal !== '—' && cVal !== '-'); break;
          }
          if (!condMatch) {
            matchCustom = false;
            break;
          }
        }
      }

      if (customFilters.selectedField && customFilters.selectedValue) {
        const fieldKey = customFilters.selectedField;
        const serviceKeys = ['serviceName', 'bda', 'workStatus', 'serviceAmount', 'signedMouAmount', 'department', 'serviceMouSigned'];
        if (serviceKeys.includes(fieldKey)) {
          const targetVal = customFilters.selectedValue.toLowerCase();
          const propKey = fieldKey === 'serviceMouSigned' ? 'mouSigned' : fieldKey;
          const topMatch = c[propKey]?.toString().toLowerCase().includes(targetVal);
          const arrayMatch = c.servicesSold?.some(s => s[propKey]?.toString().toLowerCase().includes(targetVal));
          if (!topMatch && !arrayMatch) {
            matchCustom = false;
          }
        } else {
          let cVal = c[fieldKey];
          if (fieldKey.includes('.')) {
            const [parent, child] = fieldKey.split('.');
            cVal = c[parent]?.[child];
          }
          if (fieldKey === 'dateOfLastPayment' || fieldKey === 'lienMarkedOn' || fieldKey === 'createdDate') {
            try {
              const d = new Date(cVal);
              if (!isNaN(d.getTime())) {
                cVal = d.toISOString().split('T')[0];
              }
            } catch (e) { }
          }
          const valStr = cVal?.toString().toLowerCase() || '';
          if (!valStr.includes(customFilters.selectedValue.toLowerCase())) {
            matchCustom = false;
          }
        }
      } else if (customFilters.anyDetail) {
        const searchValue = customFilters.anyDetail.toLowerCase();
        const anyFields = [
          c.caseId,
          c.companyName,
          c.caseTitle,
          c.priority,
          c.sourceOfComplaint,
          c.typeOfComplaint,
          c.brandName,
          c.serviceMode,
          c.serviceName,
          c.clientName,
          c.clientEmail,
          c.clientMobile,
          c.city,
          c.state,
          c.pincode,
          c.createdDate,
          c.dateOfLastPayment,
          c.assignedTo,
          c.initiatedBy,
          c.currentStatus,
          c.refundStatus,
          c.cyberAckNumbers,
          c.grievanceNumber,
          c.firNumber
        ];
        if (c.servicesSold && Array.isArray(c.servicesSold)) {
          c.servicesSold.forEach(s => {
            anyFields.push(s.serviceName, s.bda, s.workStatus, s.serviceAmount, s.mouSigned, s.signedMouAmount, s.department);
          });
        }
        matchCustom = anyFields.some(value => value?.toString?.().toLowerCase().includes(searchValue));
      }
    }

    // ── Column-level inline filters ──
    let matchColumnFilters = true;
    for (const [colKey, selectedVals] of Object.entries(columnFilters)) {
      if (!selectedVals || selectedVals.length === 0) continue;
      let cellVal = '';
      if (colKey === 'createdDate') {
        cellVal = c.createdDate ? format(new Date(c.createdDate), 'dd/MM/yyyy') : '—';
      } else if (colKey === 'lastUpdateDate') {
        cellVal = c.lastUpdateDate ? format(new Date(c.lastUpdateDate), 'dd/MM/yyyy') : '—';
      } else if (colKey === 'totalAmtPaid') {
        cellVal = c.totalAmtPaid ? Number(c.totalAmtPaid).toLocaleString('en-IN') : '0';
      } else if (colKey === 'status') {
        cellVal = normalizeStatus(c.currentStatus || c.status, c.assignedTo, c.initiatedBy);
      } else if (colKey === 'assignedTo') {
        cellVal = c.assignedTo || c.initiatedBy || '—';
      } else if (colKey === 'refund') {
        const cRef = refundsList.find(r => r.caseId === c.caseId);
        if (cRef) {
          const isPaid = cRef.transactionId && (cRef.installments || []).length <= 1;
          cellVal = (cRef.status === 'Paid' || isPaid) ? 'Paid' : 'Pending';
        } else { cellVal = 'No Refund'; }
      } else if (colKey === 'typeOfComplaint') {
        cellVal = c.typeOfComplaint || '—';
      } else if (colKey === 'priority') {
        cellVal = c.priority || '—';
      } else if (colKey === 'company') {
        cellVal = c.companyName || '—';
      } else if (colKey === 'client') {
        cellVal = c.clientName || '—';
      } else {
        cellVal = c[colKey] ? String(c[colKey]) : '—';
      }
      if (!selectedVals.includes(cellVal)) { matchColumnFilters = false; break; }
    }

    return matchSearch && matchStatus && matchPriority && matchAssignee && matchDate && matchState && matchType && matchSourceOfComplaint && matchServiceMode && matchServiceName && matchCity && matchLastPayment && matchLinkedOnly && matchRefund && matchCaseNumbers && matchCustom && matchColumnFilters;
  });

  if (colSortConfig.key && colSortConfig.direction) {
    const { key, direction } = colSortConfig;
    const isAsc = direction === 'asc';

    const getSortVal = (c) => {
      if (key === 'company') return c.companyName || '';
      if (key === 'client') return c.clientName || '';
      if (key === 'typeOfComplaint') return c.typeOfComplaint || '';
      if (key === 'priority') {
        const weights = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        return weights[c.priority] || 0;
      }
      if (key === 'status') {
        return normalizeStatus(c.currentStatus || c.status, c.assignedTo, c.initiatedBy) || '';
      }
      if (key === 'refund') {
        const r = refundsList.find(x => x.caseId === c.caseId);
        if (!r) return 0;
        const paid = r.transactionId && (r.installments || []).length <= 1;
        const refStatus = (r.status === 'Paid' || paid) ? 'Paid' : 'Pending';
        const weights = { 'Paid': 2, 'Pending': 1, 'No Refund': 0 };
        return weights[refStatus] || 0;
      }
      if (key === 'assignedTo') return c.assignedTo || c.initiatedBy || '';
      if (key === 'createdDate') return c.createdDate ? new Date(c.createdDate).getTime() : 0;
      if (key === 'lastUpdateDate') return c.lastUpdateDate ? new Date(c.lastUpdateDate).getTime() : 0;
      if (key === 'totalAmtPaid') return parseFloat(String(c.totalAmtPaid || '').replace(/[^\d.-]/g, '')) || 0;
      return c[key] || '';
    };

    filteredCases.sort((a, b) => {
      const valA = getSortVal(a);
      const valB = getSortVal(b);

      if (typeof valA === 'number' && typeof valB === 'number') {
        return isAsc ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return isAsc ? -1 : 1;
      if (strA > strB) return isAsc ? 1 : -1;
      return 0;
    });
  } else if (appliedFilters.amountSort === 'asc') {
    filteredCases.sort((a, b) => {
      const valA = parseFloat(String(a.totalAmtPaid || '').replace(/[^\d.-]/g, '')) || 0;
      const valB = parseFloat(String(b.totalAmtPaid || '').replace(/[^\d.-]/g, '')) || 0;
      return valA - valB;
    });
  } else if (appliedFilters.amountSort === 'desc') {
    filteredCases.sort((a, b) => {
      const valA = parseFloat(String(a.totalAmtPaid || '').replace(/[^\d.-]/g, '')) || 0;
      const valB = parseFloat(String(b.totalAmtPaid || '').replace(/[^\d.-]/g, '')) || 0;
      return valB - valA;
    });
  }

  const handleGenerateAISummary = async () => {
    try {
      setIsGeneratingSummary(true);

      const payload = {
        customPrompt: aiPrompt,
        targetField: aiTargetField
      };

      if (viewCase?.caseId) {
        payload.caseId = viewCase.caseId;
      } else {
        payload.tempCaseData = formData;
      }

      const res = await api.post('/ai/generate-summary', payload);

      if (res.data.success) {
        setFormData(prev => ({
          ...prev,
          [aiTargetField]: prev[aiTargetField] ? prev[aiTargetField] + '\n\n' + res.data.summary : res.data.summary
        }));
        toast.success('Generated successfully!');
        setShowAIPromptModal(false);
        setAiPrompt('');
      } else {
        toast.error(res.data.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const hasActiveFilters = !!(
    searchTerm ||
    !appliedFilters.status.includes('All Status') ||
    !appliedFilters.priority.includes('All Priority') ||
    !appliedFilters.assignee.includes('All Assignees') ||
    !appliedFilters.typeOfComplaint.includes('All Types') ||
    appliedFilters.date ||
    (appliedFilters.state && !appliedFilters.state.includes('All States')) ||
    (appliedFilters.refundStatus && !appliedFilters.refundStatus.includes('All Refunds')) ||
    appliedFilters.sourceOfComplaint ||
    appliedFilters.serviceMode ||
    appliedFilters.serviceName ||
    (appliedFilters.city && !appliedFilters.city.includes('All Cities')) ||
    appliedFilters.lastPaymentStart ||
    appliedFilters.lastPaymentEnd ||
    appliedFilters.linkedOnly ||
    appliedFilters.amountSort ||
    appliedFilters.excludeOdoo ||
    appliedFilters.createdDateStart ||
    appliedFilters.createdDateEnd ||
    appliedFilters.dashboardUserFilter ||
    appliedFilters.dashboardExcludeArchived ||
    appliedFilters.dashboardExcludeClosed ||
    appliedFilters.dashboardSettledOnly ||
    appliedFilters.dashboardClosureOnly ||
    appliedFilters.caseNumbers ||
    (appliedFilters.selectedCaseNumbers && appliedFilters.selectedCaseNumbers.length > 0) ||
    colSortConfig.key ||
    Object.keys(columnFilters).length > 0 ||
    (appliedFilters.customFilters && Object.values(appliedFilters.customFilters).some(v => v))
  );

  const handleApplyFilters = () => {
    setAppliedFilters(tempFilters);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    const reset = getDefaultCaseMasterFilters();
    setTempFilters(reset);
    setAppliedFilters(reset);
    setColumnFilters({});
    setColSortConfig({ key: null, direction: null });
    setIsFilterOpen(false);
  };

  // Keep progress form in sync with current case status
  useEffect(() => {
    if (viewCase) {
      const isAssigned = viewCase.assignedTo && viewCase.assignedTo.trim() !== '';
      const currentStatus = viewCase.currentStatus || 'New';

      let stage = currentStatus === 'New' ? 'Case Logged' : currentStatus;
      let percentage = viewCase.progressPercentage || 10;

      // Auto-switch to Assigned if it's assigned but still in Logged stage
      if (isAssigned && (stage === 'Case Logged' || stage === 'New')) {
        stage = 'Assigned';
        percentage = 25;
      }

      setProgressFormData(prev => ({
        ...prev,
        stage,
        percentage
      }));
    }
  }, [viewCase?.currentStatus, viewCase?.assignedTo]);


  const handleViewCase = async (c) => {
    if (user?.role?.toLowerCase().trim() === 'operation admin') {
      const assignedName = (c.assignedTo || '').trim().toLowerCase();
      const myName = (user?.fullName || user?.name || '').trim().toLowerCase();
      const myEmail = (user?.email || '').trim().toLowerCase();
      if (assignedName !== myName && assignedName !== myEmail) {
        toast.error("Access Denied: This case is not assigned to you.");
        return;
      }
    }
    try {
      // Fetch fresh case data from backend for this specific case
      const freshRes = await api.get(`/cases/${c.caseId}`);
      const caseToUse = freshRes.data || c;

      if (user?.role?.toLowerCase().trim() === 'operation admin') {
        const assignedName = (caseToUse.assignedTo || '').trim().toLowerCase();
        const myName = (user?.fullName || user?.name || '').trim().toLowerCase();
        const myEmail = (user?.email || '').trim().toLowerCase();
        if (assignedName !== myName && assignedName !== myEmail) {
          toast.error("Access Denied: This case is not assigned to you.");
          return;
        }
      }

      setViewCase(caseToUse);
      setActiveDetailTab('Case Study');
      setTimelineLogs([]);
      setCaseComms([]);
      setCaseDocs([]);

      // Initialize editable form data with fresh data
      setFormData({
        companyName: caseToUse.companyName || '',
        caseTitle: caseToUse.caseTitle || '',
        priority: caseToUse.priority || 'Medium',
        sourceOfComplaint: caseToUse.sourceOfComplaint || '',
        typeOfComplaint: caseToUse.typeOfComplaint || '',
        brandName: caseToUse.brandName || '',
        clientName: caseToUse.clientName || '',
        clientMobile: caseToUse.clientMobile || '',
        clientEmail: caseToUse.clientEmail || '',
        state: caseToUse.state || '',
        city: caseToUse.city || '',
        pincode: caseToUse.pincode || '',
        engagementNote: caseToUse.engagementNote || '',
        caseSummary: caseToUse.caseSummary || caseToUse.summary || '',
        clientAllegation: caseToUse.clientAllegation || caseToUse.allegation || '',
        totalAmtPaid: (caseToUse.totalAmtPaid !== undefined && caseToUse.totalAmtPaid !== null && caseToUse.totalAmtPaid !== '') ? caseToUse.totalAmtPaid : ((caseToUse.amountPaid !== undefined && caseToUse.amountPaid !== null && caseToUse.amountPaid !== '') ? caseToUse.amountPaid : ''),
        totalMouValue: (caseToUse.totalMouValue !== undefined && caseToUse.totalMouValue !== null && caseToUse.totalMouValue !== '') ? caseToUse.totalMouValue : ((caseToUse.mouValue !== undefined && caseToUse.mouValue !== null && caseToUse.mouValue !== '') ? caseToUse.mouValue : ''),
        amtInDispute: (caseToUse.amtInDispute !== undefined && caseToUse.amtInDispute !== null && caseToUse.amtInDispute !== '') ? caseToUse.amtInDispute : ((caseToUse.disputeAmount !== undefined && caseToUse.disputeAmount !== null && caseToUse.disputeAmount !== '') ? caseToUse.disputeAmount : ''),
        dateOfLastPayment: formatDateForInput(caseToUse.dateOfLastPayment || ''),
        refundedAmount: caseToUse.refundStatus === 'Paid' ? (caseToUse.refundedAmount || 0) : 0,
        savedAmount: caseToUse.refundStatus === 'Paid' ? (caseToUse.savedAmount || 0) : 0,
        dueDate: formatDateForInput(caseToUse.dueDate || ''),
        initiatedBy: caseToUse.initiatedBy || caseToUse.initiator || '',
        accountable: caseToUse.accountable || '',
        legalOfficer: caseToUse.legalOfficer || '',
        accounts: caseToUse.accounts || '',
        assignedTo: caseToUse.assignedTo || caseToUse.owner || '',
        firNumber: caseToUse.firNumber || '',
        firFileLink: caseToUse.firFileLink || '',
        grievanceNumber: caseToUse.grievanceNumber || '',
        proofCallRec: caseToUse.proofCallRec || 'No',
        proofWaChat: caseToUse.proofWaChat || 'No',
        proofVideoCall: caseToUse.proofVideoCall || 'No',
        proofFundingEmail: caseToUse.proofFundingEmail || 'No',
        mouSigned: caseToUse.mouSigned || 'No',
        smRisk: caseToUse.smRisk || 'None',
        consumerComplaintFiled: caseToUse.consumerComplaintFiled || 'No',
        policeThreat: caseToUse.policeThreat || 'None',
        lienMarkedOn: caseToUse.lienMarkedOn || '',
        lienBank: caseToUse.lienBank || '',
        refundStatus: caseToUse.refundStatus || '',
        acc1No: caseToUse.bankAccountDetails?.acc1No || '',
        acc1Ifsc: caseToUse.bankAccountDetails?.acc1Ifsc || '',
        acc2No: caseToUse.bankAccountDetails?.acc2No || '',
        acc2Ifsc: caseToUse.bankAccountDetails?.acc2Ifsc || '',
        importDocumentLink: caseToUse.importDocumentLink || '',
        keyPendingIssue: caseToUse.keyPendingIssue || '',
        recommendedNextSteps: caseToUse.recommendedNextSteps || ''
      });

      const isAssigned = (caseToUse.assignedTo && caseToUse.assignedTo.trim() !== '') || (caseToUse.initiatedBy && caseToUse.initiatedBy.toLowerCase() !== 'system' && caseToUse.initiatedBy.trim() !== '');
      const initialStageFallback = (caseToUse.currentStatus === 'Case Logged' || !caseToUse.currentStatus) && isAssigned ? 'Assigned' : (caseToUse.currentStatus || 'Case Logged');
      const initialPctFallback = initialStageFallback === 'Assigned' ? 40 : (caseToUse.progressPercentage || 0);

      setProgressFormData({
        stage: initialStageFallback,
        percentage: initialPctFallback,
        summary: '',
        nextAction: '',
        blockers: '',
        followUpDate: '',
        escalateTo: ''
      });

      setCommFormData(prev => ({
        ...prev,
        fromTo: caseToUse.clientName || ''
      }));

      setServiceMode(caseToUse.serviceMode || 'Single Service');
      if (caseToUse.servicesSold && Array.isArray(caseToUse.servicesSold) && caseToUse.servicesSold.length > 0) {
        setServices(caseToUse.servicesSold);
      } else {
        setServices([{ ...initialService }]);
      }

      if (caseToUse.cyberAckNumbers) {
        setCyberAcks(caseToUse.cyberAckNumbers.split(',').filter(Boolean));
      } else {
        setCyberAcks(['']);
      }

      setIsEditing(false);

      // Auto-fill signatory name with client name
      setMouFormData(prev => ({
        ...prev,
        signatoryName: caseToUse.clientName || ''
      }));

      try {
        const res = await api.get(`/timeline?caseId=${caseToUse.caseId}`);
        setTimelineLogs(res.data);
        fetchCaseComms(caseToUse.caseId);
        fetchCaseDocs(caseToUse.caseId);
        fetchProgressData(caseToUse.caseId);
        fetchActionLogs(caseToUse.caseId);
      } catch (err) {
        console.error('Failed to fetch timeline for case', err);
      }
    } catch (err) {
      console.error('Failed to fetch fresh case data:', err);
      // Fallback to using the passed case object
      setViewCase(c);
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
      totalAmtPaid: totalPaid === 0 ? 0 : (totalPaid || ''),
      totalMouValue: totalMou === 0 ? 0 : (totalMou || ''),
      amtInDispute: dispute === 0 ? 0 : (dispute || '')
    }));
  }, [services, viewCase]);

  // Auto-calculate savedAmount on the frontend
  useEffect(() => {
    const isPaid = viewCase?.refundStatus === 'Paid';
    const paid = Number(formData.totalAmtPaid) || 0;
    const refunded = isPaid ? (Number(formData.refundedAmount) || 0) : 0;
    const calculatedSaved = isPaid ? Math.max(0, paid - refunded) : 0;
    if (formData.refundedAmount !== refunded || formData.savedAmount !== calculatedSaved) {
      setFormData(prev => ({
        ...prev,
        refundedAmount: refunded,
        savedAmount: calculatedSaved
      }));
    }
  }, [formData.totalAmtPaid, formData.refundedAmount, viewCase]);

  // Listen to custom reset event from sidebar 'My Cases' link
  useEffect(() => {
    const handleReset = () => {
      setViewCase(null);
    };
    window.addEventListener('reset-case-view', handleReset);
    return () => {
      window.removeEventListener('reset-case-view', handleReset);
    };
  }, []);

  const handleFormat = (fieldName, type, formType = 'case') => {
    const textarea = document.getElementsByName(fieldName)[0];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    let replacement = '';
    const lineWidth = 80;

    if (type === 'bullets') {
      const lines = selectedText ? selectedText.split('\n') : [''];
      replacement = lines.map(line => `• ${line.replace(/^[•\-]\s*/, '')}`).join('\n');
    } else if (type === 'numbers') {
      const lines = selectedText ? selectedText.split('\n') : [''];
      replacement = lines.map((line, idx) => `${idx + 1}. ${line.replace(/^\d+\.\s*/, '')}`).join('\n');
    } else if (type === 'alphabets') {
      const lines = selectedText ? selectedText.split('\n') : [''];
      replacement = lines.map((line, idx) => {
        const letter = String.fromCharCode(65 + (idx % 26));
        return `${letter}. ${line.replace(/^[A-Z]\.\s*/, '')}`;
      }).join('\n');
    } else if (type === 'align-center') {
      const lines = selectedText ? selectedText.split('\n') : ['Center text here'];
      replacement = lines.map(line => {
        const trimmed = line.trim();
        const padding = Math.max(0, Math.floor((lineWidth - trimmed.length) / 2));
        return ' '.repeat(padding) + trimmed;
      }).join('\n');
    } else if (type === 'align-right') {
      const lines = selectedText ? selectedText.split('\n') : ['Right align text here'];
      replacement = lines.map(line => {
        const trimmed = line.trim();
        const padding = Math.max(0, lineWidth - trimmed.length);
        return ' '.repeat(padding) + trimmed;
      }).join('\n');
    } else if (type === 'align-left') {
      const lines = selectedText ? selectedText.split('\n') : [''];
      replacement = lines.map(line => line.trimStart()).join('\n');
    } else if (type === 'align-justify') {
      const lines = selectedText ? selectedText.split('\n') : [''];
      replacement = lines.map(line => {
        const words = line.trim().split(/\s+/);
        if (words.length <= 1) return line.trim();
        const totalSpaces = lineWidth - words.reduce((a, w) => a + w.length, 0);
        const gaps = words.length - 1;
        const spacePerGap = Math.floor(totalSpaces / gaps);
        const extra = totalSpaces % gaps;
        return words.map((w, i) => i < gaps ? w + ' '.repeat(spacePerGap + (i < extra ? 1 : 0)) : w).join('');
      }).join('\n');
    } else if (type === 'spacing-double') {
      replacement = selectedText ? selectedText.replace(/\n/g, '\n\n') : '\n\n';
    } else if (type === 'indent') {
      const lines = selectedText ? selectedText.split('\n') : [''];
      replacement = lines.map(line => `    ${line}`).join('\n');
    } else if (type === 'paragraph') {
      // Remove all list prefixes and extra leading spaces — plain paragraph text
      const lines = selectedText ? selectedText.split('\n') : [''];
      replacement = lines.map(line => line.replace(/^[\s•\-\d]+[.\s]*/, '').trimStart()).join('\n');
    } else if (type === 'bold') {
      // Wrap selected text in ** for bold indication
      replacement = selectedText ? `**${selectedText}**` : '**bold text**';
    }


    const newValue = beforeText + replacement + afterText;
    const targetKey =
      formType === 'communication' && fieldName === 'commSummary' ? 'summary' :
        formType === 'document' && fieldName === 'mouRemarks' ? 'remarks' :
          formType === 'progress' && fieldName === 'progressSummary' ? 'summary' :
            fieldName;

    if (formType === 'communication') {
      setCommFormData(prev => ({ ...prev, [targetKey]: newValue }));
    } else if (formType === 'document') {
      setMouFormData(prev => ({ ...prev, [targetKey]: newValue }));
    } else if (formType === 'progress') {
      setProgressFormData(prev => ({ ...prev, [targetKey]: newValue }));
    } else {
      setFormData(prev => ({ ...prev, [targetKey]: newValue }));
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 0);
  };

  const handleFormChange = (e) => {
    let { name, value } = e.target;

    // Numbers only restriction for specific fields
    if (name === 'clientMobile' || name === 'totalAmtPaid' || name === 'totalMouValue' || name === 'amtInDispute') {
      value = value.replace(/\D/g, ''); // Remove all non-digits
    }

    let updates = { [name]: value };

    if (name === 'refundedAmount') {
      const refundVal = Number(value) || 0;
      const disputeVal = Number(formData.amtInDispute) || 0;
      if (refundVal >= disputeVal && disputeVal > 0) {
        updates.savedAmount = 0;
      }
    }

    if (name === 'savedAmount') {
      const refundVal = Number(formData.refundedAmount) || 0;
      const disputeVal = Number(formData.amtInDispute) || 0;
      if (refundVal >= disputeVal && disputeVal > 0) {
        value = '0';
        updates.savedAmount = 0;
      }
    }

    if (name === 'companyName' || name === 'typeOfComplaint') {
      const comp = name === 'companyName' ? value : formData.companyName;
      const typeC = name === 'typeOfComplaint' ? value : formData.typeOfComplaint;
      updates.caseTitle = `${comp || 'Company'} - ${typeC || 'Type'}`;
    }

    // Inline Validations
    if (name === 'clientEmail') {
      if (value) {
        const emails = value.split(',').map(e => e.trim());
        const invalid = emails.some(e => e && !e.includes('@'));
        if (invalid) {
          setFormErrors(prev => ({ ...prev, clientEmail: 'Pattern not valid! Each email must contain @' }));
        } else {
          setFormErrors(prev => ({ ...prev, clientEmail: '' }));
        }
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
    let valToSet = value;
    if (field === 'serviceAmount' || field === 'signedMouAmount') {
      valToSet = value.replace(/\D/g, '');
    }
    const updatedServices = [...services];
    updatedServices[index][field] = valToSet;
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
      const isFullyRefunded = Number(formData.refundedAmount) >= Number(formData.amtInDispute) && Number(formData.amtInDispute) > 0;
      const payload = {
        ...formData,
        savedAmount: isFullyRefunded ? 0 : (formData.savedAmount || 0),
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
      try {
        const channel = new BroadcastChannel('case_updates');
        channel.postMessage({ type: 'CASE_PROGRESS_UPDATED' });
        channel.close();
      } catch (e) { }
      fetchCases();

      // Refresh the viewCase data to reflect backend auto-updates (like status changed to Assigned)
      const res = await api.get(`/cases/${viewCase.caseId}`);
      const updatedCase = res.data;
      if (updatedCase) {
        setViewCase(updatedCase);

        // Sync the editable form data with fresh data
        setFormData({
          companyName: updatedCase.companyName || '',
          caseTitle: updatedCase.caseTitle || '',
          priority: updatedCase.priority || 'Medium',
          sourceOfComplaint: updatedCase.sourceOfComplaint || '',
          typeOfComplaint: updatedCase.typeOfComplaint || '',
          brandName: updatedCase.brandName || '',
          clientName: updatedCase.clientName || '',
          clientMobile: updatedCase.clientMobile || '',
          clientEmail: updatedCase.clientEmail || '',
          state: updatedCase.state || '',
          city: updatedCase.city || '',
          pincode: updatedCase.pincode || '',
          engagementNote: updatedCase.engagementNote || '',
          caseSummary: updatedCase.caseSummary || updatedCase.summary || '',
          clientAllegation: updatedCase.clientAllegation || updatedCase.allegation || '',
          totalAmtPaid: (updatedCase.totalAmtPaid !== undefined && updatedCase.totalAmtPaid !== null && updatedCase.totalAmtPaid !== '') ? updatedCase.totalAmtPaid : ((updatedCase.amountPaid !== undefined && updatedCase.amountPaid !== null && updatedCase.amountPaid !== '') ? updatedCase.amountPaid : ''),
          totalMouValue: (updatedCase.totalMouValue !== undefined && updatedCase.totalMouValue !== null && updatedCase.totalMouValue !== '') ? updatedCase.totalMouValue : ((updatedCase.mouValue !== undefined && updatedCase.mouValue !== null && updatedCase.mouValue !== '') ? updatedCase.mouValue : ''),
          amtInDispute: (updatedCase.amtInDispute !== undefined && updatedCase.amtInDispute !== null && updatedCase.amtInDispute !== '') ? updatedCase.amtInDispute : ((updatedCase.disputeAmount !== undefined && updatedCase.disputeAmount !== null && updatedCase.disputeAmount !== '') ? updatedCase.disputeAmount : ''),
          dateOfLastPayment: formatDateForInput(updatedCase.dateOfLastPayment || ''),
          refundedAmount: updatedCase.refundedAmount || 0,
          savedAmount: updatedCase.savedAmount || 0,
          dueDate: formatDateForInput(updatedCase.dueDate || ''),
          initiatedBy: updatedCase.initiatedBy || updatedCase.initiator || '',
          accountable: updatedCase.accountable || '',
          legalOfficer: updatedCase.legalOfficer || '',
          accounts: updatedCase.accounts || '',
          assignedTo: updatedCase.assignedTo || updatedCase.owner || '',
          firNumber: updatedCase.firNumber || '',
          firFileLink: updatedCase.firFileLink || '',
          grievanceNumber: updatedCase.grievanceNumber || '',
          proofCallRec: updatedCase.proofCallRec || 'No',
          proofWaChat: updatedCase.proofWaChat || 'No',
          proofVideoCall: updatedCase.proofVideoCall || 'No',
          proofFundingEmail: updatedCase.proofFundingEmail || 'No',
          mouSigned: updatedCase.mouSigned || 'No',
          smRisk: updatedCase.smRisk || 'None',
          consumerComplaintFiled: updatedCase.consumerComplaintFiled || 'No',
          policeThreat: updatedCase.policeThreat || 'None',
          lienMarkedOn: updatedCase.lienMarkedOn || '',
          lienBank: updatedCase.lienBank || '',
          refundStatus: updatedCase.refundStatus || '',
          acc1No: updatedCase.bankAccountDetails?.acc1No || '',
          acc1Ifsc: updatedCase.bankAccountDetails?.acc1Ifsc || '',
          acc2No: updatedCase.bankAccountDetails?.acc2No || '',
          acc2Ifsc: updatedCase.bankAccountDetails?.acc2Ifsc || '',
          importDocumentLink: updatedCase.importDocumentLink || '',
          keyPendingIssue: updatedCase.keyPendingIssue || '',
          recommendedNextSteps: updatedCase.recommendedNextSteps || ''
        });

        // Sync progress form immediately
        setProgressFormData(prev => ({
          ...prev,
          stage: updatedCase.currentStatus === 'New' ? 'Case Logged' : updatedCase.currentStatus,
          percentage: updatedCase.progressPercentage || 10
        }));

        setIsEditing(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update case', { id: loadingToast });
    }
  };

  const handleMarkResolved = () => {
    setCompliancePendingChecked(false);
    setIsResolveModalOpen(true);
  };

  const confirmResolveCase = async () => {
    const loadingToast = toast.loading('Marking case as resolved...');
    try {
      // 1. Update Case status
      await api.put(`/cases/${viewCase.caseId}`, {
        currentStatus: 'Closure',
        progressPercentage: 100,
        compliancePending: compliancePendingChecked,
        isArchived: !compliancePendingChecked
      });

      // 2. Log in progress history
      await api.post('/progress', {
        caseId: viewCase.caseId,
        stage: 'Closure',
        percentage: 100,
        summary: `Case marked as resolved manually by user. ${compliancePendingChecked ? '(Compliance Pending)' : '(Archived)'}`,
        updatedBy: user?.fullName || user?.email
      });

      toast.success('Case marked as resolved', { id: loadingToast });
      setIsResolveModalOpen(false);
      try {
        const channel = new BroadcastChannel('case_updates');
        channel.postMessage({ type: 'CASE_PROGRESS_UPDATED' });
        channel.close();
      } catch (e) { }
      fetchCases();
      // Update local view
      setViewCase(prev => ({
        ...prev,
        currentStatus: 'Closure',
        progressPercentage: 100,
        compliancePending: compliancePendingChecked,
        isArchived: !compliancePendingChecked
      }));
      setIsResolvedDisplay(true);
      setClosureReady(false);
    } catch (err) {
      toast.error('Failed to resolve case', { id: loadingToast });
    }
  };

  const handleClearCompliancePending = async () => {
    if (!window.confirm("Are you sure you want to mark compliance as DONE and archive this case?")) return;
    const loadingToast = toast.loading('Clearing compliance and archiving case...');
    try {
      await api.put(`/cases/${viewCase.caseId}`, {
        compliancePending: false,
        isArchived: true
      });

      await api.post('/progress', {
        caseId: viewCase.caseId,
        stage: 'Closure',
        percentage: 100,
        summary: 'Compliance marked as DONE. Case archived.',
        updatedBy: user?.fullName || user?.email
      });

      toast.success('Compliance cleared & Case archived', { id: loadingToast });

      setViewCase(prev => ({
        ...prev,
        compliancePending: false,
        isArchived: true
      }));

      // Broadcast update
      const channel = new BroadcastChannel('case-updates');
      channel.postMessage({ type: 'CASE_PROGRESS_UPDATED' });
    } catch (err) {
      toast.error('Failed to clear compliance', { id: loadingToast });
    }
  };

  const handleQuickArchive = async (c, e) => {
    e.stopPropagation();
    const isConfirmed = await confirmDelete('Archive Case?', `Are you sure you want to instantly archive case ${c.caseId}?`);
    if (!isConfirmed) return;

    const loadingToast = toast.loading('Archiving case...');
    try {
      await api.put(`/cases/${c.caseId}`, {
        compliancePending: false,
        isArchived: true
      });

      await api.post('/progress', {
        caseId: c.caseId,
        stage: c.currentStatus || 'Archived',
        percentage: c.progressPercentage || 0,
        summary: 'Case archived and assignment removed.',
        updatedBy: user?.fullName || user?.email
      });

      toast.success('Case archived successfully', { id: loadingToast });
      fetchCases();
    } catch (err) {
      toast.error('Failed to archive case', { id: loadingToast });
    }
  };

  const handleUnarchive = async (c, e) => {
    e.stopPropagation();
    const isConfirmed = await confirmDelete('Unarchive Case?', `Are you sure you want to unarchive case ${c.caseId}?`);
    if (!isConfirmed) return;

    const loadingToast = toast.loading('Unarchiving case...');
    try {
      await api.put(`/cases/${c.caseId}`, {
        isArchived: false
      });

      await api.post('/progress', {
        caseId: c.caseId,
        stage: c.currentStatus || 'Unarchived',
        percentage: c.progressPercentage || 0,
        summary: 'Case unarchived.',
        updatedBy: user?.fullName || user?.email
      });

      toast.success('Case unarchived successfully', { id: loadingToast });
      fetchCases();
    } catch (err) {
      toast.error('Failed to unarchive case', { id: loadingToast });
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

  const fetchTimelineLogs = useCallback(async (caseId) => {
    try {
      const res = await api.get(`/timeline?caseId=${caseId}`);
      setTimelineLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch timeline logs', err);
    }
  }, []);

  const fetchProgressData = useCallback(async (caseId) => {
    try {
      const res = await api.get(`/progress?caseId=${caseId}`);
      if (res.data.logs && res.data.logs.length > 0) {
        setCaseProgressLogs(res.data.logs);
        const latest = res.data.logs[0];

        const stageOrder = ['Case Logged', 'Assigned', 'Analysis', 'Negotiation', 'Settlement', 'Closure'];
        let stage = latest.stage || 'Case Logged';

        // Auto-upgrade to Assigned if initiatedBy is a real user and we are still at Case Logged
        const isAssigned = viewCase?.initiatedBy && viewCase.initiatedBy.toLowerCase() !== 'system' && viewCase.initiatedBy.trim() !== '';
        if (stage === 'Case Logged' && isAssigned) {
          stage = 'Assigned';
        }

        const stagePercentages = {
          'Case Logged': 10,
          'Assigned': 25,
          'Analysis': 40,
          'Negotiation': 60,
          'Settlement': 85,
          'Closure': 100
        };
        const newPercentage = stagePercentages[stage] !== undefined ? stagePercentages[stage] : Math.floor((latest.percentage || 0) / 20) * 20;

        setProgressFormData(prev => ({
          ...prev,
          percentage: newPercentage,
          stage
        }));

        if (res.data.checklist && res.data.checklist.length > 0 && stage === latest.stage) {
          setChecklist(res.data.checklist);
        } else {
          setChecklist(buildChecklistForStage(stage));
        }
      } else {
        setCaseProgressLogs([]);
        setChecklist(buildChecklistForStage('Case Logged'));
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

  const getCyclesInfo = (history) => {
    const historyAsc = [...history].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const cycleStarts = [
      { cycle: 1, startTime: new Date(0) }
    ];
    let currentCycle = 1;
    historyAsc.forEach(h => {
      if (h.stage === 'New Cycle Started') {
        currentCycle++;
        cycleStarts.push({
          cycle: currentCycle,
          startTime: new Date(h.createdAt)
        });
      }
    });
    return {
      currentCycle,
      cycleStarts,
      latestStartTime: cycleStarts[cycleStarts.length - 1].startTime
    };
  };

  const getCycleNumberForItem = (item, history) => {
    if (!history || history.length === 0) return 1;
    const historyAsc = [...history]
      .filter(h => h.stage === 'New Cycle Started')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let cycle = 1;
    const itemTime = new Date(item.createdAt);
    for (let i = 0; i < historyAsc.length; i++) {
      if (itemTime >= new Date(historyAsc[i].createdAt)) {
        cycle = i + 2;
      } else {
        break;
      }
    }
    return cycle;
  };

  const getCycleFilteredData = (history, requests, cycleNum, caseId) => {
    const info = getCyclesInfo(history);
    const targetCycle = cycleNum || info.currentCycle;
    const startObj = info.cycleStarts.find(c => c.cycle === targetCycle);
    const startTime = startObj ? startObj.startTime : new Date(0);

    const nextObj = info.cycleStarts.find(c => c.cycle === targetCycle + 1);
    const endTime = nextObj ? nextObj.startTime : new Date();

    const targetCaseId = caseId || viewCase?.caseId;

    const cycleRequests = requests.filter(r =>
      r.caseId === targetCaseId &&
      new Date(r.createdAt) >= startTime &&
      new Date(r.createdAt) < endTime
    );

    const cycleHistory = history.filter(h =>
      new Date(h.createdAt) >= startTime &&
      new Date(h.createdAt) < endTime &&
      h.stage !== 'New Cycle Started'
    );

    return { cycleRequests, cycleHistory };
  };

  const getPastStageData = (stageName) => {
    const cycleNum = selectedCycleToView || getCyclesInfo(legalProcessHistory).currentCycle;
    const { cycleHistory } = getCycleFilteredData(legalProcessHistory, legalRequests, cycleNum);

    const historyItem = cycleHistory.find(h => h.stage === stageName);
    if (!historyItem) return null;

    const summaryStr = historyItem.summary || '';
    if (stageName === 'Pack & AD ready' && summaryStr.startsWith('PACK_AD_READY_JSON:')) {
      try {
        return JSON.parse(summaryStr.slice('PACK_AD_READY_JSON:'.length));
      } catch (e) {
        return null;
      }
    }
    if (stageName === 'Courier Sent' && summaryStr.startsWith('COURIER_SENT_JSON:')) {
      try {
        return JSON.parse(summaryStr.slice('COURIER_SENT_JSON:'.length));
      } catch (e) {
        return null;
      }
    }
    if (stageName === 'Reply Received' && summaryStr.startsWith('REPLY_RECEIVED_JSON:')) {
      try {
        return JSON.parse(summaryStr.slice('REPLY_RECEIVED_JSON:'.length));
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const getActiveStageOfCase = (history, requests, cycleNum) => {
    const hasCaseStudy = history.some(h => h.stage === 'Case Study');
    if (!hasCaseStudy) {
      return 'Case Study';
    }

    const { cycleRequests, cycleHistory } = getCycleFilteredData(history, requests, cycleNum);

    const hasApprovedDraft = cycleRequests.some(r => r.status === 'Approved');
    if (!hasApprovedDraft) {
      return 'Draft';
    }

    const hasPack = cycleHistory.some(h => h.stage === 'Pack & AD ready');
    if (!hasPack) {
      return 'Pack & AD ready';
    }

    const hasCourier = cycleHistory.some(h => h.stage === 'Courier Sent');
    if (!hasCourier) {
      return 'Courier Sent';
    }

    const hasReply = cycleHistory.some(h => h.stage === 'Reply Received');
    if (!hasReply) {
      return 'Reply Received';
    }

    return 'Reply Received';
  };

  const getStageStatus = (stageName, activeCaseStage, history, requests, cycleNum) => {
    const { cycleRequests, cycleHistory } = getCycleFilteredData(history, requests, cycleNum);

    const hasApprovedDraft = cycleRequests.some(r => r.status === 'Approved');
    const hasCaseStudy = history.some(h => h.stage === 'Case Study');
    const hasPack = cycleHistory.some(h => h.stage === 'Pack & AD ready');
    const hasCourier = cycleHistory.some(h => h.stage === 'Courier Sent');
    const hasReply = cycleHistory.some(h => h.stage === 'Reply Received');

    if (stageName === 'Case Study') {
      return { isCompleted: hasCaseStudy, isActive: activeCaseStage === 'Case Study' };
    }
    if (stageName === 'Draft') {
      return { isCompleted: hasApprovedDraft, isActive: activeCaseStage === 'Draft' };
    }
    if (stageName === 'Draft Approved') {
      return { isCompleted: hasApprovedDraft, isActive: false };
    }
    if (stageName === 'Pack & AD ready') {
      return { isCompleted: hasPack, isActive: activeCaseStage === 'Pack & AD ready' };
    }
    if (stageName === 'Courier Sent') {
      return { isCompleted: hasCourier, isActive: activeCaseStage === 'Courier Sent' };
    }
    if (stageName === 'Reply Received') {
      return { isCompleted: hasReply, isActive: activeCaseStage === 'Reply Received' };
    }
    return { isCompleted: false, isActive: false };
  };

  const getProgressBarWidth = (history, requests, cycleNum) => {
    const { cycleRequests, cycleHistory } = getCycleFilteredData(history, requests, cycleNum);

    const hasApprovedDraft = cycleRequests.some(r => r.status === 'Approved');
    const hasCaseStudy = history.some(h => h.stage === 'Case Study');
    const hasPack = cycleHistory.some(h => h.stage === 'Pack & AD ready');
    const hasCourier = cycleHistory.some(h => h.stage === 'Courier Sent');
    const hasReply = cycleHistory.some(h => h.stage === 'Reply Received');

    if (hasReply) return 100;
    if (hasCourier) return 80;
    if (hasPack) return 60;
    if (hasApprovedDraft) return 40;
    if (hasCaseStudy) return 20;
    return 0;
  };

  const fetchLegalProcessData = useCallback(async (caseId) => {
    if (!caseId) return;
    setIsLegalProcessLoading(true);
    setSelectedCycleToView(null);
    try {
      const [historyRes, requestsRes] = await Promise.all([
        api.get(`/legal-process?caseId=${caseId}`),
        api.get('/legal-requests')
      ]);
      const history = historyRes.data || [];
      const requests = requestsRes.data || [];
      setLegalProcessHistory(history);
      setLegalRequests(requests);

      const hasCaseStudy = history.some(h => h.stage === 'Case Study');
      let computedStage = 'Case Study';
      if (hasCaseStudy) {
        computedStage = getActiveStageOfCase(history, requests);
      }

      setLegalProcessForm({
        stage: computedStage,
        mouDocChecked: false,
        invoicesChecked: false,
        paymentReceiptChecked: false,
        caseStudyDocChecked: false,
        summary: ''
      });
    } catch (err) {
      console.error('Failed to fetch legal process data:', err);
    } finally {
      setIsLegalProcessLoading(false);
    }
  }, [viewCase]);

  const handleLegalProcessSubmit = async (e) => {
    e.preventDefault();
    if (!viewCase || isLegalProcessSubmitting) return;

    setIsLegalProcessSubmitting(true);
    const loadingToast = toast.loading('Submitting Legal Process stage...');
    try {
      let finalSummary = legalProcessForm.summary;
      if (legalProcessForm.stage === 'Pack & AD ready') {
        const data = {
          receiverName: packReceiverName,
          receiverAddress: packReceiverAddress,
          preparedBy: user?.fullName || user?.email || '',
          companyAddress: packCompanyAddress,
          remark: packRemark
        };
        finalSummary = `PACK_AD_READY_JSON:${JSON.stringify(data)}`;
      } else if (legalProcessForm.stage === 'Courier Sent') {
        const data = {
          dateTime: courierDateTime,
          senderName: courierSenderName,
          documentName: courierDocName,
          senderCompany: courierSenderCompany
        };
        finalSummary = `COURIER_SENT_JSON:${JSON.stringify(data)}`;
      } else if (legalProcessForm.stage === 'Reply Received') {
        const data = {
          replyDate: replyDate,
          repliedBy: repliedBy,
          replyFileLink: replyFileLink,
          remark: replyRemark
        };
        finalSummary = `REPLY_RECEIVED_JSON:${JSON.stringify(data)}`;
      }

      const payload = {
        caseId: viewCase.caseId,
        stage: legalProcessForm.stage,
        mouDocChecked: legalProcessForm.stage === 'Case Study' ? legalProcessForm.mouDocChecked : false,
        invoicesChecked: legalProcessForm.stage === 'Case Study' ? legalProcessForm.invoicesChecked : false,
        paymentReceiptChecked: legalProcessForm.stage === 'Case Study' ? legalProcessForm.paymentReceiptChecked : false,
        caseStudyDocChecked: legalProcessForm.stage === 'Case Study' ? legalProcessForm.caseStudyDocChecked : false,
        summary: finalSummary
      };

      await api.post('/legal-process', payload);
      toast.success(`Stage "${legalProcessForm.stage}" submitted successfully!`, { id: loadingToast });

      // Clear inputs
      setPackReceiverName('');
      setPackReceiverAddress('');
      setPackCompanyAddress('');
      setPackRemark('');

      setCourierDateTime('');
      setCourierSenderName('');
      setCourierDocName('');
      setCourierSenderCompany('');

      setReplyDate('');
      setRepliedBy('');
      setReplyFileLink('');
      setReplyRemark('');

      // Refresh timeline/history logs
      fetchLegalProcessData(viewCase.caseId);

      // Clear summary field
      setLegalProcessForm(prev => ({
        ...prev,
        summary: ''
      }));
    } catch (err) {
      console.error('Failed to submit legal process:', err);
      toast.error(err.response?.data?.error || 'Failed to submit legal process update', { id: loadingToast });
    } finally {
      setIsLegalProcessSubmitting(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingHistoryItem(item);
    setEditFormStage(item.stage);

    if (item.isRequest) {
      setEditFormPayload({
        documentName: item.documentName || '',
        remark: item.remark || '',
        fileLink: item.fileLink || ''
      });
    } else {
      if (item.stage === 'Case Study') {
        setEditFormPayload({
          mouDocChecked: !!item.mouDocChecked,
          invoicesChecked: !!item.invoicesChecked,
          paymentReceiptChecked: !!item.paymentReceiptChecked,
          caseStudyDocChecked: !!item.caseStudyDocChecked,
          summary: item.summary || ''
        });
      } else if (item.stage === 'Pack & AD ready') {
        let parsed = {};
        if (item.summary?.startsWith('PACK_AD_READY_JSON:')) {
          try { parsed = JSON.parse(item.summary.replace('PACK_AD_READY_JSON:', '')); } catch (e) { }
        }
        setEditFormPayload({
          receiverName: parsed.receiverName || '',
          receiverAddress: parsed.receiverAddress || '',
          companyAddress: parsed.companyAddress || '',
          remark: parsed.remark || ''
        });
      } else if (item.stage === 'Courier Sent') {
        let parsed = {};
        if (item.summary?.startsWith('COURIER_SENT_JSON:')) {
          try { parsed = JSON.parse(item.summary.replace('COURIER_SENT_JSON:', '')); } catch (e) { }
        }
        setEditFormPayload({
          dateTime: parsed.dateTime || '',
          senderName: parsed.senderName || '',
          documentName: parsed.documentName || '',
          senderCompany: parsed.senderCompany || ''
        });
      } else if (item.stage === 'Reply Received') {
        let parsed = {};
        if (item.summary?.startsWith('REPLY_RECEIVED_JSON:')) {
          try { parsed = JSON.parse(item.summary.replace('REPLY_RECEIVED_JSON:', '')); } catch (e) { }
        }
        setEditFormPayload({
          replyDate: parsed.replyDate || '',
          repliedBy: parsed.repliedBy || '',
          remark: parsed.remark || '',
          replyFileLink: parsed.replyFileLink || ''
        });
      } else {
        setEditFormPayload({
          summary: item.summary || ''
        });
      }
    }
  };

  const handleEditDraftUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditFormUploading(true);
    const loadingToast = toast.loading('Uploading document...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || 'https://serenity.herosite.pro/~fmojnedg/uploads/upload.php';
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const uploadData = await res.json();
      if (uploadData && uploadData.success && uploadData.url) {
        setEditFormPayload(prev => ({ ...prev, fileLink: uploadData.url }));
        toast.success('Document uploaded successfully', { id: loadingToast });
      } else {
        throw new Error(uploadData?.error || 'No URL returned');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload document', { id: loadingToast });
    } finally {
      setEditFormUploading(false);
    }
  };

  const handleEditReplyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditFormUploading(true);
    const loadingToast = toast.loading('Uploading reply document...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || 'https://serenity.herosite.pro/~fmojnedg/uploads/upload.php';
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const uploadData = await res.json();
      if (uploadData && uploadData.success && uploadData.url) {
        setEditFormPayload(prev => ({ ...prev, replyFileLink: uploadData.url }));
        toast.success('Reply document uploaded successfully', { id: loadingToast });
      } else {
        throw new Error(uploadData?.error || 'No URL returned');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload reply document', { id: loadingToast });
    } finally {
      setEditFormUploading(false);
    }
  };


  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingHistoryItem) return;
    const isRequest = editingHistoryItem.isRequest;
    const dbId = editingHistoryItem.id.replace('request-', '').replace('history-', '');
    const loadingToast = toast.loading('Saving updates...');
    try {
      if (isRequest) {
        const payload = {
          documentName: editFormPayload.documentName,
          fileLink: editFormPayload.fileLink,
          remark: editFormPayload.remark
        };
        await api.put(`/legal-requests/${dbId}`, payload);
      } else {
        let finalSummary = editFormPayload.summary;
        if (editFormStage === 'Pack & AD ready') {
          finalSummary = `PACK_AD_READY_JSON:${JSON.stringify({
            receiverName: editFormPayload.receiverName,
            receiverAddress: editFormPayload.receiverAddress,
            preparedBy: user?.fullName || user?.email || '',
            companyAddress: editFormPayload.companyAddress,
            remark: editFormPayload.remark
          })}`;
        } else if (editFormStage === 'Courier Sent') {
          finalSummary = `COURIER_SENT_JSON:${JSON.stringify({
            dateTime: editFormPayload.dateTime,
            senderName: editFormPayload.senderName,
            documentName: editFormPayload.documentName,
            senderCompany: editFormPayload.senderCompany
          })}`;
        } else if (editFormStage === 'Reply Received') {
          finalSummary = `REPLY_RECEIVED_JSON:${JSON.stringify({
            replyDate: editFormPayload.replyDate,
            repliedBy: editFormPayload.repliedBy,
            replyFileLink: editFormPayload.replyFileLink,
            remark: editFormPayload.remark
          })}`;
        }

        const payload = {
          mouDocChecked: editFormStage === 'Case Study' ? !!editFormPayload.mouDocChecked : false,
          invoicesChecked: editFormStage === 'Case Study' ? !!editFormPayload.invoicesChecked : false,
          paymentReceiptChecked: editFormStage === 'Case Study' ? !!editFormPayload.paymentReceiptChecked : false,
          caseStudyDocChecked: editFormStage === 'Case Study' ? !!editFormPayload.caseStudyDocChecked : false,
          summary: finalSummary
        };
        await api.put(`/legal-process/${dbId}`, payload);
      }

      toast.success('Stage details updated successfully!', { id: loadingToast });
      setEditingHistoryItem(null);
      fetchLegalProcessData(viewCase.caseId);
      fetchLegalRequests();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save updates', { id: loadingToast });
    }
  };

  useEffect(() => {
    if (viewCase) {
      if (activeDetailTab === 'Communications') fetchCaseComms(viewCase.caseId);
      if (activeDetailTab === 'Documents') fetchCaseDocs(viewCase.caseId);
      fetchProgressData(viewCase.caseId);
      if (activeDetailTab === 'History') {
        fetchTimelineLogs(viewCase.caseId);
        fetchCaseDocs(viewCase.caseId);
        fetchLegalProcessData(viewCase.caseId);
        fetchLegalRequests();
      }
      if (activeDetailTab === 'Legal Process') {
        fetchLegalProcessData(viewCase.caseId);
        fetchLegalRequests();
      }
    }
  }, [viewCase, activeDetailTab, fetchCaseComms, fetchCaseDocs, fetchProgressData, fetchTimelineLogs, fetchLegalProcessData, fetchLegalRequests]);

  const handleStartEditComm = (comm) => {
    setEditingComm(comm);
    setCommFormData({
      direction: comm.direction || 'Incoming',
      mode: comm.mode || 'Call',
      fromTo: comm.fromTo || '',
      summary: comm.summary || '',
      exactDemand: comm.exactDemand || '',
      refundDemanded: comm.refundDemanded || '0',
      legalThreat: comm.legalThreat || 'No',
      smMentioned: comm.smMentioned || 'No',
      fileLink: comm.fileLink || '',
      dateTime: comm.dateTime ? new Date(comm.dateTime).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16)
    });
    const formElement = document.querySelector('.flex-1.overflow-auto') || window;
    formElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEditDoc = (doc) => {
    setEditingDoc(doc);
    const standardTypes = ['Legal Notice', 'Payment Receipt', 'MOU/Agreement', 'Complaint Copy', 'Refund Proof'];
    const isOther = !standardTypes.includes(doc.docType);
    let signatory = '';
    if (doc.fileSummary && doc.fileSummary.includes(' - ')) {
      const parts = doc.fileSummary.split(' - ');
      signatory = parts.slice(1).join(' - ');
    }
    setMouFormData({
      mouType: isOther ? 'Other' : doc.docType,
      otherType: isOther ? doc.docType : '',
      mouDate: doc.docDate ? doc.docDate.substring(0, 10) : '',
      signatoryName: signatory,
      remarks: doc.remarks || '',
      fileLink: doc.fileLink || ''
    });
    const formElement = document.querySelector('.flex-1.overflow-auto') || window;
    formElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDocument = async (id) => {
    const isConfirmed = await confirmDelete('Delete Document?', 'Are you sure you want to delete this document? This action cannot be undone.');
    if (!isConfirmed) return;
    const loadingToast = toast.loading('Deleting document...');
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted successfully', { id: loadingToast });
      setCaseDocs(prev => prev.filter(d => (d.id || d._id) !== id));
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete document', { id: loadingToast });
    }
  };

  const handleDeleteComm = async (id) => {
    const isConfirmed = await confirmDelete('Delete Communication?', 'Are you sure you want to delete this communication log? This action cannot be undone.');
    if (!isConfirmed) return;
    const loadingToast = toast.loading('Deleting communication...');
    try {
      await api.delete(`/communications/${id}`);
      toast.success('Communication deleted successfully', { id: loadingToast });
      setCaseComms(prev => prev.filter(c => (c.id || c._id) !== id));
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete communication', { id: loadingToast });
    }
  };

  const handleStartEditProgress = (log) => {
    setEditingProgress(log);
    setProgressFormData({
      stage: log.stage || 'Case Logged',
      percentage: log.percentage || 20,
      summary: log.summary || '',
      nextAction: log.nextAction || '',
      blockers: log.blockers || '',
      compliancePending: viewCase.compliancePending || false,
      followUpDate: log.followUpDate ? log.followUpDate.substring(0, 10) : '',
      escalateTo: log.escalateTo || '',
      refundedAmount: log.refundedAmount || '',
      savedAmount: log.savedAmount || '',
      attachment: log.attachment || ''
    });
    const formElement = document.querySelector('.flex-1.overflow-auto') || window;
    formElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!progressFormData.summary) return toast.error('Update summary is required');

    const refAmt = Number(viewCase.refundedAmount) || 0;
    const totAmt = Number(viewCase.totalAmtPaid) || 0;
    const computedSavedAmount = Math.max(0, totAmt - refAmt);

    if (isSubmitting) return;
    setIsSubmitting(true);

    const adjustedProgressFormData = {
      ...progressFormData,
      savedAmount: progressFormData.stage === 'Closure' ? computedSavedAmount : ''
    };

    const loadingToast = toast.loading(editingProgress ? 'Updating progress...' : 'Saving progress update...');
    try {
      if (editingProgress) {
        await api.put(`/progress/${viewCase.caseId}/update/${editingProgress.id || editingProgress._id}`, adjustedProgressFormData);
        toast.success('Progress updated', { id: loadingToast });
        setEditingProgress(null);
      } else {
        await api.post('/progress', {
          ...adjustedProgressFormData,
          stage: progressFormData.stage, // Explicitly send the derived stage
          caseId: viewCase.caseId,
          updatedBy: user?.fullName || user?.email,
          checklist // Include current checklist state
        });
        const caseUpdatePayload = {
          currentStatus: progressFormData.stage,
          progressPercentage: progressFormData.percentage,
          savedAmount: adjustedProgressFormData.savedAmount !== '' ? Number(adjustedProgressFormData.savedAmount) : undefined,
          compliancePending: adjustedProgressFormData.compliancePending
        };

        if (progressFormData.escalateTo) {
          caseUpdatePayload.assignedTo = progressFormData.escalateTo;
        }

        // Update case status in DB
        await api.put(`/cases/${viewCase.caseId}`, caseUpdatePayload);

        toast.success('Progress updated', { id: loadingToast });
        try {
          const channel = new BroadcastChannel('case_updates');
          channel.postMessage({ type: 'CASE_PROGRESS_UPDATED' });
          channel.close();
        } catch (e) { }

        // Update local viewCase to reflect new status/percentage/assignee
        const updatedCase = {
          ...viewCase,
          currentStatus: progressFormData.stage,
          progressPercentage: progressFormData.percentage,
          savedAmount: adjustedProgressFormData.savedAmount !== '' ? Number(adjustedProgressFormData.savedAmount) : viewCase.savedAmount,
          compliancePending: adjustedProgressFormData.compliancePending
        };
        if (progressFormData.escalateTo) {
          updatedCase.assignedTo = progressFormData.escalateTo;
        }
        setViewCase(updatedCase);

        // If progress stage is Closure, mark closureReady so the Resolve button can be shown
        if (progressFormData.stage === 'Closure') {
          setClosureReady(true);
        }
      }

      setProgressFormData({
        stage: 'Case Logged',
        percentage: 20,
        summary: '',
        nextAction: '',
        blockers: '',
        compliancePending: false,
        followUpDate: '',
        escalateTo: '',
        refundedAmount: '',
        savedAmount: '',
        attachment: ''
      });
      fetchProgressData(viewCase.caseId);
      fetchCases(); // Refresh global list
    } catch (err) {
      toast.error(editingProgress ? 'Failed to update progress log' : 'Failed to update progress', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommSubmit = async (e) => {
    e.preventDefault();
    if (!commFormData.summary) return toast.error('Summary is required');
    if (isSubmitting) return;
    setIsSubmitting(true);

    const loadingToast = toast.loading(editingComm ? 'Updating communication...' : 'Logging communication...');
    try {
      if (editingComm) {
        await api.put(`/communications/${editingComm.id || editingComm._id}`, {
          ...commFormData
        });
        toast.success('Communication updated', { id: loadingToast });
        setEditingComm(null);
      } else {
        await api.post('/communications', {
          ...commFormData,
          caseId: viewCase.caseId,
          loggedBy: user?.fullName || user?.email
        });
        toast.success('Communication logged', { id: loadingToast });
      }
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
      toast.error(editingComm ? 'Failed to update communication' : 'Failed to log communication', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!docFormData.summary) return toast.error('Description is required');
    if (isSubmitting) return;
    setIsSubmitting(true);

    const loadingToast = toast.loading('Indexing document...');
    try {
      await api.post('/documents', {
        ...docFormData,
        caseId: viewCase.caseId,
        fileSummary: docFormData.summary,
        uploadedBy: user?.fullName || user?.email,
        uploadDate: new Date().toISOString(),
        sourceForm: 'Manual Upload'
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMouSubmit = async (e) => {
    e.preventDefault();
    if (!mouFormData.fileLink) return toast.error('MOU file is required');

    const finalDocType = mouFormData.mouType === 'Other' ? mouFormData.otherType : mouFormData.mouType;
    if (mouFormData.mouType === 'Other' && !mouFormData.otherType) return toast.error('Please specify the document type');

    const loadingToast = toast.loading(editingDoc ? 'Updating document...' : 'Uploading MOU...');
    try {
      if (editingDoc) {
        await api.put(`/documents/${editingDoc.id || editingDoc._id}`, {
          docType: finalDocType,
          docDate: mouFormData.mouDate,
          fileSummary: `${finalDocType} - ${mouFormData.signatoryName}`,
          fileLink: mouFormData.fileLink,
          remarks: mouFormData.remarks
        });
        toast.success('Document updated successfully', { id: loadingToast });
        setEditingDoc(null);
      } else {
        await api.post('/documents', {
          caseId: viewCase.caseId,
          docType: finalDocType,
          docDate: mouFormData.mouDate,
          fileSummary: `${finalDocType} - ${mouFormData.signatoryName}`,
          fileLink: mouFormData.fileLink,
          remarks: mouFormData.remarks,
          uploadedBy: user?.email || 'System',
          uploadDate: new Date().toISOString(),
          sourceForm: 'MOU Upload'
        });
        toast.success('uploaded successfully', { id: loadingToast });
      }
      setMouFormData({
        mouType: 'Legal Notice',
        otherType: '',
        mouDate: '',
        signatoryName: '',
        remarks: '',
        fileLink: ''
      });
      setMouUploadKey(prev => prev + 1);
      fetchCaseDocs(viewCase.caseId);
    } catch (err) {
      toast.error(editingDoc ? 'Failed to update document' : 'Failed to upload MOU', { id: loadingToast });
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
      fetchTimelineLogs(viewCase.caseId);
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
          docDate: emailFormData.emailDate,
          fileSummary: `Email: ${emailFormData.subject}`,
          fileLink: emailFormData.emailFileLink,
          remarks: `Email Date: ${emailFormData.emailDate}`,
          uploadedBy: user?.email || 'System',
          uploadDate: new Date().toISOString(),
          sourceForm: 'Email Upload'
        });
      }

      if (emailFormData.otherDocsLink) {
        await api.post('/documents', {
          caseId: viewCase.caseId,
          docType: 'Others',
          docDate: emailFormData.emailDate,
          fileSummary: `Supporting Docs for Email: ${emailFormData.subject}`,
          fileLink: emailFormData.otherDocsLink,
          remarks: `Related to email dated ${emailFormData.emailDate}`,
          uploadedBy: user?.email || 'System',
          uploadDate: new Date().toISOString(),
          sourceForm: 'Email Upload'
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
      try {
        const channel = new BroadcastChannel('case_updates');
        channel.postMessage({ type: 'CASE_PROGRESS_UPDATED' });
        channel.close();
      } catch (e) { }
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
      try {
        const channel = new BroadcastChannel('case_updates');
        channel.postMessage({ type: 'CASE_PROGRESS_UPDATED' });
        channel.close();
      } catch (e) { }
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

  const combinedHistory = (() => {
    const cycleNum = selectedCycleToView || getCyclesInfo(legalProcessHistory).currentCycle;
    const { cycleRequests, cycleHistory } = getCycleFilteredData(legalProcessHistory, legalRequests, cycleNum);

    const formattedRequests = cycleRequests.map(r => ({
      id: `request-${r.id || r._id}`,
      isRequest: true,
      createdAt: r.createdAt,
      stage: 'Draft Request',
      documentName: r.documentName,
      remark: r.remark,
      fileLink: r.fileLink,
      status: r.status,
      rejectRemark: r.rejectRemark,
      submittedBy: r.requestedByName || r.requestedBy
    }));

    const formattedStageHistory = cycleHistory
      .filter(h => !['Draft', 'Draft Approved', 'Draft Rejected'].includes(h.stage))
      .map(h => ({
        id: `history-${h.id || h._id}`,
        isRequest: false,
        createdAt: h.createdAt,
        stage: h.stage,
        summary: h.summary,
        submittedBy: h.submittedBy,
        mouDocChecked: h.mouDocChecked,
        invoicesChecked: h.invoicesChecked,
        paymentReceiptChecked: h.paymentReceiptChecked,
        caseStudyDocChecked: h.caseStudyDocChecked
      }));

    return [...formattedRequests, ...formattedStageHistory].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  })();

  return (
    <div className="section active w-full min-h-full bg-bg-primary pb-32">
      {!viewCase && (
        <>
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 bg-bg-secondary p-6 rounded-2xl shadow-sm border border-border">
            <div>
              <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">{isArchiveMode ? 'Archived Cases' : 'My Cases'}</h2>

            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 mt-4 md:mt-0 w-full md:w-auto">
              {!isArchiveMode && (user?.role === 'Admin' || user?.role === 'Super Admin') && (
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

              {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
                <div className="relative overflow-hidden cursor-pointer flex-1 sm:flex-none">
                  <button onClick={handleExportExcel} className="w-full bg-bg-card hover:bg-bg-input text-text-primary border-2 border-border font-black py-2.5 px-4 md:px-6 rounded-2xl shadow-sm text-[10px] md:text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95">
                    <FileDown size={16} /> Export
                  </button>
                </div>
              )}
              {!isArchiveMode && user?.role !== 'Legal' && (
                <div className="relative overflow-hidden cursor-pointer flex-1 sm:flex-none">
                  <button
                    onClick={() => navigate('/new-case')}
                    className="w-full bg-accent text-white font-black py-2.5 px-4 md:px-6 rounded-2xl shadow-sm text-[10px] md:text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-accent-hover active:scale-95"
                  >
                    <Plus size={16} /> New Case
                  </button>
                </div>
              )}
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
                className={`flex items-center gap-2 px-6 py-3 border-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 ${isFilterOpen || !appliedFilters.status.includes('All Status') || !appliedFilters.priority.includes('All Priority') || !appliedFilters.assignee.includes('All Assignees') || appliedFilters.date || (appliedFilters.refundStatus && !appliedFilters.refundStatus.includes('All Refunds')) || (appliedFilters.city && !appliedFilters.city.includes('All Cities')) || appliedFilters.caseNumbers || (appliedFilters.selectedCaseNumbers && appliedFilters.selectedCaseNumbers.length > 0)
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-bg-card text-text-secondary border-border hover:bg-bg-card-hover'
                  }`}
              >
                <Filter size={16} />
                Filters
                {(!appliedFilters.status.includes('All Status') || !appliedFilters.priority.includes('All Priority') || !appliedFilters.assignee.includes('All Assignees') || !appliedFilters.typeOfComplaint.includes('All Types') || appliedFilters.date || (appliedFilters.state && !appliedFilters.state.includes('All States')) || (appliedFilters.refundStatus && !appliedFilters.refundStatus.includes('All Refunds')) || appliedFilters.sourceOfComplaint || appliedFilters.serviceMode || appliedFilters.serviceName || (appliedFilters.city && !appliedFilters.city.includes('All Cities')) || appliedFilters.lastPaymentStart || appliedFilters.lastPaymentEnd || appliedFilters.amountSort || appliedFilters.caseNumbers || (appliedFilters.selectedCaseNumbers && appliedFilters.selectedCaseNumbers.length > 0) || (appliedFilters.customFilters && Object.values(appliedFilters.customFilters).some(v => v))) && (
                  <span className="bg-white text-accent rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                    {[!appliedFilters.status.includes('All Status'), !appliedFilters.priority.includes('All Priority'), !appliedFilters.assignee.includes('All Assignees'), !appliedFilters.typeOfComplaint.includes('All Types'), !!appliedFilters.date, appliedFilters.state && !appliedFilters.state.includes('All States'), appliedFilters.refundStatus && !appliedFilters.refundStatus.includes('All Refunds'), !!appliedFilters.sourceOfComplaint, !!appliedFilters.serviceMode, !!appliedFilters.serviceName, (appliedFilters.city && !appliedFilters.city.includes('All Cities')), !!appliedFilters.lastPaymentStart, !!appliedFilters.lastPaymentEnd, !!appliedFilters.amountSort, !!appliedFilters.caseNumbers, (appliedFilters.selectedCaseNumbers && appliedFilters.selectedCaseNumbers.length > 0), appliedFilters.customFilters && Object.values(appliedFilters.customFilters).some(v => v)].filter(Boolean).length}
                  </span>
                )}
              </button>

              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:bg-black/40 md:backdrop-blur-none" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="fixed md:absolute top-24 md:top-full left-4 right-4 md:left-auto md:right-0 mt-3 md:w-[450px] h-[500px] bg-bg-card rounded-2xl shadow-2xl border-2 border-border z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-1 min-h-0 overflow-hidden">
                      {/* Left Sidebar */}
                      <div className="w-[100px] md:w-1/3 bg-bg-secondary border-r border-border py-4 overflow-y-auto h-full">
                        {['Status', 'Priority', 'Assignees', 'Type', 'Amount', 'Date', 'State', 'Refund', 'Source', 'Service', 'City', 'Last Payment', 'Ack/Grievance/FIR', 'Custom'].map((type) => (
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
                      <div className="w-2/3 p-6 overflow-y-auto h-full bg-bg-card">
                        {activeFilterType === 'Status' && (
                          <div className="space-y-3">
                            {uniqueStatuses.map((s) => {
                              const isChecked = tempFilters.status.includes(s);
                              return (
                                <label key={s} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                  <input
                                    type="checkbox"
                                    name="status"
                                    checked={isChecked}
                                    onChange={() => {
                                      setTempFilters(prev => {
                                        let newStatus;
                                        if (s === 'All Status') {
                                          newStatus = ['All Status'];
                                        } else {
                                          const filtered = prev.status.filter(item => item !== 'All Status');
                                          if (isChecked) {
                                            newStatus = filtered.filter(item => item !== s);
                                            if (newStatus.length === 0) newStatus = ['All Status'];
                                          } else {
                                            newStatus = [...filtered, s];
                                          }
                                        }
                                        return { ...prev, status: newStatus };
                                      });
                                    }}
                                    className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                                  />
                                  <span className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{s}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {activeFilterType === 'Priority' && (
                          <div className="space-y-3">
                            {uniquePriorities.map((p) => {
                              const isChecked = tempFilters.priority.some(val => val.toLowerCase() === p.toLowerCase());
                              return (
                                <label key={p} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                  <input
                                    type="checkbox"
                                    name="priority"
                                    checked={isChecked}
                                    onChange={() => {
                                      setTempFilters(prev => {
                                        let newPriority;
                                        if (p === 'All Priority') {
                                          newPriority = ['All Priority'];
                                        } else {
                                          const filtered = prev.priority.filter(item => item.toLowerCase() !== 'all priority');
                                          const exists = filtered.some(item => item.toLowerCase() === p.toLowerCase());
                                          if (exists) {
                                            newPriority = filtered.filter(item => item.toLowerCase() !== p.toLowerCase());
                                            if (newPriority.length === 0) newPriority = ['All Priority'];
                                          } else {
                                            newPriority = [...filtered, p];
                                          }
                                        }
                                        return { ...prev, priority: newPriority };
                                      });
                                    }}
                                    className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                                  />
                                  <span className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{p}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {activeFilterType === 'Assignees' && (
                          <div className="space-y-3">
                            <label className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                              <input
                                type="checkbox"
                                name="assignee"
                                checked={tempFilters.assignee.some(val => val.toLowerCase() === 'all assignees')}
                                onChange={() => {
                                  setTempFilters(prev => ({ ...prev, assignee: ['All Assignees'] }));
                                }}
                                className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                              />
                              <span className={`text-sm font-bold ${tempFilters.assignee.some(val => val.toLowerCase() === 'all assignees') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>All Assignees</span>
                            </label>
                            {uniqueAssignees.filter(a => a !== 'All Assignees').map((assigneeName) => {
                              const isChecked = tempFilters.assignee.some(val => val.toLowerCase() === assigneeName.toLowerCase());
                              return (
                                <label key={assigneeName} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                  <input
                                    type="checkbox"
                                    name="assignee"
                                    checked={isChecked}
                                    onChange={() => {
                                      setTempFilters(prev => {
                                        let newAssignee;
                                        const filtered = prev.assignee.filter(item => item.toLowerCase() !== 'all assignees');
                                        const exists = filtered.some(item => item.toLowerCase() === assigneeName.toLowerCase());
                                        if (exists) {
                                          newAssignee = filtered.filter(item => item.toLowerCase() !== assigneeName.toLowerCase());
                                          if (newAssignee.length === 0) newAssignee = ['All Assignees'];
                                        } else {
                                          newAssignee = [...filtered, assigneeName];
                                        }
                                        return { ...prev, assignee: newAssignee };
                                      });
                                    }}
                                    className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                                  />
                                  <span className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{assigneeName}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {activeFilterType === 'Type' && (
                          <div className="space-y-3">
                            {uniqueTypes.map((t) => {
                              const isChecked = tempFilters.typeOfComplaint.some(val => val.toLowerCase() === t.toLowerCase());
                              return (
                                <label key={t} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                  <input
                                    type="checkbox"
                                    name="typeOfComplaint"
                                    checked={isChecked}
                                    onChange={() => {
                                      setTempFilters(prev => {
                                        let newType;
                                        if (t === 'All Types') {
                                          newType = ['All Types'];
                                        } else {
                                          const filtered = prev.typeOfComplaint.filter(item => item.toLowerCase() !== 'all types');
                                          const exists = filtered.some(item => item.toLowerCase() === t.toLowerCase());
                                          if (exists) {
                                            newType = filtered.filter(item => item.toLowerCase() !== t.toLowerCase());
                                            if (newType.length === 0) newType = ['All Types'];
                                          } else {
                                            newType = [...filtered, t];
                                          }
                                        }
                                        return { ...prev, typeOfComplaint: newType };
                                      });
                                    }}
                                    className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                                  />
                                  <span className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{t}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {activeFilterType === 'Amount' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="block text-[11px] font-black text-text-muted uppercase tracking-[0.1em] mb-2 font-mono">Sort Cases By Total Amount Paid</label>
                            <div className="space-y-3">
                              {[
                                { label: 'Ascending (Low to High)', value: 'asc' },
                                { label: 'Descending (High to Low)', value: 'desc' }
                              ].map((option) => {
                                const isChecked = (tempFilters.amountSort || '') === option.value;
                                return (
                                  <label key={option.value} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                    <input
                                      type="radio"
                                      name="amountSort"
                                      checked={isChecked}
                                      onChange={() => {
                                        setTempFilters(prev => ({ ...prev, amountSort: option.value }));
                                      }}
                                      className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded-full"
                                    />
                                    <span className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                      {option.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {activeFilterType === 'Date' && (
                          <div className="calendar-container dark-calendar">
                            <style>{`
                              .react-calendar__tile--active {
                                 /* Tailwind orange-500 */
                                color: #000000 !important;
                                font-weight: 900 !important;
                              }
                              .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus {
                                background: #ea580c !important; /* Tailwind orange-600 */
                                color: #000000 !important;
                              }
                              .has-cases {
                                font-weight: 800 !important;
                              }
                            `}</style>
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

                        {activeFilterType === 'Source' && (
                          <div className="space-y-3">
                            <label className="block text-sm font-bold text-text-secondary">Source of Complaint</label>
                            <select
                              value={tempFilters.sourceOfComplaint}
                              onChange={(e) => {
                                const value = e.target.value;
                                setTempFilters(prev => ({ ...prev, sourceOfComplaint: value }));
                                setAppliedFilters(prev => ({ ...prev, sourceOfComplaint: value }));
                              }}
                              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg-input text-text-primary focus:outline-none focus:border-accent transition-all"
                            >
                              <option value="">All Sources</option>
                              {sourceOptions.map((source) => (
                                <option key={source} value={source}>{source}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {activeFilterType === 'Service' && (
                          <div className="space-y-4">
                            <label className="block text-sm font-bold text-text-secondary">Service Mode</label>
                            <div className="flex gap-3">
                              {['Single Service', 'Multiple Service'].map((mode) => {
                                const isSelected = tempFilters.serviceMode === mode;
                                return (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                      setTempFilters(prev => ({ ...prev, serviceMode: mode }));
                                      setAppliedFilters(prev => ({ ...prev, serviceMode: mode }));
                                    }}
                                    className={`w-full py-2 px-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-accent text-white' : 'bg-bg-input text-text-secondary hover:bg-bg-card'}`}
                                  >
                                    {mode.replace(' Service', '')}
                                  </button>
                                );
                              })}
                            </div>
                            {/* <label className="block text-sm font-bold text-text-secondary">Service Name</label> */}
                            {/* <input
                              type="text"
                              placeholder="Enter service name"
                              value={tempFilters.serviceName}
                              onChange={(e) => setTempFilters(prev => ({ ...prev, serviceName: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-all"
                            /> */}
                          </div>
                        )}

                        {activeFilterType === 'City' && (
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
                            <label className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                              <input
                                type="checkbox"
                                name="city"
                                checked={tempFilters.city.includes('All Cities')}
                                onChange={() => {
                                  setTempFilters(prev => ({ ...prev, city: ['All Cities'] }));
                                }}
                                className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                              />
                              <span className={`text-sm font-bold ${tempFilters.city.includes('All Cities') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>All Cities</span>
                            </label>
                            <label className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                              <input
                                type="checkbox"
                                name="city"
                                checked={tempFilters.city.includes('Blank')}
                                onChange={() => {
                                  setTempFilters(prev => {
                                    let newCity;
                                    const filtered = prev.city.filter(item => item !== 'All Cities');
                                    if (prev.city.includes('Blank')) {
                                      newCity = filtered.filter(item => item !== 'Blank');
                                      if (newCity.length === 0) newCity = ['All Cities'];
                                    } else {
                                      newCity = [...filtered, 'Blank'];
                                    }
                                    return { ...prev, city: newCity };
                                  });
                                }}
                                className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                              />
                              <span className={`text-sm font-bold ${tempFilters.city.includes('Blank') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>Blank</span>
                            </label>
                            {uniqueCities.filter(c => c !== 'All Cities' && c !== 'Blank').map((ct) => {
                              const isChecked = tempFilters.city.includes(ct);
                              return (
                                <label key={ct} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                  <input
                                    type="checkbox"
                                    name="city"
                                    checked={isChecked}
                                    onChange={() => {
                                      setTempFilters(prev => {
                                        let newCity;
                                        const filtered = prev.city.filter(item => item !== 'All Cities');
                                        if (isChecked) {
                                          newCity = filtered.filter(item => item !== ct);
                                          if (newCity.length === 0) newCity = ['All Cities'];
                                        } else {
                                          newCity = [...filtered, ct];
                                        }
                                        return { ...prev, city: newCity };
                                      });
                                    }}
                                    className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                                  />
                                  <span className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{ct}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {activeFilterType === 'Last Payment' && (
                          <div className="space-y-4">
                            <label className="block text-sm font-bold text-text-secondary">Last Payment Start</label>
                            <input
                              type="date"
                              value={tempFilters.lastPaymentStart}
                              onChange={(e) => setTempFilters(prev => ({ ...prev, lastPaymentStart: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg-input text-text-primary focus:outline-none focus:border-accent transition-all"
                            />
                            <label className="block text-sm font-bold text-text-secondary">Last Payment End</label>
                            <input
                              type="date"
                              value={tempFilters.lastPaymentEnd}
                              onChange={(e) => setTempFilters(prev => ({ ...prev, lastPaymentEnd: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg-input text-text-primary focus:outline-none focus:border-accent transition-all"
                            />
                          </div>
                        )}

                        {activeFilterType === 'State' && (
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
                            <label className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                              <input
                                type="checkbox"
                                name="state"
                                checked={tempFilters.state.includes('All States')}
                                onChange={() => {
                                  setTempFilters(prev => ({ ...prev, state: ['All States'] }));
                                }}
                                className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                              />
                              <span className={`text-sm font-bold ${tempFilters.state.includes('All States') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>All States</span>
                            </label>
                            <label className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                              <input
                                type="checkbox"
                                name="state"
                                checked={tempFilters.state.includes('Blank')}
                                onChange={() => {
                                  setTempFilters(prev => {
                                    let newState;
                                    const filtered = prev.state.filter(item => item !== 'All States');
                                    if (prev.state.includes('Blank')) {
                                      newState = filtered.filter(item => item !== 'Blank');
                                      if (newState.length === 0) newState = ['All States'];
                                    } else {
                                      newState = [...filtered, 'Blank'];
                                    }
                                    return { ...prev, state: newState };
                                  });
                                }}
                                className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                              />
                              <span className={`text-sm font-bold ${tempFilters.state.includes('Blank') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>Blank</span>
                            </label>
                            {uniqueStates.filter(s => s !== 'All States' && s !== 'Blank').map((st) => {
                              const isChecked = tempFilters.state.includes(st);
                              return (
                                <label key={st} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                  <input
                                    type="checkbox"
                                    name="state"
                                    checked={isChecked}
                                    onChange={() => {
                                      setTempFilters(prev => {
                                        let newState;
                                        const filtered = prev.state.filter(item => item !== 'All States');
                                        if (isChecked) {
                                          newState = filtered.filter(item => item !== st);
                                          if (newState.length === 0) newState = ['All States'];
                                        } else {
                                          newState = [...filtered, st];
                                        }
                                        return { ...prev, state: newState };
                                      });
                                    }}
                                    className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                                  />
                                  <span className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{st}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {activeFilterType === 'Refund' && (
                          <div className="space-y-3">
                            {uniqueRefundStatuses.map((ref) => {
                              const isChecked = tempFilters.refundStatus?.includes(ref);
                              return (
                                <label key={ref} className="flex items-center gap-4 p-3 hover:bg-bg-input rounded-2xl cursor-pointer group transition-all">
                                  <input
                                    type="checkbox"
                                    name="refundStatus"
                                    checked={isChecked}
                                    onChange={() => {
                                      setTempFilters(prev => {
                                        let newRefund;
                                        if (ref === 'All Refunds') {
                                          newRefund = ['All Refunds'];
                                        } else {
                                          const filtered = (prev.refundStatus || []).filter(item => item !== 'All Refunds');
                                          if (isChecked) {
                                            newRefund = filtered.filter(item => item !== ref);
                                            if (newRefund.length === 0) newRefund = ['All Refunds'];
                                          } else {
                                            newRefund = [...filtered, ref];
                                          }
                                        }
                                        return { ...prev, refundStatus: newRefund };
                                      });
                                    }}
                                    className="w-4 h-4 text-accent border-border focus:ring-accent bg-bg-input rounded"
                                  />
                                  <span className={`text-sm font-bold ${isChecked ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>{ref}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {activeFilterType === 'Ack/Grievance/FIR' && (
                          <div className="space-y-3">
                            <div className="flex flex-col gap-2 p-3 bg-bg-secondary/40 border border-border/40 rounded-xl mb-2">
                              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Select Types to Display:</span>
                              <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {['Ack', 'Grievance', 'FIR'].map(type => {
                                  const label = type === 'Ack' ? 'Acknowledgment Numbers' : type === 'Grievance' ? 'Grievance Number' : 'FIR Number';
                                  const isChecked = tempFilters.showNumberTypes?.includes(type) ?? true;
                                  return (
                                    <label key={type} className="flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer hover:text-text-primary transition-all">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setTempFilters(prev => {
                                            const show = prev.showNumberTypes || ['Ack', 'Grievance', 'FIR'];
                                            const newShow = show.includes(type)
                                              ? show.filter(t => t !== type)
                                              : [...show, type];
                                            return { ...prev, showNumberTypes: newShow };
                                          });
                                        }}
                                        className="w-3.5 h-3.5 text-accent border-border focus:ring-accent bg-bg-input rounded"
                                      />
                                      {label}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            <label className="block text-sm font-bold text-text-secondary">Search Ack, Grievance, or FIR Number</label>
                            <input
                              type="text"
                              placeholder="Type Ack, Grievance, or FIR number to search..."
                              value={tempFilters.caseNumbers || ''}
                              onChange={(e) => setTempFilters(prev => ({ ...prev, caseNumbers: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-all mb-3"
                            />
                            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 border border-border/40 rounded-xl p-2 bg-bg-secondary/40">
                              {filteredNumbersList.length === 0 ? (
                                <div className="text-xs text-text-muted p-2 italic">No numbers found</div>
                              ) : (
                                filteredNumbersList.map((item, idx) => {
                                  const isChecked = tempFilters.selectedCaseNumbers?.includes(item.value) || false;
                                  return (
                                    <label key={idx} className="flex items-start gap-3 p-2.5 hover:bg-bg-input rounded-xl transition-all cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setTempFilters(prev => {
                                            const currentSelected = prev.selectedCaseNumbers || [];
                                            const newSelected = currentSelected.includes(item.value)
                                              ? currentSelected.filter(v => v !== item.value)
                                              : [...currentSelected, item.value];
                                            return { ...prev, selectedCaseNumbers: newSelected };
                                          });
                                        }}
                                        className="w-4 h-4 mt-0.5 text-accent border-border focus:ring-accent bg-bg-input rounded cursor-pointer"
                                      />
                                      <div className="flex flex-col flex-1">
                                        <span className={`text-sm font-bold flex items-center gap-1.5 ${isChecked ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}>
                                          {item.value}
                                          <span className="text-[10px] text-text-muted font-normal bg-bg-secondary px-1.5 py-0.5 rounded uppercase">{item.type}</span>
                                        </span>
                                        <span className="text-[11px] text-text-muted mt-0.5 font-semibold">
                                          Case ID: {item.caseId}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {activeFilterType === 'Custom' && (() => {
                          const suggestions = getCustomFilterSuggestions(tempFilters.customFilters?.anyDetail || '');
                          const showSuggestions = tempFilters.customFilters?.anyDetail && tempFilters.customFilters?.anyDetail !== tempFilters.customFilters?.selectedValue;

                          return (
                            <div className="space-y-3 relative">
                              <label className="block text-sm font-bold text-text-secondary mb-2">Any Case Detail</label>
                              <input
                                type="text"
                                placeholder="Type any case detail to filter instantly"
                                value={tempFilters.customFilters?.anyDetail || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTempFilters(prev => ({
                                    ...prev,
                                    customFilters: {
                                      ...prev.customFilters,
                                      anyDetail: value,
                                      selectedField: '',
                                      selectedValue: ''
                                    }
                                  }));
                                  setAppliedFilters(prev => ({
                                    ...prev,
                                    customFilters: {
                                      ...prev.customFilters,
                                      anyDetail: value,
                                      selectedField: '',
                                      selectedValue: ''
                                    }
                                  }));
                                }}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-all"
                              />

                              {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-bg-card border-2 border-border rounded-xl shadow-lg z-50 divide-y divide-border/40 scrollbar-thin">
                                  {suggestions.map((s, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setTempFilters(prev => ({
                                          ...prev,
                                          customFilters: {
                                            ...prev.customFilters,
                                            anyDetail: s.value,
                                            selectedField: s.fieldKey,
                                            selectedValue: s.value
                                          }
                                        }));
                                        setAppliedFilters(prev => ({
                                          ...prev,
                                          customFilters: {
                                            ...prev.customFilters,
                                            anyDetail: s.value,
                                            selectedField: s.fieldKey,
                                            selectedValue: s.value
                                          }
                                        }));
                                      }}
                                      className="p-3 text-xs text-text-primary hover:bg-bg-input hover:text-accent font-bold cursor-pointer transition-colors flex justify-between items-center"
                                    >
                                      <span>{s.value}</span>
                                      <span className="text-[9px] text-text-muted bg-bg-secondary px-2 py-0.5 rounded uppercase tracking-wider">{s.fieldLabel}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="mt-6 border-t-2 border-border pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Advanced Conditions</h4>
                                  <button
                                    onClick={() => {
                                      setTempFilters(prev => ({
                                        ...prev,
                                        customFilters: {
                                          ...prev.customFilters,
                                          conditions: [...(prev.customFilters?.conditions || []), { field: filterableFields[0].key, operator: 'contains', value: '' }]
                                        }
                                      }))
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-black text-accent hover:text-accent-hover uppercase bg-accent-soft px-2 py-1 rounded transition-colors"
                                  >
                                    <Plus size={12} /> Add Condition
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {(tempFilters.customFilters?.conditions || []).map((cond, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-bg-secondary p-2 rounded-xl border border-border">
                                      <select
                                        value={cond.field}
                                        onChange={e => {
                                          const newConds = [...(tempFilters.customFilters.conditions || [])];
                                          newConds[idx].field = e.target.value;
                                          setTempFilters(prev => ({ ...prev, customFilters: { ...prev.customFilters, conditions: newConds } }));
                                        }}
                                        className="w-full sm:w-1/3 px-2 py-1.5 text-xs border border-border rounded-lg bg-bg-input text-text-primary focus:border-accent outline-none"
                                      >
                                        {filterableFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                                      </select>
                                      <select
                                        value={cond.operator}
                                        onChange={e => {
                                          const newConds = [...(tempFilters.customFilters.conditions || [])];
                                          newConds[idx].operator = e.target.value;
                                          setTempFilters(prev => ({ ...prev, customFilters: { ...prev.customFilters, conditions: newConds } }));
                                        }}
                                        className="w-full sm:w-1/4 px-2 py-1.5 text-xs border border-border rounded-lg bg-bg-input text-text-primary focus:border-accent outline-none"
                                      >
                                        <option value="contains">contains</option>
                                        <option value="equals">is exactly</option>
                                        <option value="not_equals">is not</option>
                                        <option value="starts_with">starts with</option>
                                        <option value="is_empty">is empty</option>
                                        <option value="is_not_empty">is not empty</option>
                                      </select>
                                      {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' && (
                                        <input
                                          type="text"
                                          placeholder="Value..."
                                          value={cond.value}
                                          onChange={e => {
                                            const newConds = [...(tempFilters.customFilters.conditions || [])];
                                            newConds[idx].value = e.target.value;
                                            setTempFilters(prev => ({ ...prev, customFilters: { ...prev.customFilters, conditions: newConds } }));
                                          }}
                                          className="w-full sm:w-1/3 px-2 py-1.5 text-xs border border-border rounded-lg bg-bg-input text-text-primary focus:border-accent outline-none"
                                        />
                                      )}
                                      <button
                                        onClick={() => {
                                          const newConds = (tempFilters.customFilters.conditions || []).filter((_, i) => i !== idx);
                                          setTempFilters(prev => ({ ...prev, customFilters: { ...prev.customFilters, conditions: newConds } }));
                                        }}
                                        className="p-1.5 text-text-muted hover:text-red hover:bg-red-soft rounded-lg transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  {(tempFilters.customFilters?.conditions?.length === 0 || !tempFilters.customFilters?.conditions) && (
                                    <div className="text-[10px] text-center text-text-muted font-medium py-2">No advanced conditions added.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

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

            {!isArchiveMode && (user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Operation Head' || user?.role === 'BD Head') && (
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
                  {opsUsers.filter(u => ['operations', 'admin', 'operation admin', 'operation review', 'legal', 'advocate', 'bd head'].includes(u.role?.toLowerCase()?.trim())).map(u => (
                    <option key={`bulk-${u._id || u.email}`} value={u.fullName}>Assign: {u.fullName}</option>
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

          {/* Case Count Display */}
          <div className="flex items-center gap-3 mb-6 px-1">
            <div className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2.5 rounded-2xl border border-accent/20 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
              <Inbox size={14} className="opacity-70" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Total Cases:</span>
              <span className="text-sm font-black tabular-nums">
                {user?.role === 'Reviewer' || hasActiveFilters ? filteredCases.length : (totalCount + archivedCount)}
              </span>
            </div>

            {!isArchiveMode && archivedCount > 0 && !hasActiveFilters && (
              <div className="flex items-center gap-2 bg-text-muted/10 text-text-secondary px-4 py-2.5 rounded-2xl border border-border shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-[10px] font-black uppercase tracking-widest">Active: {totalCount} | Archived: {archivedCount}</span>
              </div>
            )}

            {searchTerm && (
              <div className="flex items-center gap-2 bg-text-primary/5 text-text-muted px-4 py-2.5 rounded-2xl border border-border animate-in fade-in slide-in-from-left-4 duration-500">
                <Search size={14} className="opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-widest italic">Filtering for "{searchTerm}"</span>
              </div>
            )}

            {false && user?.role?.toLowerCase()?.trim() === 'legal' && (
              <button
                onClick={() => {
                  setIsAddDraftOpen(true);
                  fetchLegalRequests();
                }}
                className="relative ml-auto bg-accent hover:bg-accent-hover text-white font-black py-2.5 px-5 rounded-2xl shadow-md text-xs transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 animate-in fade-in"
              >
                <Plus size={16} /> Add Draft
                {legalRequests.filter(r => r.status === 'Approved' || r.status === 'Rejected').length > seenResolvedCount && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-bg-card shadow-sm animate-bounce">
                    {legalRequests.filter(r => r.status === 'Approved' || r.status === 'Rejected').length - seenResolvedCount}
                  </span>
                )}
              </button>
            )}

            <div className={`relative ${user?.role?.toLowerCase()?.trim() === 'legal' ? '' : 'ml-auto'}`}>
              <button
                title="Toggle Columns"
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className={`flex items-center justify-center w-12 h-12 border-2 rounded-xl shadow-md active:scale-95 transition-all ${showColumnDropdown ? 'bg-accent border-accent text-white' : 'bg-bg-card border-border text-text-primary hover:border-accent hover:text-accent'}`}
              >
                <ListFilterPlus size={24} strokeWidth={2.5} />
              </button>
              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setShowColumnDropdown(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-[260px] max-h-[400px] overflow-y-auto bg-bg-card rounded-2xl shadow-2xl border-2 border-border z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-border bg-bg-secondary sticky top-0 flex justify-between items-center z-10">
                      <span className="text-xs font-black uppercase tracking-widest text-text-primary">Toggle Columns</span>
                    </div>
                    <div className="p-2 space-y-1">
                      {[
                        { label: 'Case ID', key: 'caseId' },
                        { label: 'Created', key: 'createdDate' },
                        { label: 'Company', key: 'company' },
                        { label: 'Client', key: 'client' },
                        { label: 'Type of Complaint', key: 'typeOfComplaint' },
                        { label: 'Amount Received', key: 'totalAmtPaid' },
                        { label: 'Priority', key: 'priority' },
                        { label: 'Due Date', key: 'dueDate' },
                        { label: 'Status', key: 'status' },
                        { label: 'Refund', key: 'refund' },
                        { label: 'Assigned To', key: 'assignedTo' },
                        { label: 'Last Update', key: 'lastUpdateDate' },
                        ...filterableFields.filter(f => ['clientMobile', 'clientEmail', 'state', 'city', 'sourceOfComplaint', 'amtInDispute', 'bda', 'workStatus', 'legalOfficer', 'serviceName', 'dateOfLastPayment', 'mouSigned', 'totalMouValue', 'clientAllegation', 'caseSummary'].includes(f.key)).map(f => ({ label: f.label, key: f.key }))
                      ].map(col => (
                        <div key={col.key} onClick={(e) => {
                          e.stopPropagation();
                          setVisibleColumns(prev => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key]);
                        }} className="flex items-center gap-3 px-3 py-2 hover:bg-bg-input rounded-xl cursor-pointer transition-colors group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${visibleColumns.includes(col.key) ? 'bg-accent border-accent text-white' : 'border-border group-hover:border-accent'}`}>
                            {visibleColumns.includes(col.key) && <Check size={10} strokeWidth={4} />}
                          </div>
                          <span className="text-[11px] font-bold text-text-secondary truncate">{col.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
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
                <button onClick={() => setViewCase(null)} className="hover:text-accent transition-colors">My Cases</button>
                <ChevronRight size={10} />
                <span className="text-accent">Case Detail</span>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right hidden sm:block mr-4">
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">{format(new Date(), 'eee hh:mm aaa')}</div>

              </div>
              {user?.role !== 'Legal' && (
              <button
                onClick={() => navigate('/new-case', { state: { clear: true } })}
                className="bg-accent text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
              >
                + New Case
              </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setViewCase(null)}
            className="flex items-center gap-2 text-black hover:text-text-primary mb-10 text-[10px] font-bold uppercase tracking-widest transition-all group"
          >
            ← Back to Cases
          </button>

          {/* Case Header Card */}
          <div className="bg-bg-card rounded-2xl border-2 border-border p-4 md:p-8 mb-8 shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-black text-accent uppercase tracking-widest">{viewCase.caseId}</span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${viewCase.priority === 'High' ? 'bg-red-soft text-red' : 'bg-yellow-soft text-yellow'}`}>
                    {viewCase.priority || 'NORMAL'}
                  </span>

                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight max-w-4xl">
                    {viewCase.typeOfComplaint || 'Payment Dispute'} — {viewCase.companyName}
                  </h2>
                  {isResolvedDisplay ? (
                    <div className="flex items-center gap-2">
                      <div className={`text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${viewCase.compliancePending ? 'bg-orange-500 shadow-orange-900/20' : 'bg-green shadow-green-900/20'}`}>
                        <CheckCircle size={14} strokeWidth={3} /> {viewCase.compliancePending ? 'Closure Marked - Compliance Pending' : 'Resolved'}
                      </div>
                      {viewCase.compliancePending && (
                        <button
                          onClick={handleClearCompliancePending}
                          className="bg-accent text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-accent-hover"
                          title="Click here if compliance is now completed"
                        >
                          <CheckCircle size={12} strokeWidth={3} /> Mark Done
                        </button>
                      )}
                    </div>
                  ) : closureReady ? (
                    <button
                      onClick={handleMarkResolved}
                      className="bg-green text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <CheckCircle size={14} strokeWidth={3} /> Mark Case Resolved
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-3">
                {!isEditing && activeDetailTab === 'Case Details' && canEditCase && (
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
              <div className="text-[9px] font-black text-text-primary uppercase tracking-[0.2em] mb-4 opacity-50">Case Progress</div>
              <div className="w-full rounded-lg overflow-x-auto scrollbar-thin border border-border h-10">
                <div className="flex min-w-[600px] h-full">
                  {['Case Logged', 'Assigned', 'Analysis', 'Negotiation', 'Settlement', 'Closure'].map((step, idx) => {
                    const steps = ['Case Logged', 'Assigned', 'Analysis', 'Negotiation', 'Settlement', 'Closure'];

                    // Determine active stage by choosing the more advanced stage for visual accuracy
                    const normStatus = normalizeStatus(viewCase?.currentStatus, viewCase?.assignedTo, viewCase?.initiatedBy);
                    const progressStage = progressFormData.stage || 'Case Logged';

                    const normIdx = steps.indexOf(normStatus);
                    const progIdx = steps.indexOf(progressStage);
                    const displayStatus = progIdx >= normIdx ? progressStage : normStatus;

                    let currentIdx = steps.indexOf(displayStatus);
                    if (currentIdx === -1) {
                      if (displayStatus === 'Settlement' || displayStatus === 'Closure' || displayStatus === 'Settled' || viewCase?.progressPercentage >= 100) {
                        currentIdx = steps.length; // All steps completed (mark Closure as completed)
                      } else {
                        currentIdx = 0;
                      }
                    }
                    const isCompleted = idx < currentIdx;
                    const isActive = idx === currentIdx;

                    return (
                      <div
                        key={step}
                        className={`flex-1 flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${isCompleted ? 'bg-green text-white' :
                          isActive ? 'bg-green text-white border-x border-white/10' :
                            'bg-bg-input text-text-muted hover:bg-bg-secondary/50'
                          }`}
                      >
                        {isCompleted && <Check size={10} className="mr-2" strokeWidth={4} />}
                        {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full mr-2 animate-pulse" />}
                        {step}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Client</div>
                <div className="text-sm font-black text-text-primary truncate">{viewCase.clientName}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Contact</div>
                <div className="text-sm font-black text-text-primary">{viewCase.clientMobile || '—'}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Email ID</div>
                <div className="text-xs font-black text-text-primary" title={viewCase.clientEmail || 'Email'}>
                  {viewCase.clientEmail ? viewCase.clientEmail.split(/[/,]/).map((email, index) => (
                    <div key={index} className="break-all whitespace-normal leading-tight text-[10px]">{email.trim()}</div>
                  )) : 'Email'}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Assigned To</div>
                <div className="text-sm font-black text-text-primary truncate">{viewCase.assignedTo || viewCase.initiatedBy || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Created</div>
                <div className="text-sm font-black text-text-primary whitespace-nowrap">{viewCase.createdDate ? format(new Date(viewCase.createdDate), 'dd MMM yyyy') : '—'}</div>
              </div>
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Linked By</div>
                <div className="text-sm font-black text-text-primary whitespace-nowrap">
                  <select
                    className="bg-transparent border-none text-blue hover:underline cursor-pointer outline-none text-sm font-black max-w-[150px] truncate"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setSearchTerm(val);
                        setAppliedFilters(prev => ({ ...prev, search: val }));
                        setViewCase(null);
                      }
                    }}
                    value=""
                  >
                    <option value="">
                      {linkedCases.find(c => c.caseId === viewCase.linkedBy)
                        ? `${linkedCases.find(c => c.caseId === viewCase.linkedBy).companyName} (${viewCase.linkedBy})`
                        : (viewCase.linkedBy || '-- Select --')}
                    </option>
                    {linkedCases.filter(c => c.caseId !== viewCase.linkedBy).map(c => (
                      <option key={c.caseId} value={c.caseId}>
                        {c.companyName} ({c.caseId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Refunded Amount</div>
                <div className="text-sm font-black text-green-600">
                  ₹{(Number(formData.refundedAmount) || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Saved Amount</div>
                <div className="text-sm font-black text-blue">
                  ₹{(Number(formData.savedAmount) || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="flex gap-4 md:gap-10 border-b border-border mb-10 overflow-x-auto scrollbar-none">
            {['Case Details', 'Communications', 'Documents', 'Progress Update', 'Legal Process', 'History', 'Case Study'].map((tab) => (
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
                        <option value="Critical">Critical</option>
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
                        <option value="Notice">Notice</option>
                        <option value="Odoo">Odoo</option>
                      </select>
                    </div>
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Type of Complaint</label>
                      <select className={inputClass} name="typeOfComplaint" value={formData.typeOfComplaint || ''} onChange={handleFormChange} required disabled={!isEditing}>
                        <option value="">-- Select --</option>
                        <option value="Legal Notice">Legal Notice</option>
                        <option value="1930 Cyber Complaint">1930 Cyber Complaint</option>
                        <option value="Consumer Complaint">Consumer Complaint</option>
                        <option value="Criminal Complaint/FIR">Criminal Complaint/FIR</option>
                        <option value="Civil Case">Civil Case</option>
                        <option value="Social Media">Social Media</option>
                        <option value="General Query">General Query</option>
                        <option value="NA Non Agreement">NA Non Agreement</option>
                        <option value="Demand Pressure">Demand Pressure</option>
                        <option value="Bank Hold">Bank Hold</option>
                      </select>
                    </div>
                    <div>
                      <label className={`${labelClass} after:content-['*'] after:text-red`}>Brand Name</label>
                      <select className={inputClass} name="brandName" value={formData.brandName || ''} onChange={handleFormChange} required disabled={!isEditing}>
                        <option value="">-- Select --</option>
                        <option value="Startupflora">Startupflora</option>
                      </select>
                    </div>

                    {/* Conditional Complaint Fields Integrated into Grid */}
                    {['Cyber Complaint', '1930 Cyber Complaint', 'Criminal Complaint/FIR', 'FIR'].includes(formData.typeOfComplaint) && (
                      <div className="lg:col-span-2">
                        <label className={labelClass}>Acknowledgment Numbers {['Criminal Complaint/FIR', 'FIR'].includes(formData.typeOfComplaint) ? '(If Any)' : ''}</label>
                        <div className="space-y-3">
                          {cyberAcks.map((ack, idx) => (
                            <div key={idx} className="flex gap-3">
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
                            <button type="button" onClick={addCyberAck} className="text-[10px] text-accent font-black hover:underline uppercase tracking-widest">+ Add Number</button>
                          )}
                        </div>
                      </div>
                    )}

                    {(formData.typeOfComplaint === 'FIR' || formData.typeOfComplaint === 'Criminal Complaint/FIR') && (
                      <>
                        <div>
                          <label className={labelClass}>FIR Number</label>
                          <input type="text" className={inputClass} name="firNumber" value={formData.firNumber} onChange={handleFormChange} disabled={!isEditing} />
                        </div>
                        <div>
                          <label className={labelClass}>FIR Document</label>
                          <FileUpload onUploadSuccess={(url) => setFormData(p => ({ ...p, firFileLink: url }))} label="Upload" disabled={!isEditing} compact={true} />
                        </div>
                      </>
                    )}

                    {formData.typeOfComplaint === 'Consumer Complaint' && (
                      <div className="lg:col-span-2">
                        <label className={labelClass}>Grievance Number</label>
                        <input type="text" className={inputClass} name="grievanceNumber" value={formData.grievanceNumber} onChange={handleFormChange} disabled={!isEditing} />
                      </div>
                    )}

                    {['Legal Notice', '1930 Cyber Complaint', 'Consumer Complaint'].includes(formData.typeOfComplaint) && (
                      <div className="lg:col-span-2">
                        <label className={labelClass}>Import Document ({formData.typeOfComplaint} Proof)</label>
                        <FileUpload onUploadSuccess={(url) => setFormData(prev => ({ ...prev, importDocumentLink: url }))} label="Upload" disabled={!isEditing} compact={true} />
                      </div>
                    )}
                  </div>
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
                    <div key={idx} className="relative bg-bg-input p-4 md:p-6 rounded-2xl border border-border mb-6">
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
                            <option value="Submitted">Submitted</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Converted">Converted</option>
                            <option value="Completed">Completed</option>
                            <option value="Q/A not approved">Q/A not approved</option>
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
                            <option value="Digital Marketing">Digital Marketing</option>
                            <option value="Loan">Loan</option>
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
                      <input type="text" className={`${inputClass} ${formErrors.clientEmail ? 'border-red bg-red-soft' : ''}`} name="clientEmail" value={formData.clientEmail || ''} onChange={handleFormChange} placeholder="example@gmail.com" disabled={!isEditing} />
                      {formErrors.clientEmail && <p className="text-[9px] text-red font-black mt-2 uppercase tracking-widest">{formErrors.clientEmail}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Linked By</label>
                      <select
                        className={inputClass}
                        name="linkedBy"
                        value={formData.linkedBy || ''}
                        onChange={handleFormChange}
                        disabled={!isEditing}
                      >
                        <option value="">-- Select Linked Case --</option>
                        {linkedCases.map(c => (
                          <option key={c.caseId} value={c.caseId}>
                            {c.companyName} ({c.caseId})
                          </option>
                        ))}
                        {formData.linkedBy && !linkedCases.find(c => c.caseId === formData.linkedBy) && (
                          <option value={formData.linkedBy}>{formData.linkedBy}</option>
                        )}
                      </select>
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
                    {(formData.state || formData.city || formData.pincode || isEditing) && (
                      <>
                        <div>
                          <label className={labelClass}>City</label>
                          <input type="text" className={inputClass} name="city" value={formData.city || ''} onChange={handleFormChange} placeholder="Enter city" disabled={!isEditing} />
                        </div>
                        <div>
                          <label className={labelClass}>Pincode</label>
                          <input type="text" className={inputClass} name="pincode" value={formData.pincode || ''} onChange={handleFormChange} placeholder="Enter pincode" disabled={!isEditing} />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Financial Details */}
                <div className={cardClass}>
                  <h3 className={sectionTitleClass}><IndianRupee size={18} className="text-yellow" /> Financial Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-6">
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Total Amount Paid (₹)</label>
                      <input type="text" className={`${inputClass} !bg-bg-secondary !border-dashed font-black h-12`} name="totalAmtPaid" value={(formData.totalAmtPaid !== undefined && formData.totalAmtPaid !== null && formData.totalAmtPaid !== '') ? formData.totalAmtPaid : ''} readOnly placeholder="Auto calculated" disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Total MOU Value (₹)</label>
                      <input type="text" className={`${inputClass} !bg-bg-secondary !border-dashed font-black h-12`} name="totalMouValue" value={(formData.totalMouValue !== undefined && formData.totalMouValue !== null && formData.totalMouValue !== '') ? formData.totalMouValue : ''} readOnly placeholder="Auto calculated" disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Amount In Dispute (₹)</label>
                      <input type="text" className={`${inputClass} bg-blue-soft font-black text-blue border-blue-soft h-12`} name="amtInDispute" value={(formData.amtInDispute !== undefined && formData.amtInDispute !== null && formData.amtInDispute !== '') ? formData.amtInDispute : ''} readOnly placeholder="Auto calculated" disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Refunded Amount (₹)</label>
                      <input type="number" className={`${inputClass} !bg-bg-secondary !border-dashed font-black text-green-600 h-12`} name="refundedAmount" value={(formData.refundedAmount !== undefined && formData.refundedAmount !== null && formData.refundedAmount !== '') ? formData.refundedAmount : ''} readOnly placeholder="0" disabled={true} />
                    </div>
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Saved Amount (₹)</label>
                      <input type="number" className={`${inputClass} !bg-bg-secondary !border-dashed font-black text-blue h-12`} name="savedAmount" value={(formData.savedAmount !== undefined && formData.savedAmount !== null && formData.savedAmount !== '') ? formData.savedAmount : ''} readOnly placeholder="0" disabled={true} />
                    </div>
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Date of Last Payment</label>
                      <input type="date" className={`${inputClass} h-12`} name="dateOfLastPayment" value={formData.dateOfLastPayment || ''} onChange={handleFormChange} disabled={!isEditing} />
                    </div>
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Due Date</label>
                      <input type="date" className={`${inputClass} h-12`} name="dueDate" value={formData.dueDate || ''} onChange={handleFormChange} disabled={!isEditing} />
                    </div>
                  </div>
                </div>

                {/* Risk & Threat Assessment */}
                <div className={cardClass}>
                  <h3 className={sectionTitleClass}><AlertTriangle size={18} className="text-red" /> Risk & Threat Assessment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Social Media Risk</label>
                      <select className={`${inputClass} h-12`} name="smRisk" value={formData.smRisk || 'None'} onChange={handleFormChange} disabled={!isEditing}>
                        <option value="None">None</option>
                        <option value="Low">Low</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Consumer Complaint Filed?</label>
                      <select className={`${inputClass} h-12`} name="consumerComplaintFiled" value={formData.consumerComplaintFiled || 'No'} onChange={handleFormChange} disabled={!isEditing}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className={`${labelClass} min-h-[36px] flex items-end pb-1`}>Police / Cyber Threat</label>
                      <select className={`${inputClass} h-12`} name="policeThreat" value={formData.policeThreat || 'None'} onChange={handleFormChange} disabled={!isEditing}>
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
                    {/* Case Summary */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className={`${labelClass} mb-0 after:content-['*'] after:text-red`}>Case Summary</label>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setAiTargetField('caseSummary');
                              setShowAIPromptModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                          >
                            <Sparkles size={14} />
                            Generate with AI
                          </button>
                        )}
                      </div>
                      {/* Formatting Toolbar – always visible, clickable only when editing */}
                      <div className="flex items-center bg-bg-card border border-border rounded-t-xl px-3 py-2 gap-0 overflow-x-auto scrollbar-none">
                        <button
                          type="button"
                          title="Paragraph"
                          onClick={() => isEditing && handleFormat('caseSummary', 'paragraph')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isEditing ? 'text-accent hover:text-accent cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                          <span className="text-[12px]">¶</span> Paragraph
                        </button>
                        <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                        <button
                          type="button"
                          title="Bullet List"
                          onClick={() => isEditing && handleFormat('caseSummary', 'bullets')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isEditing ? 'text-text-secondary hover:text-accent cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                          <span className="text-[11px]">≡</span> Bullet List
                        </button>
                        <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                        <button
                          type="button"
                          title="Number List"
                          onClick={() => isEditing && handleFormat('caseSummary', 'numbers')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isEditing ? 'text-text-secondary hover:text-accent cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                          <span className="text-[11px]">≡</span> Number List
                        </button>
                        <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                        <button
                          type="button"
                          title="Bold"
                          onClick={() => isEditing && handleFormat('caseSummary', 'bold')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isEditing ? 'text-text-secondary hover:text-accent cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                          <span className="font-black text-[12px]">B</span> Bold
                        </button>
                      </div>
                      <textarea
                        className={`${inputClass} min-h-[120px] !rounded-t-none !border-t-0`}
                        name="caseSummary"
                        value={formData.caseSummary || ''}
                        onChange={handleFormChange}
                        placeholder="Brief overview of the case..."
                        required
                        disabled={!isEditing}
                      ></textarea>
                    </div>

                    {/* Client's Main Allegation */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className={`${labelClass} mb-0`}>Client's Dispute</label>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setAiTargetField('clientAllegation');
                              setShowAIPromptModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
                          >
                            <Sparkles size={14} />
                            Generate with AI
                          </button>
                        )}
                      </div>
                      {/* Formatting Toolbar */}
                      <div className="flex items-center bg-bg-card border border-border rounded-t-xl px-3 py-2 gap-0 overflow-x-auto scrollbar-none">
                        <button
                          type="button"
                          title="Paragraph"
                          onClick={() => isEditing && handleFormat('clientAllegation', 'paragraph')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isEditing ? 'text-accent hover:text-accent cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                          <span className="text-[12px]">¶</span> Paragraph
                        </button>
                        <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                        <button
                          type="button"
                          title="Bullet List"
                          onClick={() => isEditing && handleFormat('clientAllegation', 'bullets')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isEditing ? 'text-text-secondary hover:text-accent cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                          <span className="text-[11px]">≡</span> Bullet List
                        </button>
                        <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                        <button
                          type="button"
                          title="Number List"
                          onClick={() => isEditing && handleFormat('clientAllegation', 'numbers')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isEditing ? 'text-text-secondary hover:text-accent cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                          <span className="text-[11px]">≡</span> Number List
                        </button>
                        <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                        <button
                          type="button"
                          title="Bold"
                          onClick={() => isEditing && handleFormat('clientAllegation', 'bold')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isEditing ? 'text-text-secondary hover:text-accent cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                          <span className="font-black text-[12px]">B</span> Bold
                        </button>
                      </div>
                      <textarea
                        className={`${inputClass} min-h-[100px] !rounded-t-none !border-t-0`}
                        name="clientAllegation"
                        value={formData.clientAllegation || ''}
                        onChange={handleFormChange}
                        placeholder="What the client claims..."
                        disabled={!isEditing}
                      ></textarea>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                          {/* Formatting Toolbar */}
                          <div className="flex items-center bg-bg-card border border-border rounded-t-xl px-3 py-2 gap-0 overflow-x-auto scrollbar-none">
                            <button
                              type="button"
                              title="Paragraph"
                              onClick={() => handleFormat('commSummary', 'paragraph', 'communication')}
                              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-accent hover:text-accent cursor-pointer"
                            >
                              <span className="text-[12px]">¶</span> Paragraph
                            </button>
                            <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                            <button
                              type="button"
                              title="Bullet List"
                              onClick={() => handleFormat('commSummary', 'bullets', 'communication')}
                              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                            >
                              <span className="text-[11px]">≡</span> Bullet List
                            </button>
                            <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                            <button
                              type="button"
                              title="Number List"
                              onClick={() => handleFormat('commSummary', 'numbers', 'communication')}
                              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                            >
                              <span className="text-[11px]">≡</span> Number List
                            </button>
                            <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                            <button
                              type="button"
                              title="Bold"
                              onClick={() => handleFormat('commSummary', 'bold', 'communication')}
                              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                            >
                              <span className="font-black text-[12px]">B</span> Bold
                            </button>
                          </div>
                          <textarea
                            name="commSummary"
                            value={commFormData.summary}
                            onChange={(e) => setCommFormData({ ...commFormData, summary: e.target.value })}
                            className="w-full bg-bg-input border-2 border-border rounded-b-xl !rounded-t-none !border-t-0 px-6 py-5 text-sm font-medium text-text-primary focus:border-accent outline-none transition-all h-24 resize-none italic shadow-inner"
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Refund Demanded (₹)</label>
                            <input
                              type="text"
                              value={commFormData.refundDemanded}
                              onChange={(e) => setCommFormData({ ...commFormData, refundDemanded: e.target.value.replace(/\D/g, '') })}
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
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">ATTACH PROOF FILE</label>
                          <div className="mb-4">
                            <FileUpload onUploadSuccess={(url) => setCommFormData(prev => ({ ...prev, fileLink: url }))} label="Click to browse or drag & drop (Max 10MB)" />
                          </div>
                          {commFormData.fileLink && (
                            <div className="text-[10px] font-black text-accent mt-1 flex items-center gap-2">
                              <span>Current Attachment:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewFileUrl(commFormData.fileLink);
                                  setPreviewFileName(commFormData.fileLink.split('/').pop());
                                }}
                                className="underline truncate max-w-[200px] text-left hover:text-accent-hover"
                              >
                                {commFormData.fileLink.split('/').pop()}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4">
                          <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-5 px-8 rounded-2xl shadow-lg shadow-orange-900/10 text-xs uppercase tracking-[0.25em] transition-all active:scale-95 w-full flex items-center justify-center gap-3">
                            {editingComm ? 'Update Signal' : 'Submit'}
                          </button>
                          {editingComm && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingComm(null);
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
                              }}
                              className="bg-bg-card hover:bg-bg-secondary text-text-primary border-2 border-border font-black py-5 px-8 rounded-2xl text-xs uppercase tracking-[0.25em] transition-all"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
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
                              <div key={comm.id || comm._id} className="bg-bg-card p-5 rounded-xl border border-border shadow-sm group hover:border-accent transition-all cursor-pointer">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
                                    {format(new Date(comm.dateTime || comm.createdAt), 'dd MMM, hh:mm aaa')}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${comm.direction === 'Incoming' ? 'bg-green-soft text-green' : 'bg-blue-soft text-blue'}`}>
                                    {comm.direction}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-text-secondary italic leading-relaxed whitespace-pre-wrap">"{comm.summary}"</p>
                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 transition-all">
                                  <span className="text-[9px] font-black text-accent uppercase tracking-widest">{comm.mode} via {comm.fromTo || 'Client'}</span>
                                  <div className="flex gap-2 items-center">
                                    {['Admin', 'Super Admin', 'SuperAdmin', 'BD Head'].includes(user?.role) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEditComm(comm);
                                        }}
                                        className="text-text-primary hover:text-accent bg-bg-secondary hover:bg-accent/10 p-1.5 rounded-md border border-border hover:border-accent transition-all flex items-center gap-1"
                                        title="Edit Signal"
                                      >
                                        <Edit3 size={10} /> <span className="text-[8px] font-bold">EDIT</span>
                                      </button>
                                    )}
                                    {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteComm(comm.id || comm._id);
                                        }}
                                        className="text-red hover:text-white bg-red/10 hover:bg-red p-1.5 rounded-md border border-red/20 hover:border-red transition-all flex items-center gap-1"
                                        title="Delete Signal"
                                      >
                                        <Trash2 size={10} /> <span className="text-[8px] font-bold">DELETE</span>
                                      </button>
                                    )}
                                    {comm.fileLink ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPreviewFileUrl(comm.fileLink);
                                          setPreviewFileName(comm.summary || 'Attachment');
                                        }}
                                        className="text-accent hover:text-white bg-accent/10 hover:bg-accent p-1.5 rounded-md transition-all flex items-center gap-1 active:scale-95"
                                        title="View Attachment"
                                      >
                                        <Paperclip size={10} /> <span className="text-[8px] font-bold">VIEW FILE</span>
                                      </button>
                                    ) : (
                                      <div className="w-1 h-1 bg-accent rounded-full" />
                                    )}
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
                      <h3 className="text-xs font-black text-black uppercase tracking-widest">Communication Attachments
                        RRR-SF-2026-0064</h3>
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
                          options={['Legal Notice', 'Payment Receipt', 'MOU/Agreement', 'Complaint Copy', 'Refund Proof', 'Other']}
                          value={mouFormData.mouType}
                          onChange={(e) => setMouFormData({ ...mouFormData, mouType: e.target.value })}
                          placeholder="Select Document Type..."
                          className="bg-bg-input text-text-primary"
                        />
                      </div>

                      {mouFormData.mouType === 'Other' && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                          <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1 after:content-['*'] after:text-red after:ml-0.5">SPECIFY DOCUMENT TYPE</label>
                          <input
                            type="text"
                            value={mouFormData.otherType}
                            onChange={(e) => setMouFormData({ ...mouFormData, otherType: e.target.value })}
                            placeholder="e.g. Identity Proof, Court Order, etc."
                            className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent shadow-inner"
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1 after:content-['*'] after:text-red after:ml-0.5">UPLOAD DOCUMENT</label>
                        <FileUpload
                          key={mouUploadKey}
                          onUploadSuccess={(url) => setMouFormData(prev => ({ ...prev, fileLink: url }))}
                          label="Click to upload or drag & drop. PDF, DOCX - Max 20MB"
                          icon={FileText}
                        />
                        {mouFormData.fileLink && (
                          <div className="text-[10px] font-black text-accent mt-1 flex items-center gap-2">
                            <span>Current File:</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewFileUrl(mouFormData.fileLink);
                                setPreviewFileName(mouFormData.fileLink.split('/').pop());
                              }}
                              className="underline truncate max-w-[200px] text-left hover:text-accent-hover"
                              title={mouFormData.fileLink}
                            >
                              {mouFormData.fileLink.split('/').pop()}
                            </button>
                          </div>
                        )}
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
                        {/* Formatting Toolbar */}
                        <div className="flex items-center bg-bg-card border border-border rounded-t-xl px-3 py-2 gap-0 overflow-x-auto scrollbar-none">
                          <button
                            type="button"
                            title="Paragraph"
                            onClick={() => handleFormat('mouRemarks', 'paragraph', 'document')}
                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-accent hover:text-accent cursor-pointer"
                          >
                            <span className="text-[12px]">¶</span> Paragraph
                          </button>
                          <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                          <button
                            type="button"
                            title="Bullet List"
                            onClick={() => handleFormat('mouRemarks', 'bullets', 'document')}
                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                          >
                            <span className="text-[11px]">≡</span> Bullet List
                          </button>
                          <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                          <button
                            type="button"
                            title="Number List"
                            onClick={() => handleFormat('mouRemarks', 'numbers', 'document')}
                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                          >
                            <span className="text-[11px]">≡</span> Number List
                          </button>
                          <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                          <button
                            type="button"
                            title="Bold"
                            onClick={() => handleFormat('mouRemarks', 'bold', 'document')}
                            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                          >
                            <span className="font-black text-[12px]">B</span> Bold
                          </button>
                        </div>
                        <textarea
                          name="mouRemarks"
                          rows="2"
                          value={mouFormData.remarks}
                          onChange={(e) => setMouFormData({ ...mouFormData, remarks: e.target.value })}
                          placeholder="Any notes about this MOU version..."
                          className="w-full bg-bg-input border-2 border-border rounded-b-xl !rounded-t-none !border-t-0 px-5 py-4 text-xs font-black text-text-primary outline-none focus:border-accent min-h-[80px]"
                        ></textarea>
                      </div>

                      <div className="flex gap-4">
                        <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-4 px-10 rounded-xl shadow-lg shadow-orange-900/20 text-[10px] uppercase tracking-[0.25em] transition-all active:scale-95">
                          {editingDoc ? 'Update Document' : 'Submit'}
                        </button>
                        {editingDoc && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDoc(null);
                              setMouFormData({
                                mouType: 'Legal Notice',
                                otherType: '',
                                mouDate: '',
                                signatoryName: '',
                                remarks: '',
                                fileLink: ''
                              });
                              setMouUploadKey(prev => prev + 1);
                            }}
                            className="bg-bg-card hover:bg-bg-secondary text-text-primary border border-border font-black py-4 px-10 rounded-xl text-[10px] uppercase tracking-[0.25em] transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
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
                              let label = doc.docType || 'DOCUMENT';
                              let colorClass = 'bg-bg-secondary text-text-muted';
                              let Icon = FileText;

                              const typeLower = (doc.docType || '').toLowerCase();

                              if (typeLower.includes('mou') || typeLower.includes('agreement')) {
                                colorClass = 'bg-yellow-soft text-yellow';
                              } else if (typeLower.includes('email') || typeLower.includes('whatsapp')) {
                                colorClass = 'bg-blue-soft text-blue';
                                Icon = typeLower.includes('email') ? Mail : MessageCircle;
                              } else if (typeLower.includes('legal') || typeLower.includes('police') || typeLower.includes('complaint')) {
                                colorClass = 'bg-red-soft text-red';
                              } else if (typeLower.includes('payment') || typeLower.includes('refund') || typeLower.includes('receipt') || typeLower.includes('finance')) {
                                colorClass = 'bg-green-soft text-green';
                              }

                              // Enhanced Date Logic
                              const getDisplayDate = () => {
                                const dateSources = [doc.docDate, doc.uploadDate, doc.createdAt];
                                for (let src of dateSources) {
                                  if (src) {
                                    const d = new Date(src);
                                    if (!isNaN(d.getTime())) return format(d, 'dd MMM yy');
                                  }
                                }
                                // Fallback: Try to extract from remarks "(Date: YYYY-MM-DD)"
                                const match = doc.remarks?.match(/\(Date: (\d{4}-\d{2}-\d{2})\)/);
                                if (match) {
                                  const d = new Date(match[1]);
                                  if (!isNaN(d.getTime())) return format(d, 'dd MMM yy');
                                }
                                return '--';
                              };

                              return (
                                <tr key={doc.id || doc._id} className="hover:bg-bg-input/50 transition-all group border-b border-border last:border-0">
                                  <td className="px-4 py-4 font-mono text-[9px] text-accent font-black">
                                    {doc.docId || '---'}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                      <Icon size={12} className="text-text-muted" />
                                      <span className="text-[10px] font-bold text-text-primary truncate max-w-[120px]" title={doc.fileLink?.split('/').pop()}>
                                        {doc.fileLink?.split('/').pop() || doc.fileSummary || 'No Name'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${colorClass}`}>
                                      {label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-[9px] font-bold text-text-muted whitespace-nowrap">
                                    {getDisplayDate()}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="text-[9px] text-text-secondary line-clamp-2 max-w-[150px]" title={doc.remarks}>
                                      {doc.remarks || '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-right pr-6">
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPreviewFileUrl(doc.fileLink);
                                          setPreviewFileName(doc.fileLink?.split('/').pop() || doc.fileSummary || 'Document');
                                        }}
                                        className="bg-accent-soft hover:bg-accent text-accent hover:text-white p-2 rounded-lg transition-all inline-flex items-center justify-center active:scale-95"
                                        title="View Document"
                                      >
                                        <Eye size={12} />
                                      </button>
                                      {['Admin', 'Super Admin', 'SuperAdmin', 'BD Head'].includes(user?.role) && (
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditDoc(doc)}
                                          className="bg-bg-secondary hover:bg-accent-soft text-text-primary hover:text-accent p-2 rounded-lg border border-border hover:border-accent-soft transition-all inline-flex items-center justify-center"
                                          title="Edit Document"
                                        >
                                          <Edit3 size={12} />
                                        </button>
                                      )}
                                      {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDocument(doc.id || doc._id)}
                                          className="bg-red-soft hover:bg-red text-red hover:text-white p-2 rounded-lg border border-transparent transition-all inline-flex items-center justify-center"
                                          title="Delete Document"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
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
                          onUploadSuccess={(url) => setActionLogFormData(prev => ({ ...prev, attachment: url }))}
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
                              <tr key={log.id || log._id} className="hover:bg-bg-input/50 transition-colors">
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
                    <h3 className="text-xs font-black text-black uppercase tracking-widest">Update Case Progress</h3>
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
                        const stageOrder = ['Case Logged', 'Assigned', 'Analysis', 'Negotiation', 'Settlement', 'Closure'];
                        const newStage = e.target.value;

                        // Custom percentages for smoother tracking
                        const percentages = {
                          'Case Logged': 10,
                          'Assigned': 25,
                          'Analysis': 40,
                          'Negotiation': 60,
                          'Settlement': 85,
                          'Closure': 100
                        };
                        const newPercentage = percentages[newStage] || 0;
                        const updatedChecklist = buildChecklistForStage(newStage);

                        setProgressFormData({
                          ...progressFormData,
                          stage: newStage,
                          percentage: newPercentage
                        });
                        setChecklist(updatedChecklist);
                      }}
                    >
                      {['Case Logged', 'Assigned', 'Analysis', 'Negotiation', 'Settlement', 'Closure'].map((opt) => {
                        const stages = ['Case Logged', 'Assigned', 'Analysis', 'Negotiation', 'Settlement', 'Closure'];
                        const originalStage = caseProgressLogs[0]?.stage || 'Case Logged';

                        // Enforce forward-only progression by locking any stages strictly before the case's current stage
                        const isDisabled = stages.indexOf(opt) < stages.indexOf(originalStage);

                        return (
                          <option key={opt} value={opt} disabled={isDisabled}>
                            {opt} {isDisabled ? '🔒 (Locked)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1 after:content-['*'] after:text-red after:ml-0.5">UPDATE SUMMARY</label>
                    {/* Formatting Toolbar */}
                    <div className="flex items-center bg-bg-card border border-border rounded-t-xl px-3 py-2 gap-0 overflow-x-auto scrollbar-none">
                      <button
                        type="button"
                        title="Paragraph"
                        onClick={() => handleFormat('progressSummary', 'paragraph', 'progress')}
                        className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-accent hover:text-accent cursor-pointer"
                      >
                        <span className="text-[12px]">¶</span> Paragraph
                      </button>
                      <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                      <button
                        type="button"
                        title="Bullet List"
                        onClick={() => handleFormat('progressSummary', 'bullets', 'progress')}
                        className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                      >
                        <span className="text-[11px]">≡</span> Bullet List
                      </button>
                      <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                      <button
                        type="button"
                        title="Number List"
                        onClick={() => handleFormat('progressSummary', 'numbers', 'progress')}
                        className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                      >
                        <span className="text-[11px]">≡</span> Number List
                      </button>
                      <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                      <button
                        type="button"
                        title="Bold"
                        onClick={() => handleFormat('progressSummary', 'bold', 'progress')}
                        className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                      >
                        <span className="font-black text-[12px]">B</span> Bold
                      </button>
                    </div>
                    <textarea
                      name="progressSummary"
                      value={progressFormData.summary}
                      onChange={(e) => setProgressFormData({ ...progressFormData, summary: e.target.value })}
                      placeholder="What has been done? What's the current status?"
                      className="w-full bg-bg-input border-2 border-border rounded-b-xl !rounded-t-none !border-t-0 px-5 py-3 text-xs font-black text-text-primary focus:border-accent outline-none transition-all h-20 resize-none shadow-sm"
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

                  <div className="space-y-1">
                    <FileUpload
                      onUploadSuccess={(url) => setProgressFormData(prev => ({ ...prev, attachment: url }))}
                      label="Upload Document"
                    />
                    {progressFormData.attachment && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-soft rounded-lg mt-1 justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip size={14} className="text-blue shrink-0" />
                          <span className="text-[10px] font-black text-blue truncate">{progressFormData.attachment.split('/').pop()}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <a href={progressFormData.attachment} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue hover:underline uppercase tracking-widest">View</a>
                          <button
                            type="button"
                            onClick={() => setProgressFormData(prev => ({ ...prev, attachment: '' }))}
                            className="text-[9px] font-bold text-red hover:text-red-700 hover:underline uppercase tracking-widest"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {progressFormData.stage === 'Closure' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer bg-bg-input px-5 py-[15px] rounded-xl border-2 border-border hover:border-accent transition-all shadow-sm">
                          <input
                            type="checkbox"
                            checked={progressFormData.compliancePending || false}
                            onChange={(e) => setProgressFormData({ ...progressFormData, compliancePending: e.target.checked })}
                            className="w-4 h-4 accent-accent rounded"
                          />
                          <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">Mark Compliance As Due</span>
                        </label>
                      </div>
                    </div>
                  )}

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
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">FORWARDED TO</label>
                      <select
                        value={progressFormData.escalateTo}
                        onChange={(e) => setProgressFormData({ ...progressFormData, escalateTo: e.target.value })}
                        className="w-full bg-bg-input border-2 border-border rounded-xl px-5 py-3.5 text-xs font-black text-text-primary outline-none focus:border-accent uppercase tracking-widest"
                      >
                        <option value="">-- NO ESCALATION --</option>
                        {opsUsers.filter(u => ['operations', 'admin', 'legal', 'advocate', 'operation admin', 'operation review', 'bd head'].includes(u.role?.toLowerCase()?.trim())).map(u => (
                          <option key={`escalate-${u._id || u.email}`} value={u.fullName}>{u.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button type="submit" className="bg-accent hover:bg-accent-hover text-white font-black py-4 px-10 rounded-xl shadow-lg shadow-orange-900/20 text-[10px] uppercase tracking-[0.25em] transition-all active:scale-95">
                      {editingProgress ? 'Update Progress' : 'Submit'}
                    </button>
                    {editingProgress && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProgress(null);
                          setProgressFormData({
                            stage: 'Case Logged',
                            percentage: 20,
                            summary: '',
                            nextAction: '',
                            blockers: '',
                            followUpDate: '',
                            escalateTo: '',
                            refundedAmount: '',
                            savedAmount: '',
                            compliancePending: false,
                            attachment: ''
                          });
                        }}
                        className="bg-bg-card hover:bg-bg-secondary text-text-primary border border-border font-black py-4 px-10 rounded-xl text-[10px] uppercase tracking-[0.25em] transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
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
                              {log.uploadDate || log.createdAt ? format(new Date(log.uploadDate || log.createdAt), 'dd MMM yy') : '--'}
                            </div>
                            <p className="text-[11px] font-bold text-text-secondary leading-relaxed mb-1">{log.summary}</p>
                            {log.nextAction && (
                              <div className="text-[10px] font-black text-purple uppercase tracking-widest mt-1">
                                Next Action: {log.nextAction}
                              </div>
                            )}
                            {log.escalateTo && (
                              <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">
                                Forwarded To: {log.escalateTo}
                              </div>
                            )}
                            {(log.refundedAmount !== undefined && log.refundedAmount !== null && log.refundedAmount !== '' && Number(log.refundedAmount) !== 0) && (
                              <div className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-1">
                                Refunded Amount: ₹{Number(log.refundedAmount).toLocaleString('en-IN')}
                              </div>
                            )}
                            {(log.savedAmount !== undefined && log.savedAmount !== null && log.savedAmount !== '' && Number(log.savedAmount) !== 0) && (
                              <div className="text-[10px] font-black text-blue uppercase tracking-widest mt-1">
                                Saved Amount: ₹{Number(log.savedAmount).toLocaleString('en-IN')}
                              </div>
                            )}
                            <div className="text-[9px] font-black text-accent uppercase tracking-widest opacity-80 mt-1 flex items-center justify-between">
                              <span>Updated by: {log.updatedBy === user?.email ? 'You' : log.updatedBy?.split('@')[0] || 'System'}</span>
                              {['Admin', 'Super Admin', 'SuperAdmin'].includes(user?.role) && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditProgress(log)}
                                  className="text-text-primary hover:text-accent font-black uppercase tracking-widest flex items-center gap-1 hover:underline cursor-pointer"
                                  title="Edit Progress Log"
                                >
                                  <Edit3 size={10} /> Edit
                                </button>
                              )}
                            </div>
                            {log.attachment && (
                              <div className="mt-2">
                                {log.attachment.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i) ? (
                                  <a href={log.attachment} target="_blank" rel="noopener noreferrer">
                                    <img src={log.attachment} alt="Progress Attachment" className="max-h-32 object-contain rounded border-2 border-border/50 hover:border-accent/50 transition-colors shadow-sm" />
                                  </a>
                                ) : (
                                  <a
                                    href={log.attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] font-black text-blue hover:underline uppercase tracking-widest flex items-center gap-1"
                                  >
                                    <Paperclip size={12} className="text-blue" /> View Document
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
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
                      {groupedHistory.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-20 text-center text-text-muted text-[10px] font-black uppercase tracking-widest">
                            No history records found
                          </td>
                        </tr>
                      ) : (
                        groupedHistory.map((log) => {
                          let typeColor = 'border-green text-green bg-green-soft/20';

                          switch (log.type) {
                            case 'DOCUMENT':
                              typeColor = 'border-blue text-blue bg-blue-soft/20';
                              break;
                            case 'COMMUNICATION':
                              typeColor = 'border-purple text-purple-400 bg-purple-soft/20';
                              break;
                            case 'PROGRESS':
                              typeColor = 'border-accent text-accent bg-accent-soft/20';
                              break;
                            case 'ACTION':
                              typeColor = 'border-yellow text-yellow bg-yellow-soft/20';
                              break;
                            case 'SYSTEM':
                              typeColor = 'border-green text-green bg-green-soft/20';
                              break;
                            default:
                              typeColor = 'border-text-muted text-text-muted bg-bg-secondary';
                          }

                          return (
                            <tr key={log.id || Math.random()} className="hover:bg-bg-input/50 transition-colors">
                              <td className="px-6 py-4 text-[10px] font-black text-text-muted">
                                {(() => {
                                  try {
                                    const d = new Date(log.date);
                                    return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd MMM HH:mm');
                                  } catch (e) {
                                    return 'N/A';
                                  }
                                })()}
                              </td>
                              <td className="px-6 py-4 text-[11px] font-bold text-text-primary uppercase tracking-tight">
                                {log.action}
                              </td>
                              <td className="px-6 py-4 text-[10px] text-text-secondary leading-relaxed max-w-md break-all">
                                {log.changes ? (
                                  <div className="space-y-2">
                                    <div
                                      className="flex items-center gap-2 cursor-pointer hover:text-accent transition-all font-black text-[11px] uppercase tracking-widest group/expand"
                                      onClick={(e) => { e.stopPropagation(); toggleRow(log.id); }}
                                    >
                                      <span className="border-b border-dotted border-text-muted group-hover/expand:border-accent">{log.details}</span>
                                      {expandedRows[log.id] ? <ChevronDown size={14} className="text-accent" /> : <ChevronRight size={14} />}
                                    </div>
                                    {expandedRows[log.id] && (
                                      <div className="mt-3 space-y-4 border-l-2 border-accent/20 pl-4 py-2 bg-bg-secondary/30 rounded-r-xl animate-in slide-in-from-top-2 duration-300">
                                        {log.changes.map((change, i) => (
                                          <div key={i} className="space-y-1.5">
                                            <div className="text-[10px] font-black text-accent uppercase tracking-widest">{change.field}</div>
                                            <div className="flex items-center gap-2 text-[10px] font-semibold text-text-primary">
                                              <span className="px-2 py-0.5 bg-red-soft/20 text-red rounded-md border border-red/10 truncate max-w-[150px]">{change.old || 'Empty'}</span>
                                              <span className="text-text-muted opacity-50">→</span>
                                              <span className="px-2 py-0.5 bg-green-soft/20 text-green rounded-md border border-green/10 truncate max-w-[150px]">{change.new || 'Empty'}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : log.fieldChanged ? (
                                  <div className="space-y-1.5">
                                    <div className="text-[11px] font-black text-accent uppercase tracking-widest">{log.fieldChanged}</div>
                                    <div className="flex items-center gap-2 text-[10px] font-semibold text-text-primary">
                                      <span className="px-2 py-0.5 bg-red-soft/20 text-red rounded-md border border-red/10 truncate max-w-[150px]">{log.oldValue || 'Empty'}</span>
                                      <span className="text-text-muted opacity-50">→</span>
                                      <span className="px-2 py-0.5 bg-green-soft/20 text-green rounded-md border border-green/10 truncate max-w-[150px]">{log.newValue || 'Empty'}</span>
                                    </div>
                                  </div>
                                ) : (
                                  log.details
                                )}
                              </td>
                              <td className="px-6 py-4 text-[10px] font-bold text-text-primary">
                                {log.user?.split('@')[0] || 'System'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${typeColor}`}>
                                  {log.type}
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
          ) : activeDetailTab === 'Legal Process' ? (() => {
            const cyclesInfo = getCyclesInfo(legalProcessHistory);
            const currentCycle = cyclesInfo.currentCycle;
            const activeCycle = selectedCycleToView || currentCycle;
            const isViewingPastCycle = activeCycle !== currentCycle;
            const { cycleRequests, cycleHistory } = getCycleFilteredData(legalProcessHistory, legalRequests, activeCycle);
            const isStageAlreadyFilled = (() => {
              const stage = legalProcessForm.stage;
              if (stage === 'Case Study') return cycleHistory.some(h => h.stage === 'Case Study');
              if (stage === 'Draft') return cycleRequests.some(r => r.status !== 'Rejected');
              if (stage === 'Pack & AD ready') return cycleHistory.some(h => h.stage === 'Pack & AD ready');
              if (stage === 'Courier Sent') return cycleHistory.some(h => h.stage === 'Courier Sent');
              if (stage === 'Reply Received') return cycleHistory.some(h => h.stage === 'Reply Received');
              return false;
            })();
            const canEditLegal = ['Admin', 'Super Admin', 'SuperAdmin', 'Legal'].includes(user?.role);

            return (
              <>
                <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                  {/* Stages Visual Progress Bar */}
                  <div className="bg-bg-card rounded-2xl border-2 border-border p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-text-primary">Legal Process Pipeline</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
                        {/* Add New Notice Cycle Button – restricted to Legal & Admin */}
                        {canEditLegal && getActiveStageOfCase(legalProcessHistory, legalRequests, currentCycle) === 'Reply Received' &&
                          getStageStatus('Reply Received', 'Reply Received', legalProcessHistory, legalRequests, currentCycle).isCompleted && (
                            <button
                              type="button"
                              onClick={async () => {
                                const nextCycle = currentCycle + 1;
                                const loadingToast = toast.loading(`Starting Notice Cycle #${nextCycle}...`);
                                try {
                                  await api.post('/legal-process', {
                                    caseId: viewCase.caseId,
                                    stage: 'New Cycle Started',
                                    summary: `Notice Cycle ${nextCycle} Started`
                                  });
                                  toast.success(`Notice Cycle #${nextCycle} started successfully!`, { id: loadingToast });
                                  setSelectedCycleToView(nextCycle);
                                  fetchLegalProcessData(viewCase.caseId);
                                } catch (err) {
                                  console.error('Failed to start new notice cycle:', err);
                                  toast.error('Failed to start new notice cycle', { id: loadingToast });
                                }
                              }}
                              className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                            >
                              <span>+ Add New Notice Cycle</span>
                            </button>
                          )}

                        {/* Cycle Selector */}
                        {currentCycle > 1 && (
                          <div className="flex items-center gap-1 bg-bg-secondary p-1 border border-border rounded-xl">
                            {Array.from({ length: currentCycle }, (_, i) => i + 1).map(cNum => {
                              const isSel = activeCycle === cNum;
                              return (
                                <button
                                  type="button"
                                  key={cNum}
                                  onClick={() => setSelectedCycleToView(cNum)}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${isSel
                                      ? 'bg-accent text-white shadow-sm font-black'
                                      : 'text-text-muted hover:text-text-primary font-bold'
                                    }`}
                                >
                                  Cycle {cNum} {cNum === currentCycle && ' (Active)'}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Cancel Current Notice Cycle */}
                        {!isViewingPastCycle && currentCycle > 1 && (
                          <button
                            type="button"
                            onClick={async () => {
                              const cycleStartRecord = [...legalProcessHistory].find(h => h.stage === 'New Cycle Started');
                              if (!cycleStartRecord) return;

                              if (window.confirm(`Are you sure you want to cancel Notice Cycle #${currentCycle}? This will revert the pipeline back to the previous cycle.`)) {
                                const loadingToast = toast.loading(`Canceling Notice Cycle #${currentCycle}...`);
                                try {
                                  await api.delete(`/legal-process/${cycleStartRecord.id || cycleStartRecord._id}`);
                                  toast.success(`Notice Cycle #${currentCycle} canceled successfully!`, { id: loadingToast });
                                  setSelectedCycleToView(1);
                                  fetchLegalProcessData(viewCase.caseId);
                                } catch (err) {
                                  console.error('Failed to cancel notice cycle:', err);
                                  toast.error('Failed to cancel notice cycle', { id: loadingToast });
                                }
                              }
                            }}
                            className="px-3 py-1.5 bg-red-soft/20 text-red border border-red/10 hover:bg-red hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                          >
                            ❌ Cancel Cycle
                          </button>
                        )}

                        <div className="px-3 py-1 bg-accent-soft/10 border border-accent/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-accent">
                          Current stage: {legalProcessForm.stage}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10">
                      {/* Connected line progress bar (Desktop) */}
                      <div className="hidden lg:block absolute top-[28px] left-[8%] right-[8%] h-1 bg-bg-secondary rounded-full -z-10 overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-500"
                          style={{
                            width: `${getProgressBarWidth(legalProcessHistory, legalRequests, activeCycle)}%`
                          }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 relative">
                        {[
                          'Case Study',
                          'Draft',
                          'Draft Approved',
                          'Pack & AD ready',
                          'Courier Sent',
                          'Reply Received'
                        ].map((stageName, idx, arr) => {
                          const activeCaseStage = getActiveStageOfCase(legalProcessHistory, legalRequests, activeCycle);
                          const { isCompleted, isActive } = getStageStatus(stageName, activeCaseStage, legalProcessHistory, legalRequests, activeCycle);
                          const isSelected = legalProcessForm.stage === stageName;

                          return (
                            <button
                              type="button"
                              key={stageName}
                              onClick={() => setLegalProcessForm(prev => ({ ...prev, stage: stageName }))}
                              className="flex flex-col items-center text-center focus:outline-none group transition-transform duration-200 active:scale-95"
                            >
                              {/* Circle Badge */}
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-black border-4 transition-all duration-300 relative ${isSelected
                                  ? 'bg-bg-card border-accent text-accent shadow-md shadow-accent/10 ring-4 ring-accent-soft/10 scale-110 z-10'
                                  : isCompleted
                                    ? 'bg-accent border-accent text-white shadow-sm'
                                    : isActive
                                      ? 'bg-bg-card border-orange-500 text-orange-500 shadow-md shadow-orange-500/10 scale-105 z-10'
                                      : 'bg-bg-secondary border-border text-text-muted group-hover:border-text-secondary group-hover:text-text-primary'
                                  }`}
                              >
                                {isCompleted ? (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span>0{idx + 1}</span>
                                )}

                                {/* Floating radar ring on active/selected stage */}
                                {isActive && (
                                  <span className="absolute -inset-1 rounded-full border border-orange-500 animate-ping opacity-30"></span>
                                )}
                                {isSelected && !isActive && (
                                  <span className="absolute -inset-1 rounded-full border border-accent animate-pulse opacity-30"></span>
                                )}
                              </div>

                              {/* Typography labels */}
                              <div className="mt-3 flex flex-col gap-0.5">
                                <span
                                  className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-accent' : isCompleted ? 'text-accent' : isActive ? 'text-orange-500' : 'text-text-muted group-hover:text-text-secondary'
                                    }`}
                                >
                                  Step {idx + 1}
                                </span>
                                <span
                                  className={`text-[10px] font-black uppercase tracking-wider transition-colors ${isSelected ? 'text-text-primary' : isActive ? 'text-orange-500 font-bold' : 'text-text-secondary group-hover:text-text-primary'
                                    }`}
                                >
                                  {stageName}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Side: Submit Form / Information */}
                    <div className="lg:col-span-7 bg-bg-card rounded-2xl border-2 border-border p-6 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-primary mb-6 flex items-center gap-2 pb-3 border-b border-border">
                        <span>📝 Stage:</span>
                        <span className="text-accent">{legalProcessForm.stage}</span>
                      </h3>

                      {/* Stage Selector Dropdown - restricted to authorized roles */}
                      <div className="mb-6">
                        <label className={labelClass}>Select Stage</label>
                        <select
                          value={legalProcessForm.stage}
                          disabled={!canEditLegal}
                          onChange={canEditLegal ? (e) => setLegalProcessForm(prev => ({ ...prev, stage: e.target.value })) : undefined}
                          className={`${inputClass} ${!canEditLegal ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <option value="Case Study">Case Study</option>
                          <option value="Draft">Draft</option>
                          <option value="Draft Approved">Draft Approved</option>
                          <option value="Pack & AD ready">Pack & AD ready</option>
                          <option value="Courier Sent">Courier Sent</option>
                          <option value="Reply Received">Reply Received</option>
                        </select>
                      </div>

                      {/* View-only notice for non-authorized users */}
                      {!canEditLegal && (
                        <div className="p-4 bg-bg-secondary/60 border border-border/80 rounded-xl text-center text-text-muted mb-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-text-primary">👁️ View Only</p>
                          <p className="text-[9px] mt-1 leading-relaxed">Only <span className="text-accent font-bold">Legal</span> and <span className="text-accent font-bold">Admin</span> users can add or update Legal Process stages.</p>
                        </div>
                      )}

                      {legalProcessForm.stage === 'Draft' ? (
                        <div className="space-y-6 animate-in fade-in duration-300">
                          {/* Submit New Draft Request Form */}
                          {!canEditLegal ? (
                            <div className="p-8 text-center bg-bg-secondary/40 border border-dashed border-border/80 rounded-2xl">
                              <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">View Only</p>
                              <p className="text-[9px] mt-1 text-text-muted">You do not have permission to submit draft requests.</p>
                            </div>
                          ) : isViewingPastCycle ? (
                            <div className="p-4 bg-bg-secondary/40 border border-border/80 rounded-xl text-center text-text-muted">
                              <p className="text-[10px] font-black uppercase tracking-wider">Viewing Past Cycle History</p>
                              <p className="text-[9px] mt-1">Creation of new draft requests is only available in the active cycle.</p>
                            </div>
                          ) : isStageAlreadyFilled ? (
                            <div className="p-8 text-center bg-accent/[0.02] border-2 border-dashed border-accent/20 rounded-2xl animate-in fade-in duration-300">
                              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-lg mx-auto mb-3">📝</div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-text-primary">Stage Already Submitted</h4>
                              <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                                The details for <span className="text-accent font-bold">{legalProcessForm.stage}</span> have already been filled in this cycle.
                              </p>
                              <p className="text-[9px] text-text-muted mt-1">
                                To update the information, please click the <strong className="text-accent">Edit</strong> button next to this stage in the <strong className="text-text-primary">Stage History</strong> section on the right.
                              </p>
                            </div>
                          ) : (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!draftDocName) {
                                  toast.error('Please enter a Document Name');
                                  return;
                                }
                                if (isDraftSubmitting) return;
                                setIsDraftSubmitting(true);
                                try {
                                  const payload = {
                                    caseId: viewCase.caseId,
                                    documentName: draftDocName,
                                    fileLink: draftFileLink,
                                    remark: draftRemark
                                  };
                                  await api.post('/legal-requests', payload);
                                  toast.success('Legal draft request submitted for approval');
                                  setDraftDocName('');
                                  setDraftFileLink('');
                                  setDraftRemark('');
                                  fetchLegalRequests();
                                  if (viewCase?.caseId) {
                                    fetchLegalProcessData(viewCase.caseId);
                                  }
                                } catch (err) {
                                  console.error(err);
                                  toast.error('Failed to submit draft request');
                                } finally {
                                  setIsDraftSubmitting(false);
                                }
                              }}
                              className="space-y-6"
                            >
                              <div className="text-[11px] font-black uppercase tracking-wider text-text-muted mb-4 border-b border-border/50 pb-2">
                                Submit New Draft Request
                              </div>

                              <div>
                                <label className={labelClass}>Document Name</label>
                                <input
                                  type="text"
                                  required
                                  value={draftDocName}
                                  onChange={(e) => setDraftDocName(e.target.value)}
                                  placeholder="e.g. Legal Notice Draft"
                                  className={inputClass}
                                />
                              </div>

                              <div>
                                <label className={labelClass}>Upload Document</label>
                                <div className="mt-1">
                                  <input
                                    type="file"
                                    id="legal-draft-file-input-tab"
                                    onChange={handleLegalDraftUpload}
                                    onClick={(e) => (e.target.value = null)}
                                    className="hidden"
                                  />
                                  {!draftFileLink && !draftFileUploading && (
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById('legal-draft-file-input-tab').click()}
                                      className="w-full flex items-center justify-center gap-2.5 px-4 py-6 border-2 border-dashed border-border hover:border-accent bg-bg-secondary hover:bg-bg-secondary/70 text-text-secondary hover:text-accent rounded-2xl transition-all cursor-pointer group"
                                    >
                                      <UploadCloud size={20} className="text-text-muted group-hover:text-accent transition-colors" />
                                      <span className="text-xs font-black uppercase tracking-wider">Choose or Upload Document</span>
                                    </button>
                                  )}
                                  {draftFileUploading && (
                                    <div className="w-full flex items-center justify-center gap-3 px-4 py-6 border border-border bg-bg-secondary rounded-2xl animate-pulse">
                                      <RefreshCw size={20} className="animate-spin text-accent" />
                                      <span className="text-xs font-black uppercase tracking-wider text-text-muted">Uploading document...</span>
                                    </div>
                                  )}
                                  {draftFileLink && (
                                    <div className="w-full flex items-center justify-between gap-4 p-4 bg-green-500/[0.03] border-2 border-green/20 rounded-2xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-green-soft text-green rounded-xl">
                                          <FileText size={18} />
                                        </div>
                                        <div className="text-left">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-green block">Document Uploaded</span>
                                          <span className="text-xs font-bold text-text-primary">Draft Document Attached</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <a
                                          href={draftFileLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
                                        >
                                          View File
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDraftFileLink('');
                                            document.getElementById('legal-draft-file-input-tab').value = '';
                                          }}
                                          className="px-3.5 py-1.5 bg-red-soft/20 text-red border border-red/10 hover:bg-red hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <label className={labelClass}>Remark</label>
                                <input
                                  type="text"
                                  placeholder="Any remarks..."
                                  value={draftRemark}
                                  onChange={(e) => setDraftRemark(e.target.value)}
                                  className={inputClass}
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={draftFileUploading || isDraftSubmitting}
                                className={`w-full bg-accent text-white font-black py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-[0.98] ${
                                  isDraftSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent-hover'
                                }`}
                              >
                                {isDraftSubmitting ? 'Submitting...' : 'Submit Request'}
                              </button>
                            </form>
                          )}

                          {/* Pending Requests Section */}
                          <div className="mt-8 border-t border-border pt-6 space-y-4">
                            <button
                              type="button"
                              onClick={() => setIsPendingRequestsExpanded(!isPendingRequestsExpanded)}
                              className="w-full flex items-center justify-between text-left focus:outline-none py-2 hover:opacity-80 transition-all"
                            >
                              <h4 className="text-[11px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                                <span>Pending / Rejected Requests ({legalRequests.filter(r => r.caseId === viewCase.caseId && getCycleNumberForItem(r, legalProcessHistory) === activeCycle && (r.status === 'Pending BD Head' || r.status === 'Pending' || r.status === 'Rejected')).length})</span>
                              </h4>
                              <ChevronDown
                                size={16}
                                className={`text-text-muted transition-transform duration-300 ${isPendingRequestsExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {isPendingRequestsExpanded && (
                              <div className="space-y-4 animate-in fade-in duration-300">
                                {legalRequests.filter(r => r.caseId === viewCase.caseId && getCycleNumberForItem(r, legalProcessHistory) === activeCycle && (r.status === 'Pending BD Head' || r.status === 'Pending' || r.status === 'Rejected')).length === 0 ? (
                                  <p className="text-[10px] text-text-muted italic">No pending or rejected draft requests for this cycle.</p>
                                ) : (
                                  <div className="space-y-4">
                                    {legalRequests.filter(r => r.caseId === viewCase.caseId && getCycleNumberForItem(r, legalProcessHistory) === activeCycle && (r.status === 'Pending BD Head' || r.status === 'Pending' || r.status === 'Rejected')).map(r => (
                                      <div key={r.id || r._id} className="p-4 bg-bg-secondary/40 border border-border rounded-xl space-y-3 shadow-sm">
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="font-bold text-text-primary text-xs">{r.documentName}</span>
                                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                            r.status === 'Rejected' ? 'bg-red-soft text-red' : 
                                            r.status === 'Pending' ? 'bg-blue-soft text-blue' : 
                                            'bg-orange-100 text-orange-600'
                                          }`}>
                                            {r.status === 'Pending' ? 'Forwarded to Admin' : r.status}
                                          </span>
                                        </div>
                                        {r.remark && <p className="text-[10px] text-text-secondary">Remark: {r.remark}</p>}
                                        {r.status === 'Rejected' && r.rejectRemark && (
                                          <p className="text-[10px] text-red font-semibold">Rejection Reason: {r.rejectRemark}</p>
                                        )}
                                        {r.fileLink && (
                                          <a href={r.fileLink} target="_blank" rel="noreferrer" className="text-accent hover:underline text-[10px] font-bold block">
                                            Download / View File
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : legalProcessForm.stage === 'Draft Approved' ? (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-text-muted">
                            Approved Drafts ({legalRequests.filter(r => r.caseId === viewCase.caseId && getCycleNumberForItem(r, legalProcessHistory) === activeCycle && r.status === 'Approved').length})
                          </h4>
                          {legalRequests.filter(r => r.caseId === viewCase.caseId && getCycleNumberForItem(r, legalProcessHistory) === activeCycle && r.status === 'Approved').length === 0 ? (
                            <div className="p-8 text-center bg-bg-secondary/40 border border-border border-dashed rounded-xl text-text-muted text-xs">
                              No approved drafts found.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {legalRequests.filter(r => r.caseId === viewCase.caseId && getCycleNumberForItem(r, legalProcessHistory) === activeCycle && r.status === 'Approved').map(r => (
                                <div key={r.id || r._id} className="p-5 bg-bg-secondary/40 border-2 border-border rounded-xl space-y-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <h5 className="font-bold text-text-primary text-sm">{r.documentName}</h5>
                                      <p className="text-[9px] text-text-muted mt-1">Requested by: {r.requestedByName || r.requestedBy}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-soft text-green`}>
                                      {r.status}
                                    </span>
                                  </div>

                                  {r.remark && (
                                    <div className="bg-bg-card p-3 rounded-lg border border-border text-[10px] text-text-secondary">
                                      <span className="block font-black text-text-muted uppercase tracking-wider mb-1">User Remark:</span>
                                      {r.remark}
                                    </div>
                                  )}

                                  {r.rejectRemark && (
                                    <div className="bg-red-soft/10 p-3 rounded-lg border border-red-soft/20 text-[10px] text-red">
                                      <span className="block font-black uppercase tracking-wider mb-1">Admin Remark / Rejection Reason:</span>
                                      {r.rejectRemark}
                                    </div>
                                  )}

                                  {r.fileLink && (
                                    <div className="flex items-center gap-2 pt-2">
                                      <a
                                        href={r.fileLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                                      >
                                        View / Download Document
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleLegalProcessSubmit} className="space-y-6">
                          {/* Case Study Specific Checkboxes */}
                          {legalProcessForm.stage === 'Case Study' && (
                            <div className="space-y-4 bg-bg-secondary/40 p-5 rounded-xl border border-border">
                              <label className={labelClass}>Document Review Checklist</label>
                              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-4">
                                Please verify and check the documents read related to the case:
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(() => {
                                  const items = [
                                    { key: 'mouDocChecked', label: 'MOU Doc' },
                                    { key: 'invoicesChecked', label: 'Invoices' },
                                    { key: 'caseStudyDocChecked', label: 'Case Study Doc' }
                                  ];
                                  const compType = (viewCase?.typeOfComplaint || '').trim();
                                  if (compType === 'Legal Notice') {
                                    items.push({ key: 'paymentReceiptChecked', label: 'Legal Notice Doc' });
                                  } else if (compType === '1930 Cyber Complaint') {
                                    items.push({ key: 'paymentReceiptChecked', label: '1930 Cyber Complaint Doc' });
                                  } else if (compType === 'Consumer Complaint') {
                                    items.push({ key: 'paymentReceiptChecked', label: 'Consumer Complaint Doc' });
                                  } else if (['Criminal Complaint/FIR', 'FIR'].includes(compType)) {
                                    items.push({ key: 'paymentReceiptChecked', label: 'Criminal Complaint/FIR Doc' });
                                  }
                                  return items;
                                })().map(item => {
                                  const getPastCaseStudyChecks = () => {
                                    const histItem = cycleHistory.find(h => h.stage === 'Case Study');
                                    return {
                                      mouDocChecked: histItem ? histItem.mouDocChecked : false,
                                      invoicesChecked: histItem ? histItem.invoicesChecked : false,
                                      paymentReceiptChecked: histItem ? histItem.paymentReceiptChecked : false,
                                      caseStudyDocChecked: histItem ? histItem.caseStudyDocChecked : false
                                    };
                                  };
                                  const checks = isViewingPastCycle ? getPastCaseStudyChecks() : legalProcessForm;
                                  return (
                                    <label
                                      key={item.key}
                                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${checks[item.key]
                                        ? 'bg-accent/5 border-accent text-accent'
                                        : 'bg-bg-input border-border text-text-secondary hover:border-text-primary'
                                        }`}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={isViewingPastCycle}
                                        checked={checks[item.key] || false}
                                        onChange={isViewingPastCycle ? undefined : (e) => setLegalProcessForm(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                        className="w-4 h-4 rounded text-accent focus:ring-accent border-border cursor-pointer accent-accent"
                                      />
                                      <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Pack & AD ready stage form inputs */}
                          {legalProcessForm.stage === 'Pack & AD ready' && (() => {
                            const pastData = getPastStageData('Pack & AD ready') || {};
                            return (
                              <div className="space-y-4 bg-bg-secondary/40 p-5 rounded-xl border border-border">
                                <h5 className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-2">Stage Details: Pack & AD ready</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className={labelClass}>Receiver Name</label>
                                    <input
                                      type="text"
                                      required
                                      disabled={isViewingPastCycle}
                                      placeholder="Enter receiver's name"
                                      value={isViewingPastCycle ? (pastData.receiverName || '') : packReceiverName}
                                      onChange={isViewingPastCycle ? undefined : (e) => setPackReceiverName(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Receiver Address</label>
                                    <input
                                      type="text"
                                      required
                                      disabled={isViewingPastCycle}
                                      placeholder="Enter receiver's address"
                                      value={isViewingPastCycle ? (pastData.receiverAddress || '') : packReceiverAddress}
                                      onChange={isViewingPastCycle ? undefined : (e) => setPackReceiverAddress(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Prepared By (Login User Name)</label>
                                    <input
                                      type="text"
                                      readOnly
                                      disabled
                                      value={isViewingPastCycle ? (pastData.preparedBy || '') : (user?.fullName || user?.email || '')}
                                      className={`${inputClass} bg-bg-secondary cursor-not-allowed`}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Company Address</label>
                                    <input
                                      type="text"
                                      required
                                      disabled={isViewingPastCycle}
                                      placeholder="Enter company address"
                                      value={isViewingPastCycle ? (pastData.companyAddress || '') : packCompanyAddress}
                                      onChange={isViewingPastCycle ? undefined : (e) => setPackCompanyAddress(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div className="col-span-1 md:col-span-2">
                                    <label className={labelClass}>Remark</label>
                                    <textarea
                                      placeholder="Any remarks..."
                                      disabled={isViewingPastCycle}
                                      value={isViewingPastCycle ? (pastData.remark || '') : packRemark}
                                      onChange={isViewingPastCycle ? undefined : (e) => setPackRemark(e.target.value)}
                                      className={`${inputClass} min-h-[80px]`}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Courier Sent stage form inputs */}
                          {legalProcessForm.stage === 'Courier Sent' && (() => {
                            const pastData = getPastStageData('Courier Sent') || {};
                            return (
                              <div className="space-y-4 bg-bg-secondary/40 p-5 rounded-xl border border-border">
                                <h5 className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-2">Stage Details: Courier Sent</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className={labelClass}>Date and Time</label>
                                    <input
                                      type="datetime-local"
                                      required
                                      disabled={isViewingPastCycle}
                                      value={isViewingPastCycle ? (pastData.dateTime || '') : courierDateTime}
                                      onChange={isViewingPastCycle ? undefined : (e) => setCourierDateTime(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Sender Name</label>
                                    <input
                                      type="text"
                                      required
                                      disabled={isViewingPastCycle}
                                      placeholder="Enter sender's name"
                                      value={isViewingPastCycle ? (pastData.senderName || '') : courierSenderName}
                                      onChange={isViewingPastCycle ? undefined : (e) => setCourierSenderName(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Document Name</label>
                                    <input
                                      type="text"
                                      required
                                      disabled={isViewingPastCycle}
                                      placeholder="Enter document name"
                                      value={isViewingPastCycle ? (pastData.documentName || '') : courierDocName}
                                      onChange={isViewingPastCycle ? undefined : (e) => setCourierDocName(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Sender Company Name</label>
                                    <input
                                      type="text"
                                      required
                                      disabled={isViewingPastCycle}
                                      placeholder="Enter sender's company name"
                                      value={isViewingPastCycle ? (pastData.senderCompany || '') : courierSenderCompany}
                                      onChange={isViewingPastCycle ? undefined : (e) => setCourierSenderCompany(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Reply Received stage form inputs */}
                          {legalProcessForm.stage === 'Reply Received' && (() => {
                            const pastData = getPastStageData('Reply Received') || {};
                            const activeReplyFileLink = isViewingPastCycle ? (pastData.replyFileLink || '') : replyFileLink;
                            return (
                              <div className="space-y-4 bg-bg-secondary/40 p-5 rounded-xl border border-border">
                                <h5 className="text-[11px] font-black uppercase tracking-widest text-text-muted mb-2">Stage Details: Reply Received</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className={labelClass}>Date of Reply</label>
                                    <input
                                      type="datetime-local"
                                      required
                                      disabled={isViewingPastCycle}
                                      value={isViewingPastCycle ? (pastData.replyDate || '') : replyDate}
                                      onChange={isViewingPastCycle ? undefined : (e) => setReplyDate(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Replied By</label>
                                    <input
                                      type="text"
                                      required
                                      disabled={isViewingPastCycle}
                                      placeholder="Enter replier's name"
                                      value={isViewingPastCycle ? (pastData.repliedBy || '') : repliedBy}
                                      onChange={isViewingPastCycle ? undefined : (e) => setRepliedBy(e.target.value)}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div className="col-span-1 md:col-span-2">
                                    <label className={labelClass}>Reply Remarks</label>
                                    <textarea
                                      placeholder="Details of the reply received..."
                                      disabled={isViewingPastCycle}
                                      value={isViewingPastCycle ? (pastData.remark || '') : replyRemark}
                                      onChange={isViewingPastCycle ? undefined : (e) => setReplyRemark(e.target.value)}
                                      className={`${inputClass} min-h-[80px]`}
                                    />
                                  </div>
                                  <div className="col-span-1 md:col-span-2">
                                    <label className={labelClass}>Upload Reply Document</label>
                                    <div className="mt-1">
                                      <input
                                        type="file"
                                        id="legal-reply-file-input"
                                        onChange={handleReplyUpload}
                                        onClick={(e) => (e.target.value = null)}
                                        className="hidden"
                                      />
                                      {!activeReplyFileLink && !replyFileUploading && !isViewingPastCycle && (
                                        <button
                                          type="button"
                                          onClick={() => document.getElementById('legal-reply-file-input').click()}
                                          className="w-full flex items-center justify-center gap-2.5 px-4 py-6 border-2 border-dashed border-border hover:border-accent bg-bg-secondary hover:bg-bg-secondary/70 text-text-secondary hover:text-accent rounded-2xl transition-all cursor-pointer group"
                                        >
                                          <UploadCloud size={20} className="text-text-muted group-hover:text-accent transition-colors" />
                                          <span className="text-xs font-black uppercase tracking-wider">Choose or Upload Reply PDF/Doc</span>
                                        </button>
                                      )}
                                      {!activeReplyFileLink && isViewingPastCycle && (
                                        <div className="p-4 bg-bg-secondary/20 border border-border border-dashed rounded-xl text-center text-text-muted text-[10px] font-black uppercase tracking-wider">
                                          No Document Uploaded
                                        </div>
                                      )}
                                      {replyFileUploading && (
                                        <div className="w-full flex items-center justify-center gap-3 px-4 py-6 border border-border bg-bg-secondary rounded-2xl animate-pulse">
                                          <RefreshCw size={20} className="animate-spin text-accent" />
                                          <span className="text-xs font-black uppercase tracking-wider text-text-muted">Uploading reply document...</span>
                                        </div>
                                      )}
                                      {activeReplyFileLink && (
                                        <div className="w-full flex items-center justify-between gap-4 p-4 bg-green-500/[0.03] border-2 border-green/20 rounded-2xl shadow-sm">
                                          <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-green-soft text-green rounded-xl">
                                              <FileText size={18} />
                                            </div>
                                            <div className="text-left">
                                              <span className="text-[10px] font-black uppercase tracking-widest text-green block">Reply Document Uploaded</span>
                                              <span className="text-xs font-bold text-text-primary">Reply Attachment Attached</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <a
                                              href={activeReplyFileLink}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
                                            >
                                              View File
                                            </a>
                                            {!isViewingPastCycle && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setReplyFileLink('');
                                                  document.getElementById('legal-reply-file-input').value = '';
                                                }}
                                                className="px-3.5 py-1.5 bg-red-soft/20 text-red border border-red/10 hover:bg-red hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95"
                                              >
                                                Remove
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Default Summary Field for other stages */}
                          {legalProcessForm.stage !== 'Pack & AD ready' && legalProcessForm.stage !== 'Courier Sent' && legalProcessForm.stage !== 'Reply Received' && (
                            <div>
                              <label className={labelClass}>Summary / Remarks</label>
                              <textarea
                                required
                                disabled={isViewingPastCycle || isStageAlreadyFilled}
                                value={isViewingPastCycle ? (cycleHistory.find(h => h.stage === legalProcessForm.stage)?.summary || '') : legalProcessForm.summary}
                                onChange={(isViewingPastCycle || isStageAlreadyFilled) ? undefined : (e) => setLegalProcessForm(prev => ({ ...prev, summary: e.target.value }))}
                                placeholder="Provide details or updates regarding this stage..."
                                className={`${inputClass} min-h-[120px]`}
                              />
                            </div>
                          )}

                          {/* Cycle already filled notice for non-Draft stages */}
                          {isStageAlreadyFilled && !isViewingPastCycle && (
                            <div className="p-4 bg-accent/[0.03] border border-dashed border-accent/25 rounded-xl text-center animate-in fade-in duration-300">
                              <p className="text-[10px] font-black uppercase tracking-widest text-text-primary mb-1">Stage Already Submitted</p>
                              <p className="text-[9px] text-text-muted leading-relaxed">
                                <span className="text-accent font-bold">{legalProcessForm.stage}</span> has already been recorded this cycle.
                                Use the <strong className="text-accent">Edit</strong> button in <strong className="text-text-primary">Stage History</strong> to update.
                              </p>
                            </div>
                          )}

                          {/* Submit Button */}
                          <button
                            type="submit"
                            disabled={isViewingPastCycle || isLegalProcessSubmitting || isStageAlreadyFilled || !canEditLegal}
                            className="w-full bg-accent hover:bg-accent-hover text-white font-black py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isViewingPastCycle ? 'Viewing Past Cycle (Read Only)' : !canEditLegal ? 'No Permission — View Only' : isStageAlreadyFilled ? 'Already Submitted — Use Edit' : isLegalProcessSubmitting ? 'Submitting...' : 'Submit Update'}
                          </button>
                        </form>
                      )}

                      {/* Option to start a new notice cycle if current cycle is completed – restricted to Legal & Admin */}
                      {!isViewingPastCycle && canEditLegal && getActiveStageOfCase(legalProcessHistory, legalRequests, currentCycle) === 'Reply Received' &&
                        getStageStatus('Reply Received', 'Reply Received', legalProcessHistory, legalRequests, currentCycle).isCompleted && (
                          <div className="mt-8 p-5 bg-accent/[0.03] border-2 border-dashed border-accent/25 rounded-2xl flex flex-col items-center gap-4 text-center animate-in fade-in duration-300">
                            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-xl">🔄</div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-text-primary">Notice Cycle #{currentCycle} Completed</h4>
                              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mt-1.5 leading-relaxed max-w-[280px]">
                                If you received a reply and need to wapas send another notice, you can start a new process cycle.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const nextCycle = currentCycle + 1;
                                const loadingToast = toast.loading(`Starting Notice Cycle #${nextCycle}...`);
                                try {
                                  await api.post('/legal-process', {
                                    caseId: viewCase.caseId,
                                    stage: 'New Cycle Started',
                                    summary: `Notice Cycle ${nextCycle} Started`
                                  });
                                  toast.success(`Notice Cycle #${nextCycle} started successfully!`, { id: loadingToast });
                                  setSelectedCycleToView(nextCycle);
                                  fetchLegalProcessData(viewCase.caseId);
                                } catch (err) {
                                  console.error('Failed to start new notice cycle:', err);
                                  toast.error('Failed to start new notice cycle', { id: loadingToast });
                                }
                              }}
                              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                            >
                              Start Notice Cycle #{currentCycle + 1}
                            </button>
                          </div>
                        )}
                    </div>

                    {/* Right Side: History / Submission List */}
                    <div className="lg:col-span-5 bg-bg-card rounded-2xl border-2 border-border p-6 shadow-sm max-h-[600px] flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-primary mb-6 pb-3 border-b border-border flex items-center justify-between">
                        <span>📋 Stage History</span>
                        <span className="text-[10px] text-text-muted normal-case font-bold">{combinedHistory.length} updates</span>
                      </h3>

                      <div className="overflow-y-auto pr-2 space-y-6 flex-1 scrollbar-thin">
                        {isLegalProcessLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mb-4"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Loading history...</span>
                          </div>
                        ) : combinedHistory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 text-center text-text-muted gap-4">
                            <div className="text-4xl opacity-30">⏳</div>
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-widest mb-1">No updates yet</div>
                              <p className="text-[10px] text-text-muted leading-relaxed">Submit the form on the left to start the legal process timeline.</p>
                            </div>
                          </div>
                        ) : (
                          combinedHistory.map((item, idx) => (
                            <div
                              key={item.id}
                              className="relative pl-6 pb-6 border-l-2 border-border last:border-l-0 last:pb-0"
                            >
                              {/* Timeline dot */}
                              <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-bg-card shadow-sm" />

                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-3 py-1 ${item.isRequest ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500' : 'bg-accent/10 border border-accent/20 text-accent'} rounded-full text-[9px] font-black uppercase tracking-wider`}>
                                      Notice Cycle #{getCycleNumberForItem(item, legalProcessHistory)}: {item.stage}
                                    </span>
                                    {item.isRequest && (
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${item.status === 'Approved' ? 'bg-green-soft text-green' :
                                        item.status === 'Rejected' ? 'bg-red-soft text-red' :
                                          'bg-orange-100 text-orange-600'
                                        }`}>
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[9px] text-text-muted font-bold whitespace-nowrap">
                                      {(() => {
                                        try {
                                          const d = new Date(item.createdAt);
                                          return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd MMM yyyy, hh:mm a');
                                        } catch (e) {
                                          return 'N/A';
                                        }
                                      })()}
                                    </span>
                                    {/* Edit button – restricted to Legal & Admin users */}
                                    {!isViewingPastCycle && item.stage !== 'New Cycle Started' && canEditLegal && (
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(item)}
                                        className="flex items-center gap-1 px-2 py-1 bg-bg-secondary hover:bg-accent/10 border border-border hover:border-accent text-text-muted hover:text-accent rounded-lg text-[8px] font-black uppercase tracking-wider transition-all active:scale-95"
                                        title="Edit this stage entry"
                                      >
                                        <Edit3 size={9} />
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Checklist values for Case Study stage */}
                                {!item.isRequest && item.stage === 'Case Study' && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {(() => {
                                      const docs = [
                                        { key: 'mouDocChecked', label: 'MOU Doc' },
                                        { key: 'invoicesChecked', label: 'Invoices' },
                                        { key: 'caseStudyDocChecked', label: 'Case Study Doc' }
                                      ];
                                      const compType = (viewCase?.typeOfComplaint || '').trim();
                                      if (compType === 'Legal Notice') {
                                        docs.push({ key: 'paymentReceiptChecked', label: 'Legal Notice Doc' });
                                      } else if (compType === '1930 Cyber Complaint') {
                                        docs.push({ key: 'paymentReceiptChecked', label: '1930 Cyber Complaint Doc' });
                                      } else if (compType === 'Consumer Complaint') {
                                        docs.push({ key: 'paymentReceiptChecked', label: 'Consumer Complaint Doc' });
                                      } else if (['Criminal Complaint/FIR', 'FIR'].includes(compType)) {
                                        docs.push({ key: 'paymentReceiptChecked', label: 'Criminal Complaint/FIR Doc' });
                                      }
                                      return docs;
                                    })().map(doc => (
                                      <span
                                        key={doc.key}
                                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide border ${item[doc.key]
                                          ? 'bg-green-soft/20 text-green border-green/20'
                                          : 'bg-red-soft/20 text-red border-red/20'
                                          }`}
                                      >
                                        {doc.label}: {item[doc.key] ? 'Checked' : 'Unchecked'}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {item.isRequest ? (
                                  <div className="space-y-2 bg-bg-secondary/20 p-3 rounded-xl border border-border/30">
                                    <div className="text-[11px] text-text-primary">
                                      <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Document Name</span>
                                      <span className="font-bold">{item.documentName}</span>
                                    </div>
                                    {item.remark && (
                                      <div className="text-[10px] text-text-secondary">
                                        <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Remark</span>
                                        {item.remark}
                                      </div>
                                    )}
                                    {item.status === 'Rejected' && item.rejectRemark && (
                                      <div className="text-[10px] text-red font-semibold">
                                        <span className="font-black uppercase tracking-wider text-[8px] text-red/60 block mb-0.5">Rejection Reason</span>
                                        {item.rejectRemark}
                                      </div>
                                    )}
                                    {item.fileLink && (
                                      <a
                                        href={item.fileLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-accent hover:underline text-[10px] font-bold block pt-1"
                                      >
                                        Download / View File
                                      </a>
                                    )}
                                  </div>
                                ) : (() => {
                                  if (item.summary?.startsWith('PACK_AD_READY_JSON:')) {
                                    try {
                                      const data = JSON.parse(item.summary.replace('PACK_AD_READY_JSON:', ''));
                                      return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-bg-secondary/40 p-4 rounded-xl border border-border/30 text-[11px] text-left">
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Receiver Name</span>
                                            <span className="font-bold text-text-primary">{data.receiverName || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Receiver Address</span>
                                            <span className="font-bold text-text-primary">{data.receiverAddress || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Prepared By</span>
                                            <span className="font-bold text-text-primary">{data.preparedBy || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Company Address</span>
                                            <span className="font-bold text-text-primary">{data.companyAddress || '—'}</span>
                                          </div>
                                          {data.remark && (
                                            <div className="col-span-1 sm:col-span-2 mt-1 pt-2 border-t border-border/40">
                                              <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Remark</span>
                                              <span className="text-text-secondary">{data.remark}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } catch (e) {
                                      // Fallback below
                                    }
                                  } else if (item.summary?.startsWith('COURIER_SENT_JSON:')) {
                                    try {
                                      const data = JSON.parse(item.summary.replace('COURIER_SENT_JSON:', ''));
                                      return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-bg-secondary/40 p-4 rounded-xl border border-border/30 text-[11px] text-left">
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Date & Time</span>
                                            <span className="font-bold text-text-primary">
                                              {(() => {
                                                try {
                                                  const d = new Date(data.dateTime);
                                                  return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy, hh:mm a');
                                                } catch (err) {
                                                  return data.dateTime || '—';
                                                }
                                              })()}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Sender Name</span>
                                            <span className="font-bold text-text-primary">{data.senderName || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Document Name</span>
                                            <span className="font-bold text-text-primary">{data.documentName || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Sender Company Name</span>
                                            <span className="font-bold text-text-primary">{data.senderCompany || '—'}</span>
                                          </div>
                                        </div>
                                      );
                                    } catch (e) {
                                      // Fallback below
                                    }
                                  } else if (item.summary?.startsWith('REPLY_RECEIVED_JSON:')) {
                                    try {
                                      const data = JSON.parse(item.summary.replace('REPLY_RECEIVED_JSON:', ''));
                                      return (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-bg-secondary/40 p-4 rounded-xl border border-border/30 text-[11px] text-left">
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Date of Reply</span>
                                            <span className="font-bold text-text-primary">
                                              {(() => {
                                                try {
                                                  const d = new Date(data.replyDate);
                                                  return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy, hh:mm a');
                                                } catch (err) {
                                                  return data.replyDate || '—';
                                                }
                                              })()}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Replied By</span>
                                            <span className="font-bold text-text-primary">{data.repliedBy || '—'}</span>
                                          </div>
                                          {data.replyFileLink && (
                                            <div className="col-span-1 sm:col-span-2">
                                              <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Reply Document</span>
                                              <a
                                                href={data.replyFileLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg text-[9px] font-black uppercase tracking-wider text-accent hover:bg-accent hover:text-white transition-all shadow-sm"
                                              >
                                                <FileText size={12} />
                                                View Reply Document
                                              </a>
                                            </div>
                                          )}
                                          {data.remark && (
                                            <div className="col-span-1 sm:col-span-2 mt-1 pt-2 border-t border-border/40">
                                              <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Reply Remarks</span>
                                              <span className="text-text-secondary">{data.remark}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } catch (e) {
                                      // Fallback below
                                    }
                                  } else if (item.summary?.startsWith('DRAFT_JSON:')) {
                                    try {
                                      const data = JSON.parse(item.summary.replace('DRAFT_JSON:', ''));
                                      return (
                                        <div className="space-y-2 bg-bg-secondary/20 p-3 rounded-xl border border-border/30">
                                          <div className="text-[11px] text-text-primary">
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Document Name</span>
                                            <span className="font-bold">{data.documentName || '—'}</span>
                                          </div>
                                          <div className="text-[11px]">
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Status</span>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                              data.status === 'Pending BD Head' ? 'bg-orange-100 text-orange-600' : 'bg-blue-soft text-blue'
                                            }`}>{data.status === 'Pending BD Head' ? 'Pending BD Head Review' : 'Forwarded to Admin'}</span>
                                          </div>
                                          {data.remark && (
                                            <div className="text-[10px] text-text-secondary">
                                              <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Remark</span>
                                              {data.remark}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } catch (e) {
                                      // Fallback below
                                    }
                                  } else if (item.summary?.startsWith('DRAFT_STATUS_JSON:')) {
                                    try {
                                      const data = JSON.parse(item.summary.replace('DRAFT_STATUS_JSON:', ''));
                                      const isDraftRecommended = data.status === 'Pending';
                                      const isDraftRejected = data.status === 'Rejected';
                                      const isDraftApproved = data.status === 'Approved';
                                      return (
                                        <div className="space-y-2 bg-bg-secondary/20 p-3 rounded-xl border border-border/30">
                                          <div className="text-[11px] text-text-primary">
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Document Name</span>
                                            <span className="font-bold">{data.documentName || '—'}</span>
                                          </div>
                                          <div className="text-[11px]">
                                            <span className="font-black uppercase tracking-wider text-[8px] text-text-muted block mb-0.5">Decision</span>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                              isDraftApproved ? 'bg-green-soft text-green' :
                                              isDraftRejected ? 'bg-red-soft text-red' :
                                              'bg-blue-soft text-blue'
                                            }`}>
                                              {isDraftApproved ? 'Approved' : isDraftRejected ? 'Rejected' : 'Recommended by BD Head → Forwarded to Admin'}
                                            </span>
                                          </div>
                                          {isDraftRecommended && data.remark && (
                                            <div className="text-[10px] text-text-secondary">
                                              <span className="font-black uppercase tracking-wider text-[8px] text-accent/80 block mb-0.5">BD Head Recommendation</span>
                                              <span className="text-text-primary font-semibold">{data.remark}</span>
                                            </div>
                                          )}
                                          {isDraftRejected && data.rejectRemark && (
                                            <div className="text-[10px] text-red font-semibold">
                                              <span className="font-black uppercase tracking-wider text-[8px] text-red/60 block mb-0.5">Rejection Reason</span>
                                              {data.rejectRemark}
                                            </div>
                                          )}
                                          {data.fileLink && (
                                            <a
                                              href={data.fileLink}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-accent hover:underline text-[10px] font-bold block pt-1"
                                            >
                                              Download / View File
                                            </a>
                                          )}
                                        </div>
                                      );
                                    } catch (e) {
                                      // Fallback below
                                    }
                                  } else if (item.stage === 'New Cycle Started') {
                                    return (
                                      <div className="flex items-center gap-2.5 p-3 bg-accent/[0.03] border border-accent/15 rounded-xl text-[11px] text-left">
                                        <span className="text-sm">🔄</span>
                                        <div>
                                          <span className="font-black uppercase tracking-wider text-[8px] text-accent block mb-0.5">Process Cycle Restarted</span>
                                          <span className="font-bold text-text-primary">{item.summary}</span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <p className="text-[11px] text-text-secondary leading-relaxed bg-bg-secondary/40 p-3 rounded-xl border border-border/30 whitespace-pre-wrap break-all text-left">
                                      {item.summary}
                                    </p>
                                  );
                                })()}

                                <div className="text-[9px] text-text-muted font-bold flex items-center gap-1">
                                  <span>Submitted by:</span>
                                  <span className="text-text-primary">{item.submittedBy}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── EDIT MODAL OVERLAY ─────────────────────────────── */}
                {editingHistoryItem && (
                  <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between p-5 border-b border-border">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                            ✏️ Edit Stage Entry
                          </h3>
                          <p className="text-[9px] text-accent font-bold uppercase tracking-wider mt-0.5">
                            {editFormStage}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingHistoryItem(null)}
                          className="p-2 rounded-xl hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                        {/* Draft Request fields */}
                        {editingHistoryItem.isRequest && (
                          <>
                            <div>
                              <label className={labelClass}>Document Name</label>
                              <input
                                type="text"
                                required
                                value={editFormPayload.documentName || ''}
                                onChange={(e) => setEditFormPayload(prev => ({ ...prev, documentName: e.target.value }))}
                                className={inputClass}
                                placeholder="e.g. Legal Notice Draft"
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Remark</label>
                              <input
                                type="text"
                                value={editFormPayload.remark || ''}
                                onChange={(e) => setEditFormPayload(prev => ({ ...prev, remark: e.target.value }))}
                                className={inputClass}
                                placeholder="Any remarks..."
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Document</label>
                              <input type="file" id="edit-draft-file" onChange={handleEditDraftUpload} onClick={(e) => (e.target.value = null)} className="hidden" />
                              {!editFormPayload.fileLink && !editFormUploading && (
                                <button
                                  type="button"
                                  onClick={() => document.getElementById('edit-draft-file').click()}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-border hover:border-accent bg-bg-secondary hover:bg-bg-secondary/70 text-text-secondary hover:text-accent rounded-xl transition-all text-xs font-black uppercase tracking-wider"
                                >
                                  <UploadCloud size={16} /> Replace Document
                                </button>
                              )}
                              {editFormUploading && (
                                <div className="flex items-center justify-center gap-2 py-4 text-text-muted text-xs animate-pulse">
                                  <RefreshCw size={14} className="animate-spin" /> Uploading...
                                </div>
                              )}
                              {editFormPayload.fileLink && !editFormUploading && (
                                <div className="flex items-center justify-between gap-3 p-3 bg-green-500/[0.03] border border-green/20 rounded-xl">
                                  <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-green" />
                                    <span className="text-[10px] font-bold text-green">Document Attached</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <a href={editFormPayload.fileLink} target="_blank" rel="noreferrer" className="text-accent text-[9px] font-black uppercase tracking-wider hover:underline">View</a>
                                    <button type="button" onClick={() => setEditFormPayload(prev => ({ ...prev, fileLink: '' }))} className="text-red text-[9px] font-black uppercase tracking-wider hover:underline">Remove</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {/* Case Study fields */}
                        {!editingHistoryItem.isRequest && editFormStage === 'Case Study' && (
                          <>
                            <div className="space-y-2">
                              <label className={labelClass}>Document Review Checklist</label>
                              {[
                                { key: 'mouDocChecked', label: 'MOU Doc' },
                                { key: 'invoicesChecked', label: 'Invoices' },
                                { key: 'caseStudyDocChecked', label: 'Case Study Doc' },
                                { key: 'paymentReceiptChecked', label: 'Additional Doc' }
                              ].map(doc => (
                                <label key={doc.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editFormPayload[doc.key] ? 'bg-accent/5 border-accent text-accent' : 'bg-bg-input border-border text-text-secondary'}`}>
                                  <input
                                    type="checkbox"
                                    checked={!!editFormPayload[doc.key]}
                                    onChange={(e) => setEditFormPayload(prev => ({ ...prev, [doc.key]: e.target.checked }))}
                                    className="w-4 h-4 accent-accent"
                                  />
                                  <span className="text-[11px] font-black uppercase tracking-wider">{doc.label}</span>
                                </label>
                              ))}
                            </div>
                            <div>
                              <label className={labelClass}>Summary / Remarks</label>
                              <textarea
                                value={editFormPayload.summary || ''}
                                onChange={(e) => setEditFormPayload(prev => ({ ...prev, summary: e.target.value }))}
                                className={`${inputClass} min-h-[80px]`}
                                placeholder="Provide summary..."
                              />
                            </div>
                          </>
                        )}

                        {/* Pack & AD Ready fields */}
                        {!editingHistoryItem.isRequest && editFormStage === 'Pack & AD ready' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelClass}>Receiver Name</label>
                              <input type="text" value={editFormPayload.receiverName || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, receiverName: e.target.value }))} className={inputClass} placeholder="Receiver's name" />
                            </div>
                            <div>
                              <label className={labelClass}>Receiver Address</label>
                              <input type="text" value={editFormPayload.receiverAddress || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, receiverAddress: e.target.value }))} className={inputClass} placeholder="Receiver's address" />
                            </div>
                            <div>
                              <label className={labelClass}>Company Address</label>
                              <input type="text" value={editFormPayload.companyAddress || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, companyAddress: e.target.value }))} className={inputClass} placeholder="Company address" />
                            </div>
                            <div>
                              <label className={labelClass}>Remark</label>
                              <input type="text" value={editFormPayload.remark || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, remark: e.target.value }))} className={inputClass} placeholder="Any remarks..." />
                            </div>
                          </div>
                        )}

                        {/* Courier Sent fields */}
                        {!editingHistoryItem.isRequest && editFormStage === 'Courier Sent' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelClass}>Date and Time</label>
                              <input type="datetime-local" value={editFormPayload.dateTime || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, dateTime: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                              <label className={labelClass}>Sender Name</label>
                              <input type="text" value={editFormPayload.senderName || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, senderName: e.target.value }))} className={inputClass} placeholder="Sender's name" />
                            </div>
                            <div>
                              <label className={labelClass}>Document Name</label>
                              <input type="text" value={editFormPayload.documentName || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, documentName: e.target.value }))} className={inputClass} placeholder="Document name" />
                            </div>
                            <div>
                              <label className={labelClass}>Sender Company</label>
                              <input type="text" value={editFormPayload.senderCompany || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, senderCompany: e.target.value }))} className={inputClass} placeholder="Sender's company" />
                            </div>
                          </div>
                        )}

                        {/* Reply Received fields */}
                        {!editingHistoryItem.isRequest && editFormStage === 'Reply Received' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelClass}>Date of Reply</label>
                              <input type="datetime-local" value={editFormPayload.replyDate || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, replyDate: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                              <label className={labelClass}>Replied By</label>
                              <input type="text" value={editFormPayload.repliedBy || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, repliedBy: e.target.value }))} className={inputClass} placeholder="Replier's name" />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <label className={labelClass}>Reply Remarks</label>
                              <textarea value={editFormPayload.remark || ''} onChange={(e) => setEditFormPayload(prev => ({ ...prev, remark: e.target.value }))} className={`${inputClass} min-h-[70px]`} placeholder="Details of reply..." />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <label className={labelClass}>Reply Document</label>
                              <input type="file" id="edit-reply-file" onChange={handleEditReplyUpload} onClick={(e) => (e.target.value = null)} className="hidden" />
                              {!editFormPayload.replyFileLink && !editFormUploading && (
                                <button type="button" onClick={() => document.getElementById('edit-reply-file').click()} className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-border hover:border-accent bg-bg-secondary hover:bg-bg-secondary/70 text-text-secondary hover:text-accent rounded-xl transition-all text-xs font-black uppercase tracking-wider">
                                  <UploadCloud size={16} /> Replace Reply Document
                                </button>
                              )}
                              {editFormUploading && (
                                <div className="flex items-center justify-center gap-2 py-4 text-text-muted text-xs animate-pulse">
                                  <RefreshCw size={14} className="animate-spin" /> Uploading...
                                </div>
                              )}
                              {editFormPayload.replyFileLink && !editFormUploading && (
                                <div className="flex items-center justify-between gap-3 p-3 bg-green-500/[0.03] border border-green/20 rounded-xl">
                                  <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-green" />
                                    <span className="text-[10px] font-bold text-green">Reply Document Attached</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <a href={editFormPayload.replyFileLink} target="_blank" rel="noreferrer" className="text-accent text-[9px] font-black uppercase tracking-wider hover:underline">View</a>
                                    <button type="button" onClick={() => setEditFormPayload(prev => ({ ...prev, replyFileLink: '' }))} className="text-red text-[9px] font-black uppercase tracking-wider hover:underline">Remove</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Generic summary for other stages */}
                        {!editingHistoryItem.isRequest && !['Case Study', 'Pack & AD ready', 'Courier Sent', 'Reply Received'].includes(editFormStage) && (
                          <div>
                            <label className={labelClass}>Summary / Remarks</label>
                            <textarea
                              value={editFormPayload.summary || ''}
                              onChange={(e) => setEditFormPayload(prev => ({ ...prev, summary: e.target.value }))}
                              className={`${inputClass} min-h-[100px]`}
                              placeholder="Provide summary or remarks..."
                            />
                          </div>
                        )}

                        <div className="flex gap-3 pt-2 border-t border-border">
                          <button
                            type="button"
                            onClick={() => setEditingHistoryItem(null)}
                            className="flex-1 py-3 bg-bg-secondary hover:bg-bg-input border border-border text-text-primary font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={editFormUploading}
                            className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-50"
                          >
                            {editFormUploading ? 'Uploading...' : 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            );
          })() : activeDetailTab === 'Case Study' ? (
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
          <div className="table-wrap overflow-auto scrollbar-thin max-h-[calc(100vh-300px)] min-h-[450px]">
            <table className="w-full text-left border-collapse" style={{ minWidth: '1300px' }}>
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
                  {/* Static non-filterable columns */}
                  {visibleColumns.includes('caseId') && <th className="px-2 py-3 w-[7%]">Case ID</th>}
                  {/* Filterable columns */}
                  {[
                    { label: 'Created', key: 'createdDate', width: 'w-[8%]', getVal: c => c.createdDate ? format(new Date(c.createdDate), 'dd/MM/yyyy') : '—' },
                    { label: 'Company', key: 'company', width: 'w-[10%]', getVal: c => c.companyName || '—' },
                    { label: 'Client', key: 'client', width: 'w-[10%]', getVal: c => c.clientName || '—' },
                    { label: 'Type of Complaint', key: 'typeOfComplaint', width: 'w-[10%]', getVal: c => c.typeOfComplaint || '—' },
                    { label: 'Amount Received', key: 'totalAmtPaid', width: 'w-[7%]', getVal: c => c.totalAmtPaid ? Number(c.totalAmtPaid).toLocaleString('en-IN') : '0' },
                    { label: 'Priority', key: 'priority', width: 'w-[5%]', getVal: c => c.priority || '—' },
                    { label: 'Due Date', key: 'dueDate', width: 'w-[8%]', getVal: c => c.dueDate ? new Date(c.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—' },
                    { label: 'Status', key: 'status', width: 'w-[5%]', getVal: c => normalizeStatus(c.currentStatus || c.status, c.assignedTo, c.initiatedBy) },
                    { label: 'Refund', key: 'refund', width: 'w-[7%]', center: true, getVal: c => { const r = refundsList.find(x => x.caseId === c.caseId); if (!r) return 'No Refund'; const paid = r.transactionId && (r.installments || []).length <= 1; return (r.status?.toLowerCase() === 'paid' || paid) ? 'Paid' : 'Pending'; } },
                    { label: 'Assigned To', key: 'assignedTo', width: 'w-[10%]', getVal: c => c.assignedTo || c.initiatedBy || '—' },
                    { label: 'Last Update', key: 'lastUpdateDate', width: 'w-[8%]', getVal: c => c.lastUpdateDate ? format(new Date(c.lastUpdateDate), 'dd/MM/yyyy') : '—' },
                    ,
                    ...filterableFields.filter(f => ['clientMobile', 'clientEmail', 'state', 'city', 'sourceOfComplaint', 'amtInDispute', 'bda', 'workStatus', 'legalOfficer', 'serviceName', 'dateOfLastPayment', 'mouSigned', 'totalMouValue', 'clientAllegation', 'caseSummary'].includes(f.key)).map(f => ({
                      label: f.label, key: f.key, width: 'w-[8%]', getVal: c => {
                        if (f.key.includes('.')) {
                          const [p, ch] = f.key.split('.');
                          return c[p]?.[ch] || '—';
                        }
                        return c[f.key] || '—';
                      }
                    }))
                  ].filter(col => visibleColumns.includes(col.key)).map(col => {
                    const activeVals = columnFilters[col.key] || [];
                    const isActive = col.key && activeVals.length > 0;
                    const isSorted = colSortConfig.key === col.key;

                    let uniqueVals = col.key && col.getVal
                      ? [...new Set(cases.map(col.getVal).filter(v => v))]
                      : [];

                    if (col.key === 'status') {
                      const statusOrder = [
                        'Case Logged',
                        'Assigned',
                        'Analysis',
                        'Negotiation',
                        'Settlement',
                        'Closure'
                      ];
                      uniqueVals.sort((a, b) => {
                        const idxA = statusOrder.indexOf(a);
                        const idxB = statusOrder.indexOf(b);
                        const orderA = idxA === -1 ? 999 : idxA;
                        const orderB = idxB === -1 ? 999 : idxB;
                        return orderA - orderB;
                      });
                    } else if (uniqueVals.length > 0) {
                      uniqueVals.sort();
                    }

                    if (col.key === 'assignedTo' && user?.role === 'Operations' && user?.fullName) {
                      uniqueVals = uniqueVals.filter(v => v.toLowerCase() === user.fullName.toLowerCase());
                      if (uniqueVals.length === 0) {
                        uniqueVals = [user.fullName];
                      }
                    }

                    const shownVals = (colFilterSearch && openColFilter === col.key)
                      ? uniqueVals.filter(v => v.toLowerCase().includes(colFilterSearch.toLowerCase()))
                      : uniqueVals;

                    return (
                      <th key={col.label} className={`px-2 py-3 ${col.width} ${col.center ? 'text-center' : ''} relative`}>
                        <div className={`flex items-center gap-1 ${col.center ? 'justify-center' : ''} group`}>
                          <span className="select-none">{col.label}</span>
                          {col.key && (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); handleOpenColFilter(col.key, uniqueVals, e); }}
                              className={`p-0.5 rounded transition-all ${isActive || isSorted ? 'text-accent bg-accent/15 scale-110 font-bold' : 'text-text-muted hover:text-accent'}`}
                              title={`Sort & Filter by ${col.label}`}
                            >
                              <Filter size={9} strokeWidth={3} />
                            </button>
                          )}
                        </div>

                        {/* Excel/Google Sheets style filter panel */}
                        {col.key && openColFilter === col.key && (
                          <div
                            className="fixed z-[50000] bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-[260px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-left font-sans text-xs"
                            style={{ top: colFilterPos.top, left: Math.min(colFilterPos.left, window.innerWidth - 280) }}
                            onClick={e => e.stopPropagation()}
                          >
                            {/* Sorting Actions */}
                            <div className="p-2 border-b border-border bg-bg-secondary/30 flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setColSortConfig({ key: col.key, direction: 'asc' });
                                  setOpenColFilter(null);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-start transition-all ${colSortConfig.key === col.key && colSortConfig.direction === 'asc' ? 'bg-accent/10 text-accent font-black' : 'text-text-secondary hover:bg-bg-input'}`}
                              >
                                <span className="uppercase tracking-wider text-[9px]">
                                  ↑ Sort {col.label === 'Created' || col.label === 'Last Update' ? 'Oldest to Newest' : col.label === 'Amount Received' ? 'Smallest to Largest' : 'A to Z'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setColSortConfig({ key: col.key, direction: 'desc' });
                                  setOpenColFilter(null);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl font-bold flex items-center justify-start transition-all ${colSortConfig.key === col.key && colSortConfig.direction === 'desc' ? 'bg-accent/10 text-accent font-black' : 'text-text-secondary hover:bg-bg-input'}`}
                              >
                                <span className="uppercase tracking-wider text-[9px]">
                                  ↓ Sort {col.label === 'Created' || col.label === 'Last Update' ? 'Newest to Oldest' : col.label === 'Amount Received' ? 'Largest to Smallest' : 'Z to A'}
                                </span>
                              </button>
                              {isSorted && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setColSortConfig({ key: null, direction: null });
                                    setOpenColFilter(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 rounded-xl text-[9px] font-black text-red uppercase tracking-wider hover:bg-red-soft/30 transition-all text-center mt-0.5"
                                >
                                  ✕ Clear Sorting
                                </button>
                              )}
                            </div>

                            {/* Search box & Selection Actions */}
                            <div className="p-2.5 border-b border-border flex flex-col gap-2">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search values..."
                                value={colFilterSearch}
                                onChange={e => setColFilterSearch(e.target.value)}
                                className="w-full bg-bg-input border border-border rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:border-accent text-text-primary placeholder:text-text-muted"
                              />
                              <div className="flex items-center justify-between px-1 text-[9px] font-black uppercase tracking-wider text-accent">
                                <button
                                  type="button"
                                  onClick={() => setTempColFilters(uniqueVals)}
                                  className="hover:underline"
                                >
                                  Select All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTempColFilters([])}
                                  className="hover:underline text-text-muted"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            {/* Checkbox list */}
                            <div className="max-h-[180px] overflow-y-auto scrollbar-thin py-1 border-b border-border">
                              {/* (Select All) Checkbox Option */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (tempColFilters.length === uniqueVals.length) {
                                    setTempColFilters([]);
                                  } else {
                                    setTempColFilters(uniqueVals);
                                  }
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-[10px] font-bold transition-all flex items-center justify-start gap-2 text-text-primary hover:bg-bg-input"
                              >
                                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${tempColFilters.length === uniqueVals.length ? 'bg-accent border-accent text-white' : 'border-border'}`}>
                                  {tempColFilters.length === uniqueVals.length && <Check size={8} strokeWidth={4} />}
                                </span>
                                <span className="uppercase tracking-wider text-[9px] font-black">(Select All)</span>
                              </button>

                              {shownVals.length === 0 ? (
                                <div className="px-3.5 py-3 text-[9px] text-text-muted font-bold uppercase tracking-widest text-center">No values found</div>
                              ) : (
                                shownVals.map(val => {
                                  const isChecked = tempColFilters.includes(val);
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleToggleTempFilter(val)}
                                      className={`w-full text-left px-3.5 py-1.5 text-[10px] font-bold transition-all flex items-center justify-start gap-2 ${isChecked ? 'text-text-primary' : 'text-text-muted hover:bg-bg-input'}`}
                                    >
                                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isChecked ? 'bg-accent border-accent text-white' : 'border-border'}`}>
                                        {isChecked && <Check size={8} strokeWidth={4} />}
                                      </span>
                                      <span className="truncate text-[9px] uppercase tracking-wider">{val}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="p-2 bg-bg-secondary/30 flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenColFilter(null);
                                  setTempColFilters([]);
                                }}
                                className="px-3 py-1.5 border border-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:bg-bg-input rounded-xl transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (tempColFilters.length === uniqueVals.length || tempColFilters.length === 0) {
                                    setColumnFilters(prev => {
                                      const n = { ...prev };
                                      delete n[col.key];
                                      return n;
                                    });
                                  } else {
                                    setColumnFilters(prev => ({
                                      ...prev,
                                      [col.key]: tempColFilters
                                    }));
                                  }
                                  setOpenColFilter(null);
                                  setTempColFilters([]);
                                }}
                                className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm transition-all"
                              >
                                OK
                              </button>
                            </div>
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="px-2 py-4 w-[15%] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-text-secondary divide-y divide-border">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-6 py-20 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="p-6 bg-bg-input rounded-full">
                          <Inbox size={48} className="text-text-muted opacity-20" />
                        </div>
                      </div>
                      <div className="text-text-muted font-black uppercase tracking-widest text-xs">No matching cases found</div>
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c, index) => {
                    const caseRefund = refundsList.find(r => r.caseId === c.caseId);
                    let refundStatus = '';
                    if (caseRefund) {
                      const isSinglePaidFallback = caseRefund.transactionId && (caseRefund.installments || []).length <= 1;
                      refundStatus = (caseRefund.status?.toLowerCase() === 'paid' || isSinglePaidFallback) ? 'Paid' : 'Pending';
                    }
                    return (
                      <CaseRow
                        key={c.caseId || c.id || index}
                        c={c}
                        visibleColumns={visibleColumns}
                        filterableFields={filterableFields}
                        isSelected={selectedCases.includes(c.caseId)}
                        bulkAssignUser={bulkAssignUser}
                        toggleSelectCase={toggleSelectCase}
                        handleViewCase={handleViewCase}
                        navigate={navigate}
                        assignmentInput={assignmentInputs[c.caseId]}
                        handleAssignmentInputChange={handleAssignmentInputChange}
                        opsUsers={opsUsers}
                        allDynamicAssignees={allDynamicAssignees}
                        handleAssign={handleAssign}
                        handleDeleteCase={handleDeleteCase}
                        handleQuickArchive={handleQuickArchive}
                        handleUnarchive={handleUnarchive}
                        user={user}
                        refundStatus={refundStatus}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {page < totalPages && (
            <div className="p-8 flex justify-center bg-bg-secondary border-t border-border">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-3 px-8 py-3 bg-bg-card hover:bg-bg-input text-text-primary border-2 border-border rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              >
                {isLoadingMore ? (
                  <>
                    <Activity size={16} className="animate-spin text-accent" />
                    Loading More...
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Load More Cases ({cases.length} of {user?.role === 'Reviewer' ? filteredCases.length : totalCount})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      <Modal isOpen={isResolveModalOpen} onClose={() => setIsResolveModalOpen(false)} title="Confirm Case Resolution">
        <div className="p-6 text-center">
          <h3 className="text-xl font-black text-text-primary mb-4">Mark Case as Resolved?</h3>
          <p className="text-sm text-text-muted mb-6">Are you sure you want to resolve this case? This will update the case status to Closure.</p>

          <div className="bg-bg-input p-4 rounded-xl border border-border flex items-center justify-start gap-3 mb-8 text-left cursor-pointer hover:bg-bg-card transition-all" onClick={() => setCompliancePendingChecked(!compliancePendingChecked)}>
            <input
              type="checkbox"
              className="w-5 h-5 accent-accent cursor-pointer"
              checked={compliancePendingChecked}
              onChange={(e) => setCompliancePendingChecked(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <div>
              <div className="text-sm font-black text-text-primary">Closure but compliance pending</div>
              <div className="text-[10px] text-text-muted font-bold mt-0.5">If unchecked, this case will be sent to the Archived module.</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              className="flex-1 bg-green hover:bg-green-600 text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-md shadow-green-900/20"
              onClick={confirmResolveCase}
            >
              Confirm Resolve
            </button>
            <button
              className="flex-1 bg-bg-input hover:bg-bg-card text-text-primary border border-border font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95"
              onClick={() => setIsResolveModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <FilePreviewModal
        isOpen={!!previewFileUrl}
        onClose={() => setPreviewFileUrl(null)}
        fileUrl={previewFileUrl}
        fileName={previewFileName}
      />

      {/* AI Prompt Modal */}
      <Modal isOpen={showAIPromptModal} onClose={() => !isGeneratingSummary && setShowAIPromptModal(false)} title={`✨ Generate ${aiTargetField === 'caseSummary' ? 'Case Summary' : "Client's Dispute"}`}>
        <div className="p-6">
          <p className="text-sm text-text-secondary mb-4">
            Our AI will read the case details, recent history, communications, and documents to draft a professional text for you.
          </p>
          <div className="mb-6">
            <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              className="w-full bg-bg-input border-2 border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:border-accent outline-none min-h-[100px] resize-y placeholder:text-text-muted"
              placeholder="E.g., Focus specifically on the pending payment issue and the recent police threat."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isGeneratingSummary}
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleGenerateAISummary}
              disabled={isGeneratingSummary}
              className="flex-1 bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-black py-3 px-4 rounded-xl uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
            >
              {isGeneratingSummary ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate
                </>
              )}
            </button>
            <button
              onClick={() => setShowAIPromptModal(false)}
              disabled={isGeneratingSummary}
              className="flex-1 bg-bg-input hover:bg-bg-card text-text-primary border border-border font-black py-3 px-4 rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddDraftOpen} onClose={() => setIsAddDraftOpen(false)} title="Legal Draft Requests">
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          <form onSubmit={handleLegalDraftSubmit} className="space-y-4">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest border-b border-border pb-2">Submit New Draft Request</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Case ID</label>
                <select
                  required
                  value={draftCaseId}
                  onChange={(e) => setDraftCaseId(e.target.value)}
                  className="w-full bg-bg-input border-2 border-border rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary outline-none focus:border-accent transition-all h-[42px]"
                >
                  <option value="">Select Case ID</option>
                  {cases.map(c => (
                    <option key={c.caseId} value={c.caseId}>{c.caseId} - {c.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Document Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Notice Draft"
                  value={draftDocName}
                  onChange={(e) => setDraftDocName(e.target.value)}
                  className="w-full bg-bg-input border-2 border-border rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary outline-none focus:border-accent transition-all h-[42px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Upload Document</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="legal-draft-file-input"
                    className="hidden"
                    onChange={handleLegalDraftUpload}
                    onClick={(e) => (e.target.value = null)}
                  />
                  {!draftFileLink && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('legal-draft-file-input').click()}
                      className="bg-bg-input hover:bg-bg-card border border-border text-text-primary font-black py-2 px-4 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 h-[42px]"
                    >
                      Upload File
                    </button>
                  )}
                  {draftFileUploading && (
                    <div className="flex items-center gap-2 text-xs text-text-muted italic">
                      <RefreshCw size={12} className="animate-spin" /> Uploading...
                    </div>
                  )}
                  {draftFileLink && (
                    <div className="flex items-center gap-2.5 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100 h-[42px] text-[10px]">
                      <CheckCircle size={12} className="text-green animate-pulse" />
                      <span className="text-green font-black uppercase tracking-wider">Uploaded</span>
                      <div className="h-4 w-[1px] bg-border/50 mx-1"></div>
                      <a
                        href={draftFileLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline font-black uppercase tracking-wider"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftFileLink('');
                          document.getElementById('legal-draft-file-input').value = '';
                        }}
                        className="text-red hover:underline font-black uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Remark</label>
                <input
                  type="text"
                  placeholder="Any remarks..."
                  value={draftRemark}
                  onChange={(e) => setDraftRemark(e.target.value)}
                  className="w-full bg-bg-input border-2 border-border rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary outline-none focus:border-accent transition-all h-[42px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={draftFileUploading}
              className="w-full bg-accent hover:bg-accent-hover text-white font-black py-2.5 px-5 rounded-xl shadow-md text-xs transition-all uppercase tracking-widest active:scale-95"
            >
              Submit Request
            </button>
          </form>

          <div className="space-y-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsMyRequestsStatusOpen(!isMyRequestsStatusOpen)}
              className="flex items-center justify-between w-full text-left text-sm font-black text-text-primary uppercase tracking-widest border-b border-border pb-2 active:scale-[0.99] transition-all cursor-pointer outline-none"
            >
              <span>My Requests Status</span>
              {isMyRequestsStatusOpen ? <ChevronDown size={16} className="text-accent" /> : <ChevronRight size={16} className="text-text-muted" />}
            </button>

            {isMyRequestsStatusOpen && (
              <div className="overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-muted uppercase tracking-wider text-[9px] font-black">
                      <th className="py-2 px-3">Case ID</th>
                      <th className="py-2 px-3">Document Name</th>
                      <th className="py-2 px-3">Document</th>
                      <th className="py-2 px-3">Remark</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Admin Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legalRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-4 text-center text-text-muted italic">No requests submitted yet.</td>
                      </tr>
                    ) : (
                      legalRequests.map(r => {
                        const isExpanded = expandedRequestId === (r._id || r.id);
                        const truncate = (str, len = 20) => {
                          if (!str) return '-';
                          if (str.length <= len) return str;
                          return str.slice(0, len) + '...';
                        };
                        return (
                          <React.Fragment key={r._id || r.id}>
                            <tr
                              onClick={() => setExpandedRequestId(isExpanded ? null : (r._id || r.id))}
                              className="border-b border-border hover:bg-bg-input transition-all cursor-pointer"
                            >
                              <td className="py-2.5 px-3 font-bold text-text-primary">
                                <span className="inline-flex items-center gap-1 select-none">
                                  {isExpanded ? <ChevronDown size={10} className="text-accent" /> : <ChevronRight size={10} className="text-text-muted" />}
                                  {r.caseId}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-text-secondary">{r.documentName}</td>
                              <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                                {r.fileLink ? (
                                  <a
                                    href={r.fileLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-accent hover:underline font-bold"
                                  >
                                    View File
                                  </a>
                                ) : (
                                  <span className="text-text-muted italic">No file</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-text-secondary truncate max-w-[150px]" title={r.remark || ''}>
                                {truncate(r.remark, 18)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${r.status === 'Approved' ? 'bg-green-soft text-green' :
                                  r.status === 'Rejected' ? 'bg-red-soft text-red' :
                                    'bg-orange-100 text-orange-600'
                                  }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-text-secondary truncate max-w-[150px]" title={r.rejectRemark || ''}>
                                {truncate(r.rejectRemark, 18)}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-bg-input/20">
                                <td colSpan="6" className="py-3 px-6 text-xs text-text-secondary border-b border-border" onClick={(e) => e.stopPropagation()}>
                                  <div className="bg-bg-card p-4 rounded-xl border border-border/80 shadow-sm space-y-3 text-left">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted mb-1">Document Name</span>
                                        <span className="font-bold text-text-primary">{r.documentName}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted mb-1">Status</span>
                                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${r.status === 'Approved' ? 'bg-green-soft text-green' :
                                          r.status === 'Rejected' ? 'bg-red-soft text-red' :
                                            'bg-orange-100 text-orange-600'
                                          }`}>{r.status}</span>
                                      </div>
                                    </div>
                                    <div className="border-t border-border/50 pt-2.5">
                                      <span className="block text-[9px] font-black uppercase tracking-wider text-text-muted mb-1">Remark</span>
                                      <p className="text-text-primary whitespace-pre-wrap break-words bg-bg-input/20 p-2.5 rounded-lg border border-border/30">{r.remark || 'No remarks provided.'}</p>
                                    </div>
                                    {(r.status === 'Rejected' || r.rejectRemark) && (
                                      <div className="border-t border-border/50 pt-2.5">
                                        <span className="block text-[9px] font-black uppercase tracking-wider text-red mb-1">Admin Remark</span>
                                        <p className="text-red whitespace-pre-wrap break-words bg-red-soft/10 p-2.5 rounded-lg border border-red-soft/20">{r.rejectRemark || 'No admin remark provided.'}</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>
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
  allDynamicAssignees,
  handleAssign,
  handleDeleteCase,
  handleQuickArchive,
  handleUnarchive,
  user,
  refundStatus,
  visibleColumns,
  filterableFields
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const menuRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowActionMenu(false);
      }
    };
    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionMenu]);

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
      {visibleColumns.includes('caseId') && (
        <td className="px-3 py-5 font-black text-accent break-words max-w-[100px] leading-tight text-[11px] uppercase tracking-tighter">
          {c.caseId || c.caseid}
        </td>
      )}
      {visibleColumns.includes('createdDate') && (
        <td className="px-3 py-5 text-text-muted">
          {c.createdDate ? (
            <>
              <div className="font-bold text-text-secondary">{new Date(c.createdDate).toLocaleDateString('en-IN')}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{new Date(c.createdDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </>
          ) : '-'}
        </td>
      )}
      {visibleColumns.includes('company') && (
        <td className="px-3 py-5 break-words max-w-[120px] leading-tight text-text-secondary font-medium" title={c.companyName}>{c.companyName || '-'}</td>
      )}
      {visibleColumns.includes('client') && (
        <td className="px-3 py-5">
          <div className="font-black text-text-primary leading-tight break-words text-sm">{c.clientName || '-'}</div>
          {c.clientMobile && <div className="text-[10px] text-text-muted font-bold mt-1 tracking-wider">{c.clientMobile}</div>}
        </td>
      )}
      {visibleColumns.includes('typeOfComplaint') && (
        <td className="px-3 py-5 break-words max-w-[120px] leading-tight text-text-secondary font-medium uppercase tracking-[0.01em] text-[11px]">{c.typeOfComplaint || '-'}</td>
      )}
      {visibleColumns.includes('totalAmtPaid') && (
        <td className="px-3 py-5 font-black text-text-primary whitespace-nowrap">₹{Number(c.totalAmtPaid || 0).toLocaleString('en-IN')}</td>
      )}
      {visibleColumns.includes('priority') && (
        <td className="px-3 py-5">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${c.priority === 'High' ? 'bg-red-soft text-red' :
            c.priority === 'Medium' ? 'bg-yellow-soft text-yellow' :
              'bg-blue-soft text-blue'
            }`}>
            {c.priority || 'Medium'}
          </span>
        </td>
      )}
      {visibleColumns.includes('dueDate') && (
        <td className="px-3 py-5">
          {c.dueDate ? (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-orange-soft bg-orange-soft text-orange whitespace-nowrap">
              {new Date(c.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          ) : (
            <span className="text-text-muted/30 font-bold">—</span>
          )}
        </td>
      )}
      {visibleColumns.includes('status') && (
        <td className="px-3 py-5 min-w-[120px]">
          {(() => {
            const displayStatus = normalizeStatus(c.currentStatus, c.assignedTo, c.initiatedBy);
            const badgeClass =
              (displayStatus === 'Settled' || displayStatus === 'Closed' || displayStatus === 'Closure' || displayStatus === 'Settlement') ? 'bg-green-soft text-green border-green-soft' :
                displayStatus === 'Escalated' ? 'bg-red-soft text-red border-red-soft' :
                  displayStatus === 'Assigned' ? 'bg-blue-soft text-blue border-blue-soft' :
                    displayStatus === 'Negotiation' ? 'bg-yellow-soft text-yellow border-yellow-soft' :
                      (displayStatus === 'Resolution' || displayStatus === 'Submitted') ? 'bg-purple-soft text-purple border-purple-soft' :
                        'bg-accent-soft text-accent border-accent-soft';
            return (
              <div className="flex flex-col gap-1.5">
                <span className={`w-fit px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${badgeClass}`}>
                  {displayStatus}
                </span>
              </div>
            );
          })()}
        </td>
      )}
      {visibleColumns.includes('refund') && (
        <td className="px-3 py-5 text-center">
          {refundStatus ? (
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${refundStatus === 'Paid'
              ? 'bg-green-soft text-green border-green-soft'
              : 'bg-yellow-soft text-yellow border-yellow-soft'
              }`}>
              {refundStatus}
            </span>
          ) : (
            <span className="text-text-muted/30 font-bold">—</span>
          )}
        </td>
      )}
      {visibleColumns.includes('assignedTo') && (
        <td className="px-3 py-5 break-words max-w-[120px] leading-tight text-text-secondary font-black text-[10px] uppercase tracking-wider">
          {c.assignedTo || c.initiatedBy || '-'}
        </td>
      )}
      {visibleColumns.includes('lastUpdateDate') && (
        <td className="px-3 py-5 text-text-muted">
          {c.lastUpdateDate ? (
            <>
              <div className="text-[11px] font-bold text-text-secondary">{new Date(c.lastUpdateDate).toLocaleDateString('en-IN')}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{new Date(c.lastUpdateDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </>
          ) : '-'}
        </td>
      )}

      {filterableFields && filterableFields.filter(f => ['clientMobile', 'clientEmail', 'state', 'city', 'sourceOfComplaint', 'amtInDispute', 'bda', 'workStatus', 'legalOfficer', 'serviceName', 'dateOfLastPayment', 'mouSigned', 'totalMouValue', 'clientAllegation', 'caseSummary'].includes(f.key)).filter(f => visibleColumns.includes(f.key)).map(f => {
        let val = '—';
        if (f.key.includes('.')) {
          const [p, ch] = f.key.split('.');
          val = c[p]?.[ch] || '—';
        } else {
          val = c[f.key] || '—';
        }
        return (
          <td key={f.key} className="px-3 py-5 text-text-secondary font-medium text-xs max-w-[150px] truncate" title={String(val)}>
            {String(val)}
          </td>
        )
      })}
      <td className="px-3 py-5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-2 w-[160px] mx-auto relative" ref={menuRef}>
          {/* Top Row: Action Menu Toggle */}
          <div className="w-full flex justify-end relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowActionMenu(!showActionMenu); }}
              className="p-2 hover:bg-bg-input rounded-full transition-all text-text-muted hover:text-text-primary focus:outline-none"
            >
              <MoreVertical size={20} />
            </button>

            {/* Dropdown Menu */}
            {showActionMenu && (
              <div className="absolute right-0 top-10 bg-white shadow-xl border border-border rounded-xl w-48 py-2 z-50 flex flex-col items-start overflow-hidden animate-in fade-in zoom-in duration-150">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowActionMenu(false); handleViewCase(c); }}
                  className="w-full text-left px-4 py-3 text-[10px] font-black text-text-primary hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-3 uppercase tracking-widest border-b border-border/50"
                >
                  <Eye size={14} /> View Profile
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowActionMenu(false); navigate('/new-case', { state: { editCase: c } }); }}
                  className="w-full text-left px-4 py-3 text-[10px] font-black text-text-primary hover:bg-yellow-50 hover:text-yellow-600 transition-colors flex items-center gap-3 uppercase tracking-widest border-b border-border/50"
                >
                  <Edit3 size={14} /> Edit Case
                </button>
                {!c.isArchived ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowActionMenu(false); handleQuickArchive(c, e); }}
                    className="w-full text-left px-4 py-3 text-[10px] font-black text-text-primary hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3 uppercase tracking-widest border-b border-border/50"
                  >
                    <Archive size={14} /> Mark as Archived
                  </button>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowActionMenu(false); handleUnarchive(c, e); }}
                    className="w-full text-left px-4 py-3 text-[10px] font-black text-text-primary hover:bg-green-50 hover:text-green-600 transition-colors flex items-center gap-3 uppercase tracking-widest border-b border-border/50"
                  >
                    <RefreshCw size={14} /> Unarchive Case
                  </button>
                )}
                {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowActionMenu(false); handleDeleteCase(c.caseId); }}
                    className="w-full text-left px-4 py-3 text-[10px] font-black text-red hover:bg-red-50 transition-colors flex items-center gap-3 uppercase tracking-widest"
                  >
                    <Trash2 size={14} /> Delete Case
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Row: Assignment Section */}
          {['Admin', 'Operations', 'Super Admin', 'Operation Head', 'BD Head'].includes(user?.role) && !c.isArchived && (
            <div className="flex gap-2 w-full">
              <select
                className="flex-1 bg-bg-input border-2 border-border rounded-xl text-[9px] px-2 py-2.5 outline-none focus:border-accent shadow-sm min-w-0 text-text-primary font-black uppercase tracking-widest cursor-pointer"
                value={assignmentInput !== undefined ? assignmentInput : (c.assignedTo || c.initiatedBy || '')}
                onChange={(e) => handleAssignmentInputChange(c.caseId, e.target.value)}
              >
                <option value="">Assign</option>
                {['admin', 'super admin', 'operation head', 'bd head'].includes(user?.role?.toLowerCase())
                  ? opsUsers.filter(u => ['operations', 'admin', 'operation admin', 'operation review', 'legal', 'advocate', 'bd head'].includes(u.role?.toLowerCase()?.trim())).map(u => (
                    <option key={`row-assign-${u._id || u.email}`} value={u.fullName}>{u.fullName}</option>
                  ))
                  : (user?.fullName && (
                    <option value={user.fullName}>{user.fullName}</option>
                  ))
                }
              </select>
              <button
                onClick={() => handleAssign(c.caseId)}
                className="bg-accent-soft hover:bg-accent/20 text-accent font-black text-[9px] w-10 h-10 flex items-center justify-center rounded-xl border border-accent-soft transition-all uppercase active:scale-90 flex-shrink-0"
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
