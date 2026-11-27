export type MtProviderId =
  | 'free-google'
  | 'gemini'
  | 'zhipu'
  | 'siliconflow'
  | 'deepseek'
  | 'openrouter'
  | 'ollama'
  | 'caiyun'
  | 'openai-compat';

export type MtProtocol = 'free-google' | 'gemini' | 'openai-compat' | 'caiyun';

export interface MtPreset {
  id: MtProviderId;
  label: string;
  protocol: MtProtocol;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresKey: boolean;
  hint: string;
}

export interface MtConfig {
  enabled: boolean;
  translateStories: boolean;
  translateVoices: boolean;
  fallbackToFree: boolean;
  provider: MtProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  customPrompt: string;
}

export const MT_CONFIG_STORAGE_KEY = 'sczh:mt-config:v1';

export const MT_PRESETS: readonly MtPreset[] = [
  {
    id: 'free-google',
    label: '免 Key 免费保底（Google 神经翻译）',
    protocol: 'free-google',
    defaultBaseUrl: 'https://translate.googleapis.com/translate_a/single',
    defaultModel: 'google-nmt-free',
    requiresKey: false,
    hint: '零配置开箱即用，自动配合 283 角色与术语表修正；如可直连 Google 即可直接保底使用。',
  },
  {
    id: 'gemini',
    label: 'Google Gemini（免费层推荐）',
    protocol: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    requiresKey: true,
    hint: '可在 Google AI Studio 免费申请 API Key，二次元日文语境与角色口癖表现极佳。',
  },
  {
    id: 'zhipu',
    label: '智谱 BigModel（国内直连 · 免费模型）',
    protocol: 'openai-compat',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    requiresKey: true,
    hint: '国内直连无需代理；glm-4-flash 在智谱开放平台提供免费调用额度，注册领 Key 即可使用。',
  },
  {
    id: 'siliconflow',
    label: '硅基流动 SiliconFlow（国内直连）',
    protocol: 'openai-compat',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    requiresKey: true,
    hint: '国内直连稳定，Qwen2.5-7B-Instruct 等小模型免费/极低成本。',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek API',
    protocol: 'openai-compat',
    defaultBaseUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    requiresKey: true,
    hint: '中文文风非常自然，价格极低（约 1 分钱可翻数十篇剧情）。',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter（支持 :free 免费模型）',
    protocol: 'openai-compat',
    defaultBaseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'qwen/qwen3-8b:free',
    requiresKey: true,
    hint: '注册后可用带 :free 后缀的免费模型（模型列表可按需修改）。',
  },
  {
    id: 'ollama',
    label: '本地 Ollama（完全免费离线）',
    protocol: 'openai-compat',
    defaultBaseUrl: 'http://127.0.0.1:11434/v1/chat/completions',
    defaultModel: 'qwen2.5:7b',
    requiresKey: false,
    hint: '连接本机 Ollama 服务，完全免费离线且不限速（无需填 API Key）。',
  },
  {
    id: 'caiyun',
    label: '彩云小译（自填 Token）',
    protocol: 'caiyun',
    defaultBaseUrl: 'https://api.interpreter.caiyunai.com/v1/translator',
    defaultModel: 'ja2zh',
    requiresKey: true,
    hint: '老版汉化同款极速引擎，需填入自己申请的彩云小译 Token。',
  },
  {
    id: 'openai-compat',
    label: '自定义 OpenAI 兼容接口',
    protocol: 'openai-compat',
    defaultBaseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    requiresKey: true,
    hint: '支持任意兼容 /v1/chat/completions 的第三方中转站或自建服务。',
  },
];

export function getMtPreset(id: MtProviderId): MtPreset {
  return MT_PRESETS.find((p) => p.id === id) ?? MT_PRESETS[0];
}

export function createDefaultMtConfig(): MtConfig {
  const preset = getMtPreset('free-google');
  return {
    enabled: true,
    translateStories: true,
    translateVoices: true,
    fallbackToFree: true,
    provider: preset.id,
    baseUrl: preset.defaultBaseUrl,
    apiKey: '',
    model: preset.defaultModel,
    timeoutMs: 30_000,
    customPrompt: '',
  };
}

export function loadMtConfig(): MtConfig {
  const defaults = createDefaultMtConfig();
  try {
    const raw = localStorage.getItem(MT_CONFIG_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<MtConfig>;
    const provider: MtProviderId =
      parsed.provider && MT_PRESETS.some((p) => p.id === parsed.provider)
        ? parsed.provider
        : defaults.provider;
    const preset = getMtPreset(provider);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : defaults.enabled,
      translateStories:
        typeof parsed.translateStories === 'boolean'
          ? parsed.translateStories
          : defaults.translateStories,
      translateVoices:
        typeof parsed.translateVoices === 'boolean'
          ? parsed.translateVoices
          : defaults.translateVoices,
      fallbackToFree:
        typeof parsed.fallbackToFree === 'boolean'
          ? parsed.fallbackToFree
          : defaults.fallbackToFree,
      provider,
      baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim() ? parsed.baseUrl.trim() : preset.defaultBaseUrl,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '',
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : preset.defaultModel,
      timeoutMs:
        typeof parsed.timeoutMs === 'number' && parsed.timeoutMs >= 3000 && parsed.timeoutMs <= 120_000
          ? parsed.timeoutMs
          : defaults.timeoutMs,
      customPrompt: typeof parsed.customPrompt === 'string' ? parsed.customPrompt : '',
    };
  } catch {
    return defaults;
  }
}

export function saveMtConfig(config: MtConfig): void {
  try {
    localStorage.setItem(MT_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}
