import React, { useEffect, useState } from 'react';
import {
  Form, Select, Input, InputNumber, Button, DatePicker, Space, Card, Divider,
  List, Tag, Radio, Statistic, Row, Col, Modal, App,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ExperimentOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import request from '../api/index.js';
import dayjs from 'dayjs';
import { INSPECTION_TYPE, INSPECTION_RESULT } from '../utils/constants.js';

const { Option } = Select;
const { TextArea } = Input;

export default function InspectionInput() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [standards, setStandards] = useState([]);
  const [products, setProducts] = useState([]);
  const [prodBatches, setProdBatches] = useState([]);
  const [materialBatches, setMatBatches] = useState([]);
  const [targetBatchOptions, setTargetBatchOptions] = useState([]);
  const [inspectionItems, setInspectionItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const fetchDicts = async () => {
    try {
      const [stds, prods, pb, mb] = await Promise.all([
        request.get('/inspection/standards'),
        request.get('/base/products'),
        request.get('/base/production-batches?pageSize=1000'),
        request.get('/base/material-batches?pageSize=1000'),
      ]);
      setStandards(stds || []);
      setProducts(prods || []);
      setProdBatches(pb?.list || []);
      setMatBatches(mb?.list || []);
    } catch (e) {
      message.error('加载字典数据失败');
    }
  };

  useEffect(() => {
    fetchDicts();
  }, []);

  const inspectionType = Form.useWatch('inspectionType', form);
  const standardId = Form.useWatch('standardId', form);

  useEffect(() => {
    if (inspectionType === 1) {
      setTargetBatchOptions(materialBatches.map(b => ({
        label: `${b.batchNo} - ${b.materialName || ''} (${b.quantity})`,
        value: b.id,
        batchNo: b.batchNo,
      })));
    } else if (inspectionType === 2 || inspectionType === 3) {
      setTargetBatchOptions(prodBatches.map(b => ({
        label: `${b.batchNo} - ${b.productName || ''} (${b.actualQty}/${b.plannedQty})`,
        value: b.id,
        batchNo: b.batchNo,
      })));
    } else {
      setTargetBatchOptions([]);
    }
  }, [inspectionType, materialBatches, prodBatches]);

  useEffect(() => {
    if (!standardId) {
      if (inspectionType && inspectionItems.length === 0) {
        setInspectionItems([
          { itemName: '', standardValue: '', actualValue: '', unit: '', method: '', result: 1 },
        ]);
      }
      return;
    }
    const std = standards.find(s => s.id === standardId);
    if (std && std.items) {
      try {
        const items = JSON.parse(std.items);
        setInspectionItems(items.map(i => ({
          itemName: i.name || '',
          standardValue: i.standard || '',
          unit: i.unit || '',
          method: i.method || '',
          actualValue: '',
          result: 1,
        })));
      } catch (e) {
        console.error(e);
      }
    }
  }, [standardId, standards]);

  const filteredStandards = standards.filter(s => !inspectionType || s.inspectionType === inspectionType);

  const addItem = () => {
    setInspectionItems([...inspectionItems, { itemName: '', standardValue: '', actualValue: '', unit: '', method: '', result: 1 }]);
  };

  const removeItem = (idx) => {
    const next = [...inspectionItems];
    next.splice(idx, 1);
    setInspectionItems(next);
  };

  const updateItem = (idx, field, value) => {
    const next = [...inspectionItems];
    next[idx] = { ...next[idx], [field]: value };
    setInspectionItems(next);
  };

  const calcStats = () => {
    const inspectQty = form.getFieldValue('inspectQty') || 0;
    const defectItems = inspectionItems.filter(i => i.result === 2).length;
    const passed = defectItems === 0;
    return { inspectQty, defectItems, passed };
  };

  const onFinish = async (values) => {
    if (inspectionItems.some(i => !i.itemName)) {
      message.warning('请填写所有检验项的名称');
      return;
    }
    const { passed, defectItems } = calcStats();
    let result = values.result;
    if (!result) {
      result = passed ? 1 : 2;
    }
    const defectQty = values.result === 1 ? 0 : (values.defectQty || Math.round(values.inspectQty * 0.1));
    const qualifiedQty = values.inspectQty - defectQty;

    const payload = {
      ...values,
      targetBatchNo: values.targetBatchNo || targetBatchOptions.find(t => t.value === values.targetBatchId)?.batchNo || '',
      result,
      qualifiedQty,
      defectQty,
      inspectTime: values.inspectTime ? values.inspectTime.format('YYYY-MM-DD HH:mm:ss') : dayjs().format('YYYY-MM-DD HH:mm:ss'),
      items: inspectionItems,
    };

    try {
      setSubmitting(true);
      const res = await request.post('/inspection/records', payload);
      message.success(`检验记录创建成功！单号: ${res.inspectionNo}`);
      modal.success({
        title: '检验记录已保存',
        content: (
          <div>
            <div>检验单号：<b>{res.inspectionNo}</b></div>
            <div>记录ID：<b>{res.id}</b></div>
            <Divider />
            <div>判定结果：<Tag color={INSPECTION_RESULT[result].color}>{INSPECTION_RESULT[result].label}</Tag></div>
            <div>合格数量：<b style={{ color: '#52c41a' }}>{qualifiedQty}</b> / 不合格数量：<b style={{ color: '#ff4d4f' }}>{defectQty}</b></div>
            <div>不合格检验项：<b>{defectItems}</b> 项</div>
          </div>
        ),
        onOk: () => {
          form.resetFields();
          setInspectionItems([{ itemName: '', standardValue: '', actualValue: '', unit: '', method: '', result: 1 }]);
        },
      });
    } catch (e) {
      message.error('保存失败: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const { passed, defectItems } = calcStats();
  const inspectQty = Form.useWatch('inspectQty', form) || 0;

  return (
    <div className="page-container">
      <div className="page-title">
        <ExperimentOutlined style={{ color: '#1677ff' }} />
        检验录入
      </div>

      <Card className="stat-card" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} preserve={false}>
          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item label="检验类型" name="inspectionType" rules={[{ required: true, message: '请选择检验类型' }]}>
                <Radio.Group optionType="button" buttonStyle="solid">
                  {Object.keys(INSPECTION_TYPE).map(k => (
                    <Radio.Button key={k} value={parseInt(k)}>
                      <Tag color={INSPECTION_TYPE[k].color} style={{ margin: 0 }}>
                        {INSPECTION_TYPE[k].label}
                      </Tag>
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="检验标准" name="standardId" tooltip="选择后自动填充检验项目">
                <Select allowClear placeholder="请选择检验标准（可选）">
                  {filteredStandards.map(s => (
                    <Option key={s.id} value={s.id}>{s.stdCode} - {s.stdName} ({s.version})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="被检批次" name="targetBatchId" rules={[{ required: true, message: '请选择被检批次' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={inspectionType ? '请选择批次' : '请先选择检验类型'}
                  disabled={!inspectionType}
                >
                  {targetBatchOptions.map(t => (
                    <Option key={t.value} value={t.value} label={t.label}>{t.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="检验数量" name="inspectQty" rules={[{ required: true, message: '请输入检验数量' }]}>
                <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入抽检/全检数量" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="检验员" name="inspector" rules={[{ required: true, message: '请输入检验员' }]} initialValue="当前质检员">
                <Input placeholder="请输入检验员姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="检验时间" name="inspectTime" initialValue={dayjs()}>
                <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="判定结果" name="result" tooltip="根据不合格检验项自动建议，可手动调整">
                <Radio.Group>
                  {[0, 1, 2, 3].map(k => (
                    <Radio key={k} value={k}>
                      <Tag color={INSPECTION_RESULT[k].color} style={{ margin: 0 }}>{INSPECTION_RESULT[k].label}</Tag>
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="综合结论" name="remark">
                <TextArea rows={2} placeholder="请输入检验综合结论，可留空" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>
            <b style={{ color: '#1677ff' }}>检验项目明细</b>
          </Divider>

          <Card size="small" style={{ background: '#fafafa', marginBottom: 16 }}>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col flex="auto">
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Statistic title="检验项总数" value={inspectionItems.length} />
                  <Statistic title="不合格项" value={defectItems} valueStyle={{ color: defectItems > 0 ? '#ff4d4f' : '#52c41a' }} />
                  <Statistic title="自动建议" valueRender={() => (
                    <Tag color={passed ? 'success' : 'error'}>
                      {passed ? <CheckCircleOutlined /> : <InfoCircleOutlined />}
                      &nbsp;{passed ? '合格' : '不合格'}
                    </Tag>
                  )} />
                </div>
              </Col>
              <Col>
                <Button type="dashed" onClick={addItem} icon={<PlusOutlined />}>新增检验项</Button>
              </Col>
            </Row>

            <div style={{ display: 'grid', gridTemplateColumns: '28px 1.5fr 1fr 1fr 0.8fr 1fr 1fr 0.8fr 36px', gap: 8, fontWeight: 600, color: '#666', fontSize: 12, padding: '8px 4px', borderBottom: '1px solid #e8e8e8' }}>
              <div>#</div>
              <div>检验项目</div>
              <div>标准值</div>
              <div>实测值</div>
              <div>单位</div>
              <div>检验方法/工具</div>
              <div>单项结果</div>
              <div>备注</div>
              <div></div>
            </div>

            {inspectionItems.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '28px 1.5fr 1fr 1fr 0.8fr 1fr 1fr 0.8fr 36px', gap: 8, padding: '6px 4px', borderBottom: '1px dashed #f0f0f0', alignItems: 'center' }}>
                <div style={{ color: '#999' }}>{idx + 1}</div>
                <Input size="small" placeholder="项目名" value={item.itemName} onChange={e => updateItem(idx, 'itemName', e.target.value)} />
                <Input size="small" placeholder="标准值" value={item.standardValue} onChange={e => updateItem(idx, 'standardValue', e.target.value)} />
                <Input size="small" placeholder="实测值" value={item.actualValue} style={{ borderColor: item.result === 2 ? '#ff4d4f' : '' }} onChange={e => updateItem(idx, 'actualValue', e.target.value)} />
                <Input size="small" placeholder="单位" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} />
                <Input size="small" placeholder="方法/工具" value={item.method} onChange={e => updateItem(idx, 'method', e.target.value)} />
                <Radio.Group size="small" value={item.result} onChange={e => updateItem(idx, 'result', e.target.value)}>
                  <Radio.Button value={1} style={{ color: '#52c41a', borderColor: item.result === 1 ? '#52c41a' : '' }}>合格</Radio.Button>
                  <Radio.Button value={2} style={{ color: '#ff4d4f', borderColor: item.result === 2 ? '#ff4d4f' : '' }}>不合格</Radio.Button>
                </Radio.Group>
                <Input size="small" placeholder="备注" value={item.memo || ''} onChange={e => updateItem(idx, 'memo', e.target.value)} />
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeItem(idx)} disabled={inspectionItems.length <= 1} />
              </div>
            ))}
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" size="large" htmlType="submit" loading={submitting} icon={<ExperimentOutlined />}>
                提交检验记录
              </Button>
              <Button size="large" onClick={() => { form.resetFields(); setInspectionItems([{ itemName: '', standardValue: '', actualValue: '', unit: '', method: '', result: 1 }]); }}>
                重置表单
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
