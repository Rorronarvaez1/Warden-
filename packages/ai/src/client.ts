// Cliente mínimo de OpenRouter (API compatible con OpenAI chat completions).

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
  /** Modelo que realmente respondió (OpenRouter puede enrutar a otro). */
  model: string;
}

export async function chatCompletion(req: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${req.apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Warden',
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      ...(req.jsonMode && { response_format: { type: 'json_object' } }),
    }),
    signal: req.signal,
  });

  if (!res.ok) {
    throw new Error(`OpenRouter respondió ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as {
    model: string;
    choices: { message: { content: string | null } }[];
  };
  const content = body.choices[0]?.message.content;
  if (!content) throw new Error('OpenRouter devolvió una respuesta vacía');

  return { content, model: body.model };
}
