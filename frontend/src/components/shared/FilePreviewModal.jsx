import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

const FilePreviewModal = ({ isOpen, onClose, fileUrl, fileName }) => {
  if (!isOpen || !fileUrl) return null;

  // Smart extension detection from both URL and fileName
  const getExtension = () => {
    const urlParts = fileUrl.split('?')[0].split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const urlExt = (lastPart.split('.').pop() || '').toLowerCase();
    
    const knownExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    if (knownExtensions.includes(urlExt)) {
      return urlExt;
    }
    
    // Fallback to fileName extension if URL doesn't have a standard extension (e.g. ImageKit uploads)
    if (fileName) {
      const nameExt = (fileName.split('.').pop() || '').toLowerCase();
      if (knownExtensions.includes(nameExt)) {
        return nameExt;
      }
    }
    return '';
  };

  const ext = getExtension();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  const isPdf = ext === 'pdf';
  const isLocalUrl = fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1') || fileUrl.startsWith('/');
  const needsGoogleDocs = !isImage && !isPdf;

  const getPreviewUrl = () => {
    if (isImage || isPdf) return fileUrl;
    // Always use Google Docs Viewer for Office Documents
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border-2 border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-secondary/50 shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Document Preview</span>
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
              <ExternalLink size={11} /> Open Original
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
        <div className="flex-1 overflow-hidden bg-bg-secondary/30 min-h-0 relative">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
              />
            </div>
          ) : isLocalUrl && needsGoogleDocs ? (
            <div className="w-full h-full flex items-center justify-center p-8 text-center bg-bg-card">
              <div className="max-w-md p-8 bg-bg-secondary/40 border border-border rounded-3xl shadow-xl flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl mb-2">
                  📂
                </div>
                <h3 className="text-base font-black text-text-primary uppercase tracking-wider">Localhost Preview Restriction</h3>
                <p className="text-xs text-text-secondary leading-relaxed font-medium">
                  Google Docs Viewer requires a public URL to download and render Word/Excel documents.
                  This preview will work automatically on the live production server.
                </p>
                <div className="flex items-center gap-3 w-full mt-4">
                  <a
                    href={fileUrl}
                    download={fileName}
                    className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 text-center"
                  >
                    Download File
                  </a>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-3 bg-bg-input hover:bg-bg-input/60 border border-border text-text-secondary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 text-center"
                  >
                    Open in Tab
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <iframe
              src={getPreviewUrl()}
              title={fileName}
              className="w-full h-full border-0 bg-white"
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
