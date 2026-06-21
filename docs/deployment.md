# Deployment & HTTPS

How `https://bodydebt.thisyearnofear.com` is served. The app itself is deployed
with [`scripts/deploy.sh`](../scripts/deploy.sh) (build locally → rsync → pm2);
this doc covers the request path and TLS, which live **on the server** and are
not in this repo.

## Request path

```text
Browser ──HTTPS:443──▶ Coolify/Traefik (coolify-proxy, Docker)
                          │  Host(bodydebt.thisyearnofear.com)
                          │  Let's Encrypt cert (HTTP-01, auto-renew)
                          ▼
                       host nginx 127.0.0.1:8765
                          ▼
                       next-server 127.0.0.1:3050  (pm2: bodydebt)
```

- DNS: `bodydebt.thisyearnofear.com` A record → the Vultr box (GoDaddy-managed,
  nameservers stay on GoDaddy — no Cloudflare involved).
- The box's shared **Coolify/Traefik** proxy owns ports 80/443. We don't run our
  own :443 listener; we hook into Traefik instead.

## TLS / Traefik route (server-side, not in repo)

Traefik runs with a file provider watching `/data/coolify/proxy/dynamic/` and a
Let's Encrypt HTTP-01 resolver named `letsencrypt`. Our route is a single file:

`/data/coolify/proxy/dynamic/bodydebt.yaml`

```yaml
http:
  routers:
    bodydebt-https:
      rule: "Host(`bodydebt.thisyearnofear.com`)"
      entryPoints: [https]
      service: bodydebt
      tls:
        certResolver: letsencrypt
    bodydebt-http:
      rule: "Host(`bodydebt.thisyearnofear.com`)"
      entryPoints: [http]
      middlewares: [bodydebt-https-redirect]
      service: bodydebt
  middlewares:
    bodydebt-https-redirect:
      redirectScheme: { scheme: https, permanent: true }
  services:
    bodydebt:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: "http://10.0.0.1:8765"   # host gateway → host nginx
```

Notes:
- `10.0.0.1` is the Docker host gateway as seen from the `coolify` network. The
  proxy can reach host nginx on `:8765` but **not** `:3050` (firewalled from the
  container subnet), so the upstream is nginx, not next-server directly.
- Traefik watches the dir (`providers.file.watch=true`), so editing the file
  hot-reloads; cert issuance/renewal is automatic.
- To undo: delete `bodydebt.yaml`. The change is isolated to this host and does
  not affect other apps the proxy serves.

## Don't

- Don't point anyone at `http://bodydebt.thisyearnofear.com:8765` — it's plain
  HTTP (Traefik's upstream) and the camera's secure-context check fails there.
  The public URL is `https://bodydebt.thisyearnofear.com`.
- Don't add an HTTP→HTTPS redirect on the host nginx `:8765` vhost — Traefik
  proxies to it over plain HTTP, so a redirect there would loop.
- No Cloudflare. The old quick-tunnel (`cloudflared`) was removed from
  `ecosystem.config.cjs`; HTTPS now comes from Traefik.
