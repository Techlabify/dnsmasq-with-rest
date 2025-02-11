FROM node:22

# Install dnsmasq
RUN apt-get update && apt-get install -y dnsmasq && rm -rf /var/lib/apt/lists/*

# Configure dnsmasq
COPY dnsmasq.conf /etc/dnsmasq.conf
COPY dnsmasq-static.leases /etc/dnsmasq-static.leases

# Copy application files
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . ./

# Expose ports for DHCP and HTTP API
EXPOSE 67/UDP 3000

# Start dnsmasq and the Node.js application
CMD service dnsmasq start && node index.js
