Objective:
Please create a function that will call an LLM function.

It should take:
 - system prompt
 - user prompt
 - optional params object
   - model
   - temperature
   - max_tokens
   - stream
   - tools
   - mcps
   - max_retries
   - timeout
   - api_key
It should return an object that indicates whether the call was a stream or not.
if it was a stream, it should indicate a boolean flag that it is a stream and contains a property that is a generator of strings that stream the response.
if it was not a stream, it should indicate a boolean flag that it is not a stream and contains a property that is a string of the response.

The function should be able to call any LLM function that is supported by the LLM provider.

Specs:

1. Function Signature:
```typescript
type LLMParams = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[];
  mcps?: any[];
  max_retries?: number;
  timeout?: number;
  api_key?: string;
}

type LLMResponse = {
  isStream: boolean;
  content: string | AsyncGenerator<string>;
}

function callLLM(
  systemPrompt: string,
  userPrompt: string,
  params?: LLMParams
): Promise<LLMResponse>
```

2. Implementation Requirements:
   - Support multiple LLM providers (OpenAI, Anthropic, etc.)
   - Handle API key management:
     - Accept API key in params
     - Fall back to environment variables if not provided
     - Support different environment variable names for different providers
   - Implement retry logic:
     - Use exponential backoff
     - Respect max_retries parameter
     - Handle rate limits and temporary failures
   - Implement timeout handling:
     - Use provided timeout parameter
     - Default timeout of 30 seconds if not specified
   - Support streaming:
     - Return AsyncGenerator for streaming responses
     - Handle stream errors and cleanup
   - Support non-streaming:
     - Return complete response as string
     - Handle response parsing and error cases

3. Error Handling:
   - Define custom error types for different failure scenarios
   - Handle API-specific errors
   - Provide meaningful error messages
   - Include error context in thrown errors

4. Provider Support:
   - OpenAI:
     - Support GPT-3.5 and GPT-4 models
     - Handle function calling
     - Support streaming and non-streaming
   - Anthropic:
     - Support Claude models
     - Handle message format differences
     - Support streaming and non-streaming
   - Extensible design for adding more providers

5. Testing Requirements:
   - Unit tests for each provider
   - Integration tests with mock responses
   - Error handling tests
   - Streaming tests
   - Timeout tests
   - Retry logic tests

6. Documentation:
   - JSDoc comments for all types and functions
   - Usage examples for each provider
   - Error handling examples
   - Streaming vs non-streaming examples
   - Environment variable setup guide

7. Performance Considerations:
   - Efficient handling of large responses
   - Memory management for streaming
   - Connection pooling for multiple requests
   - Caching of provider-specific configurations

