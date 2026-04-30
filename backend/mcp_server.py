from agents.mcp import MCPServerStreamableHttp

def create_meridian_mcp_server():
  return MCPServerStreamableHttp(
    name="Meridian",
    params={
      "url": "https://order-mcp-74afyau24q-uc.a.run.app/mcp",
      "timeout": 60
    }
  )
