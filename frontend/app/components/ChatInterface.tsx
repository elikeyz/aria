'use client'

import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  loading: boolean;
}

export default function ChatInterface({ messages, loading }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6" style={{ background: '#07101f' }}>
      <div className="max-w-2xl mx-auto space-y-5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={
                msg.role === 'assistant'
                  ? {
                      background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
                      color: '#fff',
                      boxShadow: '0 0 12px rgba(59,130,246,0.35)',
                    }
                  : { background: '#1e293b', color: '#94a3b8' }
              }
            >
              {msg.role === 'assistant' ? 'A' : 'Y'}
            </div>

            {/* Bubble */}
            <div
              className="max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
              style={
                msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      color: '#fff',
                      borderRadius: '18px 18px 4px 18px',
                    }
                  : {
                      background: '#0e1a2e',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: '#cbd5e1',
                      borderRadius: '18px 18px 18px 4px',
                    }
              }
            >
              {msg.role === 'assistant' ? (
                <div className="prose-chat">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-3">
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
                color: '#fff',
                boxShadow: '0 0 12px rgba(59,130,246,0.35)',
              }}
            >
              A
            </div>
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: '#0e1a2e',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '18px 18px 18px 4px',
              }}
            >
              <div className="flex gap-1 items-center h-4">
                <span className="meridian-dot" style={{ animationDelay: '0ms' }} />
                <span className="meridian-dot" style={{ animationDelay: '160ms' }} />
                <span className="meridian-dot" style={{ animationDelay: '320ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </main>
  )
}
