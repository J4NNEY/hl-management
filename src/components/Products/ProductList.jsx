import React, { useState } from 'react';
import { useDatabase, formatIDR } from '../../context/DatabaseContext';
import { Plus, Edit2, Trash2, AlertCircle, X, Package } from 'lucide-react';

export default function ProductList() {
  const { products, addProduct, editProduct, deleteProduct } = useDatabase();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form States
  const [name, setName] = useState('');
  const [type, setType] = useState('LM'); // 'LM' or 'BR'
  const [modal, setModal] = useState('');
  const [base, setBase] = useState('');
  
  // Async states
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeProducts = products.filter((p) => !p.deleted);

  const resetForm = () => {
    setName('');
    setType('LM');
    setModal('');
    setBase('');
    setFormError('');
    setEditingId(null);
    setSubmitting(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (product) => {
    resetForm();
    setEditingId(product.id);
    setName(product.name);
    setType(product.type);
    setModal(product.modal);
    setBase(product.base);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama produk wajib diisi.');
      return;
    }

    const modalVal = Number(modal);
    const baseVal = Number(base);

    if (isNaN(modalVal) || modalVal < 0) {
      setFormError('Harga Modal harus berupa angka dan tidak boleh kurang dari 0.');
      return;
    }

    if (isNaN(baseVal) || baseVal < 0) {
      setFormError('Harga Base/Jual harus berupa angka dan tidak boleh kurang dari 0.');
      return;
    }

    setFormError('');
    setSubmitting(true);

    const productData = {
      name: name.trim(),
      type,
      modal: modalVal,
      base: baseVal,
    };

    try {
      if (editingId) {
        await editProduct(editingId, productData);
      } else {
        await addProduct(productData);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      setFormError('Gagal menyimpan produk: ' + err.message);
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, pName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${pName}"?\n(Data transaksi lama tetap menyimpan produk ini, namun produk tidak akan muncul lagi pada pilihan transaksi baru.)`)) {
      try {
        await deleteProduct(id);
      } catch (err) {
        alert('Gagal menghapus produk: ' + err.message);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Manajemen Produk</h1>
          <p className="page-description">Kelola katalog barang, harga modal, harga jual base, dan tipe klasifikasi (LM atau BR).</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={18} /> Tambah Produk
        </button>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="glass-card card-accent-accent">
        {activeProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Belum ada produk terdaftar. Silakan tambah produk baru.
          </div>
        ) : (
          <div className="table-wrapper table-responsive-cards">
            <table>
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Tipe</th>
                  <th>Harga Modal (Beli)</th>
                  <th>Harga Base (Jual Sebelum Diskon)</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {activeProducts.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Nama Produk">
                      <strong style={{ fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={16} style={{ color: 'var(--accent-color)' }} />
                        {product.name}
                      </strong>
                    </td>
                    <td data-label="Tipe">
                      <span className={`badge ${product.type === 'LM' ? 'badge-primary' : 'badge-info'}`}>
                        {product.type}
                      </span>
                    </td>
                    <td data-label="Harga Modal">{formatIDR(product.modal)}</td>
                    <td data-label="Harga Base"><strong>{formatIDR(product.base)}</strong></td>
                    <td data-label="Aksi">
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="btn btn-secondary btn-sm"
                          title="Edit"
                          style={{ color: 'var(--accent-color)', borderColor: 'rgba(6, 182, 212, 0.2)' }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="btn btn-secondary btn-sm"
                          title="Hapus"
                          style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                        >
                          <Trash2 size={15} />
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

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
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
                <label htmlFor="productName">Nama Produk *</label>
                <input
                  id="productName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pipa LM 2 Inch Tebal"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="productType">Tipe Produk *</label>
                <select
                  id="productType"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="LM">LM</option>
                  <option value="BR">BR</option>
                </select>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Menentukan set diskon mana yang akan digunakan dari profil pelanggan.
                </span>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="priceModal">Harga Modal (HL Pay) *</label>
                  <input
                    id="priceModal"
                    type="number"
                    value={modal}
                    onChange={(e) => setModal(e.target.value)}
                    placeholder="Contoh: 40000"
                    min="0"
                    required
                    disabled={submitting}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Hanya untuk perhitungan laba dan disembunyikan dari pelanggan.
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="priceBase">Harga Jual Base (Sebelum Diskon) *</label>
                  <input
                    id="priceBase"
                    type="number"
                    value={base}
                    onChange={(e) => setBase(e.target.value)}
                    placeholder="Contoh: 100000"
                    min="0"
                    required
                    disabled={submitting}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Harga kotor sebelum dikenakan diskon bertingkat pelanggan.
                  </span>
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
