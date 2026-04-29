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
      if (value && !value.toLowerCase().endsWith('@gmail.com')) {
        setErrors(prev => ({ ...prev, clientEmail: 'Pattern not valid! Must end with @gmail.com' }));
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
        await api.put(`/cases/${editCase.caseId}`, payload);
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

  const inputClass = "w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white";
  const labelClass = "block text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1";
  const sectionTitleClass = "text-md font-bold flex items-center gap-2 mb-4 text-gray-800";
  const cardClass = "bg-white rounded-lg border border-gray-200 p-5 mb-5 shadow-sm";

  return (
    <div className="section active w-full pb-10 px-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">New Case Creation</h2>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Company & Case Info */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><Building2 size={18} className="text-blue-500" /> Company & Case Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Company Name</label>
              <input type="text" className={inputClass} name="companyName" value={formData.companyName || ''} onChange={handleChange} placeholder="e.g. ABC Solutions Pvt Ltd" required />
            </div>
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Case Title</label>
              <input type="text" className={`${inputClass} bg-gray-50`} value={formData.caseTitle || ''} placeholder="Auto generated title" readOnly required />
            </div>
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Priority</label>
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
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Type of Complaint</label>
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
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Brand Name</label>
              <select className={inputClass} name="brandName" value={formData.brandName || ''} onChange={handleChange} required>
                <option value="">-- Select --</option>
                <option value="Startupflora">Startupflora</option>
              </select>
            </div>
          </div>

          {/* Conditional Complaint Fields */}
          {(formData.typeOfComplaint === 'Cyber Complaint' || formData.typeOfComplaint === 'FIR' || formData.typeOfComplaint === 'Consumer Complaint') && (
            <div className="mt-4 pt-4 border-t border-gray-100 bg-red-50/50 -mx-5 px-5 pb-2">
              {formData.typeOfComplaint === 'Cyber Complaint' && (
                <div className="mb-3">
                  <label className={labelClass}>Cyber Acknowledgment Numbers</label>
                  {cyberAcks.map((ack, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="e.g. 1234567890"
                        value={ack}
                        onChange={(e) => handleCyberAckChange(idx, e.target.value)}
                      />
                      {cyberAcks.length > 1 && (
                        <button type="button" onClick={() => removeCyberAck(idx)} className="bg-red-100 text-red-600 px-3 rounded font-bold hover:bg-red-200">×</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addCyberAck} className="text-xs text-blue-600 font-semibold hover:underline mt-1">+ Add Another Number</button>
                </div>
              )}
              {formData.typeOfComplaint === 'FIR' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
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
                <div className="mb-3">
                  <label className={labelClass}>Grievance Number</label>
                  <input type="text" className={inputClass} name="grievanceNumber" value={formData.grievanceNumber} onChange={handleChange} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Services Sold Configuration */}
        <div className={`${cardClass} border-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.05)]`}>
          <h3 className={sectionTitleClass}><Wrench size={18} className="text-yellow-500" /> Services Sold Configuration</h3>

          <div className="flex flex-col md:flex-row gap-4 mb-5 border-b border-gray-100 pb-5">
            <div className="w-full md:w-1/4">
              <label className={labelClass}>Service Mode</label>
              <select className={`${inputClass} font-semibold`} value={serviceMode} onChange={(e) => {
                setServiceMode(e.target.value);
                if (e.target.value === 'Single Service') setServices([services[0]]);
              }}>
                <option value="Single Service">Single Service</option>
                <option value="Multiple Services">Multiple Services</option>
              </select>
            </div>
            <div className="w-full md:w-3/4">
              <label className={labelClass}>Engagement Note</label>
              <textarea
                className={`${inputClass} h-10 border-dashed text-gray-600`}
                name="engagementNote"
                value={formData.engagementNote}
                onChange={handleChange}
                placeholder="Brief summary of what was promised/sold..."
              ></textarea>
            </div>
          </div>

          {services.map((svc, idx) => (
            <div key={idx} className="relative bg-gray-50/50 p-4 rounded border border-gray-100 mb-4">
              {services.length > 1 && (
                <button type="button" onClick={() => removeService(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1" title="Remove Service">
                  <X size={16} />
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Service Name</label>
                  <input type="text" className={inputClass} placeholder="Enter service" value={svc.serviceName} onChange={e => handleServiceChange(idx, 'serviceName', e.target.value)} />
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
                  <input type="text" className={inputClass} placeholder="Name" value={svc.bda} onChange={e => handleServiceChange(idx, 'bda', e.target.value)} />
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
            <button type="button" onClick={addService} className="mt-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 px-4 rounded border border-gray-300 transition-colors flex items-center gap-2">
              <Plus size={14} /> Add Another Service
            </button>
          )}
        </div>

        {/* Client Information */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><User size={18} className="text-blue-400" /> Client Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Client Name</label>
              <input type="text" className={inputClass} name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Full name" required />
            </div>
            <div>
              <label className={labelClass}>Mobile</label>
              <input type="text" className={`${inputClass} ${errors.clientMobile ? 'border-red-500 bg-red-50' : ''}`} name="clientMobile" value={formData.clientMobile} onChange={handleChange} placeholder="10 Digit Number" required />
              {errors.clientMobile && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.clientMobile}</p>}
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={`${inputClass} ${errors.clientEmail ? 'border-red-500 bg-red-50' : ''}`} name="clientEmail" value={formData.clientEmail || ''} onChange={handleChange} placeholder="example@gmail.com" />
              {errors.clientEmail && <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">{errors.clientEmail}</p>}
            </div>
            <div>
              <label className={labelClass}>State</label>
              <SearchableSelect 
                name="state"
                options={indianStates}
                value={formData.state}
                onChange={handleChange}
                placeholder="Search state..."
              />
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><IndianRupee size={18} className="text-orange-500" /> Financial Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className={labelClass}>Total Amount Paid (₹)</label>
              <input type="text" className={`${inputClass} bg-gray-50 font-bold`} name="totalAmtPaid" value={formData.totalAmtPaid || ''} readOnly placeholder="Auto calculated" />
            </div>
            <div>
              <label className={labelClass}>MOU Signed?</label>
              <select className={inputClass} name="mouSigned" value={formData.mouSigned || 'No'} onChange={handleChange}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Total MOU Value (₹)</label>
              <input type="text" className={`${inputClass} bg-gray-50 font-bold`} name="totalMouValue" value={formData.totalMouValue || ''} readOnly placeholder="Auto calculated" />
            </div>
            <div>
              <label className={labelClass}>Amount In Dispute (₹)</label>
              <input type="text" className={`${inputClass} bg-blue-50 font-bold text-blue-700`} name="amtInDispute" value={formData.amtInDispute || ''} readOnly placeholder="Auto calculated" />
            </div>
          </div>
        </div>

        {/* Risk & Threat Assessment */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><AlertTriangle size={18} className="text-red-500" /> Risk & Threat Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
          <h3 className={sectionTitleClass}><FileText size={18} className="text-gray-500" /> Case Narrative</h3>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className={`${labelClass} after:content-['*'] after:text-red-500`}>Case Summary</label>
              <textarea className={`${inputClass} min-h-[80px]`} name="caseSummary" value={formData.caseSummary || ''} onChange={handleChange} placeholder="Brief overview of the case..." required></textarea>
            </div>
            <div>
              <label className={labelClass}>Client's Main Allegation</label>
              <textarea className={`${inputClass} min-h-[80px]`} name="clientAllegation" value={formData.clientAllegation || ''} onChange={handleChange} placeholder="What the client claims..."></textarea>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Proofs</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded">
                <div className="flex items-center gap-2">
                  <PhoneIncoming size={14} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 uppercase">Call Recording</span>
                </div>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none" name="proofCallRec" value={formData.proofCallRec || 'No'} onChange={handleChange}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded">
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 uppercase">WhatsApp Chat</span>
                </div>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none" name="proofWaChat" value={formData.proofWaChat || 'No'} onChange={handleChange}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded">
                <div className="flex items-center gap-2">
                  <Video size={14} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 uppercase">Video Call</span>
                </div>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none" name="proofVideoCall" value={formData.proofVideoCall || 'No'} onChange={handleChange}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 uppercase">Funding Email</span>
                </div>
                <select className="border border-gray-300 rounded text-xs p-1 outline-none" name="proofFundingEmail" value={formData.proofFundingEmail || 'No'} onChange={handleChange}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Team Assignment */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}><Users size={18} className="text-purple-500" /> Team Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="flex gap-3">
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded shadow transition-colors flex items-center gap-2">
            <CheckCircle size={18} /> {editCase ? 'Update Case' : 'Create Case & Generate Study'}
          </button>
          <button type="button" className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded border border-gray-300 shadow-sm transition-colors flex items-center gap-2" onClick={() => editCase ? navigate('/case-master') : window.location.reload()}>
            <Trash2 size={18} /> {editCase ? 'Cancel Edit' : 'Clear Form'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default NewCaseTab;
