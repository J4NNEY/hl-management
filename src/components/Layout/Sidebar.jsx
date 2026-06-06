import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Receipt, 
  BarChart3, 
  LogOut,
  UserCheck,
  X,
  ChevronLeft
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, isOpen, onClose, onCollapse }) {
  const { logout, currentUser } = useDatabase();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Pelanggan', icon: Users },
    { id: 'products', label: 'Produk', icon: Package },
    { id: 'transactions', label: 'Transaksi Baru', icon: Receipt },
    { id: 'reports', label: 'Laporan & Rekap', icon: BarChart3 },
  ];

  return (
    <div className={`sidebar no-print ${isOpen ? 'open' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '0.5rem' }}>
        <div className="sidebar-brand" style={{ margin: 0, textAlign: 'left', flexGrow: 1 }}>
          HL MANAGEMENT
        </div>
        
        {/* Toggle Collapse Button for Desktop */}
        <button 
          onClick={onCollapse}
          className="no-mobile"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 'var(--radius-sm)',
            transition: 'color var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          title="Sembunyikan Menu"
        >
          <ChevronLeft size={20} />
        </button>

        {isOpen && (
          <button 
            onClick={onClose}
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
            <X size={20} />
          </button>
        )}
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                className={`sidebar-item ${currentTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (onClose) onClose(); // Auto-close drawer on select
                }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          padding: '0.65rem 0.75rem',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--primary-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <UserCheck size={14} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#e2e8f0' }}>Administrator</div>
            <div style={{
              fontSize: '0.68rem',
              color: '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentUser?.email || 'Owner'}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            if (onClose) onClose();
          }}
          className="sidebar-item"
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            fontFamily: 'inherit',
            color: '#ef4444',
          }}
        >
          <LogOut />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
