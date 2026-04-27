import React, { useState, useEffect, useRef } from 'react';

const SearchableCaseSelect = ({ cases, value, onChange, placeholder = "Type or select Case ID", required = false, name = "caseId" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Sync internal search term with external value (for initial load)
  useEffect(() => {
    if (value) {
      setSearchTerm(value);
    }
  }, [value]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredCases = cases.filter(c => 
    c.caseId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.clientName && c.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (caseId) => {
    setSearchTerm(caseId);
    onChange(caseId);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    setIsOpen(true);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          name={name}
          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all pr-10"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          required={required}
          autoComplete="off"
        />
        <div 
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-[350px] overflow-y-auto hide-scrollbar animate-in slide-in-from-top-2 duration-200">
          {filteredCases.length > 0 ? (
            filteredCases.map((c) => (
              <div
                key={c.caseId}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                onClick={() => handleSelect(c.caseId)}
              >
                <div className="font-bold text-blue-700">{c.caseId}</div>
                <div className="text-[11px] text-gray-500 truncate">{c.companyName || c.clientName}</div>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400 italic">No matching cases</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableCaseSelect;
