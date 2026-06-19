import React, { useEffect, useState } from 'react';
import {
  Table, Tag, Space, Card, Input, Select, Button, Drawer, Descriptions, List,
  Modal, message, Badge, Row, Col, Statistic,
} from 'antd';
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import request from '../api/index.js';
import dayjs from 'dayjs';
import { INSPECTION_TYPE, INSPECTION_RESULT } from '../utils/constants.js';

const { Option } = Select;

export default function InspectionList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [params, setParams] = useState({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState({ byType: [], byResult: [] });

  const fetchList = async (p = page, ps = pageSize, ps2 = params) => {
    try {
      setLoading(true);
      const q = new URLSearchParams({ page: p, pageSize: ps, ...ps2 }).toString();
      const res = await request.get(`/inspection/records?${q}`);
      setData(res.list || []);
      setTotal(res.total || 0);
      setPage(p);
      setPageSize(ps);
    } catch (e) {
      message.error('加载失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await request.get('/inspection/stats');
      setStats(res);
    } catch (e) {}
  };

  useEffect(() => {
    fetchList(1, pageSize, params);
    fetchStats();
  }, []);

  const viewDetail = async (record) => {
    try {
      const res = await request.get(`/inspection/records/${record.id}`);
      setDetail(res);
      setDetailVisible(true);
    } catch (e) {
      message.error('加载详情失败');
    }
  };

  const columns = [
    {
      title: '检验单号',
      dataIndex: 'inspectionNo',
      width: 180,
      render: (v) => <a onClick={() => { const rec = data.find(r => r.inspectionNo === v); if (rec) viewDetail(rec); }}><b>{v}</b></a>,
    },
    {
      title: '类型',
      dataIndex: 'inspectionType',
      width: 110,
      render: (v) => <Tag color={INSPECTION_TYPE[v]?.color}>{INSPECTION_TYPE[v]?.label}</Tag>,
    },
    {
      title: '被检批次',
      dataIndex: 'targetBatchNo',
      width: 200,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 500 }}>{v}</span>
          <span style={{ fontSize: 11, color: '#999' }}>ID: {r.targetBatchId}</span>
        </Space>
      ),
    },
    {
      title: '标准',
      dataIndex: 'stdName',
      width: 180,
      render: (v) => v ? <Tag color="purple">{v}</Tag> : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '数量',
      width: 200,
      render: (_, r) => (
        <Space>
          <Statistic title="检" value={r.inspectQty} valueStyle={{ fontSize: 14, fontWeight: 500 }} />
          <Statistic title="合" value={r.qualifiedQty} valueStyle={{ fontSize: 14, color: '#52c41a' }} />
          <Statistic title="不" value={r.defectQty} valueStyle={{ fontSize: 14, color: '#ff4d4f' }} />
        </Space>
      ),
    },
    {
      title: '判定',
      dataIndex: 'result',
      width: 120,
      render: (v) => {
        const c = INSPECTION_RESULT[v] || { label: '未知', color: 'default' };
        return <Tag color={c.color} style={{ fontSize: 13, padding: '2px 10px' }}><b>{c.label}</b></Tag>;
      },
    },
    { title: '检验员', dataIndex: 'inspector', width: 100 },
    {
      title: '检验时间',
      dataIndex: 'inspectTime',
      width: 170,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 90,
      render: (_, r) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => viewDetail(r)}>详情</Button>
      ),
    },
  ];

  const iconMap = { 1: <CheckCircleOutlined />, 2: <CloseCircleOutlined />, 3: <ExclamationCircleOutlined /> };

  return (
    <div className="page-container">
      <div className="page-title">
        <FileTextOutlined style={{ color: '#1677ff' }} />
        检验记录
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {stats.byResult?.map((s, idx) => (
          <Col xs={12} sm={6} md={4} key={idx}>
            <Card size="small" className="stat-card">
              <Statistic
                title={s.label}
                value={s.value}
                prefix={iconMap[idx + 1] || <FileTextOutlined />}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="filter-bar" size="small">
        <Space wrap size="large">
          <Select
            placeholder="检验类型"
            allowClear
            style={{ width: 140 }}
            onChange={v => setParams(p => ({ ...p, inspectionType: v }))}
          >
            {Object.keys(INSPECTION_TYPE).map(k => (
              <Option key={k} value={parseInt(k)}>{INSPECTION_TYPE[k].label}</Option>
            ))}
          </Select>
          <Select
            placeholder="判定结果"
            allowClear
            style={{ width: 140 }}
            onChange={v => setParams(p => ({ ...p, result: v }))}
          >
            {Object.keys(INSPECTION_RESULT).map(k => (
              <Option key={k} value={parseInt(k)}>{INSPECTION_RESULT[k].label}</Option>
            ))}
          </Select>
          <Input.Search
            placeholder="单号/批次号/检验员"
            allowClear
            style={{ width: 240 }}
            enterButton={<SearchOutlined />}
            onSearch={v => setParams(p => ({ ...p, keyword: v }))}
          />
          <Space>
            <Button type="primary" onClick={() => fetchList(1, pageSize, params)}>查询</Button>
            <Button onClick={() => { setParams({}); fetchList(1, pageSize, {}); }}>重置</Button>
          </Space>
        </Space>
      </Card>

      <Card className="stat-card">
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{
            total,
            current: page,
            pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条记录`,
            onChange: (p, ps) => fetchList(p, ps, params),
          }}
        />
      </Card>

      <Drawer
        title={detail ? `检验单详情 - ${detail.inspectionNo}` : '检验单详情'}
        width={780}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="检验类型"><Tag color={INSPECTION_TYPE[detail.inspectionType]?.color}>{INSPECTION_TYPE[detail.inspectionType]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label="判定结果">
                <Badge status={INSPECTION_RESULT[detail.result]?.color === 'success' ? 'success' : INSPECTION_RESULT[detail.result]?.color === 'error' ? 'error' : 'warning'}
                  text={<b style={{ fontSize: 14 }}>{INSPECTION_RESULT[detail.result]?.label}</b>} />
              </Descriptions.Item>
              <Descriptions.Item label="被检批次">{detail.targetBatchNo}</Descriptions.Item>
              <Descriptions.Item label="检验标准">{detail.stdName || '-'}</Descriptions.Item>
              <Descriptions.Item label="检验数量">{detail.inspectQty}</Descriptions.Item>
              <Descriptions.Item label="合格/不合格">
                <span style={{ color: '#52c41a' }}>{detail.qualifiedQty}</span> / <span style={{ color: '#ff4d4f' }}>{detail.defectQty}</span>
              </Descriptions.Item>
              <Descriptions.Item label="检验员">{detail.inspector}</Descriptions.Item>
              <Descriptions.Item label="检验时间">{dayjs(detail.inspectTime).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="综合结论" span={2}>{detail.remark || '-'}</Descriptions.Item>
            </Descriptions>

            <div className="trace-section-title">检验项目明细 ({detail.items?.length || 0} 项)</div>
            <List
              size="small"
              bordered
              dataSource={detail.items || []}
              locale={{ emptyText: '暂无检验项明细' }}
              renderItem={(item, idx) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <span style={{ width: 24, color: '#999' }}>{idx + 1}.</span>
                        <b>{item.itemName}</b>
                        <Tag color={item.result === 1 ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                          {item.result === 1 ? '合格' : '不合格'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space size="large" wrap style={{ color: '#555' }}>
                        <span>标准值：<b style={{ color: '#1677ff' }}>{item.standardValue || '-'}</b> {item.unit || ''}</span>
                        <span>实测值：<b style={{ color: item.result === 1 ? '#52c41a' : '#ff4d4f' }}>{item.actualValue || '-'}</b> {item.unit || ''}</span>
                        {item.method && <span style={{ color: '#888' }}>方法：{item.method}</span>}
                        {item.memo && <span style={{ color: '#888' }}>备注：{item.memo}</span>}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </div>
  );
}
