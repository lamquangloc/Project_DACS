import React, { useState, useEffect } from 'react';
import { FaEye, FaPencilAlt, FaTrash, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import comboService from '../../services/comboService';
import { Combo } from '../../types/combo';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../../utils/image';

const ComboManagement: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchCombos();
  }, [currentPage, itemsPerPage, searchTerm]);

  const fetchCombos = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm
      };
      const response = await comboService.getAll(params);
      if (response.status === 'success' && response.data) {
        setCombos(response.data.items);
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi tải danh sách combo');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCombos(combos.map(combo => combo.id));
    } else {
      setSelectedCombos([]);
    }
  };

  const handleSelectCombo = (comboId: string) => {
    setSelectedCombos(prev => {
      if (prev.includes(comboId)) {
        return prev.filter(id => id !== comboId);
      } else {
        return [...prev, comboId];
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (!selectedCombos.length) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa các combo đã chọn?')) {
      try {
        const response = await comboService.deleteMany(selectedCombos);
        if (response.status === 'success') {
          toast.success('Xóa combo thành công');
          setSelectedCombos([]);
          if (selectedCombos.length >= combos.length && currentPage > 1) {
            setCurrentPage(currentPage - 1);
          } else {
            fetchCombos();
          }
        }
      } catch (error: any) {
        toast.error(error.message || 'Có lỗi xảy ra khi xóa combo');
      }
    }
  };

  const handleDeleteCombo = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa combo này?')) {
      try {
        const response = await comboService.delete(id);
        if (response.status === 'success') {
          toast.success('Xóa combo thành công');
          if (combos.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
          } else {
            fetchCombos();
          }
        }
      } catch (error: any) {
        toast.error(error.message || 'Có lỗi xảy ra khi xóa combo');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Quản lý Combo</h1>
        <p className="text-gray-600 mt-1">
          Quản lý các combo, thêm món ăn cho các combo tại nhà hàng
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="w-64">
          <input
            type="text"
            placeholder="Nhập để tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-md px-3 py-2 w-full"
          />
        </div>
        <button
          onClick={() => navigate('/admin/combos/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <FaPlus className="w-4 h-4" />
          <span>Thêm combo</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedCombos.length === combos.length && combos.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="w-16 py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Tên combo</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Giá bán</th>
                <th className="w-28 py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {combos.map((combo, index) => (
                <tr key={combo.id}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedCombos.includes(combo.id)}
                      onChange={() => handleSelectCombo(combo.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="py-3 px-4">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="py-3 px-4 flex items-center space-x-3">
                    {combo.image && (
                      <img
                        src={getImageUrl(combo.image)}
                        alt={combo.name}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-image.jpg';
                        }}
                      />
                    )}
                    <span>{combo.name}</span>
                  </td>
                  <td className="py-3 px-4">{combo.price.toLocaleString('vi-VN')} đ</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => navigate(`/admin/combos/${combo.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/combos/${combo.id}/edit`)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Chỉnh sửa"
                      >
                        <FaPencilAlt className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCombo(combo.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedCombos.length > 0 && (
          <div className="p-3 border-t">
            <button
              onClick={handleDeleteSelected}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
            >
              <FaTrash className="w-4 h-4" />
              <span>Xóa mục đã chọn</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComboManagement; 