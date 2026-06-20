import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Spin, Table, Progress, App } from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import request from '../api/index.js';

export default function Dashboard() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ cards: [], trend: [] });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await request.get('/dashboard');
      setData(res);
    } catch (e) {
      message.error('获取仪表盘数据失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const colors = ['#1677ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];
  const icons = [
    <ExperimentOutlined style={{ fontSize: 28 }} />,
    <CheckCircleOutlined style={{ fontSize: 28 }} />,
    <CloseCircleOutlined style={{ fontSize: 28 }} />,
    <WarningOutlined style={{ fontSize: 28 }} />,
    <RiseOutlined style={{ fontSize: 28 }} />,
  ];

  return (
    <div className="page-container">
      <div className="page-title">
        <ExperimentOutlined style={{ color: '#1677ff' }} />
        质量仪表盘
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {data.cards.map((item, idx) => (
            <Col xs={24} sm={12} md={8} lg={4} key={idx}>
              <Card className="stat-card" bodyStyle={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Statistic title={item.label} value={item.value} />
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: colors[idx] + '22',
                    color: colors[idx],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icons[idx]}
                  </div>
                </div>
                {item.tip && <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>{item.tip}</div>}
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="近7天检验趋势" className="stat-card">
              {data.trend && data.trend.length > 0 ? (
                <Table
                  dataSource={data.trend}
                  size="small"
                  rowKey="date"
                  pagination={false}
                  columns={[
                    { title: '日期', dataIndex: 'date', width: 100 },
                    { title: '检验总数', dataIndex: 'total', width: 100, render: (v) => <Tag color="blue">{v}</Tag> },
                    { title: '合格数', dataIndex: 'pass', width: 100, render: (v) => <Tag color="green">{v}</Tag> },
                    {
                      title: '合格率', dataIndex: 'rate', render: (v) => (
                        <Progress percent={parseFloat(v)} size="small" status={parseFloat(v) >= 90 ? 'success' : parseFloat(v) >= 70 ? 'active' : 'exception'} />
                      ),
                    },
                  ]}
                />
              ) : (
                <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>近7天暂无检验数据（可在检验录入中创建测试数据）</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="快捷入口" className="stat-card">
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <a href="#/inspection/input" style={{ display: 'block', padding: 16, textAlign: 'center', background: '#f0f5ff', borderRadius: 8, color: '#1677ff', fontWeight: 500 }}>
                    + 检验录入
                  </a>
                </Col>
                <Col span={12}>
                  <a href="#/inspection/list" style={{ display: 'block', padding: 16, textAlign: 'center', background: '#f6ffed', borderRadius: 8, color: '#52c41a', fontWeight: 500 }}>
                    检验记录
                  </a>
                </Col>
                <Col span={12}>
                  <a href="#/defect/list" style={{ display: 'block', padding: 16, textAlign: 'center', background: '#fff1f0', borderRadius: 8, color: '#ff4d4f', fontWeight: 500 }}>
                    不良处理
                  </a>
                </Col>
                <Col span={12}>
                  <a href="#/trace/forward" style={{ display: 'block', padding: 16, textAlign: 'center', background: '#fff7e6', borderRadius: 8, color: '#fa8c16', fontWeight: 500 }}>
                    追溯查询
                  </a>
                </Col>
              </Row>
              <div style={{ marginTop: 20, padding: 16, background: '#fafafa', borderRadius: 8, fontSize: 12, color: '#666' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>测试用例：</div>
                <div>正向追溯: PB-20260618-001</div>
                <div>反向追溯: MB-20260616-003</div>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
