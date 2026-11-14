---
trigger: always_on
---

# NeuroMesh Context Engine

When the `neuromesh` MCP server is available, always prefer its context-routing and code-folding tools (such as `get_context`, `search`, or `graph` tools) before reading full files with `read_file` or running broad workspace searches.

- Use NeuroMesh first to locate relevant symbols, dependencies, and minimal folded context packets to save tokens.
- Only fall back to `read_file` on specific line ranges when you need exact, unfolded implementation details for editing.
