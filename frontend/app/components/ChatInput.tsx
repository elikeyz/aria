'use client'
import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react"
import { Message } from "../types";

interface ChatInputProps {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
}

export default function ChatInput({ messages, setMessages, loading, setLoading }: ChatInputProps) {
  const [input, setInput] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json()
      const content = data.success
        ? data.response
        : "I'm sorry, something went wrong. Please try again."
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I couldn't reach the server. Please check your connection and try again.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <footer
      className="flex-shrink-0 px-4 py-4 border-t"
      style={{ background: '#050c18', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-2xl mx-auto">
        <div
          className="meridian-input-box flex items-end gap-3 px-4 py-3 rounded-2xl transition-all"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              autoResize()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products, specs, or recommendations…"
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed disabled:opacity-40"
            style={{
              color: '#e2e8f0',
              minHeight: '24px',
              maxHeight: '160px',
              fontFamily: 'var(--font-geist-sans)',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all meridian-send-btn"
            aria-label="Send message"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <p className="text-center mt-2 text-[11px]" style={{ color: '#334155' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </footer>
  );
}
