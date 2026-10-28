window.__ModuleLoader__.load({
  id: '@local/dsh-gemini-native',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'gemini-native';
    const copy = {
      zh: {
        key: 'API 密钥', savedKey: '留空使用已保存凭据', newKey: '留空使用环境认证（{ref}）',
        show: '显示密钥', hide: '隐藏密钥', authHelp: '认证说明',
        authHint: '优先使用已保存的凭据，也可设置环境变量 {ref}。留空保留现有凭据。',
        missingKey: '未检测到环境变量。请填写 API 密钥，或设置环境变量 {ref}。',
        customized: '自定义设置', endpoint: 'API 地址', models: '模型目录',
        inherited: '正在使用适配器默认模型', customizedModels: '已自定义模型目录', reset: '恢复默认模型',
        modelId: '模型 ID', modelName: '显示名称', context: '上下文窗口', output: '最大输出 token 数',
        inputTypes: '输入类型', text: '文本', image: '图片', advanced: '模型选项',
        add: '添加模型', remove: '删除模型', fetch: '获取可用模型', fetching: '正在询问提供商…',
        save: '保存', cancel: '取消', close: '关闭', loading: '加载中…', busy: '保存中…', saved: '已保存 Gemini。',
        empty: '模型选择器中将不显示任何模型；目录外 ID 仍可直接发送。',
        invalidEndpoint: '请输入有效的 HTTP 或 HTTPS 地址。', invalidKey: '该 API 密钥格式错误，请检查。',
        invalidId: '模型 ID 不能为空，且每个 ID 只能出现一次。', invalidCapacity: '容量需为正整数，可加 K 或 M 后缀。',
        missing: 'Gemini 设置暂不可用，请重新打开设置。',
        fetchEmpty: '该提供商没有列出任何模型，请手动添加。', fetchTitle: '选择要添加的模型',
        fetchDescription: '以下是模型提供商的可用模型，勾选要添加的模型。', search: '搜索模型',
        noMatches: '没有匹配的模型。', selectAll: '全选', deselectAll: '取消全选', adopt: '添加所选',
        quotaRetry: '额度与临时错误重试', quotaRetryEnabled: '启用额度重试', retryCount: '最大重试次数',
        retryInitial: '初始等待（秒）', retryMax: '最长等待（秒）',
        retryHelp: '仅对 gemini-native 路由生效。开启后使用 Harness 原生 normal 策略，保留原生五类可重试错误并加入 QUOTA；采用以下次数和指数退避，随机抖动为 10%。默认开启，默认 5 次、5–30 秒。',
        retryBudget: '同一模型请求步骤内的错误共享重试预算，不会重复发送“继续”，也不会从头执行工具。额度真的耗尽时仍可能失败。',
        retryOff: '关闭后完全恢复 Harness 原生 normal 默认：最多重试 5 次，退避 0.5–10 秒，不额外重试 QUOTA。',
        retryPrecision: '次数为 1–20 的整数；时间为 1–300 秒，最多 3 位小数（0.001 秒）。最长等待不得小于初始等待。',
        invalidRetryCount: '最大重试次数必须为 1–20 的整数。',
        invalidRetryDelay: '等待时间必须为 1–300 秒，最多 3 位小数。',
        invalidRetryOrder: '最长等待不得小于初始等待。',
      },
      en: {
        key: 'API key', savedKey: 'Leave blank to use saved credentials', newKey: 'Leave blank to use environment authentication ({ref})',
        show: 'Show key', hide: 'Hide key', authHelp: 'Authentication help',
        authHint: 'Saved credentials take priority. You can also set {ref}. Leave blank to keep existing credentials.',
        missingKey: 'No environment variable detected. Enter an API key or set {ref}.',
        customized: 'Customized settings', endpoint: 'API endpoint', models: 'Model catalog',
        inherited: 'Using adapter default models', customizedModels: 'Customized model catalog', reset: 'Restore default models',
        modelId: 'Model ID', modelName: 'Display name', context: 'Context window', output: 'Max output tokens',
        inputTypes: 'Input types', text: 'Text', image: 'Image', advanced: 'Model options',
        add: 'Add model', remove: 'Remove model', fetch: 'Fetch available models', fetching: 'Asking provider…',
        save: 'Save', cancel: 'Cancel', close: 'Close', loading: 'Loading…', busy: 'Saving…', saved: 'Saved Gemini.',
        empty: 'No models will appear in the picker; IDs outside the catalog can still be sent directly.',
        invalidEndpoint: 'Enter a valid HTTP or HTTPS address.', invalidKey: 'This API key has an invalid format.',
        invalidId: 'Model IDs must be nonempty and unique.', invalidCapacity: 'Enter a positive whole number, optionally followed by K or M.',
        missing: 'Gemini settings are unavailable. Reopen settings.',
        fetchEmpty: 'The provider did not list any models. Add them manually.', fetchTitle: 'Select models to add',
        fetchDescription: 'These models are available from the provider. Select the models to add.', search: 'Search models',
        noMatches: 'No matching models.', selectAll: 'Select all', deselectAll: 'Deselect all', adopt: 'Add selected',
        quotaRetry: 'Quota and temporary-error retries', quotaRetryEnabled: 'Enable quota retries', retryCount: 'Maximum retries',
        retryInitial: 'Initial delay (seconds)', retryMax: 'Maximum delay (seconds)',
        retryHelp: 'Only applies to the gemini-native route. Uses Harness’s native normal strategy, retaining its five retryable error classes and adding QUOTA, with the retry count and exponential backoff below and 10% jitter. Enabled by default: 5 retries, 5–30 seconds.',
        retryBudget: 'Errors within the same model-request step share one retry budget. This does not send another “continue” message or rerun tools from the beginning. Truly exhausted quota can still fail.',
        retryOff: 'Turning this off fully restores Harness’s native normal defaults: up to 5 retries, 0.5–10-second backoff, with no added QUOTA retries.',
        retryPrecision: 'Use 1–20 whole retries and 1–300 seconds with up to 3 decimal places (0.001 second). Maximum delay must not be less than initial delay.',
        invalidRetryCount: 'Maximum retries must be a whole number from 1 to 20.',
        invalidRetryDelay: 'Delays must be 1–300 seconds with up to 3 decimal places.',
        invalidRetryOrder: 'Maximum delay must not be less than initial delay.',
      },
    };
    // Settings control styles are copied from Harness 0.2.1 and scoped to this plugin.
    const css = `
      .gn-notice{color:var(--dsw-alias-state-warn-label);margin:0;font-size:12px;line-height:18px}
      .gn-savedNotice{color:var(--dsw-alias-state-success-primary);margin:0;font-size:12px;line-height:18px}
      .gn-primaryButton,.gn-secondaryButton{box-sizing:border-box;border-radius:var(--dsw-radius-md);height:36px;font:inherit;cursor:pointer;border:none;justify-content:center;align-items:center;gap:4px;padding:0 14px;font-size:14px;line-height:22px;display:inline-flex}
      .gn-primaryButton{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
      .gn-primaryButton:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
      .gn-secondaryButton{border:.5px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary);background:0 0}
      .gn-secondaryButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
      .gn-secondaryButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}
      .gn-primaryButton:disabled,.gn-secondaryButton:disabled,.gn-linkButton:disabled,.gn-addModelButton:disabled{opacity:.4;cursor:default}
      .gn-primaryButton:focus-visible,.gn-secondaryButton:focus-visible,.gn-linkButton:focus-visible,.gn-addModelButton:focus-visible,.gn-iconButton:focus-visible,.gn-customizedSummary:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline:none}
      .gn-editor{border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform);flex-direction:column;gap:14px;padding:14px 16px;display:flex}
      .gn-editorHeader{align-items:baseline;gap:8px;display:flex}
      .gn-editorTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}
      .gn-editorRoute{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
      .gn-field{flex-direction:column;gap:6px;display:flex}
      .gn-fieldLabel{color:var(--dsw-alias-label-secondary);align-items:center;gap:10px;font-size:12px;font-weight:500;line-height:18px;display:inline-flex}
      .gn-helpButton{border:.5px solid var(--dsw-alias-border-l3);corner-shape:round;width:16px;height:16px;color:var(--dsw-alias-label-tertiary);font:inherit;text-align:center;cursor:help;background:0 0;border-radius:50%;padding:0;font-size:11px;line-height:15px}
      .gn-helpButton:hover,.gn-helpButton:focus-visible{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-tertiary)}
      .gn-linkButton{box-sizing:border-box;border-radius:var(--dsw-radius-sm);height:28px;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:none;align-items:center;padding:0 10px;font-size:12px;line-height:18px;display:inline-flex}
      .gn-linkButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
      .gn-advancedHint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}
      .gn-editorActions{justify-content:flex-end;gap:8px;display:flex}
      .gn-customized{border-top:.5px solid var(--dsw-alias-border-l2);padding-top:10px}
      .gn-customizedSummary{border-radius:var(--dsw-radius-sm);cursor:pointer;width:fit-content;color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;margin-left:-4px;padding:2px 4px;font-size:12px;font-weight:500;line-height:18px;list-style:none;display:flex}
      .gn-customizedSummary::-webkit-details-marker{display:none}
      .gn-customizedSummary:before{content:"";border-bottom:1.5px solid;border-right:1.5px solid;width:5px;height:5px;transition:transform .12s;transform:rotate(-45deg)translate(-1px,-1px)}
      .gn-customized[open]>.gn-customizedSummary:before{transform:rotate(45deg)translate(-1px,-1px)}
      .gn-customizedSummary:hover{color:var(--dsw-alias-label-primary)}
      .gn-customizedBody{flex-direction:column;gap:12px;padding-top:12px;display:flex}
      .gn-retryFields{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
      .gn-modelCatalog{border-top:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;padding-top:12px;display:flex}
      .gn-modelCatalogHeading{flex-direction:column;gap:2px;display:flex}
      .gn-modelCatalogTitle{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}
      .gn-modelCatalogMeta,.gn-modelEmpty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}
      .gn-modelList{flex-direction:column;gap:8px;display:flex}
      .gn-modelListHead{justify-content:space-between;align-items:flex-start;gap:12px;display:flex}
      .gn-modelEntry{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);padding:6px}
      .gn-modelRow{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) auto auto;align-items:center;gap:6px;display:grid}
      .gn-iconButton{box-sizing:border-box;border-radius:var(--dsw-radius-sm);width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;justify-content:center;align-items:center;display:inline-flex}
      .gn-iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
      .gn-iconButton:disabled{cursor:default;opacity:.4}
      .gn-iconButtonDanger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
      .gn-modelAdvanced{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:8px 4px 2px;display:grid}
      .gn-modelField{flex-direction:column;gap:4px;min-width:0;display:flex}
      .gn-modelInputTypes{border:none;grid-column:1/-1;min-width:0;margin:0;padding:0}
      .gn-modelInputTypes legend{margin-bottom:4px;padding:0}
      .gn-modelInputChoices{flex-wrap:wrap;align-items:center;gap:16px;min-height:32px;display:flex}
      .gn-modelFieldLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
      .gn-modelEmpty{border:1px dashed var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);text-align:center;padding:12px}
      .gn-addModelButton{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm);height:28px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;align-self:flex-start;align-items:center;gap:4px;padding:0 10px;font-size:12px;line-height:18px;display:inline-flex}
      .gn-addModelButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
      .gn-input{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);width:100%;height:32px;font:inherit;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:0 10px;font-size:14px;line-height:22px}
      select.gn-input{cursor:pointer;max-width:240px}
      .gn-input:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}
      .gn-input::placeholder{color:var(--dsw-alias-label-dimmed)}
      .gn-input:disabled{opacity:.6;cursor:default}
      .gn-keyInput{position:relative}
      .gn-keyInputFilled{padding-right:40px}
      .gn-keyToggle{border-radius:var(--dsw-radius-md);width:32px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;justify-content:center;align-items:center;padding:0;display:inline-flex;position:absolute;inset:1px 1px 1px auto}
      .gn-keyToggle:hover:not(:disabled){color:var(--dsw-alias-label-primary)}
      .gn-keyToggle:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}
      .gn-keyToggle:disabled{opacity:.6;cursor:default}
      .gn-error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}
      .gn-customizedSummary:before{transition:none}
      .gn-candidateToolbar{align-items:center;gap:8px;margin-bottom:6px;display:flex}
      .gn-candidateSearch{flex:240px;min-width:0}
      .gn-candidateList{flex-direction:column;gap:2px;max-height:320px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}
      .gn-candidate{border-radius:var(--dsw-radius-md)}
      .gn-candidateLabel{cursor:pointer;align-items:center;gap:8px;padding:6px 8px;display:flex}
      .gn-candidateId{min-width:0;font-family:var(--ds-font-family-code);text-overflow:ellipsis;white-space:nowrap;flex:auto;font-size:13px;overflow:hidden}
      .gn-candidateEmpty{color:var(--dsw-alias-label-secondary);text-align:center;margin:24px 0;font-size:13px;line-height:20px}
      .gemini-native {color:var(--dsw-alias-label-primary);font:inherit;min-width:0}
      .gemini-native *, .gemini-native *::before {box-sizing:border-box}
      .gn-controlGroup {display:flex;flex-direction:column;gap:14px;border:0;margin:0;padding:0;min-width:0}
      .gn-checkbox {display:inline-flex;align-items:center;gap:8px;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}
      .gn-checkbox input,.gn-candidateLabel input {accent-color:var(--dsw-alias-button-primary-fill)}
      .gn-dialog {width:min(380px,calc(100vw - 48px));max-width:520px;max-height:calc(100dvh - 48px);padding:0 0 24px;border:0;border-radius:var(--dsw-radius-panel);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-prominent);overflow:auto;font:inherit}
      .gn-dialog[open] {display:flex;flex-direction:column;gap:20px}
      .gn-dialog::backdrop {background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur)}
      .gn-dialog:focus {outline:none}
      .gn-dialogContent {display:flex;flex-direction:column;width:100%}
      .gn-dialogHeader {display:flex;align-items:center;justify-content:space-between;gap:8px;padding:22px 14px 12px 24px}
      .gn-dialogTitle {margin:0;font-size:16px;line-height:24px;font-weight:500;color:var(--dsw-alias-label-primary)}
      .gn-dialogDescription {margin:0;padding:0 24px;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}
      .gn-dialogBody {display:flex;flex-direction:column;min-width:0;margin-top:20px;padding:0 24px}
      .gn-dialogFooter {display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 24px}
      .gn-candidateToolbar .gn-linkButton {flex:none;color:var(--dsw-alias-label-primary)}
    `;
    function icon(name, size = 16) {
      const paths = {
        eye: 'M1.5 8C2.9 5.25 5.25 3.5 8 3.5C10.75 3.5 13.1 5.25 14.5 8C13.1 10.75 10.75 12.5 8 12.5C5.25 12.5 2.9 10.75 1.5 8Z M10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
        eyeOff: 'M1.5 8C2.9 5.25 5.25 3.5 8 3.5C10.75 3.5 13.1 5.25 14.5 8C13.1 10.75 10.75 12.5 8 12.5C5.25 12.5 2.9 10.75 1.5 8Z M2.5 2.5l11 11',
        down: 'm4 6 4 4 4-4', right: 'm6 4 4 4-4 4',
        trash: 'M3 4h10 M6 4V2h4v2 M4 4l.7 10h6.6L12 4 M6.5 6.5v5 M9.5 6.5v5',
        plus: 'M8 3v10 M3 8h10', close: 'm4 4 8 8 M12 4l-8 8',
      };
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: paths[name] }));
    }
    function result(response) {
      if (!response.ok) throw new Error(response.error.message);
      return response.value;
    }
    function parseCapacity(text) {
      if (!text.trim()) return undefined;
      const match = /^(\d+(?:\.\d+)?)([km])?$/i.exec(text.trim());
      if (!match) return NaN;
      return Number(match[1]) * ({ k: 1000, m: 1000000 }[match[2]?.toLowerCase()] ?? 1);
    }
    function formatCapacity(value) {
      if (value === undefined) return '';
      if (value % 1000000 === 0) return `${value / 1000000}M`;
      if (value % 1000 === 0) return `${value / 1000}K`;
      return String(value);
    }
    function draftRows(models) {
      return models.map(model => ({ key: crypto.randomUUID(), model, expanded: false,
        contextWindow: formatCapacity(model.contextWindow), maxTokens: formatCapacity(model.maxTokens) }));
    }
    function ModelRow({ row, index, t, update, remove, toggle }) {
      const model = row.model;
      const selected = model.inputModalities ?? ['text', 'image'];
      return h('div', { className: 'gn-modelEntry' },
        h('div', { className: 'gn-modelRow' },
          ...['id', 'name'].map(field => h('input', {
            key: field, className: 'gn-input', value: model[field] ?? '',
            placeholder: t(field === 'id' ? 'modelId' : 'modelName'),
            'aria-label': `${t(field === 'id' ? 'modelId' : 'modelName')} ${index + 1}`,
            onChange: event => update(field, event.target.value),
          })),
          h('button', { type: 'button', className: 'gn-iconButton', title: t('advanced'), 'aria-label': `${t('advanced')} ${index + 1}`, 'aria-expanded': row.expanded, onClick: toggle }, icon(row.expanded ? 'down' : 'right')),
          h('button', { type: 'button', className: 'gn-iconButton gn-iconButtonDanger', title: t('remove'), 'aria-label': `${t('remove')} ${index + 1}`, onClick: remove }, icon('trash', 14))),
        row.expanded ? h('div', { className: 'gn-modelAdvanced' },
          ...[['contextWindow', 'context', '1M'], ['maxTokens', 'output', '64K']].map(([field, label, placeholder]) => h('label', { className: 'gn-modelField', key: field },
            h('span', { className: 'gn-modelFieldLabel' }, t(label)),
            h('input', { className: 'gn-input', type: 'text', placeholder, value: row[field], 'aria-label': `${t(label)} ${index + 1}`, onChange: event => update(field, event.target.value) }))),
          h('fieldset', { className: 'gn-modelInputTypes', 'aria-label': `${t('inputTypes')} ${index + 1}` },
            h('legend', { className: 'gn-modelFieldLabel' }, t('inputTypes')),
            h('div', { className: 'gn-modelInputChoices' }, ...['text', 'image'].map(modality => h('label', { className: 'gn-checkbox', key: modality },
              h('input', { type: 'checkbox', checked: selected.includes(modality), disabled: selected.length === 1 && selected.includes(modality),
                onChange: event => update('inputModalities', ['text', 'image'].filter(value => value === modality ? event.target.checked : selected.includes(value))) }), t(modality)))))) : null);
    }
    function ModelPicker({ candidates, existingIds, t, onAdd, onClose }) {
      const dialog = React.useRef(null);
      const titleId = React.useId();
      const descriptionId = React.useId();
      const [query, setQuery] = React.useState('');
      const [picked, setPicked] = React.useState(() => new Set(candidates.filter(model => !existingIds.has(model.id)).map(model => model.id)));
      React.useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
      }, []);
      const search = query.trim().toLowerCase();
      const visible = candidates.filter(model => model.id.toLowerCase().includes(search) || model.name?.toLowerCase().includes(search));
      const allPicked = visible.length > 0 && visible.every(model => picked.has(model.id));
      const close = () => { dialog.current.close(); onClose(); };
      return h('dialog', { ref: dialog, className: 'gn-dialog', 'aria-labelledby': titleId, 'aria-describedby': descriptionId,
        onCancel: event => { event.preventDefault(); event.stopPropagation(); close(); },
        onKeyDown: event => { event.stopPropagation(); if (event.key === 'Enter' && event.target.type === 'search') event.preventDefault(); },
        onClick: event => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
        } },
        h('div', { className: 'gn-dialogContent' },
          h('div', { className: 'gn-dialogHeader' }, h('h2', { id: titleId, className: 'gn-dialogTitle' }, t('fetchTitle')),
            h('button', { type: 'button', className: 'gn-iconButton', 'aria-label': t('close'), onClick: close }, icon('close'))),
          h('p', { id: descriptionId, className: 'gn-dialogDescription' }, t('fetchDescription')),
          h('div', { className: 'gn-dialogBody' },
            h('div', { className: 'gn-candidateToolbar' },
              h('input', { className: 'gn-input gn-candidateSearch', type: 'search', autoFocus: true, value: query, placeholder: t('search'), 'aria-label': t('search'), onChange: event => setQuery(event.target.value) }),
              h('button', { type: 'button', className: 'gn-linkButton', disabled: !visible.length, onClick: () => setPicked(current => allPicked ? new Set() : new Set([...current, ...visible.map(model => model.id)])) }, t(allPicked ? 'deselectAll' : 'selectAll'))),
            visible.length ? h('ul', { className: 'gn-candidateList' }, ...visible.map(model => h('li', { className: 'gn-candidate', key: model.id },
              h('label', { className: 'gn-candidateLabel' },
                h('input', { type: 'checkbox', checked: picked.has(model.id), onChange: () => setPicked(current => { const next = new Set(current); if (!next.delete(model.id)) next.add(model.id); return next; }) }),
                h('span', { className: 'gn-candidateId', title: model.name ?? model.id }, model.id)))))
              : h('p', { className: 'gn-candidateEmpty', role: 'status' }, t('noMatches')))),
        h('div', { className: 'gn-dialogFooter' },
          h('button', { type: 'button', className: 'gn-secondaryButton', onClick: close }, t('cancel')),
          h('button', { type: 'button', className: 'gn-secondaryButton', onClick: () => { onAdd(candidates.filter(model => picked.has(model.id))); close(); } }, t('adopt'))));
    }
    const retryDefaults = { enabled: true, maxRetries: 5, initialDelayMs: 5000, maxDelayMs: 30000 };
    function retryDraft(value) {
      const retry = { ...retryDefaults, ...value };
      return { enabled: retry.enabled, maxRetries: String(retry.maxRetries),
        initialDelay: String(retry.initialDelayMs / 1000), maxDelay: String(retry.maxDelayMs / 1000) };
    }
    function parseRetryDraft(draft) {
      const delayMs = text => {
        if (!/^\d+(?:\.\d{1,3})?$/.test(text)) return NaN;
        const [whole, fraction = ''] = text.split('.');
        return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
      };
      const value = { enabled: draft.enabled, maxRetries: /^\d+$/.test(draft.maxRetries) ? Number(draft.maxRetries) : NaN,
        initialDelayMs: delayMs(draft.initialDelay), maxDelayMs: delayMs(draft.maxDelay) };
      const errors = {};
      if (!Number.isSafeInteger(value.maxRetries) || value.maxRetries < 1 || value.maxRetries > 20) errors.maxRetries = 'invalidRetryCount';
      for (const field of ['initialDelay', 'maxDelay']) {
        const ms = value[`${field}Ms`];
        if (!Number.isSafeInteger(ms) || ms < 1000 || ms > 300000) errors[field] = 'invalidRetryDelay';
      }
      if (!errors.initialDelay && !errors.maxDelay && value.maxDelayMs < value.initialDelayMs) errors.maxDelay = 'invalidRetryOrder';
      return { value, errors };
    }
    function Editor({ ctx, provider, keyConfigured, t, onClose }) {
      const [view, setView] = React.useState();
      const [baseURL, setBaseURL] = React.useState('');
      const [rows, setRows] = React.useState([]);
      const [overridden, setOverridden] = React.useState(false);
      const [key, setKey] = React.useState('');
      const [visible, setVisible] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [fetching, setFetching] = React.useState(false);
      const [failure, setFailure] = React.useState('');
      const [fetchFailure, setFetchFailure] = React.useState('');
      const [candidates, setCandidates] = React.useState(null);
      const [endpointEdited, setEndpointEdited] = React.useState(false);
      const [modelsEdited, setModelsEdited] = React.useState(false);
      const [retry, setRetry] = React.useState(() => retryDraft());
      const [retryEdited, setRetryEdited] = React.useState(false);
      const retryHelpId = React.useId();
      const retryErrorId = React.useId();
      React.useEffect(() => {
        let active = true;
        const face = ctx.configForms.describe();
        face.ensure().then(() => {
          if (!active) return;
          const snapshot = face.getSnapshot();
          const found = snapshot.view?.namespaces.find(view => view.ns === provider.settingsNs);
          if (!found) throw new Error(snapshot.error || t('missing'));
          const schema = ctx.settingsSchema.rehydrate(found.schema);
          const defaults = found.base.models ?? ctx.settingsSchema.nodeAtPath(schema, ['models']).meta.default;
          setView({ ...found, writable: snapshot.view.writable, defaults });
          setBaseURL(found.user.baseURL ?? '');
          setRows(draftRows(found.value.models));
          setOverridden(Object.hasOwn(found.user, 'models'));
          setRetry(retryDraft(found.value.quotaRetry));
        }).catch(error => { if (active) setFailure(error.message); });
        return () => { active = false; };
      }, []);
      const models = rows.map(row => row.model);
      const endpoint = baseURL.trim() || view?.base.baseURL || provider.defaultBaseURL;
      const keyError = key && (!key.trim() || !/^[\x21-\x7e]+$/.test(key.trim()) || /^[A-Z][A-Z0-9_]*=[^=]/.test(key.trim()) || /^["'`]/.test(key.trim())) ? t('invalidKey') : '';
      let endpointError = '';
      try { if (!/^https?:$/.test(new URL(endpoint).protocol)) endpointError = t('invalidEndpoint'); } catch { endpointError = t('invalidEndpoint'); }
      const ids = models.map(model => model.id.trim());
      const modelError = ids.some(id => !id) || new Set(ids).size !== ids.length ? t('invalidId')
        : models.some(model => ['contextWindow', 'maxTokens'].some(field => model[field] !== undefined && (!Number.isSafeInteger(model[field]) || model[field] < 1))) ? t('invalidCapacity') : '';
      const parsedRetry = parseRetryDraft(retry);
      const retryError = Object.values(parsedRetry.errors)[0];
      function updateRetry(field, value) {
        setRetryEdited(true);
        setRetry(current => {
          // Disabled number fields must not trap an invalid draft. Turning off
          // restores their accepted values only when the current numbers are invalid.
          const next = field === 'enabled' && !value && Object.keys(parseRetryDraft(current).errors).length
            ? retryDraft(view.value.quotaRetry) : current;
          return { ...next, [field]: value };
        });
      }
      function update(rowKey, field, value) {
        setModelsEdited(true);
        setOverridden(true);
        setRows(current => current.map(row => {
          if (row.key !== rowKey) return row;
          const model = { ...row.model };
          const capacity = ['contextWindow', 'maxTokens'].includes(field);
          const next = capacity ? parseCapacity(value) : value;
          if (next === '' && field !== 'id' || next === undefined) delete model[field]; else model[field] = next;
          return { ...row, model, ...(capacity ? { [field]: value } : {}) };
        }));
      }
      async function fetchModels() {
        setFetching(true);
        setFetchFailure('');
        try {
          const apiKey = key.trim();
          const found = result(await ctx.remote.llm.discoverModels(provider.settingsNs, { provider: provider.provider, baseURL: endpoint, ...(apiKey ? { apiKey } : {}) }));
          if (found.length) setCandidates(found); else setFetchFailure(t('fetchEmpty'));
        } catch (error) { setFetchFailure(error.message); } finally { setFetching(false); }
      }
      async function save(event) {
        event.preventDefault();
        if (!view || busy || fetching || !view.writable || keyError || endpointError || modelError || retryError) return;
        setBusy(true);
        setFailure('');
        try {
          const ops = [];
          const address = baseURL.trim();
          if (endpointEdited && address !== (view.user.baseURL ?? '')) ops.push(address ? { op: 'set', path: ['baseURL'], value: address } : { op: 'unset', path: ['baseURL'] });
          const values = models.map(model => ({ ...model, id: model.id.trim() }));
          if (modelsEdited) {
            if (!overridden && Object.hasOwn(view.user, 'models')) ops.push({ op: 'unset', path: ['models'] });
            else if (overridden && JSON.stringify(values) !== JSON.stringify(view.user.models)) ops.push({ op: 'set', path: ['models'], value: values });
          }
          // Do not materialize defaults or replace unrelated/redacted settings.
          const acceptedRetry = parseRetryDraft(retryDraft(view.value.quotaRetry)).value;
          if (retryEdited && JSON.stringify(parsedRetry.value) !== JSON.stringify(acceptedRetry)) {
            ops.push({ op: 'set', path: ['quotaRetry'], value: parsedRetry.value });
          }
          let committed = view;
          if (ops.length) {
            committed = result(await ctx.remote.settings.mutate(provider.settingsNs, ops, view.revision));
            ctx.configForms.describe().acceptView(committed);
            setView({ ...committed, writable: view.writable, defaults: view.defaults });
          }
          if (key.trim()) result(await ctx.remote.credentials.set(committed.value.apiKeyEnv, key.trim()));
          setKey('');
          onClose(true);
        } catch (error) { setFailure(error.message); } finally { setBusy(false); }
      }
      if (!view) return h('p', { className: failure ? 'gn-error' : 'gn-advancedHint', role: failure ? 'alert' : 'status' }, failure || t('loading'));
      const disabled = busy || fetching || !view.writable;
      const credentialRef = view.value.apiKeyEnv;
      return h(React.Fragment, null,
        h('form', { className: 'gn-editor', onSubmit: save },
          h('div', { className: 'gn-editorHeader' }, h('span', { className: 'gn-editorTitle' }, provider.displayName), h('span', { className: 'gn-editorRoute' }, provider.provider)),
          h('fieldset', { className: 'gn-controlGroup', disabled },
            h('div', { className: 'gn-field' },
              h('span', { className: 'gn-fieldLabel' }, t('key'), h('button', { type: 'button', className: 'gn-helpButton', 'aria-label': t('authHelp'), title: t('authHint').replace('{ref}', credentialRef) }, '?')),
              h('div', { className: 'gn-keyInput' },
                h('input', { className: `gn-input ${key ? 'gn-keyInputFilled' : ''}`, type: visible ? 'text' : 'password', autoComplete: 'new-password', value: key, 'aria-label': t('key'), 'aria-invalid': !!keyError, placeholder: t(keyConfigured ? 'savedKey' : 'newKey').replace('{ref}', credentialRef), onChange: event => { setKey(event.target.value); setVisible(false); } }),
                key ? h('button', { type: 'button', className: 'gn-keyToggle', 'aria-label': t(visible ? 'hide' : 'show'), onClick: () => setVisible(value => !value), 'aria-pressed': visible }, icon(visible ? 'eyeOff' : 'eye')) : null),
              !key && !keyConfigured ? h('p', { className: 'gn-notice' }, t('missingKey').replace('{ref}', credentialRef)) : null,
              keyError ? h('p', { className: 'gn-error' }, keyError) : null),
            h('details', { className: 'gn-customized' },
              h('summary', { className: 'gn-customizedSummary' }, t('customized')),
              h('div', { className: 'gn-customizedBody' },
                h('label', { className: 'gn-field' }, h('span', { className: 'gn-fieldLabel' }, t('endpoint')),
                  h('input', { className: 'gn-input', type: 'text', value: baseURL, placeholder: view.base.baseURL || provider.defaultBaseURL, 'aria-label': t('endpoint'), 'aria-invalid': !!endpointError, onChange: event => { setBaseURL(event.target.value); setEndpointEdited(true); } })),
                endpointError ? h('p', { className: 'gn-error' }, endpointError) : null,
                h('section', { className: 'gn-modelCatalog', 'aria-label': t('quotaRetry') },
                  h('span', { className: 'gn-modelCatalogTitle' }, t('quotaRetry')),
                  h('label', { className: 'gn-checkbox' },
                    h('input', { type: 'checkbox', role: 'switch', checked: retry.enabled, 'aria-checked': retry.enabled,
                      'aria-label': t('quotaRetryEnabled'), 'aria-describedby': retryHelpId, disabled,
                      onChange: event => updateRetry('enabled', event.target.checked) }), t('quotaRetryEnabled')),
                  h('div', { id: retryHelpId },
                    ...['retryHelp', 'retryBudget', 'retryOff'].map(label => h('p', { key: label, className: 'gn-advancedHint' }, t(label)))),
                  h('div', { className: 'gn-retryFields' },
                    ...[['maxRetries', 'retryCount', 20, 1], ['initialDelay', 'retryInitial', 300, 0.001], ['maxDelay', 'retryMax', 300, 0.001]].map(([field, label, max, step]) => h('label', { key: field, className: 'gn-field' },
                      h('span', { className: 'gn-fieldLabel' }, t(label)),
                      h('input', { className: 'gn-input', type: 'number', value: retry[field], min: 1, max, step,
                        required: retry.enabled, disabled: disabled || !retry.enabled, 'aria-label': t(label),
                        'aria-invalid': !!parsedRetry.errors[field], 'aria-describedby': parsedRetry.errors[field] ? retryErrorId : undefined,
                        onChange: event => updateRetry(field, event.target.value) })))),
                  h('p', { className: 'gn-advancedHint' }, t('retryPrecision')),
                  retryError ? h('p', { id: retryErrorId, className: 'gn-error', role: 'alert' }, t(retryError)) : null),
                h('section', { className: 'gn-modelCatalog', 'aria-label': t('models') },
                  h('div', { className: 'gn-modelListHead' },
                    h('div', { className: 'gn-modelCatalogHeading' }, h('span', { className: 'gn-modelCatalogTitle' }, t('models')), h('span', { className: 'gn-modelCatalogMeta' }, t(overridden ? 'customizedModels' : 'inherited'))),
                    overridden ? h('button', { type: 'button', className: 'gn-linkButton', onClick: () => { setRows(draftRows(view.defaults)); setOverridden(false); setModelsEdited(true); } }, t('reset')) : null,
                    h('button', { type: 'button', className: 'gn-linkButton', disabled: disabled || !!keyError || !!endpointError, title: keyError || endpointError || undefined, onClick: fetchModels }, t(fetching ? 'fetching' : 'fetch'))),
                  !rows.length ? h('p', { className: 'gn-modelEmpty' }, t('empty')) : null,
                  h('div', { className: 'gn-modelList' }, ...rows.map((row, index) => h(ModelRow, { key: row.key, row, index, t,
                    update: (field, value) => update(row.key, field, value),
                    toggle: () => setRows(current => current.map(item => item.key === row.key ? { ...item, expanded: !item.expanded } : item)),
                    remove: () => { setRows(current => current.filter(item => item.key !== row.key)); setOverridden(true); setModelsEdited(true); },
                  }))),
                  h('button', { type: 'button', className: 'gn-addModelButton', onClick: () => { setRows(current => [...current, ...draftRows([{ id: '' }])]); setOverridden(true); setModelsEdited(true); } }, icon('plus', 14), t('add')),
                  fetchFailure ? h('p', { className: 'gn-error', role: 'alert' }, fetchFailure) : null))),
            modelError ? h('p', { className: 'gn-advancedHint' }, modelError) : null,
            failure ? h('p', { className: 'gn-error', role: 'alert' }, failure) : null,
            h('div', { className: 'gn-editorActions' },
              h('button', { type: 'button', className: 'gn-secondaryButton', onClick: () => onClose(false) }, t('cancel')),
              h('button', { type: 'submit', className: 'gn-primaryButton', disabled: disabled || !!keyError || !!endpointError || !!modelError || !!retryError }, t(busy ? 'busy' : 'save'))))),
        candidates ? h(ModelPicker, { candidates, existingIds: new Set(ids), t, onClose: () => setCandidates(null), onAdd: selected => {
          const known = new Set(ids);
          const additions = selected.filter(model => !known.has(model.id));
          if (additions.length) { setRows(current => [...current, ...draftRows(additions)]); setOverridden(true); setModelsEdited(true); }
        } }) : null);
    }
    function Card({ ctx, t, provider, keyConfigured }) {
      const [open, setOpen] = React.useState(false);
      const [saved, setSaved] = React.useState(false);
      const mount = React.useRef(null);
      React.useEffect(() => {
        // Harness 0.2.1 does not expose its Edit action through the card slot.
        const row = mount.current.closest('li');
        const section = row.parentElement.parentElement;
        const edit = row.querySelector(':scope > div > span > button');
        const onClick = event => {
          if (edit?.contains(event.target)) {
            event.stopPropagation();
            // Let the native Cancel action discard any other provider's draft.
            for (const editor of section.querySelectorAll(':scope > ul > li > div[class$="_editor"]')) editor.lastElementChild.querySelector('button').click();
            setOpen(value => !value);
            setSaved(false);
          } else if (!row.contains(event.target) && event.target.closest('button')) {
            setOpen(false);
            setSaved(false);
          }
        };
        section.addEventListener('click', onClick, true);
        return () => section.removeEventListener('click', onClick, true);
      }, []);
      return h('div', { className: 'gemini-native', ref: mount, hidden: !open && !saved },
        h('style', null, css),
        open ? h(Editor, { ctx, t, provider, keyConfigured, onClose(changed) { setOpen(false); setSaved(changed); } }) : null,
        saved ? h('p', { className: 'gn-savedNotice', role: 'status' }, t('saved')) : null);
    }
    return {
      inject: ['slots', 'locale', 'configForms', 'settingsSchema', 'remote', 'remote.settings', 'remote.credentials', 'remote.llm'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, copy));
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register({
          name: 'settings.models.provider-card', key: 'llm-gemini-native', locale: NS,
          inject: () => ({ ctx, t }),
        }, Card));
      },
    };
  },
});
