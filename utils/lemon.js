import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { exec } from 'child_process';

const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

/**
 * Call Lemon
 * @param {string} systemPrompt - The system prompt
 * @param {Array<{role: string, content: string}>} messages
 * @param {Array<{name: string, description: string, input_schema: object}>} tools
 * @returns {Promise<Object>} - The response from the model
 */
const callLemon = async (systemPrompt, messages = [], tools = [], retriesRemaining = 3) => {
    try {
        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages,
            tools: tools,
        });
        return msg;
    } catch (error) {
        if (retriesRemaining > 0) {
            console.log("Retrying callLemon", retriesRemaining, error.error.error.message);
            const waitTime = Math.max(0, 1000 - 300 * retriesRemaining);
            console.log("Waiting for", waitTime, "ms");
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callLemon(systemPrompt, messages, tools, retriesRemaining - 1);
        }
        throw error;
    }
};

// A function that takes the response from the model, handles the tools call(s) and returns the response of the llm and then also the tool call(s)
// there can be multiple blocks that are tool calls. We need to handle all of them and wait for all of them to complete before returning the response
// the toolCallResult object should have the following shape:
// {
//   id: string,
//   result: any,
// }

const handleLemonToolCall = async (response, tools = []) => {
  const toolCalls = response.content.filter((block) => block.type === 'tool_use');
  if (!toolCalls) return response;
  const toolCallResults = await Promise.all(toolCalls.map(async (toolCall) => {
    const toolCallId = toolCall.id;
    const toolCallName = toolCall.name;
    const toolCallInput = toolCall.input;
    const toolCallResult = await tools.find((tool) => tool.name === toolCallName).function(toolCallInput);
    return {
      id: toolCallId,
      result: toolCallResult,
    };
  }));
  return toolCallResults;
};

export default callLemon;

