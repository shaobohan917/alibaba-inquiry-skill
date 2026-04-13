# 阿里巴巴询盘助手 - Chrome 扩展

阿里巴巴国际站询盘自动回复工具，安装即用，零配置。

## 功能特点

- ✅ 自动检测询盘页面
- ✅ 一键处理询盘
- ✅ AI 智能生成回复
- ✅ 自动填充到输入框

## 安装方法

### 开发者模式安装（推荐）

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `chrome-extension` 文件夹

### 安装后即可使用

1. 访问 https://message.alibaba.com/
2. 确保已登录阿里巴巴账号
3. 点击浏览器右上角的插件图标
4. 点击"开始处理询盘"

## 使用说明

1. 打开询盘列表页面
2. 点击插件图标
3. 点击"开始处理询盘"按钮
4. 等待 AI 生成回复并填充到输入框
5. 检查回复内容，手动点击发送

## 配置

默认使用内置的 API Key，无需配置。

如需使用自己的 API Key，请进入设置页面进行修改。

## 技术栈

- Chrome Extension Manifest V3
- Service Worker
- Content Script
- chrome.storage API
