// Test script for WeatherGPT Bottom Navigation 3D Flip & Route Verification
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(os.tmpdir(), 'weathergpt_nav_test_' + Date.now());

async function test() {
  console.log('--- Launching Chrome for BottomNav Verification ---');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const targets = await fetch('http://127.0.0.1:9222/json').then((r) => r.json());
  const target = targets.find((t) => t.type === 'page') || targets[0];

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
  console.log('WebSocket connection established.');

  await send('Page.enable');
  await send('Runtime.enable');

  const consoleErrors = [];
  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      consoleErrors.push(data.params.args);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(data.params.exceptionDetails);
    }
  });

  // 1. Navigate to login
  console.log('Navigating to /login...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/login' });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const urlAtLogin = await send('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });
  console.log('URL at login step:', urlAtLogin?.result?.value);

  // 2. Inject session into localStorage
  const mockSession = {
    token: 'wgt_test_session_nav',
    user: {
      id: 'usr_demo1',
      name: 'Prudhvi',
      email: 'demo@weathergpt.ai',
      role: 'Senior Meteorologist',
      location: 'New Delhi, India'
    },
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };

  console.log('Injecting session...');
  const setRes = await send('Runtime.evaluate', {
    expression: `(() => {
      localStorage.setItem('weathergpt_auth_session', JSON.stringify(${JSON.stringify(mockSession)}));
      return localStorage.getItem('weathergpt_auth_session');
    })()`,
    returnByValue: true
  });
  console.log('Stored in localStorage:', !!setRes?.result?.value);

  // 3. Navigate to /home
  console.log('Navigating to /home...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/home' });
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 4. Verify path and check bottom navigation presence
  const currentPath = await send('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });
  console.log('Current URL:', currentPath?.result?.value);

  // 5. Query all bottom navigation items
  const navItemsData = await send('Runtime.evaluate', {
    expression: `(() => {
      const items = Array.from(document.querySelectorAll('.bottom-nav-item'));
      return items.map(el => {
        const id = el.getAttribute('data-nav-id');
        const defaultText = el.querySelector('.bottom-nav-label-default')?.textContent?.trim() || '';
        const hoverText = el.querySelector('.bottom-nav-label')?.getAttribute('data-hover') || '';
        const isActive = el.classList.contains('is-active');
        const hasGlow = !!el.querySelector('.bottom-nav-active-glow');
        const iconExists = !!el.querySelector('.bottom-nav-icon');
        return { id, defaultText, hoverText, isActive, hasGlow, iconExists };
      });
    })()`,
    returnByValue: true
  });
  console.log('\n--- Bottom Navigation Items Audit ---');
  console.log(JSON.stringify(navItemsData?.result?.value, null, 2));

  // 6. Test 3D Flip CSS Rules on Desktop
  const cssAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const item = document.querySelector('.bottom-nav-item');
      const label = document.querySelector('.bottom-nav-label');
      const navBar = document.querySelector('.bottom-nav-bar');
      if (!item || !label || !navBar) return { error: 'Elements not found' };

      const itemStyle = window.getComputedStyle(item);
      const labelStyle = window.getComputedStyle(label);
      const navBarStyle = window.getComputedStyle(navBar);

      return {
        navBarBackground: navBarStyle.backgroundColor,
        navBarBackdropBlur: navBarStyle.backdropFilter || navBarStyle.webkitBackdropFilter,
        navBarBorder: navBarStyle.border,
        itemPerspective: itemStyle.perspective || itemStyle.webkitPerspective,
        labelTransformStyle: labelStyle.transformStyle || labelStyle.webkitTransformStyle,
        labelTransition: labelStyle.transition
      };
    })()`,
    returnByValue: true
  });
  console.log('\n--- CSS 3D Properties & Glassmorphism ---');
  console.log(JSON.stringify(cssAudit?.result?.value, null, 2));

  // 7. Test navigation through all 5 routes via button clicks
  const routes = [
    { id: 'map', path: '/map' },
    { id: 'alerts', path: '/alerts' },
    { id: 'farmergpt', path: '/farmergpt' },
    { id: 'profile', path: '/profile' },
    { id: 'home', path: '/home' }
  ];

  console.log('\n--- Route Click & Active Indicator Verification ---');
  for (const r of routes) {
    const clickEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.bottom-nav-item[data-nav-id="${r.id}"]');
        if (!btn) return false;
        btn.click();
        return true;
      })()`,
      returnByValue: true
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const active = document.querySelector('.bottom-nav-item.is-active');
        return {
          path: window.location.pathname,
          activeId: active?.getAttribute('data-nav-id'),
          hasActiveGlow: !!active?.querySelector('.bottom-nav-active-glow')
        };
      })()`,
      returnByValue: true
    });
    console.log(`Navigated to [${r.id}]: URL = ${check?.result?.value?.path}, Active Nav = ${check?.result?.value?.activeId}, Active Glow = ${check?.result?.value?.hasActiveGlow}`);
  }

  // 8. Test Mobile Viewport / Touch Behavior
  console.log('\n--- Mobile Viewport Verification ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 3,
    mobile: true
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const mobileNavCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const bar = document.querySelector('.bottom-nav-bar');
      const items = Array.from(document.querySelectorAll('.bottom-nav-item'));
      return {
        barWidth: bar?.offsetWidth,
        itemsCount: items.length,
        allVisible: items.every(i => i.offsetWidth > 0 && i.offsetHeight > 0)
      };
    })()`,
    returnByValue: true
  });
  console.log('Mobile navigation status (375x812):', mobileNavCheck?.result?.value);

  console.log('\nConsole Errors Total:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Errors:', consoleErrors);
  }

  chrome.kill();
  console.log('\n--- Verification Finished Successfully ---');
  process.exit(0);
}

test().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
