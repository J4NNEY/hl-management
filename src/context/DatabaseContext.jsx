import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const DatabaseContext = createContext();

// Helper to format currency
export const formatIDR = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

// Cascading discount calculation helper
export const calculateCascadingDiscount = (basePrice, discounts) => {
  if (!discounts || discounts.length === 0) return basePrice;
  return discounts.reduce((price, disc) => price * (1 - Number(disc) / 100), basePrice);
};

// ============================================================
// DATA MAPPING UTILITIES (Database <=> Client models)
// ============================================================
const mapDbCustomer = (dbCust) => {
  if (!dbCust) return null;
  return {
    id: dbCust.id,
    name: dbCust.name,
    discountsLM: dbCust.discounts_lm || [],
    discountsBR: dbCust.discounts_br || [],
    threshold: Number(dbCust.threshold),
    deleted: dbCust.deleted,
  };
};

const mapClientCustomer = (clientCust) => {
  return {
    name: clientCust.name,
    discounts_lm: clientCust.discountsLM,
    discounts_br: clientCust.discountsBR,
    threshold: clientCust.threshold,
    deleted: clientCust.deleted ?? false,
  };
};

const mapDbTx = (dbTx) => {
  if (!dbTx) return null;
  return {
    id: dbTx.id,
    date: dbTx.date,
    paymentDate: dbTx.payment_date || '',
    bonNo: dbTx.bon_no,
    customerId: dbTx.customer_id,
    ongkir: Number(dbTx.ongkir),
    description: dbTx.description || '',
    isBonus: dbTx.is_bonus,
    bonusCount: Number(dbTx.bonus_count || 0),
    status: dbTx.status,
    lines: (dbTx.lines || []).map((l) => ({
      productId: l.product_id,
      qty: Number(l.qty),
      type: l.type,
      priceBase: Number(l.price_base),
      discounts: l.discounts || [],
      priceDiscounted: Number(l.price_discounted),
      lineOmzet: Number(l.line_omzet),
      hargaModal: Number(l.harga_modal),
      lineLaba: Number(l.line_laba),
    })),
  };
};

