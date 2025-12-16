// Mock data for instant demo loading
export const getMockLogs = () => {
    const services = ['auth-service', 'payment-gateway', 'user-profile', 'notification-service'];
    const severities = ['info', 'warn', 'error', 'debug'];
    const messages = {
        info: [
            'User authentication successful',
            'Request processed successfully',
            'Health check passed',
            'Cache hit for user profile',
            'Session created',
            'Email notification sent',
            'Payment processed successfully'
        ],
        warn: [
            'High memory usage detected: 85%',
            'Response time exceeded threshold',
            'Rate limit approaching',
            'Disk space low: 15% remaining',
            'Connection pool near capacity'
        ],
        error: [
            'Database connection timeout',
            'Payment gateway unavailable',
            'Authentication token expired',
            'Failed to send notification',
            'Service unavailable: External API',
            'Null pointer exception in handler'
        ],
        debug: [
            'Cache miss - fetching from database',
            'Received request from client',
            'Processing webhook payload',
            'Validating user credentials'
        ]
    };

    const logs = [];
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
        const service = services[Math.floor(Math.random() * services.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)] as keyof typeof messages;
        const messageList = messages[severity];
        const message = messageList[Math.floor(Math.random() * messageList.length)];
        const traceId = Math.random().toString(36).substring(2, 15);

        logs.push({
            id: Date.now() + i,
            source: service,
            message,
            severity,
            metadata: {
                traceId,
                latency: Math.floor(Math.random() * 500),
                spanId: Math.random().toString(36).substring(2, 8)
            },
            createdAt: new Date(now - i * 30000).toISOString() // Spread over last 50 minutes
        });
    }

    return logs;
};

export const getMockStats = () => {
    return [
        { severity: 'info', count: 54 },
        { severity: 'warn', count: 18 },
        { severity: 'error', count: 12 },
        { severity: 'debug', count: 16 }
    ];
};

export const getMockForecast = () => {
    const data = [];
    const now = Date.now();

    for (let i = 14; i >= 0; i--) {
        const timestamp = now - i * 60000;
        data.push({
            time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            count: Math.floor(Math.random() * 30) + 10,
            errors: Math.floor(Math.random() * 5),
            warnings: Math.floor(Math.random() * 8)
        });
    }

    return data;
};

export const getMockAiInsight = () => {
    return {
        summary: "System analysis shows moderate activity with payment gateway experiencing intermittent issues.",
        services: [
            {
                name: "auth-service",
                status: "Healthy" as const,
                issues: [],
                riskScore: 2
            },
            {
                name: "payment-gateway",
                status: "Warning" as const,
                issues: [
                    "3 timeout errors in last hour",
                    "Average latency increased by 45%"
                ],
                riskScore: 6
            },
            {
                name: "user-profile",
                status: "Healthy" as const,
                issues: [],
                riskScore: 1
            },
            {
                name: "notification-service",
                status: "Critical" as const,
                issues: [
                    "Service unavailable for 5 minutes",
                    "Queue backlog exceeding 1000 messages",
                    "Multiple connection failures"
                ],
                riskScore: 9
            }
        ]
    };
};
