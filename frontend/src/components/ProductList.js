import React, { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ sku: '', name: '', active: '' });
  const [next, setNext] = useState(null);
  const [prev, setPrev] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const { addToast } = useToast();

  const [showDeleteAll, setShowDeleteAll] = useState(false);
const [loadingDeleteAll, setLoadingDeleteAll] = useState(false);
const [message, setMessage] = useState(null);


  const fetchProducts = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, ...filters };
      const res = await api.get('/products/', { params });
      const data = Array.isArray(res.data.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
      setProducts(data);
      setNext(res.data.next);
      setPrev(res.data.previous);
      setPage(p);
      setSelectedIds([]);
    } catch (err) {
      addToast('Failed to load products.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(1); }, []);


  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(products.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}/`);
      addToast('Product deleted.', 'success');
      fetchProducts(page);
    } catch (err) {
      addToast('Delete failed.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} products?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/products/${id}/`)));
      addToast(`Deleted ${selectedIds.length} products.`, 'success');
      fetchProducts(page);
    } catch (err) {
      addToast('Some products could not be deleted.', 'error');
    }
  };

  const handleDeleteAll = async () => {
    try {
        setLoadingDeleteAll(true);
        setMessage(null);

        const response = await api.delete("/delete-all/");

        setMessage(response.data.message || "All products deleted successfully.");
        addToast("All products have been deleted.", "success");

        fetchProducts(1);
        setShowDeleteAll(false);

    } catch (error) {
        console.error(error);
        setMessage("Error deleting products");
        addToast("Error deleting products.", "error");
    } finally {
        setLoadingDeleteAll(false);
    }
  };

  const openModal = (product = null) => {
    setEditForm(product ? { ...product } : { sku: '', name: '', price: '', active: true, description: '' });
    setShowModal(true);
  };

  const saveProduct = async () => {
    try {
      if (editForm.id) {
        await api.put(`/products/${editForm.id}/`, editForm);
        addToast('Product updated', 'success');
      } else {
        await api.post('/products/', editForm);
        addToast('Product created', 'success');
      }
      setShowModal(false);
      fetchProducts(page);
    } catch (err) {
      addToast('Failed to save product.', 'error');
    }
  };

  return (
    <div className="card">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h3>Products Manager</h3>
        <div>
          <button
              className="btn-danger"
              onClick={() => setShowDeleteAll(true)}
              style={{marginRight: '10px'}}
          >
              Delete All Products
          </button>
          <button className="btn-primary" onClick={() => openModal()}>+ Create Product</button>
          {selectedIds.length > 0 && (
            <button className="btn-danger" onClick={handleBulkDelete}>Delete ({selectedIds.length})</button>
          )}
        </div>
      </div>

      {message && (
        <div style={{
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: message.includes('Error') ? '#fee2e2' : '#dcfce7',
          color: message.includes('Error') ? '#b91c1c' : '#15803d',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{background: '#f9fafb', padding: 15, borderRadius: 6, margin: '15px 0'}}>
        <input placeholder="SKU" value={filters.sku} onChange={(e) => handleFilterChange('sku', e.target.value)} />
        <input placeholder="Name" value={filters.name} onChange={(e) => handleFilterChange('name', e.target.value)} />
        <select value={filters.active} onChange={(e) => handleFilterChange('active', e.target.value)}>
          <option value="">Status: All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button className="btn-secondary" onClick={() => fetchProducts(1)}>Search</button>
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          <table>
            <thead>
              <tr>
                <th style={{width: 40}}><input type="checkbox" onChange={handleSelectAll} checked={products.length > 0 && selectedIds.length === products.length} /></th>
                <th>SKU</th>
                <th>Name</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? <tr><td colSpan="6" style={{textAlign:'center'}}>No products found</td></tr> : 
                products.map((p) => (
                <tr key={p.id}>
                  <td><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => handleSelectRow(p.id)} /></td>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>${p.price}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem',
                      background: p.active ? '#dcfce7' : '#f3f4f6', color: p.active ? '#166534' : '#374151'
                    }}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-secondary btn-sm" onClick={() => openModal(p)}>Edit</button>
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <button className="btn-secondary" onClick={() => fetchProducts(page - 1)} disabled={!prev}>Previous</button>
            <span style={{margin: '0 15px'}}>Page {page}</span>
            <button className="btn-secondary" onClick={() => fetchProducts(page + 1)} disabled={!next}>Next</button>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editForm.id ? 'Edit Product' : 'New Product'}</h3>
            <div className="form-group">
              <label>SKU</label>
              <input value={editForm.sku} onChange={e=>setEditForm({...editForm, sku: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Name</label>
              <input value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Price</label>
              <input type="number" value={editForm.price} onChange={e=>setEditForm({...editForm, price: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={editForm.description || ''} onChange={e=>setEditForm({...editForm, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={editForm.active} onChange={e=>setEditForm({...editForm, active: e.target.checked})} />
                Active
              </label>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <button className="btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveProduct}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAll && (
        <div className="modal-overlay">
            <div className="modal">
                <h3 style={{color: '#dc2626'}}>Are you sure?</h3>
                <p>This will permanently delete <strong>ALL</strong> products in the database. This action cannot be undone.</p>

                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px'}}>
                    <button className="btn-secondary" onClick={() => setShowDeleteAll(false)}>
                        Cancel
                    </button>

                    <button className="btn-danger" onClick={handleDeleteAll} disabled={loadingDeleteAll}>
                        {loadingDeleteAll ? "Deleting..." : "Yes, Delete All"}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}