Objective:
In `callLLM`, the llm is able to respond with the desire to call a tool in the response from the API. If this is the case, please call the associated function with that tool in the manner prescribed by the tool call from the LLM.

If there is a tool call in the response from the LLM, please pass the last message out as a stream, regardless of whether the LLM response is a stream or not. Also, please call the tool function. With the awaited response from the tool function, please pass the response back to the LLM as the last message. Then pass the response back to the caller of `callLLM` via the stream.

Specs:

1. Tool Call Detection:
   - The function must detect if the LLM response contains a tool call.
   - Tool calls are identified by a specific format in the response (e.g., a JSON object with a 'tool_call' field).

2. Tool Function Execution:
   - If a tool call is detected, the function must execute the associated tool function.
   - The tool function is called with the parameters provided by the LLM.
   - The result of the tool function is awaited.

3. Streaming Response:
   - If a tool call is detected, the last message from the LLM must be streamed to the caller, regardless of whether the original response was a stream or not.
   - The streaming should be implemented using an AsyncGenerator.

4. Tool Response Handling:
   - After executing the tool function, the result is passed back to the LLM as the last message.
   - The LLM's response to the tool result is then streamed back to the caller.

5. Error Handling:
   - The function must handle errors that occur during tool function execution.
   - Errors should be propagated to the caller with appropriate context.
     - unless it is a recoverable error, such as "Overloaded" or "Rate limited", in which case it should be retried - with an exponential backoff.

6. Testing:
   - The test file should include cases for both streaming and non-streaming responses with tool calls.
   - The test should verify that the tool function is called and its result is correctly passed back to the LLM.
   - The test should also verify that the final response is streamed correctly.

7. Documentation:
   - The function should be documented with JSDoc comments, including examples of tool call handling.
   - The test file should include comments explaining the test cases and expected outcomes.
