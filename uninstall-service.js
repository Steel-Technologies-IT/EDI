const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'InvexAppsBackend',
  script: path.join(__dirname, 'backend', 'server.js')
});

// Listen for the "uninstall" event
svc.on('uninstall', function(){
  console.log('Service uninstalled successfully!');
  console.log('The service exists:', svc.exists);
});

svc.on('error', function(err){
  console.error('Uninstall error:', err);
});

// Uninstall the service
console.log('Uninstalling Windows service...');
svc.uninstall();
