import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Stack,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import reservationService from '../../services/reservationService';
import { Reservation, ReservationStatus } from '../../types/reservation';
import CreateReservationForm from '../../components/reservation/CreateReservationForm';
import { CreateReservationDto } from '../../types/reservation';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reservation-tabpanel-${index}`}
      aria-labelledby={`reservation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ReservationManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    filterReservations();
  }, [searchTerm, reservations]);

  const fetchReservations = async () => {
    try {
      const response = await reservationService.getAll();
      console.log('Reservations response:', response);
      setReservations(response.reservations || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Không thể tải danh sách đặt bàn');
    }
  };

  const filterReservations = () => {
    const filtered = reservations.filter((reservation) => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = reservation.name?.toLowerCase().includes(searchLower) || false;
      const phoneMatch = reservation.phone?.toLowerCase().includes(searchLower) || false;
      return nameMatch || phoneMatch;
    });
    setFilteredReservations(filtered);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateReservation = async (formData: CreateReservationDto) => {
    try {
      console.log('Creating reservation with data:', formData);
      const response = await reservationService.create(formData);
      console.log('Create reservation response:', response);
      
      toast.success('Tạo đơn đặt bàn thành công');
      setIsCreateDialogOpen(false);
      await fetchReservations();
      setActiveTab(0);
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      const errorMessage = error.response?.data?.message || 'Không thể tạo đơn đặt bàn';
      toast.error(errorMessage);
    }
  };

  const getFilteredReservationsByStatus = (status?: ReservationStatus[]) => {
    return status
      ? filteredReservations.filter((r) => status.includes(r.status))
      : filteredReservations;
  };

  const renderReservationTable = (reservations: Reservation[], showUpdateTime: boolean = false) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            {showUpdateTime && <TableCell>Thời gian cập nhật</TableCell>}
            <TableCell>Thu ngân</TableCell>
            <TableCell>Số bàn</TableCell>
            <TableCell>Thông tin KH</TableCell>
            <TableCell>Trạng thái</TableCell>
            <TableCell>Chức năng</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reservations.map((reservation, index) => (
            <TableRow key={reservation.id}>
              <TableCell>{index + 1}</TableCell>
              {showUpdateTime && (
                <TableCell>
                  {format(new Date(reservation.updatedAt), 'dd/MM/yyyy HH:mm')}
                </TableCell>
              )}
              <TableCell>{reservation.user?.name || 'N/A'}</TableCell>
              <TableCell>
                {reservation.table ? `Bàn ${reservation.table.number}` : 'Chưa có bàn'}
              </TableCell>
              <TableCell>
                <Typography variant="body2">{reservation.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {reservation.phone}
                </Typography>
              </TableCell>
              <TableCell>{reservation.status}</TableCell>
              <TableCell>
                <IconButton
                  onClick={() => navigate(`/admin/reservations/${reservation.id}`)}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {reservations.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                Không có đơn đặt bàn nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Quản lý đặt bàn
      </Typography>
      
      <Typography variant="body1" paragraph>
        Quản lý tất cả các đơn đặt bàn, theo dõi trạng thái và cập nhật thông tin đặt bàn.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        justifyContent="space-between"
        alignItems="center"
      >
        <TextField
          placeholder="Tìm kiếm theo tên hoặc số điện thoại"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: { xs: '100%', sm: '300px' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          Tạo đơn đặt bàn
        </Button>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Tất cả" />
          <Tab label="Chờ xử lý" />
          <Tab label="Đã hủy" />
          <Tab label="Đã thanh toán" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {renderReservationTable(getFilteredReservationsByStatus())}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderReservationTable(
          getFilteredReservationsByStatus([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
          true
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderReservationTable(
          getFilteredReservationsByStatus([ReservationStatus.CANCELLED]),
          true
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {renderReservationTable(
          getFilteredReservationsByStatus([ReservationStatus.COMPLETED]),
          true
        )}
      </TabPanel>

      <CreateReservationForm
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateReservation}
      />
    </Box>
  );
};

export default ReservationManagement; 