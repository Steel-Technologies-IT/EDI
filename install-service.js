// Try to load node-windows from backend or root
let Service;
try {
  Service = require('node-windows').Service;
} catch (err) {
  try {
    Service = require('./backend/node_modules/node-windows').Service;
  } catch (err2) {
    console.error('node-windows not found. Install it first:');
    console.error('  cd backend && npm install node-windows');
    process.exit(1);
  }
}

const path = require('path');

// Collect all environment variables from process.env that start with REACT_APP_
const envVars = [];
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith('REACT_APP_')) {
    envVars.push({ name: key, value: value });
  }
}

// Add PATH with Java
envVars.push({
  name: "PATH",
  value: process.env.PATH + ';C:\\Program Files\\Eclipse Adoptium\\jdk-11.0.21.9-hotspot\\bin'
});

console.log('Installing service with environment variables:', envVars.map(e => e.name).join(', '));

// Create a new service object
const svc = new Service({
  name: 'InvexAppsBackend',
  description: 'Invex Apps Backend EDI Service - Runs without user login',
  script: path.join(__dirname, 'backend', 'server.js'),
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  env: envVars,
  workingDirectory: __dirname,
  allowServiceLogon: true,
  execPath: process.execPath  // Use the current Node.js executable
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function(){
  console.log('Service installed successfully!');
  console.log('Starting service...');
  svc.start();
  
  // Exit after starting to prevent hanging
  setTimeout(() => {
    console.log('Install complete, exiting...');
    process.exit(0);
  }, 5000);
});

svc.on('start', function(){
  console.log('Service started successfully!');
  console.log('The service exists:', svc.exists);
  
  // Exit after confirmation
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

svc.on('alreadyinstalled', function(){
  console.log('Service is already installed.');
  console.log('Please uninstall first with: node uninstall-service.js');
  process.exit(0);
});

svc.on('error', function(err){
  console.error('Service error:', err);
  process.exit(1);
});

// Timeout fallback - exit after 45 seconds no matter what
setTimeout(() => {
  console.log('Installation timeout - exiting');
  process.exit(1);
}, 45000);

// Install the service
console.log('Installing Windows service...');
svc.install();
