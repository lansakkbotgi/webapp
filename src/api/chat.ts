import { api } from './client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export async function sendMessage(message: string): Promise<ChatMessage> {
  return api.post<ChatMessage>('/chat/message', { message });
}

export async function getChatHistory(limit = 50): Promise<ChatMessage[]> {
  const data = await api.get<{ items: ChatMessage[] }>(`/chat/history?limit=${limit}`);
  return data.items;
}

export async function transcribeAudio(transcript: string): Promise<string> {
  const data = await api.post<{ transcript: string }>('/voice/transcribe', { transcript });
  return data.transcript;
}

export async function speak(text: string): Promise<{ text: string; mode: string }> {
  return api.post<{ text: string; mode: string }>('/voice/speak', { text });
}
