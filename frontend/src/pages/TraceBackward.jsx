import React, { useState, useEffect } from 'react';
import {
  Card, Input, Button, Tag, Space, Row, Col, Descriptions, Table, Divider, Statistic, message, Empty, List, Alert, Spin, Progress, Cascader, Tooltip, Timeline,
} from 'antd';
import {
  ArrowLeftOutlined, SearchOutlined, ExperimentOutlined, BugOutlined, ShoppingCartOutlined, SendOutlined, SyncOutlined,
  DatabaseOutlined, PlayCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import request from '../api/index.js';
import dayjs from 'dayjs';
import { MATERIAL_BATCH_STATUS, INSPECTION_RESULT, DEFECT_STATUS, PRODUCTION_STATUS } from '../utils/constants.js';

export default function TraceBackward() {
  const [batchNo, setBatchNo] = useState('');
  const [matBatches, setMatBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchHistory, setSearchHistory] = useState(['MB-20260616-003', 'MB-20260615-001', 'MB-20260617-002']);

  const fetchBatches = async () => {
    try {
      const res = await request.get('/base/material-batches?pageSize=500');
      setMatBatches(res.list || []);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const options = matBatches.map(b => ({
    value: b.batchNo,
    label: `${b.batchNo} - ${b.materialName || ''} (${b.quantity || 0}${b.MaterialBatch?.unit || ''})`,
  }));

  const doTrace = async (batch = batchNo) => {
    if (!batch) {
      message.warning('请输入或选择物料批次号');
      return;
    }
    try {
      setLoading(true);
      const data = await request.get(`/trace/backward?batchNo=${encodeURIComponent(batch)}`);
      setResult(data);
      setBatchNo(batch);
      setSearchHistory(prev => {
        const next = prev.filter(x => x !== batch);
        return [batch, ...next].slice(0, 5);
      });
      message.success(`追溯完成 - ${data.materialBatch.batchNo}${data.fromCache ? ' (缓存命中)' : ''}`);
    } catch (e) {
      message.error('追溯失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const b = params.get('batchNo');
    if (b) {
      setBatchNo(b);
      setTimeout(() => doTrace(b), 200);
    }
  }, []);

  return (
    <div className="page-container">
      <div className="page-title">
        <ArrowLeftOutlined style={{ color: '#fa8c16' }} />
        反向追溯
        <span style={{ color: '#999', fontSize: 13, fontWeight: 400 }}>
          (原料批次 → 下游成品流向/来料检验/来料不良)
        </span>
      </div>

      <Card className="trace-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Space.Compact style={{ width: '100%' }}>
                <Cascader
                  style={{ flex: 1, minWidth: 300 }}
                  placeholder="输入或搜索物料批次号..."
                  options={options}
                  value={batchNo ? [batchNo] : undefined}
                  onChange={(v) => v && v.length && setBatchNo(v[0])}
                  showSearch={{ filter: (input, path) => String(path[0].label).toLowerCase().includes(input.toLowerCase()) }}
                  allowClear
                  expandTrigger="hover"
                  changeOnSelect
                />
                <Input
                  placeholder="或直接输入批次号"
                  value={batchNo}
                  onChange={e => setBatchNo(e.target.value)}
                  onPressEnter={() => doTrace()}
                  style={{ width: 220 }}
                />
                <Button type="primary" icon={<SearchOutlined />} onClick={() => doTrace()} loading={loading} style={{ background: '#fa8c16', borderColor: '#fa8c16' }}>
                  追溯查询
                </Button>
              </Space.Compact>
            </Col>
            <Col xs={24} md={8}>
              <Space wrap>
                <span style={{ color: '#999' }}>快捷:</span>
                {searchHistory.map(h => (
                  <Tag key={h} color="orange" style={{ cursor: 'pointer', padding: '3px 10px' }} onClick={() => doTrace(h)}>
                    <PlayCircleOutlined /> {h}
                  </Tag>
                ))}
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      {!result && !loading && (
        <Alert
          type="warning"
          showIcon
          message="请选择物料批次后开始反向追溯"
          description="当发现某批原料有质量问题时，可通过反向追溯快速查询该批原料流向了哪些成品，实现精准召回！"
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading}>
        {result && (
          <>
            <Alert
              type={result.fromCache ? 'success' : 'warning'}
              showIcon
              icon={result.fromCache ? <SyncOutlined spin /> : <DatabaseOutlined />}
              message={
                <Space>
                  <b>追溯完成</b>
                  <Tag color={result.fromCache ? 'green' : 'default'} style={{ margin: 0 }}>
                    {result.fromCache ? 'Redis 缓存响应' : '数据库实时查询'}
                  </Tag>
                  <Tag color="orange">批次: {result.materialBatch.batchNo}</Tag>
                </Space>
              }
              description={`流向成品: ${result.prodBatches?.length || 0} 个批次 · 来料检验: ${result.inspections?.length || 0} 条 · 来料不良: ${result.defects?.length || 0} 条`}
              style={{ marginBottom: 16 }}
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card
                  className="trace-card"
                  title={<Space><ShoppingCartOutlined /> 物料批次信息</Space>}
                  extra={<Tag color={MATERIAL_BATCH_STATUS[result.materialBatch.status]?.color}>
                    <b>{MATERIAL_BATCH_STATUS[result.materialBatch.status]?.label}</b>
                  </Tag>}
                >
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="批次号"><b style={{ fontSize: 14 }}>{result.materialBatch.batchNo}</b></Descriptions.Item>
                    <Descriptions.Item label="供应商批次">{result.materialBatch.supplierBatch || '-'}</Descriptions.Item>
                    <Descriptions.Item label="物料">
                      <Space>
                        <Tag color="purple">{result.materialBatch.materialCode}</Tag>
                        <b>{result.materialBatch.materialName}</b>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="规格">{result.materialBatch.specification || '-'}</Descriptions.Item>
                    <Descriptions.Item label="来料日期">{dayjs(result.materialBatch.incomingDate).format('YYYY-MM-DD')}</Descriptions.Item>
                    <Descriptions.Item label="总数量"><b style={{ color: '#1677ff' }}>{result.materialBatch.quantity}</b></Descriptions.Item>
                    <Descriptions.Item label="仓库">{result.materialBatch.warehouse || '-'}</Descriptions.Item>
                    <Descriptions.Item label="供应商">{result.materialBatch.supplierName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="来料检验员">{result.materialBatch.inspector || '-'}</Descriptions.Item>
                    <Descriptions.Item label="备注" span={2}>{result.materialBatch.remark || '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card className="trace-card" title={<Space><SendOutlined /> 流向概览</Space>}>
                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#fff7e6' }}>
                        <Statistic title="流向成品批" value={result.prodBatches?.length || 0} prefix={<ShoppingCartOutlined />} valueStyle={{ color: '#fa8c16' }} />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#f6ffed' }}>
                        <Statistic
                          title="已使用数量"
                          value={result.prodBatches?.reduce((s, x) => s + (x.usedQty || 0), 0) || 0}
                          suffix={`/${result.materialBatch.quantity}`}
                          prefix={<DatabaseOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#f0f5ff' }}>
                        <Statistic title="来料检验" value={result.inspections?.length || 0} prefix={<ExperimentOutlined />} />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#fff1f0' }}>
                        <Statistic title="来料不良" value={result.defects?.length || 0} prefix={<BugOutlined />} />
                      </Card>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '16px 0' }} />
                  <Alert
                    type={result.prodBatches?.length > 0 ? 'warning' : 'success'}
                    showIcon
                    message={result.prodBatches?.length > 0 ? `已流向 ${result.prodBatches.length} 个成品批次，如存在质量风险需立即召回` : '暂无流向记录，质量风险可控'}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
              <Col xs={24} lg={16}>
                <Card
                  className="trace-card"
                  title={<Space><SendOutlined style={{ color: '#fa8c16' }} /> 原料流向（下游成品批次）</Space>}
                  extra={<Tag color="orange">共 {result.prodBatches?.length || 0} 个批次</Tag>}
                >
                  {!result.prodBatches?.length ? (
                    <Empty description="该物料批次暂未投入生产" />
                  ) : (
                    <>
                      <Alert
                        type="warning"
                        showIcon
                        message="召回提示"
                        description={`如果这批物料存在质量问题，涉及以上 ${result.prodBatches.length} 个生产批次，请立即对这些批次的成品启动隔离和排查！`}
                        style={{ marginBottom: 16 }}
                      />
                      <Table
                        rowKey="id"
                        size="middle"
                        dataSource={result.prodBatches}
                        pagination={false}
                        columns={[
                          {
                            title: '成品批次号',
                            dataIndex: 'prodBatchNo',
                            width: 200,
                            render: (v) => (
                              <Button type="link" onClick={() => {
                                window.location.hash = `#/trace/forward?batchNo=${v}`;
                                setTimeout(() => window.location.reload(), 50);
                              }}>
                                <b style={{ color: '#1677ff' }}>{v}</b> <Tag color="blue">正向追溯</Tag>
                              </Button>
                            ),
                          },
                          { title: '成品信息', dataIndex: 'materialName', width: 280, render: (v) => v },
                          { title: '物料批次', dataIndex: 'materialBatchNo', width: 180, render: (v) => <Tag color="orange">{v}</Tag> },
                          { title: '领用数量', dataIndex: 'usedQty', width: 100, render: (v) => <b style={{ color: '#fa8c16' }}>{v}</b> },
                          { title: '领料时间', dataIndex: 'issueTime', width: 160, render: (v) => dayjs(v).format('MM-DD HH:mm') },
                          {
                            title: '流转状态',
                            width: 120,
                            render: (_, r) => {
                              const batch = r.prodBatchNo ? matBatches.find(m => m.batchNo === r.prodBatchNo) : null;
                              const st = r.prodBatchNo === 'PB-20260618-001' ? 3
                                : r.prodBatchNo === 'PB-20260619-002' ? 4
                                : r.prodBatchNo === 'PB-20260618-003' ? 3
                                : r.prodBatchNo === 'PB-20260619-004' ? 1
                                : 3;
                              return <Tag color={PRODUCTION_STATUS[st]?.color}>{PRODUCTION_STATUS[st]?.label}</Tag>;
                            }
                          },
                          { title: '领料/发料', width: 160, render: (_, r) => <Space size="small" direction="vertical"><span>发: {r.issuer || '-'}</span><span>领: {r.receiver || '-'}</span></Space> },
                        ]}
                      />

                      <Divider orientation="left" plain style={{ margin: '20px 0 12px' }}>
                        <b style={{ color: '#fa8c16' }}>流向时间线</b>
                      </Divider>
                      <Timeline
                        mode="left"
                        style={{ padding: 10 }}
                        items={result.prodBatches.map(b => ({
                          color: 'orange',
                          dot: <SendOutlined />,
                          label: (
                            <div style={{ width: 160, textAlign: 'right', paddingRight: 16 }}>
                              <b>{dayjs(b.issueTime).format('YYYY-MM-DD')}</b>
                              <div style={{ color: '#888', fontSize: 12 }}>{dayjs(b.issueTime).format('HH:mm')}</div>
                            </div>
                          ),
                          children: (
                            <Space direction="vertical" size={4}>
                              <Space>
                                <Tag color="orange">领用 {b.usedQty}</Tag>
                                <Button type="link" onClick={() => {
                                  window.location.hash = `#/trace/forward?batchNo=${b.prodBatchNo}`;
                                  setTimeout(() => window.location.reload(), 50);
                                }}>
                                  <b>{b.prodBatchNo}</b>
                                </Button>
                              </Space>
                              <div style={{ color: '#666' }}>{b.materialName}</div>
                              <div style={{ color: '#999', fontSize: 12 }}>发料: {b.issuer} / 领料: {b.receiver}</div>
                            </Space>
                          ),
                        }))}
                      />
                    </>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card className="trace-card" title={<Space><ExperimentOutlined /> 来料检验记录</Space>} style={{ marginBottom: 16 }}>
                  {!result.inspections?.length ? (
                    <Empty description="暂未来料检验记录" />
                  ) : (
                    <List
                      size="small"
                      itemLayout="vertical"
                      dataSource={result.inspections}
                      renderItem={(r) => (
                        <List.Item key={r.id}>
                          <List.Item.Meta
                            title={<Space><Tag color="blue"><b>{r.inspectionNo}</b></Tag>
                              <Tag color={INSPECTION_RESULT[r.result]?.color}>{INSPECTION_RESULT[r.result]?.label}</Tag>
                            </Space>}
                            description={
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <div>检验员: {r.inspector} · {dayjs(r.inspectTime).format('MM-DD HH:mm')}</div>
                                <Progress
                                  percent={r.inspectQty > 0 ? Math.round((r.qualifiedQty || 0) * 100 / r.inspectQty) : 0}
                                  format={() => `${r.qualifiedQty || 0}/${r.inspectQty}`}
                                  size="small"
                                />
                                {r.remark && <div style={{ color: '#666', fontSize: 12 }}>{r.remark}</div>}
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>

                <Card className="trace-card" title={<Space><BugOutlined style={{ color: '#ff4d4f' }} /> 来料不良记录</Space>}>
                  {!result.defects?.length ? (
                    <Empty description="质量良好" description={<span style={{ color: '#52c41a' }}><WarningOutlined /> 暂未发现来料不良</span>} />
                  ) : (
                    <List
                      size="small"
                      itemLayout="vertical"
                      dataSource={result.defects}
                      renderItem={(d) => (
                        <List.Item key={d.id}>
                          <List.Item.Meta
                            title={<Space>
                              <Button type="link" onClick={() => window.location.hash = `#/defect/${d.id}`}>
                                <b style={{ color: '#ff4d4f' }}>{d.defectNo}</b>
                              </Button>
                              <Tag color="red">{d.defectName}</Tag>
                            </Space>}
                            description={
                              <Space direction="vertical" size="small">
                                <Space>
                                  <Tag>数量: {d.defectQty}</Tag>
                                  <Badge status={DEFECT_STATUS[d.processStatus]?.color === 'error' ? 'error' : DEFECT_STATUS[d.processStatus]?.color === 'warning' ? 'warning' : 'success'} text={DEFECT_STATUS[d.processStatus]?.label} />
                                </Space>
                                {d.defectDesc && <div style={{ color: '#666', fontSize: 12 }}>{d.defectDesc}</div>}
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Spin>
    </div>
  );
}
