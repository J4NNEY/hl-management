"use client";

import React, { useState, useEffect } from 'react';
import { DatabaseProvider, useDatabase } from '@/context/DatabaseContext';
import Login from '@/components/Auth/Login';
import Sidebar from '@/components/Layout/Sidebar';
import Dashboard from '@/components/Dashboard/Dashboard';
import CustomerList from '@/components/Customers/CustomerList';
import CustomerDetail from '@/components/Customers/CustomerDetail';
import ProductList from '@/components/Products/ProductList';
import TransactionForm from '@/components/Transactions/TransactionForm';
import Reports from '@/components/Reports/Reports';
import { Loader2, Menu, X } from 'lucide-react';

function PageContent() {
  const { isAuthenticated, loading } = useDatabase();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Navigation states
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [editTxId, setEditTxId] = useState(null);

  // Load sidebar collapsed state on mount
  useEffect(() => {
    const saved = localStorage.getItem('hl_sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('hl_sidebar_collapsed', String(nextVal));
  };

  // 1. Sleek loading screen while Supabase checks session and fetches tables
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        color: '#f8fafc',
        gap: '1.25rem'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '12px',
          background: 'var(--primary-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(15, 41, 66, 0.15)',
          marginBottom: '0.5rem'
        }}>
          <Loader2 size={28} style={{ 
            color: 'white',
            animation: 'spin 1.5s linear infinite'
          }} />
        </div>
        <div style={{ 
          fontSize: '1rem', 
          fontWeight: '500',
          letterSpacing: '0.5px',
          color: '#94a3b8'
        }}>
          Memuat Database HL Cloud...
        </div>

        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 2. Enforce login shield
  if (!isAuthenticated) {
    return <Login />;
  }

  const handleTabChange = (tab) => {
    if (tab !== 'customers') setSelectedCustomerId(null);
    if (tab !== 'transactions') setEditTxId(null);
    setCurrentTab(tab);
    setSidebarOpen(false); // Auto-close drawer on selection
  };

  // 3. Tab routing selector
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard 
            setCurrentTab={handleTabChange} 
            setSelectedCustomerId={(id) => {
              setSelectedCustomerId(id);
              setCurrentTab('customers');
            }} 
          />
        );
      case 'customers':
        if (selectedCustomerId) {
          return (
            <CustomerDetail 
              customerId={selectedCustomerId} 
              onBack={() => setSelectedCustomerId(null)} 
            />
          );
        }
        return (
          <CustomerList 
            onSelectCustomer={(id) => {
              setSelectedCustomerId(id);
            }} 
          />
        );
      case 'products':
        return <ProductList />;
      case 'transactions':
        return (
          <TransactionForm 
            editTxId={editTxId} 
            onSaveSuccess={() => {
              setEditTxId(null);
              setCurrentTab('dashboard');
            }} 
          />
        );
      case 'reports':
        return (
          <Reports 
            onEditTx={(txId) => {
              setEditTxId(txId);
              setCurrentTab('transactions');
            }} 
          />
        );
      default:
        return <Dashboard setCurrentTab={handleTabChange} />;
    }
  };

  return (
    <div className={`app-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Floating Toggle Button for desktop when collapsed */}
      {isCollapsed && (
        <button
          onClick={handleToggleCollapse}
          className="no-print no-mobile"
          style={{
            position: 'fixed',
            left: '1.25rem',
            top: '1.25rem',
            zIndex: 99,
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-sm)',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1e293b';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0f172a';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          title="Tampilkan Menu"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Mobile Header Bar */}
      <header className="mobile-header no-print">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span style={{ fontWeight: '800', letterSpacing: '1px', color: '#ffffff' }}>
          HL MANAGEMENT
        </span>
        <div style={{ width: '24px' }}></div> {/* Spacer to center title */}
      </header>

      {/* Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop no-print" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Responsive Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapse={handleToggleCollapse}
      />

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <DatabaseProvider>
      <PageContent />
    </DatabaseProvider>
  );
}
