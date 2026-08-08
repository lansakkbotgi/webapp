import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { subscribePush, unsubscribePush } from '../api/push';

interface NotificationItem {
  id: string;
  type: string;
  referenceType: string;
  referenceId: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<'granted' | 'default' | 'denied' | 'unsupported'>('default');
  const [subscribing, setSubscribing] = useState(false);

  const checkPushPermission = () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushStatus('unsupported');
      return;
    }
    setPushStatus(Notification.permission as any);
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ items: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    checkPushPermission();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await api.patch<{ item: NotificationItem }>(`/notifications/${id}/read`, {});
      setNotifications(prev =>
        prev.map(item => (item.id === id ? { ...item, readAt: res.item.readAt } : item))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePush = async () => {
    if (pushStatus === 'unsupported') return;
    setSubscribing(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushStatus === 'granted') {
        await unsubscribePush(reg);
        setPushStatus('default');
      } else {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          const ok = await subscribePush(reg);
          if (ok) {
            setPushStatus('granted');
          } else {
            alert('ไม่สามารถลงทะเบียนรับแจ้งเตือนกับเซิร์ฟเวอร์ได้');
          }
        } else {
          setPushStatus(result as any);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div style={{ paddingBottom: '16px' }}>
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>แจ้งเตือนระงับเหตุ</h2>
          <p className="text-muted text-sm">มีคำสั่งหรือเหตุใหม่ในความรับผิดชอบ</p>
        </div>
        {unreadCount > 0 && (
          <span 
            style={{ 
              backgroundColor: 'var(--color-danger)', 
              color: '#fff', 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: 'bold' 
            }}
          >
            {unreadCount} ใหม่
          </span>
        )}
      </div>

      {/* Push Notification Toggle Option for iPhone standalone mode */}
      <div className="glass" style={{ margin: '0 16px 16px', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600 }}>🔔 ระบบ Push Notification</h3>
        <p className="text-muted text-sm">
          {pushStatus === 'unsupported' && 'เบราว์เซอร์หรืออุปกรณ์ของคุณยังไม่รองรับ Web Push'}
          {pushStatus === 'denied' && 'คุณปฏิเสธสิทธิ์การแจ้งเตือน โปรดเปิดสิทธิ์ในการตั้งค่าของ iOS'}
          {pushStatus === 'granted' && 'ลงทะเบียนรับการแจ้งเตือนด่วนบน iPhone สำเร็จแล้ว'}
          {pushStatus === 'default' && 'เปิดรับการแจ้งเตือนเหตุแบบ Realtime เมื่อติดตั้งบนหน้าจอโฮม'}
        </p>

        {pushStatus !== 'unsupported' && (
          <button 
            onClick={handleTogglePush} 
            className={`btn ${pushStatus === 'granted' ? 'btn-ghost' : 'btn-primary'}`}
            style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
            disabled={subscribing || pushStatus === 'denied'}
          >
            {subscribing ? 'กำลังบันทึก...' : pushStatus === 'granted' ? 'ปิดรับการแจ้งเตือน' : 'เปิดรับการแจ้งเตือน'}
          </button>
        )}
      </div>

      <div className="section-title">รายการแจ้งเตือน</div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
          <div className="spinner"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p className="text-muted text-sm">ไม่มีรายการแจ้งเตือนค้างอยู่</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
          {notifications.map((item) => (
            <div 
              key={item.id} 
              className="glass" 
              style={{ 
                padding: '16px', 
                borderRadius: '12px', 
                position: 'relative',
                borderLeft: item.readAt ? '1px solid var(--color-border)' : '4px solid var(--color-primary)'
              }}
              onClick={() => !item.readAt && handleMarkAsRead(item.id)}
            >
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: item.readAt ? 'var(--color-text)' : '#fff' }}>
                {item.title}
              </h4>
              <p className="text-muted text-sm" style={{ marginTop: '4px' }}>
                {item.body}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                <span>ประเภท: {item.type}</span>
                <span>{new Date(item.createdAt).toLocaleDateString('th-TH')} {new Date(item.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
