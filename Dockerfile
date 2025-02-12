FROM node:22-alpine

# Install dnsmasq
RUN apk add dnsmasq openrc
RUN mkdir /run/openrc
RUN touch /run/openrc/softlevel

# Configure dnsmasq
COPY dnsmasq.conf /etc/dnsmasq.conf
COPY dnsmasq-static.leases /etc/dnsmasq-static.leases

# Copy application files
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . ./

RUN npm run build
RUN npm prune --production

# Expose ports for DHCP and HTTP API
EXPOSE 67/UDP 3000

# Start dnsmasq and the Node.js application
CMD rc-service dnsmasq start && npm start
