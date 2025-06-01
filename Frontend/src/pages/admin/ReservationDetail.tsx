import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Stack,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import reservationService from '../../services/reservationService';
import tableService from '../../services/tableService';
import { Reservation, ReservationStatus, TimeSlot, UpdateReservationDto } from '../../types/reservation';
import { Table } from '../../types/table';

const ReservationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [formData, setFormData] = useState<UpdateReservationDto>({
    status: ReservationStatus.PENDING
  });

  useEffect(() => {
    if (id) {
      fetchReservationData();
      fetchTables();
    }
  }, [id]);

  useEffect(() => {
    updateAvailableTables();
  }, [formData.guests, tables]);

  const updateAvailableTables = () => {
    if (!formData.guests || formData.guests <= 0) return;

    const filteredTables = tables.filter(table => table.capacity >= (formData.guests || 0));
    setAvailableTables(filteredTables);

    // If current table is not valid for new guest count, clear the selection
    if (formData.tableId) {
      const currentTable = filteredTables.find(t => t.id === formData.tableId);
      if (!currentTable) {
        setFormData(prev => ({ ...prev, tableId: '' }));
        toast.warning('Bàn hiện tại không đủ chỗ cho số lượng khách mới');
      }
    }
  };

  const validateDate = (date: string) => {
    const selectedDate = new Date(date);
    const today = startOfDay(new Date());
    const maxDate = addDays(today, 30);
    
    if (isBefore(selectedDate, today)) {
      return 'Không thể chọn ngày trong quá khứ';
    }
    
    if (isBefore(maxDate, selectedDate)) {
      return 'Chỉ có thể đặt bàn trong vòng 30 ngày';
    }
    
    return '';
  };

  const fetchTables = async () => {
    try {
      const response = await tableService.getAll();
      if (response.tables) {
        setTables(response.tables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Không thể tải danh sách bàn');
    }
  };

  const convertTimeToSlot = (time: string): string => {
    // Convert API time format to TimeSlot format
    const timeMap: { [key: string]: string } = {
      '08:00': '8h - 10h',
      '10:00': '10h - 12h',
      '14:00': '14h - 16h',
      '16:00': '16h - 18h',
      '18:00': '18h - 20h',
      '20:00': '20h - 22h'
    };
    return timeMap[time] || time;
  };

  const convertSlotToTime = (slot: string): string => {
    // Convert TimeSlot format to API time format
    const slotMap: { [key: string]: string } = {
      '8h - 10h': '08:00',
      '10h - 12h': '10:00',
      '14h - 16h': '14:00',
      '16h - 18h': '16:00',
      '18h - 20h': '18:00',
      '20h - 22h': '20:00'
    };
    return slotMap[slot] || slot;
  };

  const fetchReservationData = async () => {
    try {
      setLoading(true);
      console.log('Attempting to fetch reservation with ID:', id);
      const fetchedReservation = await reservationService.getById(id!);
      console.log('Raw API Response:', fetchedReservation);
      
      if (fetchedReservation && fetchedReservation.id) {
        console.log('Reservation data:', fetchedReservation);
        setReservation(fetchedReservation);
        setFormData({
          name: fetchedReservation.name,
          phone: fetchedReservation.phone,
          guests: fetchedReservation.guests,
          date: format(new Date(fetchedReservation.date), 'yyyy-MM-dd'),
          time: convertTimeToSlot(fetchedReservation.time),
          status: fetchedReservation.status,
          email: fetchedReservation.email,
          note: fetchedReservation.note || '',
          tableId: fetchedReservation.tableId
        });
        console.log('Form data set successfully');
      } else {
        console.error('Invalid reservation data:', fetchedReservation);
        toast.error('Không thể tải thông tin đặt bàn');
        navigate('/admin/reservations');
      }
    } catch (error: any) {
      console.error('Error details:', error);
      toast.error(error.response?.data?.message || 'Không thể tải thông tin đặt bàn');
      navigate('/admin/reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'guests') {
      const guestCount = parseInt(value, 10);
      if (guestCount < 1) {
        toast.error('Số lượng khách phải lớn hơn 0');
        return;
      }
      if (guestCount > 20) {
        toast.error('Số lượng khách không được vượt quá 20 người');
        return;
      }
    }

    if (name === 'date') {
      const errorMessage = validateDate(value);
      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'guests' ? parseInt(value, 10) : value,
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name === 'status') {
      // Cập nhật state form data trước
      setFormData((prev) => ({
        ...prev,
        status: value as ReservationStatus
      }));

      // Gửi request cập nhật trạng thái
      (async () => {
        try {
          const updatedReservation = await reservationService.updateStatus(id!, value as ReservationStatus);
          
          if (updatedReservation && updatedReservation.id) {
            setReservation(updatedReservation);
            toast.success('Cập nhật trạng thái thành công');
          }
        } catch (error: any) {
          console.error('Status update error:', error);
          // Nếu lỗi, rollback lại trạng thái cũ
          setFormData((prev) => ({
            ...prev,
            status: reservation?.status || ReservationStatus.PENDING
          }));
          const errorMessage = error.response?.data?.message || 'Không thể cập nhật trạng thái';
          toast.error(errorMessage);
        }
      })();
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // So sánh với dữ liệu gốc để chỉ gửi các trường đã thay đổi
      const originalData = {
        name: reservation?.name,
        phone: reservation?.phone,
        email: reservation?.email,
        note: reservation?.note || '',
        guests: reservation?.guests,
        date: reservation?.date ? format(new Date(reservation.date), 'yyyy-MM-dd') : '',
        time: reservation?.time ? convertTimeToSlot(reservation.time) : '',
        tableId: reservation?.tableId
      };

      const currentData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        note: formData.note || '',
        guests: formData.guests,
        date: formData.date,
        time: formData.time,
        tableId: formData.tableId
      };

      // Tìm các trường đã thay đổi
      const changedFields = Object.entries(currentData).reduce((acc, [key, value]) => {
        if (value !== originalData[key as keyof typeof originalData]) {
          if (key === 'time' && value) {
            acc[key] = convertSlotToTime(String(value));
          } else if (key === 'guests' && value) {
            acc[key] = String(value);
          } else if (value !== undefined && value !== '') {
            acc[key] = value;
          }
        }
        return acc;
      }, {} as Record<string, any>);

      // Nếu không có trường nào thay đổi, quay về trang danh sách
      if (Object.keys(changedFields).length === 0) {
        toast.info('Không có thông tin nào thay đổi');
        navigate('/admin/reservations');
        return;
      }

      console.log('Submitting changed fields:', changedFields);
      const updatedReservation = await reservationService.update(id!, changedFields);
      console.log('Update response:', updatedReservation);
      
      if (updatedReservation && updatedReservation.id) {
        toast.success('Cập nhật đặt bàn thành công');
        navigate('/admin/reservations');
      } else {
        console.error('Update failed:', updatedReservation);
        toast.error('Không thể cập nhật đặt bàn');
      }
    } catch (error: any) {
      console.error('Update error details:', error);
      const errorMessage = error.response?.data?.message || 'Không thể cập nhật đặt bàn';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  if (!reservation) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Không tìm thấy thông tin đặt bàn</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Chi tiết đặt bàn
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/admin/reservations')}
        >
          Quay lại
        </Button>
      </Box>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Tên khách hàng"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  required
                />
                <TextField
                  fullWidth
                  label="Số điện thoại"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  required
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                />
                <TextField
                  fullWidth
                  label="Ghi chú"
                  name="note"
                  value={formData.note || ''}
                  onChange={handleInputChange}
                  multiline
                  rows={1}
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Số người"
                  name="guests"
                  value={formData.guests || ''}
                  onChange={handleInputChange}
                  required
                  inputProps={{ min: 1, max: 20 }}
                  helperText="Số người từ 1-20"
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Ngày đặt"
                  name="date"
                  value={formData.date || ''}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: format(new Date(), 'yyyy-MM-dd'),
                    max: format(addDays(new Date(), 30), 'yyyy-MM-dd')
                  }}
                  helperText="Chỉ được đặt trong vòng 30 ngày"
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Thời gian</InputLabel>
                  <Select
                    name="time"
                    value={formData.time || ''}
                    onChange={handleSelectChange}
                    label="Thời gian"
                    required
                  >
                    {Object.values(TimeSlot).map((slot) => (
                      <MenuItem key={slot} value={slot}>
                        {slot}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Bàn</InputLabel>
                  <Select
                    name="tableId"
                    value={formData.tableId || ''}
                    onChange={handleSelectChange}
                    label="Bàn"
                    required
                  >
                    {availableTables.map((table) => (
                      <MenuItem key={table.id} value={table.id}>
                        Bàn {table.number} ({table.capacity} người)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    name="status"
                    value={formData.status || ReservationStatus.PENDING}
                    onChange={handleSelectChange}
                    label="Trạng thái"
                    required
                  >
                    {Object.values(ReservationStatus).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/admin/reservations')}
                >
                  Hủy
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                >
                  Lưu thay đổi
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReservationDetail; 