import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

const MultiSearchableSelect = ({ options, selectedValues, onChange, placeholder = "Select options..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

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
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    opt.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (val) => {
    const newValues = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    onChange(newValues);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className="w-full border-2 border-gray-300 rounded-xl p-2.5 bg-white flex flex-wrap gap-2 cursor-pointer min-h-[44px] transition-all hover:border-blue-400 shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedValues.length === 0 ? (
          <span className="text-gray-400 text-sm font-medium">{placeholder}</span>
        ) : (
          selectedValues.map(val => (
            <span key={val} className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 uppercase tracking-wider">
              {val}
              <X size={10} className="hover:text-red-300 transition-colors" onClick={(e) => { e.stopPropagation(); toggleOption(val); }} />
            </span>
          ))
        )}
        <ChevronDown size={16} className={`ml-auto text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white border-2 border-gray-200 rounded-[1.5rem] shadow-2xl max-h-[350px] overflow-hidden flex flex-col animate-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-100 relative">
            <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto hide-scrollbar max-h-[250px]">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                  onClick={(e) => { e.stopPropagation(); toggleOption(opt.value); }}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedValues.includes(opt.value) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                    {selectedValues.includes(opt.value) && <Check size={10} className="text-white" strokeWidth={4} />}
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-800">{opt.value}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{opt.label}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-xs text-gray-400 font-bold uppercase tracking-widest italic">No matching results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSearchableSelect;