const tools = [
    {
        name: "file_summary",
        description: "Summarize a file",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" } },
        },
        function: async (input) => {
            return {
                summary: (await callLemon(
                    "You are a helpful assistant. Summarize the file.",
                    [
                        { role: "user", content: "File content of file " + input.relative_file_path + " is:\n" + fs.readFileSync(input.relative_file_path, "utf8") },
                    ],
                )).content.find((block) => block.type === 'text').text,
            };
        },
    },
    {
        name: "list_files",
        description: "List all files in a given relative directory",
        input_schema: {
            type: "object",
            properties: { relative_path: { type: "string" } },
        },
        function: async (input) => {
            const [success, result] = await new Promise((resolve, reject) => {
                exec(`ls -la ${input.relative_path}`, (error, stdout, stderr) => {
                    if (error) {
                        resolve([false, error]);
                    } else {
                        resolve([true, stdout]);
                    }
                });
            });
            if (success) {
                return {
                    result: result,
                };
            } else {
                return {
                    error: {
                        type: "tool_call_error",
                        message: result,
                    },
                };
            }
        },
    },
    {
        name: "file_content",
        description: "Get the content of a file",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" } },
        },
        function: async (input) => {
            return {
                content: fs.readFileSync(input.relative_file_path, "utf8"),
            };
        },
    },
    {
        name: "file_exists",
        description: "Check if a file exists",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" } },
        },
        function: async (input) => {
            return {
                exists: fs.existsSync(input.relative_file_path),
            };
        },
    },
    {
        name: "edit_file",
        description: "Edit or create a file. text_to_replace is the text to replace, new_text is the new text to replace it with. If the file does not exist, create with text_to_replace being an empty string and new_text being the content of the file.",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" }, text_to_replace: { type: "string" }, new_text: { type: "string" } },
        },
        function: async (input) => {
            const doesFileExist = fs.existsSync(input.relative_file_path);
            if (!doesFileExist) {
                fs.writeFileSync(input.relative_file_path, input.new_text);
            } else {
                const content = fs.readFileSync(input.relative_file_path, "utf8");
                const newContent = content.replace(input.text_to_replace, input.new_text);
                fs.writeFileSync(input.relative_file_path, newContent);
            }
            return {
                success: true,
            };
        },
    },
    {
        name: "grep",
        description: "Grep for a given pattern in a file",
        input_schema: {
            type: "object",
            properties: { pattern: { type: "string" } },
        },
        function: async (input) => {
            const [success, result] = await new Promise((resolve, reject) => {
                exec(`grep -r ${input.pattern} .`, (error, stdout, stderr) => {
                    if (error) {
                        resolve([false, error]);
                    } else {
                        resolve([true, stdout]);
                    }
                });
            });
            if (success) {
                return {
                    result: result,
                };
            } else {
                return {
                    error: {
                        type: "tool_call_error",
                        message: result,
                    },
                };
            }
        },
    },
    {
        name: "make_directory",
        description: "Make a directory",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" } },
        },
        function: async (input) => {
            fs.mkdirSync(input.relative_file_path, { recursive: true });
            return {
                success: true,
            };
        },
    },
    {
        name: "remove_file",
        description: "Remove a file",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" } },
        },
        function: async (input) => {
            fs.unlinkSync(input.relative_file_path);
            return {
                success: true,
            };
        },
    },
    {
        name: "write_memory",
        description: "Write a note to the memory",
        input_schema: {
            type: "object",
            properties: { memory: { type: "string" } },
        },
        function: async (input) => {
            // append to the memory file
            // new line, date, memory
            fs.appendFileSync("memory.md", "\n" + new Date().toISOString() + ": " + input.memory);
            return { success: true };
        },
    },
    {
        name: "read_memory",
        description: "Read the memory",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" } },
        },
        function: async (input) => {
            return { memory: fs.readFileSync("memory.md", "utf8") };
        },
    },
    {
        name: "git_diff",
        description: "Get the git diff",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" } },
        },
        function: async (input) => {
            const [success, result] = await new Promise((resolve, reject) => {
                exec(`git diff ${input.relative_file_path}`, (error, stdout, stderr) => {
                    if (error) {
                        resolve([false, error]);
                    } else {
                        resolve([true, stdout]);
                    }
                });
            });
            if (success) {
                return {
                    result: result,
                };
            } else {
                return {
                    error: {
                        type: "tool_call_error",
                        message: result,
                    },
                };
            }
        },
    },
    {
        name: "git_add",
        description: "Add a file to the git index",
        input_schema: {
            type: "object",
            properties: { relative_file_path: { type: "string" } },
        },
        function: async (input) => {
            const [success, result] = await new Promise((resolve, reject) => {
                exec(`git add ${input.relative_file_path}`, (error, stdout, stderr) => {
                    if (error) {
                        resolve([false, error]);
                    } else {
                        resolve([true, stdout]);
                    }
                });
            });
            if (success) {
                return {
                    result: result,
                };
            } else {
                return {
                    error: {
                        type: "tool_call_error",
                        message: result,
                    },
                };
            }
        },
    },
    {
        name: "git_commit",
        description: "Commit the changes",
        input_schema: {
            type: "object",
            properties: { message: { type: "string" } },
        },
        function: async (input) => {
            const [success, result] = await new Promise((resolve, reject) => {
                exec(`git commit -m "${input.message}"`, (error, stdout, stderr) => {
                    if (error) {
                        resolve([false, error]);
                    } else {
                        resolve([true, stdout]);
                    }
                });
            });
            if (success) {
                return {
                    result: result,
                };
            } else {
                return {
                    error: {
                        type: "tool_call_error",
                        message: result,
                    },
                };
            }
        },
    },
];

const agent = async (systemPrompt, messages = [], tools = []) => {
    console.log("messages", messages);
    callLemon(
        systemPrompt,
        messages,
        tools
    ).then(async (msg) => {
        console.log("msg", JSON.stringify(msg, null, 4));
        const firstResponse = msg.content.find((block) => block.type === 'text').text;
        const toolCallResults = await handleLemonToolCall(msg, tools);
        if (toolCallResults.length > 0) {
            const innerMessages = [
                ...messages,
                { role: "assistant", content: firstResponse },
                ...toolCallResults.map((toolCallResult) => ({
                    role: "user",
                    content: JSON.stringify(toolCallResult),
                })),
            ];
            console.log("innerMessages", innerMessages);
            await agent(
                systemPrompt,
                innerMessages,
                tools
            );
        }
    });
}

export { agent };

var memory;

try {
    memory = fs.readFileSync("memory.md", "utf8");
} catch (error) {
    memory = "";
}

agent("You are a helpful programming assistant named Lemon. Use the tools provided to answer the user's question or perform the task, if relevant. If the user's question is not relevant, just say so. If the user's question is not clear, ask for clarification. Make a plan for the task prior to executing it, and then execute the plan. If the user mentions something noteworthy, make a note of it in the memory tool. Here is the memory: " + memory, [
    { role: "user", content: process.argv[2] || "what is the time and weather in tokyo?" },
], tools);