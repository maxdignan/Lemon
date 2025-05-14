# Lemon: A Versatile AI Programming Assistant

Named Lemon as a play on "LLM". Hopefully not a "lemon" :laughing:

This repository contains Lemon, a powerful AI programming assistant designed to help developers with various tasks using natural language interactions. The core functionality is implemented in `utils/lemon.js`, which serves as the workhorse of this project.

## Purpose

The main purpose of this repository is to provide a flexible and extensible AI assistant that can:

1. Understand and respond to user queries about programming tasks
2. Perform file operations, code analysis, and version control actions
3. Maintain a memory of important information
4. Execute a wide range of tools and functions based on user input

## Key Components

### utils/lemon.js

This file is the heart of the Lemon assistant. It contains the following main components:

1. `callLemon`: A function that interacts with the Anthropic API to generate responses using the Claude model.
2. `handleLemonToolCall`: A function that processes tool calls made by the AI and executes the corresponding actions.
3. `agent`: The main function that orchestrates the conversation flow, tool execution, and recursive calling when necessary.
4. A comprehensive set of tools that Lemon can use to perform various tasks, including:
   - File operations (read, write, edit, remove)
   - Directory listing and creation
   - Git operations (diff, add, commit)
   - Grep functionality
   - Memory management (read and write)

### specs/ folder

The specs/ folder contains important specifications and guidelines for the Lemon assistant:

1. `call_llm_function.md`: Likely contains specifications on how to interact with the language model API.
2. `make_sure_to_call_tool_functions.md`: Provides guidelines on ensuring proper tool function calls by the AI assistant.
3. `max_name.txt`: A file potentially containing a user's name or other configuration information.

## How It Works

1. The user provides a query or task description.
2. Lemon processes the input using the Claude model via the Anthropic API.
3. Based on the AI's response, Lemon may execute one or more tool functions to perform specific actions.
4. The results of these actions are fed back into the AI for further processing or to generate a final response.
5. This process can repeat recursively if needed to complete complex tasks.

## Features

- Natural language understanding and generation
- File and directory management
- Code analysis and search capabilities
- Git integration for version control tasks
- Persistent memory for maintaining context across sessions
- Extensible tool system for adding new functionalities

## Getting Started

To use Lemon, ensure you have the necessary dependencies installed and set up the required environment variables, particularly the Anthropic API key. Run the script with your query as a command-line argument:

```
node utils/lemon.js "Your query here"
```

## Conclusion

Lemon is a powerful AI programming assistant that combines natural language processing with a wide range of practical tools to help developers with their day-to-day tasks. Its flexible architecture allows for easy extension and customization to suit various development needs.# Lemon: A Flexible AI Assistant for Development Tasks

## Overview

This repository contains a powerful AI assistant named Lemon, designed to help with various development tasks. The core functionality is implemented in `utils/lemon.js`, which serves as the workhorse of this project.

## Key Features

1. **AI-Powered Assistance**: Lemon uses the Anthropic API to provide intelligent responses and perform tasks.
2. **Tool Integration**: The assistant can use a variety of tools to interact with the file system, perform git operations, and more.
3. **Memory Functionality**: Lemon can remember important information across conversations.
4. **Flexible Tool Calls**: The system can handle multiple tool calls and wait for their completion before responding.

## How It Works

The main components of the system are:

1. `callLemon`: This function interfaces with the Anthropic API to generate responses based on the given prompts and messages.
2. `handleLemonToolCall`: This function processes tool calls made by the AI and executes the corresponding actions.
3. `agent`: This function manages the conversation flow, including handling tool calls and maintaining context.

## Available Tools

Lemon has access to various tools, including:

- File operations (read, write, edit, check existence)
- Directory listing
- File summarization
- Grep functionality
- Git operations (diff, add, commit)
- Memory read/write

## Purpose and Use Cases

Based on the specs provided in the `specs/` folder, this project aims to:

1. Enhance development workflows by providing an AI assistant that can interact with the local development environment.
2. Implement a system for calling LLM functions and ensuring proper tool usage (as indicated by `call_llm_function.md` and `make_sure_to_call_tool_functions.md`).

## Getting Started

To use Lemon in your project:

1. Ensure you have the necessary dependencies installed (Anthropic SDK, fs, child_process).
2. Set up your Anthropic API key in the environment variables.
3. Import the `agent` function from `utils/lemon.js` in your main application file.
4. Call the `agent` function with appropriate system prompts, messages, and tool configurations.

## Conclusion

Lemon is a versatile AI assistant that can significantly improve development productivity by automating various tasks and providing intelligent assistance. Its integration with file system operations and git makes it particularly useful for software development workflows.# Lemon: An AI-powered Programming Assistant

This repository contains Lemon, an AI-powered programming assistant built using the Anthropic API. The main functionality is implemented in `utils/lemon.js`, which serves as the workhorse of this project.

## Purpose

The purpose of this repository is to create an intelligent programming assistant that can:

1. Answer user questions
2. Perform programming tasks
3. Interact with the file system
4. Execute git commands
5. Maintain a memory of important information

## Key Features

### utils/lemon.js

The `utils/lemon.js` file is the core of this project and implements the following key features:

1. **AI Model Integration**: Uses the Anthropic API to interact with the Claude AI model.
2. **Tool Execution**: Implements a set of tools that allow the AI to interact with the file system, execute commands, and perform various tasks.
3. **Memory Management**: Maintains a persistent memory that can be read and written to.
4. **Error Handling and Retries**: Implements a retry mechanism for API calls to handle temporary failures.
5. **Git Integration**: Provides tools for interacting with git, including viewing diffs, adding files, and committing changes.

### Available Tools

Lemon has access to various tools, including:

- File operations (read, write, edit, remove)
- Directory listing
- File summarization
- Pattern searching (grep)
- Memory read/write
- Git operations (diff, add, commit)

## How It Works

1. The `callLemon` function sends requests to the Anthropic API with a system prompt, user messages, and available tools.
2. The AI generates responses and may call tools to perform actions or gather information.
3. The `handleLemonToolCall` function processes the tool calls and executes them.
4. The `agent` function manages the conversation flow, including handling tool call results and continuing the conversation.

## Usage

To use Lemon, run the script with a command or question as an argument. For example:

```
node utils/lemon.js "What files are in the current directory?"
```

Lemon will process the request, use the necessary tools, and provide a response based on the AI's understanding and the results of any tool calls.

## Specifications

The `specs/` folder contains additional information about the project's requirements and functionality:

- `call_llm_function.md`: Likely contains specifications for how to interact with the AI model.
- `make_sure_to_call_tool_functions.md`: Probably includes guidelines on ensuring proper tool function calls.
- `max_name.txt`: May contain a specific configuration or user information.

For more detailed information on the project's specifications, please refer to the individual files in the `specs/` folder.

## Contributing

To contribute to this project, please review the specifications in the `specs/` folder and ensure that any changes or additions align with the project's goals and requirements.

## License

[Insert appropriate license information here]
