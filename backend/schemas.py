from pydantic import BaseModel

class ChatRequest(BaseModel):
  messages: list[dict[str, str]]
