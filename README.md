# dnsmasq-with-rest

A dnsmasq (DHCP) server with a REST API to add/list/remove static leases. 

If you are looking for a quick solution to get/assign IPs in an automated deployment of multiple machines, this might be your thing.
It will require less than two minutes to set up if you already have Docker (compose) installed.

The functionality of this package is intentioanlly kept simple, fast and lightweight. You can find complete [REST API solutions for dnsmasq](https://github.com/bpaquet/dnsmasq-rest-api), 
if you want more granular functionalities at the expense of setup time.

## Install and run

Create a dnsmasq.conf file. You can use (copy) the included example file `dnsmasq.conf.example` for a head start:

```bash
cp dnsmasq.conf.example dnsmasq.conf
```

Edit the config file as per needed. For the file structure reference please visit https://github.com/imp/dnsmasq/blob/master/dnsmasq.conf.example.

Then, install and run with docker compose

```bash
docker compose up -d
```

## Add a static lease

```bash
curl -X POST http://localhost:3000/static-lease -H "Content-Type: application/json" \
     -d '{"mac": "00:11:22:33:44:55", "ip": "10.10.5.155"}'
```

## List static leases

```bash
curl http://localhost:3000/static-lease
```

Response:

```json
[
  {
    "mac": "bc:24:11:2a:5d:04",
    "ip": "10.10.5.199"
  }
]
```

## Delete a static lease

```bash
curl -X DELETE http://localhost:3000/static-lease -H "Content-Type: application/json" \
     -d '{"mac": "00:11:22:33:44:55", "ip": "10.10.5.155"}'
```

## List all actual leases (both assigned form pool and static)

```bash
curl http://localhost:3000/lease
```

Response:

```json
[
  {
    "expiration": 1739391602,
    "mac": "bc:24:11:2a:5d:04",
    "ip": "10.10.5.199",
    "hostname": "clone-template",
    "clientId": "01:bc:24:11:2a:5d:04"
  }
]
```

## Get status

```bash
curl http://localhost:3000/status
```

Response:

```json
{
  "status": "OK"
}
```

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

This project interacts with dnsmasq, which is licensed under the GNU General Public License v2. dnsmasq itself is not included in this project. More details about dnsmasq can be found at:
http://www.thekelleys.org.uk/dnsmasq/doc.html

## Acknowledgements

A big shoutout for all the suppoerters and contributors @ [dnsmasq](https://github.com/imp/dnsmasq) for their work.
