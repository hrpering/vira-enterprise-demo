"use client";

import { useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiIf,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  Tools,
  useAuiState,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { viraChatToolkit } from "./vira-chat-toolkit";

function UserMessage() {
  return (
    <MessagePrimitive.Root className="message-row user-row">
      <div className="user-bubble">
        <MessagePrimitive.Parts>
          {({ part }) => part.type === "text" ? <MessagePartPrimitive.Text /> : null}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="message-row assistant-row">
      <div className="assistant-avatar" aria-hidden="true">P</div>
      <div className="assistant-content">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") {
              return (
                <div className="assistant-text">
                  <MarkdownTextPrimitive remarkPlugins={[remarkGfm]} />
                  <MessagePartPrimitive.InProgress>
                    <span className="stream-caret">▍</span>
                  </MessagePartPrimitive.InProgress>
                </div>
              );
            }
            if (part.type === "tool-call") return part.toolUI ?? null;
            return null;
          }}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

function ThreadMessage() {
  const role = useAuiState((state) => state.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="composer">
      <ComposerPrimitive.Input
        className="composer-input"
        placeholder="How can I help with your trip?"
        rows={1}
        aria-label="Message input"
      />
      <ComposerPrimitive.Send className="send-button" aria-label="Send message">
        ↑
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

function Thread() {
  return (
    <ThreadPrimitive.Root className="thread-root">
      <ThreadPrimitive.Viewport className="thread-viewport">
        <AuiIf condition={(state) => state.thread.messages.length === 0}>
          <div className="welcome">
            <div className="welcome-mark">P</div>
            <h1>Hi, I’m your travel assistant.</h1>
            <p>Ask me to find a flight, compare options, or help with your trip.</p>
          </div>
        </AuiIf>

        <div className="messages">
          <ThreadPrimitive.Messages>
            {() => <ThreadMessage />}
          </ThreadPrimitive.Messages>
        </div>

        <ThreadPrimitive.ViewportFooter className="thread-footer">
          <Composer />
          <p className="disclaimer">AI responses may contain mistakes. Check important travel details before booking.</p>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

export function AirlineChat() {
  const runtime = useChatRuntime();
  const config = AuiConfig({ tools: Tools({ toolkit: viraChatToolkit }) });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">P</div>
          <div>
            <strong>Pegasus</strong>
            <span>Online Assistant</span>
          </div>
        </div>
        <span className="demo-badge">Demo</span>
      </header>

      <AssistantRuntimeProvider runtime={runtime} config={config}>
        <Thread />
      </AssistantRuntimeProvider>
    </main>
  );
}
