import React, { useEffect, useState } from 'react';
import { message, Input, InputNumber, Select, DatePicker, Button, Spin } from 'antd';
import './MenuProductDetailPage.css';
import './ReservationPage.css';
import dayjs from 'dayjs';

const { Option } = Select;

const timeSlots = [
  { value: '08:00', label: '8h - 10h' },
  { value: '10:00', label: '10h - 12h' },
  { value: '14:00', label: '14h - 16h' },
  { value: '16:00', label: '16h - 18h' },
  { value: '18:00', label: '18h - 20h' },
  { value: '20:00', label: '20h - 22h' }
];

const ReservationPage: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    guests: 1,
    date: null as any,
    time: '',
    tableId: '',
    note: ''
  });
  const [_tables, setTables] = useState<any[]>([]);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/tables')
      .then(res => res.json())
      .then(data => setTables(data.tables || []));
  }, []);

  useEffect(() => {
    if (form.date && form.time && form.guests > 0) {
      setLoading(true);
      fetch(`/api/tables/available?date=${form.date}&time=${form.time}&guests=${form.guests}`)
        .then(res => res.json())
        .then(data => setAvailableTables(data.data?.tables || []))
        .finally(() => setLoading(false));
    } else {
      setAvailableTables([]);
    }
  }, [form.date, form.time, form.guests]);

  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value, ...(key === 'guests' ? { tableId: '' } : {}) }));
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Bạn cần đăng nhập để đặt bàn!');
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.date || !form.time || !form.tableId || form.guests < 1) {
      message.error('Vui lòng nhập đầy đủ thông tin bắt buộc!');
      return;
    }
    if (!/^[0-9]{10,11}$/.test(form.phone)) {
      message.error('Số điện thoại không hợp lệ!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          date: form.date,
          guests: Number(form.guests)
        })
      });
      if (res.ok) {
        message.success('Đặt bàn thành công!');
        setForm({ name: '', phone: '', email: '', guests: 1, date: null, time: '', tableId: '', note: '' });
      } else {
        const data = await res.json();
        message.error(data.message || 'Đặt bàn thất bại!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-detail-page" style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
      <h1 className="product-title">Trang Đặt Bàn</h1>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 28, color: '#e53935', fontWeight: 700, display: 'inline-block', position: 'relative', margin: '0 0 12px 0' }}>
          <span style={{ borderBottom: '3px solid #e53935', padding: '0 24px' }}>Đặt Bàn</span>
        </div>
        <div style={{ margin: '18px 0 28px 0', color: '#444', fontSize: 17 }}>
          Đặt bàn trước giúp bạn chủ động thời gian, lựa chọn vị trí yêu thích và tận hưởng bữa ăn trọn vẹn cùng người thân, bạn bè. Hãy điền thông tin dưới đây để chúng tôi phục vụ bạn tốt nhất!
        </div>
      </div>
      <div className="reservation-form-container">
        <Spin spinning={loading}>
          <form className="reservation-form-2col">
            <div className="reservation-form-row">
              <Input className="reservation-input" placeholder="Tên khách hàng *" value={form.name} onChange={e => handleChange('name', e.target.value)} />
              <Input className="reservation-input" placeholder="Số điện thoại *" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
            </div>
            <div className="reservation-form-row">
              <Input className="reservation-input" placeholder="Email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
              <InputNumber className="reservation-input" min={1} max={20} value={form.guests} onChange={v => handleChange('guests', v)} placeholder="Số lượng khách *" style={{ width: '100%' }} />
            </div>
            <div className="reservation-form-row">
              <DatePicker
                className="reservation-input"
                style={{ width: '100%' }}
                placeholder="Chọn ngày đặt *"
                value={form.date ? dayjs(form.date) : null}
                onChange={d => handleChange('date', d ? d.format('YYYY-MM-DD') : null)}
                disabledDate={d => d && (d < dayjs().startOf('day') || d > dayjs().add(30, 'day'))}
              />
              <Select className="reservation-input" placeholder="Chọn khung giờ *" value={form.time} onChange={v => handleChange('time', v)}>
                {timeSlots.map(slot => <Option key={slot.value} value={slot.value}>{slot.label}</Option>)}
              </Select>
            </div>
            <div className="reservation-form-row">
              <Select
                className="reservation-input"
                placeholder="Chọn bàn *"
                value={form.tableId}
                onChange={v => handleChange('tableId', v)}
                disabled={availableTables.length === 0}
              >
                {availableTables.map(table => (
                  <Option key={table.id} value={table.id} disabled={form.guests > table.capacity}>
                    Bàn {table.number} - Sức chứa {table.capacity} người {form.guests > table.capacity ? '(Quá số chỗ)' : ''}
                  </Option>
                ))}
              </Select>
              <Input.TextArea className="reservation-input" placeholder="Ghi chú" value={form.note} onChange={e => handleChange('note', e.target.value)} rows={3} />
            </div>
            <Button
              type="primary"
              style={{ background: '#e53935', fontWeight: 600, fontSize: 18, height: 48, borderRadius: 8, marginTop: 12 }}
              block
              onClick={handleSubmit}
              loading={loading}
            >
              Đặt bàn
            </Button>
          </form>
        </Spin>
      </div>
    </div>
  );
};

export default ReservationPage; 