import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Lock, User, AlertTriangle, Shield, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function Login() {
  const { login } = useDatabase();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Username/Email dan Password wajib diisi.');
      setLoading(false);
      return;
    }

    // Map username to email format for Supabase Auth if needed
    let email = username.trim();
    if (!email.includes('@')) {
      email = `${email.toLowerCase()}@hl.com`;
    }

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error);
      }
    } catch (e) {
      setError('Gagal menghubungkan ke server autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="login-container">
        {/* LEFT GRAPHIC PANEL */}
        <div className="login-graphic">
          <div className="login-graphic-logo">
            <Shield size={24} />
            <span>HL Internal Finance</span>
          </div>

          <div className="login-graphic-content">
            <h1 className="login-graphic-title">Sistem Keuangan Internal HL</h1>
            <p className="login-graphic-subtitle">
              Kelola data pelanggan, diskon bertingkat (LM & BR), bonus omzet lunas, dan pembukuan piutang secara real-time.
            </p>

            <div className="login-feature-list">
              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <CheckCircle size={18} />
                </div>
                <div className="login-feature-text">
                  <strong>Akurasi Diskon Cascading</strong>
                  <span>Diskon LM & BR bertingkat dihitung otomatis tanpa kalkulator manual.</span>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <CheckCircle size={18} />
                </div>
                <div className="login-feature-text">
                  <strong>Akumulasi Bonus Omzet</strong>
                  <span>Batasan kelayakan bonus terintegrasi langsung dengan status lunas transaksi.</span>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon">
                  <CheckCircle size={18} />
                </div>
                <div className="login-feature-text">
                  <strong>Keamanan & Integrasi Cloud</strong>
                  <span>Terkoneksi langsung ke Supabase Cloud untuk perlindungan data maksimal.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="login-graphic-footer">
            Copyright &copy; 2026 HL. All rights reserved.
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="login-form-pane">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
              Selamat Datang
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Silakan masukkan kredensial untuk mengakses aplikasi.
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: 'var(--danger-glow)',
              border: '1px solid rgba(220, 38, 38, 0.15)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.5rem',
              color: 'var(--danger-color)',
              fontSize: '0.88rem',
              fontWeight: '500'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="username" style={{ fontWeight: '600' }}>Username atau Email</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin@hl.com"
                  style={{ paddingLeft: '2.5rem', height: '44px', fontSize: '1rem' }}
                  autoComplete="off"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" style={{ fontWeight: '600' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', height: '44px', fontSize: '1rem' }}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                marginTop: '0.5rem',
                gap: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-auth" style={{
                    display: 'inline-block',
                    width: '18px',
                    height: '18px',
                    border: '2.5px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  <span>Menghubungkan...</span>
                </>
              ) : (
                'Masuk ke Aplikasi'
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
