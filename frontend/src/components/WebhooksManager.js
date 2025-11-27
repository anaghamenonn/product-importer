import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

export default function WebhooksManager() {
  const [hooks, setHooks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', event: 'product.import.completed', enabled: true });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/webhooks/');
      const data = Array.isArray(r.data.results) ? r.data.results : Array.isArray(r.data) ? r.data : [];
      setHooks(data);
    } catch (err) {
      addToast('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    try {
      if (form.id) {
        await api.put(`/webhooks/${form.id}/`, form);
        addToast('Webhook updated', 'success');
      } else {
        await api.post('/webhooks/', form);
        addToast('Webhook created', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      addToast('Operation failed', 'error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', url: '', event: 'product.import.completed', enabled: true });
    setIsEditing(false);
  };

  const handleEdit = (h) => {
    setForm(h);
    setIsEditing(true);
  };

  const testHook = async (id) => {
    try {
      const r = await api.post(`/webhooks/${id}/test/`, { payload: { message: 'Test Trigger' } });
      addToast(`Test queued. Task ID: ${r.data.task_id}`, 'info');
    } catch (err) {
      addToast('Test trigger failed', 'error');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete webhook?')) return;
    try {
      await api.delete(`/webhooks/${id}/`);
      addToast('Webhook deleted', 'success');
      load();
    } catch (err) {
      addToast('Delete failed', 'error');
    }
  };

  const toggleStatus = async (h) => {
    try {
      await api.patch(`/webhooks/${h.id}/`, { enabled: !h.enabled });
      load(); 
      addToast(`Webhook ${!h.enabled ? 'Enabled' : 'Disabled'}`, 'success');
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="card">
      <h3>Webhooks Configuration</h3>
      
      <div style={{ background: '#f9fafb', padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <h4>{isEditing ? 'Edit Webhook' : 'Add New Webhook'}</h4>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center'}}>
          <input 
            placeholder="Name (e.g. ERP Sync)" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            style={{width: 200}}
          />
          <input 
            placeholder="Payload URL" 
            value={form.url} 
            onChange={e => setForm({...form, url: e.target.value})} 
            style={{flex: 1, minWidth: 250}}
          />
          <select value={form.event} onChange={e => setForm({...form, event: e.target.value})}>
            <option value="product.import.completed">Import Completed</option>
            <option value="product.import.failed">Import Failed</option>
          </select>
          <label style={{margin: '0 15px', display: 'flex', alignItems: 'center'}}>
            <input type="checkbox" checked={form.enabled} onChange={e => setForm({...form, enabled: e.target.checked})} />
            Enable
          </label>
        </div>
        <div style={{marginTop: 10}}>
           <button className="btn-primary" onClick={handleSubmit}>{isEditing ? 'Update' : 'Add Webhook'}</button>
           {isEditing && <button className="btn-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </div>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Event</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hooks.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center'}}>No webhooks configured</td></tr> : 
              hooks.map(h => (
              <tr key={h.id}>
                <td>{h.name}</td>
                <td style={{wordBreak: 'break-all'}}>{h.url}</td>
                <td><small>{h.event}</small></td>
                <td>
                  <button 
                    onClick={() => toggleStatus(h)}
                    style={{
                      background: 'none', border: '1px solid #ccc', borderRadius: 15,
                      padding: '2px 8px', cursor: 'pointer',
                      color: h.enabled ? 'green' : 'gray', borderColor: h.enabled ? 'green' : 'gray'
                    }}
                  >
                    {h.enabled ? '● Enabled' : '○ Disabled'}
                  </button>
                </td>
                <td>
                  <button className="btn-secondary btn-sm" onClick={() => testHook(h.id)}>Test</button>
                  <button className="btn-secondary btn-sm" onClick={() => handleEdit(h)}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => remove(h.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}