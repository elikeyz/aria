import logging
from agents import Agent, Runner, trace

from context import AGENT_INSTRUCTIONS
from mcp_server import create_meridian_mcp_server

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_assistant_agent(messages):
  logger.info("Starting Aria AI agent with messages")

  MODEL = "gpt-4o-mini"

  try:
    async with create_meridian_mcp_server() as mcp_server:
      logger.info("MCP server created successfully")

      agent = Agent(
        name="Aria",
        instructions=AGENT_INSTRUCTIONS,
        mcp_servers=[mcp_server],
        model=MODEL,
      )

      with trace("Meridian"):
        response = await Runner.run(agent, input=messages, max_turns=15)
        logger.info("Aria AI Agent result: %s", response)
        return response.final_output

  except Exception as e:
    logger.error("Error running Aria AI agent: %s", e)
    raise
