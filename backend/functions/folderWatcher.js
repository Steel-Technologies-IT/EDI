const fs = require('fs');
const path = require('path');
const net = require('net');

const ONE_HOUR_MS = 60 * 60 * 1000;

function formatDuration(ms) {
	if (ms < 60000) {
		return `${Math.floor(ms / 1000)} second(s)`;
	}
	return `${(ms / 60000).toFixed(1)} minute(s)`;
}

function formatAge(minutes) {
	return `${Math.floor(minutes)} minute(s)`;
}

async function findStaleFiles(folderPaths, staleAfterMs) {
	const now = Date.now();
	const staleFiles = [];

	for (const folderPath of folderPaths) {
		let entries = [];
		try {
			entries = fs.readdirSync(folderPath, { withFileTypes: true });
		} catch (error) {
			console.error(`Unable to read folder ${folderPath}:`, error.message);
			continue;
		}

		for (const entry of entries) {
			if (!entry.isFile()) {
				continue;
			}

			const fullPath = path.join(folderPath, entry.name);
			try {
				const stats = fs.statSync(fullPath);
				const ageMs = now - stats.mtimeMs;
                console.log(`Checked file: ${fullPath}, age: ${formatAge(ageMs / 60000)}`);
				if (ageMs >= staleAfterMs) {
					staleFiles.push({
						folderPath,
						fileName: entry.name,
						fullPath,
						ageMinutes: ageMs / 60000,
						mtimeMs: stats.mtimeMs
					});
				}
			} catch (error) {
				console.error(`Unable to stat file ${fullPath}:`, error.message);
			}
		}
	}

	return staleFiles;
}

function buildEmailBody(staleFiles, hostName) {
	const lines = staleFiles
		.sort((a, b) => b.ageMinutes - a.ageMinutes)
		.map(file => `${file.fullPath} | age: ${formatAge(file.ageMinutes)}`);

	return [
		'The EDI stale-file monitor found files older than 1 hour.',
		'',
		`Host: ${hostName}`,
		`Timestamp (UTC): ${new Date().toISOString()}`,
		'',
		'Files:',
		...lines
	].join('\n');
}

function createDedupKey(file) {
	return `${file.fullPath}|${file.mtimeMs}`;
}

function sanitizeSmtpLine(value) {
	return String(value || '').replace(/[\r\n]/g, ' ').trim();
}

function sendSmtpMail({ host, port, from, recipients, subject, text }) {
	return new Promise((resolve, reject) => {
		const socket = net.createConnection({ host, port });
		const queue = [
			`HELO ${sanitizeSmtpLine(process.env.COMPUTERNAME || 'localhost')}`,
			`MAIL FROM:<${sanitizeSmtpLine(from)}>`,
			...recipients.map(address => `RCPT TO:<${sanitizeSmtpLine(address)}>`),
			'DATA'
		];

		const body = [
			`From: ${sanitizeSmtpLine(from)}`,
			`To: ${recipients.map(sanitizeSmtpLine).join(', ')}`,
			`Subject: ${sanitizeSmtpLine(subject)}`,
			'Content-Type: text/plain; charset=UTF-8',
			'',
			text,
			'.',
			'QUIT'
		].join('\r\n');

		let sentData = false;
		let activeCommand = null;
		let closed = false;

		const closeWithError = (message) => {
			if (closed) {
				return;
			}
			closed = true;
			socket.destroy();
			reject(new Error(message));
		};

		const closeSuccess = () => {
			if (closed) {
				return;
			}
			closed = true;
			socket.end();
			resolve();
		};

		socket.setEncoding('utf8');
		socket.setTimeout(15000, () => closeWithError('SMTP timeout while sending alert email.'));

		socket.on('error', (error) => closeWithError(`SMTP socket error: ${error.message}`));

		socket.on('data', (chunk) => {
			const lines = chunk
				.split(/\r?\n/)
				.map(line => line.trim())
				.filter(Boolean);

			for (const line of lines) {
				const code = Number.parseInt(line.slice(0, 3), 10);
				if (!Number.isInteger(code)) {
					continue;
				}

				if (code >= 400) {
					closeWithError(`SMTP rejected command${activeCommand ? ` (${activeCommand})` : ''}: ${line}`);
					return;
				}

				if (code === 220 || code === 250 || code === 251 || code === 354 || code === 221) {
					if (!sentData) {
						if (queue.length > 0) {
							activeCommand = queue.shift();
							socket.write(`${activeCommand}\r\n`);
						} else {
							sentData = true;
							activeCommand = 'DATA_BODY';
							socket.write(body);
						}
					} else if (code === 221) {
						closeSuccess();
						return;
					}
				}
			}
		});
	});
}

function startFolderWatcher(options = {}) {
	const folderPaths = options.folderPaths || [];
	const staleAfterMs = options.staleAfterMs || ONE_HOUR_MS;
	const checkEveryMs = options.checkEveryMs || ONE_HOUR_MS;
	const smtpHost = options.smtpHost;
	const smtpPort = options.smtpPort || 25;
	const recipients = options.recipients || [];
	const from = options.from || process.env.STALE_FILE_ALERT_FROM || 'edi-alerts@sttxna.com';

	if (!smtpHost || folderPaths.length === 0 || recipients.length === 0) {
		console.warn('Stale-file watcher not started. Missing smtpHost, folderPaths, or recipients.');
		return;
	}

	const sentKeys = new Set();

	const runCheck = async () => {
        console.log(`running stale-file check at ${new Date().toISOString()}...`)
		const staleFiles = await findStaleFiles(folderPaths, staleAfterMs);
		if (staleFiles.length === 0) {
			return;
		}

		const unsent = staleFiles.filter(file => !sentKeys.has(createDedupKey(file)));
		if (unsent.length === 0) {
			return;
		}

		const subject = `EDI Alert: ${unsent.length} stale file(s) older than 30 minutes`;
		const text = buildEmailBody(unsent, process.env.COMPUTERNAME || 'unknown-host');

		try {
			await sendSmtpMail({ host: smtpHost, port: smtpPort, from, recipients, subject, text });

			unsent.forEach(file => sentKeys.add(createDedupKey(file)));
			console.log(`Stale-file alert sent for ${unsent.length} file(s).`);
		} catch (error) {
			console.error('Failed to send stale-file alert email:', error.message);
		}
	};

	runCheck().catch(err => console.error('Initial stale-file check failed:', err.message));
	setInterval(() => {
		runCheck().catch(err => console.error('Scheduled stale-file check failed:', err.message));
	}, checkEveryMs);

	console.log(`Stale-file watcher started. Checking every ${formatDuration(checkEveryMs)}.`);
	console.log(`Stale-file watcher folders: ${folderPaths.join(', ')}`);
}

module.exports = {
	startFolderWatcher
};
