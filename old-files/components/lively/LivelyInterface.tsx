"use client";

import LivelyChatInterface from './LivelyChatInterface';

interface LivelyInterfaceProps {
  defaultMessage?: string;
  sessionId?: string;
}

export default function LivelyInterface({ defaultMessage, sessionId }: LivelyInterfaceProps) {
  return (
    <LivelyChatInterface
      defaultMessage={defaultMessage}
      sessionId={sessionId}
    />
  );
} 