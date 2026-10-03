// Test script using Chrome Remote Debugging Protocol to test authenticated flows
import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(os.tmpdir(), 'weathergpt_chrome_test_' + Date.now());

async function run() {
  console.log('Launching headless Chrome with remote debugging...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    'about:blank'
  ]);

  // Wait for Chrome to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Get list of targets and pick the 'page' target
  const targets = await fetch('http://127.0.0.1:9222/json').then((r) => r.json());
  console.log('Targets count:', targets.length);
  const target = targets.find((t) => t.type === 'page') || targets[0];
  console.log('Selected target:', target.title, target.url, target.type);
  if (!target || !target.webSocketDebuggerUrl) {
    console.error('No target found');
    chrome.kill();
    return;
  }

  // Connect via WebSocket
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await new Promise((resolve) => (ws.onopen = resolve));
  console.log('WebSocket connected');

  await send('Page.enable');
  await send('Runtime.enable');

  // Navigate to login page first
  console.log('Navigating to /login...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/login' });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Inject authentication session into localStorage
  console.log('Injecting session into localStorage...');
  const mockSession = {
    token: 'wgt_test_session_123',
    user: {
      id: 'usr_demo1',
      name: 'Weather Analyst',
      email: 'demo@weathergpt.ai',
      role: 'Senior Meteorologist',
      location: 'New Delhi, India'
    },
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };

  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('weathergpt_auth_session', JSON.stringify(${JSON.stringify(mockSession)}));`
  });

  // Navigate to /home
  console.log('Navigating to /home...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/home' });
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Capture screenshot of Home
  const shotHome = await send('Page.captureScreenshot', { format: 'png' });
  if (shotHome?.data) {
    fs.writeFileSync('home_shot.png', Buffer.from(shotHome.data, 'base64'));
    console.log('Saved home_shot.png successfully!');
  }

  // Capture Home DOM
  const evalHome = await send('Runtime.evaluate', {
    expression: 'document.querySelector("#root").innerHTML'
  });
  fs.writeFileSync('home_rendered_dom.txt', evalHome?.result?.value || '');
  console.log('Saved home_rendered_dom.txt successfully!');

  // Navigate to /map
  console.log('Navigating to /map...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/map' });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const shotMap = await send('Page.captureScreenshot', { format: 'png' });
  if (shotMap?.data) {
    fs.writeFileSync('map_shot.png', Buffer.from(shotMap.data, 'base64'));
    console.log('Saved map_shot.png successfully!');
  }

  // Navigate to /alerts
  console.log('Navigating to /alerts...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/alerts' });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const shotAlerts = await send('Page.captureScreenshot', { format: 'png' });
  if (shotAlerts?.data) {
    fs.writeFileSync('alerts_shot.png', Buffer.from(shotAlerts.data, 'base64'));
    console.log('Saved alerts_shot.png successfully!');
  }

  // Navigate to /ai
  console.log('Navigating to /ai...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/ai' });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const shotAi = await send('Page.captureScreenshot', { format: 'png' });
  if (shotAi?.data) {
    fs.writeFileSync('ai_shot.png', Buffer.from(shotAi.data, 'base64'));
    console.log('Saved ai_shot.png successfully!');
  }

  // Navigate to /profile
  console.log('Navigating to /profile...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/profile' });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const shotProfile = await send('Page.captureScreenshot', { format: 'png' });
  if (shotProfile?.data) {
    fs.writeFileSync('profile_shot.png', Buffer.from(shotProfile.data, 'base64'));
    console.log('Saved profile_shot.png successfully!');
  }

  ws.close();
  chrome.kill();
  console.log('All tests completed successfully!');
}

run().catch(console.error);
