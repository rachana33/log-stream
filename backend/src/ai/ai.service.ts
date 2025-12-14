import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private client: OpenAI | null = null;
  private model: string = 'gpt-4o-mini';

  private getClient(): OpenAI {
    if (this.client) return this.client;

    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureKey = process.env.AZURE_OPENAI_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

    if (azureEndpoint && azureKey && azureDeployment) {
      const trimmedEndpoint = azureEndpoint.replace(/\/+$/, '');

      this.model = azureDeployment;
      this.client = new OpenAI({
        apiKey: azureKey,
        baseURL: `${trimmedEndpoint}/openai/deployments/${azureDeployment}`,
        defaultQuery: { 'api-version': azureApiVersion },
        defaultHeaders: { 'api-key': azureKey },
      });

      return this.client;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'No AI provider configured. Set AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_KEY/AZURE_OPENAI_DEPLOYMENT for Azure OpenAI, or set OPENAI_API_KEY for OpenAI.',
      );
    }

    this.model = process.env.OPENAI_MODEL || this.model;
    this.client = new OpenAI({ apiKey });
    return this.client;
  }

  async getInsights(logs: unknown[]): Promise<any> { // Changed return type to any to match new JSON return
    const client = this.getClient();

    const recentLogs = Array.isArray(logs) ? logs.slice(-50) : [];
    const payload = JSON.stringify(recentLogs).slice(0, 12000);

    const response = await client.chat.completions.create({
      model: this.model, // Changed from this.deploymentName || this.model to just this.model
      messages: [
        {
          role: 'system',
          content:
            'You are a Senior SRE Assistant. Analyze the provided logs to identify root causes and hazardous trends. Group your findings by Service Name. Output a JSON object with this structure: { "summary": "brief high-level summary", "services": [{ "name": "service-name", "status": "Critical/Warning/Healthy", "issues": ["list of key issues"], "riskScore": 1-10 }] }. Do NOT output markdown code blocks, just the raw JSON.',
        },
        {
          role: 'user',
          content: `Analyze these recent logs. Identify which services are emitting errors or high latency.\n\n${payload}`,
        },
      ],

    });

    const completion = response.choices[0].message?.content;
    try {
      const parsed = JSON.parse(completion || '{}');
      return parsed;
    } catch (e) {
      return { summary: completion, services: [] };
    }
  }

  async parseQuery(query: string): Promise<any> {
    const client = this.getClient();
    const systemPrompt = `You are a search query parser for a log analysis system. Extract specific log filters from natural language. Output strictly valid JSON.
    
    Available keys: 
    - "severity" (enum: error, warn, info)
    - "source" (exact service name from: auth-service, payment-gateway, user-profile, notification-service)
    - "traceId" (string)
    
    IMPORTANT SERVICE NAME RULES:
    - "payment" or "payment service" → use "payment-gateway"
    - "auth" or "authentication" → use "auth-service"
    - "user" or "profile" → use "user-profile"
    - "notification" or "notifications" → use "notification-service"
    
    Examples:
    Input: "show me errors from payment-gateway"
    Output: { "severity": "error", "source": "payment-gateway" }
    
    Input: "show me payment errors"
    Output: { "severity": "error", "source": "payment-gateway" }
    
    Input: "find warnings from auth"
    Output: { "severity": "warn", "source": "auth-service" }
    
    Input: "find trace abc123"
    Output: { "traceId": "abc123" }
    `;

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
    });

    try {
      const text = response.choices[0].message?.content?.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text || '{}');
    } catch (e) {
      return {};
    }
  }

  async chatWithLogs(messages: { role: 'user' | 'system' | 'assistant', content: string }[], contextLogs: any[]): Promise<string> {
    const client = this.getClient();

    // Summarize logs for context (prevent token overflow)
    const logSummary = contextLogs.slice(0, 100).map(l =>
      `[${l.severity.toUpperCase()}] ${l.source}: ${l.message}`
    ).join('\n');

    const systemPrompt = `You are a Log Analysis Assistant. You have access to the last 100 logs.
    Your job is to answer the user's questions based strictly on these logs.
    
    Data Source:
    ${logSummary}
    
    Rules:
    - Keep responses under 4-5 lines maximum. Be extremely concise.
    - Use bullet points or comma-separated lists for brevity.
    - Focus on key findings only (e.g., "6 errors: payment-gateway (3), auth-service (2), user-profile (1). payment-gateway is the primary issue.")
    - If asked about counts, aggregations, or comparisons, provide quick numeric answers.
    - Skip verbose explanations. Get straight to the point.
    - If the answer isn't in the logs, say "Not found in recent logs."
    `;

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });

    return response.choices[0].message?.content || "I couldn't generate an answer.";
  }
}
