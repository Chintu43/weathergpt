import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import userRouter from '../src/routes/user.js';
import adminRouter from '../src/routes/admin.js';

const app = express();
app.use(express.json());
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);

const PORT = 5088;

/**
 * Test Suite for Admin Authentication & Access Control
 * Usage:
 *   node scripts/testAdminAuth.js "<currentOrNewPassword>" "<oldPassword>"
 */
async function runTests() {
  const newPassword = process.argv[2];
  const oldPassword = process.argv[3] || 'INVALID_OLD_PASSWORD_TEST';

  if (!newPassword) {
    console.error('Usage: node scripts/testAdminAuth.js "<newPassword>" ["<oldPassword>"]');
    process.exit(1);
  }

  const server = app.listen(PORT, async () => {
    const BASE_URL = `http://localhost:${PORT}`;
    console.log('====================================================');
    console.log(' RUNNING WEATHERGPT ADMIN AUTH TEST SUITE');
    console.log('====================================================\n');

    let passed = 0;
    let total = 0;

    function assert(cond, name) {
      total++;
      if (cond) {
        console.log(`[PASS] ${name}`);
        passed++;
      } else {
        console.error(`[FAIL] ${name}`);
      }
    }

    try {
      // TEST 1: Admin login with new password
      console.log('--- TEST 1: Admin Login with New Password ---');
      const res1 = await fetch(`${BASE_URL}/api/user/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'prudhviisa4@gmail.com', password: newPassword })
      });
      const data1 = await res1.json();
      console.log('Status:', res1.status, '| Success:', data1.success, '| Role:', data1.user?.role);
      assert(res1.status === 200 && data1.success === true && data1.user?.role === 'admin', 'Test 1: Admin authenticates successfully with new password');

      // TEST 2: Admin login with old/wrong password
      console.log('\n--- TEST 2: Admin Login with Old / Wrong Password ---');
      const res2 = await fetch(`${BASE_URL}/api/user/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'prudhviisa4@gmail.com', password: oldPassword })
      });
      const data2 = await res2.json();
      console.log('Status:', res2.status, '| Error:', data2.error);
      assert(res2.status === 401 && data2.success === false, 'Test 2: Old / incorrect password is rejected with 401');

      // TEST 3: Non-admin user attempted admin login
      console.log('\n--- TEST 3: Non-Admin User Attempting Admin Login ---');
      const res3 = await fetch(`${BASE_URL}/api/user/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'pruraj@gmail.com', password: 'any_password' })
      });
      const data3 = await res3.json();
      console.log('Status:', res3.status, '| Error:', data3.error);
      assert(res3.status === 403 && data3.error === 'ADMIN_ACCESS_REQUIRED', 'Test 3: Non-admin account rejected with 403 ADMIN_ACCESS_REQUIRED');

      // TEST 4: Non-admin trying to access protected admin endpoint
      console.log('\n--- TEST 4: Non-Admin Accessing Protected Admin Route (/api/admin/users) ---');
      const res4 = await fetch(`${BASE_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          'x-user-email': 'pruraj@gmail.com',
          'x-user-role': 'admin' // Attempting to spoof role header
        }
      });
      const data4 = await res4.json();
      console.log('Status:', res4.status, '| Error:', data4.error);
      assert(res4.status === 403 && data4.error === 'UNAUTHORIZED', 'Test 4: Protected admin route rejects non-admin even if header spoofed');

      // TEST 5: Legitimate admin accessing protected admin endpoint
      console.log('\n--- TEST 5: Verified Admin Accessing Protected Admin Route (/api/admin/users) ---');
      const res5 = await fetch(`${BASE_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          'x-user-email': 'prudhviisa4@gmail.com',
          'x-user-role': 'admin'
        }
      });
      const data5 = await res5.json();
      console.log('Status:', res5.status, '| Users Count:', data5.users?.length);
      assert(res5.status === 200 && data5.success === true && Array.isArray(data5.users), 'Test 5: Verified admin accesses protected admin route successfully');

    } catch (err) {
      console.error('Test execution error:', err);
    } finally {
      server.close();
      console.log('\n====================================================');
      console.log(` SUMMARY: ${passed}/${total} TESTS PASSED`);
      console.log('====================================================\n');
      process.exit(passed === total ? 0 : 1);
    }
  });
}

runTests();
