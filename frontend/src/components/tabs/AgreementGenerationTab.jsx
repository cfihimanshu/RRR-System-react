import React, { useState, useRef } from 'react';
import { FileText, List, Plus, RefreshCw, Trash2, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const AgreementGenerationTab = () => {
  const [formData, setFormData] = useState({
    date: '',
    firstPartyCompany: '',
    clientName: '',
    address: '',
    pincode: '',
    settlementAmount: '',
    amountInWords: '',
    firstPartySignatory: '',
    secondCompany: '',
    secondPartySignatory: ''
  });

  const [installments, setInstallments] = useState([]);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updates = { [name]: value };

    if (name === 'clientName') {
      updates.secondPartySignatory = value;
    }
    if (name === 'firstPartyCompany') {
      updates.secondCompany = value;
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleAddInstallment = () => {
    setInstallments([...installments, { id: Date.now(), amount: '', date: '' }]);
  };

  const handleRemoveInstallment = (id) => {
    setInstallments(installments.filter(inst => inst.id !== id));
  };

  const handleInstallmentChange = (id, field, value) => {
    setInstallments(installments.map(inst => 
      inst.id === id ? { ...inst, [field]: value } : inst
    ));
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the entire form?')) {
      setFormData({
        date: '',
        firstPartyCompany: '',
        clientName: '',
        address: '',
        pincode: '',
        settlementAmount: '',
        amountInWords: '',
        firstPartySignatory: '',
        secondCompany: '',
        secondPartySignatory: ''
      });
      setInstallments([]);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setGeneratedPdfBlob(null);
      setPdfUrl(null);
      toast.success('Form cleared');
    }
  };

  const getDayWithSuffix = (d) => {
    if (!d) return '___';
    const date = new Date(d);
    const day = date.getDate();
    if (day > 3 && day < 21) return day + 'th';
    switch (day % 10) {
      case 1:  return day + "st";
      case 2:  return day + "nd";
      case 3:  return day + "rd";
      default: return day + "th";
    }
  };

  const getMonthYear = (d) => {
    if (!d) return '___, ____';
    const date = new Date(d);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `${month}, ${year}`;
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.firstPartyCompany || !formData.clientName || !formData.settlementAmount) {
      toast.error('Please fill in all required fields marked with *');
      return;
    }
    
    const loadingToast = toast.loading('Generating Perfect PDF... (Using MS Word Engine)');
    try {
      // Helper to convert number to words (for small counts)
      const numberToWords = (n) => {
        const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
        return words[n] || n.toString();
      };

      const installmentCount = installments.length > 0 ? installments.length : 1;

      // Format installments for the template
      const formattedInstallments = installments.length > 0 
        ? installments.map((inst, index) => ({
            index: index + 1,
            amount: Number(inst.amount).toLocaleString('en-IN'),
            date: inst.date ? new Date(inst.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '_________________'
          }))
        : [{
            index: 1,
            amount: Number(formData.settlementAmount).toLocaleString('en-IN'),
            date: '_________________'
          }];

      // Create a single string summary of all installments
      const installmentDetails = formattedInstallments.map(i => `Installment ${i.index}: ₹ ${i.amount}/- payable on ${i.date}.`).join('\n');

      const templateData = {
        Date: formData.date ? `${getDayWithSuffix(formData.date)} ${getMonthYear(formData.date)}` : '_________________',
        FirstPartyCompany: formData.firstPartyCompany || '',
        ClientName: formData.clientName || '',
        Address: formData.address || '',
        Pincode: formData.pincode || '',
        Amount: formData.settlementAmount ? Number(formData.settlementAmount).toLocaleString('en-IN') : '',
        AmountInWords: formData.amountInWords || '',
        
        // Dynamic Installment Info
        InstallmentCountWords: numberToWords(installmentCount),
        InstallmentCountNumber: installmentCount,
        InstallmentPlural: installmentCount > 1 ? 'installments' : 'installment',
        InstallmentDetails: installmentDetails,
        
        // Backward compatibility
        InstallmentAmount: formattedInstallments[0].amount,
        InstallmentDate: formattedInstallments[0].date,
        
        Installments: formattedInstallments,
        FirstPartyName: formData.firstPartySignatory || '',
        SecondCompany: formData.secondCompany || '',
        SecondPartyName: formData.secondPartySignatory || ''
      };

      const response = await api.post('/agreements/generate', templateData, {
        responseType: 'blob' 
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      setGeneratedPdfBlob(blob);
      
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      toast.success('PDF Generated Successfully!', { id: loadingToast });
      
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 500);

    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF. Is MS Word installed on the server?', { id: loadingToast });
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedPdfBlob) return;
    const url = window.URL.createObjectURL(generatedPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${formData.clientName ? formData.clientName.replace(/\s+/g, '_') : 'Settlement'}_Agreement.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const inputClass = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm transition-all bg-white";
  const labelClass = "block text-[11px] font-bold text-gray-600 mb-1 tracking-wide uppercase";

  return (
    <div className="section active w-full h-full flex flex-col bg-gray-50 pb-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Agreement Generation (Native PDF)</h2>
          <p className="text-sm text-gray-500">Fill details to generate a flawless PDF using native MS Word Engine</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden p-6 mb-8">
        <form onSubmit={handlePreview}>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-100">
              <FileText className="text-blue-500" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Agreement Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>First Party Company <span className="text-red-500">*</span></label>
                <input type="text" name="firstPartyCompany" placeholder="e.g. Startupflora" value={formData.firstPartyCompany} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Client Name (Mr/Mrs) <span className="text-red-500">*</span></label>
                <input type="text" name="clientName" placeholder="Full name of client" value={formData.clientName} onChange={handleChange} className={inputClass} required />
              </div>
              <div className="md:row-span-2">
                <label className={labelClass}>Address</label>
                <textarea name="address" placeholder="Client Address" value={formData.address} onChange={handleChange} className={`${inputClass} h-[108px] resize-none`} />
              </div>

              <div>
                <label className={labelClass}>Pincode</label>
                <input type="text" name="pincode" placeholder="e.g. 110001" value={formData.pincode} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Settlement Amount (₹) <span className="text-red-500">*</span></label>
                <input type="number" name="settlementAmount" placeholder="0" value={formData.settlementAmount} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Amount in Words <span className="text-red-500">*</span></label>
                <input type="text" name="amountInWords" placeholder="e.g. Ten Thousand Only" value={formData.amountInWords} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>First Party Signatory <span className="text-red-500">*</span></label>
                <input type="text" name="firstPartySignatory" placeholder="First Party Name" value={formData.firstPartySignatory} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Second Company <span className="text-red-500">*</span></label>
                <input type="text" name="secondCompany" placeholder="Second Company Name" value={formData.secondCompany} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Second Party Signatory <span className="text-red-500">*</span></label>
                <input type="text" name="secondPartySignatory" placeholder="Second Party Name" value={formData.secondPartySignatory} onChange={handleChange} className={inputClass} required />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-yellow-100 p-1 rounded">
                <List className="text-yellow-600" size={16} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Installments</h3>
            </div>

            <div className="space-y-3 mb-4">
              {installments.map((inst, index) => (
                <div key={inst.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-gray-50 p-3 rounded-md border border-gray-100">
                  <div className="w-8 text-center font-bold text-gray-400">#{index + 1}</div>
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Amount (₹)</label>
                    <input type="number" placeholder="Installment Amount" value={inst.amount} onChange={(e) => handleInstallmentChange(inst.id, 'amount', e.target.value)} className={inputClass} required />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Due Date</label>
                    <input type="date" value={inst.date} onChange={(e) => handleInstallmentChange(inst.id, 'date', e.target.value)} className={inputClass} required />
                  </div>
                  <div className="sm:mt-5">
                    <button type="button" onClick={() => handleRemoveInstallment(inst.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200" title="Remove Installment">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={handleAddInstallment} className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md shadow-sm transition-colors">
              <Plus size={16} /> Add Installment
            </button>
          </div>

          <div className="flex items-center gap-3 pt-6 border-t border-gray-100 mt-6">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-md shadow-sm transition-colors flex items-center gap-2">
              <Eye size={18} /> Generate Native PDF
            </button>
            <button type="button" onClick={handleClear} className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-6 border border-gray-300 rounded-md shadow-sm transition-colors flex items-center gap-2">
              <RefreshCw size={18} /> Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* --- LIVE PDF NATIVE VIEWER SECTION --- */}
      {pdfUrl && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col mt-8">
          <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Eye className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Native PDF Preview</h3>
            </div>
            <button 
              onClick={handleDownloadPDF}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-md shadow-md transition-all flex items-center gap-2"
            >
              <Download size={18} /> Download PDF
            </button>
          </div>
          
          <div className="bg-gray-300 w-full h-[800px]">
            {/* The PDF is rendered directly using Chrome's native PDF engine! Flawless MS Word reproduction. */}
            <iframe src={pdfUrl} className="w-full h-full border-0" title="Agreement PDF Preview" />
          </div>
        </div>
      )}

    </div>
  );
};

export default AgreementGenerationTab;
