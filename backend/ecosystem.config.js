module.exports = {
    apps: [{
      name: 'video-safety-app',
      script: 'scripts/start.py',
      interpreter: './venv/bin/python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }]
  }