const ENDPOINT = 'http://localhost:3000/logs/ingest';
const SERVICES = ['auth-service', 'payment-gateway', 'user-profile', 'notification-service'];
const MESSAGES = {
    info: ['User logged in', 'Profile updated', 'Email sent', 'Payment processed', 'Health check passed'],
    warn: ['High memory usage', 'Slow response time', 'Rate limit approaching', 'Disk space low'],
    error: ['Database connection failed', 'Payment declined', 'Null pointer exception', 'Timeout waiting for upstream', 'Service unavailable']
};

async function sendLog() {
    const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    const severityRoll = Math.random();
    let severity = 'info';
    if (severityRoll > 0.7) severity = 'warn';
    if (severityRoll > 0.9) severity = 'error';

    const validMessages = MESSAGES[severity];
    const message = validMessages[Math.floor(Math.random() * validMessages.length)];

    const log = {
        source: service,
        message: message,
        severity,
        metadata: { latency: Math.floor(Math.random() * 500) },
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log)
        });
        console.log(`[${severity.toUpperCase()}] ${service}: ${message} `);
    } catch (e) {
        console.error('Failed to send log:', e.message);
    }
}

// Run loop
setInterval(sendLog, 1000); // 1 log per second default
// Occasional bursts
setInterval(() => {
    // Burst 5 logs
    for (let i = 0; i < 5; i++) sendLog();
}, 5000);

console.log('Starting log simulation to ' + ENDPOINT);
