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
    defaultModel: 'claude-3-5-sonnet-20240620',
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

// Helper function to detect tool calls in the LLM response
async function detectToolCall(response) {
  console.log('Response for tool call detection:', response);
  if (response.isStream) {
    let content = '';
    for await (const chunk of response.content) {
      content += chunk;
    }
    console.log('Stream content:', content);
    return content.includes('get_current_time');
  }
  console.log('Non-stream content:', response.content);
  return response.content && response.content.includes('get_current_time');
}

// Helper function to execute the tool function
async function executeToolFunction(toolCall, tools) {
  console.log('executeToolFunction', toolCall, tools);
  const tool = tools.find(t => t.name === toolCall.name);
  if (!tool) throw new Error(`Tool ${toolCall.name} not found`);
  return await tool.function(toolCall.parameters);
}

// Helper: parse tool call from Anthropic streaming response
async function getAnthropicToolCallFromStream(stream) {
  let toolCall = null;
  for await (const chunk of stream) {
    if (chunk.type === 'tool_use') {
      toolCall = {
        name: chunk.name,
        parameters: chunk.input,
        tool_use_id: chunk.id,
      };
      break;
    }
  }
  return toolCall;
}

// Helper: parse tool call from Anthropic non-streaming response
function getAnthropicToolCallFromResponse(response) {
  if (!response || !response.content) return null;
  const toolBlock = response.content.find(
    (block) => block.type === 'tool_use'
  );
  if (!toolBlock) return null;
  return {
    name: toolBlock.name,
    parameters: toolBlock.input,
    tool_use_id: toolBlock.id,
  };
}

// Helper: tee an async iterator (returns [iter1, iter2])
function teeAsyncIterator(asyncIterable) {
  const buffer = [];
  const readers = [];
  let done = false;
  let error = null;
  const iterator = asyncIterable[Symbol.asyncIterator]();

  async function fillBuffer() {
    if (done) return;
    try {
      const result = await iterator.next();
      if (result.done) {
        done = true;
        readers.forEach((r) => r.resolve({ done: true }));
      } else {
        buffer.push(result.value);
        readers.forEach((r) => r.resolve({ value: result.value }));
        readers.length = 0;
      }
    } catch (err) {
      error = err;
      readers.forEach((r) => r.reject(err));
      readers.length = 0;
    }
  }

  function makeAsyncGenerator() {
    let index = 0;
    return {
      [Symbol.asyncIterator]() { return this; },
      async next() {
        if (error) throw error;
        if (index < buffer.length) {
          return { value: buffer[index++], done: false };
        }
        if (done) return { done: true };
        return new Promise((resolve, reject) => {
          readers.push({
            resolve: ({ value, done }) => {
              if (done) {
                resolve({ done: true });
              } else {
                index++;
                resolve({ value, done: false });
              }
            },
            reject,
          });
          fillBuffer();
        });
      },
    };
  }
  return [makeAsyncGenerator(), makeAsyncGenerator()];
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

    // Only update Anthropic/Claude tool call handling
    if (provider === 'anthropic') {
      const messages = [
        { role: 'user', content: userPrompt },
      ];
      const requestConfig = {
        model: model || providerConfig.defaultModel,
        system: systemPrompt,
        messages,
        temperature,
        max_tokens,
        stream,
        tools: tools
          ? tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters,
            }))
          : undefined,
      };

      // Streaming
      if (stream) {
        const streamObj = await client.messages.create(requestConfig);
        // Tee the stream so we can both inspect and stream
        const [inspectStream, userStream] = teeAsyncIterator(streamObj);
        // Find tool call in inspectStream
        let toolCallBlock = null;
        let toolCall = null;
        for await (const chunk of inspectStream) {
          if (chunk.type === 'tool_use') {
            toolCallBlock = chunk;
            toolCall = {
              name: chunk.name,
              parameters: chunk.input,
              tool_use_id: chunk.id,
            };
            break;
          }
        }
        if (toolCall && toolCallBlock) {
          const toolResult = await executeToolFunction(toolCall, tools);
          // Now send tool result back to Claude with correct message history
          const followupMessages = [
            { role: 'user', content: userPrompt },
            {
              role: 'assistant',
              content: [
                {
                  type: 'tool_use',
                  id: toolCallBlock.id,
                  name: toolCallBlock.name,
                  input: toolCallBlock.input,
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolCallBlock.id,
                  content: toolResult,
                },
              ],
            },
          ];
          const followupConfig = {
            ...requestConfig,
            messages: followupMessages,
            stream: true,
          };
          const followupStream = await client.messages.create(followupConfig);
          return {
            isStream: true,
            content: (async function* () {
              for await (const chunk of followupStream) {
                if (chunk.type === 'content_block_delta' && chunk.delta && typeof chunk.delta.text === 'string') {
                  yield chunk.delta.text;
                }
              }
            })(),
          };
        } else {
          // No tool call, just stream as usual
          return {
            isStream: true,
            content: (async function* () {
              for await (const chunk of userStream) {
                if (chunk.type === 'content_block_delta' && chunk.delta && typeof chunk.delta.text === 'string') {
                  yield chunk.delta.text;
                }
              }
            })(),
          };
        }
      }
      // Non-streaming
      const response = await client.messages.create(requestConfig);
      const toolCallBlock = response.content.find((block) => block.type === 'tool_use');
      const toolCall = toolCallBlock
        ? {
            name: toolCallBlock.name,
            parameters: toolCallBlock.input,
            tool_use_id: toolCallBlock.id,
          }
        : null;
      if (toolCall && toolCallBlock) {
        const toolResult = await executeToolFunction(toolCall, tools);
        // Now send tool result back to Claude with correct message history
        const followupMessages = [
          { role: 'user', content: userPrompt },
          {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: toolCallBlock.id,
                name: toolCallBlock.name,
                input: toolCallBlock.input,
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolCallBlock.id,
                content: toolResult,
              },
            ],
          },
        ];
        const followupConfig = {
          ...requestConfig,
          messages: followupMessages,
          stream: false,
        };
        const followupResponse = await client.messages.create(followupConfig);
        // Return the final content as string
        const contentBlock = followupResponse.content.find(
          (block) => block.type === 'text'
        );
        return {
          isStream: false,
          content: contentBlock ? contentBlock.text : '',
        };
      }
      // No tool call, just return as usual
      const contentBlock = response.content.find((block) => block.type === 'text');
      return {
        isStream: false,
        content: contentBlock ? contentBlock.text : '',
      };
    }

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

      throw new ProviderError('Provider not supported', provider);
    };

    const result = await withTimeout(
      withRetry(requestFn, max_retries),
      timeout
    );

    // Check for tool calls in the response
    if (await detectToolCall(result)) {
      const toolCall = { name: 'get_current_time', parameters: {} };
      const toolResult = await executeToolFunction(toolCall, tools);
      console.log('Tool Result:', toolResult);

      // Pass the tool result back to the LLM
      const toolResponse = await callLLM(
        systemPrompt,
        `Tool result: ${toolResult}`,
        { ...params, stream: true }
      );
      console.log('LLM Response with Tool Result:', toolResponse);

      // Stream the tool response back to the caller
      return {
        isStream: true,
        content: (async function* () {
          for await (const chunk of toolResponse.content) {
            yield chunk;
          }
        })(),
      };
    }

    return result;
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