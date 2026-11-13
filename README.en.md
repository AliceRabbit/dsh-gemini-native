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

## Optional routing shield

The bundle includes **Gemini routing shield**, **off by default**. Expand the bundle's component list in Plugin Manager and enable it independently; leave the Gemini provider enabled. Disable the same component to turn protection off, without restarting DSH or changing provider, credential, or model settings.

With the component enabled, adjust **Shield strength** under **Settings → Model providers → Gemini → Customized settings**, then save or cancel with the rest of the editor. Disabling the component removes the control even in an open editor and discards its unsaved draft. The saved mode returns when re-enabled; other Gemini drafts stay intact.

You can also set `mode` through Cordis configuration. For example, merge this into the existing configuration overrides:

```yaml
- id: gemini-routing-shield
  config:
    mode: probe-only
```

Available values:

- **Balanced** (`hybrid`, default): the original ~5,000-character barrier and four identity probes.
- **Light** (`probe-only`): a ~220-character barrier and one probe, with lower input cost.
- **Strong** (`fortress`): a ~6,400-character barrier and four probes, with higher input cost.

These are barrier characters, not tokens; probes and the companion instruction are additional. Protection uses extra input tokens and may increase cost. Choose a mode to suit your usage.

The strategy comes from `fxxk-router 1.0.0`: random barriers, identity probes, and an instruction to ignore those probes. It is adapted directly to Gemini `contents/parts`, including tool continuations. No proxy, CC environment interception, output cleanup, extra retries, or monitoring UI. Tool results, thought signatures, and truthful identity instructions remain intact.

Changes take effect at the **next prompt assembly**; already assembled steps (even if still waiting to start) and their retries keep the recorded snapshot. DSH prompt assembly records the complete shield, and the adapter moves that recorded text to the request tail. Shields do not accumulate in model history; disabling removes both the shield and its companion instruction from new steps. Session logs retain the full shield for each step so requests remain reconstructable.

## License

[MIT](./LICENSE)
