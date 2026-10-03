// Test script to verify WeatherGPT shared location state, persistence, and Home <-> Map flow
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(os.tmpdir(), 'weathergpt_loc_flow_test_' + Date.now());

async function runTest() {
  console.log('--- Starting WeatherGPT Location Flow Test ---');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise((r) => setTimeout(r, 2000));

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

  await new Promise((r) => (ws.onopen = r));
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

  // Step 1: Login & inject auth session
  console.log('\n[1] Navigating to /login...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/login' });
  await new Promise((r) => setTimeout(r, 2000));

  const mockSession = {
    token: 'wgt_test_session_flow',
    user: {
      id: 'usr_demo1',
      name: 'Prudhvi',
      email: 'demo@weathergpt.ai',
      role: 'Senior Meteorologist',
      location: 'New Delhi, India'
    },
    expiresAt: Date.now() + 86400000
  };

  await send('Runtime.evaluate', {
    expression: `(() => {
      localStorage.setItem('weathergpt_auth_session', JSON.stringify(${JSON.stringify(mockSession)}));
      localStorage.removeItem('weatherSelectedLocation');
    })()`,
    returnByValue: true
  });

  // Step 2: Open Home with NO location selected yet
  console.log('\n[2] Testing Home with NO initial location...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/home' });
  await new Promise((r) => setTimeout(r, 3500));

  const emptyHomeCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const emptyText = document.querySelector('.dash-empty-box p')?.textContent || '';
      const currentLocBtn = !!document.querySelector('.dash-current-loc-btn');
      const searchInput = !!document.querySelector('.dash-search-input');
      return { emptyText, currentLocBtn, searchInput };
    })()`,
    returnByValue: true
  });
  console.log('Empty Home state:', emptyHomeCheck?.result?.value);

  // Step 3: Open Map with NO location selected
  console.log('\n[3] Testing Map with NO location selected...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/map' });
  await new Promise((r) => setTimeout(r, 2500));

  const emptyMapCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const panelText = document.querySelector('.map-compact-panel')?.textContent || '';
      return { panelText: panelText.trim() };
    })()`,
    returnByValue: true
  });
  console.log('Empty Map state:', emptyMapCheck?.result?.value);

  // Step 4: Go back to Home, search "Hyderabad" and select it
  console.log('\n[4] Navigating to Home and searching "Hyderabad"...');
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/home' });
  await new Promise((r) => setTimeout(r, 2500));

  // Perform search simulation using React's value tracker
  await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('.dash-search-input');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, 'Hyderabad');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      }
    })()`
  });

  // Wait for geocode results from Open-Meteo
  await new Promise((r) => setTimeout(r, 2000));

  // Click the first dropdown result
  const selectHyd = await send('Runtime.evaluate', {
    expression: `(() => {
      const firstItem = document.querySelector('.dash-search-item');
      if (firstItem) {
        const text = firstItem.textContent;
        firstItem.click();
        return { clicked: true, itemText: text };
      }
      return { clicked: false, allItems: document.querySelectorAll('.dash-search-item').length };
    })()`,
    returnByValue: true
  });
  console.log('Selected Hyderabad from dropdown:', selectHyd?.result?.value);

  // Wait for weather fetch
  await new Promise((r) => setTimeout(r, 3000));

  // Verify weather loaded on Home & check persisted localStorage
  const hydHomeCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const locTitle = document.querySelector('.weather-location-title')?.textContent || '';
      const tempNumber = document.querySelector('.weather-temp-number')?.textContent || '';
      const stored = localStorage.getItem('weatherSelectedLocation');
      return { locTitle, tempNumber, stored: JSON.parse(stored || 'null') };
    })()`,
    returnByValue: true
  });
  console.log('Hyderabad on Home:', hydHomeCheck?.result?.value);

  // Step 5: Click Map in bottom nav - should automatically open with Hyderabad
  console.log('\n[5] Clicking Map in bottom navigation (Home -> Map auto-flow)...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.bottom-nav-item[data-nav-id="map"]')?.click();`
  });
  await new Promise((r) => setTimeout(r, 3000));

  const hydMapCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const path = window.location.pathname;
      const heading = document.querySelector('.map-compact-panel h3')?.textContent || '';
      const temp = document.querySelector('.map-compact-temp')?.textContent || '';
      const pin = !!document.querySelector('.map-selected-pin');
      return { path, heading, temp, pin };
    })()`,
    returnByValue: true
  });
  console.log('Map Auto-Location result:', hydMapCheck?.result?.value);

  // Step 6: Traverse routes: Map -> Alerts -> FarmerGPT -> Profile -> Home
  console.log('\n[6] Navigating through all routes: Map -> Alerts -> FarmerGPT -> Profile -> Home...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.bottom-nav-item[data-nav-id="alerts"]')?.click();`
  });
  await new Promise((r) => setTimeout(r, 1500));

  await send('Runtime.evaluate', {
    expression: `document.querySelector('.bottom-nav-item[data-nav-id="farmergpt"]')?.click();`
  });
  await new Promise((r) => setTimeout(r, 1500));

  await send('Runtime.evaluate', {
    expression: `document.querySelector('.bottom-nav-item[data-nav-id="profile"]')?.click();`
  });
  await new Promise((r) => setTimeout(r, 1500));

  await send('Runtime.evaluate', {
    expression: `document.querySelector('.bottom-nav-item[data-nav-id="home"]')?.click();`
  });
  await new Promise((r) => setTimeout(r, 3000));

  const returnHomeCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const path = window.location.pathname;
      const locTitle = document.querySelector('.weather-location-title')?.textContent || '';
      const temp = document.querySelector('.weather-temp-number')?.textContent || '';
      return { path, locTitle, temp };
    })()`,
    returnByValue: true
  });
  console.log('Returned to Home (Hyderabad must persist):', returnHomeCheck?.result?.value);

  // Step 7: Page refresh test
  console.log('\n[7] Testing Page Refresh on /home...');
  await send('Page.reload');
  await new Promise((r) => setTimeout(r, 3500));

  const refreshCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const locTitle = document.querySelector('.weather-location-title')?.textContent || '';
      const temp = document.querySelector('.weather-temp-number')?.textContent || '';
      return { locTitle, temp };
    })()`,
    returnByValue: true
  });
  console.log('After Page Reload (Hyderabad must persist):', refreshCheck?.result?.value);

  // Step 8: Search "Mumbai" on Map and return to Home
  console.log('\n[8] Navigating to Map and searching "Mumbai"...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.bottom-nav-item[data-nav-id="map"]')?.click();`
  });
  await new Promise((r) => setTimeout(r, 2500));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('.dash-search-input');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, 'Mumbai');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      }
    })()`
  });
  await new Promise((r) => setTimeout(r, 2000));

  const selectMumbai = await send('Runtime.evaluate', {
    expression: `(() => {
      const item = document.querySelector('.dash-search-item');
      if (item) {
        const text = item.textContent;
        item.click();
        return { clicked: true, text };
      }
      return { clicked: false };
    })()`,
    returnByValue: true
  });
        item.click();
        return { clicked: true, text: item.textContent };
      }
      return { clicked: false };
    })()`,
    returnByValue: true
  });
  console.log('Selected Mumbai on Map:', selectMumbai?.result?.value);

  await new Promise((r) => setTimeout(r, 3000));

  // Navigate back to Home and verify Mumbai is now selected
  console.log('Returning to Home from Map...');
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.bottom-nav-item[data-nav-id="home"]')?.click();`
  });
  await new Promise((r) => setTimeout(r, 3000));

  const mumbaiHomeCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const locTitle = document.querySelector('.weather-location-title')?.textContent || '';
      const temp = document.querySelector('.weather-temp-number')?.textContent || '';
      const stored = localStorage.getItem('weatherSelectedLocation');
      return { locTitle, temp, stored: JSON.parse(stored || 'null') };
    })()`,
    returnByValue: true
  });
  console.log('Home location after Map search (Mumbai expected):', mumbaiHomeCheck?.result?.value);

  console.log('\nConsole Errors Total:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  }

  chrome.kill();
  console.log('\n--- Location Flow Tests Completed! ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
