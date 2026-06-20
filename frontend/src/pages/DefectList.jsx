import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Button, Input, Select, Space, DatePicker, Form, Modal, InputNumber, Row, Col, Statistic, Progress, Badge, List, Empty, Radio, Divider, Popconfirm, App,
} from 'antd';
import {
  BugOutlined, SearchOutlined, PlusOutlined, EyeOutlined, CheckOutlined, CloseOutlined, WarningOutlined, ExclamationOutlined, FireOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '../api/index.js';
import dayjs from 'dayjs';
import { DEFECT_TYPE, DEFECT_SEVERITY, DEFECT_STATUS, DISPOSITION_TYPE, APPROVE_STATUS } from '../utils/constants.js';

const { Option } = Select;
const { TextArea } = Input;
const severityIcon = {
  1: <WarningOutlined />,
  2: <ExclamationOutlined />,
  3: <WarningOutlined style={{ color: '#fa8c16' }} />,
  4: <FireOutlined style={{ color: '#ff4d4f' }} />,
};
const dispositionColor = { 1: '#1677ff', 2: '#13c2c2', 3: '#ff4d4f', 4: '#fa8c16', 5: '#722ed1' };

export default function DefectList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [params, setParams] = useState({});
  const [addVisible, setAddVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);
  const [stats, setStats] = useState({ bySeverity: [], byType: [] });

  const fetchList = async (p = page, ps = pageSize, query = params) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ page: p, pageSize: ps, ...query }).toString();
      const res = await request.get(`/defect/records?${qs}`);
      setList(res.list);
      setTotal(res.total);
    } catch (e) {
      message.error('加载列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const bySeverity = [];
      for (let k of Object.keys(DEFECT_SEVERITY)) {
        const qs = new URLSearchParams({ severity: parseInt(k), page: 1, pageSize: 1 }).toString();
        const r = await request.get(`/defect/records?${qs}`);
        bySeverity.push({ label: DEFECT_SEVERITY[k].label, value: r.total || 0 });
      }
      setStats(s => ({ ...s, bySeverity }));
    } catch (e) {}
  };

  useEffect(() => {
    fetchList(1, pageSize, {});
    fetchStats();
  }, []);

  const handleAdd = async (values) => {
    try {
      setAddLoading(true);
      await request.post('/defect/records', {
        ...values,
        defectType: parseInt(values.defectType),
        severity: parseInt(values.severity),
        defectQty: values.defectQty,
        processStatus: parseInt(values.processStatus) || 1,
      });
      message.success('登记成功！');
      setAddVisible(false);
      addForm.resetFields();
      fetchList(1, pageSize, params);
      fetchStats();
    } catch (e) {
      message.error('提交失败: ' + e.message);
    } finally {
      setAddLoading(false);
    }
  };

  const statusProgress = {
    done: list.filter(d => d.processStatus >= 3).length,
    total: list.length,
  };

  const columns = [
    {
      title: '不良单号', dataIndex: 'defectNo', key: 'defectNo', width: 140, fixed: 'left',
      render: (v, r) => (
        <a onClick={() => navigate(`/defect/${r.id}`)} style={{ fontWeight: 600 }}>
          <BugOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />{v}
        </a>
      ),
    },
    { title: '关联批次', dataIndex: 'targetBatchNo', key: 'targetBatchNo', width: 150,
      render: v => v ? <Tag color="blue">{v}</Tag> : '-',
    },
    { title: '不良名称', dataIndex: 'defectName', key: 'defectName', width: 150,
      render: (v, r) => <Space><Badge color={DEFECT_SEVERITY[r.severity]?.color} />{v}{r.defectCode && <Tag style={{ marginLeft: 4 }}>{r.defectCode}</Tag>}</Space>,
    },
    { title: '来源', dataIndex: 'defectType', key: 'defectType', width: 100,
      render: v => <Tag color={DEFECT_TYPE[v]?.color}>{DEFECT_TYPE[v]?.label}</Tag>,
    },
    { title: '严重度', dataIndex: 'severity', key: 'severity', width: 100,
      render: v => (
        <span style={{ color: DEFECT_SEVERITY[v]?.color, fontWeight: 600 }}>
          {severityIcon[v]} {DEFECT_SEVERITY[v]?.label}
        </span>
      ),
    },
    { title: '不良数量', dataIndex: 'defectQty', key: 'defectQty', width: 90,
      render: v => <b style={{ color: '#ff4d4f' }}>{v}</b>,
    },
    { title: '处置进度', key: 'progress', width: 140,
      render: (_, r) => {
        const done = (r.dispositions || []).reduce((acc, d) => acc + (d.dispositionQty || 0), 0);
        const pct = r.defectQty > 0 ? Math.min(100, Math.round(done * 100 / r.defectQty)) : 0;
        return <Progress percent={pct} size="small" format={p => `${done}/${r.defectQty} (${p}%)`} />;
      },
    },
    { title: '状态', dataIndex: 'processStatus', key: 'processStatus', width: 100,
      render: v => {
        const s = DEFECT_STATUS[v];
        return <Badge status={s?.color === 'error' ? 'error' : s?.color === 'warning' ? 'warning' : s?.color === 'success' ? 'success' : 'processing'} text={<b>{s?.label}</b>} />;
      },
    },
    { title: '报告人', dataIndex: 'reporter', key: 'reporter', width: 90 },
    { title: '报告时间', dataIndex: 'reportTime', key: 'reportTime', width: 150,
      render: v => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    { title: '操作', key: 'actions', fixed: 'right', width: 130,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/defect/${r.id}`)}>处置</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-title">
        <BugOutlined style={{ color: '#ff4d4f' }} />
        不良品管理
        <div style={{ marginLeft: 'auto' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddVisible(true)}>登记不良品</Button>
        </div>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {stats.bySeverity?.map((s, idx) => (
          <Col xs={12} sm={8} md={5} key={idx}>
            <Card size="small">
              <Statistic
                title={s.label}
                value={s.value}
                valueStyle={{ color: DEFECT_SEVERITY[idx + 1]?.color, fontSize: 22 }}
                prefix={severityIcon[idx + 1]}
              />
            </Card>
          </Col>
        ))}
        <Col xs={24} md={8}>
          <Card size="small">
            <Statistic title="处理进度" valueRender={() => (
              <Progress
                type="dashboard"
                percent={statusProgress.total ? Math.round((statusProgress.done || 0) * 100 / statusProgress.total) : 0}
                size="small"
              />
            )} />
          </Card>
        </Col>
      </Row>

      <Card className="filter-bar" size="small">
        <Space wrap size="large">
          <Select placeholder="不良来源" allowClear style={{ width: 140 }} onChange={v => setParams(p => ({ ...p, defectType: v }))}>
            {Object.keys(DEFECT_TYPE).map(k => <Option key={k} value={parseInt(k)}>{DEFECT_TYPE[k].label}</Option>)}
          </Select>
          <Select placeholder="严重程度" allowClear style={{ width: 120 }} onChange={v => setParams(p => ({ ...p, severity: v }))}>
            {Object.keys(DEFECT_SEVERITY).map(k => <Option key={k} value={parseInt(k)}>{DEFECT_SEVERITY[k].label}</Option>)}
          </Select>
          <Select placeholder="处理状态" allowClear style={{ width: 140 }} onChange={v => setParams(p => ({ ...p, processStatus: v }))}>
            {Object.keys(DEFECT_STATUS).map(k => <Option key={k} value={parseInt(k)}>{DEFECT_STATUS[k].label}</Option>)}
          </Select>
          <Input.Search placeholder="不良单号/批次号/不良名" allowClear style={{ width: 260 }} enterButton={<SearchOutlined />} onSearch={v => setParams(p => ({ ...p, keyword: v }))} />
          <Space>
            <Button type="primary" onClick={() => fetchList(1, pageSize, params)}>查询</Button>
            <Button onClick={() => { setParams({}); fetchList(1, pageSize, {}); }}>重置</Button>
          </Space>
        </Space>
      </Card>

      <Card className="table-card" style={{ marginTop: 12 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page, pageSize, total,
            showSizeChanger: true,
            showTotal: t => `共 ${t} 条`,
            pageSizeOptions: [10, 20, 50],
            onChange: (p, ps) => { setPage(p); setPageSize(ps); fetchList(p, ps, params); },
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title="登记不良品"
        open={addVisible}
        onCancel={() => setAddVisible(false)}
        onOk={() => addForm.submit()}
        okText="提交"
        confirmLoading={addLoading}
        width={700}
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd} initialValues={{ defectType: 1, severity: 2, defectQty: 1, processStatus: 1 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="关联批次" name="targetBatchNo" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="children"
                  placeholder="选择或输入关联批次"
                  notFoundContent={<span style={{ color: '#888' }}>可自由输入</span>}
                  dropdownStyle={{ display: 'none' }}
                  mode={undefined}
                  allowClear
                >
                  <Option value="PB-20260618-001">PB-20260618-001</Option>
                  <Option value="PB-20260618-002">PB-20260618-002</Option>
                  <Option value="PB-20260618-003">PB-20260618-003</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="不良来源" name="defectType" rules={[{ required: true }]}>
                <Radio.Group buttonStyle="solid">
                  {Object.keys(DEFECT_TYPE).map(k => (
                    <Radio.Button key={k} value={parseInt(k)} style={{ borderColor: DEFECT_TYPE[k].color, color: k < 3 ? DEFECT_TYPE[k].color : undefined }}>
                      {DEFECT_TYPE[parseInt(k)].label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="不良名称" name="defectName" rules={[{ required: true }]}>
                <Input placeholder="例如: 外观划伤、尺寸超差、性能不良" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="不良代码" name="defectCode">
                <Input placeholder="可选，如 DEF-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="严重程度" name="severity" rules={[{ required: true }]}>
                <Radio.Group buttonStyle="solid">
                  {Object.keys(DEFECT_SEVERITY).map(k => (
                    <Radio.Button key={k} value={parseInt(k)} style={{ borderColor: DEFECT_SEVERITY[k].color }}>
                      {DEFECT_SEVERITY[parseInt(k)].label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="不良数量" name="defectQty" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="报告人" name="reporter" rules={[{ required: true }]}>
                <Input placeholder="质检员姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="报告时间" name="reportTime" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="责任部门" name="responsible">
                <Input placeholder="如 成型车间 / 装配车间" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="初始状态" name="processStatus">
                <Select>
                  {Object.keys(DEFECT_STATUS).map(k => <Option key={k} value={parseInt(k)}>{DEFECT_STATUS[k].label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="不良描述" name="defectDesc">
                <TextArea rows={3} placeholder="详细描述不良现象、位置、检测方法等" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
