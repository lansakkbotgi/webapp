import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

interface DashboardData {
  connection: string;
  lastSyncedAt: string;
  incidentMetrics: {
    new: number;
    emergency: number;
    assignedToMe: number;
    active: number;
    closedToday: number;
  };
  dataMetrics: {
    directoryPeople: number;
    riskPeople: number;
    locationReports: number;
  };
  latestIncidents: Array<{
    id: string;
    referenceNo: string;
    category: string;
    priority: string;
    status: string;
    locationName: string;
    occurredAt: string;
    assignedToMe: boolean;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardData>('/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดข้อมูลสถิติได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p className="text-muted" style={{ marginBottom: '16px' }}>{error || 'เกิดข้อผิดพลาด'}</p>
        <button onClick={fetchDashboard} className="btn btn-ghost">โหลดอีกครั้ง</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>สวัสดียามเช้า, {user?.displayName}</h2>
        <p className="text-muted text-sm">ยินดีต้อนรับสู่ระบบสายตรวจภูธรลานสัก</p>
      </div>

      <div className="section-title">สรุปข้อมูลสถานะเหตุวันนี้</div>
      <div className="stat-grid">
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <span className="stat-value" style={{ color: 'var(--color-danger)' }}>
            {data.incidentMetrics.emergency}
          </span>
          <span className="stat-label">เหตุฉุกเฉิน</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <span className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {data.incidentMetrics.new}
          </span>
          <span className="stat-label">เหตุใหม่ที่ยังไม่รับ</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <span className="stat-value" style={{ color: 'var(--color-primary)' }}>
            {data.incidentMetrics.assignedToMe}
          </span>
          <span className="stat-label">รับผิดชอบโดยฉัน</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
            {data.incidentMetrics.closedToday}
          </span>
          <span className="stat-label">ปิดเหตุวันนี้</span>
        </div>
      </div>

      <div className="section-title">ข้อมูลอ้างอิงของระบบ</div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div className="stat-card" style={{ padding: '12px 8px', alignItems: 'center', textAlign: 'center' }}>
          <span className="stat-value" style={{ fontSize: '20px' }}>{data.dataMetrics.directoryPeople}</span>
          <span className="stat-label" style={{ fontSize: '10px' }}>ทำเนียบกำลังพล</span>
        </div>
        <div className="stat-card" style={{ padding: '12px 8px', alignItems: 'center', textAlign: 'center' }}>
          <span className="stat-value" style={{ fontSize: '20px' }}>{data.dataMetrics.riskPeople}</span>
          <span className="stat-label" style={{ fontSize: '10px' }}>บุคคลเฝ้าระวัง</span>
        </div>
        <div className="stat-card" style={{ padding: '12px 8px', alignItems: 'center', textAlign: 'center' }}>
          <span className="stat-value" style={{ fontSize: '20px' }}>{data.dataMetrics.locationReports}</span>
          <span className="stat-label" style={{ fontSize: '10px' }}>จุดตรวจ/จุดเสี่ยง</span>
        </div>
      </div>

      <div className="section-title">5 เหตุล่าสุดในพื้นที่</div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.latestIncidents.length === 0 ? (
          <div className="glass" style={{ padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
            <span className="text-muted text-sm">ยังไม่มีรายงานเหตุขัดข้องในช่วงนี้</span>
          </div>
        ) : (
          data.latestIncidents.map((incident) => (
            <div key={incident.id} className="glass" style={{ padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{incident.category}</span>
                <span 
                  className="text-sm" 
                  style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    backgroundColor: incident.priority === 'emergency' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                    color: incident.priority === 'emergency' ? '#fca5a5' : 'inherit',
                  }}
                >
                  {incident.priority}
                </span>
              </div>
              <span className="text-muted text-sm">📍 {incident.locationName}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                <span className="text-sm" style={{ color: 'var(--color-primary)' }}>สถานะ: {incident.status}</span>
                <span className="text-muted text-sm">{new Date(incident.occurredAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
