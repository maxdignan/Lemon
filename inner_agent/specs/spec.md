# Inner Agent Specification

## Objective
The objective of this inner agent is to create a new AI agent.

## Specification

### 1. Agent Architecture
 - it will use a tool-calling LLM
 - it will operate in a loop, calling the LLM with a prompt, and then using the response to call tools
 - it will use a memory markdown file to store notable information as "memory". Information will be made extra concise prior to being written and it will be dated. Last couple weeks of memory will be read in into the context of the LLM as a system prompt.
 - it will be able to use a tool call to pull up older memories

### 4. Task-specific Abilities
- List the primary tasks the agent should be able to perform
- Specify any domain-specific knowledge or skills required
- Define how the agent should handle multi-step or complex tasks

### 5. Learning and Adaptation
- Determine if the agent should have the ability to learn and improve over time
- Specify the learning mechanisms (e.g., feedback loops, reinforcement learning)
- Define how new information should be integrated into the agent's knowledge base

### 6. Interaction Model
- Specify how the agent will interact with users or other systems
- Define the agent's personality traits and communication style
- Determine the agent's ability to maintain context across multiple interactions

### 7. Ethical Considerations
- Define the ethical guidelines the agent should follow
- Specify how to handle sensitive information and maintain privacy
- Determine safeguards against potential misuse or harmful outputs

### 8. Performance Metrics
- Specify how the agent's performance will be measured and evaluated
- Define benchmarks or standards the agent should meet
- Determine methods for ongoing monitoring and improvement

### 9. Integration and Deployment
- Specify the technical requirements for deploying the agent
- Define how the agent will integrate with existing systems or platforms
- Determine scalability and resource requirements
