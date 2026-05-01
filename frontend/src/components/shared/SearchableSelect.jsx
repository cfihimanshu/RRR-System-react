import React, { useState, useEffect, useRef } from 'react';

const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", required = false, name, className = "", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setSearchTerm(value || '');
    setIsTyping(false);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = isTyping
    ? options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const handleSelect = (opt) => {
    if (disabled) return;
    setSearchTerm(opt);
    setIsTyping(false);
    onChange({ target: { name, value: opt } });
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    if (disabled) return;
    const val = e.target.value;
    setSearchTerm(val);
    setIsTyping(true);
    onChange({ target: { name, value: val } });
    setIsOpen(true);
  };

  return (
    <div className={`relative w-full ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`} ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          name={name}
          className={`w-full border-2 border-border rounded-xl px-5 py-4 text-xs font-black outline-none transition-all focus:border-accent ${disabled ? 'bg-bg-secondary cursor-not-allowed' : ''} ${className}`}
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          required={required}
          autoComplete="off"
          disabled={disabled}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
           </svg>
        </div>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-[100] w-full mt-2 bg-bg-card border-2 border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto scrollbar-thin">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <div
                key={idx}
                className="px-5 py-3.5 hover:bg-bg-input cursor-pointer text-xs border-b border-border last:border-0 font-black text-text-primary uppercase tracking-widest transition-colors"
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </div>
            ))
          ) : (
            <div className="px-5 py-4 text-[10px] text-text-muted italic font-black uppercase tracking-widest">No matches</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
