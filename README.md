# Gemini Native

**简体中文** | [English](./README.en.md)

基于 Google 官方 Gen AI SDK 的 DeepSeek Harness 插件，支持官方 Gemini API 及各类兼容接口。

## 特性

- **原生体验**：支持流式回复、深度思考（Thinking）、图片输入与多轮工具调用。
- **灵活接入**：支持自定义 API 地址，一键拉取服务端可用模型，也可按需配置上下文窗口与最大输出上限。
- **限流自动重试**：遇到 `429` 限流、临时配额不足或网络波动时自动按指数退避重试。
- **可选防降智**：面向第三方中转服务提供请求防降级组件，降低请求被静默路由至低配模型的风险。

## 安装与配置

支持 **DeepSeek Harness 0.2.x**（`>= 0.2.1-rc.3`）。

**界面安装（推荐）**

1. 打开左侧边栏 **插件**，点击右上角 **添加插件**。
2. 输入仓库地址 `https://github.com/AliceRabbit/dsh-gemini-native`（若已发布至 npm 可直接填 `dsh-gemini-native`，也可填入从 [Releases](https://github.com/AliceRabbit/dsh-gemini-native/releases/latest) 下载的 `.tgz` 本地路径），确认安装。

**命令行安装**

```bash
dsh plugin --profile <profile> add https://github.com/AliceRabbit/dsh-gemini-native
```

**接入配置**

1. 前往 **设置 → 模型 → Gemini → 编辑**，填入 API 密钥（或留空读取 `GEMINI_API_KEY` 环境变量）。
2. 如使用第三方兼容服务，展开 **自定义设置** 修改 **API 地址** 并保存，即可在会话中选用 Gemini 模型。

> 本插件用于文本与多模态理解对话，不包含图片、音频或视频生成能力。

## 自定义设置

- **模型列表**：可点击 **获取模型列表** 从当前接口同步模型，或手动增删模型并调整上下文长度、最大输出 token 与输入模态。
- **限流与错误重试**：默认开启（最多重试 5 次，等待 5–30 秒），可在自定义设置中调整次数与间隔，或关闭以恢复默认策略。

## 防降智组件（可选）

插件包内置独立的 **Gemini 防降智** 组件，**默认关闭**，直连官方 API 时无需开启，不会产生额外 token 开销。

使用第三方中转服务时，可在 **插件管理** 中展开本插件包的组件列表单独启用它，随后在 **设置 → 模型 → Gemini → 自定义设置** 中选择强度档位：

- **轻量**（`probe-only`）：低附加开销，适合日常轻量请求。
- **均衡**（`hybrid`，默认）：兼顾防护强度与输入开销。
- **强化**（`fortress`）：更高强度的多态特征防护，输入开销相应更高。

如果你通过配置文件管理插件，也可以直接在 Cordis 配置中指定档位：

```yaml
- id: gemini-routing-shield
  config:
    mode: probe-only
```

## 许可证

[MIT](./LICENSE)
