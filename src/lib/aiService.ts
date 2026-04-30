/**
 * MediPaws AI Service - Frontend client for the Gemini-powered vet assistant
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  success: boolean;
  data?: {
    response?: string;
    isDemo?: boolean;
  };
  message?: string;
}

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[] = []
): Promise<AIResponse> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory }),
    });
    return await response.json();
  } catch (error) {
    console.error('AI Chat error:', error);
    return { success: false, message: 'Failed to connect to AI service' };
  }
}
