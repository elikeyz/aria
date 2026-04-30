'use client'

import { useState } from "react";
import ChatInterface from "./components/ChatInterface";
import Header from "./components/Header";
import ChatInput from "./components/ChatInput";
import { WELCOME } from "./constants";
import { Message } from "./types";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [loading, setLoading] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#050c18' }}>
      <Header />
      <ChatInterface messages={messages} loading={loading} />
      <ChatInput messages={messages} setMessages={setMessages} loading={loading} setLoading={setLoading} />
    </div>
  );
}
