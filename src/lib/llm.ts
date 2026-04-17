/**
 * LLM service utility.
 *
 * Handles OpenAI-compatible chat completion calls.
 * Prefers DeepSeek for text-only flows, and uses OpenAI when image analysis is requested.
 */

import { assertHipaaReady } from "@/lib/hipaa";

type LLMInput =
  | { kind: "text"; text: string }
  | { kind: "image"; text: string; mimeType: string; base64Data: string };

type ProviderConfig = {
  apiKey?: string;
  baseUrl: string;
  model: string;
};

function resolveTextProvider(): ProviderConfig {
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let apiKey = deepseekKey || openaiKey;
    let baseUrl = "https://api.openai.com/v1";
    let model = "gpt-4-turbo-preview";

    if (deepseekKey) {
        if (deepseekKey.startsWith("sk-or-v1-")) {
            baseUrl = "https://openrouter.ai/api/v1";
            model = "deepseek/deepseek-chat";
        } else {
            baseUrl = "https://api.deepseek.com/v1";
            model = "deepseek-chat";
        }
    }

    return { apiKey, baseUrl, model };
}

function resolveVisionProvider(): ProviderConfig {
    const openaiKey = process.env.OPENAI_API_KEY;
    return {
        apiKey: openaiKey,
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
    };
}

async function sendChatCompletion(
    provider: ProviderConfig,
    systemPrompt: string,
    input: LLMInput
): Promise<string> {
    if (!provider.apiKey) {
        console.warn("No supported LLM API key found.");
        return "ERROR_NO_KEY";
    }

    const messages =
        input.kind === "image"
            ? [
                  { role: "system", content: systemPrompt },
                  {
                      role: "user",
                      content: [
                          { type: "text", text: input.text },
                          {
                              type: "image_url",
                              image_url: {
                                  url: `data:${input.mimeType};base64,${input.base64Data}`,
                              },
                          },
                      ],
                  },
              ]
            : [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: input.text },
              ];

    try {
        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`
            },
            body: JSON.stringify({
                model: provider.model,
                messages,
                temperature: 0.3,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('LLM API Error Details:', JSON.stringify(err, null, 2));
            return `ERROR_API_FAILURE: ${response.status} ${response.statusText}`;
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('LLM Fetch Error Trace:', error);
        return "ERROR_FETCH_FAILURE";
    }
}

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    assertHipaaReady("ai");
    return sendChatCompletion(resolveTextProvider(), systemPrompt, {
        kind: "text",
        text: userPrompt,
    });
}

export async function callVisionLLM(params: {
    systemPrompt: string;
    userPrompt: string;
    mimeType: string;
    base64Data: string;
}): Promise<string> {
    assertHipaaReady("ai");
    return sendChatCompletion(resolveVisionProvider(), params.systemPrompt, {
        kind: "image",
        text: params.userPrompt,
        mimeType: params.mimeType,
        base64Data: params.base64Data,
    });
}
