import React, { useState } from 'react';
import { useDatabase, formatIDR } from '../../context/DatabaseContext';
import { Plus, Edit2, Trash2, BookOpen, AlertCircle, X, Loader2, User, Search } from 'lucide-react';

export default function CustomerList({ onSelectCustomer }) {
  const { customers, addCustomer, editCustomer, deleteCustomer } = useDatabase();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form States
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(10000000); // Default 10jt
  const [discountsLM, setDiscountsLM] = useState([]);
  const [discountsBR, setDiscountsBR] = useState([]);

  // Temp discount input states
  const [tempLM, setTempLM] = useState('');
  const [tempBR, setTempBR] = useState('');
  
  // Async states
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeCustomers = customers.filter((c) => !c.deleted);
  const filteredCustomers = activeCustomers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setName('');
    setThreshold(10000000);
    setDiscountsLM([]);
    setDiscountsBR([]);
    setTempLM('');
    setTempBR('');
    setFormError('');
    setEditingId(null);
    setSubmitting(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (customer) => {
    resetForm();
    setEditingId(customer.id);
    setName(customer.name);
    setThreshold(customer.threshold || 10000000);
    setDiscountsLM([...customer.discountsLM]);
    setDiscountsBR([...customer.discountsBR]);
    setShowModal(true);
  };

  const handleAddDiscountStep = (type) => {
    const valStr = type === 'LM' ? tempLM : tempBR;
    const val = Number(valStr);

    if (valStr.trim() === '' || isNaN(val) || val < 0 || val > 100) {
      setFormError('Nilai diskon harus berupa angka antara 0 sampai 100.');
      return;
    }

    setFormError('');
    if (type === 'LM') {
      setDiscountsLM([...discountsLM, val]);
      setTempLM('');
    } else {
      setDiscountsBR([...discountsBR, val]);
      setTempBR('');
    }
  };

  const handleRemoveDiscountStep = (type, index) => {
    if (type === 'LM') {
      setDiscountsLM(discountsLM.filter((_, i) => i !== index));
    } else {
      setDiscountsBR(discountsBR.filter((_, i) => i !== index));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama pelanggan wajib diisi.');
      return;
    }

    setFormError('');
    setSubmitting(true);

    const customerData = {
      name: name.trim(),
      discountsLM,
      discountsBR,
      threshold: Number(threshold || 0),
    };

    try {
      if (editingId) {
        await editCustomer(editingId, customerData);
      } else {
        await addCustomer(customerData);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      setFormError('Gagal menyimpan pelanggan: ' + err.message);
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, cName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pelanggan "${cName}"?\n(Data transaksi lama tetap tersimpan, namun nama tidak akan muncul lagi di pilihan transaksi baru.)`)) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        alert('Gagal menghapus pelanggan: ' + err.message);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Manajemen Pelanggan</h1>
          <p className="page-description">Kelola data pelanggan, batasan bonus, dan diskon bertingkat (LM & BR).</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Tambah Pelanggan
        </button>
      </div>

      {/* CUSTOMER LIST & SEARCH */}
      {activeCustomers.length === 0 ? (
        <div className="glass-card card-accent-indigo" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          Belum ada pelanggan terdaftar. Silakan tambah pelanggan baru.
        </div>
      ) : (
        <>
          <div className="search-bar-container">
            <Search size={20} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Cari nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="glass-card card-accent-indigo">
            {filteredCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                Tidak ada pelanggan dengan nama "{searchQuery}"
              </div>
            ) : (
              <div className="table-wrapper table-responsive-cards">
                <table>
                  <thead>
                    <tr>
                      <th>Nama Pelanggan</th>
                      <th>Diskon LM (Cascading)</th>
                      <th>Diskon BR (Cascading)</th>
                      <th>Batas Kelayakan Bonus</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td data-label="Nama Pelanggan" style={{ whiteSpace: 'nowrap' }}>
                          <strong style={{ fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={16} style={{ color: 'var(--primary-color)' }} />
                            {customer.name}
                          </strong>
                        </td>
                        <td data-label="Diskon LM">
                          {customer.discountsLM && customer.discountsLM.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {customer.discountsLM.map((d, i) => (
                                <span key={i} className="badge badge-primary">
                                  {d}%
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tidak ada</span>
                          )}
                        </td>
                        <td data-label="Diskon BR">
                          {customer.discountsBR && customer.discountsBR.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {customer.discountsBR.map((d, i) => (
                                <span key={i} className="badge badge-info">
                                  {d}%
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tidak ada</span>
                          )}
                        </td>
                        <td data-label="Batas Kelayakan Bonus" style={{ whiteSpace: 'nowrap' }}>
                          {formatIDR(customer.threshold || 10000000)}
                        </td>
                        <td data-label="Aksi" style={{ whiteSpace: 'nowrap', width: '1%' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => onSelectCustomer(customer.id)}
                              className="btn btn-secondary btn-sm"
                              title="Buka Buku Besar"
                            >
                              <BookOpen size={15} /> Buku Besar
                            </button>
                            <button
                              onClick={() => handleOpenEdit(customer)}
                              className="btn btn-secondary btn-sm"
                              title="Edit"
                              style={{ color: 'var(--accent-color)', borderColor: 'rgba(6, 182, 212, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Edit2 size={13} />
                              <span>Ubah</span>
                            </button>
                            <button
                              onClick={() => handleDelete(customer.id, customer.name)}
                              className="btn btn-secondary btn-sm"
                              title="Hapus"
                              style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Trash2 size={13} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h2>
              <button onClick={() => !submitting && setShowModal(false)} className="modal-close-btn" disabled={submitting}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                backgroundColor: 'var(--danger-glow)', 
                color: 'var(--danger-color)', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label htmlFor="customerName">Nama Pelanggan *</label>
                <input
                  id="customerName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Toko Berkah Abadi"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bonusThreshold">Batas Kelayakan Bonus (Rupiah) *</label>
                <input
                  id="bonusThreshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="Contoh: 10000000"
                  min="0"
                  required
                  disabled={submitting}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Setiap akumulasi pembayaran omzet lunas kelipatan nominal ini akan menghasilkan 1 bonus.
                </span>
              </div>

              {/* DISCOUNT SET LM */}
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <label style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Diskon Tipe LM (%)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="number"
                    value={tempLM}
                    onChange={(e) => setTempLM(e.target.value)}
                    placeholder="Nilai diskon (0-100)"
                    min="0"
                    max="100"
                    disabled={submitting}
                  />
                  <button type="button" onClick={() => handleAddDiscountStep('LM')} className="btn btn-secondary" disabled={submitting}>
                    Tambah
                  </button>
                </div>
                <div className="discount-pills">
                  {discountsLM.map((step, idx) => (
                    <span key={idx} className="discount-pill">
                      Diskon #{idx + 1}: {step}%
                      <button type="button" onClick={() => handleRemoveDiscountStep('LM', idx)} disabled={submitting}>&times;</button>
                    </span>
                  ))}
                  {discountsLM.length === 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Belum ada langkah diskon.</span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                  Urutan menentukan penghitungan diskon bertingkat (cascading).
                </span>
              </div>

              {/* DISCOUNT SET BR */}
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <label style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Diskon Tipe BR (%)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="number"
                    value={tempBR}
                    onChange={(e) => setTempBR(e.target.value)}
                    placeholder="Nilai diskon (0-100)"
                    min="0"
                    max="100"
                    disabled={submitting}
                  />
                  <button type="button" onClick={() => handleAddDiscountStep('BR')} className="btn btn-secondary" disabled={submitting}>
                    Tambah
                  </button>
                </div>
                <div className="discount-pills">
                  {discountsBR.map((step, idx) => (
                    <span key={idx} className="discount-pill">
                      Diskon #{idx + 1}: {step}%
                      <button type="button" onClick={() => handleRemoveDiscountStep('BR', idx)} disabled={submitting}>&times;</button>
                    </span>
                  ))}
                  {discountsBR.length === 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Belum ada langkah diskon.</span>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" disabled={submitting}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
