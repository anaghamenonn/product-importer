import React, { useState } from 'react';
import CsvUploader from './components/CsvUploader';
import ProductList from './components/ProductList';
import WebhooksManager from './components/WebhooksManager';
import { ToastProvider } from './context/ToastContext';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  const renderContent = () => {
    switch(activeTab) {
      case 'upload': return <CsvUploader />;
      case 'products': return <ProductList />;
      case 'webhooks': return <WebhooksManager />;
      default: return <CsvUploader />;
    }
  };

  return (
    <ToastProvider>
      <div className="app-container">
        <div className="sidebar">
          <h2>Acme Importer</h2>
          
          <div 
            className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload CSV
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </div>
          
          <div 
            className={`nav-item ${activeTab === 'webhooks' ? 'active' : ''}`}
            onClick={() => setActiveTab('webhooks')}
          >
            Webhooks
          </div>
        </div>

        <div className="main-content">
          {renderContent()}
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;