export const DatabaseProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. LISTEN TO SUPABASE AUTH & LOAD DATA
  useEffect(() => {
    let authSubscription = null;

    const initAuth = async () => {
      setLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth session error:", error.message);
          // If token refresh is invalid, sign out to clear stored local tokens
          await supabase.auth.signOut();
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else if (session) {
          setIsAuthenticated(true);
          setCurrentUser(session.user);
          await loadAllData();
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Failed to initialize session:", err);
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user);
        setLoading(true);
        await loadAllData();
        setLoading(false);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCustomers([]);
        setProducts([]);
        setTransactions([]);
      }
    });

    authSubscription = subscription;

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const loadAllData = async () => {
    try {
      const [custRes, prodRes, txRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('transactions').select('*, lines:transaction_lines(*)').order('date', { ascending: false }),
      ]);

      if (custRes.error) throw custRes.error;
      if (prodRes.error) throw prodRes.error;
      if (txRes.error) throw txRes.error;

      setCustomers((custRes.data || []).map(mapDbCustomer));
      setProducts(prodRes.data || []);
      setTransactions((txRes.data || []).map(mapDbTx));
    } catch (e) {
      console.error('Gagal memuat data dari Supabase:', e.message);
      // Auto signout if token is expired, unauthorized, or invalid
      if (e.message?.includes('JWT') || e.status === 401 || e.code === 'PGRST301') {
        setIsAuthenticated(false);
        setCurrentUser(null);
        supabase.auth.signOut();
      }
    }
  };

  // 2. AUTHENTICATION ACTIONS
  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      return { success: false, error: 'Email atau password salah.' };
    }
    return { success: true };
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  // 3. CUSTOMER MUTATIONS
  const addCustomer = async (clientCust) => {
    const dbData = mapClientCustomer(clientCust);
    const { data, error } = await supabase
      .from('customers')
      .insert([dbData])
      .select();

    if (error) throw error;
    
    const newCust = mapDbCustomer(data[0]);
    setCustomers(prev => [...prev, newCust].sort((a, b) => a.name.localeCompare(b.name)));
    return newCust;
  };

  const editCustomer = async (id, updatedFields) => {
    const dbData = mapClientCustomer({ ...customers.find(c => c.id === id), ...updatedFields });
    const { error } = await supabase
      .from('customers')
      .update(dbData)
      .eq('id', id);

    if (error) throw error;
    
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
  };

  const deleteCustomer = async (id) => {
    // Soft delete
    const { error } = await supabase
      .from('customers')
      .update({ deleted: true })
      .eq('id', id);

    if (error) throw error;

    setCustomers(prev => prev.map(c => c.id === id ? { ...c, deleted: true } : c));
  };

  // 4. PRODUCT MUTATIONS
  const addProduct = async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select();

    if (error) throw error;
    
    const newProd = data[0];
    setProducts(prev => [...prev, newProd].sort((a, b) => a.name.localeCompare(b.name)));
    return newProd;
  };

  const editProduct = async (id, updatedFields) => {
    const { error } = await supabase
      .from('products')
      .update(updatedFields)
      .eq('id', id);

    if (error) throw error;

    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  };

  const deleteProduct = async (id) => {
    // Soft delete
    const { error } = await supabase
      .from('products')
      .update({ deleted: true })
      .eq('id', id);

    if (error) throw error;

    setProducts(prev => prev.map(p => p.id === id ? { ...p, deleted: true } : p));
  };

  // Process transaction lines (Helper)
  const processTransactionLines = (lines, customerId, isBonus) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return [];

    return lines.map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return line;

      const type = product.type;
      const discounts = type === 'LM' ? customer.discountsLM : customer.discountsBR;
      const priceBase = product.base;
      const hargaModal = product.modal;

      let priceDiscounted = 0;
      let lineOmzet = 0;
      let lineLaba = 0;

      if (!isBonus) {
        priceDiscounted = calculateCascadingDiscount(priceBase, discounts);
        lineOmzet = priceDiscounted * line.qty;
        lineLaba = (priceDiscounted - hargaModal) * line.qty;
      } else {
        priceDiscounted = 0;
        lineOmzet = 0;
        lineLaba = 0;
      }

      return {
        productId: line.productId,
        qty: Number(line.qty),
        type,
        priceBase,
        discounts: [...discounts],
        priceDiscounted,
        lineOmzet,
        hargaModal,
        lineLaba,
      };
    });
  };

  // 5. TRANSACTION MUTATIONS
  const addTransaction = async (txData) => {
    // 1. Check unique Nomor Bon locally first
    const exists = transactions.some((t) => t.bonNo.toLowerCase() === txData.bonNo.trim().toLowerCase());
    if (exists) {
      throw new Error(`Nomor Bon "${txData.bonNo}" sudah digunakan. Silakan gunakan nomor unik lain.`);
    }

    // 2. Process line totals
    const processedLines = processTransactionLines(txData.lines, txData.customerId, txData.isBonus);

    // 3. Save header to supabase
    const { data: dbHeader, error: headerErr } = await supabase
      .from('transactions')
      .insert([{
        date: txData.date,
        bon_no: txData.bonNo.trim(),
        customer_id: txData.customerId,
        ongkir: Number(txData.ongkir || 0),
        description: txData.description,
        is_bonus: txData.isBonus,
        bonus_count: txData.isBonus ? Number(txData.bonusCount || 1) : 0,
        status: txData.status,
        payment_date: txData.status === 'Lunas' ? (txData.paymentDate || new Date().toISOString().split('T')[0]) : null,
      }])
      .select();

    if (headerErr) {
      if (headerErr.code === '23505') {
        throw new Error(`Nomor Bon "${txData.bonNo}" sudah terdaftar di database. Gunakan nomor unik lain.`);
      }
      throw headerErr;
    }

    const newTxId = dbHeader[0].id;

    // 4. Save lines to supabase
    const dbLines = processedLines.map((line) => ({
      transaction_id: newTxId,
      product_id: line.productId,
      qty: line.qty,
      type: line.type,
      price_base: line.priceBase,
      discounts: line.discounts,
      price_discounted: line.priceDiscounted,
      line_omzet: line.lineOmzet,
      harga_modal: line.hargaModal,
      line_laba: line.lineLaba,
    }));

    const { error: linesErr } = await supabase
      .from('transaction_lines')
      .insert(dbLines);

    if (linesErr) {
      // Rollback header manually if lines failed
      await supabase.from('transactions').delete().eq('id', newTxId);
      throw linesErr;
    }

    // 5. Update local state
    const completeClientTx = {
      ...txData,
      id: newTxId,
      lines: processedLines,
      ongkir: Number(txData.ongkir || 0),
      paymentDate: txData.status === 'Lunas' ? (txData.paymentDate || new Date().toISOString().split('T')[0]) : '',
    };

    setTransactions(prev => [completeClientTx, ...prev]);
    return completeClientTx;
  };

  const editTransaction = async (id, txData) => {
    // 1. Validate Bon Number uniqueness locally
    const exists = transactions.some((t) => t.id !== id && t.bonNo.toLowerCase() === txData.bonNo.trim().toLowerCase());
    if (exists) {
      throw new Error(`Nomor Bon "${txData.bonNo}" sudah digunakan. Silakan gunakan nomor unik lain.`);
    }

    const processedLines = processTransactionLines(txData.lines, txData.customerId, txData.isBonus);

    // 2. Update Header in Supabase
    const { error: headerErr } = await supabase
      .from('transactions')
      .update({
        date: txData.date,
        bon_no: txData.bonNo.trim(),
        ongkir: Number(txData.ongkir || 0),
        description: txData.description,
        is_bonus: txData.isBonus,
        bonus_count: txData.isBonus ? Number(txData.bonusCount || 1) : 0,
        status: txData.status,
        payment_date: txData.status === 'Lunas' ? (txData.paymentDate || new Date().toISOString().split('T')[0]) : null,
      })
      .eq('id', id);

    if (headerErr) throw headerErr;

    // 3. Delete old lines in Supabase
    const { error: deleteLinesErr } = await supabase
      .from('transaction_lines')
      .delete()
      .eq('transaction_id', id);

    if (deleteLinesErr) throw deleteLinesErr;

    // 4. Insert new lines
    const dbLines = processedLines.map((line) => ({
      transaction_id: id,
      product_id: line.productId,
      qty: line.qty,
      type: line.type,
      price_base: line.priceBase,
      discounts: line.discounts,
      price_discounted: line.priceDiscounted,
      line_omzet: line.lineOmzet,
      harga_modal: line.hargaModal,
      line_laba: line.lineLaba,
    }));

    const { error: insertLinesErr } = await supabase
      .from('transaction_lines')
      .insert(dbLines);

    if (insertLinesErr) throw insertLinesErr;

    // 5. Update local state
    setTransactions(prev => prev.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          ...txData,
          lines: processedLines,
          ongkir: Number(txData.ongkir || 0),
          paymentDate: txData.status === 'Lunas' ? (txData.paymentDate || t.paymentDate || new Date().toISOString().split('T')[0]) : '',
        };
      }
      return t;
    }));
  };

  const deleteTransaction = async (id) => {
    // ON DELETE CASCADE deletes child transaction_lines automatically in schema
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setTransactions(prev => prev.filter((t) => t.id !== id));
  };

  // 6. SETTLEMENT MUTATIONS
  const settleSingleTransaction = async (id, paymentDate) => {
    const dateVal = paymentDate || new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'Lunas',
        payment_date: dateVal
      })
      .eq('id', id);

    if (error) throw error;

    setTransactions(prev => prev.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status: 'Lunas',
          paymentDate: dateVal,
        };
      }
      return t;
    }));
  };

  const settleMonthTransactions = async (customerId, yearMonth, paymentDate) => {
    const dateVal = paymentDate || new Date().toISOString().split('T')[0];
    
    // Find matching unpaid transaction IDs locally for customer & month
    const matchingIds = transactions
      .filter((t) => t.customerId === customerId && t.status === 'Piutang' && t.date.substring(0, 7) === yearMonth)
      .map((t) => t.id);

    if (matchingIds.length === 0) return;

    // Bulk update in supabase
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'Lunas',
        payment_date: dateVal
      })
      .in('id', matchingIds);

    if (error) throw error;

    setTransactions(prev => prev.map((t) => {
      if (matchingIds.includes(t.id)) {
        return {
          ...t,
          status: 'Lunas',
          paymentDate: dateVal,
        };
      }
      return t;
    }));
  };

  // 7. BONUS CALCULATION LOGIC
  const getCustomerBonusStats = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return { accumulatedPaidOmzet: 0, bonusesEarned: 0, bonusesGranted: 0, bonusesAvailable: 0 };

    const custTransactions = transactions.filter((t) => t.customerId === customerId);
    const lunasSales = custTransactions.filter((t) => t.status === 'Lunas' && !t.isBonus);
    
    const accumulatedPaidOmzet = lunasSales.reduce((sum, t) => {
      const txOmzet = t.lines.reduce((lSum, l) => lSum + l.lineOmzet, 0);
      return sum + txOmzet;
    }, 0);

    const bonusTransactions = custTransactions.filter((t) => t.isBonus);
    const bonusesGranted = bonusTransactions.reduce((sum, t) => sum + Number(t.bonusCount || 1), 0);

    const threshold = customer.threshold || 10000000;
    const bonusesEarned = Math.floor(accumulatedPaidOmzet / threshold);
    const bonusesAvailable = Math.max(0, bonusesEarned - bonusesGranted);

    return {
      accumulatedPaidOmzet,
      bonusesEarned,
      bonusesGranted,
      bonusesAvailable,
      threshold,
    };
  };

  return (
    <DatabaseContext.Provider
      value={{
        customers,
        products,
        transactions,
        isAuthenticated,
        currentUser,
        loading,
        login,
        logout,
        addCustomer,
        editCustomer,
        deleteCustomer,
        addProduct,
        editProduct,
        deleteProduct,
        addTransaction,
        editTransaction,
        deleteTransaction,
        settleSingleTransaction,
        settleMonthTransactions,
        getCustomerBonusStats,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
