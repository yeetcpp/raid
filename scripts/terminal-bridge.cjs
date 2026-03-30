const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.TERMINAL_BRIDGE_PORT ? Number(process.env.TERMINAL_BRIDGE_PORT) : 8787;
const PROJECT_ROOT = path.resolve(__dirname, '..');

function writeJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

function runDockerCommand(command, callback) {
    const child = spawn(
        'docker',
        [
            'compose',
            '-f',
            'docker-compose.terminal.yml',
            'run',
            '--rm',
            '-T',
            '-e',
            `TERMINAL_EXEC_CMD=${command}`,
            'linux-terminal',
        ],
        {
            cwd: PROJECT_ROOT,
            env: process.env
        }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    child.on('error', (error) => {
        callback(error);
    });

    child.on('close', (code) => {
        const filteredStderr = stderr
            .split('\n')
            .filter((line) => {
                const trimmed = line.trim();
                if (!trimmed) {
                    return false;
                }
                if (trimmed.startsWith('Container ')) {
                    return false;
                }
                if (trimmed.startsWith('[+]')) {
                    return false;
                }
                if (trimmed.startsWith('Image ')) {
                    return false;
                }
                return true;
            })
            .join('\n');

        callback(null, { stdout, stderr: filteredStderr, exitCode: code });
    });
}

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    if (req.url !== '/execute' || req.method !== 'POST') {
        writeJson(res, 404, { error: 'Not found' });
        return;
    }

    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
        if (body.length > 1024 * 64) {
            req.destroy();
        }
    });

    req.on('end', () => {
        let payload;
        try {
            payload = JSON.parse(body || '{}');
        } catch (error) {
            writeJson(res, 400, { error: 'Invalid JSON body' });
            return;
        }

        const command = typeof payload.command === 'string' ? payload.command.trim() : '';
        if (!command) {
            writeJson(res, 400, { error: 'command is required' });
            return;
        }

        runDockerCommand(command, (error, result) => {
            if (error) {
                writeJson(res, 500, {
                    error: 'Failed to execute docker command',
                    details: error.message
                });
                return;
            }

            writeJson(res, 200, result);
        });
    });
});

server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
        console.error(`[terminal-bridge] port ${PORT} is already in use.`);
        console.error('[terminal-bridge] another bridge instance is likely already running.');
        console.error('[terminal-bridge] stop it: lsof -i :8787 -n -P && kill <PID>');
        console.error('[terminal-bridge] or use a different port: TERMINAL_BRIDGE_PORT=8788 npm run terminal:bridge');
        process.exit(0);
    }

    console.error('[terminal-bridge] fatal startup error:', error.message);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`[terminal-bridge] listening on http://localhost:${PORT}`);
    console.log('[terminal-bridge] endpoint: POST /execute { command: "ls" }');
});
