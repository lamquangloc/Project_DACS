import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { categoryService } from '../../services/categoryService';

import { API_URL } from '../../config';

interface FormData {
  name: string;
  description: string;
  image: File | null;
}

const CategoryDetail = () => {
  const { id = 'new' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    image: null
  });
  const [previewImage, setPreviewImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getImageUrl = useCallback((imagePath: string) => {
    if (!imagePath) return '/placeholder-image.jpg';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${API_URL}/${cleanPath}`;
  }, []);

  useEffect(() => {
    const loadCategory = async () => {
      if (id && id !== 'new') {
        try {
          setLoading(true);
          setError(null);
          const response = await categoryService.getById(id);
          
          if (response.status === 'success' && response.data) {
            setFormData({
              name: response.data.name || '',
              description: response.data.description || '',
              image: null
            });
            
            if (response.data.image) {
              setPreviewImage(getImageUrl(response.data.image));
              setImageError(false);
            }
          }
        } catch (error: any) {
          console.error('Error fetching category:', error);
          setError(error.response?.data?.message || 'Có lỗi xảy ra khi tải thông tin danh mục');
        } finally {
          setLoading(false);
        }
      }
    };

    loadCategory();
  }, [id, getImageUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
      setImageError(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
    setPreviewImage('/placeholder-image.jpg');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      if (!formData.name.trim()) {
        setError('Tên danh mục là bắt buộc');
        return;
      }

      if (!formData.description.trim()) {
        setError('Mô tả danh mục là bắt buộc');
        return;
      }

      if (id === 'new' && !formData.image) {
        setError('Hình ảnh là bắt buộc khi tạo mới danh mục');
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('description', formData.description.trim());
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const response = id === 'new' 
        ? await categoryService.create(formDataToSend)
        : await categoryService.update(id, formDataToSend);

      if (response.status === 'success') {
        navigate('/admin/categories');
      } else {
        setError(response.message || 'Có lỗi xảy ra khi lưu danh mục');
      }
    } catch (error: any) {
      console.error('Error saving category:', error);
      setError(error.response?.data?.message || 'Có lỗi xảy ra khi lưu danh mục');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {id === 'new' ? 'Thêm danh mục mới' : 'Chỉnh sửa danh mục'}
      </h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Tên danh mục
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Mô tả
          </label>
          <textarea
            name="description"
            id="description"
            rows={4}
            required
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Hình ảnh</label>
          <div className="mt-1 flex items-center space-x-4">
            {(previewImage && !imageError) ? (
              <div className="relative">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="h-32 w-32 object-cover rounded-lg"
                  onError={handleImageError}
                />
              </div>
            ) : (
              <div className="h-32 w-32 rounded-lg bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Chưa có ảnh</span>
              </div>
            )}
            <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <span>Chọn hình ảnh</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
                required={id === 'new' && !previewImage}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/categories')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryDetail; 