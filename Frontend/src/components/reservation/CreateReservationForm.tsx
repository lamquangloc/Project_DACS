import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Stack,
} from '@mui/material';
import { TimeSlot, CreateReservationDto } from '../../types/reservation';
import { Table } from '../../types/table';
import tableService from '../../services/tableService';
import { format } from 'date-fns';

interface CreateReservationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateReservationDto) => void;
}

const CreateReservationForm: React.FC<CreateReservationFormProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    guests: 1,
    date: '',
    time: '',
    tableId: '',
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [availableTablesForTimeSlot, setAvailableTablesForTimeSlot] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableTables();
      setFormData({
        name: '',
        phone: '',
        email: '',
        guests: 1,
        date: '',
        time: '',
        tableId: '',
        note: '',
      });
      setErrors({});
      setAvailableTablesForTimeSlot([]);
    }
  }, [open]);

  useEffect(() => {
    // Kiểm tra lại tính khả dụng của bàn khi ngày hoặc giờ thay đổi
    if (formData.date && formData.time) {
      checkTableAvailability();
    }
  }, [formData.date, formData.time]);

  const fetchAvailableTables = async () => {
    try {
      const response = await tableService.getAll();
      console.log('Table response:', response);
      const tables = response.tables || [];
      setAvailableTables(tables);
    } catch (error) {
      console.error('Error fetching available tables:', error);
    }
  };

  const checkTableAvailability = async () => {
    if (!formData.date || !formData.time) return;

    try {
      const response = await tableService.getAvailableTables(
        formData.date,
        formatTimeForBackend(formData.time),
        formData.guests
      );
      
      if (response.status === 'success' && response.data?.tables) {
        const availableTableIds = response.data.tables.map((table: Table) => table.id);
        setAvailableTablesForTimeSlot(availableTableIds);
        
        // Nếu bàn đang chọn không có trong danh sách bàn khả dụng
        if (formData.tableId && !availableTableIds.includes(formData.tableId)) {
          setErrors(prev => ({
            ...prev,
            tableId: 'Bàn này đã được đặt vào khung giờ này. Hãy chọn bàn khác'
          }));
          setFormData(prev => ({ ...prev, tableId: '' }));
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error checking table availability:', error);
      setErrors(prev => ({
        ...prev,
        tableId: 'Không thể kiểm tra tình trạng bàn. Vui lòng thử lại sau.'
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const currentDate = new Date();
    const selectedDate = new Date(formData.date);
    const [startHour] = formData.time.split(' - ')[0].split('h').map(Number);
    
    selectedDate.setHours(startHour, 0, 0, 0);

    if (selectedDate < currentDate) {
      newErrors.time = 'Không chọn thời gian trong quá khứ';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên khách hàng';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^\d{10,11}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }
    if (!formData.date) {
      newErrors.date = 'Vui lòng chọn ngày đặt bàn';
    }
    if (!formData.time) {
      newErrors.time = 'Vui lòng chọn khung giờ';
    }
    if (!formData.tableId) {
      newErrors.tableId = 'Vui lòng chọn bàn';
    }
    if (formData.guests <= 0) {
      newErrors.guests = 'Số lượng khách phải lớn hơn 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatTimeForBackend = (timeSlot: string) => {
    const hour = timeSlot.split(' - ')[0].replace('h', '');
    return `${hour.padStart(2, '0')}:00`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const reservationDto: CreateReservationDto = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        guests: Number(formData.guests),
        date: formData.date,
        time: formatTimeForBackend(formData.time),
        tableId: formData.tableId
      };

      if (formData.email.trim()) {
        reservationDto.email = formData.email.trim();
      }
      
      if (formData.note.trim()) {
        reservationDto.note = formData.note.trim();
      }

      console.log('Submitting reservation:', reservationDto);
      onSubmit(reservationDto);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }

    if (name === 'guests') {
      const guests = Number(value);
      if (formData.tableId) {
        const selectedTable = availableTables.find(table => table.id === formData.tableId);
        if (selectedTable && guests > selectedTable.capacity) {
          setErrors(prev => ({
            ...prev,
            tableId: `Bàn này chỉ có thể phục vụ tối đa ${selectedTable.capacity} khách`
          }));
        } else {
          setErrors(prev => {
            const { tableId, ...rest } = prev;
            return rest;
          });
        }
      }
    }
  };

  // Filter available tables based on number of guests
  const filteredTables = availableTables.filter(
    table => table.capacity >= formData.guests
  );

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    
    if (name === 'time') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        tableId: '' // Reset table selection when time changes
      }));
    } else if (name === 'tableId') {
      const selectedTable = availableTables.find(table => table.id === value);
      
      // Kiểm tra số lượng khách
      if (selectedTable && formData.guests > selectedTable.capacity) {
        setErrors(prev => ({
          ...prev,
          tableId: `Bàn này chỉ có thể phục vụ tối đa ${selectedTable.capacity} khách`
        }));
      } else if (!availableTablesForTimeSlot.includes(value)) {
        // Kiểm tra tính khả dụng của bàn
        setErrors(prev => ({
          ...prev,
          tableId: 'Bàn này đã được đặt vào khung giờ này. Hãy chọn bàn khác'
        }));
      } else {
        // Xóa lỗi nếu bàn hợp lệ
        setErrors(prev => {
          const { tableId, ...rest } = prev;
          return rest;
        });
      }

      // Luôn cập nhật giá trị đã chọn
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const minDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Tạo đơn đặt bàn mới</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                required
                label="Tên khách hàng"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                error={!!errors.name}
                helperText={errors.name}
              />
              <TextField
                fullWidth
                required
                label="Số điện thoại"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                error={!!errors.phone}
                helperText={errors.phone}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
              <TextField
                fullWidth
                required
                label="Số lượng khách"
                name="guests"
                type="number"
                value={formData.guests}
                onChange={handleInputChange}
                inputProps={{ min: 1 }}
                error={!!errors.guests}
                helperText={errors.guests}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                required
                label="Ngày đặt"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: minDate }}
                error={!!errors.date}
                helperText={errors.date}
              />
              <FormControl fullWidth required error={!!errors.time}>
                <InputLabel>Khung giờ</InputLabel>
                <Select
                  name="time"
                  value={formData.time}
                  onChange={handleSelectChange}
                  label="Khung giờ"
                >
                  {Object.values(TimeSlot).map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
                {errors.time && (
                  <FormHelperText error>{errors.time}</FormHelperText>
                )}
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth required error={!!errors.tableId}>
                <InputLabel>Chọn bàn</InputLabel>
                <Select
                  name="tableId"
                  value={formData.tableId}
                  onChange={handleSelectChange}
                  label="Chọn bàn"
                >
                  {filteredTables.map((table) => {
                    const isBooked =
                      formData.date && formData.time
                        ? !availableTablesForTimeSlot.includes(table.id)
                        : false;
                    return (
                      <MenuItem
                        key={table.id}
                        value={table.id}
                        sx={{
                          color: isBooked ? 'error.main' : 'inherit'
                        }}
                        disabled={isBooked}
                      >
                        Bàn {table.number} - Số người {table.capacity}
                        {isBooked && ' (Đã đặt)'}
                      </MenuItem>
                    );
                  })}
                </Select>
                {errors.tableId && (
                  <FormHelperText error>{errors.tableId}</FormHelperText>
                )}
                {filteredTables.length === 0 && (
                  <FormHelperText error>
                    Không có bàn nào phù hợp với số lượng khách
                  </FormHelperText>
                )}
              </FormControl>
              <TextField
                fullWidth
                label="Ghi chú"
                name="note"
                multiline
                rows={1}
                value={formData.note}
                onChange={handleInputChange}
              />
            </Stack>
          </Stack>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={Object.keys(errors).length > 0 || filteredTables.length === 0}
        >
          Tạo đơn
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateReservationForm; 