import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Prefer models that reliably return content (not reasoning-only models)
const PREFERRED_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct';

export const openRouterService = {
  /**
   * Send structured prompt to OpenRouter AI.
   * Returns the raw text response string, or null if the API call fails.
   * Callers (FarmerGPT, Travel Planner) enforce strict no-fallback policy.
   */
  async generateCompletion({ systemPrompt, userPrompt, temperature = 0.5, _retryCount = 0 }) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      console.warn('[OpenRouterService] OPENROUTER_API_KEY is not configured in .env.');
      return null;
    }

    const startTime = Date.now();
    console.log(`[AI] OpenRouter request started: model=${PREFERRED_MODEL}`);

    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model: PREFERRED_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: 750 // Optimized: 750 tokens is sufficient for concise structured JSON responses and reduces generation time
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'WeatherGPT',
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      const elapsed = Date.now() - startTime;
      console.log(`[AI] OpenRouter response received: ${elapsed}ms`);

      const message = response.data?.choices?.[0]?.message;
      const choice = message?.content || message?.reasoning || null;
      return choice ? choice.trim() : null;
    } catch (err) {
      const elapsed = Date.now() - startTime;
      console.error(`[AI] OpenRouter API call failed after ${elapsed}ms:`, err.response?.data || err.message);
      const isTransient = err.code === 'ECONNABORTED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message?.includes('timeout');
      if (isTransient && _retryCount < 1) {
        console.warn('[OpenRouterService] Transient error, retrying once...', err.message);
        return this.generateCompletion({ systemPrompt, userPrompt, temperature, _retryCount: _retryCount + 1 });
      }
      return null;
    }
  }
};
