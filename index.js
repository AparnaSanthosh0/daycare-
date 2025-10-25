// Root entry point for Render deployment
// This file redirects to the actual server

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting TinyTots server...');
console.log('📁 Current directory:', process.cwd());
console.log('📁 Server directory:', path.join(__dirname, 'server'));

// Change to server directory and start the server
process.chdir(path.join(__dirname, 'server'));

// Start the server using the server's package.json
const serverProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, 'server')
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});
