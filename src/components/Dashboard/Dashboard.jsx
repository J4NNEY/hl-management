import React from 'react';
import { useDatabase, formatIDR } from '../../context/DatabaseContext';
import { 
  TrendingUp, 
  DollarSign, 
  Download, 
  Clock, 
  Award,
  CheckCircle2,
  Activity,
  ArrowUpRight
} from 'lucide-react';

export default function Dashboard({ setCurrentTab, setSelectedCustomerId }) {
  const { 
    customers, 
    transactions, 
    getCustomerBonusStats 
  } = useDatabase();

  // 1. CALCULATE DASHBOARD STATS
  const lunasTransactions = transactions.filter((t) => t.status === 'Lunas');
  const piutangTransactions = transactions.filter((t) => t.status === 'Piutang');

  const totalOmzetLunas = lunasTransactions.reduce((sum, t) => {
    return sum + t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0);
  }, 0);

  const totalLabaLunas = lunasTransactions.reduce((sum, t) => {
    return sum + t.lines.reduce((lSum, l) => lSum + l.lineLaba, 0);
  }, 0);

  const totalPiutang = piutangTransactions.reduce((sum, t) => {
    const txOmzet = t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0);
    return sum + txOmzet + t.ongkir;
  }, 0);

  const totalPaid = lunasTransactions.reduce((sum, t) => {
    const txOmzet = t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0);
    return sum + txOmzet + t.ongkir;
  }, 0);

  // 2. RETRIEVE CUSTOMERS WITH ACTIVE HISTORY OR ELIGIBLE FOR BONUSES
  const customersWithBonuses = customers
    .filter(c => !c.deleted)
    .map(c => {
      const stats = getCustomerBonusStats(c.id);
      return { customer: c, ...stats };
    })
    .filter(stat => stat.bonusesAvailable > 0 || (stat.accumulatedPaidOmzet > 0));

  // Sort: show customers with available bonuses first
  const sortedBonusStats = [...customersWithBonuses].sort((a, b) => {
    if (a.bonusesAvailable > 0 && b.bonusesAvailable === 0) return -1;
    if (a.bonusesAvailable === 0 && b.bonusesAvailable > 0) return 1;
    return b.accumulatedPaidOmzet - a.accumulatedPaidOmzet;
  });

  const handleExportBackup = () => {
    const data = {
      customers,
      transactions,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hl_cloud_dump_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. TIME-OF-DAY GREETING
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      {/* HEADER WITH GREETING */}
      <div className="page-header">
        <div>
          <p className="page-header-greeting">{greeting} 👋 — {dateStr}</p>
          <h1>Dashboard</h1>
          <p className="page-description" style={{ marginBottom: 0 }}>Tinjauan keuangan dan operasional bisnis HL Anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }} className="no-print">
          <button onClick={handleExportBackup} className="btn btn-secondary btn-sm">
            <Download size={16} /> Ekspor Data
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
        <div className="glass-card stat-card card-accent-success">
          <div className="stat-info">
            <span className="stat-label">Omzet Lunas</span>
            <span className="stat-value success">{formatIDR(totalOmzetLunas)}</span>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <Activity size={11} /> Mengecualikan ongkir
            </span>
          </div>
          <div className="stat-icon-wrapper success">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="glass-card stat-card card-accent-accent">
          <div className="stat-info">
            <span className="stat-label">Laba HL Bersih</span>
            <span className="stat-value accent">{formatIDR(totalLabaLunas)}</span>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <Activity size={11} /> Hanya dari lunas
            </span>
          </div>
          <div className="stat-icon-wrapper accent">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="glass-card stat-card card-accent-danger">
          <div className="stat-info">
            <span className="stat-label">Piutang Outstanding</span>
            <span className="stat-value danger">{formatIDR(totalPiutang)}</span>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <Clock size={11} /> {piutangTransactions.length} transaksi terbuka
            </span>
          </div>
          <div className="stat-icon-wrapper danger">
            <Clock size={22} />
          </div>
        </div>

        <div className="glass-card stat-card card-accent-warning">
          <div className="stat-info">
            <span className="stat-label">Total Dibayar</span>
            <span className="stat-value warning">{formatIDR(totalPaid)}</span>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <CheckCircle2 size={11} /> {lunasTransactions.length} transaksi lunas
            </span>
          </div>
          <div className="stat-icon-wrapper warning">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* BONUS PROGRESS TRACKER LIST (AC-Custom visual overhaul) */}
      {sortedBonusStats.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }} className="no-print">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1.5rem 0' }}>
            <Award size={24} style={{ color: 'var(--warning-color)' }} /> 
            Pelacakan Bonus Pelanggan
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sortedBonusStats.map((item) => {
              const currentCarryover = item.accumulatedPaidOmzet % item.threshold;
              const percent = Math.min(100, Math.floor((currentCarryover / item.threshold) * 100));

              return (
                <div key={item.customer.id} className="glass-card" style={{ 
                  padding: '1.5rem',
                  borderLeft: item.bonusesAvailable > 0 ? '4px solid var(--warning-color)' : '1px solid var(--border-color)',
                  background: item.bonusesAvailable > 0 ? 'var(--warning-bg)' : 'var(--bg-card)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <strong style={{ fontSize: '1.15rem' }}>{item.customer.name}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Total Omzet Lunas: {formatIDR(item.accumulatedPaidOmzet)} | Batas Threshold: {formatIDR(item.threshold)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {item.bonusesAvailable > 0 ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
                          {item.bonusesAvailable} Bonus Klaim
                        </span>
                      ) : (
                        <span className="badge badge-info" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          Akumulasi Berjalan
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCustomerId(item.customer.id);
                          setCurrentTab('customers');
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Buka Buku Besar
                      </button>
                    </div>
                  </div>

                  {/* VISUAL PROGRESS BAR ACCUMULATOR */}
                  <div style={{ marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      <span>Menuju Bonus Berikutnya</span>
                      <strong>{percent}% ({formatIDR(currentCarryover)} / {formatIDR(item.threshold)})</strong>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADDITIONAL GUIDE BOXES */}
      <div className="grid-2">
        <div className="glass-card">
          <h2>Aturan Dasar Akuntansi HL</h2>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
            <li>
              <strong>Cash Basis</strong>: Omzet, keuntungan (Laba HL), dan akumulasi kelayakan bonus pelanggan hanya dihitung jika status transaksi sudah <strong>Lunas</strong>.
            </li>
            <li>
              <strong>Ongkir (Biang Kirim)</strong>: Merupakan <em>pass-through</em> (dibebankan ke pelanggan) dan tidak memengaruhi perhitungan keuntungan (Laba HL).
            </li>
            <li>
              <strong>Diskon Bertingkat (Cascading)</strong>: Diskon dihitung secara sekuensial (contoh: 20%, 20%, 10% memberikan diskon efektif sebesar 42.4%, bukan dijumlahkan menjadi 50%).
            </li>
            <li>
              <strong>Transaksi Bonus</strong>: Transaksi yang ditandai sebagai bonus memberikan harga barang gratis (Rp 0), tidak menaikkan omzet, dan biaya modal barang bonus diabaikan (tidak memotong laba).
            </li>
          </ul>
        </div>

        <div className="glass-card">
          <h2>Statistik Sistem Cloud</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Pelanggan Aktif</span>
              <strong>{customers.filter(c => !c.deleted).length} pelanggan</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Transaksi Tercatat</span>
              <strong>{transactions.length} bon</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Transaksi Piutang (Outstanding)</span>
              <strong style={{ color: 'var(--danger-color)' }}>{transactions.filter(t => t.status === 'Piutang').length} bon</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status Koneksi Database</span>
              <span className="badge badge-success">Terhubung Cloud</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
