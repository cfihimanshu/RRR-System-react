import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

const FilePreviewModal = ({ isOpen, onClose, fileUrl, fileName }) => {
  if (!isOpen || !fileUrl) return null;

  const ext = (fileUrl.split('?')[0].split('.').pop() || '').toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  const isPdf = ext === 'pdf';
  const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);

  const getPreviewUrl = () => {
    if (isImage || isPdf) return fileUrl;
    if (isOffice) return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-secondary/50 shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Preview</span>
            <span className="text-sm font-black text-text-primary truncate max-w-[500px]" title={fileName}>
              {fileName || 'Document'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-soft text-accent hover:bg-accent hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg border border-accent-soft transition-all"
            >
              <ExternalLink size={11} /> Open
            </a>
            <a
              href={fileUrl}
              download={fileName}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-input border border-border text-text-secondary hover:bg-bg-input/60 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
            >
              <Download size={11} /> Download
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-bg-input hover:bg-red-soft text-text-muted hover:text-red border border-border transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-bg-secondary/30 min-h-0">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg"
              />
            </div>
          ) : (
            <iframe
              src={getPreviewUrl()}
              title={fileName}
              className="w-full h-[70vh] border-0"
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
