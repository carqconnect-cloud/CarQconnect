const http = require('http');

const BASE_URL = 'http://127.0.0.1:4000/api/v1';

async function request(path, options = {}) {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
  const headers = {
    'Accept': 'application/json',
    'x-bypass-rate-limit': 'test-runner',
    ...(options.headers || {}),
  };

  let body = options.body;
  if (body && typeof body === 'object') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('       STRICT 4-TABLE CREDENTIAL & PORTAL ISOLATION TESTS       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      if (details) console.error('         Details:', details);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST SUITE 1: Mobile App User (akshitnannaware@gmail.com / users table)
  // ---------------------------------------------------------------------------
  console.log('--- TEST SUITE 1: Mobile App User (users table) ---');
  let appToken = '';

  // 1.1 Valid App Login
  const appLoginRes = await request('/auth/app/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'app' },
    body: { email: 'akshitnannaware@gmail.com', password: 'Akshit@123', portal: 'app' },
  });
  assert(
    appLoginRes.status === 200 && appLoginRes.body?.data?.tokens?.accessToken,
    'App user logs in successfully via App portal (/auth/app/login)',
    appLoginRes.body
  );
  appToken = appLoginRes.body?.data?.tokens?.accessToken || '';

  // 1.2 Access App protected route (/vehicles)
  const appVehiclesRes = await request('/vehicles', {
    headers: { Authorization: `Bearer ${appToken}` },
  });
  assert(
    appVehiclesRes.status === 200,
    'App user can access App protected route (/vehicles)',
    appVehiclesRes.status
  );

  // 1.3 App user attempting Super-Admin login -> MUST BE 403
  const appToAdminLogin = await request('/auth/admin/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'super-admin' },
    body: { email: 'akshitnannaware@gmail.com', password: 'Akshit@123', portal: 'super-admin' },
  });
  assert(
    appToAdminLogin.status === 403 &&
      JSON.stringify(appToAdminLogin.body).includes('Mobile App credentials cannot be used to login to Super Admin'),
    'App user CANNOT login to Super Admin portal (Strict 403 Forbidden with exact reason)',
    appToAdminLogin.body
  );

  // 1.4 App user attempting CRM login -> MUST BE 403
  const appToCrmLogin = await request('/auth/crm/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'crm' },
    body: { email: 'akshitnannaware@gmail.com', password: 'Akshit@123', portal: 'crm' },
  });
  assert(
    appToCrmLogin.status === 403 &&
      JSON.stringify(appToCrmLogin.body).includes('Mobile App credentials cannot be used to login to CRM'),
    'App user CANNOT login to CRM portal (Strict 403 Forbidden with exact reason)',
    appToCrmLogin.body
  );

  // 1.5 App user token attempting Super-Admin route -> MUST BE 403
  const appToAdminRoute = await request('/admin/dashboard', {
    headers: { Authorization: `Bearer ${appToken}` },
  });
  assert(
    appToAdminRoute.status === 403,
    'App user token CANNOT access Super Admin routes (Strict 403 Forbidden)',
    appToAdminRoute.status
  );

  // 1.6 App user token attempting CRM route -> MUST BE 403
  const appToCrmRoute = await request('/crm/leads', {
    headers: { Authorization: `Bearer ${appToken}` },
  });
  assert(
    appToCrmRoute.status === 403,
    'App user token CANNOT access CRM routes (Strict 403 Forbidden)',
    appToCrmRoute.status
  );

  console.log();

  // ---------------------------------------------------------------------------
  // TEST SUITE 2: Super Admin (admin@connect.com / super_admins table)
  // ---------------------------------------------------------------------------
  console.log('--- TEST SUITE 2: Super Admin (super_admins table) ---');
  let adminToken = '';

  // 2.1 Valid Super Admin Login
  const adminLoginRes = await request('/auth/admin/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'super-admin' },
    body: { email: 'admin@connect.com', password: 'Password123', portal: 'super-admin' },
  });
  assert(
    adminLoginRes.status === 200 && adminLoginRes.body?.data?.tokens?.accessToken,
    'Super Admin logs in successfully via Super Admin portal (/auth/admin/login)',
    adminLoginRes.body
  );
  adminToken = adminLoginRes.body?.data?.tokens?.accessToken || '';

  // 2.2 Access Super Admin route (/admin/dashboard)
  const adminRouteRes = await request('/admin/dashboard', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    adminRouteRes.status === 200,
    'Super Admin can access Super Admin protected route (/admin/dashboard)',
    adminRouteRes.status
  );

  // 2.3 Super Admin attempting App login -> MUST BE 403
  const adminToAppLogin = await request('/auth/app/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'app' },
    body: { email: 'admin@connect.com', password: 'Password123', portal: 'app' },
  });
  assert(
    adminToAppLogin.status === 403 &&
      JSON.stringify(adminToAppLogin.body).includes('Super Admin credentials cannot be used to login to Mobile App'),
    'Super Admin CANNOT login to Mobile App portal (Strict 403 Forbidden with exact reason)',
    adminToAppLogin.body
  );

  // 2.4 Super Admin attempting CRM login -> MUST BE 403
  const adminToCrmLogin = await request('/auth/crm/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'crm' },
    body: { email: 'admin@connect.com', password: 'Password123', portal: 'crm' },
  });
  assert(
    adminToCrmLogin.status === 403 &&
      JSON.stringify(adminToCrmLogin.body).includes('Super Admin credentials cannot be used to login to CRM'),
    'Super Admin CANNOT login to CRM portal (Strict 403 Forbidden with exact reason)',
    adminToCrmLogin.body
  );

  // 2.5 Super Admin token attempting App route -> MUST BE 403
  const adminToAppRoute = await request('/vehicles', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    adminToAppRoute.status === 403,
    'Super Admin token CANNOT access Mobile App routes (Strict 403 Forbidden)',
    adminToAppRoute.status
  );

  // 2.6 Super Admin token attempting CRM route -> MUST BE 403
  const adminToCrmRoute = await request('/crm/leads', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    adminToCrmRoute.status === 403,
    'Super Admin token CANNOT access CRM routes (Strict 403 Forbidden)',
    adminToCrmRoute.status
  );

  console.log();

  // ---------------------------------------------------------------------------
  // TEST SUITE 3: CRM User (admin@fioner.test / crm_users table)
  // ---------------------------------------------------------------------------
  console.log('--- TEST SUITE 3: CRM User (crm_users table) ---');
  let crmToken = '';

  // 3.1 Valid CRM Login
  const crmLoginRes = await request('/auth/crm/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'crm' },
    body: { email: 'admin@fioner.test', password: 'Password123', portal: 'crm' },
  });
  assert(
    crmLoginRes.status === 200 && crmLoginRes.body?.data?.tokens?.accessToken,
    'CRM user logs in successfully via CRM portal (/auth/crm/login)',
    crmLoginRes.body
  );
  crmToken = crmLoginRes.body?.data?.tokens?.accessToken || '';

  // 3.2 Access CRM route (/crm/leads)
  const crmRouteRes = await request('/crm/leads', {
    headers: { Authorization: `Bearer ${crmToken}` },
  });
  assert(
    crmRouteRes.status === 200,
    'CRM user can access CRM protected route (/crm/leads)',
    crmRouteRes.status
  );

  // 3.3 CRM user attempting Super Admin login -> MUST BE 403
  const crmToAdminLogin = await request('/auth/admin/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'super-admin' },
    body: { email: 'admin@fioner.test', password: 'Password123', portal: 'super-admin' },
  });
  assert(
    crmToAdminLogin.status === 403 &&
      JSON.stringify(crmToAdminLogin.body).includes('CRM user credentials cannot be used to login to Super Admin'),
    'CRM user CANNOT login to Super Admin portal (Strict 403 Forbidden with exact reason)',
    crmToAdminLogin.body
  );

  // 3.4 CRM user attempting Mobile App login -> MUST BE 403
  const crmToAppLogin = await request('/auth/app/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'app' },
    body: { email: 'admin@fioner.test', password: 'Password123', portal: 'app' },
  });
  assert(
    crmToAppLogin.status === 403 &&
      JSON.stringify(crmToAppLogin.body).includes('CRM user credentials cannot be used to login to Mobile App'),
    'CRM user CANNOT login to Mobile App portal (Strict 403 Forbidden with exact reason)',
    crmToAppLogin.body
  );

  // 3.5 CRM token attempting App route -> MUST BE 403
  const crmToAppRoute = await request('/vehicles', {
    headers: { Authorization: `Bearer ${crmToken}` },
  });
  assert(
    crmToAppRoute.status === 403,
    'CRM user token CANNOT access Mobile App routes (Strict 403 Forbidden)',
    crmToAppRoute.status
  );

  // 3.6 CRM token attempting Super Admin route -> MUST BE 403
  const crmToAdminRoute = await request('/admin/dashboard', {
    headers: { Authorization: `Bearer ${crmToken}` },
  });
  assert(
    crmToAdminRoute.status === 403,
    'CRM user token CANNOT access Super Admin routes (Strict 403 Forbidden)',
    crmToAdminRoute.status
  );

  console.log();

  // ---------------------------------------------------------------------------
  // TEST SUITE 4: Sub-Super Admin (sub_super_admins table)
  // ---------------------------------------------------------------------------
  console.log('--- TEST SUITE 4: Sub-Super Admin (sub_super_admins table) ---');
  let subAdminToken = '';

  // 4.1 Valid Sub-Super Admin Login
  const subAdminLoginRes = await request('/auth/admin/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'super-admin' },
    body: { email: 'subadmin_1792740646097@fioner.com', password: 'Password@123', portal: 'super-admin' },
  });
  assert(
    subAdminLoginRes.status === 200 && subAdminLoginRes.body?.data?.tokens?.accessToken,
    'Sub-Super Admin logs in successfully via Super Admin portal (/auth/admin/login)',
    subAdminLoginRes.body
  );
  subAdminToken = subAdminLoginRes.body?.data?.tokens?.accessToken || '';

  // 4.2 Access Super Admin route (/admin/dashboard)
  const subAdminRouteRes = await request('/admin/dashboard', {
    headers: { Authorization: `Bearer ${subAdminToken}` },
  });
  assert(
    subAdminRouteRes.status === 200,
    'Sub-Super Admin can access Super Admin protected route (/admin/dashboard)',
    subAdminRouteRes.status
  );

  // 4.3 Sub-Super Admin attempting Mobile App login -> MUST BE 403
  const subAdminToAppLogin = await request('/auth/app/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'app' },
    body: { email: 'subadmin_1792740646097@fioner.com', password: 'Password@123', portal: 'app' },
  });
  assert(
    subAdminToAppLogin.status === 403 &&
      JSON.stringify(subAdminToAppLogin.body).includes('Super Admin credentials cannot be used to login to Mobile App'),
    'Sub-Super Admin CANNOT login to Mobile App portal (Strict 403 Forbidden with exact reason)',
    subAdminToAppLogin.body
  );

  // 4.4 Sub-Super Admin attempting CRM login -> MUST BE 403
  const subAdminToCrmLogin = await request('/auth/crm/login', {
    method: 'POST',
    headers: { 'X-Portal-Type': 'crm' },
    body: { email: 'subadmin_1792740646097@fioner.com', password: 'Password@123', portal: 'crm' },
  });
  assert(
    subAdminToCrmLogin.status === 403 &&
      JSON.stringify(subAdminToCrmLogin.body).includes('Super Admin credentials cannot be used to login to CRM'),
    'Sub-Super Admin CANNOT login to CRM portal (Strict 403 Forbidden with exact reason)',
    subAdminToCrmLogin.body
  );

  // 4.5 Sub-Super Admin token attempting Mobile App route -> MUST BE 403
  const subAdminToAppRoute = await request('/vehicles', {
    headers: { Authorization: `Bearer ${subAdminToken}` },
  });
  assert(
    subAdminToAppRoute.status === 403,
    'Sub-Super Admin token CANNOT access Mobile App routes (Strict 403 Forbidden)',
    subAdminToAppRoute.status
  );

  // 4.6 Sub-Super Admin token attempting CRM route -> MUST BE 403
  const subAdminToCrmRoute = await request('/crm/leads', {
    headers: { Authorization: `Bearer ${subAdminToken}` },
  });
  assert(
    subAdminToCrmRoute.status === 403,
    'Sub-Super Admin token CANNOT access CRM routes (Strict 403 Forbidden)',
    subAdminToCrmRoute.status
  );

  console.log('\n================================================================');
  console.log(`                TEST SUMMARY: ${passed} PASSED, ${failed} FAILED                `);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
