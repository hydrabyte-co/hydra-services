module.exports = {
  apps: [
    {
      name: 'iam-api',
      script: './dist/services/iam/main.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',

      // Environment variables from .env file
      env: {
        NODE_ENV: 'production',
        PORT: 3301,
      },

      // Load .env file
      env_file: '.env',

      // Logging
      error_file: './logs/iam-api-error.log',
      out_file: './logs/iam-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Auto restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
