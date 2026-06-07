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
  const [currentWizardStep, setCurrentWizardStep] = useState(1);
  const [wizardError, setWizardError] = useState('');

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
    setWizardError('');
    setCurrentWizardStep(1);
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

  const validateStep = (step) => {
    setWizardError('');
    if (step === 1) {
      if (!customerId) {
        setWizardError('Silakan pilih pelanggan terlebih dahulu.');
        return false;
      }
      if (!bonNo.trim()) {
        setWizardError('Nomor Bon tidak boleh kosong.');
        return false;
      }
      if (isBonus) {
        const count = Number(bonusCount);
        if (isNaN(count) || count < 1) {
          setWizardError('Jumlah bonus dikonsumsi minimal 1.');
          return false;
        }
      }
    } else if (step === 2) {
      const ongkirVal = Number(ongkir);
      if (isNaN(ongkirVal) || ongkirVal < 0) {
        setWizardError('Ongkos kirim tidak boleh kurang dari 0.');
        return false;
      }
      if (status === 'Lunas' && !paymentDate) {
        setWizardError('Tanggal pelunasan wajib diisi jika status Lunas.');
        return false;
      }
    } else if (step === 3) {
      if (lines.length === 0) {
        setWizardError('Daftar barang kosong. Silakan tambah minimal 1 barang.');
        return false;
      }
      const hasInvalidQty = lines.some((l) => Number(l.qty) < 1);
      if (hasInvalidQty) {
        setWizardError('Kuantitas produk tidak boleh kurang dari 1.');
        return false;
      }
    }
    return true;
  };

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

      {/* WIZARD PROGRESS BAR STEPPER */}
      <div className="wizard-stepper-container">
        <div className="wizard-progress-bar-bg"></div>
        <div className="wizard-progress-bar-fill" style={{ width: `${((currentWizardStep - 1) / 3) * 100}%` }}></div>
        <div className="wizard-stepper">
          {[
            { step: 1, label: 'Pelanggan & Nota' },
            { step: 2, label: 'Status & Ongkir' },
            { step: 3, label: 'Daftar Barang' },
            { step: 4, label: 'Selesaikan Nota' }
          ].map((n) => {
            const isActive = currentWizardStep === n.step;
            const isCompleted = currentWizardStep > n.step;
            return (
              <div key={n.step} className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="step-node-circle">
                  {isCompleted ? '✓' : n.step}
                </div>
                <span className="step-node-label">{n.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* STEP 1: PILIH PELANGGAN & INFO NOTA */}
        {currentWizardStep === 1 && (
          <div className="form-step-container">
            <div className="form-step-badge">1</div>
            <div className="form-step-content">
              <div className="glass-card card-accent-indigo" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h2>Langkah 1: Pilih Pelanggan & Info Nota</h2>

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
            </div>
          </div>
        )}

        {/* STEP 2: METODE PEMBAYARAN & ONGKIR */}
        {currentWizardStep === 2 && (
          <div className="form-step-container">
            <div className="form-step-badge" style={{ backgroundColor: 'var(--accent-color)' }}>2</div>
            <div className="form-step-content">
              <div className="glass-card card-accent-accent" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h2>Langkah 2: Pengiriman & Status Pembayaran</h2>

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
          </div>
        )}

        {/* STEP 3: MASUKKAN DAFTAR BARANG */}
        {currentWizardStep === 3 && (
          <div className="form-step-container">
            <div className="form-step-badge" style={{ backgroundColor: 'var(--success-color)' }}>3</div>
            <div className="form-step-content">
              <div className="glass-card card-accent-success">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2>Langkah 3: Masukkan Daftar Barang</h2>
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
                    Silakan pilih pelanggan terlebih dahulu di Langkah 1 untuk memuat diskon cascading mereka.
                  </div>
                ) : activeProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                    Belum ada produk terdaftar di database.
                  </div>
                ) : lines.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
                    Klik tombol 'Tambah Barang' di atas untuk menyusun daftar pesanan.
                  </div>
                ) : (
                  <div className="table-wrapper table-responsive-cards" style={{ display: 'flex', flexDirection: 'column' }}>
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
            </div>
          </div>
        )}

        {/* STEP 4: TOTAL & SAVE */}
        {currentWizardStep === 4 && (
          <div className="form-step-container">
            <div className="form-step-badge" style={{ backgroundColor: 'var(--warning-color)' }}>4</div>
            <div className="form-step-content">
              <div className="glass-card card-accent-warning">
                <h2>Langkah 4: Selesaikan Nota</h2>
                
                {!customerId || lines.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
                    Silakan pilih pelanggan dan tambahkan produk terlebih dahulu untuk menyelesaikan nota.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                      <div style={{ minWidth: '150px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Subtotal Omzet:</span>
                        <div style={{ fontSize: '1.35rem', fontWeight: '600' }}>{formatIDR(totalOmzet)}</div>
                      </div>
                      <div style={{ minWidth: '150px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Ongkos Kirim:</span>
                        <div style={{ fontSize: '1.35rem', fontWeight: '600' }}>{formatIDR(ongkir)}</div>
                      </div>
                      <div style={{ minWidth: '200px', borderLeft: '2px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Total Tagihan (Piutang):</span>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--warning-color)' }}>{formatIDR(totalOwed)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEPPER WARNING */}
        {wizardError && (
          <div className="wizard-validation-warning" style={{ marginTop: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{wizardError}</span>
          </div>
        )}

        {/* STEPPER NAVIGATION FOOTER BAR */}
        <div className="wizard-footer">
          {currentWizardStep > 1 ? (
            <button
              key={`btn-back-${currentWizardStep}`}
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setWizardError('');
                setCurrentWizardStep(currentWizardStep - 1);
              }}
              disabled={submitting}
            >
              Kembali
            </button>
          ) : (
            <div key="btn-back-placeholder" />
          )}

          {currentWizardStep < 4 ? (
            <button
              key={`btn-next-${currentWizardStep}`}
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (validateStep(currentWizardStep)) {
                  setWizardError('');
                  setCurrentWizardStep(currentWizardStep + 1);
                }
              }}
              disabled={submitting}
            >
              Lanjut ke Langkah {currentWizardStep + 1}
            </button>
          ) : (
            <button 
              key="btn-save-submit"
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }} 
              disabled={submitting || !customerId || lines.length === 0}
            >
              <Save size={20} />
              {submitting ? 'Menyimpan...' : editTxId ? 'Simpan Perubahan Nota' : 'Simpan Transaksi Baru'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
