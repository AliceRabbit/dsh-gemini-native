# Gemini Native

[简体中文](./README.md) | **English**

An independent Gemini provider for DeepSeek Harness, powered by Google's official Gen AI SDK. Supports the Gemini API and compatible gateways.

## Features

- Streaming responses and thinking summaries.
- Image input, tool calls, and cancellation.
- Custom API endpoints and model lists, including model discovery.
- Per-model context windows, output limits, and reasoning settings.
- Configurable automatic retries for quota and temporary errors.
- API keys stored through the Harness credential service.

## Installation

Compatible with **DeepSeek Harness 0.2.x**, starting from **0.2.1-rc.3**.

1. Download the `.tgz` package from [Releases](https://github.com/AliceRabbit/dsh-gemini-native/releases/latest).
2. Install the file from the Harness plugin page and enable the plugin.
3. Open **Settings → Models → Gemini → Edit** and enter your API key.
4. To use a compatible gateway, change the API endpoint under **Customized settings**, then save.
5. Select a Gemini model in your conversation.

The default API endpoint is `https://generativelanguage.googleapis.com`. Each user needs their own API key. Leaving the key field blank keeps existing credentials.

## Models and retries

Under **Customized settings**, add models manually or use **Fetch available models** to select models offered by your provider.

**Quota and temporary-error retries** are enabled by default: up to **5 retries**, with exponential backoff from **5 to 30 seconds** and random jitter. Retry counts and delays are adjustable. Turning this off restores the Harness default retry behavior.

Retries are managed by Harness. They do not send another “continue” message or restart the entire turn. Truly exhausted quota may not recover through retries, and a failed turn that has already ended is not automatically restarted.

> This plugin supports image input, not image, audio, or video generation. Model availability and capabilities depend on your API provider.

## License

[MIT](./LICENSE)
