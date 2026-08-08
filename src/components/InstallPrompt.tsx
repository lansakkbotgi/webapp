import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if device is iOS and not running standalone
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (isIOS && !isStandalone) {
      // Show install prompt instructions for iOS Safari users
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="install-banner">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, color: '#fff' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>📲 ติดตั้งแอปบน iPhone เพื่อใช้ฟีเจอร์เต็มรูปแบบ</div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          กดปุ่มแชร์ 
          <span style={{ margin: '0 4px', display: 'inline-flex', verticalAlign: 'middle' }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
            </svg>
          </span>
          แล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong> เพื่อใช้กล้อง ไมโครโฟน และระบบแจ้งเตือนแบบเรียลไทม์
        </div>
      </div>
      <button 
        onClick={() => setShowPrompt(false)} 
        className="btn btn-ghost" 
        style={{ padding: '6px 10px', fontSize: '12px', border: 'none', background: 'rgba(255,255,255,0.1)' }}
      >
        ซ่อน
      </button>
    </div>
  );
}
