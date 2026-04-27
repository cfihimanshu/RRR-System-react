import React, { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const FileUpload = ({ onUploadSuccess, label = "Drag & drop or click to upload file" }) => {
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit');
      return;
    }

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

  return (
    <div className="field">
      <label>Attachment</label>
      <div className="upload-zone">
        <input type="file" onChange={handleFileChange} disabled={uploading} />
        <div className="upload-icon">📁</div>
        <div className="upload-label">
          {uploading ? 'Uploading...' : <span><strong>{label}</strong> (Max 10MB)</span>}
        </div>
      </div>
      {fileUrl && (
        <div className="file-chip">
          🔗 <a href={fileUrl} target="_blank" rel="noreferrer">View Uploaded File</a>
          <span className="remove-file" onClick={() => { setFileUrl(''); onUploadSuccess(''); }}>×</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
