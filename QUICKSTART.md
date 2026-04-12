# 快速启动指南

## 首次使用

### 1. 启动 Chrome (CDP 模式)

```bash
./start-chrome.sh
```

这会启动一个带有 CDP 调试端口的 Chrome 窗口。

### 2. 登录阿里巴巴

在打开的 Chrome 窗口中，访问并登录：
https://message.alibaba.com/message/default.htm?spm=a2756.trade-list-seller.0.0.79e8601aewBszG#feedback/all

### 3. 运行工具

保持 Chrome 窗口打开，在另一个终端窗口运行：

```bash
npm start
```

工具会自动连接到已打开的 Chrome 窗口并开始工作。

---

## 后续使用

登录后，下次可以直接运行：

```bash
npm start
```

如果 Chrome 还打开着，工具会自动连接并使用你的登录状态。

---

## 注意事项

1. 第一次启动 `./start-chrome.sh` 会创建一个新的 Chrome 用户配置
2. 登录后 Cookie 会保存到这个配置中
3. 保持 Chrome 窗口打开，运行 `npm start` 就能复用登录状态
