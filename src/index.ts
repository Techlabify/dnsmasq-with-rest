import { readFile, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { createServer, IncomingMessage } from 'http';

const LEASE_FILE = "/etc/dnsmasq-static.leases";
const DYNAMIC_LEASE_FILE ="/var/lib/misc/dnsmasq.leases";

interface StaticLease {
	mac: string;
	ip: string;
} 

interface StaticLeaseDeleteData {
	mac: string;
}

type Guard<T> = (data: unknown) => data is T; 

class HTTPError extends Error {
	constructor(public statusCode: number, public message: string) {
		super(message);
	}
}

function log(...args: any[]): void {
	console.log(`[${new Date().toISOString()}]`, ...args);
}

function readLeases(): Promise<StaticLease[]> {
	return readFile(LEASE_FILE, "utf8")
		.then(data => data
			.split("\n")
			.filter(line => line.trim() !== "" && !line.startsWith("#") && line.includes(","))
			.map(line => {
				const [mac, ip] = line.split(",");
				return { mac, ip };
		}));
}

interface DynamicLease {
	expiration: number;
	mac:string;
	ip: string;
	hostname: string;
	clientId: string;
}

function readDynamicLeases(): Promise<DynamicLease[]> {
	return readFile(DYNAMIC_LEASE_FILE, "utf-8")
		.then(data => data
			.split("\n")
			.filter(line => line.trim() !== "" && !line.startsWith("#"))
			.map(line => {
				const [expiration, mac, ip, hostname, clientId] = line.split(" ");
				return { expiration: parseInt(expiration), mac, ip, hostname, clientId };
		}));
}

function persistLeases(updatedLeases: StaticLease[]): Promise<void> {
	return writeFile(LEASE_FILE, updatedLeases.map(lease => `${lease.mac},${lease.ip}`).join("\n"));
}

function removeLeaseResult(mac: string): Promise<StaticLease[]> {
	return readLeases().then(leases => leases.filter(lease => lease.mac !== mac));
}

function addLeaseResult(mac: string, ip: string): Promise<StaticLease[]> {
	return removeLeaseResult(mac).then(leases => [...leases, { mac, ip }]);
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
	return new Promise((resolve, reject) => {
		let body = "";
		req.on("data", chunk => body += chunk);
		req.on("end", () => {
			try {
				resolve(JSON.parse(body));
			} catch (err) {
				reject(new HTTPError(400, `Invalid JSON: ${err}`));
			}
		});
	});
}

function restartDnsmasq(): Promise<void> {
	return new Promise((resolve, reject) => {
		exec("service dnsmasq restart", error => {
			if (error) reject(new HTTPError(500, "Failed to restart dnsmasq"));
			else resolve();
		});
	});
}

function readJsonTypedBody<T>(req: IncomingMessage, guard: Guard<T>): Promise<T> {
	return readJsonBody(req).then(data => {
		if (!guard(data)) throw new HTTPError(400, `Invalid data: ${JSON.stringify(data, null, 0)}`);
		return data;
	});
}

function staticLeaseGuard(data: unknown): data is StaticLease {
	if (typeof data !== "object" || data === null) return false;
	const { mac, ip } = data as StaticLease;
	return typeof mac === "string" && typeof ip === "string";
}

function staticLeaseDeleteGuard(data: unknown): data is StaticLeaseDeleteData {
	if (typeof data !== "object" || data === null) return false;
	const { mac } = data as StaticLeaseDeleteData;
	return typeof mac === "string";
}

const server = createServer((req, res) => {
	if (req.url === "/lease" && req.method === "GET") {
		readDynamicLeases()
			.then(leases => {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(leases));
			})
			.catch(err => {
				log(err.message || err);
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Failed to read lease file" }));
			});
		return;
	}
	if (req.url === "/static-lease" && req.method === "GET") {
		readLeases()
			.then(leases => {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(leases));
			})
			.catch(err => {
				log(err.message || err);
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Failed to read lease file" }));
			});
		return;
	}
	if (req.url === "/static-lease" && req.method === "POST") {
		let leases: StaticLease[];
		readJsonTypedBody(req, staticLeaseGuard)
			.then(data => addLeaseResult(data.mac, data.ip))
			.then(updatedLeases => persistLeases(updatedLeases))
			.then(restartDnsmasq)
			.then(() => {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, message: "Static lease added" }));
			})
			.catch(err => {
				log(err.message || err);
				res.writeHead(err.statusCode || 500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: err.message }));
			});
		return;
	}
	if (req.url === "/static-lease" && req.method === "DELETE") {
		readJsonTypedBody(req, staticLeaseDeleteGuard)
			.then(data => removeLeaseResult(data.mac))
			.then(updatedLeases => persistLeases(updatedLeases))
			.then(restartDnsmasq)
			.then(() => {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ success: true, message: "Static lease removed" }));
			})
			.catch(err => {
				log(err.message || err);
				res.writeHead(err.statusCode || 500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: err.message }));
			});
		return;
	}
	if (req.url === "/status" && req.method === "GET") {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ status: "OK" }));
		return;
	}
	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ error: "Not found" }));
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
	log(`Server running on http://localhost:${PORT}`);
});
