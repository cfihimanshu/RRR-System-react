import React, { useState, useEffect, useCallback, memo } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Badge } from '../shared/Badge';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { 
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
  ChevronRight
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const CaseMasterTab = () => {
  const [cases, setCases] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCases, setSelectedCases] = useState([]);
  const [bulkAssignUser, setBulkAssignUser] = useState('');
  const [importing, setImporting] = useState(false);
  const [viewCase, setViewCase] = useState(null);
  const [timelineLogs, setTimelineLogs] = useState([]);
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

  const handleExportCSV = () => {
    if (cases.length === 0) return toast.error('No data to export');

    const headers = ['Case ID', 'Created', 'Client', 'Company', 'Services', 'Amount Paid', 'Priority', 'Status', 'Assigned To'];
    const rows = cases.map(c => {
      const svcs = Array.isArray(c.servicesSold)
        ? c.servicesSold.map(s => s.serviceName).join(' | ')
        : (c.servicesSold || '');

      return [
        c.caseId,
        c.createdDate ? new Date(c.createdDate).toLocaleDateString('en-IN') : '',
        c.clientName,
        c.companyName,
        svcs,
        c.totalAmtPaid || '0',
        c.priority,
        c.status || 'Active',
        c.assignedTo || c.initiatedBy || ''
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(',') + '\n'
      + rows.map(e => e.map(item => `"${(item || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Case_Master_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    setTimelineLogs([]);
    try {
      const res = await api.get(`/timeline?caseId=${c.caseId}`);
      setTimelineLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch timeline for case', err);
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
    <div className="section active w-full h-full flex flex-col bg-gray-50 pb-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Case Master Register</h2>
        </div>
        <div className="flex gap-2 mt-3 md:mt-0">
          {user?.role === 'Admin' && (
            <div className="relative overflow-hidden cursor-pointer">
              <button className={`bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded shadow-sm text-sm transition-colors flex items-center gap-2 ${importing ? 'opacity-70 cursor-wait' : ''}`} disabled={importing}>
                {importing ? '⏳ IMPORTING...' : <><UploadCloud size={16} /> IMPORT CSV (BULK)</>}
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
            <button onClick={handleExportCSV} className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 font-semibold py-2 px-3 rounded shadow-sm text-sm transition-colors flex items-center gap-2">
              <FileDown size={16} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[250px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by Case ID, Client Name, Status..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium transition-all shadow-sm ${
              isFilterOpen || appliedFilters.status !== 'All Status' || appliedFilters.priority !== 'All Priority' || appliedFilters.assignee !== 'All Assignees' || appliedFilters.date
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {(appliedFilters.status !== 'All Status' || appliedFilters.priority !== 'All Priority' || appliedFilters.assignee !== 'All Assignees' || appliedFilters.date) && (
              <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                {[appliedFilters.status !== 'All Status', appliedFilters.priority !== 'All Priority', appliedFilters.assignee !== 'All Assignees', !!appliedFilters.date].filter(Boolean).length}
              </span>
            )}
          </button>

          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setIsFilterOpen(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-[450px] max-w-[90vw] md:max-w-none bg-white rounded-lg shadow-2xl border border-gray-200 z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-1 min-h-[350px]">
                {/* Left Sidebar */}
                <div className="w-1/3 bg-gray-50 border-r border-gray-200 py-2">
                  {['Status', 'Priority', 'Assignees', 'Date'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setActiveFilterType(type)}
                      className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center justify-between transition-colors ${
                        activeFilterType === type 
                        ? 'bg-white text-blue-600 border-l-4 border-blue-600' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {type}
                      <ChevronRight size={14} className={activeFilterType === type ? 'opacity-100' : 'opacity-0'} />
                    </button>
                  ))}
                </div>

                {/* Right Content */}
                <div className="w-2/3 p-4 overflow-y-auto max-h-[400px]">
                  {activeFilterType === 'Status' && (
                    <div className="space-y-2">
                      {['All Status', 'New', 'In-progress', 'Settled', 'Stucked'].map((s) => (
                        <label key={s} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer group">
                          <input 
                            type="radio" 
                            name="status" 
                            checked={tempFilters.status === s}
                            onChange={() => setTempFilters({...tempFilters, status: s})}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className={`text-sm ${tempFilters.status === s ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>{s}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {activeFilterType === 'Priority' && (
                    <div className="space-y-2">
                      {['All Priority', 'High', 'Medium', 'Low'].map((p) => (
                        <label key={p} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer group">
                          <input 
                            type="radio" 
                            name="priority" 
                            checked={tempFilters.priority === p}
                            onChange={() => setTempFilters({...tempFilters, priority: p})}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className={`text-sm ${tempFilters.priority === p ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>{p}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {activeFilterType === 'Assignees' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer group">
                        <input 
                          type="radio" 
                          name="assignee" 
                          checked={tempFilters.assignee === 'All Assignees'}
                          onChange={() => setTempFilters({...tempFilters, assignee: 'All Assignees'})}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className={`text-sm ${tempFilters.assignee === 'All Assignees' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>All Assignees</span>
                      </label>
                      {opsUsers.map((u) => (
                        <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer group">
                          <input 
                            type="radio" 
                            name="assignee" 
                            checked={tempFilters.assignee === u.fullName}
                            onChange={() => setTempFilters({...tempFilters, assignee: u.fullName})}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className={`text-sm ${tempFilters.assignee === u.fullName ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>{u.fullName}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {activeFilterType === 'Date' && (
                    <div className="calendar-container">
                      <Calendar 
                        onChange={(val) => setTempFilters({...tempFilters, date: format(val, 'yyyy-MM-dd')})}
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
                        className="border-none shadow-none text-sm"
                      />
                      {tempFilters.date && (
                        <div className="mt-2 text-center">
                          <button 
                            onClick={() => setTempFilters({...tempFilters, date: null})}
                            className="text-xs text-red-500 hover:underline font-medium"
                          >
                            Clear Date Selection
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <button 
                  onClick={handleResetFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Reset All
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsFilterOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleApplyFilters}
                    className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-md transition-all active:scale-95"
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
          <div className="ml-auto flex items-center gap-2">
            <select
              className={`border rounded-md px-3 py-2 text-sm outline-none shadow-sm min-w-[150px] transition-colors ${bulkAssignUser ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-300 bg-white'}`}
              value={bulkAssignUser}
              onChange={(e) => {
                setBulkAssignUser(e.target.value);
                // Clear selected cases if they cancel bulk assign mode
                if (!e.target.value) {
                  setSelectedCases([]);
                }
              }}
            >
              <option value="">Bulk Assign Mode...</option>
              {opsUsers.map(u => (
                <option key={`bulk-${u._id}`} value={u.fullName}>Assign to: {u.fullName}</option>
              ))}
            </select>
            
            {bulkAssignUser && selectedCases.length > 0 && (
              <button 
                onClick={() => handleBulkAssign(bulkAssignUser)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded shadow-sm text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Check size={16} /> Confirm ({selectedCases.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="table-wrap">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-blue-800 text-white text-[10px] font-bold tracking-wider uppercase">
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
                <th className="px-2 py-3 w-[10%]">Client</th>
                <th className="px-2 py-3 w-[10%]">Company</th>
                <th className="px-2 py-3 w-[10%]">Services</th>
                <th className="px-2 py-3 w-[7%]">Amount Paid</th>
                <th className="px-2 py-3 w-[5%]">Priority</th>
                <th className="px-2 py-3 w-[5%]">Status</th>
                {user?.role === 'Admin' && <th className="px-2 py-3 w-[10%]">Assigned To</th>}
                <th className="px-2 py-3 w-[8%]">Last Update</th>
                <th className="px-2 py-3 w-[15%] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-700 divide-y divide-gray-100">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-16 text-center">
                    <div className="flex justify-center mb-3">
                      <Inbox size={48} className="text-gray-300" />
                    </div>
                    <div className="text-gray-500 font-medium">No cases match your filter.</div>
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

      {/* View Modal */}
      {viewCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                {viewCase.caseId} — {viewCase.clientName}
              </h3>
              <button
                onClick={() => setViewCase(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm mb-6">
                <div><span className="text-gray-500">Company:</span> <strong className="text-gray-800">{viewCase.companyName}</strong></div>
                <div><span className="text-gray-500">Case Title:</span> <span className="text-gray-800">{viewCase.caseTitle || `${viewCase.typeOfComplaint} - ${viewCase.companyName}`}</span></div>
                <div><span className="text-gray-500">Mobile:</span> <span className="text-gray-800">{viewCase.clientMobile}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="text-gray-800">{viewCase.clientEmail || '-'}</span></div>
                <div>
                  <span className="text-gray-500">Priority:</span>
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs font-bold ${viewCase.priority === 'High' ? 'bg-red-100 text-red-700' :
                      viewCase.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                    {viewCase.priority || 'Medium'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-1 bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide">
                    {viewCase.currentStatus || 'New'}
                  </span>
                </div>
                <div><span className="text-gray-500">Amt Paid:</span> <span className="text-gray-800">₹{Number(viewCase.totalAmtPaid || 0).toLocaleString('en-IN')}</span></div>
                <div><span className="text-gray-500">Initiated By:</span> <span className="text-gray-800">{viewCase.initiatedBy || '-'}</span></div>
                <div className="sm:col-span-2"><span className="text-gray-500">Assigned To:</span> <span className="text-gray-800">{viewCase.assignedTo || viewCase.initiatedBy || '-'}</span></div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-800 mb-2">Case Summary</h4>
                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 min-h-[60px] border border-gray-100">
                  {viewCase.caseSummary || "No summary available."}
                </div>
              </div>

              {viewCase.firFileLink && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">Uploaded FIR / Image</h4>
                  <a href={viewCase.firFileLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-semibold text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors inline-flex items-center gap-2">
                    <Eye size={14} /> View FIR Copy <ExternalLink size={12} />
                  </a>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-2">Timeline ({timelineLogs.length} entries)</h4>
                {timelineLogs.length === 0 ? (
                  <div className="text-sm text-gray-500">No timeline entries yet.</div>
                ) : (
                  <div className="relative pl-4 border-l-2 border-blue-200 ml-2 space-y-4">
                    {timelineLogs.map(t => (
                      <div key={t._id} className="relative">
                        <div className="absolute -left-[23px] top-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></div>
                        <div className="text-xs text-gray-500 mb-0.5">{t.eventDate ? new Date(t.eventDate).toLocaleString('en-IN') : '-'}</div>
                        <div className="text-sm text-gray-800"><span className="font-semibold">{t.eventType}:</span> {t.summary}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setViewCase(null)}
                className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-6 border border-gray-300 rounded shadow-sm transition-colors text-sm"
              >
                Close
              </button>
            </div>
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
    ? c.servicesSold.map(s => s.serviceName).join(', ')
    : (c.servicesSold || '-');

  return (
    <tr className={`hover:bg-blue-50/50 transition-colors ${isSelected ? 'bg-blue-50/80' : ''}`}>
      {bulkAssignUser && (
        <td className="px-3 py-3 text-center align-middle">
          <input 
            type="checkbox" 
            className="cursor-pointer"
            checked={isSelected}
            onChange={() => toggleSelectCase(c.caseId)}
          />
        </td>
      )}
      <td className="px-2 py-3 font-semibold text-blue-600 break-words max-w-[80px] leading-tight">
        {c.caseId || c.caseid}
      </td>
      <td className="px-2 py-3 text-gray-600">
        {c.createdDate ? (
          <>
            <div>{new Date(c.createdDate).toLocaleDateString('en-IN')}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{new Date(c.createdDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </>
        ) : '-'}
      </td>
      <td className="px-2 py-3">
        <div className="font-medium text-gray-900 leading-tight break-words">{c.clientName || '-'}</div>
        {c.clientMobile && <div className="text-[10px] text-gray-500 mt-0.5">{c.clientMobile}</div>}
      </td>
      <td className="px-2 py-3 break-words max-w-[120px] leading-tight" title={c.companyName}>{c.companyName || '-'}</td>
      <td className="px-2 py-3 break-words max-w-[120px] leading-tight" title={svcs}>{svcs}</td>
      <td className="px-2 py-3 font-medium whitespace-nowrap">₹{Number(c.totalAmtPaid || 0).toLocaleString('en-IN')}</td>
      <td className="px-2 py-3">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.priority === 'High' ? 'bg-red-100 text-red-700' :
            c.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
              'bg-green-100 text-green-700'
          }`}>
          {c.priority || 'Medium'}
        </span>
      </td>
      <td className="px-2 py-3">
        <span className="bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          {c.currentStatus || 'New'}
        </span>
      </td>
      {user?.role === 'Admin' && <td className="px-2 py-3 break-words max-w-[120px] leading-tight text-gray-600 font-medium">{c.assignedTo || c.initiatedBy || '-'}</td>}
      <td className="px-2 py-3 text-gray-600">
        {c.lastUpdateDate ? (
          <>
            <div className="text-[11px]">{new Date(c.lastUpdateDate).toLocaleDateString('en-IN')}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{new Date(c.lastUpdateDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          </>
        ) : '-'}
      </td>
      <td className="px-1 py-3 text-center align-middle">
        <div className="flex flex-col items-center gap-1 mx-auto max-w-[140px]">
          <div className="flex gap-1 w-full">
            <button
              onClick={() => handleViewCase(c)}
              className="bg-white hover:bg-gray-50 text-gray-700 font-semibold text-[9px] border border-gray-300 py-1 px-1.5 rounded shadow-sm transition-colors flex items-center justify-center flex-1 gap-1"
              title="View Details"
            >
              <Eye size={12} />
            </button>
            <button
              onClick={() => navigate('/new-case', { state: { editCase: c } })}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[9px] py-1 px-1.5 rounded shadow-sm transition-colors flex items-center justify-center flex-1 gap-1"
              title="Edit Case"
            >
              <Edit3 size={12} />
            </button>
            {user?.role === 'Admin' && (
              <button
                onClick={() => handleDeleteCase(c.caseId)}
                className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[9px] border border-red-200 py-1 px-1.5 rounded shadow-sm transition-colors flex items-center justify-center gap-1"
                title="Delete Case"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          {user?.role === 'Admin' && (
          <div className="flex gap-1 w-full mt-0.5">
            <select 
              className="flex-1 border border-gray-300 rounded text-[9px] px-1.5 py-1 outline-none focus:border-blue-500 shadow-sm min-w-0 bg-white"
              value={assignmentInput !== undefined ? assignmentInput : (c.assignedTo || '')}
              onChange={(e) => handleAssignmentInputChange(c.caseId, e.target.value)}
            >
              <option value="">Assign to...</option>
              {opsUsers.map(u => (
                <option key={u._id} value={u.fullName}>{u.fullName}</option>
              ))}
            </select>
            <button 
              onClick={() => handleAssign(c.caseId)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[8px] px-2 py-1 rounded border border-blue-200 transition-colors uppercase flex items-center justify-center"
              title="Confirm Assignment"
            >
              <Check size={12} />
            </button>
          </div>
          )}
        </div>
      </td>
    </tr>
  );
});

export default CaseMasterTab;
