import React, { useState, useEffect, useContext } from 'react';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FileUpload from '../shared/FileUpload';
import SearchableSelect from '../shared/SearchableSelect';
import Modal from '../shared/Modal';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Wrench,
  User,
  IndianRupee,
  AlertTriangle,
  FileText,
  Users,
  CheckCircle,
  Trash2,
  PhoneIncoming,
  MessageCircle,
  Video,
  Mail,
  Plus,
  X,
  ChevronDown,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent
} from 'lucide-react';

const initialService = {
  serviceName: '',
  serviceAmount: '',
  mouSigned: 'No',
  signedMouAmount: '',
  workStatus: 'Not Initiated',
  bda: '',
  department: 'Operations'
};

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Delhi", "Puducherry",
  "Ladakh", "Jammu and Kashmir"
];

const initialFormData = {
  companyName: '', caseTitle: '', priority: 'Medium', sourceOfComplaint: '',
  typeOfComplaint: '', brandName: '',
  engagementNote: 'This is a multi-stage consultancy and execution support engagement. ₹0 was formalized under the initial MOU, while the remaining amount was received towards extended scope, third-party facilitation, and stage-wise execution.',
  clientName: '', clientMobile: '', clientEmail: '', state: '', city: '', pincode: '',
  totalAmtPaid: '', mouSigned: 'No', totalMouValue: '', amtInDispute: '', dateOfLastPayment: '',
  smRisk: 'None', consumerComplaintFiled: 'No', policeThreat: 'None', caseSummary: '', clientAllegation: '',
  proofCallRec: 'No', proofWaChat: 'No', proofVideoCall: 'No', proofFundingEmail: 'No',
  initiatedBy: '', accountable: '', legalOfficer: '', accounts: '',
  firNumber: '', firFileLink: '', grievanceNumber: '',
  assignedTo: '',
  linkedBy: ''
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

const NewCaseTab = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const editCase = location.state?.editCase || null;

  const [formData, setFormData] = useState(() => {
    if (location.state?.clear) {
      localStorage.removeItem('rrr_new_case_form');
      localStorage.removeItem('rrr_new_case_services');
      localStorage.removeItem('rrr_new_case_mode');
      localStorage.removeItem('rrr_new_case_acks');
      return initialFormData;
    }
    if (editCase) return initialFormData;
    const saved = localStorage.getItem('rrr_new_case_form');
    return saved ? JSON.parse(saved) : initialFormData;
  });

  const [errors, setErrors] = useState({
    clientEmail: '',
    clientMobile: '',
    companyName: ''
  });

  const [userList, setUserList] = useState([]); // List of users for dropdown

  const [serviceMode, setServiceMode] = useState(() => {
    if (location.state?.clear) return 'Single Service';
    if (editCase) return 'Single Service';
    const saved = localStorage.getItem('rrr_new_case_mode');
    return saved || 'Single Service';
  });

  const [services, setServices] = useState(() => {
    if (location.state?.clear) return [{ ...initialService }];
    if (editCase) return [{ ...initialService }];
    const saved = localStorage.getItem('rrr_new_case_services');
    return saved ? JSON.parse(saved) : [{ ...initialService }];
  });

  const [cyberAcks, setCyberAcks] = useState(() => {
    if (editCase) return [''];
    const saved = localStorage.getItem('rrr_new_case_acks');
    return saved ? JSON.parse(saved) : [''];
  });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCase, setDuplicateCase] = useState(null);
  const [visibleSteps, setVisibleSteps] = useState(1);

  useEffect(() => {
    if (editCase) {
      setVisibleSteps(7);
      setFormData(prev => {
        const data = { ...prev, ...editCase };
        return {
          ...data,
          companyName: editCase.companyName || '',
          caseTitle: editCase.caseTitle || '',
          priority: editCase.priority || 'Medium',
          sourceOfComplaint: editCase.sourceOfComplaint || '',
          typeOfComplaint: editCase.typeOfComplaint || '',
          brandName: editCase.brandName || '',
          clientName: editCase.clientName || '',
          clientMobile: editCase.clientMobile || '',
          clientEmail: editCase.clientEmail || '',
          state: editCase.state || '',
          city: editCase.city || '',
          pincode: editCase.pincode || '',
          engagementNote: editCase.engagementNote || data.engagementNote || '',
          caseSummary: editCase.caseSummary || editCase.summary || '',
          clientAllegation: editCase.clientAllegation || editCase.allegation || '',
          totalAmtPaid: editCase.totalAmtPaid || editCase.amountPaid || '',
          totalMouValue: editCase.totalMouValue || editCase.mouValue || '',
          amtInDispute: editCase.amtInDispute || editCase.disputeAmount || '',
          dateOfLastPayment: formatDateForInput(editCase.dateOfLastPayment || editCase.lastUpdateDate),
          initiatedBy: editCase.initiatedBy || editCase.initiator || '',
          accountable: editCase.accountable || '',
          legalOfficer: editCase.legalOfficer || '',
          accounts: editCase.accounts || '',
          assignedTo: editCase.assignedTo || editCase.owner || '',
          firNumber: editCase.firNumber || '',
          firFileLink: editCase.firFileLink || '',
          grievanceNumber: editCase.grievanceNumber || '',
          importDocumentLink: editCase.importDocumentLink || '',
          proofCallRec: editCase.proofCallRec || 'No',
          proofWaChat: editCase.proofWaChat || 'No',
          proofVideoCall: editCase.proofVideoCall || 'No',
          proofFundingEmail: editCase.proofFundingEmail || 'No',
          mouSigned: editCase.mouSigned || 'No',
          smRisk: editCase.smRisk || 'None',
          consumerComplaintFiled: editCase.consumerComplaintFiled || 'No',
          policeThreat: editCase.policeThreat || 'None'
        };
      });

      setServiceMode(editCase.serviceMode || 'Single Service');

      if (editCase.servicesSold && Array.isArray(editCase.servicesSold) && editCase.servicesSold.length > 0) {
        setServices(editCase.servicesSold);
      } else {
        setServices([{ ...initialService }]);
      }

      if (editCase.cyberAckNumbers) {
        setCyberAcks(editCase.cyberAckNumbers.split(',').filter(Boolean));
      } else {
        setCyberAcks(['']);
      }
    }
  }, [editCase]);

  // Persistence save hooks stay the same, but the initial load is now handled in useState initialization

  useEffect(() => {
    if (!editCase) {
      localStorage.setItem('rrr_new_case_form', JSON.stringify(formData));
    }
  }, [formData, editCase]);

  useEffect(() => {
    if (!editCase) {
      localStorage.setItem('rrr_new_case_services', JSON.stringify(services));
    }
  }, [services, editCase]);

  useEffect(() => {
    if (!editCase) {
      localStorage.setItem('rrr_new_case_mode', serviceMode);
    }
  }, [serviceMode, editCase]);

  useEffect(() => {
    if (!editCase) {
      localStorage.setItem('rrr_new_case_acks', JSON.stringify(cyberAcks));
    }
  }, [cyberAcks, editCase]);

  const clearFormPersistence = () => {
    localStorage.removeItem('rrr_new_case_form');
    localStorage.removeItem('rrr_new_case_services');
    localStorage.removeItem('rrr_new_case_mode');
    localStorage.removeItem('rrr_new_case_acks');
  };

  // Fetch users for assignment dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/auth/users');
        setUserList(res.data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, []);

  const checkCompanyNameDuplicate = async (name) => {
    if (!name) return;
    try {
      const res = await api.get(`/cases/check-duplicate?companyName=${encodeURIComponent(name)}`);
      if (res.data.exists) {
        setErrors(prev => ({ ...prev, companyName: 'Company name already exist' }));
      } else {
        setErrors(prev => ({ ...prev, companyName: '' }));
      }
    } catch (err) {
      console.error('Failed to check duplicate company name', err);
    }
  };

  const [linkedCases, setLinkedCases] = useState([]);

  useEffect(() => {
    const fetchLinkedCases = async () => {
      const name = formData.clientName;
      const mobile = formData.clientMobile;
      if (!name && !mobile) {
        setLinkedCases([]);
        return;
      }
      try {
        const res = await api.get(`/cases/search-client?name=${encodeURIComponent(name)}&mobile=${encodeURIComponent(mobile)}`);
        setLinkedCases(res.data);
      } catch (err) {
        console.error('Failed to fetch linked cases', err);
      }
    };

    const debounceTimer = setTimeout(fetchLinkedCases, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.clientName, formData.clientMobile]);
  useEffect(() => {
    if (!editCase && user?.role?.toLowerCase() === 'staff') {
      setFormData(prev => ({ ...prev, initiatedBy: '' }));
    }
  }, [user, editCase]);

  // Auto-calculate financial details from services
  useEffect(() => {
    const totalPaid = services.reduce((sum, s) => sum + (Number(s.serviceAmount) || 0), 0);
    const totalMou = services.reduce((sum, s) => sum + (Number(s.signedMouAmount) || 0), 0);
    const dispute = totalPaid - totalMou;

    setFormData(prev => ({
      ...prev,
      totalAmtPaid: totalPaid || '',
      totalMouValue: totalMou || '',
      amtInDispute: dispute || ''
    }));

    // Also update engagement note if MOU value changes
    if (totalMou >= 0) {
      setFormData(prev => ({
        ...prev,
        engagementNote: `This is a multi-stage consultancy and execution support engagement. ₹${totalMou} was formalized under the initial MOU, while the remaining amount was received towards extended scope, third-party facilitation, and stage-wise execution.`
      }));
    }
  }, [services]);

  const handleFormat = (fieldName, type) => {
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
      const lines = selectedText ? selectedText.split('\n') : [''];
      replacement = lines.map(line => line.replace(/^[\s•\-\d]+[.\s]*/, '').trimStart()).join('\n');
    } else if (type === 'bold') {
      replacement = selectedText ? `**${selectedText}**` : '**bold text**';
    }


    const newValue = beforeText + replacement + afterText;
    setFormData(prev => ({ ...prev, [fieldName]: newValue }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + replacement.length);
    }, 0);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Numbers only restriction for specific fields
    if (name === 'clientMobile' || name === 'totalAmtPaid' || name === 'totalMouValue' || name === 'amtInDispute') {
      value = value.replace(/\D/g, ''); // Remove all non-digits
    }

    let updates = { [name]: value };

    if (name === 'companyName' || name === 'typeOfComplaint') {
      const comp = name === 'companyName' ? value : formData.companyName;
      const typeC = name === 'typeOfComplaint' ? value : formData.typeOfComplaint;
      updates.caseTitle = `${comp || 'Company'} - ${typeC || 'Type'}`;
    }

    if (name === 'totalMouValue') {
      updates.engagementNote = `This is a multi-stage consultancy and execution support engagement. ₹${value || '0'} was formalized under the initial MOU, while the remaining amount was received towards extended scope, third-party facilitation, and stage-wise execution.`;
    }

    if (name === 'typeOfComplaint' && !['Legal Notice', '1930 Cyber Complaint', 'Consumer Complaint'].includes(value)) {
      updates.importDocumentLink = '';
    }

    if (name === 'initiatedBy') {
      const cleanVal = value?.toLowerCase() === 'staff' ? '' : value;
      updates.initiatedBy = cleanVal;
      updates.assignedTo = cleanVal;
    }

    if (name === 'assignedTo') {
      updates.assignedTo = value?.toLowerCase() === 'staff' ? '' : value;
    }

    // Inline Validations
    if (name === 'clientEmail') {
      if (value) {
        const emails = value.split(',').map(e => e.trim());
        const invalid = emails.some(e => e && !e.includes('@'));
        if (invalid) {
          setErrors(prev => ({ ...prev, clientEmail: 'Pattern not valid! Each email must contain @' }));
        } else {
          setErrors(prev => ({ ...prev, clientEmail: '' }));
        }
      } else {
        setErrors(prev => ({ ...prev, clientEmail: '' }));
      }
    }

    if (name === 'clientMobile') {
      const clean = value.replace(/\s+/g, '');
      if (clean && !/^\d{10}$/.test(clean)) {
        setErrors(prev => ({ ...prev, clientMobile: 'Pattern not valid! Must be 10 digits' }));
      } else {
        setErrors(prev => ({ ...prev, clientMobile: '' }));
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

  const handleClearForm = () => {
    if (!window.confirm('Are you sure you want to clear the form? All entered details will be lost.')) return;
    clearFormPersistence();
    setFormData({
      companyName: '', caseTitle: '', priority: 'Medium', sourceOfComplaint: '',
      typeOfComplaint: '', brandName: '', engagementNote: '',
      clientName: '', clientMobile: '', clientEmail: '', state: '',
      totalAmtPaid: '', mouSigned: 'No', totalMouValue: '', amtInDispute: '', dateOfLastPayment: '',
      smRisk: 'None', consumerComplaintFiled: 'No', policeThreat: 'None', caseSummary: '', clientAllegation: '',
      proofCallRec: 'No', proofWaChat: 'No', proofVideoCall: 'No', proofFundingEmail: 'No',
      initiatedBy: '', accountable: '', legalOfficer: '', accounts: '',
      firNumber: '', firFileLink: '', grievanceNumber: '',
      assignedTo: ''
    });
    setServices([{ ...initialService }]);
    setServiceMode('Single Service');
    setCyberAcks(['']);
    setVisibleSteps(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (formData.clientEmail) {
      const emails = formData.clientEmail.split(',').map(e => e.trim());
      const invalid = emails.some(e => e && !e.includes('@'));
      if (invalid) {
        return toast.error('Each email must contain @', { icon: '📧' });
      }
    }

    const cleanMobile = formData.clientMobile.replace(/\s+/g, '');
    if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
      return toast.error('Mobile number must be exactly 10 digits', { icon: '📱' });
    }

    try {
      const payload = {
        ...formData,
        serviceMode,
        servicesSold: services,
        cyberAckNumbers: cyberAcks.filter(Boolean).join(',')
      };

      if (editCase) {
        // Remove MongoDB internal fields that should not be sent in the update
        const { _id, __v, caseId, createdAt, updatedAt, ...cleanPayload } = payload;
        await api.put(`/cases/${editCase.caseId}`, cleanPayload);
        toast.success('Case updated successfully');
        navigate('/case-master'); // Go back to master list after edit
      } else {
        await api.post('/cases', payload);
        toast.success('Case created successfully');
        clearFormPersistence();
        setFormData({
          companyName: '', caseTitle: '', priority: 'Medium', sourceOfComplaint: '',
          typeOfComplaint: '', brandName: '', engagementNote: '',
          clientName: '', clientMobile: '', clientEmail: '', state: '',
          totalAmtPaid: '', mouSigned: 'No', totalMouValue: '', amtInDispute: '', dateOfLastPayment: '',
          smRisk: 'None', consumerComplaintFiled: 'No', policeThreat: 'None', caseSummary: '', clientAllegation: '',
          proofCallRec: 'No', proofWaChat: 'No', proofVideoCall: 'No', proofFundingEmail: 'No',
          initiatedBy: '', accountable: '', legalOfficer: '', accounts: '',
          firNumber: '', firFileLink: '', grievanceNumber: '',
          assignedTo: ''
        });
        setServices([{ ...initialService }]);
        setServiceMode('Single Service');
        setCyberAcks(['']);
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.existingCase) {
        setDuplicateCase(err.response.data.existingCase);
        setShowDuplicateModal(true);
      } else {
        toast.error(err.response?.data?.error || 'Failed to create case');
      }
    }
  };

  const handleNextStep = (currentStep) => {
    let missingFields = [];

    if (currentStep === 1) {
      if (!formData.companyName) missingFields.push('Company Name');
      if (!formData.priority) missingFields.push('Priority');
      if (!formData.typeOfComplaint) missingFields.push('Type of Complaint');
      if (!formData.brandName) missingFields.push('Brand Name');
    }

    if (currentStep === 3) {
      if (!formData.clientName) missingFields.push('Client Name');
      if (!formData.clientMobile) missingFields.push('Mobile');
      else if (errors.clientMobile) missingFields.push('Valid Mobile (10 digits)');
    }

    if (currentStep === 6) {
      if (!formData.caseSummary) missingFields.push('Case Summary');
    }

    if (missingFields.length > 0) {
      toast.error(`Please fill required fields: ${missingFields.join(', ')}`, { icon: '⚠️' });
      return;
    }

    setVisibleSteps(currentStep + 1);
  };

  const inputClass = "w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent-soft outline-none transition-all bg-bg-input text-text-primary font-medium placeholder:text-text-muted shadow-inner";
  const labelClass = "block text-[11px] font-black text-text-muted uppercase tracking-[0.1em] mb-2";
  const sectionTitleClass = "text-md font-black flex items-center gap-2 mb-6 text-text-primary uppercase tracking-wider";
  const cardClass = "bg-bg-card rounded-2xl border-2 border-border p-4 sm:p-6 mb-6 shadow-sm transition-all duration-300";

  return (
    <div className="section active w-full pb-10 px-4 bg-bg-primary">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">
          {editCase ? 'Edit Case' : 'New Case '}
        </h2>
        {!editCase && (
          <button
            type="button"
            onClick={handleClearForm}
            className="bg-bg-card hover:bg-bg-input text-text-primary font-black py-2.5 px-6 rounded-xl border-2 border-border shadow-sm transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-95"
          >
            <Trash2 size={16} /> Clear Form
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>

        {/* Company & Case Info */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><Building2 size={18} className="text-accent" /> Company & Case Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6">
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Company Name</label>
              <input
                type="text"
                className={`${inputClass} ${errors.companyName ? 'border-red bg-red-soft' : ''}`}
                name="companyName"
                value={formData.companyName || ''}
                onChange={handleChange}
                onBlur={(e) => checkCompanyNameDuplicate(e.target.value)}
                placeholder="e.g. ABC Solutions Pvt Ltd"
                required
              />
              {errors.companyName && <p className="text-[9px] text-red font-black mt-2 uppercase tracking-widest">{errors.companyName}</p>}
            </div>
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Case Title</label>
              <input type="text" className={`${inputClass} !bg-bg-secondary !border-dashed`} value={formData.caseTitle || ''} placeholder="Auto generated title" readOnly required />
            </div>
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Priority</label>
              <select className={inputClass} name="priority" value={formData.priority || 'Medium'} onChange={handleChange} required>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Source of Complaint</label>
              <select className={inputClass} name="sourceOfComplaint" value={formData.sourceOfComplaint || ''} onChange={handleChange}>
                <option value="">-- Select --</option>
                <option value="Email">Email</option>
                <option value="Call">Call</option>
                <option value="Office Visit">Office Visit</option>
                <option value="Social Media">Social Media</option>
                <option value="Toll Free">Toll Free</option>
                <option value="Notice">Notice</option>
              </select>
            </div>
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Type of Complaint</label>
              <select className={inputClass} name="typeOfComplaint" value={formData.typeOfComplaint || ''} onChange={handleChange} required>
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
              <select className={inputClass} name="brandName" value={formData.brandName || ''} onChange={handleChange} required>
                <option value="">-- Select --</option>
                <option value="Startupflora">Startupflora</option>
              </select>
            </div>
            {['Legal Notice', '1930 Cyber Complaint', 'Consumer Complaint'].includes(formData.typeOfComplaint) && (
              <div>
                <label className={labelClass}>Import Document ({formData.typeOfComplaint})</label>
                <FileUpload
                  onUploadSuccess={(url) => setFormData(prev => ({ ...prev, importDocumentLink: url }))}
                  label={`Upload ${formData.typeOfComplaint} Proof`}
                  accentColor="blue"
                  compact={true}
                />
              </div>
            )}

            {formData.typeOfComplaint === '1930 Cyber Complaint' && (
              <div>
                <label className={labelClass}>Acknowledgment Numbers</label>
                {cyberAcks.map((ack, idx) => (
                  <div key={idx} className="flex gap-3 mb-3">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. 1234567890"
                      value={ack}
                      onChange={(e) => handleCyberAckChange(idx, e.target.value)}
                    />
                    {cyberAcks.length > 1 && (
                      <button type="button" onClick={() => removeCyberAck(idx)} className="bg-red-soft text-red px-4 rounded-xl font-black hover:bg-red hover:text-white transition-all">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addCyberAck} className="text-xs text-accent font-black hover:underline mt-1 uppercase tracking-widest">+ Add Another Number</button>
              </div>
            )}

            {formData.typeOfComplaint === 'Criminal Complaint/FIR' && (
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>FIR Number</label>
                    <input type="text" className={inputClass} name="firNumber" value={formData.firNumber} onChange={handleChange} />
                  </div>
                  <div>
                    <FileUpload onUploadSuccess={(url) => setFormData(p => ({ ...p, firFileLink: url }))} label="Upload FIR Document" compact={true} />
                  </div>
                </div>
              </div>
            )}

            {formData.typeOfComplaint === 'Consumer Complaint' && (
              <div>
                <label className={labelClass}>Grievance Number</label>
                <input type="text" className={inputClass} name="grievanceNumber" value={formData.grievanceNumber} onChange={handleChange} />
              </div>
            )}
          </div>
        </div>

        {visibleSteps === 1 && (
          <div className="flex justify-center mb-8 -mt-2 animate-enter">
            <button type="button" onClick={() => handleNextStep(1)} className="bg-bg-input border border-border text-text-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:border-accent hover:text-accent transition-all flex items-center gap-2 shadow-sm">
              Next: Services Configuration <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Services Sold Configuration */}
        {visibleSteps >= 2 && (
          <div className={`${cardClass} border-yellow-soft/50 shadow-[0_0_10px_rgba(250,204,21,0.05)] animate-enter`}>
            <h3 className={sectionTitleClass}><Wrench size={18} className="text-yellow" /> Services Sold Configuration</h3>

            <div className="flex flex-col lg:flex-row gap-6 mb-8 border-b border-border pb-8">
              <div className="w-full lg:w-1/4">
                <label className={labelClass}>Service Mode</label>
                <select className={`${inputClass} font-black uppercase text-[11px] tracking-widest`} value={serviceMode} onChange={(e) => {
                  setServiceMode(e.target.value);
                  if (e.target.value === 'Single Service') setServices([services[0]]);
                }}>
                  <option value="Single Service">Single Service</option>
                  <option value="Multiple Services">Multiple Services</option>
                </select>
              </div>
              {serviceMode === 'Multiple Services' && (
                <div className="w-full lg:w-3/4">
                  <label className={labelClass}>Engagement Note</label>
                  <textarea
                    className={`${inputClass} h-12 border-dashed !bg-bg-secondary italic`}
                    name="engagementNote"
                    value={formData.engagementNote}
                    onChange={handleChange}
                    placeholder="Brief summary of what was promised/sold..."
                  ></textarea>
                </div>
              )}
            </div>

            {services.map((svc, idx) => (
              <div key={idx} className="relative bg-bg-input p-6 rounded-2xl border border-border mb-6">
                {services.length > 1 && (
                  <button type="button" onClick={() => removeService(idx)} className="absolute top-4 right-4 text-red hover:bg-red-soft p-2 rounded-xl transition-all" title="Remove Service">
                    <X size={18} />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Service Name</label>
                    <input type="text" className={inputClass} placeholder="Enter service name" value={svc.serviceName} onChange={e => handleServiceChange(idx, 'serviceName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Service Amount</label>
                    <input type="text" className={inputClass} placeholder="₹" value={svc.serviceAmount} onChange={e => handleServiceChange(idx, 'serviceAmount', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>MOU Signed</label>
                    <select className={inputClass} value={svc.mouSigned} onChange={e => handleServiceChange(idx, 'mouSigned', e.target.value)}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Signed MOU Amount</label>
                    <input type="text" className={inputClass} placeholder="₹" value={svc.signedMouAmount} onChange={e => handleServiceChange(idx, 'signedMouAmount', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Work Status</label>
                    <select className={inputClass} value={svc.workStatus} onChange={e => handleServiceChange(idx, 'workStatus', e.target.value)}>
                      <option value="Not Initiated">Not Initiated</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Submitted">Submitted</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Converted">Converted</option>
                      <option value="Q/A not approved">Q/A not approved</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>BDA</label>
                    <input type="text" className={inputClass} placeholder="BDA Name" value={svc.bda} onChange={e => handleServiceChange(idx, 'bda', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Department</label>
                    <select className={inputClass} value={svc.department} onChange={e => handleServiceChange(idx, 'department', e.target.value)}>
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
        )}

        {visibleSteps === 2 && (
          <div className="flex justify-center mb-8 -mt-2 animate-enter">
            <button type="button" onClick={() => handleNextStep(2)} className="bg-bg-input border border-border text-text-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:border-accent hover:text-accent transition-all flex items-center gap-2 shadow-sm">
              Next: Client Information <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Client Information */}
        {visibleSteps >= 3 && (
          <div className={`${cardClass} animate-enter`}>
            <h3 className={sectionTitleClass}><User size={18} className="text-blue" /> Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div>
                <label className={`${labelClass} after:content-['*'] after:text-red`}>Client Name</label>
                <input type="text" className={`${inputClass} h-12`} name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Full name" required />
              </div>
              <div>
                <label className={labelClass}>Mobile</label>
                <input type="text" className={`${inputClass} h-12 ${errors.clientMobile ? 'border-red bg-red-soft' : ''}`} name="clientMobile" value={formData.clientMobile} onChange={handleChange} placeholder="10 Digit Number" required />
                {errors.clientMobile && <p className="text-[9px] text-red font-black mt-2 uppercase tracking-widest">{errors.clientMobile}</p>}
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="text" className={`${inputClass} h-12 ${errors.clientEmail ? 'border-red bg-red-soft' : ''}`} name="clientEmail" value={formData.clientEmail || ''} onChange={handleChange} placeholder="example@gmail.com" />
                {errors.clientEmail && <p className="text-[9px] text-red font-black mt-2 uppercase tracking-widest">{errors.clientEmail}</p>}
              </div>
              <div>
                <label className={labelClass}>Linked By</label>
                <select
                  className={inputClass}
                  name="linkedBy"
                  value={formData.linkedBy || ''}
                  onChange={handleChange}
                >
                  <option value="">-- Select Linked Case --</option>
                  {linkedCases.map(c => (
                    <option key={c.caseId} value={c.caseId}>
                      {c.companyName} ({c.caseId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>State</label>
                <SearchableSelect
                  name="state"
                  options={indianStates}
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Search state..."
                  className="!bg-bg-input !border-border h-12"
                />
              </div>
              {(formData.state || formData.city || formData.pincode) && (
                <>
                  <div>
                    <label className={labelClass}>City</label>
                    <input type="text" className={`${inputClass} h-12`} name="city" value={formData.city || ''} onChange={handleChange} placeholder="Enter city" />
                  </div>
                  <div>
                    <label className={labelClass}>Pincode</label>
                    <input type="text" className={`${inputClass} h-12`} name="pincode" value={formData.pincode || ''} onChange={handleChange} placeholder="Enter pincode" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {visibleSteps === 3 && (
          <div className="flex justify-center mb-8 -mt-2 animate-enter">
            <button type="button" onClick={() => handleNextStep(3)} className="bg-bg-input border border-border text-text-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:border-accent hover:text-accent transition-all flex items-center gap-2 shadow-sm">
              Next: Financial Details <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Financial Details */}
        {visibleSteps >= 4 && (
          <div className={`${cardClass} animate-enter`}>
            <h3 className={sectionTitleClass}><IndianRupee size={18} className="text-yellow" /> Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div>
                <label className={labelClass}>Total Amount Paid (₹)</label>
                <input type="text" className={`${inputClass} h-12 !bg-bg-secondary !border-dashed font-black`} name="totalAmtPaid" value={formData.totalAmtPaid || ''} readOnly placeholder="Auto calculated" />
              </div>
              {/* <div>
                <label className={labelClass}>MOU Signed?</label>
                <select className={`${inputClass} h-12`} name="mouSigned" value={formData.mouSigned || 'No'} onChange={handleChange}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div> */}
              <div>
                <label className={labelClass}>Total MOU Value (₹)</label>
                <input type="text" className={`${inputClass} h-12 !bg-bg-secondary !border-dashed font-black`} name="totalMouValue" value={formData.totalMouValue || ''} readOnly placeholder="Auto calculated" />
              </div>
              <div>
                <label className={labelClass}>Amount In Dispute (₹)</label>
                <input type="text" className={`${inputClass} h-12 bg-blue-soft font-black text-blue border-blue-soft`} name="amtInDispute" value={formData.amtInDispute || ''} readOnly placeholder="Auto calculated" />
              </div>
              <div>
                <label className={labelClass}>Date of Last Payment</label>
                <input type="date" className={`${inputClass} h-12`} name="dateOfLastPayment" value={formData.dateOfLastPayment || ''} onChange={handleChange} />
              </div>
            </div>
          </div>
        )}

        {visibleSteps === 4 && (
          <div className="flex justify-center mb-8 -mt-2 animate-enter">
            <button type="button" onClick={() => handleNextStep(4)} className="bg-bg-input border border-border text-text-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:border-accent hover:text-accent transition-all flex items-center gap-2 shadow-sm">
              Next: Risk & Threat Assessment <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Risk & Threat Assessment */}
        {visibleSteps >= 5 && (
          <div className={`${cardClass} animate-enter`}>
            <h3 className={sectionTitleClass}><AlertTriangle size={18} className="text-red" /> Risk & Threat Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div>
                <label className={labelClass}>Social Media Risk</label>
                <select className={inputClass} name="smRisk" value={formData.smRisk || 'None'} onChange={handleChange}>
                  <option value="None">None</option>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Consumer Complaint Filed?</label>
                <select className={inputClass} name="consumerComplaintFiled" value={formData.consumerComplaintFiled || 'No'} onChange={handleChange}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Police / Cyber Threat</label>
                <select className={inputClass} name="policeThreat" value={formData.policeThreat || 'None'} onChange={handleChange}>
                  <option value="None">None</option>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {visibleSteps === 5 && (
          <div className="flex justify-center mb-8 -mt-2 animate-enter">
            <button type="button" onClick={() => handleNextStep(5)} className="bg-bg-input border border-border text-text-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:border-accent hover:text-accent transition-all flex items-center gap-2 shadow-sm">
              Next: Case Narrative <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Case Narrative */}
        {visibleSteps >= 6 && (
          <div className={`${cardClass} animate-enter`}>
            <h3 className={sectionTitleClass}><FileText size={18} className="text-text-muted" /> Case Narrative</h3>
            <div className="grid grid-cols-1 gap-6 mb-8">
              <div>
                <label className={`${labelClass} after:content-['*'] after:text-red`}>Case Summary</label>
                {/* Formatting Toolbar – always visible */}
                <div className="flex items-center bg-bg-card border border-border rounded-t-xl px-3 py-2 gap-0 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    title="Paragraph"
                    onClick={() => handleFormat('caseSummary', 'paragraph')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-accent hover:text-accent cursor-pointer"
                  >
                    <span className="text-[12px]">¶</span> Paragraph
                  </button>
                  <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                  <button
                    type="button"
                    title="Bullet List"
                    onClick={() => handleFormat('caseSummary', 'bullets')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                  >
                    <span className="text-[11px]">≡</span> Bullet List
                  </button>
                  <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                  <button
                    type="button"
                    title="Number List"
                    onClick={() => handleFormat('caseSummary', 'numbers')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                  >
                    <span className="text-[11px]">≡</span> Number List
                  </button>
                  <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                  <button
                    type="button"
                    title="Bold"
                    onClick={() => handleFormat('caseSummary', 'bold')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                  >
                    <span className="font-black text-[12px]">B</span> Bold
                  </button>
                </div>
                <textarea
                  className={`${inputClass} min-h-[120px] !rounded-t-none !border-t-0`}
                  name="caseSummary"
                  value={formData.caseSummary || ''}
                  onChange={handleChange}
                  placeholder="Brief overview of the case..."
                  required
                ></textarea>
              </div>
              <div>
                <label className={labelClass}>Client's Main Allegation</label>
                {/* Formatting Toolbar */}
                <div className="flex items-center bg-bg-card border border-border rounded-t-xl px-3 py-2 gap-0 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    title="Paragraph"
                    onClick={() => handleFormat('clientAllegation', 'paragraph')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-accent hover:text-accent cursor-pointer"
                  >
                    <span className="text-[12px]">¶</span> Paragraph
                  </button>
                  <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                  <button
                    type="button"
                    title="Bullet List"
                    onClick={() => handleFormat('clientAllegation', 'bullets')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                  >
                    <span className="text-[11px]">≡</span> Bullet List
                  </button>
                  <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                  <button
                    type="button"
                    title="Number List"
                    onClick={() => handleFormat('clientAllegation', 'numbers')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                  >
                    <span className="text-[11px]">≡</span> Number List
                  </button>
                  <span className="w-px h-4 bg-border mx-1 shrink-0"></span>
                  <button
                    type="button"
                    title="Bold"
                    onClick={() => handleFormat('clientAllegation', 'bold')}
                    className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-text-secondary hover:text-accent cursor-pointer"
                  >
                    <span className="font-black text-[12px]">B</span> Bold
                  </button>
                </div>
                <textarea
                  className={`${inputClass} min-h-[100px] !rounded-t-none !border-t-0`}
                  name="clientAllegation"
                  value={formData.clientAllegation || ''}
                  onChange={handleChange}
                  placeholder="What the client claims..."
                ></textarea>
              </div>

            </div>

            <div className="bg-bg-secondary border-2 border-border rounded-2xl p-4 sm:p-8">
              <label className="block text-[11px] font-black text-text-muted mb-6 uppercase tracking-widest"> Proofs</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center justify-between bg-bg-card border-2 border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <PhoneIncoming size={16} className="text-accent" />
                    <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Call Recording</span>
                  </div>
                  <select className="bg-bg-input border border-border rounded-xl text-xs font-black p-2 outline-none" name="proofCallRec" value={formData.proofCallRec || 'No'} onChange={handleChange}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="flex items-center justify-between bg-bg-card border-2 border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <MessageCircle size={16} className="text-green" />
                    <span className="text-xs font-black text-text-secondary uppercase tracking-widest">WhatsApp Chat</span>
                  </div>
                  <select className="bg-bg-input border border-border rounded-xl text-xs font-black p-2 outline-none" name="proofWaChat" value={formData.proofWaChat || 'No'} onChange={handleChange}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="flex items-center justify-between bg-bg-card border-2 border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Video size={16} className="text-purple" />
                    <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Video Call</span>
                  </div>
                  <select className="bg-bg-input border border-border rounded-xl text-xs font-black p-2 outline-none" name="proofVideoCall" value={formData.proofVideoCall || 'No'} onChange={handleChange}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="flex items-center justify-between bg-bg-card border-2 border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-blue" />
                    <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Funding Email</span>
                  </div>
                  <select className="bg-bg-input border border-border rounded-xl text-xs font-black p-2 outline-none" name="proofFundingEmail" value={formData.proofFundingEmail || 'No'} onChange={handleChange}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {visibleSteps === 6 && (
          <div className="flex justify-center mb-8 -mt-2 animate-enter">
            <button type="button" onClick={() => handleNextStep(6)} className="bg-bg-input border border-border text-text-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] hover:border-accent hover:text-accent transition-all flex items-center gap-2 shadow-sm">
              Next: Team Assignment & Submit <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Team Assignment */}
        {visibleSteps >= 7 && (
          <>
            <div className={`${cardClass} animate-enter`}>
              <h3 className={sectionTitleClass}><Users size={18} className="text-purple" /> Team Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className={labelClass}>Assign To</label>
                  <select
                    className={`${inputClass} ${user?.role?.toLowerCase() === 'staff' ? 'bg-bg-secondary cursor-not-allowed opacity-50' : ''}`}
                    name="assignedTo"
                    value={formData.assignedTo || ''}
                    onChange={handleChange}
                    disabled={user?.role?.toLowerCase() === 'staff'}
                  >
                    <option value="">-- Select --</option>
                    {/* Only show Operations users in Initiated By dropdown for Admin/Ops */}
                    {user?.role?.toLowerCase() !== 'staff' && userList.filter(u => u.role?.toLowerCase() === 'operations').map(u => (
                      <option key={u.email} value={u.fullName}>{u.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Accountable</label>
                  <select className={inputClass} name="accountable" value={formData.accountable || ''} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    {userList.filter(u => u.role?.toLowerCase() !== 'admin').map(u => (
                      <option key={u.email} value={u.fullName}>{u.fullName} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Legal Officer (In Case If Any)</label>
                  <input type="text" className={inputClass} name="legalOfficer" value={formData.legalOfficer || ''} onChange={handleChange} placeholder="Enter name if any" />
                </div>
                <div>
                  <label className={labelClass}>Accounts</label>
                  <select className={inputClass} name="accounts" value={formData.accounts || ''} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    {userList.filter(u => u.role?.toLowerCase().includes('account')).map(u => (
                      <option key={u.email} value={u.fullName}>{u.fullName} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-20">
              <button type="submit" className="w-full sm:w-auto bg-accent text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-accent-soft transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-95">
                <CheckCircle size={20} /> {editCase ? 'Update Case Profile' : 'Submit'}
              </button>
              <button type="button" className="w-full sm:w-auto bg-bg-card hover:bg-bg-input text-text-primary font-black py-4 px-10 rounded-2xl border-2 border-border shadow-sm transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-95" onClick={() => editCase ? navigate('/case-master') : window.location.reload()}>
                <Trash2 size={20} /> {editCase ? 'Cancel Edit' : 'Reset Form'}
              </button>
            </div>
          </>
        )}

      </form>

      {/* Duplicate Case Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="⚠️ Existing Case Found"
      >
        <div className="p-8">
          <div className="bg-red/10 border-2 border-red/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <AlertTriangle className="text-red shrink-0" size={24} />
            <div>
              <p className="text-sm font-black text-red uppercase tracking-wider mb-1">Duplicate Entry Detected</p>
              <p className="text-xs font-medium text-text-secondary leading-relaxed">
                A case with these details already exists in the system. Please review the existing information below to avoid duplicate records.
              </p>
            </div>
          </div>

          {duplicateCase && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-input p-4 rounded-2xl border border-border">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Case ID</p>
                <p className="text-sm font-black text-accent uppercase">{duplicateCase.caseId}</p>
              </div>
              <div className="bg-bg-input p-4 rounded-2xl border border-border">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Status</p>
                <p className="text-sm font-black text-text-primary uppercase">{duplicateCase.currentStatus}</p>
              </div>
              <div className="bg-bg-input p-4 rounded-2xl border border-border col-span-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Company Name</p>
                <p className="text-sm font-black text-text-primary uppercase">{duplicateCase.companyName}</p>
              </div>
              <div className="bg-bg-input p-4 rounded-2xl border border-border">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Client Name</p>
                <p className="text-sm font-black text-text-primary uppercase">{duplicateCase.clientName}</p>
              </div>
              <div className="bg-bg-input p-4 rounded-2xl border border-border">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Assign To</p>
                <p className="text-sm font-black text-text-primary uppercase">{duplicateCase.assignedTo || 'N/A'}</p>
              </div>
            </div>
          )}

          <div className="mt-10 flex gap-4">
            <button
              onClick={() => {
                setShowDuplicateModal(false);
                navigate(`/case-master?search=${duplicateCase.caseId}`);
              }}
              className="flex-1 bg-accent text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
            >
              View Existing Case
            </button>
            <button
              onClick={() => setShowDuplicateModal(false)}
              className="flex-1 bg-bg-input text-text-primary font-black py-4 rounded-2xl text-xs uppercase tracking-widest border border-border active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NewCaseTab;
