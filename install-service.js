const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'InvexAppsBackend',
  description: 'Invex Apps Backend EDI Service',
  script: path.join(__dirname, 'backend', 'server.js'),
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: process.env.REACT_APP_NODE_ENV || "production"
    },
    {
      name: "PATH",
      value: process.env.PATH + ';C:\\Program Files\\Eclipse Adoptium\\jdk-11.0.21.9-hotspot\\bin'
    }
  ],
  workingDirectory: __dirname,
  allowServiceLogon: true
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function(){
  console.log('Service installed successfully!');
  svc.start();
});

svc.on('start', function(){
  console.log('Service started successfully!');
  console.log('The service exists:', svc.exists);
});

svc.on('alreadyinstalled', function(){
  console.log('Service is already installed. Restarting...');
  svc.restart();
});

svc.on('error', function(err){
  console.error('Service error:', err);
});

// Install the service
svc.install();
