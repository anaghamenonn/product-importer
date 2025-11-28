import React, { useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

export default function CsvUploader() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [status, setStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToast();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f) => {
    if (f.type !== "text/csv" && !f.name.endsWith('.csv')) {
      addToast("Please upload a valid CSV file.", "error");
      return;
    }
    setFile(f);
    setStatus(null);
    setUploadPct(0);
  };

  const upload = async () => {
    if (!file) return;
    setIsProcessing(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await api.post('/upload/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            setUploadPct(Math.round((e.loaded * 100) / e.total));
          }
        }
      });
      addToast("Upload complete. Processing started.", "info");
      pollStatus(res.data.task_id);
    } catch (err) {
      setIsProcessing(false);
      const msg = err.response?.data?.message || err.message;
      addToast(`Upload failed: ${msg}`, "error");
      setStatus({ stage: 'failed', message: msg });
    }
  };

  const pollStatus = (tid) => {
    const interval = setInterval(async () => {
      try {
        const r = await api.get(`/tasks/${tid}/status/`);
        setStatus(r.data);
        
        if (r.data.stage === 'complete') {
          clearInterval(interval);
          setIsProcessing(false);
          addToast("Import completed successfully!", "success");
        } else if (r.data.stage === 'failed') {
          clearInterval(interval);
          setIsProcessing(false);
          addToast(`Import failed: ${r.data.message}`, "error");
        }
      } catch (err) {
      }
    }, 1500);
  };

  return (
    <div className="card">
      <h3>Upload CSV</h3>
      <p style={{color: '#666', fontSize: '0.9rem', marginBottom: '20px'}}>
        Drag and drop your product CSV file here. Large files (500k+ rows) are supported.
      </p>

      <div 
        className={`drop-zone ${dragActive ? 'dragging' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <input 
          id="fileInput" 
          type="file" 
          accept=".csv" 
          onChange={handleChange} 
          style={{display: 'none'}} 
        />
        <p>{file ? `Selected: ${file.name}` : "Drag & Drop CSV or Click to Browse"}</p>
      </div>

      {file && (
        <div style={{marginTop: 20}}>
          <button className="btn-primary" onClick={upload} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Start Import'}
          </button>
          <button className="btn-secondary" onClick={() => setFile(null)} disabled={isProcessing}>
            Clear
          </button>
        </div>
      )}

      {(uploadPct > 0 || status) && (
        <div style={{marginTop: 30}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 5}}>
            <strong>{status ? status.stage.toUpperCase() : 'UPLOADING...'}</strong>
            <span>{uploadPct}% Uploaded</span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{
                width: status && status.stage === 'complete' ? '100%' : `${uploadPct}%`,
                backgroundColor: status?.stage === 'failed' ? '#dc2626' : undefined
              }}
            ></div>
          </div>

          {status && (
            <div style={{marginTop: 15, padding: 15, background: '#f8fafc', borderRadius: 4}}>
              <p><strong>Message:</strong> {status.message}</p>
              <p><strong>Progress:</strong> {status.processed || 0} / {status.total || 'Unknown'} rows processed</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}