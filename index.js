const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const LEASE_FILE = "/etc/dnsmasq-static.leases";

// Add Static Lease
app.post('/static-lease', (req, res) => {
    const { mac, ip } = req.body;
    if (!mac || !ip) return res.status(400).json({ error: "MAC and IP are required" });

    fs.readFile(LEASE_FILE, "utf8", (err, data) => {
        if (err) return res.status(500).json({ error: "Failed to read lease file" });

        // Remove existing lease for the MAC
        const updatedLeases = data.split("\n").filter(line => !line.startsWith(mac)).join("\n");
        
        // Append the new lease entry
        const newLeases = `${updatedLeases}\n${mac},${ip}\n`;

        fs.writeFile(LEASE_FILE, newLeases.trim() + "\n", (err) => {
            if (err) return res.status(500).json({ error: "Failed to update lease file" });

            exec("service dnsmasq restart", (error) => {
                if (error) return res.status(500).json({ error: "Failed to restart dnsmasq" });
                res.json({ success: true, message: `Static lease added for ${mac} -> ${ip}` });
            });
        });
    });
});

// Remove Static Lease
app.delete('/static-lease', (req, res) => {
    const { mac } = req.body;
    if (!mac) return res.status(400).json({ error: "MAC address is required" });

    fs.readFile(LEASE_FILE, "utf8", (err, data) => {
        if (err) return res.status(500).json({ error: "Failed to read lease file" });

        const updatedLeases = data.split("\n").filter(line => !line.startsWith(mac)).join("\n");

        fs.writeFile(LEASE_FILE, updatedLeases, (err) => {
            if (err) return res.status(500).json({ error: "Failed to update lease file" });

            exec("service dnsmasq restart", (error) => {
                if (error) return res.status(500).json({ error: "Failed to restart dnsmasq" });
                res.json({ success: true, message: `Static lease removed for ${mac}` });
            });
        });
    });
});

// Get Static Leases
app.get('/static-lease', (req, res) => {
	fs.readFile(LEASE_FILE, "utf8", (err, data) => {
		if (err) return res.status(500).json({ error: "Failed to read lease file" });

		const leases = data.split("\n").map(line => {
			const [mac, ip] = line.split(",");
			return { mac, ip };
		});

		res.json(leases);
	});
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`DHCP API running on port ${PORT}`));
