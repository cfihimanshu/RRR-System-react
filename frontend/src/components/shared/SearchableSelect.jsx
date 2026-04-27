import React, { useState, useEffect, useRef } from 'react';

const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", required = false, name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt) => {
    setSearchTerm(opt);
    onChange({ target: { name, value: opt } });
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange({ target: { name, value: val } });
    setIsOpen(true);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          name={name}
          className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          required={required}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
           </svg>
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded shadow-xl max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <div
                key={idx}
                className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0 font-medium text-gray-700"
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400 italic">No matches</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
