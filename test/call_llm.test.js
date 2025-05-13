const { callLLM } = require('../utils/call_llm');

// Tool definition for getting current time
const timeTool = {
  name: 'get_current_time',
  description: 'Get the current time in ISO format',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  function: () => {
    console.log('get_current_time tool called');
    return new Date().toISOString();
  },
};

// Test function to demonstrate both streaming and non-streaming usage
async function testCallLLM() {
  try {
    // // Non-streaming example
    // console.log('\nTesting non-streaming response:');
    // const response = await callLLM(
    //   'You are a helpful assistant that can tell the time. When asked about the time, use the get_current_time tool.',
    //   'What time is it right now?',
    //   {
    //     provider: 'anthropic',
    //     model: 'claude-3-5-sonnet-20240620',
    //     tools: [timeTool],
    //     temperature: 0.7,
    //   }
    // );

    // console.log('Response:', response.content);

    // Streaming example
    console.log('\nTesting streaming response:');
    const streamResponse = await callLLM(
      'You are a helpful assistant that can tell the time. When asked about the time, use the get_current_time tool.',
      'What time is it right now?',
      {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20240620',
        tools: [timeTool],
        stream: true,
        temperature: 0.7,
      }
    );

    console.log('Streaming response:');
    let fullResponse = '';
    for await (const chunk of streamResponse.content) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }
    console.log('\n\nFull streamed response:', fullResponse);

    // Test tool call handling
    console.log('\nTesting tool call handling:');
    const toolCallResponse = await callLLM(
      'You are a helpful assistant that can tell the time. When asked about the time, use the get_current_time tool.',
      'What time is it right now?',
      {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20240620',
        tools: [timeTool],
        temperature: 0.7,
        stream: true,
      }
    );

    console.log('Tool Call Response:', toolCallResponse.content);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.context) {
      console.error('Context:', error.context);
    }
  }
}

// Run the test
testCallLLM(); 