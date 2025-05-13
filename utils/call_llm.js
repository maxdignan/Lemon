const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');

// Custom error types
class LLMError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'LLMError';
    this.context = context;
  }
}

class ProviderError extends LLMError {
  constructor(message, provider, context = {}) {
    super(message, { ...context, provider });
    this.name = 'ProviderError';
  }
}

// Provider configurations
const PROVIDERS = {
  openai: {
    envKey: 'OPENAI_API_KEY',
    clientClass: OpenAI,
    defaultModel: 'gpt-3.5-turbo',
    supportsStreaming: true,
  },
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    clientClass: Anthropic,
    defaultModel: 'claude-3-opus-20240229',
    supportsStreaming: true,
  },
};

// Helper function to get API key
function getApiKey(provider, params) {
  if (params?.api_key) return params.api_key;
  const envKey = PROVIDERS[provider]?.envKey;
  if (!envKey) throw new ProviderError('Provider not supported', provider);
  const key = process.env[envKey];
  if (!key) throw new ProviderError('API key not found', provider);
  return key;
}

// Helper function to create provider client
function createProviderClient(provider, apiKey) {
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) throw new ProviderError('Provider not supported', provider);
  return new providerConfig.clientClass({ apiKey });
}

// Helper function to handle retries
async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error.status === 429 || error.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Helper function to handle timeouts
async function withTimeout(promise, timeout) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new LLMError('Request timed out')), timeout);
  });
  return Promise.race([promise, timeoutPromise]);
}

// Main function implementation
async function callLLM(systemPrompt, userPrompt, params = {}) {
  const {
    model,
    temperature = 0.7,
    max_tokens = 4096,
    stream = false,
    tools,
    mcps,
    max_retries = 3,
    timeout = 30000,
    provider = 'openai',
  } = params;

  try {
    const apiKey = getApiKey(provider, params);
    const client = createProviderClient(provider, apiKey);
    const providerConfig = PROVIDERS[provider];

    const requestFn = async () => {
      if (provider === 'openai') {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        const requestConfig = {
          model: model || providerConfig.defaultModel,
          messages,
          temperature,
          max_tokens,
          stream,
          tools,
        };

        if (stream) {
          const stream = await client.chat.completions.create(requestConfig);
          return {
            isStream: true,
            content: (async function* () {
              try {
                for await (const chunk of stream) {
                  const content = chunk.choices[0]?.delta?.content;
                  if (content) yield content;
                }
              } catch (error) {
                throw new ProviderError('Stream error', provider, { error });
              }
            })(),
          };
        }

        const response = await client.chat.completions.create(requestConfig);
        return {
          isStream: false,
          content: response.choices[0]?.message?.content || '',
        };
      }

      if (provider === 'anthropic') {
        const requestConfig = {
          model: model || providerConfig.defaultModel,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature,
          max_tokens,
          stream,
        };

        if (stream) {
          const stream = await client.messages.create(requestConfig);
          return {
            isStream: true,
            content: (async function* () {
              try {
                for await (const chunk of stream) {
                  if (chunk.type === 'content_block_delta') {
                    yield chunk.delta.text;
                  }
                }
              } catch (error) {
                throw new ProviderError('Stream error', provider, { error });
              }
            })(),
          };
        }

        const response = await client.messages.create(requestConfig);
        return {
          isStream: false,
          content: response.content[0]?.text || '',
        };
      }

      throw new ProviderError('Provider not supported', provider);
    };

    return await withTimeout(
      withRetry(requestFn, max_retries),
      timeout
    );
  } catch (error) {
    if (error instanceof LLMError) throw error;
    throw new ProviderError('Request failed', provider, { error });
  }
}

module.exports = {
  callLLM,
  LLMError,
  ProviderError,
}; 