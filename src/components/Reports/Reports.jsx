import React, { useState } from 'react';
import { useDatabase, formatIDR } from '../../context/DatabaseContext';
import { BarChart3, Printer, Users, Package, Gift, Edit2, Trash2, Calendar, FileText, User } from 'lucide-react';

export default function Reports({ onEditTx }) {
  const { customers, products, transactions, deleteTransaction } = useDatabase();

  // 1. FILTER STATES
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [activeTab, setActiveTab] = useState('overall'); // 'overall', 'customers', 'products', 'bonus'

  // Available Years from transactions
  const yearsSet = new Set(transactions.map((t) => t.date.substring(0, 4)));
  if (yearsSet.size === 0) yearsSet.add(new Date().getFullYear().toString());
  const availableYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));

  const monthsList = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  // 2. FILTER TRANSACTIONS
  const filteredTxs = transactions.filter((t) => {
    const txYear = t.date.substring(0, 4);
    const txMonth = t.date.substring(5, 7);

    const yearMatch = txYear === selectedYear;
    const monthMatch = selectedMonth === 'all' || txMonth === selectedMonth;

    return yearMatch && monthMatch;
  });

  const lunasSales = filteredTxs.filter((t) => t.status === 'Lunas' && !t.isBonus);
  const piutangTxs = filteredTxs.filter((t) => t.status === 'Piutang');
  const lunasTxs = filteredTxs.filter((t) => t.status === 'Lunas');

  // 3. OVERALL RECAP CALCULATIONS
  const overallOmzet = lunasSales.reduce((sum, t) => sum + t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0), 0);
  const overallLaba = lunasSales.reduce((sum, t) => sum + t.lines.reduce((lSum, l) => lSum + l.lineLaba, 0), 0);
  const overallPiutang = piutangTxs.reduce((sum, t) => sum + t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0) + t.ongkir, 0);
  const overallPaid = lunasTxs.reduce((sum, t) => sum + t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0) + t.ongkir, 0);

  let overallLMOmzet = 0;
  let overallBROmzet = 0;
  lunasSales.forEach((t) => {
    t.lines.forEach((l) => {
      if (l.type === 'LM') overallLMOmzet += l.lineOmzet;
      else if (l.type === 'BR') overallBROmzet += l.lineOmzet;
    });
  });

  // 4. CUSTOMER RECAP CALCULATIONS
  const customerRecaps = customers.map((c) => {
    const custTxs = filteredTxs.filter((t) => t.customerId === c.id);
    const custLunasSales = custTxs.filter((t) => t.status === 'Lunas' && !t.isBonus);
    const custPiutang = custTxs.filter((t) => t.status === 'Piutang');
    const custLunas = custTxs.filter((t) => t.status === 'Lunas');

    const omzet = custLunasSales.reduce((sum, t) => sum + t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0), 0);
    const laba = custLunasSales.reduce((sum, t) => sum + t.lines.reduce((lSum, l) => lSum + l.lineLaba, 0), 0);
    const piutang = custPiutang.reduce((sum, t) => sum + t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0) + t.ongkir, 0);
    const paid = custLunas.reduce((sum, t) => sum + t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0) + t.ongkir, 0);

    return {
      id: c.id,
      name: c.name,
      omzet,
      laba,
      piutang,
      paid,
      isDeleted: c.deleted
    };
  }).filter(c => !c.isDeleted || (c.omzet > 0 || c.piutang > 0));

  // 5. PRODUCT TYPE RECAP CALCULATIONS
  const typeRecaps = [
    { type: 'LM', label: 'Tipe LM (Logam Mulia)', qty: 0, omzet: 0, laba: 0 },
    { type: 'BR', label: 'Tipe BR (Barang Rumah)', qty: 0, omzet: 0, laba: 0 },
  ];

  lunasSales.forEach((t) => {
    t.lines.forEach((l) => {
      const typeStat = typeRecaps.find((tr) => tr.type === l.type);
      if (typeStat) {
        typeStat.qty += l.qty;
        typeStat.omzet += l.lineOmzet;
        typeStat.laba += l.lineLaba;
      }
    });
  });

  // 6. BONUS LOGS
  const bonusLogs = filteredTxs.filter((t) => t.isBonus);

  const handleDeleteTx = async (id, bonNo) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus transaksi "${bonNo}"?`)) {
      try {
        await deleteTransaction(id);
      } catch (err) {
        alert('Gagal menghapus transaksi: ' + err.message);
      }
    }
  };

  const getMonthName = (val) => {
    const mObj = monthsList.find((m) => m.value === val);
    return mObj ? mObj.label : '';
  };

  return (
    <div>
      {/* HEADER & FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }} className="no-print">
        <div>
          <h1>Laporan & Rekapitulasi</h1>
          <p className="page-description">Analisis performa omzet lunas, laba bersih, piutang terhutang, dan distribusi bonus.</p>
        </div>
        <button onClick={() => window.print()} className="btn btn-secondary">
          <Printer size={18} /> Cetak Laporan (PDF)
        </button>
      </div>

      {/* FILTER BAR CONTAINER */}
      <div className="glass-card no-print" style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', padding: '1.25rem' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="repYear">Pilih Tahun</label>
          <select id="repYear" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="repMonth">Pilih Bulan</label>
          <select id="repMonth" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {monthsList.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="print-only print-header">
        <h1 style={{ color: 'black', textAlign: 'center', fontSize: '20pt', margin: 0 }}>LAPORAN REKAPITULASI PENJUALAN</h1>
        <p style={{ color: 'black', textAlign: 'center', margin: '5px 0 20px 0' }}>HL Internal Finance App</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', color: 'black', marginBottom: '20px' }}>
          <div><strong>Tahun:</strong> {selectedYear}</div>
          <div><strong>Bulan:</strong> {getMonthName(selectedMonth)}</div>
          <div><strong>Dicetak Pada:</strong> {new Date().toLocaleString('id-ID')}</div>
        </div>
      </div>

      {/* TABS HEADER */}
      <div className="tab-headers no-print" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div 
          className={`tab-header ${activeTab === 'overall' ? 'active' : ''}`}
          onClick={() => setActiveTab('overall')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <BarChart3 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Rekap Keseluruhan
        </div>
        <div 
          className={`tab-header ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Users size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Rekap Pelanggan
        </div>
        <div 
          className={`tab-header ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Package size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Rekap Tipe Produk
        </div>
        <div 
          className={`tab-header ${activeTab === 'bonus' ? 'active' : ''}`}
          onClick={() => setActiveTab('bonus')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Gift size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Log Bonus
        </div>
      </div>

      {/* TAB CONTENT: 1. OVERALL RECAP */}
      {(activeTab === 'overall' || window.matchMedia('print').matches) && (
        <div className="glass-card card-accent-indigo" style={{ marginBottom: '2rem', display: activeTab === 'overall' ? 'block' : 'none' }}>
          <h2>Rekap Keseluruhan — {getMonthName(selectedMonth)} {selectedYear}</h2>
          
          <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
            <div className="glass-card stat-card card-accent-success" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label">Total Omzet Lunas</span>
                <span className="stat-value success">{formatIDR(overallOmzet)}</span>
              </div>
              <div className="stat-icon-wrapper success">
                <BarChart3 size={20} />
              </div>
            </div>

            <div className="glass-card stat-card card-accent-accent" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label">Total Laba HL Lunas</span>
                <span className="stat-value accent">{formatIDR(overallLaba)}</span>
              </div>
              <div className="stat-icon-wrapper accent">
                <Gift size={20} style={{ color: 'var(--accent-color)' }} />
              </div>
            </div>

            <div className="glass-card stat-card card-accent-danger" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label">Total Piutang Outstanding</span>
                <span className="stat-value danger">{formatIDR(overallPiutang)}</span>
              </div>
              <div className="stat-icon-wrapper danger">
                <Users size={20} style={{ color: 'var(--danger-color)' }} />
              </div>
            </div>

            <div className="glass-card stat-card card-accent-warning" style={{ padding: '1.25rem' }}>
              <div className="stat-info">
                <span className="stat-label">Total Sudah Dibayar</span>
                <span className="stat-value warning">{formatIDR(overallPaid)}</span>
              </div>
              <div className="stat-icon-wrapper warning">
                <BarChart3 size={20} />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '1.5rem' }}>
            <h3 style={{ margin: 0, marginBottom: '1rem' }}>Rincian Pembagian Omzet Lunas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="grid-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tipe LM (Logam Mulia)</span>
                <strong>{formatIDR(overallLMOmzet)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tipe BR (Barang Rumah)</span>
                <strong>{formatIDR(overallBROmzet)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. CUSTOMER RECAP */}
      {(activeTab === 'customers' || window.matchMedia('print').matches) && (
        <div className="glass-card card-accent-indigo" style={{ marginBottom: '2rem', display: activeTab === 'customers' ? 'block' : 'none' }}>
          <h2>Rekap Per Pelanggan — {getMonthName(selectedMonth)} {selectedYear}</h2>

          <div className="table-wrapper table-responsive-cards">
            <table>
              <thead>
                <tr>
                  <th>Nama Pelanggan</th>
                  <th style={{ textAlign: 'right' }}>Omzet Lunas</th>
                  <th style={{ textAlign: 'right' }}>Laba HL Lunas</th>
                  <th style={{ textAlign: 'right' }}>Piutang</th>
                  <th style={{ textAlign: 'right' }}>Sudah Dibayar</th>
                </tr>
              </thead>
              <tbody>
                {customerRecaps.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Nama Pelanggan">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                        <strong>{c.name}</strong>
                      </span>
                      {c.isDeleted && <span className="badge badge-danger" style={{ fontSize: '0.6rem', marginLeft: '0.5rem' }}>Dihapus</span>}
                    </td>
                    <td data-label="Omzet Lunas" style={{ textAlign: 'right', color: 'var(--success-color)' }}>{formatIDR(c.omzet)}</td>
                    <td data-label="Laba HL Lunas" style={{ textAlign: 'right', color: 'var(--accent-color)' }}>{formatIDR(c.laba)}</td>
                    <td data-label="Piutang Outstanding" style={{ textAlign: 'right', color: 'var(--danger-color)' }}>{formatIDR(c.piutang)}</td>
                    <td data-label="Sudah Dibayar" style={{ textAlign: 'right', color: 'var(--warning-color)' }}>{formatIDR(c.paid)}</td>
                  </tr>
                ))}
                {customerRecaps.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada transaksi untuk periode ini.</td>
                  </tr>
                )}
              </tbody>
              {customerRecaps.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: '700', borderTop: '2px solid var(--text-muted)' }} className="no-print-layout">
                    <td>TOTAL KESELURUHAN</td>
                    <td style={{ textAlign: 'right', color: 'var(--success-color)' }}>{formatIDR(overallOmzet)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-color)' }}>{formatIDR(overallLaba)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger-color)' }}>{formatIDR(overallPiutang)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--warning-color)' }}>{formatIDR(overallPaid)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. PRODUCT TYPE RECAP */}
      {(activeTab === 'products' || window.matchMedia('print').matches) && (
        <div className="glass-card card-accent-indigo" style={{ marginBottom: '2rem', display: activeTab === 'products' ? 'block' : 'none' }}>
          <h2>Rekap Per Tipe Produk — {getMonthName(selectedMonth)} {selectedYear}</h2>

          <div className="table-wrapper table-responsive-cards">
            <table>
              <thead>
                <tr>
                  <th>Kategori Tipe</th>
                  <th style={{ textAlign: 'right' }}>Jumlah Terjual (Qty)</th>
                  <th style={{ textAlign: 'right' }}>Omzet Lunas</th>
                  <th style={{ textAlign: 'right' }}>Laba HL Lunas</th>
                </tr>
              </thead>
              <tbody>
                {typeRecaps.map((tr) => (
                  <tr key={tr.type}>
                    <td data-label="Kategori Tipe">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Package size={14} style={{ color: 'var(--text-muted)' }} />
                        <strong>{tr.label}</strong>
                      </span>
                    </td>
                    <td data-label="Jumlah Terjual" style={{ textAlign: 'right' }}>{tr.qty} pcs</td>
                    <td data-label="Omzet Lunas" style={{ textAlign: 'right', color: 'var(--success-color)' }}>{formatIDR(tr.omzet)}</td>
                    <td data-label="Laba HL Lunas" style={{ textAlign: 'right', color: 'var(--accent-color)' }}>{formatIDR(tr.laba)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: '700', borderTop: '2px solid var(--text-muted)' }} className="no-print-layout">
                  <td>TOTAL GABUNGAN</td>
                  <td style={{ textAlign: 'right' }}>{typeRecaps.reduce((s, tr) => s + tr.qty, 0)} pcs</td>
                  <td style={{ textAlign: 'right', color: 'var(--success-color)' }}>{formatIDR(overallOmzet)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-color)' }}>{formatIDR(overallLaba)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. BONUS LOGS */}
      {(activeTab === 'bonus' || window.matchMedia('print').matches) && (
        <div className="glass-card card-accent-warning" style={{ marginBottom: '2rem', display: activeTab === 'bonus' ? 'block' : 'none' }}>
          <h2>Log Transaksi Bonus — {getMonthName(selectedMonth)} {selectedYear}</h2>

          <div className="table-wrapper table-responsive-cards">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nomor Bon</th>
                  <th>Nama Pelanggan</th>
                  <th style={{ textAlign: 'right' }}>Bonus</th>
                  <th>Daftar Barang Bonus</th>
                  <th style={{ textAlign: 'right' }}>Ongkir</th>
                  <th style={{ textAlign: 'right' }} className="no-print">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bonusLogs.map((b) => {
                  const cust = customers.find(c => c.id === b.customerId);
                  return (
                    <tr key={b.id}>
                      <td data-label="Tanggal">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          {b.date}
                        </span>
                      </td>
                      <td data-label="Nomor Bon">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                          <strong>{b.bonNo}</strong>
                        </span>
                      </td>
                      <td data-label="Nama Pelanggan">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={14} style={{ color: 'var(--text-muted)' }} />
                          {cust?.name || 'Pelanggan Dihapus'}
                        </span>
                      </td>
                      <td data-label="Bonus Dikonsumsi" style={{ textAlign: 'right' }}>
                        <span className="badge badge-warning" style={{ fontWeight: '600' }}>
                          {b.bonusCount || 1} Bonus
                        </span>
                      </td>
                      <td data-label="Barang Bonus">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {b.lines.map((l, idx) => {
                            const p = products.find(prod => prod.id === l.productId);
                            return (
                              <span key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                - {p?.name} (Qty: {l.qty})
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td data-label="Ongkir Dibayar" style={{ textAlign: 'right' }}>{formatIDR(b.ongkir)}</td>
                      <td className="no-print">
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => onEditTx(b.id)}
                            className="btn btn-secondary btn-sm"
                            title="Edit"
                            style={{ color: 'var(--accent-color)', borderColor: 'rgba(6, 182, 212, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Edit2 size={13} />
                            <span>Ubah</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTx(b.id, b.bonNo)}
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
                  );
                })}
                {bonusLogs.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada penyerahan bonus dalam periode ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
