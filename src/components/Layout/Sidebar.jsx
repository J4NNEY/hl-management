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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, isOpen, onClose, onCollapse, isCollapsed }) {
  const { logout, currentUser } = useDatabase();

  const sections = [
    {
      title: 'Operasional',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'transactions', label: 'Transaksi Baru', icon: Receipt },
      ]
    },
    {
      title: 'Data Master',
      items: [
        { id: 'customers', label: 'Pelanggan', icon: Users },
        { id: 'products', label: 'Produk', icon: Package },
      ]
    },
    {
      title: 'Analisis',
      items: [
        { id: 'reports', label: 'Laporan & Rekap', icon: BarChart3 },
      ]
    }
  ];

  return (
    <div className={`sidebar no-print ${isOpen ? 'open' : ''}`}>
      {/* Toggle Collapse Button for Desktop - Absolutely Positioned */}
      <button 
        onClick={onCollapse}
        className="collapse-toggle-btn no-mobile"
        title={isCollapsed ? "Tampilkan Menu" : "Sembunyikan Menu"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="logo-text">HL Internal Finance</span>
          <span className="logo-text-collapsed">HL</span>
        </div>

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

      <div className="sidebar-menu-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexGrow: 1 }}>
        {sections.map((section, sIdx) => (
          <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {!isCollapsed && <div className="sidebar-section-title">{section.title}</div>}
            <ul className="sidebar-menu" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      className={`sidebar-item ${currentTab === item.id ? 'active' : ''}`}
                      data-tooltip={item.label}
                      onClick={() => {
                        setCurrentTab(item.id);
                        if (onClose) onClose(); // Auto-close drawer on select
                      }}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar-wrapper">
            <div className="user-avatar">
              <UserCheck size={16} color="#38bdf8" style={{ filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.5))' }} />
            </div>
            <div className="user-status-dot" />
          </div>
          <div className="user-info">
            <div className="user-name">Administrator</div>
            <div className="user-role">
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
          data-tooltip="Keluar"
          style={{
            color: '#f87171',
          }}
        >
          <LogOut />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
