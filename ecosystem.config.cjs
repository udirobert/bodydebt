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
        NEXT_PUBLIC_APP_URL: 'http://bodydebt.thisyearnofear.com:8765',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      out_file: '/opt/bodydebt/logs/bodydebt.out.log',
      error_file: '/opt/bodydebt/logs/bodydebt.err.log',
      merge_logs: true,
      time: true,
    },
    {
      // Cloudflare quick tunnel — exposes the HTTP-only deployment over
      // HTTPS so getUserMedia (camera) and other secure-context APIs
      // work for the hackathon demo. No DNS / cert / account needed.
      // The trycloudflare.com URL is logged to logs/tunnel.out.log on
      // first start and stays stable as long as the process keeps running.
      name: 'bodydebt-tunnel',
      script: '/usr/local/bin/cloudflared',
      args: 'tunnel --no-autoupdate --url http://127.0.0.1:8765',
      cwd: '/opt/bodydebt',
      out_file: '/opt/bodydebt/logs/tunnel.out.log',
      error_file: '/opt/bodydebt/logs/tunnel.err.log',
      merge_logs: true,
      time: true,
      autorestart: true,
    },
  ],
};
