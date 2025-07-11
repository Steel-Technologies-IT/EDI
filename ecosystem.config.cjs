/**
 * PM2 ecosystem file
 *   pm2 start ecosystem.config.js           (first deploy)
 *   pm2 restart Invex Apps QA --update-env  (subsequent deploys)
 */
module.exports = {
    apps: [{
      name       : 'Invex Apps QA',
      script     : './backend/server.js',
      instances  : '1',            // change to 'max' for cluster mode
      exec_mode  : 'fork',
      watch      : true,
      max_memory_restart: '1G',
      autorestart: true,
      kill_timeout: 5000,
      treekill: false,
      log_date_format : 'YYYY-MM-DD HH:mm:ss',
      env: { NODE_ENV: 'QA',
          DB_USER: process.env.REACT_APP_DB_USER,
          DB_PASSWORD: process.env.REACT_APP_DB_PASSWORD,
          DB_HOST: process.env.REACT_APP_DB_HOST,
          DB_PORT: process.env.REACT_APP_DB_PORT,
          DB_NAME: process.env.REACT_APP_DB_NAME,
          REACT_APP_Server_Port: process.env.REACT_APP_Server_Port,
       } // runtime secrets injected later
    }]
};
  