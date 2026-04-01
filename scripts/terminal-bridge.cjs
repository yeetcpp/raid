const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.TERMINAL_BRIDGE_PORT ? Number(process.env.TERMINAL_BRIDGE_PORT) : 8787;
const PROJECT_ROOT = path.resolve(__dirname, '..');

function generateUid() {
    return crypto.randomBytes(6).toString('hex').toUpperCase().match(/.{1,2}/g).join(':');
}

const SESSION_REAL_UID = generateUid();
const SESSION_CORRECT_PC = String(crypto.randomInt(1, 7));

console.log(`[terminal-bridge] Session UID: ${SESSION_REAL_UID}`);
console.log(`[terminal-bridge] Correct PC: ${SESSION_CORRECT_PC}`);

function writeJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

function runDockerCommand(command, computerId, callback) {
    const normalizedComputerId = String(computerId);

    // Compose command that runs with restricted PATH and as terminal user
    // This ensures proper environment isolation
    const fullCommand = `export PATH="/usr/local/restricted/bin" HOME="/home/player" COMPUTER_ID="${normalizedComputerId}" REAL_UID="${SESSION_REAL_UID}" CORRECT_PC="${SESSION_CORRECT_PC}"; source /home/player/.bashrc 2>/dev/null; ${command}`;

    // Use docker exec directly to run command in the running container
    // This works inside the bridge container without needing docker-compose
    const child = spawn(
        'docker',
        [
            'exec',
            '-u',
            'terminal',
            '-e',
            `COMPUTER_ID=${normalizedComputerId}`,
            '-e',
            `REAL_UID=${SESSION_REAL_UID}`,
            '-e',
            `CORRECT_PC=${SESSION_CORRECT_PC}`,
            'flipper-linux-terminal',
            '/bin/bash',
            '-c',
            fullCommand
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
        // Filter out noise from stderr
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
                if (trimmed.startsWith('WARN')) {
                    return false;
                }
                if (trimmed.startsWith('time=')) {
                    return false;
                }
                // Filter Docker version mismatch errors
                if (trimmed.includes('client version') || trimmed.includes('API version') || trimmed.includes('too old')) {
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
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // Session endpoint - returns the randomized UID and correct PC for this session
    if (req.url === '/session' && req.method === 'GET') {
        writeJson(res, 200, {
            realUid: SESSION_REAL_UID,
            correctPc: SESSION_CORRECT_PC
        });
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
        const computerId = Number(payload.computerId);

        if (!command) {
            writeJson(res, 400, { error: 'command is required' });
            return;
        }

        if (!Number.isInteger(computerId) || computerId < 1 || computerId > 6) {
            writeJson(res, 400, { error: 'computerId must be an integer from 1 to 6' });
            return;
        }

        // Ensure files are generated for this specific computer before running the command
        const generateFilesCmd = `/setup/generate_files.sh && ${command}`;

        runDockerCommand(generateFilesCmd, computerId, (error, result) => {
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
    console.log('[terminal-bridge] endpoints:');
    console.log('  - GET  /session  (returns { realUid, correctPc })');
    console.log('  - POST /execute  { command: "ls", computerId: 1 }');
});
