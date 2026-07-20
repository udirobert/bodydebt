# Deployment & HTTPS

How `https://orbura.famile.xyz` is served. The app itself is deployed
with [`scripts/deploy.sh`](../scripts/deploy.sh) (build locally → rsync → pm2);
this doc covers the request path and TLS, which live **on the server** and are
not in this repo.

## Request path

```text
Browser ──HTTPS:443──▶ Coolify/Traefik (coolify-proxy, Docker)
                          │  Host(orbura.famile.xyz)
                          │  Let's Encrypt cert (HTTP-01, auto-renew)
                          ▼
                       next-server 127.0.0.1:3050  (pm2: orbura)
```

- DNS: `orbura.famile.xyz` A record → the Vultr box (`nuncio-vultr`,
  GoDaddy-managed nameservers — no Cloudflare involved).
- The box's shared **Coolify/Traefik** proxy (`coolify-proxy` container) owns
  ports 80/443. We don't run our own :443 listener; we hook into Traefik
  instead.
- Traefik reaches the Next.js server directly via `host.docker.internal:3050`
  — no intermediate nginx layer. The old `:8765` nginx vhosts were removed
  when this was wired up.

## TLS / Traefik route (server-side, not in repo)

Traefik runs with a file provider watching `/data/coolify/proxy/dynamic/` and a
Let's Encrypt HTTP-01 resolver named `letsencrypt`. Our route is a single file:

`/data/coolify/proxy/dynamic/orbura.yaml`

```yaml
http:
  routers:
    orbura-https:
      rule: "Host(`orbura.famile.xyz`)"
      entryPoints: [https]
      service: orbura
      tls:
        certResolver: letsencrypt
    orbura-http:
      rule: "Host(`orbura.famile.xyz`)"
      entryPoints: [http]
      middlewares: [orbura-https-redirect]
      service: orbura
  middlewares:
    orbura-https-redirect:
      redirectScheme: { scheme: https, permanent: true }
  services:
    orbura:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: "http://host.docker.internal:3050"   # Docker host → next-server
```

Notes:
- `host.docker.internal` resolves (inside the `coolify-proxy` container) to the
  Docker host gateway, so Traefik can reach the pm2-bound `:3050` directly.
  This mirrors how `director.thisyearnofear.com` and
  `magiclens.thisyearnofear.com` are wired on the same box.
- The box's ufw must allow `3050/tcp` from `10.0.0.0/8` (the Docker subnet) or
  Traefik's connection to the upstream silently times out. The rule is:
  `ufw allow from 10.0.0.0/8 to any port 3050 proto tcp comment 'orbura from Docker'`.
  Every other Docker→host app route on this box has an equivalent rule.
- Traefik watches the dir (`providers.file.watch=true`), so editing the file
  hot-reloads; cert issuance/renewal is automatic.
- To undo: delete `orbura.yaml`. The change is isolated to this host and does
  not affect other apps the proxy serves.
- The old `bodydebt.thisyearnofear.com` route (`bodydebt.yaml`) 301-redirects
  to `https://orbura.famile.xyz` while preserving path and query.

## Don't

- Don't point anyone at `http://orbura.famile.xyz:3050` — it's plain HTTP and
  the camera's secure-context check fails there. The public URL is
  `https://orbura.famile.xyz`.
- Don't remove the ufw `3050/tcp` rule for `10.0.0.0/8`. Without it, Traefik
  can't reach the upstream and `https://orbura.famile.xyz/` hangs after the TLS
  handshake (the HTTP→HTTPS redirect on `:80` still works because Traefik
  handles it before touching the upstream, which is a misleading symptom).
- Don't reintroduce an nginx `:8765` middle layer for orbura. Traefik can reach
  `:3050` directly; the extra hop existed only because the `:3050` ufw rule was
  missing.
- No Cloudflare. The old quick-tunnel (`cloudflared`) was removed from
  `ecosystem.config.cjs`; HTTPS now comes from Traefik.
- Don't run `npm install` or `bun install` on the server. The deploy script
  rsyncs a pre-trimmed `node_modules` from the build host; running a package
  manager on the server re-resolves the tree, prunes platform-specific binaries
  (including `@next/swc-linux-x64-gnu`), and wipes `.next`. If dependencies are
  out of sync, fix them locally and re-run `scripts/deploy.sh`.

## Storybook at /storybook

Storybook is built locally by `scripts/deploy.sh` (`bun run build-storybook`),
copied into `public/storybook/`, and served by Next.js as static files at
`/storybook`.

Next.js uses `trailingSlash: false` (default), which redirects `/storybook/` →
`/storybook`. This breaks the relative paths (`./sb-manager/...`,
`./iframe.html`) in the Storybook HTML because the browser resolves them
relative to `/` instead of `/storybook/`. Two fixes work together:

1. **`<base href="/storybook/">` injection** — `deploy.sh` injects this tag into
   `index.html` and `iframe.html` after the Storybook build, forcing the browser
   to resolve all relative URLs against `/storybook/`.
2. **Rewrite** — `next.config.ts` rewrites `/storybook` → `/storybook/index.html`
   so the slashless URL serves the entry HTML instead of 404ing.

The entry HTML is served with `Cache-Control: no-cache`; hashed asset bundles
use `immutable`.
