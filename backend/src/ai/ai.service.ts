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
    const systemPrompt = `You are a search query parser. Extract specific log filters from natural language. Output strictly valid JSON.
    Available keys: "severity" (enum: error, warn, info), "source" (string service name), "traceId" (string).
    Example Input: "show me errors from payment-gateway"
    Example Output: { "severity": "error", "source": "payment-gateway" }
    Example Input: "find trace abc123"
    Example Output: { "traceId": "abc123" }
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
}
