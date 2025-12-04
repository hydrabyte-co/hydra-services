module.exports = {
  apps: [
    {
      name: 'core.iam.api00',
      script: './dist/services/iam/main.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',

      // Environment variables from .env file
      env: {
        NODE_ENV: 'production',
        PORT: 3300,
      },

      // Load .env file
      env_file: '.env',

      // Logging
      error_file: './logs/iam-api-00-error.log',
      out_file: './logs/iam-api-00-out.log',
      //log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Auto restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },{
      name: 'core.noti.api00',
      script: './dist/services/noti/main.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',

      // Environment variables from .env file
      env: {
        NODE_ENV: 'production',
        PORT: 3310,
      },

      // Load .env file
      env_file: '.env',

      // Logging
      error_file: './logs/noti-api-00-error.log',
      out_file: './logs/noti-api-00-out.log',
      //log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
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
    {
      name: 'core.aiwm.api00',
      script: './dist/services/aiwm/main.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',

      // Environment variables from .env file
      env: {
        NODE_ENV: 'production',
        PORT: 3350,
      },

      // Load .env file
      env_file: '.env',

      // Logging
      error_file: './logs/aiwm-api-00-error.log',
      out_file: './logs/aiwm-api-00-out.log',
      //log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
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
    {
      name: 'core.cbm.api00',
      script: './dist/services/cbm/main.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',

      // Environment variables from .env file
      env: {
        NODE_ENV: 'production',
        PORT: 3360,
      },

      // Load .env file
      env_file: '.env',

      // Logging
      error_file: './logs/cbm-api-00-error.log',
      out_file: './logs/cbm-api-00-out.log',
      //log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
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
