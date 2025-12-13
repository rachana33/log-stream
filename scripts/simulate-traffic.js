const ENDPOINT = 'http://localhost:3000/logs/ingest';
const SERVICES = ['auth-service', 'payment-gateway', 'user-profile', 'notification-service'];
const SEVERITIES = ['info', 'info', 'info', 'warn', 'error']; // Weighted
const MESSAGES = {
    info: ['Health check passed', 'User logged in', 'Profile updated', 'Email sent', 'Payment processed'],
    warn: ['High memory usage', 'Disk space low', 'Rate limit approaching', 'Slow response time'],
    error: ['Database connection failed', 'Service unavailable', 'Timeout waiting for upstream', 'Null pointer exception', 'Payment declined']
};

// Generate a connected trace spanning multiple services
async function sendTrace() {
    const traceId = Math.random().toString(36).substring(2, 15);
    const flow = [
        { service: 'auth-service', msg: 'User login attempt', severity: 'info', delay: 0 },
        { service: 'user-profile', msg: 'Fetching user preferences', severity: 'info', delay: 50 + Math.random() * 100 },
        { service: 'payment-gateway', msg: 'Processing transaction', severity: Math.random() > 0.8 ? 'error' : 'info', delay: 200 + Math.random() * 300 },
        { service: 'notification-service', msg: 'Sending confirmation', severity: 'info', delay: 600 + Math.random() * 200 }
    ];

    const baseTime = Date.now();

    for (const step of flow) {
        // Stop trace if error occurs (simulate circuit break), sometimes continue
        if (Math.random() > 0.9) break;

        const log = {
            source: step.service,
            message: step.msg,
            severity: step.severity,
            metadata: {
                traceId,
                latency: Math.floor(step.delay),
                spanId: Math.random().toString(36).substring(2, 8)
            },
            timestamp: new Date(baseTime + step.delay).toISOString()
        };

        sendToBackend(log);
        await new Promise(r => setTimeout(r, 100)); // faint delay between emissions
    }
}

function sendToBackend(log) {
    const api = 'http://localhost:3000/logs/ingest';
    // Using simple fetch (Node 18+)
    fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
    }).then(res => {
        if (!res.ok) console.error(`Failed to send log: ${res.statusText}`);
        else {
            const color = log.severity === 'error' ? '\x1b[31m' : log.severity === 'warn' ? '\x1b[33m' : '\x1b[32m';
            console.log(`${color}[${log.severity.toUpperCase()}] ${log.source}: ${log.message} \x1b[0m`);
        }
    }).catch(err => console.error(`Failed to send log: ${err.message}`));
}


console.log('Starting log simulation to ' + ENDPOINT);

setInterval(() => {
    // 30% chance to send a full trace, otherwise single random log
    if (Math.random() < 0.3) {
        sendTrace();
    } else {
        const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
        const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
        const validMessages = MESSAGES[severity];
        const message = validMessages[Math.floor(Math.random() * validMessages.length)];
        const traceId = Math.random().toString(36).substring(2, 15);

        sendToBackend({
            source: service,
            message: message,
            severity,
            metadata: { latency: Math.floor(Math.random() * 100), traceId },
            timestamp: new Date().toISOString()
        });
    }
}, 800); // Send log every 800ms
