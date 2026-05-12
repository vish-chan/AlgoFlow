import { useState, useEffect, useCallback } from "react";

let pushToast: (msg: string) => void = () => {};

export function showToast(msg: string) { pushToast(msg); }

export default function ToastContainer() {
    const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

    const add = useCallback((msg: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
    }, []);

    useEffect(() => { pushToast = add; return () => { pushToast = () => {}; }; }, [add]);

    if (!toasts.length) return null;

    return (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    background: "var(--bg-elevated)", border: "1px solid var(--accent)",
                    color: "var(--text-primary)", padding: "8px 20px", borderRadius: 6,
                    fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                    animation: "toast-in 0.2s ease",
                }}>
                    {t.msg}
                </div>
            ))}
            <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
