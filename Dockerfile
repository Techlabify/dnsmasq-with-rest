# Build layer
FROM node:22-alpine AS build
# Copy application files
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . ./

RUN npm run build
RUN npm prune --production

# Production layer
FROM alpine

WORKDIR /app

# Install dnsmasq & clean up cache
RUN apk add dnsmasq && rm -rf /var/cache/apk/*

# Configure dnsmasq
COPY dnsmasq.conf /etc/dnsmasq.conf
COPY dnsmasq-static.leases /etc/dnsmasq-static.leases
# Copy over node from build layer
COPY --from=build /usr/local/bin/node /usr/local/bin/
COPY --from=build /usr/lib /usr/lib/
# Copy over built application
COPY --from=build /app/dist /app/

# Expose ports for DHCP and HTTP API
EXPOSE 67/UDP 3000

# Start dnsmasq and the Node.js application
CMD ["node", "index.js"]
