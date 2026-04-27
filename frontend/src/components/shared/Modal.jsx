import React from 'react';

const Modal = ({ isOpen, onClose, title, children, size = '', titleActions = null }) => {
  if (!isOpen) return null;

  return (
    <div className={`modal-bg open`} onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : size === 'fullscreen' ? 'modal-fullscreen' : ''}`}>
        <div className="modal-title flex justify-between items-center w-full">
          <span>{title}</span>
          <div className="flex items-center gap-3">
            {titleActions}
            <button className="close-btn flex items-center justify-center text-xl pb-1" onClick={onClose}>×</button>
          </div>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
