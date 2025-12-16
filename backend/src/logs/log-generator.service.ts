import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class LogGeneratorService implements OnModuleInit {
    private readonly logger = new Logger(LogGeneratorService.name);
    private interval: NodeJS.Timeout;
    private isEnabled: boolean;

    private readonly SERVICES = [
        'auth-service',
        'payment-gateway',
        'user-profile',
        'notification-service',
    ];

    private readonly MESSAGES = {
        info: [
            'Health check passed',
            'User logged in successfully',
            'Profile updated',
            'Email notification sent',
            'Payment processed successfully',
            'Cache hit for user data',
            'Session created',
            'Request processed',
        ],
        warn: [
            'High memory usage detected',
            'Disk space running low',
            'Rate limit approaching threshold',
            'Slow response time detected',
            'Connection pool near capacity',
            'Cache miss - performance impact',
        ],
        error: [
            'Database connection failed',
            'External service unavailable',
            'Request timeout exceeded',
            'Authentication failed',
            'Payment gateway error',
            'Failed to process request',
        ],
        debug: [
            'Processing incoming request',
            'Validating user credentials',
            'Fetching data from cache',
            'Executing database query',
        ],
    };

    constructor(private readonly logsService: LogsService) {
        // Enable by default, can be controlled via env var
        this.isEnabled = process.env.ENABLE_LOG_GENERATOR !== 'false';
    }

    onModuleInit() {
        if (this.isEnabled) {
            this.logger.log('Starting background log generator...');
            this.startGenerator();
        } else {
            this.logger.log('Log generator disabled');
        }
    }

    private startGenerator() {
        // Generate a log every 2-4 seconds
        this.interval = setInterval(() => {
            this.generateRandomLog();
        }, 2000 + Math.random() * 2000);

        // Generate occasional traces every 10-30 seconds
        setInterval(() => {
            if (Math.random() > 0.5) {
                this.generateTrace();
            }
        }, 10000 + Math.random() * 20000);
    }

    private generateRandomLog() {
        const service =
            this.SERVICES[Math.floor(Math.random() * this.SERVICES.length)];

        // Weighted severity distribution
        let severity: 'info' | 'warn' | 'error' | 'debug';
        const rand = Math.random();
        if (rand < 0.6) severity = 'info';
        else if (rand < 0.75) severity = 'debug';
        else if (rand < 0.9) severity = 'warn';
        else severity = 'error';

        const messageList = this.MESSAGES[severity];
        const message =
            messageList[Math.floor(Math.random() * messageList.length)];
        const traceId = this.generateTraceId();

        this.logsService
            .create({
                source: service,
                message,
                severity,
                metadata: {
                    traceId,
                    latency: Math.floor(Math.random() * 500),
                    spanId: this.generateSpanId(),
                },
                timestamp: new Date().toISOString(),
            })
            .catch((err) => {
                this.logger.error('Failed to generate log', err);
            });
    }

    private async generateTrace() {
        const traceId = this.generateTraceId();
        const flow = [
            {
                service: 'auth-service',
                message: 'User authentication request',
                severity: 'info' as const,
                delay: 0,
            },
            {
                service: 'user-profile',
                message: 'Fetching user profile data',
                severity: 'info' as const,
                delay: 50 + Math.random() * 100,
            },
            {
                service: 'payment-gateway',
                message: 'Processing payment transaction',
                severity: (Math.random() > 0.85 ? 'error' : 'info') as 'info' | 'error',
                delay: 200 + Math.random() * 300,
            },
            {
                service: 'notification-service',
                message: 'Sending confirmation email',
                severity: 'info' as const,
                delay: 600 + Math.random() * 200,
            },
        ];

        const baseTime = Date.now();

        for (const step of flow) {
            // Simulate occasional trace interruption
            if (step.severity === 'error' && Math.random() > 0.5) {
                this.logger.debug(`Trace ${traceId} interrupted due to error`);
                break;
            }

            await this.logsService.create({
                source: step.service,
                message: step.message,
                severity: step.severity,
                metadata: {
                    traceId,
                    latency: Math.floor(step.delay),
                    spanId: this.generateSpanId(),
                },
                timestamp: new Date(baseTime + step.delay).toISOString(),
            });

            await new Promise((resolve) => setTimeout(resolve, 150));
        }
    }

    private generateTraceId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    private generateSpanId(): string {
        return Math.random().toString(36).substring(2, 8);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.logger.log('Log generator stopped');
        }
    }
}
