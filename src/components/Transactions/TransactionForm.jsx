import React, { useState, useEffect } from 'react';
import { useDatabase, formatIDR, calculateCascadingDiscount } from '../../context/DatabaseContext';
import { Plus, Trash2, Save, AlertCircle, RefreshCw, Award } from 'lucide-react';

export default function TransactionForm({ editTxId, onSaveSuccess }) {
  const { 
    customers, 
    products, 
    transactions, 
    addTransaction, 
    editTransaction, 
    getCustomerBonusStats 
  } = useDatabase();

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. FORM STATES
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bonNo, setBonNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([]);
  const [ongkir, setOngkir] = useState(0);
  const [description, setDescription] = useState('');
  const [isBonus, setIsBonus] = useState(false);
  const [bonusCount, setBonusCount] = useState(1);
  const [status, setStatus] = useState('Piutang');
  const [paymentDate, setPaymentDate] = useState('');

  const activeCustomers = customers.filter((c) => !c.deleted);
  const activeProducts = products.filter((p) => !p.deleted);

  // 2. RETRIEVE CURRENT SELECTED CUSTOMER & BONUS STATS
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const bonusStats = customerId ? getCustomerBonusStats(customerId) : null;

  // 3. EDIT MODE POPULATION
  useEffect(() => {
    if (editTxId) {
      const tx = transactions.find((t) => t.id === editTxId);
      if (tx) {
        setDate(tx.date);
        setBonNo(tx.bonNo);
        setCustomerId(tx.customerId);
        setOngkir(tx.ongkir);
        setDescription(tx.description || '');
        setIsBonus(tx.isBonus || false);
        setBonusCount(tx.bonusCount || 1);
        setStatus(tx.status);
        setPaymentDate(tx.paymentDate || '');
        
        const constructedLines = tx.lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
        }));
        setLines(constructedLines);
      }
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setBonNo(`BON-${Date.now().toString().slice(-6)}`);
      setCustomerId('');
      setLines([]);
      setOngkir(0);
      setDescription('');
      setIsBonus(false);
      setBonusCount(1);
      setStatus('Piutang');
      setPaymentDate('');
    }
    setFormError('');
    setFormSuccess('');
    setSubmitting(false);
  }, [editTxId, transactions]);

  const handleRegenBonNo = () => {
    setBonNo(`BON-${Date.now().toString().slice(-6)}`);
  };

  const handleAddLine = () => {
    if (activeProducts.length === 0) return;
    setLines([...lines, { productId: activeProducts[0].id, qty: 1 }]);
  };

  const handleRemoveLine = (idx) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx, field, value) => {
    const updated = lines.map((line, i) => {
      if (i === idx) {
        return { ...line, [field]: value };
      }
      return line;
    });
    setLines(updated);
  };

  const calculatedLines = lines.map((line) => {
    const prod = products.find((p) => p.id === line.productId);
    if (!prod || !selectedCustomer) return { ...line, name: '?', type: '?', priceBase: 0, priceDiscounted: 0, total: 0 };

    const discounts = prod.type === 'LM' ? selectedCustomer.discountsLM : selectedCustomer.discountsBR;
    const priceBase = prod.base;

    let priceDiscounted = 0;
    let total = 0;

    if (!isBonus) {
      priceDiscounted = calculateCascadingDiscount(priceBase, discounts);
      total = priceDiscounted * line.qty;
    } else {
      priceDiscounted = 0;
      total = 0;
    }

    return {
      ...line,
      name: prod.name,
      type: prod.type,
      priceBase,
      discounts,
      priceDiscounted,
      total,
    };
  });

  const totalOmzet = calculatedLines.reduce((sum, line) => sum + line.total, 0);
  const totalOwed = totalOmzet + Number(ongkir || 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!bonNo.trim()) {
      setFormError('Nomor Bon wajib diisi.');
      return;
    }

    if (!customerId) {
      setFormError('Silakan pilih pelanggan.');
      return;
    }

    if (lines.length === 0) {
      setFormError('Minimal harus menambahkan 1 baris produk.');
      return;
    }

    const hasInvalidQty = lines.some((l) => Number(l.qty) < 1);
    if (hasInvalidQty) {
      setFormError('Kuantitas produk tidak boleh kurang dari 1.');
      return;
    }

    setSubmitting(true);

    const txData = {
      date,
      bonNo: bonNo.trim(),
      customerId,
      lines,
      ongkir: Number(ongkir || 0),
      description: description.trim(),
      isBonus,
      bonusCount: isBonus ? Number(bonusCount || 1) : 0,
      status,
      paymentDate: status === 'Lunas' ? (paymentDate || new Date().toISOString().split('T')[0]) : '',
    };

    try {
      if (editTxId) {
        await editTransaction(editTxId, txData);
        setFormSuccess('Transaksi berhasil diperbarui!');
      } else {
        await addTransaction(txData);
        setFormSuccess('Transaksi baru berhasil disimpan!');
      }

      setTimeout(() => {
        onSaveSuccess();
      }, 1500);

    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>{editTxId ? 'Edit Transaksi' : 'Transaksi Penjualan Baru'}</h1>
        <p className="page-description">
          {editTxId 
            ? 'Mengubah data nota transaksi penjualan atau bonus yang sudah tersimpan.' 
            : 'Mendaftarkan nota penjualan baru. Diskon bertingkat akan diterapkan secara otomatis berdasarkan jenis barang.'
          }
        </p>
      </div>

      {formError && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          backgroundColor: 'var(--danger-glow)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          padding: '0.75rem 1rem', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '1.5rem',
          color: 'var(--danger-color)',
          fontSize: '0.95rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          backgroundColor: 'var(--success-glow)', 
          border: '1px solid rgba(16, 185, 129, 0.3)', 
          padding: '0.75rem 1rem', 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '1.5rem',
          color: 'var(--success-color)',
          fontSize: '0.95rem'
        }}>
          <Save size={18} style={{ flexShrink: 0 }} />
          <span>{formSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="grid-2">
          {/* LEFT COLUMN: PRIMARY INFO */}
          <div className="glass-card card-accent-indigo" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2>Informasi Nota</h2>

            <div className="form-group">
              <label htmlFor="txDate">Tanggal Nota *</label>
              <input
                id="txDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="txBonNo">Nomor Bon *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="txBonNo"
                  type="text"
                  value={bonNo}
                  onChange={(e) => setBonNo(e.target.value)}
                  placeholder="Masukkan nomor unik"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={handleRegenBonNo}
                  className="btn btn-secondary"
                  title="Generate ID Baru"
                  disabled={submitting}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="txCustomer">Pilih Pelanggan *</label>
              <select
                id="txCustomer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                disabled={!!editTxId || submitting}
              >
                <option value="">-- Pilih Pelanggan --</option>
                {activeCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* BONUS TOGGLE MECHANIC (AC-5) */}
            {customerId && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div className="toggle-container" style={{ marginBottom: isBonus ? '1rem' : '0' }}>
                  <input
                    type="checkbox"
                    id="txIsBonus"
                    checked={isBonus}
                    onChange={(e) => setIsBonus(e.target.checked)}
                    style={{ display: 'none' }}
                    disabled={submitting}
                  />
                  <div className="toggle-switch"></div>
                  <label htmlFor="txIsBonus" style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Transaksi ini adalah BONUS
                  </label>
                </div>

                {isBonus && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning-color)', fontSize: '0.9rem' }}>
                      <Award size={16} />
                      <span>
                        Tersedia <strong>{bonusStats?.bonusesAvailable || 0}</strong> bonus untuk diklaim.
                      </span>
                    </div>
                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label htmlFor="txBonusCount">Jumlah Bonus Dikonsumsi</label>
                      <input
                        id="txBonusCount"
                        type="number"
                        min="1"
                        value={bonusCount}
                        onChange={(e) => setBonusCount(e.target.value)}
                        required
                        disabled={submitting}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Setiap bonus yang dikonsumsi akan mengurangi 1 threshold lunas.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: ADDITIONAL PARAMS */}
          <div className="glass-card card-accent-accent" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2>Metode Pembayaran & Ongkir</h2>

            <div className="form-group">
              <label htmlFor="txOngkir">Ongkos Kirim (Ongkir) *</label>
              <input
                id="txOngkir"
                type="number"
                value={ongkir}
                onChange={(e) => setOngkir(e.target.value)}
                placeholder="Contoh: 150000"
                min="0"
                required
                disabled={submitting}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Ongkir dibebankan langsung ke pelanggan (tidak dimasukkan dalam Laba HL).
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="txStatus">Status Transaksi *</label>
              <select
                id="txStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="Piutang">Piutang (Belum Bayar)</option>
                <option value="Lunas">Lunas (Sudah Bayar)</option>
              </select>
            </div>

            {status === 'Lunas' && (
              <div className="form-group" style={{ animation: 'fadeIn 0.2s' }}>
                <label htmlFor="txPaymentDate">Tanggal Pelunasan *</label>
                <input
                  id="txPaymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="txDesc">Keterangan Tambahan</label>
              <textarea
                id="txDesc"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tulis detail proyek, alamat kirim, dsb..."
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        {/* LINE ITEMS BLOCK */}
        <div className="glass-card card-accent-success" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Baris Produk</h2>
            <button
              type="button"
              onClick={handleAddLine}
              className="btn btn-secondary btn-sm"
              disabled={!customerId || activeProducts.length === 0 || submitting}
            >
              <Plus size={16} /> Tambah Barang
            </button>
          </div>

          {!customerId ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
              Silakan pilih pelanggan terlebih dahulu untuk memuat diskon cascading mereka.
            </div>
          ) : activeProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
              Belum ada produk terdaftar di database.
            </div>
          ) : lines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
              Klik tombol 'Tambah Barang' untuk menyusun daftar pesanan.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.5fr 1.5fr 1.5fr 1.5fr auto', gap: '0.75rem', padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
                <span>Pilih Produk</span>
                <span>Tipe</span>
                <span style={{ textAlign: 'right' }}>Harga Base</span>
                <span>Diskon Profil</span>
                <span style={{ textAlign: 'right' }}>Harga Bersih</span>
                <span style={{ textAlign: 'right' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Subtotal</span>
                <span></span>
              </div>
              
              {calculatedLines.map((line, idx) => (
                <div key={idx} className="tx-line-item" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2.5fr 1fr 1.5fr 1.5fr 1.5fr 1.5fr auto', 
                  gap: '0.75rem', 
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <select
                    value={line.productId}
                    onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                    required
                    disabled={submitting}
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <div>
                    <span className={`badge ${line.type === 'LM' ? 'badge-primary' : 'badge-info'}`}>
                      {line.type}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.95rem' }}>
                    {formatIDR(line.priceBase)}
                  </div>

                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                      {line.discounts && line.discounts.map((d, i) => (
                        <span key={i} style={{ background: 'var(--bg-primary)', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '2px' }}>
                          {d}%
                        </span>
                      ))}
                      {(!line.discounts || line.discounts.length === 0) && '-'}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.95rem', fontWeight: '500' }}>
                    {formatIDR(line.priceDiscounted)}
                  </div>

                  <input
                    type="number"
                    value={line.qty}
                    onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                    min="1"
                    required
                    disabled={submitting}
                    style={{ textAlign: 'right' }}
                  />

                  <div style={{ textAlign: 'right', fontSize: '0.95rem', fontWeight: '700' }}>
                    {formatIDR(line.total)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.35rem', color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    disabled={submitting}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM TOTAL SUMMARY BOX */}
        {lines.length > 0 && customerId && (
          <div className="glass-card card-accent-warning" style={{ display: 'flex', justifyContent: 'flex-end', gap: '3rem', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Subtotal Omzet:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{formatIDR(totalOmzet)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ongkir:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{formatIDR(ongkir)}</div>
              </div>
              <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Tagihan (Piutang):</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--warning-color)' }}>{formatIDR(totalOwed)}</div>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '1rem 2rem', fontSize: '1rem' }} disabled={submitting}>
              <Save size={18} /> {submitting ? 'Menyimpan...' : editTxId ? 'Perbarui Nota' : 'Simpan Transaksi'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
