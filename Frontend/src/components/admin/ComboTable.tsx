import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Combo } from '../../types/combo';
import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa';
import { getImageUrl } from '../../utils/image';

interface ComboTableProps {
  combos: Combo[];
  selectedCombos: string[];
  onSelectCombo: (id: string) => void;
  onSelectAll: () => void;
  onDelete: (ids: string[]) => void;
}

const ComboTable: React.FC<ComboTableProps> = ({
  combos,
  selectedCombos,
  onSelectCombo,
  onSelectAll,
  onDelete
}) => {
  const navigate = useNavigate();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (imagePath: string | undefined) => {
    if (imagePath && !failedImages.has(imagePath)) {
      console.error('Image load error:', imagePath);
      setFailedImages(prev => new Set(prev).add(imagePath));
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedCombos.length === combos.length && combos.length > 0}
                  onChange={onSelectAll}
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
                    onChange={() => onSelectCombo(combo.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="py-3 px-4">{index + 1}</td>
                <td className="py-3 px-4 flex items-center space-x-3">
                  <div className="h-12 w-12 flex-shrink-0">
                    {combo.image && !failedImages.has(combo.image) ? (
                      <img 
                        className="h-12 w-12 object-cover rounded" 
                        src={getImageUrl(combo.image)}
                        alt={combo.name}
                        onError={() => handleImageError(combo.image)}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">Không có ảnh</span>
                      </div>
                    )}
                  </div>
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
                      onClick={() => onDelete([combo.id])}
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
    </div>
  );
};

export default ComboTable; 