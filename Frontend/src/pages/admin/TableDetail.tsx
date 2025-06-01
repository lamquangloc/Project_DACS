import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import tableService from '../../services/tableService';
import { CreateTableDto, TableStatus } from '../../types/table';

const TableDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateTableDto>({
    number: 1,
    capacity: 1,
    status: TableStatus.AVAILABLE
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchTableData();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchTableData = async () => {
    if (!id) return;
    
    try {
      console.log('Fetching table data for id:', id);
      const response = await tableService.getById(id);
      console.log('Table detail response:', response);

      if (response) {
        console.log('Setting form data with:', response);
        setFormData({
          number: response.number,
          capacity: response.capacity,
          status: response.status
        });
      } else {
        console.error('Failed to fetch table data:', response);
        toast.error('Không thể tải thông tin bàn');
        navigateBack();
      }
    } catch (error) {
      console.error('Error fetching table:', error);
      toast.error('Không thể tải thông tin bàn');
      navigateBack();
    } finally {
      setLoading(false);
    }
  };

  const navigateBack = () => {
    setTimeout(() => {
      const returnPath = location.state?.returnTo || '/admin/tables';
      navigate(returnPath, { 
        replace: true,
        state: { refresh: Date.now() }
      });
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate form data
    if (!formData.number || formData.number <= 0) {
      toast.error('Số bàn phải lớn hơn 0');
      return;
    }

    if (!formData.capacity || formData.capacity <= 0) {
      toast.error('Sức chứa phải lớn hơn 0');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Submitting table data:', formData);

      // Ensure all fields are properly typed
      const submitData: CreateTableDto = {
        number: Number(formData.number),
        capacity: Number(formData.capacity),
        status: formData.status
      };

      const response = id === 'new'
        ? await tableService.create(submitData)
        : await tableService.update(id || '', submitData);

      console.log('Submit response:', response);

      if (response) {
        toast.success(id === 'new' ? 'Thêm bàn mới thành công' : 'Cập nhật bàn thành công');
        navigateBack();
      } else {
        toast.error('Có lỗi xảy ra khi lưu thông tin bàn');
      }
    } catch (error: any) {
      console.error('Error saving table:', error);
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin bàn';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'number' || name === 'capacity' ? Number(value) : value
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {id === 'new' ? 'Thêm bàn mới' : 'Chỉnh sửa thông tin bàn'}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="number" className="block text-sm font-medium text-gray-700">
              Số bàn
            </label>
            <input
              type="number"
              id="number"
              name="number"
              value={formData.number}
              onChange={handleChange}
              min="1"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
              Sức chứa
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min="1"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Trạng thái
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value={TableStatus.AVAILABLE}>Trống</option>
              <option value={TableStatus.OCCUPIED}>Đang sử dụng</option>
              <option value={TableStatus.RESERVED}>Đã đặt trước</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={navigateBack}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : id === 'new' ? 'Thêm bàn' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableDetail; 