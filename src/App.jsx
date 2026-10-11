import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Backend REST API Base URL (configured via VITE_API_BASE_URL on Render, or localhost:8080 locally)
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function App() {
  const [activeTab, setActiveTab] = useState('properties');
  const [backendConnected, setBackendConnected] = useState(false);

  // =========================================================
  // 1. PROPERTIES STATE & CRUD (Spring Boot + MySQL)
  // =========================================================
  const [properties, setProperties] = useState([]);
  const emptyPropertyForm = {
    title: '',
    category: 'Apartment',
    location: '',
    rent: '',
    contact: ''
  };

  const [propForm, setPropForm] = useState(emptyPropertyForm);
  const [editingPropId, setEditingPropId] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [propError, setPropError] = useState('');

  // Fetch all properties from Backend REST API
  const fetchProperties = async (search = '') => {
    try {
      const res = await axios.get(`${API_BASE}/property/get`, {
        params: search ? { keyword: search } : {}
      });
      setProperties(res.data);
      setBackendConnected(true);
    } catch (err) {
      console.warn("Backend not running on port 8080 yet.", err.message);
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchTenants();
    fetchRequests();
  }, []);

  const handlePropFormChange = (e) => {
    setPropForm({ ...propForm, [e.target.name]: e.target.value });
  };

  // Add (CREATE) or Update (UPDATE) Property
  const handleSaveProperty = async () => {
    if (!propForm.title.trim() || !propForm.rent.trim()) {
      setPropError('Property Title and Rent are required.');
      return;
    }
    setPropError('');

    try {
      if (editingPropId) {
        // PUT /property/update/{id}
        await axios.put(`${API_BASE}/property/update/${editingPropId}`, propForm);
        setEditingPropId(null);
      } else {
        // POST /property/add
        await axios.post(`${API_BASE}/property/add`, propForm);
      }
      setPropForm(emptyPropertyForm);
      fetchProperties(searchKeyword);
    } catch (err) {
      alert('Could not save to backend. Please make sure the server is running on port 8080.');
    }
  };

  const handleEditProperty = (prop) => {
    setPropForm({
      title: prop.title || '',
      category: prop.category || 'Apartment',
      location: prop.location || '',
      rent: prop.rent || '',
      contact: prop.contact || ''
    });
    setEditingPropId(prop.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete (DELETE) Property
  const handleDeleteProperty = async (id) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      try {
        await axios.delete(`${API_BASE}/property/delete/${id}`);
        fetchProperties(searchKeyword);
      } catch (err) {
        alert('Could not delete property from backend.');
      }
    }
  };

  // =========================================================
  // 2. TENANTS STATE & CRUD (Spring Boot + MySQL)
  // =========================================================
  const [tenants, setTenants] = useState([]);
  const emptyTenantForm = { name: '', email: '', phone: '' };
  const [tenantForm, setTenantForm] = useState(emptyTenantForm);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [tenantError, setTenantError] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const fetchTenants = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tenant/get`);
      setTenants(res.data);
      if (res.data.length > 0 && !selectedTenantId) {
        setSelectedTenantId(res.data[0].id);
      }
    } catch (err) {
      console.warn("Could not fetch tenants", err.message);
    }
  };

  const handleSaveTenant = async () => {
    if (!tenantForm.name.trim() || !tenantForm.email.trim()) {
      setTenantError('Tenant Name and Email are required.');
      return;
    }
    setTenantError('');

    try {
      if (editingTenantId) {
        await axios.put(`${API_BASE}/tenant/update/${editingTenantId}`, tenantForm);
        setEditingTenantId(null);
      } else {
        await axios.post(`${API_BASE}/tenant/add`, tenantForm);
      }
      setTenantForm(emptyTenantForm);
      fetchTenants();
    } catch (err) {
      alert('Could not save tenant to backend.');
    }
  };

  const handleEditTenant = (t) => {
    setTenantForm({
      name: t.name || '',
      email: t.email || '',
      phone: t.phone || ''
    });
    setEditingTenantId(t.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTenant = async (id) => {
    if (window.confirm('Delete this tenant?')) {
      try {
        await axios.delete(`${API_BASE}/tenant/delete/${id}`);
        fetchTenants();
      } catch (err) {
        alert('Could not delete tenant from backend.');
      }
    }
  };

  // =========================================================
  // 3. RENTAL REQUESTS STATE & CRUD (Spring Boot + MySQL)
  // =========================================================
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/request/get`);
      setRequests(res.data);
    } catch (err) {
      console.warn("Could not fetch requests", err.message);
    }
  };

  const handleApplyProperty = async (property) => {
    const tenant = tenants.find(t => String(t.id) === String(selectedTenantId));
    if (!tenant) {
      alert('Please add a tenant first in the "Tenants" tab before applying.');
      setActiveTab('tenants');
      return;
    }

    const newReq = {
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      propertyTitle: property.title,
      propertyLocation: property.location,
      rent: property.rent,
      status: 'PENDING',
      date: new Date().toLocaleDateString()
    };

    try {
      await axios.post(`${API_BASE}/request/add`, newReq);
      alert(`Rental request for "${property.title}" submitted successfully for tenant ${tenant.name}!`);
      fetchRequests();
    } catch (err) {
      alert('Could not submit request to backend.');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API_BASE}/request/status/${id}`, null, {
        params: { status: newStatus }
      });
      fetchRequests();
    } catch (err) {
      alert('Could not update request status.');
    }
  };

  const handleDeleteRequest = async (id) => {
    if (window.confirm('Delete this rental request?')) {
      try {
        await axios.delete(`${API_BASE}/request/delete/${id}`);
        fetchRequests();
      } catch (err) {
        alert('Could not delete request.');
      }
    }
  };

  return (
    <div className="container">
      {/* Title */}
      <h1>RentEase – Smart Rental & Property Management System</h1>
      <p className="subtitle">
        Manage rental properties, tenant registrations, and booking agreements.
      </p>

      {/* Backend Status Notice */}
      {!backendConnected && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '10px 14px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', color: '#92400e' }}>
          ℹ️ <strong>Notice:</strong> Server is not connected. Please make sure the backend server is running.
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'properties' ? 'active' : ''}
          onClick={() => setActiveTab('properties')}
        >
          Properties ({properties.length})
        </button>
        <button 
          className={activeTab === 'tenants' ? 'active' : ''}
          onClick={() => setActiveTab('tenants')}
        >
          Tenants ({tenants.length})
        </button>
        <button 
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Rental Requests ({requests.length})
        </button>
      </div>

      {/* =========================================================
          TAB 1: PROPERTIES
         ========================================================= */}
      {activeTab === 'properties' && (
        <>
          {/* Active Tenant Selector for Applying */}
          <div className="card">
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
              Applying as Tenant:
            </label>
            <select 
              value={selectedTenantId} 
              onChange={(e) => setSelectedTenantId(e.target.value)}
            >
              {tenants.length === 0 ? (
                <option value="">No tenants registered – please add a tenant first in Tenants tab</option>
              ) : (
                tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Post or Edit Property Form */}
          <div className="card">
            <h2>{editingPropId ? 'Edit Property' : 'Post a New Rental Property'}</h2>

            <input 
              name="title" 
              placeholder="Property Title (e.g. 2BHK Apartment) *"
              value={propForm.title}
              onChange={handlePropFormChange}
            />

            <select 
              name="category"
              value={propForm.category}
              onChange={handlePropFormChange}
            >
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="Villa">Villa</option>
              <option value="Studio">Studio</option>
            </select>

            <input 
              name="location" 
              placeholder="Location / City (e.g. Hyderabad, Austin)"
              value={propForm.location}
              onChange={handlePropFormChange}
            />

            <input 
              name="rent" 
              type="number"
              placeholder="Monthly Rent ($ or ₹) *"
              value={propForm.rent}
              onChange={handlePropFormChange}
            />

            <input 
              name="contact" 
              placeholder="Contact Phone / Landlord Name"
              value={propForm.contact}
              onChange={handlePropFormChange}
            />

            {propError && <p className="error">{propError}</p>}

            <button onClick={handleSaveProperty} className="green">
              {editingPropId ? 'Update Property' : 'Add Property'}
            </button>

            {editingPropId && (
              <button 
                className="grey" 
                onClick={() => { setEditingPropId(null); setPropForm(emptyPropertyForm); }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Properties List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Available Properties</h2>
              <button onClick={() => fetchProperties(searchKeyword)} className="grey" style={{ fontSize: '12px', padding: '5px 10px' }}>
                Refresh
              </button>
            </div>

            <div className="search">
              <input 
                placeholder="Search properties by title or location..."
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  fetchProperties(e.target.value);
                }}
              />
              <button onClick={() => fetchProperties(searchKeyword)}>Search</button>
            </div>

            {properties.length === 0 ? (
              <p className="empty-text">No properties found. Enter your property details above to list one!</p>
            ) : (
              properties.map(prop => (
                <div key={prop.id} className="item-box">
                  <div>
                    <h3>{prop.title} ({prop.category})</h3>
                    <p>{prop.location || 'Location Not Specified'}</p>
                    <p className="price">Rent: {prop.rent} / month</p>
                    {prop.contact && <p style={{ fontSize: '13px', color: '#64748b' }}>Contact: {prop.contact}</p>}
                  </div>
                  <div className="actions">
                    <button className="green" onClick={() => handleApplyProperty(prop)}>
                      Rent
                    </button>
                    <button onClick={() => handleEditProperty(prop)}>
                      Edit
                    </button>
                    <button className="red" onClick={() => handleDeleteProperty(prop.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* =========================================================
          TAB 2: TENANTS
         ========================================================= */}
      {activeTab === 'tenants' && (
        <>
          {/* Register / Edit Tenant Form */}
          <div className="card">
            <h2>{editingTenantId ? 'Edit Tenant' : 'Register New Tenant'}</h2>

            <input 
              placeholder="Tenant Full Name *"
              value={tenantForm.name}
              onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
            />

            <input 
              type="email"
              placeholder="Email Address *"
              value={tenantForm.email}
              onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
            />

            <input 
              placeholder="Phone Number"
              value={tenantForm.phone}
              onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
            />

            {tenantError && <p className="error">{tenantError}</p>}

            <button onClick={handleSaveTenant} className="green">
              {editingTenantId ? 'Update Tenant' : 'Add Tenant'}
            </button>

            {editingTenantId && (
              <button 
                className="grey" 
                onClick={() => { setEditingTenantId(null); setTenantForm(emptyTenantForm); }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Registered Tenants List */}
          <div className="card">
            <h2>Registered Tenants</h2>

            {tenants.length === 0 ? (
              <p className="empty-text">No tenants registered yet. Add one using the form above.</p>
            ) : (
              tenants.map(t => (
                <div key={t.id} className="item-box">
                  <div>
                    <h3>{t.name}</h3>
                    <p>{t.email} • Phone: {t.phone || 'N/A'}</p>
                  </div>
                  <div className="actions">
                    <button onClick={() => handleEditTenant(t)}>
                      Edit
                    </button>
                    <button className="red" onClick={() => handleDeleteTenant(t.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* =========================================================
          TAB 3: RENTAL REQUESTS
         ========================================================= */}
      {activeTab === 'requests' && (
        <div className="card">
          <h2>Rental Inquiries & Requests</h2>

          {requests.length === 0 ? (
            <p className="empty-text">
              No rental requests yet. Go to the "Properties" tab and click "Rent" on any property.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>Rent</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id}>
                      <td><strong>{req.tenantName}</strong></td>
                      <td>{req.propertyTitle}</td>
                      <td style={{ color: '#10b981', fontWeight: 'bold' }}>{req.rent}</td>
                      <td>{req.date}</td>
                      <td>
                        <select 
                          value={req.status} 
                          onChange={(e) => handleUpdateStatus(req.id, e.target.value)}
                          style={{ margin: 0, padding: '5px 8px' }}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </td>
                      <td>
                        <button className="red" onClick={() => handleDeleteRequest(req.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
