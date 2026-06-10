import React, { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

import { UploadCloud, File, X, CheckCircle } from 'lucide-react';

const FileUpload = ({ onUploadSuccess, label = "Drag & drop or click to upload file", icon: Icon = UploadCloud, accentColor = "accent", disabled = false, compact = false }) => {
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File exceeds 100MB limit');
      return;
    }

    setFileName(file.name);
    setUploading(true);

    try {
      // Upload directly to Milesweb cPanel PHP script
      const formData = new FormData();
      formData.append('file', file);
      
      const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || 'https://serenity.herosite.pro/~fmojnedg/uploads/upload.php';

      const uploadRes = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status: ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();
      
      if (!uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || 'Server returned invalid response');
      }

      const fileUrl = uploadData.url;

      setFileUrl(fileUrl);
      onUploadSuccess(fileUrl);
      toast.success('File uploaded to server successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFileUrl('');
    setFileName('');
    onUploadSuccess('');
  };

  const accentClasses = {
    accent: 'border-accent',
    blue: 'border-blue',
    'text-muted': 'border-text-muted'
  };

  const currentAccentClass = accentClasses[accentColor] || accentClasses.accent;

  return (
    <div className={`relative group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className={`
        relative border-2 border-dashed rounded-2xl transition-all duration-300
        ${compact ? 'p-3' : 'p-6'}
        ${fileUrl ? 'border-green bg-green-soft/5' : `${currentAccentClass} bg-bg-input/30`}
        ${uploading ? 'animate-pulse' : ''}
      `}>
        <input 
          type="file" 
          onChange={handleFileChange} 
          onClick={(e) => (e.target.value = null)}
          disabled={uploading || disabled} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'space-y-2' : 'space-y-3'}`}>
          <div className={`
            ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl flex items-center justify-center transition-all duration-300
            ${fileUrl ? 'bg-green text-white' : `bg-bg-secondary text-accent group-hover:scale-110`}
          `}>
            {fileUrl ? <CheckCircle size={20} /> : (uploading ? <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Icon size={20} />)}
          </div>
          
          <div className="space-y-0.5">
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-black text-accent uppercase tracking-widest transition-colors`}>
              {uploading ? 'Uploading...' : (fileUrl ? 'Success' : label)}
            </p>
            {fileName && (
              <p className={`${compact ? 'text-[8px]' : 'text-[9px]'} font-bold text-accent truncate max-w-[180px]`}>
                {fileName}
              </p>
            )}
          </div>
        </div>

        {fileUrl && (
          <button 
            onClick={clearFile}
            className="absolute top-4 right-4 p-2 bg-red-soft text-red rounded-lg hover:bg-red hover:text-white transition-all z-20"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
