import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import FileUpload from '../shared/FileUpload';
import SearchableSelect from '../shared/SearchableSelect';
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
  X
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

const NewCaseTab = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const editCase = location.state?.editCase || null;

  const [formData, setFormData] = useState({
    companyName: '', caseTitle: '', priority: 'Medium', sourceOfComplaint: '',
    typeOfComplaint: '', brandName: '',
    engagementNote: 'This is a multi-stage consultancy and execution support engagement. ₹0 was formalized under the initial MOU, while the remaining amount was received towards extended scope, third-party facilitation, and stage-wise execution.',
    clientName: '', clientMobile: '', clientEmail: '', state: '',
    totalAmtPaid: '', mouSigned: 'No', totalMouValue: '', amtInDispute: '',
    smRisk: 'None', consumerComplaintFiled: 'No', policeThreat: 'None', caseSummary: '', clientAllegation: '',
    proofCallRec: 'No', proofWaChat: 'No', proofVideoCall: 'No', proofFundingEmail: 'No',
    initiatedBy: '', accountable: '', legalOfficer: '', accounts: '',
    firNumber: '', firFileLink: '', grievanceNumber: '',
    assignedTo: '' // New field
  });

  const [errors, setErrors] = useState({
    clientEmail: '',
    clientMobile: ''
  });

  const [userList, setUserList] = useState([]); // List of users for dropdown

  const [serviceMode, setServiceMode] = useState('Single Service');
  const [services, setServices] = useState([{ ...initialService }]);
  const [cyberAcks, setCyberAcks] = useState(['']);

  useEffect(() => {
    if (editCase) {
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
          engagementNote: editCase.engagementNote || data.engagementNote || '',
          caseSummary: editCase.caseSummary || editCase.summary || '',
          clientAllegation: editCase.clientAllegation || editCase.allegation || '',
          totalAmtPaid: editCase.totalAmtPaid || editCase.amountPaid || '',
          totalMouValue: editCase.totalMouValue || editCase.mouValue || '',
          amtInDispute: editCase.amtInDispute || editCase.disputeAmount || '',
          initiatedBy: editCase.initiatedBy || editCase.initiator || '',
          accountable: editCase.accountable || '',
          legalOfficer: editCase.legalOfficer || '',
          accounts: editCase.accounts || '',
          assignedTo: editCase.assignedTo || editCase.owner || '',
          firNumber: editCase.firNumber || '',
          firFileLink: editCase.firFileLink || '',
          grievanceNumber: editCase.grievanceNumber || '',
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updates = { [name]: value };

    if (name === 'companyName' || name === 'typeOfComplaint') {
      const comp = name === 'companyName' ? value : formData.companyName;
      const typeC = name === 'typeOfComplaint' ? value : formData.typeOfComplaint;
      updates.caseTitle = `${comp || 'Company'} - ${typeC || 'Type'}`;
    }

    if (name === 'totalMouValue') {
      updates.engagementNote = `This is a multi-stage consultancy and execution support engagement. ₹${value || '0'} was formalized under the initial MOU, while the remaining amount was received towards extended scope, third-party facilitation, and stage-wise execution.`;
    }

    // Inline Validations
    if (name === 'clientEmail') {
      if (value && !value.includes('@')) {
        setErrors(prev => ({ ...prev, clientEmail: 'Pattern not valid! Must contain @' }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (formData.clientEmail && !formData.clientEmail.toLowerCase().endsWith('@')) {
      return toast.error('Email must be a @ address', { icon: '📧' });
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
        setFormData({
          companyName: '', caseTitle: '', priority: 'Medium', sourceOfComplaint: '',
          typeOfComplaint: '', brandName: '', engagementNote: '',
          clientName: '', clientMobile: '', clientEmail: '', state: '',
          totalAmtPaid: '', mouSigned: 'No', totalMouValue: '', amtInDispute: '',
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
      toast.error(err.response?.data?.error || 'Failed to create case');
    }
  };

  const inputClass = "w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent-soft outline-none transition-all bg-bg-input text-text-primary font-medium placeholder:text-text-muted shadow-inner";
  const labelClass = "block text-[11px] font-black text-text-muted uppercase tracking-[0.1em] mb-2";
  const sectionTitleClass = "text-md font-black flex items-center gap-2 mb-6 text-text-primary uppercase tracking-wider";
  const cardClass = "bg-bg-card rounded-2xl border-2 border-border p-4 sm:p-6 mb-6 shadow-sm transition-all duration-300";

  return (
    <div className="section active w-full pb-10 px-4 bg-bg-primary">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">
          {editCase ? 'Edit Case' : 'New Case '}
        </h2>

      </div>

      <form onSubmit={handleSubmit}>

        {/* Company & Case Info */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><Building2 size={18} className="text-accent" /> Company & Case Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Company Name</label>
              <input type="text" className={inputClass} name="companyName" value={formData.companyName || ''} onChange={handleChange} placeholder="e.g. ABC Solutions Pvt Ltd" required />
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
              </select>
            </div>
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Type of Complaint</label>
              <select className={inputClass} name="typeOfComplaint" value={formData.typeOfComplaint || ''} onChange={handleChange} required>
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
              <select className={inputClass} name="brandName" value={formData.brandName || ''} onChange={handleChange} required>
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
                  <label className={labelClass}>Cyber Acknowledgment Numbers</label>
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
              {formData.typeOfComplaint === 'FIR' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className={labelClass}>FIR Number</label>
                    <input type="text" className={inputClass} name="firNumber" value={formData.firNumber} onChange={handleChange} />
                  </div>
                  <div>
                    <FileUpload onUploadSuccess={(url) => setFormData(p => ({ ...p, firFileLink: url }))} label="Upload FIR Document" />
                  </div>
                </div>
              )}
              {formData.typeOfComplaint === 'Consumer Complaint' && (
                <div className="mb-4">
                  <label className={labelClass}>Grievance Number</label>
                  <input type="text" className={inputClass} name="grievanceNumber" value={formData.grievanceNumber} onChange={handleChange} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Services Sold Configuration */}
        <div className={`${cardClass} border-yellow-soft/50 shadow-[0_0_10px_rgba(250,204,21,0.05)]`}>
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
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
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
              <input type="email" className={`${inputClass} h-12 ${errors.clientEmail ? 'border-red bg-red-soft' : ''}`} name="clientEmail" value={formData.clientEmail || ''} onChange={handleChange} placeholder="example@gmail.com" />
              {errors.clientEmail && <p className="text-[9px] text-red font-black mt-2 uppercase tracking-widest">{errors.clientEmail}</p>}
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
          </div>
        </div>

        {/* Financial Details */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><IndianRupee size={18} className="text-yellow" /> Financial Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <label className={labelClass}>Total Amount Paid (₹)</label>
              <input type="text" className={`${inputClass} h-12 !bg-bg-secondary !border-dashed font-black`} name="totalAmtPaid" value={formData.totalAmtPaid || ''} readOnly placeholder="Auto calculated" />
            </div>
            <div>
              <label className={labelClass}>MOU Signed?</label>
              <select className={`${inputClass} h-12`} name="mouSigned" value={formData.mouSigned || 'No'} onChange={handleChange}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Total MOU Value (₹)</label>
              <input type="text" className={`${inputClass} h-12 !bg-bg-secondary !border-dashed font-black`} name="totalMouValue" value={formData.totalMouValue || ''} readOnly placeholder="Auto calculated" />
            </div>
            <div>
              <label className={labelClass}>Amount In Dispute (₹)</label>
              <input type="text" className={`${inputClass} h-12 bg-blue-soft font-black text-blue border-blue-soft`} name="amtInDispute" value={formData.amtInDispute || ''} readOnly placeholder="Auto calculated" />
            </div>
          </div>
        </div>

        {/* Risk & Threat Assessment */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><AlertTriangle size={18} className="text-red" /> Risk & Threat Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <label className={labelClass}>Social Media Risk</label>
              <select className={inputClass} name="smRisk" value={formData.smRisk || 'None'} onChange={handleChange}>
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="High">High</option>
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

        {/* Case Narrative */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><FileText size={18} className="text-text-muted" /> Case Narrative</h3>
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red`}>Case Summary</label>
              <textarea className={`${inputClass} min-h-[100px]`} name="caseSummary" value={formData.caseSummary || ''} onChange={handleChange} placeholder="Brief overview of the case..." required></textarea>
            </div>
            <div>
              <label className={labelClass}>Client's Main Allegation</label>
              <textarea className={`${inputClass} min-h-[100px]`} name="clientAllegation" value={formData.clientAllegation || ''} onChange={handleChange} placeholder="What the client claims..."></textarea>
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

        {/* Team Assignment */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><Users size={18} className="text-purple" /> Team Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className={labelClass}>Initiated By</label>
              <select className={inputClass} name="initiatedBy" value={formData.initiatedBy || ''} onChange={handleChange}>
                <option value="">-- Select --</option>
                {userList.filter(u => u.role?.toLowerCase() !== 'admin').map(u => (
                  <option key={u.email} value={u.fullName}>{u.fullName} ({u.role})</option>
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

      </form>
    </div>
  );
};

export default NewCaseTab;
