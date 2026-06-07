import http from 'http';
import https from 'https';

const PORT = 8081;
const TARGET_HOST = 'agentrouter.org';

const server = http.createServer((clientReq, clientRes) => {
    // We only care about /v1 routes
    if (!clientReq.url.startsWith('/v1')) {
        clientRes.writeHead(404);
        clientRes.end('Proxy only supports /v1 routes');
        return;
    }

    console.log(`[PROXY] Incoming request: ${clientReq.method} ${clientReq.url}`);

    // Copy client headers and spoof the required AgentRouter/OpenCode headers
    const headers = { ...clientReq.headers };
    
    // Crucial: Spoof headers to mimic claude-cli / OpenCode
    headers['host'] = TARGET_HOST;
    headers['user-agent'] = 'claude-cli/1.0.108 (external, cli)';
    headers['anthropic-version'] = '2023-06-01';
    
    // Remove headers that might expose the Python backend
    delete headers['origin'];
    delete headers['referer'];
    delete headers['accept-encoding']; // Remove encoding to prevent issues with stream piping

    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: clientReq.url,
        method: clientReq.method,
        headers: headers
    };

    const proxyReq = https.request(options, (proxyRes) => {
        // Forward the response headers and status
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        // Pipe the response stream back to the client (supports SSE streaming)
        proxyRes.pipe(clientRes, { end: true });
    });

    // Handle proxy errors
    proxyReq.on('error', (err) => {
        console.error(`[PROXY ERROR]`, err.message);
        clientRes.writeHead(500);
        clientRes.end('Proxy Error: ' + err.message);
    });

    // Pipe the incoming request body to the proxy request
    clientReq.pipe(proxyReq, { end: true });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`=================================================`);
    console.log(` AgentRouter Local Proxy listening on port ${PORT}`);
    console.log(` Forwarding all /v1 requests to ${TARGET_HOST}`);
    console.log(`=================================================`);
});
