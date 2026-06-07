import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Lock, User, AlertTriangle, Shield } from 'lucide-react';

export default function Login() {
  const { login } = useDatabase();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="glass-card modal-content" style={{
        maxWidth: '420px',
        padding: '2.5rem',
        position: 'relative',
        zIndex: 1,
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-xl), 0 0 0 1px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Brand Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'var(--primary-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 4px 12px rgba(15, 41, 66, 0.15)'
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: '800',
            color: '#0f172a',
            letterSpacing: '-0.5px',
            marginBottom: '0.25rem'
          }}>
            HL Sales App
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Cloud Management System
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid rgba(220, 38, 38, 0.15)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            color: 'var(--danger-color)',
            fontSize: '0.85rem'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div className="form-group">
            <label htmlFor="username">Username atau Email</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{
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
                placeholder="Masukkan username"
                style={{ paddingLeft: '2.5rem' }}
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              marginTop: '0.5rem',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Menghubungkan...
              </>
            ) : (
              'Masuk ke Aplikasi'
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '1.75rem',
          color: 'var(--text-muted)',
          fontSize: '0.72rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          letterSpacing: '0.02em'
        }}>
          Terkoneksi dengan Supabase Cloud
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
