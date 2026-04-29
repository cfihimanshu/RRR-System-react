import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Search, Loader2 } from 'lucide-react';

const DataSearchTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
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

  const inputClass = "w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm transition-all bg-white";

  return (
    <div className="h-full bg-gray-50 p-4 md:p-6 flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 flex-shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800"> Data Search</h1>
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-tight">
            {totalCount} {totalCount === 1000 ? ' (Limit reached)' : 'Records found'}
          </div>
        </div>

        {user?.role === 'Admin' && (
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
              className={`cursor-pointer bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all text-[10px] uppercase tracking-wider ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FileSpreadsheet size={16} />
              {importing ? 'Uploading...' : 'Upload Sample Excel'}
            </label>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6 max-w-4xl mx-auto w-full flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            className={inputClass}
            placeholder="Type Company Name, Contact, BDE or Email to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Results Table - Scrollable Container */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse table-auto min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-blue-800 text-white text-[10px] font-bold tracking-wider uppercase">
                <th className="px-2 py-3 whitespace-nowrap w-[80px]">Date</th>
                <th className="px-2 py-3">Company Name</th>
                <th className="px-2 py-3">Contact Person</th>
                <th className="px-2 py-3 whitespace-nowrap w-[100px]">Contact</th>
                <th className="px-2 py-3 min-w-[200px]">Email ID</th>
                <th className="px-2 py-3">Service</th>
                <th className="px-2 py-3 w-[80px]">BDE</th>
                <th className="px-2 py-3 text-center">Total (With GST)</th>
                <th className="px-2 py-3 text-center">Amt (No GST)</th>
                <th className="px-2 py-3 w-[80px]">Work Status</th>
                <th className="px-2 py-3 w-[80px]">Dept</th>
                <th className="px-2 py-3 w-[50px]">MOU Status</th>
                <th className="px-2 py-3">Remarks</th>
                <th className="px-2 py-3 text-center">MOU Amt</th>
              </tr>
            </thead>
            <tbody className="text-[11px] text-gray-700 divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="14" className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <span className="font-bold text-gray-600 text-sm">Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="14" className="px-6 py-20 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={40} className="text-gray-300 mb-2" />
                      <span>{searchTerm ? "No matching data found." : "No data available in the database. Upload an Excel file to get started."}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                results.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-3 text-gray-500 whitespace-nowrap">{r.date || '-'}</td>
                    <td className="px-2 py-3 font-semibold text-gray-900 leading-tight">{r.companyName || '-'}</td>
                    <td className="px-2 py-3 text-gray-600 leading-tight">{r.contactPerson || '-'}</td>
                    <td className="px-2 py-3 font-mono text-gray-700 whitespace-nowrap">{r.contact || '-'}</td>
                    <td className="px-2 py-3 text-blue-600 break-all">{r.emailId || '-'}</td>
                    <td className="px-2 py-3 leading-tight">{r.service || '-'}</td>
                    <td className="px-2 py-3 font-medium text-gray-800 leading-tight">{r.bde || '-'}</td>
                    <td className="px-2 py-3 text-center font-bold">₹{r.totalAmountWithGst || '0'}</td>
                    <td className="px-2 py-3 text-center text-green-600 font-bold">₹{r.amtWithoutGst || '0'}</td>
                    <td className="px-2 py-3">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border">
                        {r.workStatus || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-3 font-semibold text-purple-600 leading-tight">{r.department || '-'}</td>
                    <td className="px-2 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${r.mouStatus === 'Signed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {r.mouStatus || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-500 text-[10px] leading-tight italic max-w-[150px] truncate" title={r.remarks}>{r.remarks || '-'}</td>
                    <td className="px-2 py-3 text-center font-bold text-indigo-600">₹{r.mouSignedAmount || '0'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataSearchTab;
