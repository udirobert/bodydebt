module.exports = {
  apps: [
    {
      name: 'bodydebt',
      cwd: '/opt/bodydebt',
      script: '/usr/bin/node',
      args: 'node_modules/next/dist/bin/next start',
      env: {
        NODE_ENV: 'production',
        PORT: '3050',
        HOSTNAME: '127.0.0.1',
        NEXT_PUBLIC_APP_URL: 'https://bodydebt.thisyearnofear.com',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      out_file: '/opt/bodydebt/logs/bodydebt.out.log',
      error_file: '/opt/bodydebt/logs/bodydebt.err.log',
      merge_logs: true,
      time: true,
    },
    // HTTPS is terminated by the box's Coolify/Traefik proxy (ports 80/443)
    // via a file-provider route at /data/coolify/proxy/dynamic/bodydebt.yaml,
    // which fronts host nginx (127.0.0.1:8765) and auto-issues a Let's Encrypt
    // cert for bodydebt.thisyearnofear.com. No Cloudflare tunnel needed.
  ],
};
