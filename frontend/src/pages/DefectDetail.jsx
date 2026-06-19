import React, { useEffect, useState } from 'react';
import {
  Card, Descriptions, Tag, Badge, Button, List, Steps, Modal, Form, Input, InputNumber, Select, DatePicker, Row, Col, Divider, message, Space, Timeline, Empty, Progress, Statistic,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined, BugOutlined, CheckOutlined, CloseOutlined, ScissorOutlined, WarningOutlined, FileProtectOutlined, EditOutlined,
} from '@ant-design/icons';
import request from '../api/index.js';
import dayjs from 'dayjs';
import { DEFECT_TYPE, DEFECT_SEVERITY, DEFECT_STATUS, DISPOSITION_TYPE, APPROVE_STATUS } from '../utils/constants.js';

const { Option } = Select;
const { TextArea } = Input;
const dispositionColor = { 1: '#1677ff', 2: '#13c2c2', 3: '#ff4d4f', 4: '#fa8c16', 5: '#722ed1' };

export default function DefectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [defect, setDefect] = useState(null);
  const [dispVisible, setDispVisible] = useState(false);
  const [dispForm] = Form.useForm();
  const [dispLoading, setDispLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState({});

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await request.get(`/defect/records/${id}`);
      setDefect(res);
    } catch (e) {
      message.error('加载详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleDisposition = async (values) => {
    try {
      setDispLoading(true);
      await request.post('/defect/dispositions', {
        ...values,
        defectId: parseInt(id),
        approveStatus: values.approveStatus || 0,
      });
      message.success('处置提交成功！');
      setDispVisible(false);
      dispForm.resetFields();
      fetchDetail();
    } catch (e) {
      message.error('提交失败: ' + e.message);
    } finally {
      setDispLoading(false);
    }
  };

  const handleApprove = async (disposition, approveStatus) => {
    try {
      setApproveLoading(s => ({ ...s, [disposition.id]: true }));
      await request.post(`/defect/dispositions/${disposition.id}/approve`, {
        approver: '质量工程师',
        approveStatus,
      });
      message.success(approveStatus === 1 ? '已批准' : '已驳回');
      fetchDetail();
    } catch (e) {
      message.error('操作失败');
    } finally {
      setApproveLoading(s => ({ ...s, [disposition.id]: false }));
    }
  };

  if (loading) return <div className="page-container"><div style={{ textAlign: 'center', padding: 100 }}>加载中...</div></div>;
  if (!defect) return <div className="page-container"><Empty description="未找到不良记录" /></div>;

  const dispositionSum = (defect.dispositions || []).reduce((acc, d) => acc + (d.dispositionQty || 0), 0);
  const remainingQty = defect.defectQty - dispositionSum;
  const processPct = defect.defectQty > 0 ? Math.min(100, Math.round(dispositionSum * 100 / defect.defectQty)) : 0;

  return (
    <div className="page-container">
      <div className="page-title">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <BugOutlined style={{ color: '#ff4d4f' }} />
        不良品详情 - {defect.defectNo}
        <Space style={{ marginLeft: 'auto' }}>
          <Tag color={DEFECT_TYPE[defect.defectType]?.color}>{DEFECT_TYPE[defect.defectType]?.label}</Tag>
          <Tag color={DEFECT_SEVERITY[defect.severity]?.color}><b>{DEFECT_SEVERITY[defect.severity]?.label}</b></Tag>
          <Badge status={DEFECT_STATUS[defect.processStatus]?.color === 'error' ? 'error' : DEFECT_STATUS[defect.processStatus]?.color === 'warning' ? 'warning' : DEFECT_STATUS[defect.processStatus]?.color === 'success' ? 'success' : 'processing'}
            text={<b>{DEFECT_STATUS[defect.processStatus]?.label}</b>} />
        </Space>
      </div>

      <Steps current={defect.processStatus - 1} style={{ marginBottom: 24 }}>
        <Steps.Step title="待处理" icon={<BugOutlined />} />
        <Steps.Step title="处理中" icon={<EditOutlined />} />
        <Steps.Step title="已处理" icon={<CheckOutlined />} />
        <Steps.Step title="已关闭" icon={<CheckOutlined />} />
      </Steps>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="stat-card" title="不良基本信息" style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="关联批次"><Tag color="blue"><b>{defect.targetBatchNo}</b></Tag></Descriptions.Item>
              <Descriptions.Item label="关联检验记录">{defect.inspectionId ? `检验 #${defect.inspectionId}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="不良名称" span={2}>
                <Space>
                  <Badge color={DEFECT_SEVERITY[defect.severity]?.color} />
                  <b style={{ fontSize: 15 }}>{defect.defectName}</b>
                  {defect.defectCode && <Tag>{defect.defectCode}</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="不良数量" span={2}>
                <Space size="large">
                  <Statistic title="不良总数" value={defect.defectQty} valueStyle={{ color: '#ff4d4f', fontSize: 24 }} />
                  <Statistic title="已处置" value={dispositionSum} valueStyle={{ color: '#52c41a' }} />
                  <Statistic title="待处置" value={remainingQty} valueStyle={{ color: '#fa8c16' }} />
                  <Progress type="dashboard" percent={processPct} />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="不良描述" span={2}>
                {defect.defectDesc || <span style={{ color: '#999' }}>-</span>}
              </Descriptions.Item>
              <Descriptions.Item label="报告人">{defect.reporter}</Descriptions.Item>
              <Descriptions.Item label="报告时间">{dayjs(defect.reportTime).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="责任部门">{defect.responsible || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{defect.remark || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            className="stat-card"
            title={
              <Space>
                处置记录 ({defect.dispositions?.length || 0})
                {defect.processStatus < 4 && (
                  <Button type="primary" size="small" icon={<EditOutlined />} style={{ marginLeft: 8 }} onClick={() => setDispVisible(true)}>
                    新增处置
                  </Button>
                )}
              </Space>
            }
            extra={
              <Space>
                <Tag color="green">已处置: {dispositionSum}</Tag>
                <Tag color="orange">待处置: {remainingQty}</Tag>
              </Space>
            }
          >
            {(!defect.dispositions || defect.dispositions.length === 0) ? (
              <Empty description="暂无处置记录，点击右上角「新增处置」开始处理" />
            ) : (
              <List
                dataSource={defect.dispositions}
                itemLayout="vertical"
                renderItem={(d) => (
                  <List.Item key={d.id}>
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Tag color={dispositionColor[d.dispositionType]} style={{ fontSize: 14, padding: '3px 14px', fontWeight: 600 }}>
                            {d.dispositionType === 1 && <ScissorOutlined />}
                            {d.dispositionType === 2 && <EditOutlined />}
                            {d.dispositionType === 3 && <CloseOutlined />}
                            {d.dispositionType === 4 && <FileProtectOutlined />}
                            {d.dispositionType === 5 && <ArrowLeftOutlined />}
                            &nbsp;{DISPOSITION_TYPE[d.dispositionType]}
                          </Tag>
                          <span style={{ fontSize: 15 }}><b>处置数量: <span style={{ color: '#1677ff' }}>{d.dispositionQty}</span></b></span>
                          <Badge status={APPROVE_STATUS[d.approveStatus]?.color === 'error' ? 'error' : APPROVE_STATUS[d.approveStatus]?.color === 'warning' ? 'warning' : 'success'}
                            text={<b>{APPROVE_STATUS[d.approveStatus]?.label}</b>} />
                        </Space>
                      }
                      description={
                        <Timeline style={{ marginTop: 12 }}>
                          <Timeline.Item color="blue">
                            <div><b>提交处置</b> · 处理人: {d.handler} · {dayjs(d.handleTime).format('YYYY-MM-DD HH:mm')}</div>
                            <div style={{ marginTop: 4, color: '#555' }}>原因: {d.reason || '-'}</div>
                            {d.reworkBatchNo && <div>返工后新批次: <Tag>{d.reworkBatchNo}</Tag></div>}
                            {d.cost != null && <div>处置成本: <b style={{ color: '#ff4d4f' }}>¥{Number(d.cost).toLocaleString()}</b></div>}
                          </Timeline.Item>
                          {d.approver ? (
                            <Timeline.Item color={d.approveStatus === 1 ? 'green' : 'red'}>
                              <div><b>{d.approveStatus === 1 ? '已批准' : '已驳回'}</b> · 审批人: {d.approver}
                                {d.approveTime && ` · ${dayjs(d.approveTime).format('YYYY-MM-DD HH:mm')}`}
                              </div>
                              {d.result && <div style={{ marginTop: 4 }}>审批结果/意见: <span style={{ color: '#555' }}>{d.result}</span></div>}
                            </Timeline.Item>
                          ) : (
                            <Timeline.Item color="gray">
                              <Space>
                                <span style={{ color: '#888' }}>待审批</span>
                                <Button size="small" type="primary" loading={approveLoading[d.id]} onClick={() => {
                                  Modal.confirm({
                                    title: '批准此处置方案？',
                                    content: `方式: ${DISPOSITION_TYPE[d.dispositionType]}, 数量: ${d.dispositionQty}`,
                                    okText: '批准',
                                    cancelText: '驳回',
                                    onOk: () => handleApprove(d, 1),
                                    onCancel: () => handleApprove(d, 2),
                                  });
                                }}>立即审批</Button>
                              </Space>
                            </Timeline.Item>
                          )}
                        </Timeline>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="stat-card" title={<Space><WarningOutlined style={{ color: '#fa8c16' }} />快捷操作</Space>} style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              {Object.keys(DISPOSITION_TYPE).map((k) => {
                const t = parseInt(k);
                return (
                  <Button block key={k}
                    style={{
                      textAlign: 'left',
                      borderColor: dispositionColor[t],
                      color: dispositionColor[t],
                      fontWeight: 500,
                      padding: '12px 16px',
                      height: 'auto',
                    }}
                    disabled={defect.processStatus >= 4}
                    onClick={() => {
                      dispForm.setFieldsValue({
                        dispositionType: t,
                        dispositionQty: remainingQty > 0 ? remainingQty : defect.defectQty,
                        handler: '当前处理人',
                        approver: '',
                        approveStatus: 0,
                      });
                      setDispVisible(true);
                    }}
                  >
                    <Space>
                      <span style={{ fontSize: 18 }}>
                        {t === 1 && <ScissorOutlined />}
                        {t === 2 && <EditOutlined />}
                        {t === 3 && <CloseOutlined />}
                        {t === 4 && <FileProtectOutlined />}
                        {t === 5 && <ArrowLeftOutlined />}
                      </span>
                      <span style={{ fontSize: 14 }}>
                        <b>{DISPOSITION_TYPE[t]}</b>
                        <div style={{ fontSize: 11, color: '#888', fontWeight: 'normal', marginTop: 2 }}>
                          {t === 1 && '重新加工后再检验'}
                          {t === 2 && '修复缺陷部位'}
                          {t === 3 && '作废品销毁'}
                          {t === 4 && '有条件放行（需审批）'}
                          {t === 5 && '退给供应商'}
                        </div>
                      </span>
                    </Space>
                  </Button>
                );
              })}
            </Space>
          </Card>

          <Card className="stat-card" title={<Space><WarningOutlined style={{ color: '#fa8c16' }} />8D 报告提示</Space>}>
            <div style={{ color: '#666', lineHeight: 1.9, fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>当不良数量较大或严重度为「严重/致命」时，建议启动 8D 报告：</div>
              <div>1. D1 建立团队</div>
              <div>2. D2 描述问题</div>
              <div>3. D3 临时措施</div>
              <div>4. D4 根本原因</div>
              <div>5. D5 纠正措施</div>
              <div>6. D6 验证措施</div>
              <div>7. D7 预防再发</div>
              <div>8. D8 团队表彰</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="提交不良品处置"
        open={dispVisible}
        onCancel={() => setDispVisible(false)}
        onOk={() => dispForm.submit()}
        okText="提交"
        confirmLoading={dispLoading}
        width={620}
        destroyOnClose
      >
        <Form form={dispForm} layout="vertical" onFinish={handleDisposition}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="处置方式" name="dispositionType" rules={[{ required: true }]}>
                <Select>
                  {Object.keys(DISPOSITION_TYPE).map(k => (
                    <Option key={k} value={parseInt(k)}>{DISPOSITION_TYPE[parseInt(k)]}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="处置数量" name="dispositionQty" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={defect.defectQty} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="处理人" name="handler" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="处置成本(元)" name="cost">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="审批状态" name="approveStatus" initialValue={0}>
                <Select>
                  {Object.keys(APPROVE_STATUS).map(k => <Option key={k} value={parseInt(k)}>{APPROVE_STATUS[parseInt(k)].label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="返工后批次号" name="reworkBatchNo">
                <Input placeholder="仅返工/返修时填写" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="审批人" name="approver">
                <Input placeholder="已批准时必填" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="处置原因/说明" name="reason" rules={[{ required: true }]}>
                <TextArea rows={3} placeholder="说明为什么选择此种处置方式" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="处置结果" name="result">
                <TextArea rows={2} placeholder="最终结果、后续措施等" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
