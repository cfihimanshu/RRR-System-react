import React from 'react';

const Modal = ({ isOpen, onClose, title, children, size = '', titleActions = null }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 bg-bg-primary/80 backdrop-blur-xl" 
        onClick={onClose} 
      />
      <div className={`relative bg-bg-card border-2 border-border rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.6)] flex flex-col w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 ${size === 'lg' ? 'max-w-6xl' : size === 'fullscreen' ? 'max-w-none h-full' : 'max-w-2xl'}`}>
        <div className="px-8 py-6 border-b-2 border-border flex justify-between items-center bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-accent rounded-full shadow-[0_0_15px_rgba(255,102,0,0.4)]" />
            <h3 className="text-xl font-black text-text-primary tracking-tight uppercase leading-none">{title}</h3>
          </div>
          <div className="flex items-center gap-6">
            {titleActions}
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-bg-input hover:bg-red hover:text-white text-text-muted transition-all duration-300 group" 
              onClick={onClose}
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-accent-soft p-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
