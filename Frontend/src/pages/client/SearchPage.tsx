import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Checkbox, Select, Button, Spin, Empty } from 'antd';
import { AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import { categoryService } from '../../services/categoryService';
import { productService } from '../../services/productService';
import { Category } from '../../types/category';
import { Product } from '../../types/product';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import './SearchPage.css';

const { Option } = Select;

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PRODUCT_LIMITS = [6, 12, 18, 24, 9999];

const SearchPage: React.FC = () => {
  const query = useQuery();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [displayType, setDisplayType] = useState<'grid' | 'list'>('grid');
  const [limit, setLimit] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  // Lấy keyword và category từ URL
  useEffect(() => {
    const kw = query.get('keyword') || '';
    setKeyword(kw);
    const cat = query.get('category');
    if (cat && cat !== 'all') setSelectedCategories([cat]);
    else setSelectedCategories([]);
  }, [window.location.search]);

  // Lấy danh mục
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getAll(1, 100);
        if (res.status === 'success' && res.data?.categories) {
          setCategories(res.data.categories);
        }
      } catch (error) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Lấy sản phẩm
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let allProducts: Product[] = [];
        if (selectedCategories.length === 1) {
          const res = await productService.getByCategory(selectedCategories[0]);
          const data: any = res.data;
          let products: Product[] = Array.isArray(data) ? data : data?.products || [];
          allProducts = products;
        } else {
          const res = await productService.search(keyword);
          const data: any = res.data;
          let products: Product[] = Array.isArray(data) ? data : data?.products || [];
          allProducts = products;
        }
        // Lọc theo nhiều danh mục nếu cần
        let filtered = allProducts.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
        if (selectedCategories.length > 1) {
          filtered = filtered.filter(p =>
            Array.isArray(p.categories) &&
            selectedCategories.every(catId => p.categories && p.categories.some(c => c.category?.id === catId))
          );
        }
        setProducts(filtered);
      } catch (e) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [keyword, selectedCategories]);

  // Xử lý chọn danh mục
  const handleCategoryChange = (catId: string) => {
    if (catId === 'all') {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(prev =>
        prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
      );
    }
  };

  // Xử lý đổi kiểu hiển thị
  const handleDisplayType = (type: 'grid' | 'list') => setDisplayType(type);

  // Xử lý đổi số lượng sản phẩm/trang
  const handleLimitChange = (value: number) => setLimit(value);

  // Hiển thị sản phẩm theo limit
  const displayedProducts = products.slice(0, limit === 9999 ? products.length : limit);

  return (
    <div className="search-page-root">
      <div className="search-page-header">
        <div className="search-page-header-left">
          <Button
            type={displayType === 'grid' ? 'primary' : 'default'}
            icon={<AppstoreOutlined />}
            onClick={() => handleDisplayType('grid')}
            style={{ marginRight: 8 }}
          />
          <Button
            type={displayType === 'list' ? 'primary' : 'default'}
            icon={<BarsOutlined />}
            onClick={() => handleDisplayType('list')}
          />
        </div>
        <div className="search-page-header-right">
          <span style={{ marginRight: 8 }}>Show</span>
          <Select value={limit} onChange={handleLimitChange} style={{ width: 80 }}>
            {PRODUCT_LIMITS.map(l => (
              <Option key={l} value={l}>{l === 9999 ? 'Toàn bộ' : l}</Option>
            ))}
          </Select>
        </div>
      </div>
      <div className="search-page-content">
        <div className="search-page-sidebar">
          <div className="search-page-category-title">CATEGORIES</div>
          <Checkbox
            checked={selectedCategories.length === 0}
            onChange={() => handleCategoryChange('all')}
            style={{ marginBottom: 8 }}
          >
            Tất cả danh mục
          </Checkbox>
          <div className="search-page-category-list">
            {categories.map(cat => (
              <Checkbox
                key={cat.id}
                checked={selectedCategories.includes(cat.id)}
                onChange={() => handleCategoryChange(cat.id)}
                style={{ marginBottom: 4 }}
              >
                {cat.name}
              </Checkbox>
            ))}
          </div>
        </div>
        <div className="search-page-products">
          {loading ? (
            <div style={{ textAlign: 'center', marginTop: 40 }}><Spin size="large" /></div>
          ) : displayedProducts.length === 0 ? (
            <Empty description="Không có sản phẩm phù hợp" style={{ marginTop: 40 }} />
          ) : displayType === 'grid' ? (
            <div className="search-product-grid">
              {displayedProducts.map(product => (
                <div className="search-product-card" key={product.id}>
                  <img src={product.image || '/no-image.png'} alt={product.name} className="search-product-img" />
                  <div className="search-product-categories">
                    {product.categories?.map((c, idx) => (
                      <span className="search-product-category" key={c.category.id}>
                        {c.category.name}
                        {idx < (product.categories?.length ?? 0) - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="search-product-name">{product.name}</div>
                  <div className="search-product-price">{product.price?.toLocaleString('vi-VN')} đ</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="search-product-list">
              {displayedProducts.map(product => (
                <div className="search-product-list-item" key={product.id}>
                  <img src={product.image || '/no-image.png'} alt={product.name} className="search-product-list-img" />
                  <div className="search-product-list-info">
                    <div className="search-product-categories">
                      {product.categories?.map((c, idx) => (
                        <span className="search-product-category" key={c.category.id}>
                          {c.category.name}
                          {idx < (product.categories?.length ?? 0) - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                    <div className="search-product-name">{product.name}</div>
                    <div className="search-product-price">{product.price?.toLocaleString('vi-VN')} đ</div>
                    <div className="search-product-desc">{product.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  );
};

export default SearchPage; 