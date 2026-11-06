# Gemini 原生端点

**简体中文** | [English](./README.en.md)

为 DeepSeek Harness 添加独立的 Gemini 提供商，使用 Google 官方 Gen AI SDK，支持 Gemini API 及兼容网关。

## 功能

- 流式回复与思考摘要。
- 图片输入、工具调用与对话取消。
- 自定义 API 地址和模型列表，可从提供商获取可用模型。
- 按模型设置上下文长度、输出上限和思考强度。
- 可配置的额度与临时错误自动重试。
- API 密钥由 Harness 凭据服务保存。

## 安装

适用于 **DeepSeek Harness 0.2.x**，最低版本为 **0.2.1-rc.3**。

1. 在 [Releases](https://github.com/AliceRabbit/dsh-gemini-native/releases/latest) 下载 `.tgz` 安装包。
2. 在 Harness 的插件页面安装该文件，并启用插件。
3. 打开 **设置 → 模型 → Gemini → 编辑**，填写 API 密钥。
4. 如需使用兼容网关，在 **自定义设置** 中修改 API 地址，然后保存。
5. 在对话中选择 Gemini 模型即可使用。

默认 API 地址为 `https://generativelanguage.googleapis.com`。每位用户需要提供自己的 API 密钥；密钥输入框留空会保留已有凭据。

## 模型与重试

在 **自定义设置** 中，可以手动添加模型，或点击 **获取可用模型** 后选择要添加的项目。

**额度与临时错误重试** 默认开启：最多重试 **5 次**，等待时间从 **5 秒**递增至 **30 秒**，带随机抖动。次数和等待时间均可调整；关闭后恢复 Harness 默认重试行为。

重试由 Harness 管理，不会额外发送“继续”或从头重跑整轮任务。真正耗尽的额度不一定能通过重试恢复，已经结束的失败轮次也不会自动重新启动。

> 本插件支持图片输入，不提供图片、语音或视频生成。模型可用性和功能取决于你的 API 提供商。

## 许可证

[MIT](./LICENSE)
