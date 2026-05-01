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
      <div className="relative group">
        <input
          type="text"
          name={name}
          className="w-full bg-bg-input border-2 border-border rounded-[1.5rem] px-6 py-4 text-sm font-black text-text-primary outline-none focus:border-accent transition-all pr-12 shadow-inner placeholder:text-text-muted/50"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          required={required}
          autoComplete="off"
        />
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-text-muted group-focus-within:text-accent transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-3 bg-bg-card border-2 border-border rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-[350px] overflow-y-auto hide-scrollbar animate-in slide-in-from-top-4 fade-in duration-300 backdrop-blur-xl">
          {filteredCases.length > 0 ? (
            filteredCases.map((c) => (
              <div
                key={c.caseId}
                className="px-6 py-4 hover:bg-bg-input cursor-pointer transition-all border-b border-border/50 last:border-0 flex flex-col gap-1"
                onClick={() => handleSelect(c.caseId)}
              >
                <div className="font-black text-accent uppercase tracking-tighter text-xs">{c.caseId}</div>
                <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide truncate">{c.companyName || c.clientName}</div>
              </div>
            ))
          ) : (
            <div className="px-6 py-6 text-xs text-text-muted font-black uppercase tracking-widest text-center opacity-50 italic">No matching records</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableCaseSelect;
