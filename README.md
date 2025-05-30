
# DPalZones 地图权限管理系统

![项目截图](Map.jpg)

## 项目概述

DPalZones 是一个基于Web的地图权限管理系统，主要用于创建和管理地图上的权限区域。系统提供了直观的界面来设置不同区域的访问权限。

## 主要功能

- 交互式地图标注
- 多边形区域创建
- 细粒度权限控制：
  - 建筑权限
  - 拆除权限
  - 骑乘权限
  - 飞行权限
  - 宝箱开启权限
  - 区域进入权限
- 权限配置导入/导出(JSON格式)
- 实时坐标显示

## 技术栈

- 前端框架: jQuery + Bootstrap
- 地图引擎: OpenSeadragon
- 标注工具: Annotorious
- 图标库: Font Awesome

## 使用方法

1. 点击"全局权限"按钮设置默认权限
2. 按住Shift+左键点击开始创建区域
3. 双击左键结束区域创建
4. 为每个区域设置特定权限
5. 使用"导出"按钮保存配置
6. 使用"导入"按钮加载已有配置

## 部署说明

### 自动部署

项目已配置GitHub Actions工作流，推送代码到main分支会自动部署到GitHub Pages。

### 手动部署

1. 将项目文件上传到Web服务器
2. 确保包含以下文件：
   - index.html
   - annotationsEvents.js
   - Map.jpg
3. 所有依赖通过CDN加载，无需额外安装

## 许可证

本项目采用 [MIT License](LICENSE)

> 注意：本项目源代码为私有，仅部署后的网页公开
