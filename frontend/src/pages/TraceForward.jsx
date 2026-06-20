import React, { useState, useEffect } from 'react';
import {
  Card, Input, Button, Tag, Space, Row, Col, Descriptions, Table, Timeline, Divider, Statistic, Tabs, Empty, List, Tooltip, Badge, Alert, Progress, Spin, Cascader, App,
} from 'antd';
import {
  ArrowRightOutlined, SearchOutlined, ExperimentOutlined, BugOutlined, ShopOutlined, RobotOutlined, TeamOutlined,
  DatabaseOutlined, ThunderboltOutlined, SyncOutlined, DashboardOutlined, CheckCircleOutlined, WarningOutlined,
  DownCircleOutlined, PlayCircleOutlined, CloudServerOutlined,
} from '@ant-design/icons';
import request from '../api/index.js';
import dayjs from 'dayjs';
import { PRODUCTION_STATUS, MATERIAL_BATCH_STATUS, INSPECTION_RESULT, DEFECT_STATUS } from '../utils/constants.js';

export default function TraceForward() {
  const { message } = App.useApp();
  const [batchNo, setBatchNo] = useState('');
  const [prodBatches, setProdBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchHistory, setSearchHistory] = useState(['PB-20260618-001', 'PB-20260619-002']);

  const fetchBatches = async () => {
    try {
      const res = await request.get('/base/production-batches?pageSize=500');
      setProdBatches(res.list || []);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const options = prodBatches.map(b => ({
    value: b.batchNo,
    label: `${b.batchNo} - ${b.productName || ''} (${b.actualQty || 0}/${b.plannedQty || 0})`,
  }));

  const doTrace = async (batch = batchNo) => {
    if (!batch) {
      message.warning('请输入或选择生产批次号');
      return;
    }
    try {
      setLoading(true);
      const data = await request.get(`/trace/forward?batchNo=${encodeURIComponent(batch)}`);
      setResult(data);
      setBatchNo(batch);
      setSearchHistory(prev => {
        const next = prev.filter(x => x !== batch);
        return [batch, ...next].slice(0, 5);
      });
      message.success(`追溯完成 - ${data.prodBatch.batchNo}${data.fromCache ? ' (缓存命中)' : ''}`);
    } catch (e) {
      message.error('追溯失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-title">
        <ArrowRightOutlined style={{ color: '#1677ff' }} />
        正向追溯
        <span style={{ color: '#999', fontSize: 13, fontWeight: 400 }}>
          (成品批次 → 上游物料/设备/班组/检验/不良)
        </span>
      </div>

      <Card className="trace-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Space.Compact style={{ width: '100%' }}>
                <Cascader
                  style={{ flex: 1, minWidth: 300 }}
                  placeholder="输入或搜索生产批次号..."
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
                <Button type="primary" icon={<SearchOutlined />} onClick={() => doTrace()} loading={loading} size="middle">
                  追溯查询
                </Button>
              </Space.Compact>
            </Col>
            <Col xs={24} md={8}>
              <Space wrap>
                <span style={{ color: '#999' }}>快捷:</span>
                {searchHistory.map(h => (
                  <Tag key={h} color="blue" style={{ cursor: 'pointer', padding: '3px 10px' }} onClick={() => doTrace(h)}>
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
          type="info"
          showIcon
          message="请选择生产批次后开始正向追溯"
          description="追溯内容包括：生产批次基础信息、所用物料批次、加工设备/班组/工序、检验记录、不良记录。热点批次（访问≥3次）自动使用Redis缓存加速。"
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading}>
        {result && (
          <>
            <Alert
              type={result.fromCache ? 'success' : 'info'}
              showIcon
              icon={result.fromCache ? <SyncOutlined spin /> : <DatabaseOutlined />}
              message={
                <Space>
                  <b>追溯完成</b>
                  <Tag color={result.fromCache ? 'green' : 'default'} style={{ margin: 0 }}>
                    {result.fromCache ? 'Redis 缓存响应' : '数据库实时查询'}
                  </Tag>
                  <Tag color="blue">批次: {result.prodBatch.batchNo}</Tag>
                </Space>
              }
              description={`物料: ${result.materialUsed?.length || 0} 条 · 工序: ${result.processLogs?.length || 0} 条 · 检验: ${result.inspections?.length || 0} 条 · 不良: ${result.defects?.length || 0} 条`}
              style={{ marginBottom: 16 }}
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card
                  className="trace-card"
                  title={<Space><ShopOutlined /> 成品批次信息</Space>}
                  extra={<Tag color={PRODUCTION_STATUS[result.prodBatch.status]?.color}>
                    <b>{PRODUCTION_STATUS[result.prodBatch.status]?.label}</b>
                  </Tag>}
                >
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="批次号"><b style={{ fontSize: 14 }}>{result.prodBatch.batchNo}</b></Descriptions.Item>
                    <Descriptions.Item label="工单号">{result.prodBatch.workOrder || '-'}</Descriptions.Item>
                    <Descriptions.Item label="产品">
                      <Space>
                        <Tag color="purple">{result.prodBatch.productCode}</Tag>
                        <b>{result.prodBatch.productName}</b>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="生产日期">{dayjs(result.prodBatch.productionDate).format('YYYY-MM-DD')}</Descriptions.Item>
                    <Descriptions.Item label="计划产量">{result.prodBatch.plannedQty}</Descriptions.Item>
                    <Descriptions.Item label="实际产量">
                      <Progress
                        type="line"
                        percent={result.prodBatch.plannedQty > 0 ? Math.min(100, Math.round(result.prodBatch.actualQty * 100 / result.prodBatch.plannedQty)) : 0}
                        format={() => <b>{result.prodBatch.actualQty}</b>}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label="生产线">{result.prodBatch.productionLine || '-'}</Descriptions.Item>
                    <Descriptions.Item label="创建人">{result.prodBatch.createdBy || '-'}</Descriptions.Item>
                    <Descriptions.Item label="备注" span={2}>{result.prodBatch.remark || '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card className="trace-card" title={<Space><DatabaseOutlined /> 追溯概览</Space>}>
                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#f0f5ff' }}>
                        <Statistic title="使用物料" value={result.materialUsed?.length || 0} prefix={<ShopOutlined />} />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#fff7e6' }}>
                        <Statistic title="加工工序" value={result.processLogs?.length || 0} prefix={<RobotOutlined />} />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#f6ffed' }}>
                        <Statistic title="检验记录" value={result.inspections?.length || 0} prefix={<ExperimentOutlined />} />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ background: '#fff1f0' }}>
                        <Statistic title="不良记录" value={result.defects?.length || 0} prefix={<BugOutlined />} />
                      </Card>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '16px 0' }} />
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Alert type="info" showIcon message="追溯链路" description="成品 → 物料/加工 → 检验 → 不良" size="small" />
                  </Space>
                </Card>
              </Col>
            </Row>

            <Tabs
              defaultActiveKey="materials"
              style={{ marginTop: 16 }}
              items={[
                {
                  key: 'materials',
                  label: <Space><ShopOutlined />所用物料 ({result.materialUsed?.length || 0})</Space>,
                  children: (
                    <Card className="trace-card">
                      {!result.materialUsed?.length ? <Empty description="本批次未关联物料" /> : (
                        <Table
                          rowKey="id"
                          size="middle"
                          dataSource={result.materialUsed}
                          pagination={false}
                          columns={[
                            { title: '物料编码', dataIndex: 'materialCode', width: 120, render: v => <Tag color="purple"><b>{v}</b></Tag> },
                            { title: '物料名称', dataIndex: 'materialName', width: 150 },
                            { title: '物料批次号', dataIndex: 'materialBatchNo', width: 200, render: v => (
                              <Button type="link" onClick={() => window.open(`#/trace/backward?batchNo=${v}`, '_blank')}>
                                <b style={{ color: '#1677ff' }}>{v}</b> <DownCircleOutlined />反向
                              </Button>
                            )},
                            { title: '成品批次', dataIndex: 'prodBatchNo', width: 200, render: v => <Tag color="blue">{v}</Tag> },
                            { title: '使用数量', dataIndex: 'usedQty', width: 100, render: v => <b>{v}</b> },
                            { title: '领料时间', dataIndex: 'issueTime', width: 160, render: v => dayjs(v).format('YYYY-MM-DD HH:mm') },
                            { title: '发料/领料', width: 160, render: (_, r) => <Space size="small" direction="vertical"><span>发: {r.issuer || '-'}</span><span>领: {r.receiver || '-'}</span></Space> },
                          ]}
                        />
                      )}
                    </Card>
                  ),
                },
                {
                  key: 'process',
                  label: <Space><RobotOutlined />加工过程 ({result.processLogs?.length || 0})</Space>,
                  children: (
                    <Card className="trace-card">
                      {!result.processLogs?.length ? <Empty description="暂无加工记录" /> : (
                        <Timeline
                          mode="left"
                          style={{ padding: 20 }}
                          items={result.processLogs.map((log, idx) => ({
                            color: log.defectQty > 0 ? 'red' : 'blue',
                            dot: log.defectQty > 0 ? <WarningOutlined /> : <RobotOutlined />,
                            label: (
                              <Space direction="vertical" size={4} style={{ width: 180, textAlign: 'right', paddingRight: 16 }}>
                                <b>{dayjs(log.startTime).format('MM-DD HH:mm')}</b>
                                {log.endTime && <span style={{ color: '#888', fontSize: 12 }}>至 {dayjs(log.endTime).format('HH:mm')}</span>}
                                <Tag color="geekblue" style={{ width: 'fit-content', marginLeft: 'auto' }}>
                                  {log.equipCode} - {log.equipName}
                                </Tag>
                              </Space>
                            ),
                            children: (
                              <div style={{ paddingBottom: 20 }}>
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                  <Space>
                                    <Badge status="processing" color="blue" />
                                    <b style={{ fontSize: 15 }}>工序: {log.processStep}</b>
                                  </Space>
                                  <Space wrap size="large" style={{ fontSize: 13 }}>
                                    <Tag color="cyan"><RobotOutlined /> {log.equipName}</Tag>
                                    <Tag color="purple"><TeamOutlined /> {log.shiftName}</Tag>
                                    {log.operator && <Tag>操作员: {log.operator}</Tag>}
                                  </Space>
                                  <Space size="large">
                                    <span>产出: <b style={{ color: '#52c41a' }}>{log.outputQty}</b></span>
                                    <span>不良: <b style={{ color: log.defectQty > 0 ? '#ff4d4f' : '#52c41a' }}>{log.defectQty}</b></span>
                                  </Space>
                                  {log.defectQty > 0 && (
                                    <Alert type="warning" showIcon message={`本工序出现 ${log.defectQty} 件不良，需关注`} size="small" />
                                  )}
                                </Space>
                              </div>
                            ),
                          }))}
                        />
                      )}
                    </Card>
                  ),
                },
                {
                  key: 'inspection',
                  label: <Space><ExperimentOutlined />检验记录 ({result.inspections?.length || 0})</Space>,
                  children: (
                    <Card className="trace-card">
                      {!result.inspections?.length ? <Empty description="暂无检验记录" /> : (
                        <List
                          itemLayout="vertical"
                          dataSource={result.inspections}
                          renderItem={(r) => (
                            <List.Item key={r.id}>
                              <List.Item.Meta
                                title={<Space><Tag color="blue"><b>{r.inspectionNo}</b></Tag><span>成品检验</span>
                                  <Tag color={INSPECTION_RESULT[r.result]?.color} style={{ marginLeft: 'auto' }}>
                                    <b>{INSPECTION_RESULT[r.result]?.label}</b>
                                  </Tag>
                                </Space>}
                                description={
                                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Row gutter={[20, 8]}>
                                      <Col><span style={{ color: '#888' }}>检验数量:</span> <b>{r.inspectQty}</b></Col>
                                      <Col><span style={{ color: '#52c41a' }}>合格:</span> <b>{r.qualifiedQty}</b></Col>
                                      <Col><span style={{ color: '#ff4d4f' }}>不合格:</span> <b>{r.defectQty}</b></Col>
                                      <Col><span style={{ color: '#888' }}>检验员:</span> {r.inspector}</Col>
                                      <Col><span style={{ color: '#888' }}>时间:</span> {dayjs(r.inspectTime).format('YYYY-MM-DD HH:mm')}</Col>
                                    </Row>
                                    {r.remark && <Alert type="info" showIcon description={r.remark} size="small" />}
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  ),
                },
                {
                  key: 'defect',
                  label: <Space><BugOutlined />不良记录 ({result.defects?.length || 0})</Space>,
                  children: (
                    <Card className="trace-card">
                      {!result.defects?.length ? <Empty description="暂无不良记录 - 质量优良" /> : (
                        <List
                          itemLayout="vertical"
                          dataSource={result.defects}
                          renderItem={(d) => (
                            <List.Item key={d.id}>
                              <List.Item.Meta
                                avatar={<BugOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />}
                                title={<Space>
                                  <Button type="link" onClick={() => window.location.hash = `#/defect/${d.id}`}>
                                    <b style={{ color: '#ff4d4f' }}>{d.defectNo}</b>
                                  </Button>
                                  <Tag color="orange">{d.defectName}</Tag>
                                  <Badge status={DEFECT_STATUS[d.processStatus]?.color === 'error' ? 'error' : DEFECT_STATUS[d.processStatus]?.color === 'warning' ? 'warning' : 'success'}
                                    text={<b>{DEFECT_STATUS[d.processStatus]?.label}</b>} />
                                </Space>}
                                description={
                                  <Space direction="vertical" size="small">
                                    <Row gutter={[20, 8]}>
                                      <Col><span style={{ color: '#888' }}>不良数量:</span> <b style={{ color: '#ff4d4f' }}>{d.defectQty}</b></Col>
                                      <Col><span style={{ color: '#888' }}>严重度:</span> <Tag color="orange">一般</Tag></Col>
                                      <Col><span style={{ color: '#888' }}>报告人:</span> {d.reporter}</Col>
                                      <Col><span style={{ color: '#888' }}>责任:</span> {d.responsible || '-'}</Col>
                                    </Row>
                                    {d.defectDesc && <div style={{ background: '#fff1f0', padding: '8px 12px', borderRadius: 6 }}><span style={{ color: '#888' }}>描述:</span> {d.defectDesc}</div>}
                                    {d.remark && <Alert type="warning" showIcon description={d.remark} size="small" />}
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      )}
                    </Card>
                  ),
                },
              ]}
            />
          </>
        )}
      </Spin>
    </div>
  );
}
