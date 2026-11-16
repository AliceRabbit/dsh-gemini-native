# Gemini Native

[简体中文](./README.md) | **English**

A Gemini provider plugin for DeepSeek Harness built on Google's official Gen AI SDK, supporting both the official Gemini API and compatible endpoints.

## Features

- **Native capabilities**: Streaming responses, thinking summaries, image understanding, and tool calling.
- **Flexible endpoints & models**: Custom API URLs, one-click model fetching, and per-model context window and output limits.
- **Rate-limit retries**: Automatic exponential backoff for `429` rate limits, temporary quota errors, and transient network failures.
- **Optional routing shield**: Helps prevent third-party relays from silently routing requests to lower-tier models.

## Installation & Setup

Requires **DeepSeek Harness 0.2.x** (`>= 0.2.1-rc.3`).

**GUI (Recommended)**

1. Open **Plugins** in the left sidebar and click **Add plugin**.
2. Enter `https://github.com/AliceRabbit/dsh-gemini-native` (or `dsh-gemini-native` if published on npm, or the local path to a `.tgz` archive from [Releases](https://github.com/AliceRabbit/dsh-gemini-native/releases/latest)) and confirm.

**CLI**

```bash
dsh plugin --profile <profile> add https://github.com/AliceRabbit/dsh-gemini-native
```

**Setup**

1. Open **Settings → Models → Gemini → Edit** and enter your API key (or leave it blank to use the `GEMINI_API_KEY` environment variable).
2. If using a compatible gateway, expand **Customized settings**, set your **API endpoint**, and save, then select a Gemini model in the conversation composer.

> Supports text and image input only; image, audio, and video generation are not included.

## Configuration

- **Models**: Use **Fetch models** to import models advertised by your endpoint, or add and edit models manually with custom context windows, max output tokens, and input modalities.
- **Rate-limit & error retries**: Enabled by default (up to 5 retries, 5–30s backoff). Adjust the limits in **Customized settings**, or turn it off to use the default Harness retry policy.

## Routing Shield (Optional)

The bundle includes an optional **Gemini routing shield** component, **off by default** so direct API users incur no extra token usage.

When using third-party relays, expand this bundle's components in **Plugin Manager** to enable it, then choose a strength level under **Settings → Models → Gemini → Customized settings**:

- **Light** (`probe-only`): Minimal token overhead for everyday use.
- **Balanced** (`hybrid`, default): Balanced protection and input cost.
- **Strong** (`fortress`): Stronger polymorphic protection with higher input token usage.

You can also configure `mode` via Cordis configuration:

```yaml
- id: gemini-routing-shield
  config:
    mode: probe-only
```

## License

[MIT](./LICENSE)
