import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import tableService from '../../services/tableService';
import { Table, TableStatus } from '../../types/table';

const TableManagement: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [_totalItems, setTotalItems] = useState(0);
  const [_currentPage, setCurrentPage] = useState(1);
  const [_totalPages, setTotalPages] = useState(1);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Location changed, fetching tables...');
    fetchTables();
  }, [location.state?.refresh]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      console.log('Fetching tables...');
      const response = await tableService.getAll();
      console.log('Tables response:', response);
      
      if (response) {
        console.log('Setting tables with data:', response);
        setTables(response.tables || []);
        setTotalItems(response.total || 0);
        setCurrentPage(response.page || 1);
        setTotalPages(response.totalPages || 1);
      } else {
        console.error('Failed to fetch tables:', response);
        toast.error('Không thể tải danh sách bàn');
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Không thể tải danh sách bàn');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bàn này?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await tableService.delete(id);
      console.log('Delete response:', response);
      
      if (response) {
        toast.success('Xóa bàn thành công');
        setTables(prevTables => prevTables.filter(table => table.id !== id));
      } else {
        toast.error('Không thể xóa bàn');
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Không thể xóa bàn');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/admin/tables/${id}`, { 
      state: { 
        returnTo: location.pathname,
        refresh: Date.now() 
      } 
    });
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case TableStatus.OCCUPIED:
        return 'bg-red-100 text-red-800';
      case TableStatus.RESERVED:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'Trống';
      case TableStatus.OCCUPIED:
        return 'Đang sử dụng';
      case TableStatus.RESERVED:
        return 'Đã đặt trước';
      default:
        return status;
    }
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Quản lý bàn</h1>
        <Link
          to="/admin/tables/new"
          state={{ returnTo: location.pathname, refresh: Date.now() }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" />
          Thêm bàn mới
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Số bàn
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sức chứa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tables.length > 0 ? (
              tables.map((table) => (
                <tr key={table.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Bàn {table.number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{table.capacity} người</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(table.status)}`}>
                      {getStatusText(table.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(table.id)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <FaEdit className="inline-block" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FaTrash className="inline-block" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  Chưa có bàn nào được tạo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableManagement; 