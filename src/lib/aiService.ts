/**
 * AI Service - Frontend service to interact with backend AI endpoints
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AIResponse {
    success: boolean;
    data?: {
        response?: string;
        analysis?: string;
        info?: string;
        isDemo?: boolean;
    };
    message?: string;
}

/**
 * Send a chat message to the AI assistant
 */
export async function sendChatMessage(
    message: string,
    conversationHistory: ChatMessage[] = []
): Promise<AIResponse> {
    try {
        const response = await fetch(`${API_BASE}/api/ai/chat`, {
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

/**
 * Analyze symptoms for potential conditions
 */
export async function analyzeSymptoms(
    symptoms: string[],
    patientInfo?: { age?: number; gender?: string; medicalHistory?: string }
): Promise<AIResponse> {
    try {
        const response = await fetch(`${API_BASE}/api/ai/symptoms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms, patientInfo }),
        });
        return await response.json();
    } catch (error) {
        console.error('Symptom analysis error:', error);
        return { success: false, message: 'Failed to analyze symptoms' };
    }
}

/**
 * Get medication information or check interactions
 */
export async function getMedicationInfo(
    medications?: string[],
    query?: string
): Promise<AIResponse> {
    try {
        const response = await fetch(`${API_BASE}/api/ai/medication`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medications, query }),
        });
        return await response.json();
    } catch (error) {
        console.error('Medication info error:', error);
        return { success: false, message: 'Failed to get medication info' };
    }
}

/**
 * Check API health and Gemini configuration status
 */
export async function checkAIHealth(): Promise<{ configured: boolean }> {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        return { configured: data.geminiConfigured || false };
    } catch {
        return { configured: false };
    }
}
