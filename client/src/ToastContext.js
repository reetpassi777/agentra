import React, { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3800);
  }, []);

  const colors = {
    success: { bg: 'var(--surface2)', border: 'rgba(61,158,133,0.3)', icon: 'var(--teal)', dot: '#3d9e85' },
    error:   { bg: 'var(--surface2)', border: 'rgba(192,74,74,0.3)',   icon: 'var(--red)',  dot: '#c04a4a' },
    info:    { bg: 'var(--surface2)', border: 'var(--border2)',         icon: 'var(--text2)', dot: '#8a8898' },
  };

  return (
    <Ctx.Provider value={show}>
      {children}
      <div id="toast-root">
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 'var(--r-lg)',
              padding: '10px 16px',
              fontSize: 13,
              color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 10,
              animation: 'toastIn 0.22s ease both',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              maxWidth: 340,
              pointerEvents: 'auto',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
