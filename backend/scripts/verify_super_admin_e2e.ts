import { env } from '../src/config/env';

const BASE_URL = 'http://localhost:4000/api/v1';

async function main() {
  console.log('Testing Super Admin & Sub-Super Admin Auth End-to-End against real server...');

  const timestamp = Date.now();
  const testSuperAdmin = {
    firstName: 'Super',
    lastName: 'Commander',
    email: `master_${timestamp}@fioner.com`,
    phone: '+919876543210',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    securityKey: env.SUPER_ADMIN_SECURITY_KEY || 'FIONER@SUPERADMIN#2026',
  };

  // 1. Test wrong security key
  console.log('\n1. Testing wrong security key...');
  const resBadKey = await fetch(`${BASE_URL}/auth/admin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...testSuperAdmin, securityKey: 'INVALID_PASSCODE' }),
  });
  console.log('Status:', resBadKey.status);
  const dataBadKey = await resBadKey.json();
  console.log('Response:', dataBadKey);
  if (resBadKey.status !== 403) throw new Error('Expected 403 for wrong security key');

  // 2. Test successful Super Admin registration
  console.log('\n2. Testing valid Super Admin registration...');
  const resRegister = await fetch(`${BASE_URL}/auth/admin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testSuperAdmin),
  });
  console.log('Status:', resRegister.status);
  const dataRegister = await resRegister.json();
  console.log('Response:', dataRegister);
  if (resRegister.status !== 201 || !dataRegister.success) {
    throw new Error('Expected 201 for valid registration');
  }

  // 3. Test Super Admin Login
  console.log('\n3. Testing Super Admin login...');
  const resLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testSuperAdmin.email,
      password: testSuperAdmin.password,
    }),
  });
  console.log('Status:', resLogin.status);
  const dataLogin = await resLogin.json();
  console.log('User:', dataLogin.data?.user);
  if (resLogin.status !== 200 || !dataLogin.data?.user?.isSuperAdmin) {
    throw new Error('Expected 200 and isSuperAdmin=true');
  }

  const superAdminToken = dataLogin.data.tokens.accessToken;

  // 4. Test Sub-Super Admin creation by Super Admin
  console.log('\n4. Testing Sub-Super Admin creation...');
  const testSubAdmin = {
    firstName: 'Regional',
    lastName: 'Admin',
    email: `subadmin_${timestamp}@fioner.com`,
    phone: '+919876543211',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    roleTitle: 'Regional Fleet Officer',
    permissions: ['vehicles', 'gps', 'orders'],
  };

  const resSubAdmin = await fetch(`${BASE_URL}/admin/sub-admins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify(testSubAdmin),
  });
  console.log('Status:', resSubAdmin.status);
  const dataSubAdmin = await resSubAdmin.json();
  console.log('Sub-Admin created:', dataSubAdmin);
  if (resSubAdmin.status !== 201 || !dataSubAdmin.success) {
    throw new Error('Expected 201 for Sub-Admin creation');
  }

  // 5. Test Listing Sub-Super Admins
  console.log('\n5. Testing listing Sub-Super Admins...');
  const resList = await fetch(`${BASE_URL}/admin/sub-admins`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log('Status:', resList.status);
  const dataList = await resList.json();
  console.log('List count:', dataList.data?.length);
  if (resList.status !== 200 || !Array.isArray(dataList.data)) {
    throw new Error('Expected 200 and array of sub-admins');
  }

  // 6. Test Sub-Super Admin Login
  console.log('\n6. Testing Sub-Super Admin login...');
  const resSubLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testSubAdmin.email,
      password: testSubAdmin.password,
    }),
  });
  console.log('Status:', resSubLogin.status);
  const dataSubLogin = await resSubLogin.json();
  console.log('Sub-Admin User:', dataSubLogin.data?.user);
  if (resSubLogin.status !== 200 || !dataSubLogin.data?.user?.isSubSuperAdmin) {
    throw new Error('Expected 200 and isSubSuperAdmin=true');
  }

  // 7. Verify Sub-Super Admin CANNOT create other sub-super admins (Super Admin only)
  console.log('\n7. Verifying Sub-Super Admin is forbidden from creating sub-admins...');
  const subAdminToken = dataSubLogin.data.tokens.accessToken;
  const resForbidden = await fetch(`${BASE_URL}/admin/sub-admins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${subAdminToken}`,
    },
    body: JSON.stringify({
      firstName: 'Forbidden',
      lastName: 'Sub',
      email: `fail_${timestamp}@fioner.com`,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    }),
  });
  console.log('Status:', resForbidden.status);
  if (resForbidden.status !== 403) {
    throw new Error('Expected 403 Forbidden for Sub-Super Admin attempting to add sub-admins');
  }

  console.log('\n🎉 ALL REAL BACKEND AND DATABASE TESTS PASSED WITH 100% SUCCESS!');
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
