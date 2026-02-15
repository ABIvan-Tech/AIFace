# Cloud Relay (v1)

There is no cloud relay implementation in this repository yet. The MCP server, AI agent, and display all run inside the same LAN, and MCP never exposes a public endpoint.

## Why it is missing

- The current MVP focuses on a local setup where the face logic resides within MCP and discovery happens over mDNS.
- Designing a relay requires authentication, message forwarding, and trust boundaries that we intentionally defer until the local stack stabilizes.

## Future sketch

Should a cloud-hosted agent need to reach a local MCP server, we would define a cloud relay service that:

1. Maintains a persistent outbound connection from MCP (acting as a relay client).
2. Proxies scene/mutation envelopes with low latency.
3. Enforces authentication so the relay cannot be hijacked.

Until that implementation exists, `docs/mcp/50_cloud_relay.md` serves as the record that "cloud relay" is a future extension and not part of the running system.
