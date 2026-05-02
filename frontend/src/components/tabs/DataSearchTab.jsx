import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Search, Loader2, Database, ExternalLink, FileText, ArrowLeft } from 'lucide-react';

const DataSearchTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [view, setView] = useState('menu'); // 'menu' | 'data-search'
  const { user } = useContext(AuthContext);

  // Search logic with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchResults(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchResults = async (query) => {
    setLoading(true);
    try {
      const res = await api.get(`/sampleData?search=${encodeURIComponent(query)}`);
      setResults(res.data);
      // We'll use the results length as a proxy for now, 
      // or we could update the backend to return a count.
      setTotalCount(res.data.length);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const res = await api.post('/sampleData/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Import successful');
      fetchResults(searchTerm); // Refresh results immediately
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = null;
    }
  };

  const inputClass = "w-full bg-bg-card border-2 border-border rounded-2xl pl-12 pr-4 py-4 text-sm text-text-primary focus:border-accent focus:ring-4 focus:ring-accent-soft outline-none shadow-sm transition-all font-medium";

  return (
    <div className="h-full bg-bg-primary p-4 md:p-8 flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 flex-shrink-0 gap-6 bg-bg-card p-10 rounded-2xl border-2 border-border shadow-sm">
        <div>
          <div className="flex items-center gap-4 mb-4">
            {view === 'data-search' && (
              <button
                onClick={() => setView('menu')}
                className="p-2.5 bg-bg-input rounded-xl hover:bg-accent-soft text-text-muted hover:text-accent transition-all active:scale-90"
                title="Back to Records"
              >
                <ArrowLeft size={20} strokeWidth={3} />
              </button>
            )}
            <h1 className="text-3xl font-black text-accent tracking-tight uppercase leading-none">
              {view === 'menu' ? 'Records' : 'Data Search'}
            </h1>
          </div>

          {view === 'menu' && (
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <button
                onClick={() => setView('data-search')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-input hover:bg-accent-soft hover:text-accent border border-border hover:border-accent-soft text-text-primary transition-all group font-black text-xs uppercase tracking-widest shadow-sm"
              >
                <Database size={16} className="text-text-muted group-hover:text-accent" />
                Data Search
              </button>

              <button
                onClick={() => window.open('https://crm.startupflora.com/web/login', '_blank')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-input hover:bg-purple-900/20 hover:text-purple-400 border border-border hover:border-purple-500/30 text-text-primary transition-all group font-black text-xs uppercase tracking-widest shadow-sm"
              >
                <ExternalLink size={16} className="text-text-muted group-hover:text-purple-400" />
                Odoo
              </button>

              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-input/50 border border-border/50 text-text-muted cursor-not-allowed font-black text-xs uppercase tracking-widest"
                title="Coming Soon"
              >
                <FileText size={16} className="opacity-50" />
                MOU
              </button>
            </div>
          )}
        </div>

        {view === 'data-search' && user?.role === 'Admin' && (
          <div className="relative w-full md:w-auto">
            <input
              type="file"
              id="sample-excel-upload"
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="sample-excel-upload"
              className={`cursor-pointer bg-green text-white font-black py-3 px-5 rounded-2xl shadow-sm flex items-center justify-center gap-3 transition-all text-xs uppercase tracking-[0.2em] active:scale-95 ${importing ? 'opacity-50 cursor-wait' : 'hover:bg-green-600 hover:-translate-y-1'}`}
            >
              <FileSpreadsheet size={20} />
              {importing ? 'Initializing Upload...' : 'Upload Sample Data'}
            </label>
          </div>
        )}
      </div>

      {/* Content Section (Only visible in data-search view) */}
      {view === 'data-search' && (
        <>
          {/* Search Bar */}
          <div className="mb-10 max-w-6xl mx-auto w-full flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                <Search size={22} strokeWidth={3} />
              </div>
              <input
                type="text"
                className="w-full bg-bg-card border-2 border-border rounded-2xl pl-16 pr-6 py-5 text-sm font-black text-text-primary focus:border-accent focus:ring-8 focus:ring-accent-soft outline-none shadow-sm transition-all tracking-tight placeholder:text-text-muted/40 uppercase"
                placeholder="Search: Company, Contact, BDE or Email ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {loading && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-bg-card p-2 rounded-xl">
                  <Loader2 className="w-6 h-6 text-accent animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Results Table - Scrollable Container */}
          <div className="bg-bg-card rounded-2xl shadow-sm border-2 border-border overflow-hidden flex-1 flex flex-col mb-4">
            <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-accent-soft">
              <table className="w-full text-left border-collapse table-auto min-w-[1800px]">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-bg-secondary text-text-muted text-[10px] font-black tracking-[0.25em] uppercase border-b-2 border-border">
                    <th className="px-6 py-6 whitespace-nowrap w-[120px]">TIME</th>
                    <th className="px-6 py-6">Company Name</th>
                    <th className="px-6 py-6">Contact Person</th>
                    <th className="px-6 py-6 whitespace-nowrap w-[150px]">Contact</th>
                    <th className="px-6 py-6 min-w-[300px]">Email</th>
                    <th className="px-6 py-6">Service </th>
                    <th className="px-6 py-6 w-[140px]">BDE</th>
                    <th className="px-6 py-6 text-center">Total (With GST)</th>
                    <th className="px-6 py-6 text-center">Amt (No GST)</th>
                    <th className="px-6 py-6 w-[150px]">Work Status</th>
                    <th className="px-6 py-6 w-[150px]">Dept </th>
                    <th className="px-6 py-6 w-[120px]">MOU Status</th>
                    <th className="px-6 py-6"> Remarks</th>
                    <th className="px-6 py-6 text-center">MOU Amt</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-text-secondary divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan="14" className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-4 bg-bg-input rounded-full">
                            <Loader2 className="w-10 h-10 text-accent animate-spin" />
                          </div>
                          <span className="font-black text-text-muted text-xs uppercase tracking-widest">Compiling Database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan="14" className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-6 bg-bg-input rounded-full opacity-20">
                            <Search size={48} className="text-text-muted" />
                          </div>
                          <span className="text-text-muted font-black uppercase tracking-widest text-xs">
                            {searchTerm ? "No matching data found in archives." : "Database empty. Upload Excel to begin indexing."}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    results.map(r => (
                      <tr key={r._id} className="hover:bg-bg-input/70 transition-all group border-b border-border/50 last:border-0">
                        <td className="px-6 py-6 text-text-muted whitespace-nowrap font-black uppercase tracking-tighter opacity-60">{r.date || '—'}</td>
                        <td className="px-6 py-6">
                          <div className="font-black text-text-primary leading-tight text-sm tracking-tight group-hover:text-accent transition-all capitalize">{r.companyName || '—'}</div>
                        </td>
                        <td className="px-6 py-6 text-text-secondary leading-tight font-black uppercase text-[10px] tracking-wide">{r.contactPerson || '—'}</td>
                        <td className="px-6 py-6">
                          <span className="font-mono text-text-primary font-black whitespace-nowrap bg-bg-input px-3 py-1.5 rounded-lg border border-border shadow-inner text-[10px]">{r.contact || '—'}</span>
                        </td>
                        <td className="px-6 py-6 text-accent font-black break-all group-hover:underline cursor-pointer tracking-tight text-[10px] uppercase opacity-80">{r.emailId || '—'}</td>
                        <td className="px-6 py-6 leading-tight italic text-text-muted font-medium text-[10px] uppercase">"{r.service || '—'}"</td>
                        <td className="px-6 py-6">
                          <span className="font-black text-text-primary leading-tight uppercase text-[10px] tracking-widest bg-bg-input px-3 py-1 rounded-lg border border-border">{r.bde || '—'}</span>
                        </td>
                        <td className="px-6 py-6 text-center font-black text-text-primary text-[10px]">₹{r.totalAmountWithGst || '0'}</td>
                        <td className="px-6 py-6 text-center text-green font-black text-[10px]">₹{r.amtWithoutGst || '0'}</td>
                        <td className="px-6 py-6">
                          <span className="bg-bg-secondary text-text-muted px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 border-border shadow-sm">
                            {r.workStatus || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-6 font-black text-purple leading-tight uppercase text-[10px] tracking-[0.2em]">{r.department || '—'}</td>
                        <td className="px-6 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border-2 shadow-sm transition-all ${r.mouStatus === 'Signed' ? 'bg-green-soft text-green border-green-soft' : 'bg-bg-input text-text-muted border-border'}`}>
                            {r.mouStatus || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-text-muted text-[9px] font-medium leading-relaxed italic max-w-[250px] truncate opacity-70" title={r.remarks}>"{r.remarks || '—'}"</td>
                        <td className="px-6 py-6 text-center font-black text-accent text-sm tracking-tight bg-accent-soft/10">₹{r.mouSignedAmount || '0'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DataSearchTab;
