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
      case 1: return day + "st";
      case 2: return day + "nd";
      case 3: return day + "rd";
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

  const inputClass = "w-full bg-bg-input border-2 border-border rounded-xl px-5 py-4 text-xs text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none transition-all font-black placeholder:text-text-muted/40 shadow-sm";
  const labelClass = "block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1";

  return (
    <div className="section active w-full min-h-full bg-bg-primary pb-32 px-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pt-6">
        <div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">Agreement Generation</h2>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border overflow-hidden p-4 sm:p-8 mb-10">
        <form onSubmit={handlePreview}>
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-blue-soft rounded-2xl flex items-center justify-center text-blue">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">Agreement Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className={labelClass}>DATE <span className="text-red">*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>FIRST PARTY COMPANY <span className="text-red">*</span></label>
                <input type="text" name="firstPartyCompany" placeholder="e.g. Startupflora" value={formData.firstPartyCompany} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>CLIENT NAME (MR/MRS) <span className="text-red">*</span></label>
                <input type="text" name="clientName" placeholder="Full name of client" value={formData.clientName} onChange={handleChange} className={inputClass} required />
              </div>
              <div className="row-span-2">
                <label className={labelClass}>ADDRESS</label>
                <textarea
                  name="address"
                  placeholder="Client Address"
                  value={formData.address}
                  onChange={handleChange}
                  className={`${inputClass} h-[120px] resize-none py-4`}
                />
              </div>

              <div>
                <label className={labelClass}>PINCODE</label>
                <input type="text" name="pincode" placeholder="e.g. 110001" value={formData.pincode} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>SETTLEMENT AMOUNT (₹) <span className="text-red">*</span></label>
                <input type="number" name="settlementAmount" placeholder="0" value={formData.settlementAmount} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>AMOUNT IN WORDS <span className="text-red">*</span></label>
                <input type="text" name="amountInWords" placeholder="e.g. Ten Thousand Only" value={formData.amountInWords} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>FIRST PARTY SIGNATORY <span className="text-red">*</span></label>
                <input type="text" name="firstPartySignatory" placeholder="First Party Name" value={formData.firstPartySignatory} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>SECOND COMPANY <span className="text-red">*</span></label>
                <input type="text" name="secondCompany" placeholder="Second Company Name" value={formData.secondCompany} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>SECOND PARTY SIGNATORY <span className="text-red">*</span></label>
                <input type="text" name="secondPartySignatory" placeholder="Second Party Name" value={formData.secondPartySignatory} onChange={handleChange} className={inputClass} required />
              </div>
            </div>
          </div>

          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-yellow-soft rounded-xl flex items-center justify-center text-yellow">
                <List size={16} />
              </div>
              <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">Installments</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {installments.map((inst, index) => (
                <div key={inst.id} className="relative flex flex-col gap-5 bg-bg-input p-6 rounded-[2rem] border-2 border-border group transition-all hover:border-accent-soft">
                  <div className="absolute top-4 right-4">
                    <button type="button" onClick={() => handleRemoveInstallment(inst.id)} className="p-2 text-text-muted hover:text-red hover:bg-red-soft rounded-xl transition-all border border-transparent hover:border-red-soft" title="Remove Installment">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-bg-secondary rounded-full flex items-center justify-center text-[10px] font-black text-text-muted border border-border">
                      #{index + 1}
                    </div>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Installment</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black text-text-muted mb-2 uppercase ml-1">Amount (₹)</label>
                      <input type="number" placeholder="0.00" value={inst.amount} onChange={(e) => handleInstallmentChange(inst.id, 'amount', e.target.value)} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-text-muted mb-2 uppercase ml-1">Due Date</label>
                      <input type="date" value={inst.date} onChange={(e) => handleInstallmentChange(inst.id, 'date', e.target.value)} className={inputClass} required />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={handleAddInstallment} className="flex items-center gap-3 text-[10px] font-black text-text-primary bg-bg-card border-2 border-border hover:border-accent hover:bg-bg-card-hover px-6 py-3 rounded-xl shadow-sm transition-all uppercase tracking-widest active:scale-95">
              <Plus size={16} className="text-accent" /> Add Installment
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-10 border-t border-border mt-10">
            <button type="submit" className="bg-blue hover:bg-blue-600 text-white font-black py-4 px-10 rounded-xl shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] active:scale-95">
              <Eye size={18} /> Generate
            </button>
            <button type="button" onClick={handleClear} className="bg-bg-card hover:bg-bg-card-hover text-text-secondary font-black py-4 px-10 border-2 border-border rounded-xl transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] active:scale-95">
              <RefreshCw size={18} /> Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* --- LIVE PDF NATIVE VIEWER SECTION --- */}
      {pdfUrl && (
        <div className="bg-bg-secondary rounded-[2.5rem] shadow-sm border-2 border-border overflow-hidden flex flex-col mt-10 mb-20">
          <div className="bg-bg-card border-b border-border p-6 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-10 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-accent rounded-full" />
              <h3 className="text-lg font-black text-text-primary tracking-tight uppercase">High-Fidelity PDF Preview</h3>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="w-full md:w-auto bg-red hover:bg-red-600 text-white font-black py-3.5 px-10 rounded-2xl shadow-xl shadow-red-900/20 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest active:scale-95"
            >
              <Download size={18} /> EXECUTE & DOWNLOAD
            </button>
          </div>

          <div className="bg-bg-input w-full h-[1000px] p-6 lg:p-12">
            {/* The PDF is rendered directly using Chrome's native PDF engine! Flawless MS Word reproduction. */}
            <div className="w-full h-full rounded-[2rem] overflow-hidden border-8 border-border shadow-2xl bg-white">
              <iframe src={pdfUrl} className="w-full h-full border-0" title="Agreement PDF Preview" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgreementGenerationTab;
