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

  async getInsights(logs: unknown[]): Promise<string> {
    const client = this.getClient();

    const recentLogs = Array.isArray(logs) ? logs.slice(-50) : [];
    const payload = JSON.stringify(recentLogs).slice(0, 12000);

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are an SRE assistant. Summarize issues and anomalies in plain English for a non-technical audience. Be concise. Output 3-6 bullet points and a short recommended next action.',
        },
        {
          role: 'user',
          content: `Analyze these recent logs (JSON). Focus on spikes, repeated errors, and likely causes.\n\n${payload}`,
        },
      ],

    });

    return response.choices?.[0]?.message?.content?.trim() || '';
  }
}
