import React, { useState } from 'react';
import { useDatabase, formatIDR } from '../../context/DatabaseContext';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle, 
  FileText, 
  Printer, 
  X,
  Award
} from 'lucide-react';

export default function CustomerDetail({ customerId, onBack }) {
  const { 
    customers, 
    transactions, 
    settleSingleTransaction, 
    settleMonthTransactions, 
    getCustomerBonusStats 
  } = useDatabase();

  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeTxDetail, setActiveTxDetail] = useState(null);
  
  // Modals & Async States
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleType, setSettleType] = useState('single');
  const [settleTxId, setSettleTxId] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [settling, setSettling] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Pelanggan tidak ditemukan.</p>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Kembali
        </button>
      </div>
    );
  }

  // 1. GET ALL TRANSACTIONS FOR THIS CUSTOMER
  const customerTxs = transactions.filter((t) => t.customerId === customerId);

  // 2. EXTRACT AVAILABLE MONTHS FROM TRANSACTIONS FOR TABS (e.g. YYYY-MM)
  const monthsSet = new Set(customerTxs.map((t) => t.date.substring(0, 7)));
  const availableMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

  // Set default active month if not set
  if (availableMonths.length > 0 && !selectedMonth) {
    setSelectedMonth(availableMonths[0]);
  }

  // 3. FILTER TRANSACTIONS BY ACTIVE MONTH
  const activeMonthTxs = customerTxs.filter((t) => t.date.substring(0, 7) === selectedMonth);

  // 4. CALCULATE LEDGER STATS FOR ACTIVE MONTH
  const activeMonthStats = activeMonthTxs.reduce((stats, t) => {
    const txOmzet = t.lines.reduce((sum, l) => sum + l.lineOmzet, 0);
    const txLaba = t.lines.reduce((sum, l) => sum + l.lineLaba, 0);
    const txAmountOwed = txOmzet + t.ongkir;

    if (t.status === 'Lunas') {
      stats.totalPaid += txAmountOwed;
      stats.totalOmzet += txOmzet;
      stats.totalLaba += txLaba;

      t.lines.forEach((l) => {
        if (l.type === 'LM') stats.totalOmzetLM += l.lineOmzet;
        else if (l.type === 'BR') stats.totalOmzetBR += l.lineOmzet;
      });
    } else {
      stats.totalPiutang += txAmountOwed;
    }

    return stats;
  }, {
    totalPiutang: 0,
    totalPaid: 0,
    totalOmzet: 0,
    totalOmzetLM: 0,
    totalOmzetBR: 0,
    totalLaba: 0,
  });

  // 5. BONUS STATS
  const bonusStats = getCustomerBonusStats(customerId);

  // 6. TRIGGER SETTLEMENT MODAL FLOW
  const openSettleSingle = (txId) => {
    setSettleType('single');
    setSettleTxId(txId);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowSettleModal(true);
  };

  const openSettleMonth = () => {
    setSettleType('month');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowSettleModal(true);
  };

  const handleSettleConfirm = async (e) => {
    e.preventDefault();
    setSettling(true);
    try {
      if (settleType === 'single') {
        await settleSingleTransaction(settleTxId, paymentDate);
        if (activeTxDetail && activeTxDetail.id === settleTxId) {
          setActiveTxDetail({
            ...activeTxDetail,
            status: 'Lunas',
            paymentDate: paymentDate,
          });
        }
      } else {
        await settleMonthTransactions(customerId, selectedMonth, paymentDate);
      }
      setShowSettleModal(false);
    } catch (err) {
      alert('Gagal memproses pelunasan: ' + err.message);
    } finally {
      setSettling(false);
    }
  };

  const formatMonthLabel = (ym) => {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  return (
    <div>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} className="btn btn-secondary btn-sm" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>Buku Besar: {customer.name}</h1>
            <p className="page-description">Ringkasan piutang, omzet, laba, dan kelayakan bonus.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => window.print()} className="btn btn-secondary">
            <Printer size={18} /> Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER BLOCK */}
      <div className="print-only print-header">
        <h1 style={{ color: 'black', textAlign: 'center', fontSize: '20pt', margin: 0 }}>LAPORAN BUKU BESAR BULANAN</h1>
        <p style={{ color: 'black', textAlign: 'center', margin: '5px 0 20px 0' }}>HL Sales & Receivables Management App</p>
        
        <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ border: 'none', padding: '4px 0', width: '20%' }}><strong>Pelanggan:</strong></td>
              <td style={{ border: 'none', padding: '4px 0' }}>{customer.name}</td>
              <td style={{ border: 'none', padding: '4px 0', width: '20%' }}><strong>Periode Laporan:</strong></td>
              <td style={{ border: 'none', padding: '4px 0' }}>{selectedMonth ? formatMonthLabel(selectedMonth) : 'Semua Periode'}</td>
            </tr>
            <tr>
              <td style={{ border: 'none', padding: '4px 0' }}><strong>Batas Bonus:</strong></td>
              <td style={{ border: 'none', padding: '4px 0' }}>{formatIDR(customer.threshold)}</td>
              <td style={{ border: 'none', padding: '4px 0' }}><strong>Status Cetak:</strong></td>
              <td style={{ border: 'none', padding: '4px 0' }}>{new Date().toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 1. BONUS INFORMATION STACK (AC-5) */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="glass-card stat-card" style={{ 
          borderLeft: bonusStats.bonusesAvailable > 0 ? '4px solid var(--warning-color)' : '1px solid var(--border-color)',
          background: bonusStats.bonusesAvailable > 0 ? 'var(--warning-bg)' : 'var(--bg-card)'
        }}>
          <div className="stat-info">
            <span className="stat-label">Akumulasi Omzet Lunas</span>
            <span className="stat-value warning">{formatIDR(bonusStats.accumulatedPaidOmzet)}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              (Kelipatan {formatIDR(bonusStats.threshold)} = 1 Bonus)
            </span>
          </div>
          <div className="stat-icon-wrapper warning">
            <Award size={24} />
          </div>
        </div>

        <div className="glass-card stat-card" style={{ 
          borderLeft: bonusStats.bonusesAvailable > 0 ? '4px solid var(--warning-color)' : '1px solid var(--border-color)',
          background: bonusStats.bonusesAvailable > 0 ? 'var(--warning-bg)' : 'var(--bg-card)'
        }}>
          <div className="stat-info">
            <span className="stat-label">Kelayakan Bonus Saat Ini</span>
            <span className="stat-value warning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {bonusStats.bonusesAvailable} Tersedia
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Telah Digunakan: {bonusStats.bonusesGranted} | Total Didapat: {bonusStats.bonusesEarned}
            </span>
          </div>
          <div className="stat-icon-wrapper" style={{ 
            backgroundColor: bonusStats.bonusesAvailable > 0 ? 'var(--warning-color)' : 'rgba(245, 158, 11, 0.15)',
            color: bonusStats.bonusesAvailable > 0 ? '#000' : 'var(--warning-color)',
            width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* MONTH TABS */}
      {availableMonths.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Belum ada transaksi tercatat untuk pelanggan ini di cloud.
        </div>
      ) : (
        <>
          <div className="ledger-months no-print">
            {availableMonths.map((ym) => (
              <button
                key={ym}
                className={`ledger-month-tab ${selectedMonth === ym ? 'active' : ''}`}
                onClick={() => setSelectedMonth(ym)}
              >
                <Calendar size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                {formatMonthLabel(ym)}
              </button>
            ))}
          </div>

          {/* ACTIVE MONTH FINANCIAL SUMMARY */}
          <div className="grid-4" style={{ marginBottom: '2rem' }}>
            <div className="glass-card stat-card card-accent-danger" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label">Piutang Bulan Ini</span>
                <span className="stat-value danger">{formatIDR(activeMonthStats.totalPiutang)}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Belum lunas (omzet+ongkir)</span>
              </div>
              <div className="stat-icon-wrapper danger">
                <FileText size={20} />
              </div>
            </div>

            <div className="glass-card stat-card card-accent-success" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label">Sudah Dibayar</span>
                <span className="stat-value success">{formatIDR(activeMonthStats.totalPaid)}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lunas (omzet+ongkir)</span>
              </div>
              <div className="stat-icon-wrapper success">
                <CheckCircle size={20} />
              </div>
            </div>

            <div className="glass-card stat-card card-accent-warning" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label">Omzet Lunas (LM / BR)</span>
                <span className="stat-value warning" style={{ fontSize: '1.4rem' }}>
                  {formatIDR(activeMonthStats.totalOmzet)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  LM: {formatIDR(activeMonthStats.totalOmzetLM)} | BR: {formatIDR(activeMonthStats.totalOmzetBR)}
                </span>
              </div>
              <div className="stat-icon-wrapper warning">
                <Award size={20} />
              </div>
            </div>

            <div className="glass-card stat-card card-accent-accent" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label">Laba HL Lunas</span>
                <span className="stat-value accent">{formatIDR(activeMonthStats.totalLaba)}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mengecualikan ongkir</span>
              </div>
              <div className="stat-icon-wrapper accent">
                <Award size={20} style={{ color: 'var(--accent-color)' }} />
              </div>
            </div>
          </div>

          {/* MONTH ACTION & TRANSACTION LIST */}
          <div className="glass-card card-accent-indigo" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ margin: 0 }}>Daftar Transaksi — {formatMonthLabel(selectedMonth)}</h2>
              
              {activeMonthStats.totalPiutang > 0 && (
                <button onClick={openSettleMonth} className="btn btn-success btn-sm no-print">
                  <CheckCircle size={15} /> Selesaikan Bulan Ini (Sudah Lunas)
                </button>
              )}
            </div>

            <div className="table-wrapper table-responsive-cards">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Nomor Bon</th>
                    <th>Status</th>
                    <th>Omzet (Lunas)</th>
                    <th>Ongkir</th>
                    <th>Total Tagihan</th>
                    <th style={{ textAlign: 'right' }} className="no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMonthTxs.map((t) => {
                    const txOmzet = t.lines.reduce((sum, l) => sum + l.lineOmzet, 0);
                    const txTotal = txOmzet + t.ongkir;

                    return (
                      <tr key={t.id} style={{ opacity: t.isBonus ? 0.75 : 1 }}>
                        <td data-label="Tanggal">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                            {t.date}
                          </span>
                        </td>
                        <td data-label="Nomor Bon">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                            <strong>{t.bonNo}</strong>
                            {t.isBonus && (
                              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                                Bonus ({t.bonusCount || 1})
                              </span>
                            )}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${t.status === 'Lunas' ? 'badge-success' : 'badge-danger'}`}>
                            {t.status}
                          </span>
                          {t.status === 'Lunas' && t.paymentDate && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                              Bayar: {t.paymentDate}
                            </span>
                          )}
                        </td>
                        <td data-label="Omzet (Lunas)">
                          {t.isBonus ? (
                            <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatIDR(0)}</span>
                          ) : (
                            formatIDR(txOmzet)
                          )}
                        </td>
                        <td data-label="Ongkir">{formatIDR(t.ongkir)}</td>
                        <td data-label="Total Tagihan"><strong>{formatIDR(txTotal)}</strong></td>
                        <td className="no-print">
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setActiveTxDetail(t)}
                              className="btn btn-secondary btn-sm"
                            >
                              <FileText size={14} /> Detail
                            </button>
                            {t.status === 'Piutang' && (
                              <button
                                onClick={() => openSettleSingle(t.id)}
                                className="btn btn-success btn-sm"
                              >
                                <CheckCircle size={14} /> Lunas
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* PRINT-ONLY SUMMARY TABLE */}
      {selectedMonth && (
        <div className="print-only print-summary">
          <div className="print-summary-item"><strong>Piutang Belum Lunas:</strong> {formatIDR(activeMonthStats.totalPiutang)}</div>
          <div className="print-summary-item"><strong>Total Sudah Dibayar:</strong> {formatIDR(activeMonthStats.totalPaid)}</div>
          <div className="print-summary-item"><strong>Total Omzet Lunas:</strong> {formatIDR(activeMonthStats.totalOmzet)}</div>
          <div className="print-summary-item"><strong>Laba HL Lunas:</strong> {formatIDR(activeMonthStats.totalLaba)}</div>
          <div className="print-summary-item" style={{ gridColumn: 'span 2', fontSize: '10pt', marginTop: '10px', color: '#555' }}>
            * Breakdown Omzet Lunas: LM = {formatIDR(activeMonthStats.totalOmzetLM)} | BR = {formatIDR(activeMonthStats.totalOmzetBR)}
          </div>
        </div>
      )}

      {/* TRANSACTION DETAIL MODAL */}
      {activeTxDetail && (
        <div className="modal-overlay no-print-layout">
          <div className="glass-card modal-content wide">
            <div className="modal-header">
              <h2>Detail Nota: {activeTxDetail.bonNo}</h2>
              <button onClick={() => setActiveTxDetail(null)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }} className="grid-2">
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tanggal Transaksi</p>
                <strong>{activeTxDetail.date}</strong>
                {activeTxDetail.paymentDate && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tanggal Pelunasan</p>
                    <strong style={{ color: 'var(--success-color)' }}>{activeTxDetail.paymentDate}</strong>
                  </div>
                )}
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Status Pembayaran</p>
                <span className={`badge ${activeTxDetail.status === 'Lunas' ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: '0.25rem' }}>
                  {activeTxDetail.status}
                </span>
                {activeTxDetail.isBonus && (
                  <span className="badge badge-warning" style={{ marginLeft: '0.5rem', marginTop: '0.25rem' }}>
                    BONUS ({activeTxDetail.bonusCount || 1})
                  </span>
                )}
              </div>
            </div>

            <h3>Rincian Barang</h3>
            <div className="table-wrapper table-responsive-cards" style={{ marginBottom: '1.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nama Produk</th>
                    <th>Tipe</th>
                    <th style={{ textAlign: 'right' }}>Harga Base</th>
                    <th>Diskon Cascading</th>
                    <th style={{ textAlign: 'right' }}>Harga Diskon</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total Omzet</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTxDetail.lines.map((l, idx) => {
                    const prod = useDatabase().products.find(p => p.id === l.productId);
                    return (
                      <tr key={idx}>
                        <td data-label="Nama Produk">{prod?.name || 'Produk Dihapus'}</td>
                        <td data-label="Tipe">
                          <span className={`badge ${l.type === 'LM' ? 'badge-primary' : 'badge-info'}`}>
                            {l.type}
                          </span>
                        </td>
                        <td data-label="Harga Base" style={{ textAlign: 'right' }}>{formatIDR(l.priceBase)}</td>
                        <td data-label="Diskon Cascading">
                          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                            {l.discounts.map((d, i) => (
                              <span key={i} style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '2px 4px', border: '1px solid var(--border-color)', borderRadius: '2px' }}>
                                {d}%
                              </span>
                            ))}
                            {l.discounts.length === 0 && '-'}
                          </div>
                        </td>
                        <td data-label="Harga Diskon" style={{ textAlign: 'right' }}>
                          {activeTxDetail.isBonus ? formatIDR(0) : formatIDR(l.priceDiscounted)}
                        </td>
                        <td data-label="Qty" style={{ textAlign: 'right' }}>{l.qty}</td>
                        <td data-label="Total Omzet" style={{ textAlign: 'right' }}>
                          <strong>{formatIDR(l.lineOmzet)}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }} className="grid-2">
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Keterangan / Deskripsi</p>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', minHeight: '80px', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  {activeTxDetail.description || <span style={{ color: 'var(--text-muted)' }}>Tidak ada keterangan.</span>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Omzet:</span>
                  <strong>{formatIDR(activeTxDetail.lines.reduce((s, l) => s + l.lineOmzet, 0))}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Ongkos Kirim:</span>
                  <strong>{formatIDR(activeTxDetail.ongkir)}</strong>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                  <span style={{ fontWeight: '600' }}>Tagihan (Piutang):</span>
                  <strong style={{ color: 'var(--warning-color)' }}>
                    {formatIDR(activeTxDetail.lines.reduce((s, l) => s + l.lineOmzet, 0) + activeTxDetail.ongkir)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {activeTxDetail.status === 'Piutang' && (
                <button
                  onClick={() => {
                    openSettleSingle(activeTxDetail.id);
                  }}
                  className="btn btn-success"
                >
                  <CheckCircle size={16} /> Tandai Sudah Lunas
                </button>
              )}
              <button onClick={() => setActiveTxDetail(null)} className="btn btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTLEMENT DATE CONFIRMATION MODAL */}
      {showSettleModal && (
        <div className="modal-overlay no-print-layout">
          <div className="glass-card modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Konfirmasi Pembayaran</h2>
              <button onClick={() => !settling && setShowSettleModal(false)} className="modal-close-btn" disabled={settling}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSettleConfirm}>
              <div className="form-group">
                <label htmlFor="paymentDate">Tanggal Pelunasan *</label>
                <input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  disabled={settling}
                />
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                {settleType === 'single' ? (
                  <span>Tindakan ini akan menandai nota ini sebagai <strong>Lunas</strong> dengan tanggal pembayaran di atas.</span>
                ) : (
                  <span>Tindakan ini akan menandai <strong>SEMUA</strong> nota piutang di bulan {selectedMonth ? formatMonthLabel(selectedMonth) : ''} sebagai <strong>Lunas</strong>.</span>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowSettleModal(false)} className="btn btn-secondary" disabled={settling}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" disabled={settling}>
                  {settling ? 'Menyimpan...' : 'Konfirmasi Lunas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
