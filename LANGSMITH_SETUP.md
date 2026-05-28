# LangSmith Observability Setup

Supply Mind utilizes **LangSmith** to provide deep observability, tracing, and evaluation into the agentic workflows.

## Configuration

To enable tracing across all LLM, tool, and agent executions, the following environment variables are set either in the container runtime or the `.env` file:

```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=supply-mind-production
```

## Usage

Once active, every request to `/api/v1/chat` or `/api/v1/insights/generate` will:
1. Log the entire execution trace.
2. Record token latency.
3. Allow for debugging failed tool executions or routing failures from the Supervisor node directly in the LangSmith UI.
