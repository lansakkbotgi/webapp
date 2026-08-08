import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError('');
    try {
      const user = await login(username, password);
      setUser(user);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'INVALID_CREDENTIALS') {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          {/* Custom Shield Police Icon */}
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#3b82f6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        </div>
        <h1 className="login-title">สายตรวจ สภ.ลานสัก</h1>
        <p className="login-subtitle">ระบบผู้ช่วย AI และการแจ้งเหตุ PWA</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">ชื่อผู้ใช้งาน</label>
            <input
              type="text"
              className="input"
              placeholder="กรอกชื่อผู้ใช้..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoCapitalize="none"
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">รหัสผ่าน</label>
            <input
              type="password"
              className="input"
              placeholder="กรอกรหัสผ่าน..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading || !username || !password}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

          {/* ปุ่ม Bypass สำหรับงานทดสอบ */}
          <button
            type="button"
            className="btn btn-secondary w-full"
            style={{ marginTop: '12px', background: '#374151', color: '#f3f4f6', borderColor: '#4b5563' }}
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                const { api, saveTokens } = await import('../api/client');
                const data = await api.get<{ user: any; accessToken: string; refreshToken: string }>('/auth/bypass-token');
                saveTokens(data.accessToken, data.refreshToken);
                setUser(data.user);
                navigate('/');
              } catch (err: any) {
                console.error(err);
                setError('การล็อกอินทดสอบล้มเหลว (ตรวจสอบสถานะเซิร์ฟเวอร์)');
              } finally {
                setLoading(false);
              }
            }}
          >
            🔓 เข้าสู่ระบบทดสอบ (Bypass)
          </button>
        </form>
      </div>
    </div>
  );
}
