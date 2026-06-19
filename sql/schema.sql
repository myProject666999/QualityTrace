-- =====================================================
-- 质量检验与不良品追溯系统 - 数据库脚本
-- =====================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS quality_trace
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE quality_trace;

-- -----------------------------------------------------
-- 1. 物料表（原材料/零配件）
-- -----------------------------------------------------
DROP TABLE IF EXISTS materials;
CREATE TABLE materials (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '物料ID',
    material_code   VARCHAR(64) NOT NULL COMMENT '物料编码',
    material_name   VARCHAR(128) NOT NULL COMMENT '物料名称',
    material_type   TINYINT NOT NULL DEFAULT 1 COMMENT '物料类型:1-原材料 2-零配件 3-辅料',
    specification   VARCHAR(256) DEFAULT NULL COMMENT '规格型号',
    unit            VARCHAR(32) NOT NULL DEFAULT 'PCS' COMMENT '计量单位',
    supplier        VARCHAR(128) DEFAULT NULL COMMENT '供应商',
    description     TEXT DEFAULT NULL COMMENT '备注描述',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_material_code (material_code),
    KEY idx_material_name (material_name),
    KEY idx_supplier (supplier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料主数据';

-- -----------------------------------------------------
-- 2. 物料批次表
-- -----------------------------------------------------
DROP TABLE IF EXISTS material_batches;
CREATE TABLE material_batches (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '批次ID',
    material_id     BIGINT UNSIGNED NOT NULL COMMENT '物料ID',
    batch_no        VARCHAR(64) NOT NULL COMMENT '物料批次号',
    quantity        DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '批次数量',
    incoming_date   DATE NOT NULL COMMENT '来料日期',
    supplier_batch  VARCHAR(64) DEFAULT NULL COMMENT '供应商批次号',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态:1-待检 2-合格 3-不合格 4-让步接收',
    warehouse       VARCHAR(64) DEFAULT NULL COMMENT '存放仓库',
    inspector       VARCHAR(64) DEFAULT NULL COMMENT '来料检验员',
    remark          VARCHAR(512) DEFAULT NULL COMMENT '备注',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_batch_no (batch_no),
    KEY idx_material_id (material_id),
    KEY idx_incoming_date (incoming_date),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物料批次';

-- -----------------------------------------------------
-- 3. 产品表（成品）
-- -----------------------------------------------------
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '产品ID',
    product_code    VARCHAR(64) NOT NULL COMMENT '产品编码',
    product_name    VARCHAR(128) NOT NULL COMMENT '产品名称',
    specification   VARCHAR(256) DEFAULT NULL COMMENT '规格型号',
    unit            VARCHAR(32) NOT NULL DEFAULT 'PCS' COMMENT '计量单位',
    description     TEXT DEFAULT NULL COMMENT '产品描述',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_product_code (product_code),
    KEY idx_product_name (product_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品主数据';

-- -----------------------------------------------------
-- 4. 生产批次表（成品批次）
-- -----------------------------------------------------
DROP TABLE IF EXISTS production_batches;
CREATE TABLE production_batches (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '批次ID',
    product_id      BIGINT UNSIGNED NOT NULL COMMENT '产品ID',
    batch_no        VARCHAR(64) NOT NULL COMMENT '生产批次号',
    work_order      VARCHAR(64) DEFAULT NULL COMMENT '工单号',
    planned_qty     DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '计划数量',
    actual_qty      DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '实际产量',
    production_date DATE NOT NULL COMMENT '生产日期',
    production_line VARCHAR(64) DEFAULT NULL COMMENT '生产线',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态:1-生产中 2-待检 3-合格入库 4-待处理 5-返工中 6-已报废',
    created_by      VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    remark          VARCHAR(512) DEFAULT NULL COMMENT '备注',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_prod_batch_no (batch_no),
    KEY idx_product_id (product_id),
    KEY idx_production_date (production_date),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产批次';

-- -----------------------------------------------------
-- 5. 设备表
-- -----------------------------------------------------
DROP TABLE IF EXISTS equipment;
CREATE TABLE equipment (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '设备ID',
    equip_code      VARCHAR(64) NOT NULL COMMENT '设备编号',
    equip_name      VARCHAR(128) NOT NULL COMMENT '设备名称',
    equip_type      VARCHAR(64) DEFAULT NULL COMMENT '设备类型',
    location        VARCHAR(128) DEFAULT NULL COMMENT '安装位置',
    manufacturer    VARCHAR(128) DEFAULT NULL COMMENT '制造商',
    purchase_date   DATE DEFAULT NULL COMMENT '购置日期',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态:1-正常 2-维修中 3-停用',
    description     VARCHAR(512) DEFAULT NULL COMMENT '描述',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_equip_code (equip_code),
    KEY idx_equip_name (equip_name),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产设备';

-- -----------------------------------------------------
-- 6. 班组表
-- -----------------------------------------------------
DROP TABLE IF EXISTS work_shifts;
CREATE TABLE work_shifts (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '班组ID',
    shift_code      VARCHAR(64) NOT NULL COMMENT '班组编码',
    shift_name      VARCHAR(64) NOT NULL COMMENT '班组名称',
    shift_type      TINYINT NOT NULL DEFAULT 1 COMMENT '班次:1-白班 2-中班 3-夜班',
    leader          VARCHAR(64) DEFAULT NULL COMMENT '班组长',
    members         TEXT DEFAULT NULL COMMENT '班组成员(JSON数组)',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态:1-启用 0-停用',
    remark          VARCHAR(512) DEFAULT NULL COMMENT '备注',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_shift_code (shift_code),
    KEY idx_shift_name (shift_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班组信息';

-- -----------------------------------------------------
-- 7. 生产记录（关联设备、班组、生产批次）
-- -----------------------------------------------------
DROP TABLE IF EXISTS production_logs;
CREATE TABLE production_logs (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
    prod_batch_id   BIGINT UNSIGNED NOT NULL COMMENT '生产批次ID',
    equipment_id    BIGINT UNSIGNED NOT NULL COMMENT '设备ID',
    shift_id        BIGINT UNSIGNED NOT NULL COMMENT '班组ID',
    process_step    VARCHAR(64) NOT NULL COMMENT '工序名称',
    start_time      DATETIME NOT NULL COMMENT '开始时间',
    end_time        DATETIME DEFAULT NULL COMMENT '结束时间',
    operator        VARCHAR(64) DEFAULT NULL COMMENT '操作员',
    output_qty      DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '本工序产出数量',
    defect_qty      DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '不良数量',
    remark          VARCHAR(512) DEFAULT NULL COMMENT '备注',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_prod_batch_id (prod_batch_id),
    KEY idx_equipment_id (equipment_id),
    KEY idx_shift_id (shift_id),
    KEY idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产作业记录';

-- -----------------------------------------------------
-- 8. 批次物料关联表（多对多：一个成品批次使用多个物料批次）
-- -----------------------------------------------------
DROP TABLE IF EXISTS batch_material_links;
CREATE TABLE batch_material_links (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
    prod_batch_id   BIGINT UNSIGNED NOT NULL COMMENT '生产批次ID',
    material_batch_id BIGINT UNSIGNED NOT NULL COMMENT '物料批次ID',
    used_qty        DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '领用/使用数量',
    issue_time      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领料时间',
    issuer          VARCHAR(64) DEFAULT NULL COMMENT '发料人',
    receiver        VARCHAR(64) DEFAULT NULL COMMENT '领料人',
    remark          VARCHAR(512) DEFAULT NULL COMMENT '备注',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_prod_mat (prod_batch_id, material_batch_id),
    KEY idx_prod_batch_id (prod_batch_id),
    KEY idx_material_batch_id (material_batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='批次物料关联';

-- -----------------------------------------------------
-- 9. 检验标准表
-- -----------------------------------------------------
DROP TABLE IF EXISTS inspection_standards;
CREATE TABLE inspection_standards (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标准ID',
    std_code        VARCHAR(64) NOT NULL COMMENT '标准编码',
    std_name        VARCHAR(128) NOT NULL COMMENT '标准名称',
    target_type     TINYINT NOT NULL COMMENT '适用对象类型:1-物料 2-产品 3-工序',
    target_id       BIGINT UNSIGNED NOT NULL COMMENT '对应对象ID(物料/产品/工序)',
    inspection_type TINYINT NOT NULL COMMENT '检验类型:1-来料检验 2-过程检验 3-成品检验',
    inspection_mode TINYINT NOT NULL DEFAULT 1 COMMENT '检验方式:1-全检 2-抽检',
    sampling_ratio  DECIMAL(5,2) DEFAULT NULL COMMENT '抽检比例(%)',
    items           JSON NOT NULL COMMENT '检验项目数组',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态:1-启用 0-停用',
    version         VARCHAR(32) NOT NULL DEFAULT 'v1.0' COMMENT '版本号',
    effective_date  DATE DEFAULT NULL COMMENT '生效日期',
    created_by      VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    description     VARCHAR(512) DEFAULT NULL COMMENT '描述',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_std_code (std_code),
    KEY idx_target (target_type, target_id),
    KEY idx_inspection_type (inspection_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='检验标准';

-- -----------------------------------------------------
-- 10. 检验记录表（来料/过程/成品）
-- -----------------------------------------------------
DROP TABLE IF EXISTS inspection_records;
CREATE TABLE inspection_records (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '检验记录ID',
    inspection_no   VARCHAR(64) NOT NULL COMMENT '检验单号',
    inspection_type TINYINT NOT NULL COMMENT '检验类型:1-来料检验 2-过程检验 3-成品检验',
    target_batch_id BIGINT UNSIGNED NOT NULL COMMENT '被检批次ID(物料批次或生产批次)',
    target_batch_no VARCHAR(64) NOT NULL COMMENT '被检批次号',
    standard_id     BIGINT UNSIGNED DEFAULT NULL COMMENT '使用的检验标准ID',
    inspect_qty     DECIMAL(14,4) NOT NULL COMMENT '抽检/检验数量',
    qualified_qty   DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '合格数量',
    defect_qty      DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT '不合格数量',
    result          TINYINT NOT NULL DEFAULT 0 COMMENT '判定结果:0-未判定 1-合格 2-不合格 3-让步接收',
    inspector       VARCHAR(64) NOT NULL COMMENT '检验员',
    inspect_time    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '检验时间',
    remark          VARCHAR(512) DEFAULT NULL COMMENT '综合结论',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_inspection_no (inspection_no),
    KEY idx_inspection_type (inspection_type),
    KEY idx_target_batch (target_batch_id, inspection_type),
    KEY idx_result (result),
    KEY idx_inspect_time (inspect_time),
    KEY idx_inspector (inspector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='检验记录';

-- -----------------------------------------------------
-- 11. 检验项明细表
-- -----------------------------------------------------
DROP TABLE IF EXISTS inspection_items;
CREATE TABLE inspection_items (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '明细ID',
    record_id       BIGINT UNSIGNED NOT NULL COMMENT '检验记录ID',
    item_name       VARCHAR(128) NOT NULL COMMENT '检验项目名称',
    standard_value  VARCHAR(256) DEFAULT NULL COMMENT '标准值',
    actual_value    VARCHAR(256) DEFAULT NULL COMMENT '实测值',
    unit            VARCHAR(32) DEFAULT NULL COMMENT '单位',
    result          TINYINT NOT NULL DEFAULT 1 COMMENT '单项结果:1-合格 2-不合格',
    method          VARCHAR(128) DEFAULT NULL COMMENT '检验方法/工具',
    memo            VARCHAR(512) DEFAULT NULL COMMENT '备注',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_record_id (record_id),
    KEY idx_result (result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='检验项明细';

-- -----------------------------------------------------
-- 12. 不良记录表
-- -----------------------------------------------------
DROP TABLE IF EXISTS defect_records;
CREATE TABLE defect_records (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '不良ID',
    defect_no       VARCHAR(64) NOT NULL COMMENT '不良单号',
    defect_type     TINYINT NOT NULL COMMENT '不良来源:1-来料 2-过程 3-成品',
    target_batch_id BIGINT UNSIGNED NOT NULL COMMENT '关联批次ID',
    target_batch_no VARCHAR(64) NOT NULL COMMENT '关联批次号',
    inspection_id   BIGINT UNSIGNED DEFAULT NULL COMMENT '关联检验记录ID',
    defect_code     VARCHAR(32) DEFAULT NULL COMMENT '不良代码',
    defect_name     VARCHAR(128) NOT NULL COMMENT '不良名称',
    defect_desc     VARCHAR(512) DEFAULT NULL COMMENT '不良描述',
    severity        TINYINT NOT NULL DEFAULT 2 COMMENT '严重程度:1-轻微 2-一般 3-严重 4-致命',
    defect_qty      DECIMAL(14,4) NOT NULL COMMENT '不良数量',
    reporter        VARCHAR(64) NOT NULL COMMENT '报告人',
    report_time     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报告时间',
    process_status  TINYINT NOT NULL DEFAULT 1 COMMENT '处理状态:1-待处理 2-处理中 3-已处理 4-关闭',
    responsible     VARCHAR(64) DEFAULT NULL COMMENT '责任部门/人',
    remark          VARCHAR(512) DEFAULT NULL COMMENT '备注',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_defect_no (defect_no),
    KEY idx_target_batch (target_batch_id, defect_type),
    KEY idx_severity (severity),
    KEY idx_process_status (process_status),
    KEY idx_report_time (report_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='不良品记录';

-- -----------------------------------------------------
-- 13. 不良品处置表（返工/报废/让步接收）
-- -----------------------------------------------------
DROP TABLE IF EXISTS defect_dispositions;
CREATE TABLE defect_dispositions (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '处置ID',
    defect_id       BIGINT UNSIGNED NOT NULL COMMENT '不良记录ID',
    disposition_type TINYINT NOT NULL COMMENT '处置方式:1-返工 2-返修 3-报废 4-让步接收 5-退换货',
    disposition_qty DECIMAL(14,4) NOT NULL COMMENT '处置数量',
    handler         VARCHAR(64) NOT NULL COMMENT '处理人',
    handle_time     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '处理时间',
    approver        VARCHAR(64) DEFAULT NULL COMMENT '审批人',
    approve_time    DATETIME DEFAULT NULL COMMENT '审批时间',
    approve_status  TINYINT NOT NULL DEFAULT 0 COMMENT '审批状态:0-待审批 1-已批准 2-已驳回',
    reason          VARCHAR(512) DEFAULT NULL COMMENT '处置原因',
    rework_batch_no VARCHAR(64) DEFAULT NULL COMMENT '返工/返修后新批次号',
    cost            DECIMAL(14,2) DEFAULT NULL COMMENT '处置成本',
    result          VARCHAR(512) DEFAULT NULL COMMENT '处置结果',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_defect_id (defect_id),
    KEY idx_disposition_type (disposition_type),
    KEY idx_approve_status (approve_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='不良品处置记录';

-- =====================================================
-- 插入测试数据（基础数据）
-- =====================================================

-- 物料
INSERT INTO materials (material_code, material_name, material_type, specification, unit, supplier) VALUES
('MAT-001', '不锈钢板材', 1, '304/2.0mm', 'PCS', '宝钢集团'),
('MAT-002', '铝合金型材', 1, '6061-T6', 'KG', '西南铝业'),
('MAT-003', '电机', 2, '220V/50Hz', 'PCS', '西门子'),
('MAT-004', '螺丝M8', 3, '8*30mm', 'PCS', '标准件厂'),
('MAT-005', '密封圈', 3, 'Φ50mm', 'PCS', '橡胶制品厂');

-- 物料批次
INSERT INTO material_batches (material_id, batch_no, quantity, incoming_date, supplier_batch, status, warehouse, inspector) VALUES
(1, 'MB-20260615-001', 500, '2026-06-15', 'BG-20260610-A01', 2, '原材料仓A', '张工'),
(1, 'MB-20260617-002', 800, '2026-06-17', 'BG-20260612-A02', 2, '原材料仓A', '李工'),
(2, 'MB-20260616-003', 1200, '2026-06-16', 'XN-20260610-B01', 2, '原材料仓B', '张工'),
(3, 'MB-20260618-004', 200, '2026-06-18', 'XM-20260615-C01', 1, '零配件仓', NULL),
(4, 'MB-20260610-005', 5000, '2026-06-10', 'BZ-20260608-D01', 2, '辅料仓', '王工'),
(5, 'MB-20260612-006', 3000, '2026-06-12', 'XJ-20260605-E01', 2, '辅料仓', '王工');

-- 产品
INSERT INTO products (product_code, product_name, specification, unit, description) VALUES
('P-001', '食品级搅拌罐', '500L/304不锈钢', 'PCS', '工业食品搅拌罐'),
('P-002', '铝合金外壳', '定制型/6061', 'PCS', '工业设备外壳'),
('P-003', '电机组件', '220V带减速', 'PCS', '动力组件');

-- 生产批次
INSERT INTO production_batches (product_id, batch_no, work_order, planned_qty, actual_qty, production_date, production_line, status, created_by) VALUES
(1, 'PB-20260618-001', 'WO-20260615-001', 50, 50, '2026-06-18', 'A线', 3, '陈主管'),
(1, 'PB-20260619-002', 'WO-20260616-002', 80, 65, '2026-06-19', 'A线', 4, '陈主管'),
(2, 'PB-20260618-003', 'WO-20260615-003', 200, 200, '2026-06-18', 'B线', 3, '李主管'),
(2, 'PB-20260619-004', 'WO-20260617-004', 150, 120, '2026-06-19', 'B线', 1, '李主管'),
(3, 'PB-20260617-005', 'WO-20260614-005', 100, 100, '2026-06-17', 'C线', 3, '赵主管');

-- 设备
INSERT INTO equipment (equip_code, equip_name, equip_type, location, manufacturer, purchase_date, status) VALUES
('EQ-001', '数控激光切割机', '切割设备', '车间A-01', '大族激光', '2024-03-10', 1),
('EQ-002', '数控折弯机', '成型设备', '车间A-02', '亚威机床', '2024-03-15', 1),
('EQ-003', '氩弧焊接机', '焊接设备', '车间A-03', '松下', '2024-04-01', 1),
('EQ-004', '加工中心', '机加工设备', '车间B-01', 'DMG Mori', '2024-02-20', 1),
('EQ-005', '装配流水线', '装配设备', '车间C-01', '非标定制', '2024-05-10', 1),
('EQ-006', '耐压测试仪', '检测设备', '质检室', '美瑞克', '2024-06-01', 1);

-- 班组
INSERT INTO work_shifts (shift_code, shift_name, shift_type, leader, members, status) VALUES
('WS-001', 'A班-白班', 1, '王班长', '["张三","李四","王五","赵六"]', 1),
('WS-002', 'B班-白班', 1, '李班长', '["孙七","周八","吴九","郑十"]', 1),
('WS-003', 'A班-中班', 2, '陈班长', '["钱11","林12","黄13"]', 1),
('WS-004', 'A班-夜班', 3, '赵班长', '["杨14","刘15","朱16"]', 1);

-- 生产日志
INSERT INTO production_logs (prod_batch_id, equipment_id, shift_id, process_step, start_time, end_time, operator, output_qty, defect_qty) VALUES
(1, 1, 1, '下料切割', '2026-06-18 08:00:00', '2026-06-18 11:30:00', '张三', 50, 0),
(1, 2, 1, '折弯成型', '2026-06-18 13:00:00', '2026-06-18 17:00:00', '李四', 50, 0),
(1, 3, 2, '焊接组装', '2026-06-18 20:00:00', '2026-06-19 02:00:00', '孙七', 50, 2),
(2, 1, 1, '下料切割', '2026-06-19 08:00:00', '2026-06-19 12:00:00', '张三', 65, 15),
(2, 2, 1, '折弯成型', '2026-06-19 13:30:00', NULL, '李四', 40, 0),
(3, 4, 1, '机加工', '2026-06-18 08:00:00', '2026-06-18 18:00:00', '王五', 200, 0),
(4, 4, 2, '机加工', '2026-06-19 08:00:00', NULL, '周八', 120, 30),
(5, 5, 3, '装配', '2026-06-17 16:00:00', '2026-06-18 00:00:00', '钱11', 100, 5);

-- 批次物料关联（核心追溯链路）
INSERT INTO batch_material_links (prod_batch_id, material_batch_id, used_qty, issuer, receiver) VALUES
-- PB-20260618-001 使用 MB-20260615-001 (钢板) + MB-20260610-005 (螺丝) + MB-20260612-006 (密封圈)
(1, 1, 50, '仓库刘', '张三'),
(1, 5, 500, '仓库刘', '张三'),
(1, 6, 100, '仓库刘', '张三'),
-- PB-20260619-002 使用 MB-20260617-002 (钢板) + MB-20260610-005 (螺丝)
(2, 2, 65, '仓库刘', '张三'),
(2, 5, 650, '仓库刘', '张三'),
-- PB-20260618-003 使用 MB-20260616-003 (铝材) + MB-20260610-005 (螺丝)
(3, 3, 600, '仓库王', '王五'),
(3, 5, 2000, '仓库王', '王五'),
-- PB-20260619-004 使用 MB-20260616-003 (铝材)
(4, 3, 400, '仓库王', '周八'),
-- PB-20260617-005 使用 MB-20260618-004 (电机) + MB-20260610-005 (螺丝)
(5, 4, 100, '仓库李', '钱11'),
(5, 5, 1000, '仓库李', '钱11');

-- 检验标准
INSERT INTO inspection_standards (std_code, std_name, target_type, target_id, inspection_type, inspection_mode, sampling_ratio, items, status, version, effective_date, created_by) VALUES
('STD-M-001', '不锈钢板来料检验标准', 1, 1, 1, 2, 10.00,
'[{"name":"厚度","unit":"mm","standard":"2.0±0.05","method":"千分尺"},{"name":"宽度","unit":"mm","standard":"1220±2","method":"钢卷尺"},{"name":"表面质量","unit":"","standard":"无划伤、无氧化","method":"目视"},{"name":"材质报告","unit":"","standard":"有304材质证明","method":"查文件"}]',
1, 'v1.0', '2025-01-01', '质量部'),
('STD-P-001', '搅拌罐成品检验标准', 2, 1, 3, 1, NULL,
'[{"name":"外观","unit":"","standard":"表面光滑无划伤","method":"目视"},{"name":"焊缝质量","unit":"","standard":"无气孔、无裂纹","method":"目视+探伤"},{"name":"耐压测试","unit":"MPa","standard":"0.6MPa保压30min无泄漏","method":"耐压测试仪"},{"name":"容积","unit":"L","standard":"500±5","method":"注水测量"},{"name":"尺寸","unit":"mm","standard":"符合图纸","method":"钢卷尺"}]',
1, 'v1.0', '2025-01-01', '质量部'),
('STD-P-002', '铝合金外壳过程检验', 2, 2, 2, 2, 20.00,
'[{"name":"关键尺寸","unit":"mm","standard":"±0.05","method":"三坐标"},{"name":"表面处理","unit":"","standard":"阳极氧化均匀","method":"目视"},{"name":"毛刺","unit":"","standard":"无锐边毛刺","method":"手感"}]',
1, 'v1.0', '2025-01-01', '质量部');

-- 检验记录
INSERT INTO inspection_records (inspection_no, inspection_type, target_batch_id, target_batch_no, standard_id, inspect_qty, qualified_qty, defect_qty, result, inspector, inspect_time, remark) VALUES
-- 来料检验
('IQC-20260615-001', 1, 1, 'MB-20260615-001', 1, 50, 50, 0, 1, '张工', '2026-06-15 10:00:00', '全部合格，入库'),
('IQC-20260617-002', 1, 2, 'MB-20260617-002', 1, 80, 78, 2, 2, '李工', '2026-06-17 14:00:00', '发现2张板材有轻微划伤，待评审'),
-- 过程检验
('IPQC-20260618-001', 2, 3, 'PB-20260618-003', 3, 40, 40, 0, 1, '赵工', '2026-06-18 15:00:00', '首件检验合格'),
('IPQC-20260619-001', 2, 4, 'PB-20260619-004', 3, 30, 25, 5, 2, '赵工', '2026-06-19 10:30:00', '尺寸超差5件，待处理'),
-- 成品检验
('FQC-20260618-001', 3, 1, 'PB-20260618-001', 2, 50, 48, 2, 1, '钱工', '2026-06-19 08:30:00', '2台焊缝轻微，已返工复检合格'),
('FQC-20260617-001', 3, 5, 'PB-20260617-005', NULL, 100, 95, 5, 2, '钱工', '2026-06-18 10:00:00', '5台电机异响，需处理');

-- 检验项明细
INSERT INTO inspection_items (record_id, item_name, standard_value, actual_value, unit, result, method) VALUES
(1, '厚度', '2.0±0.05', '2.01,2.02,1.99,2.00', 'mm', 1, '千分尺'),
(1, '宽度', '1220±2', '1219,1221,1220,1220', 'mm', 1, '钢卷尺'),
(1, '表面质量', '无划伤、无氧化', '合格', '', 1, '目视'),
(1, '材质报告', '有304材质证明', '已提供', '', 1, '查文件'),
(2, '厚度', '2.0±0.05', '2.01,2.03,1.98,2.00', 'mm', 1, '千分尺'),
(2, '表面质量', '无划伤、无氧化', '2张有轻微划伤', '', 2, '目视'),
(6, '外观', '表面光滑无划伤', '合格', '', 1, '目视'),
(6, '焊缝质量', '无气孔、无裂纹', '2台有气孔已返工', '', 1, '目视+探伤'),
(6, '耐压测试', '0.6MPa保压30min无泄漏', '全部通过', 'MPa', 1, '耐压测试仪'),
(6, '容积', '500±5', '498-503', 'L', 1, '注水测量'),
(7, '外观', '外观合格', '合格', '', 1, '目视'),
(7, '通电测试', '电机运转正常', '5台有异响', '', 2, '通电测试'),
(7, '绝缘电阻', '≥100MΩ', '全部≥200MΩ', 'MΩ', 1, '兆欧表');

-- 不良记录
INSERT INTO defect_records (defect_no, defect_type, target_batch_id, target_batch_no, inspection_id, defect_code, defect_name, defect_desc, severity, defect_qty, reporter, process_status, responsible, remark) VALUES
('D-20260617-001', 1, 2, 'MB-20260617-002', 2, 'DEF-001', '表面划伤', '2张不锈钢板表面有深度约0.1mm划伤，长度100-200mm', 2, 2, '李工', 3, '采购部', '让步接收，不影响使用'),
('D-20260619-001', 2, 4, 'PB-20260619-004', 4, 'DEF-002', '关键尺寸超差', '5件铝合金外壳关键孔位尺寸超差0.08mm', 3, 5, '赵工', 2, '生产B班', '返修中'),
('D-20260619-002', 3, 1, 'PB-20260618-001', 5, 'DEF-003', '焊缝气孔', '2台搅拌罐环缝有Φ0.5mm气孔3处', 2, 2, '钱工', 4, '焊接组', '已补焊，复检合格'),
('D-20260618-001', 3, 5, 'PB-20260617-005', 6, 'DEF-004', '电机异响', '5台电机组件通电后轴承位置有异响', 3, 5, '钱工', 1, '装配C班', '待评审处置方案'),
('D-20260619-003', 2, 2, 'PB-20260619-002', NULL, 'DEF-005', '切割尺寸超差', '15件下料尺寸超出公差范围', 2, 15, '张三', 2, '生产A班', '排查切割机精度');

-- 不良品处置
INSERT INTO defect_dispositions (defect_id, disposition_type, disposition_qty, handler, handle_time, approver, approve_time, approve_status, reason, rework_batch_no, cost, result) VALUES
(1, 4, 2, '王经理', '2026-06-17 16:00:00', '质量总监', '2026-06-17 17:30:00', 1, '划伤位置可打磨处理，不影响使用和外观', NULL, 500.00, '让步接收，通知供应商扣款'),
(3, 1, 2, '孙七', '2026-06-19 06:00:00', '陈主管', '2026-06-19 07:00:00', 1, '气孔补焊后打磨，可满足要求', 'PB-20260618-001', 800.00, '补焊完成，复检合格'),
(2, 1, 5, '周八', '2026-06-19 11:00:00', NULL, NULL, 0, '返修补孔位后重新加工', NULL, 0.00, '返修中'),
(5, 1, 15, '张三', '2026-06-19 13:00:00', NULL, NULL, 0, '切割件重新切割下料', NULL, 0.00, '返工中');
