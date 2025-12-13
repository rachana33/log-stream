import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class RealtimeService {
    private readonly logger = new Logger(RealtimeService.name);
    private readonly endpoint: string;
    private readonly accessKey: string;
    private readonly hubName = 'logstream';

    constructor() {
        const connStr = process.env.AZURE_SIGNALR_CONN_STR;
        if (connStr) {
            const parts = connStr.split(';');
            const endpointPart = parts.find((p) => p.startsWith('Endpoint='));
            const keyPart = parts.find((p) => p.startsWith('AccessKey='));
            if (endpointPart && keyPart) {
                this.endpoint = endpointPart.split('=')[1];
                this.accessKey = keyPart.split('=')[1];
                this.logger.log('Azure SignalR configured');
            }
        }
    }

    async broadcastLog(log: any) {
        if (this.endpoint && this.accessKey) {
            const url = `${this.endpoint}/api/v1/hubs/${this.hubName}`;
            const token = this.generateJwt(url);
            try {
                await axios.post(
                    url,
                    {
                        target: 'newLog',
                        arguments: [log],
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    },
                );
            } catch (e) {
                this.logger.error('Failed to broadcast to Azure SignalR', e.message);
            }
        } else {
            this.logger.debug('No SignalR config. Skipping broadcast.');
        }
    }

    getNegotiateInfo(userId?: string) {
        if (!this.endpoint || !this.accessKey) {
            throw new Error('SignalR not configured');
        }
        const hubUrl = `${this.endpoint}/client/?hub=${this.hubName}`;
        const token = this.generateJwt(hubUrl);
        return { url: hubUrl, accessToken: token };
    }

    private generateJwt(audience: string): string {
        const payload = {
            aud: audience,
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
        return jwt.sign(payload, this.accessKey);
    }
}
