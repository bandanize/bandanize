export interface ApiChatMessage {
  id: string | number; sender?: { id: string | number; name?: string; photo?: string };
  userId?: string | number; userName?: string; userPhoto?: string;
  message?: string; timestamp?: string | number | null;
}
export function mapChatMessage(msg: ApiChatMessage) {
  return { id: String(msg.id), userId: String(msg.sender?.id ?? msg.userId ?? 'unknown'),
    userName: msg.sender?.name || msg.userName || 'Unknown User', userPhoto: msg.sender?.photo || msg.userPhoto,
    message: msg.message || '', timestamp: new Date(msg.timestamp ?? NaN), mentions: [] as string[] };
}
export function orderedChat<T extends { id: string }>(messages: T[]): T[] {
  return [...new Map(messages.map(message => [message.id, message])).values()]
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}
