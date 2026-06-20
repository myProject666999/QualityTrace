import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Layout, Menu, theme, App as AntApp } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  FormOutlined,
  BugOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard.jsx';
import InspectionInput from './pages/InspectionInput.jsx';
import InspectionList from './pages/InspectionList.jsx';
import DefectList from './pages/DefectList.jsx';
import DefectDetail from './pages/DefectDetail.jsx';
import TraceForward from './pages/TraceForward.jsx';
import TraceBackward from './pages/TraceBackward.jsx';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: <Link to="/dashboard">质量仪表盘</Link>,
  },
  {
    key: 'inspection',
    icon: <FormOutlined />,
    label: '检验管理',
    children: [
      { key: 'inspection-input', label: <Link to="/inspection/input">检验录入</Link>, icon: <FileTextOutlined /> },
      { key: 'inspection-list', label: <Link to="/inspection/list">检验记录</Link>, icon: <FileTextOutlined /> },
    ],
  },
  {
    key: 'defect',
    icon: <BugOutlined />,
    label: '不良品管理',
    children: [
      { key: 'defect-list', label: <Link to="/defect/list">不良品列表</Link>, icon: <BugOutlined /> },
    ],
  },
  {
    key: 'trace',
    icon: <ArrowRightOutlined />,
    label: '追溯查询',
    children: [
      { key: 'trace-forward', label: <Link to="/trace/forward">正向追溯</Link>, icon: <ArrowRightOutlined /> },
      { key: 'trace-backward', label: <Link to="/trace/backward">反向追溯</Link>, icon: <ArrowLeftOutlined /> },
    ],
  },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { token } = theme.useToken();

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/dashboard')) return ['dashboard'];
    if (location.pathname.startsWith('/inspection/input')) return ['inspection-input'];
    if (location.pathname.startsWith('/inspection/list')) return ['inspection-list'];
    if (location.pathname.startsWith('/defect/list') || location.pathname.startsWith('/defect/')) return ['defect-list'];
    if (location.pathname.startsWith('/trace/forward')) return ['trace-forward'];
    if (location.pathname.startsWith('/trace/backward')) return ['trace-backward'];
    return ['dashboard'];
  };

  const getOpenKey = () => {
    if (location.pathname.startsWith('/inspection')) return ['inspection'];
    if (location.pathname.startsWith('/defect')) return ['defect'];
    if (location.pathname.startsWith('/trace')) return ['trace'];
    return [];
  };

  return (
    <AntApp>
      <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{
          height: 64,
          margin: 16,
          background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'center',
          color: '#fff',
          fontSize: collapsed ? 14 : 16,
          fontWeight: 700,
          letterSpacing: 1,
        }}>
          {collapsed ? 'QTS' : '质量追溯系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKey()}
          defaultOpenKeys={getOpenKey()}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>
            Quality Trace System - 质量检验与不良品追溯
          </div>
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>
            质检员 / 质量工程师工作台 | {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </Header>
        <Content style={{ margin: 0, background: '#f5f7fa', minHeight: 'calc(100vh - 64px)' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inspection/input" element={<InspectionInput />} />
            <Route path="/inspection/list" element={<InspectionList />} />
            <Route path="/defect/list" element={<DefectList />} />
            <Route path="/defect/:id" element={<DefectDetail />} />
            <Route path="/trace/forward" element={<TraceForward />} />
            <Route path="/trace/backward" element={<TraceBackward />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
      </Layout>
    </AntApp>
  );
}
