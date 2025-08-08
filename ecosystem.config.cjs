/**
 * PM2 ecosystem file
 *   pm2 start ecosystem.config.js           (first deploy)
 *   pm2 restart Invex Apps QA --update-env  (subsequent deploys)
 */
module.exports = {
    apps: [{
      name       : 'Invex Apps Backend',
      script     : './backend/server.js',
      instances  : '1',            // change to 'max' for cluster mode
      exec_mode  : 'fork',
      watch      : true,
      max_memory_restart: '1G',
      autorestart: true,
      kill_timeout: 5000,
      treekill: false,
      log_date_format : 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name       : 'Invex Apps Frontend',
      cwd        : './frontend',
      script     : '.\\node_modules\\.bin\\serve.cmd',
      args       : ['-s', 'build', '-l', '3000'],
      instances  : '1',
      exec_mode  : 'fork',
      watch      : false,
      max_memory_restart: '500M',
      autorestart: true,
      kill_timeout: 5000,
      treekill: false,
      log_date_format : 'YYYY-MM-DD HH:mm:ss',
      interpreter: 'none',
      windowsHide: true
    }]
};
