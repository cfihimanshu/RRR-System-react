import React, { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

import { UploadCloud, File, X, CheckCircle } from 'lucide-react';

const FileUpload = ({ onUploadSuccess, label = "Drag & drop or click to upload file", icon: Icon = UploadCloud, accentColor = "accent", disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File exceeds 20MB limit');
      return;
    }

    setFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFileUrl(res.data.url);
      onUploadSuccess(res.data.url);
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.error('File upload failed');
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
    accent: 'hover:border-accent group-hover:border-accent',
    blue: 'hover:border-blue group-hover:border-blue',
    'text-muted': 'hover:border-text-muted group-hover:border-text-muted'
  };

  const currentAccentClass = accentClasses[accentColor] || accentClasses.accent;

  return (
    <div className={`relative group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className={`
        relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300
        ${fileUrl ? 'border-green bg-green-soft/5' : `border-border bg-bg-input/30 ${currentAccentClass}`}
        ${uploading ? 'animate-pulse' : ''}
      `}>
        <input 
          type="file" 
          onChange={handleFileChange} 
          disabled={uploading || disabled} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
            ${fileUrl ? 'bg-green text-white' : `bg-bg-secondary text-text-muted group-hover:text-accent group-hover:scale-110`}
          `}>
            {fileUrl ? <CheckCircle size={20} /> : (uploading ? <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Icon size={20} />)}
          </div>
          
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-text-primary uppercase tracking-widest group-hover:text-accent transition-colors">
              {uploading ? 'Uploading...' : (fileUrl ? 'Success' : label)}
            </p>
            {fileName && (
              <p className="text-[9px] font-bold text-accent truncate max-w-[180px]">
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
