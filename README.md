# techlabify-dnsmasq

A dnsmasq server with a Node REST API to add/list/remove static leases

## Adding a static lease

```bash
curl -X POST http://localhost:3000/static-lease -H "Content-Type: application/json" \
     -d '{"mac": "00:11:22:33:44:55", "ip": "10.10.5.155"}'
```

## Listing static leases

```bash
curl http://localhost:3000/static-lease
```

## Deleting a static lease

```bash
curl -X DELETE http://localhost:3000/static-lease -H "Content-Type: application/json" \
     -d '{"mac": "00:11:22:33:44:55", "ip": "10.10.5.155"}'
```
