import React, { useState, useEffect } from 'react';
import { Card, Radio, Table, Spin } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import dashboardService, { DashboardStats } from '../../services/dashboardService';

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getStats(timeRange);
      if (response.status === 'success' && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getYAxisConfig = (timeRange: TimeRange) => {
    switch (timeRange) {
      case 'today':
        return {
          domain: [0, 2000000],
          ticks: [0, 400000, 800000, 1200000, 1600000, 2000000]
        };
      case 'week':
        return {
          domain: [2000000, 10000000],
          ticks: [2000000, 4000000, 6000000, 8000000, 10000000]
        };
      case 'month':
        return {
          domain: [10000000, 30000000],
          ticks: [10000000, 15000000, 20000000, 25000000, 30000000]
        };
      case 'year':
        return {
          domain: [30000000, 80000000],
          ticks: [30000000, 40000000, 50000000, 60000000, 70000000, 80000000]
        };
      case 'all':
        return {
          domain: [80000000, 150000000],
          ticks: [80000000, 100000000, 120000000, 140000000, 150000000]
        };
      default:
        return {
          domain: [0, 2000000],
          ticks: [0, 400000, 800000, 1200000, 1600000, 2000000]
        };
    }
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'image',
      key: 'image',
      render: (image: string) => (
        <img 
          src={image} 
          alt="product" 
          style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }} 
        />
      ),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => formatCurrency(price),
    },
    {
      title: 'Số lượng bán',
      dataIndex: 'totalSold',
      key: 'totalSold',
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded shadow">
          <p className="text-blue-600 font-semibold mb-1">
            {`Doanh thu: ${formatCurrency(payload[0].value)}`}
          </p>
          <p className="text-green-600 font-semibold">
            {`Lợi nhuận: ${formatCurrency(payload[1].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const PieChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded shadow">
          <p className="font-semibold">{`${payload[0].name}`}</p>
          <p>{`${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="mb-6">
        <Radio.Group value={timeRange} onChange={e => setTimeRange(e.target.value)}>
          <Radio.Button value="today">Hôm nay</Radio.Button>
          <Radio.Button value="week">Tuần này</Radio.Button>
          <Radio.Button value="month">Tháng này</Radio.Button>
          <Radio.Button value="year">Năm nay</Radio.Button>
          <Radio.Button value="all">Tất cả</Radio.Button>
        </Radio.Group>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card className="hover:shadow-lg transition-shadow">
          <div className="text-lg font-semibold mb-2 text-gray-600">Hóa đơn</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.totalOrders || 0}</div>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <div className="text-lg font-semibold mb-2 text-gray-600">Doanh thu</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(stats?.totalRevenue || 0)}
          </div>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <div className="text-lg font-semibold mb-2 text-gray-600">Khách hàng</div>
          <div className="text-3xl font-bold text-purple-600">{stats?.totalCustomers || 0}</div>
        </Card>
      </div>

      <Card className="mb-6">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={stats?.revenueData ? stats.revenueData.labels.map((label, index) => ({
              name: label,
              revenue: stats.revenueData.revenue[index],
              profit: stats.revenueData.profit[index],
            })) : []}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#666"
              tick={{ fill: '#666' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#666"
              tick={{ fill: '#666' }}
              domain={getYAxisConfig(timeRange).domain}
              ticks={getYAxisConfig(timeRange).ticks}
              tickFormatter={(value) => formatCurrency(value)}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#1890ff"
              strokeWidth={2}
              dot={{ fill: '#1890ff' }}
              activeDot={{ r: 8 }}
              name="Doanh thu"
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#ff7a45"
              strokeWidth={2}
              dot={{ fill: '#ff7a45' }}
              activeDot={{ r: 8 }}
              name="Lợi nhuận"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Thống kê sản phẩm" className="hover:shadow-lg transition-shadow">
          <Table
            dataSource={stats?.productStats || []}
            columns={columns}
            pagination={{ pageSize: 10 }}
            rowKey="id"
            className="overflow-x-auto"
          />
        </Card>
        <Card title="Top 5 sản phẩm bán chạy" className="hover:shadow-lg transition-shadow">
          <div className="flex justify-center">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={stats?.topProducts || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="percentage"
                  animationDuration={1000}
                >
                  {stats?.topProducts.map((_entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieChartTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard; 