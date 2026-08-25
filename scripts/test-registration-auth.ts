import { dbManager } from '../src/server/db';

async function runTests() {
  console.log('=== STARTING MANDATORY REGISTRATION & AUTH TESTING ===\n');

  const testEmail = `test.user.${Date.now()}@domain.com`;
  const testPassword = 'Password123!Secure';
  const testFullName = 'Elena Rostova';
  const testPhone = '+1 (415) 890-4321';
  const testPin = '7890';

  console.log(`1. Testing Registration for new user: ${testFullName} <${testEmail}>...`);
  
  // Step 1: Register New Account
  const regResult = await dbManager.createUserAsync({
    fullName: testFullName,
    email: testEmail,
    phone: testPhone,
    password: testPassword,
    accountPin: testPin
  });

  if (!regResult || !regResult.user) {
    throw new Error('Registration failed: No user object returned');
  }

  const user = regResult.user;
  console.log('   ✓ User registered successfully!');
  console.log(`   - User ID: ${user.id}`);
  console.log(`   - Assigned Account Number: ${user.accountNumber}`);
  console.log(`   - Verification Tier: ${user.verificationTier}`);
  console.log(`   - Primary Balance: $${user.balance.toFixed(2)}`);
  console.log(`   - Associated Sub-Accounts: ${user.accounts?.length || 0}`);

  if (!user.accountNumber || !user.accountNumber.startsWith('10')) {
    throw new Error(`Invalid account number generated: ${user.accountNumber}`);
  }

  // Step 2: Verify Database Storage
  console.log('\n2. Verifying User Persistence in Database...');
  const userFromDbByEmail = dbManager.findUserByExactEmail(testEmail);
  if (!userFromDbByEmail) {
    throw new Error(`Database verification failed: User not found by exact email ${testEmail}`);
  }

  const userFromDbByAccount = dbManager.findUserByAccountNumber(user.accountNumber);
  if (!userFromDbByAccount) {
    throw new Error(`Database verification failed: User not found by account number ${user.accountNumber}`);
  }

  console.log('   ✓ User confirmed stored in database by both email and account number.');

  // Step 3: Test Login Authentication
  console.log('\n3. Testing Login for newly registered account...');
  const authResult = await dbManager.loginUserAsync(testEmail, testPassword);
  if (!authResult || !authResult.user) {
    throw new Error('Login failed for newly registered user!');
  }
  console.log(`   ✓ Login successful for ${authResult.user.fullName}`);
  console.log(`   - Token issued: ${authResult.token}`);
  console.log(`   - Authenticated Role: ${authResult.user.role}`);

  // Step 3b: Test Login by Account Number
  console.log('\n3b. Testing Login using Account Number instead of Email...');
  const authByAcc = await dbManager.loginUserAsync(user.accountNumber, testPassword);
  if (!authByAcc || !authByAcc.user) {
    throw new Error('Login by account number failed!');
  }
  console.log(`   ✓ Login by account number successful: ${authByAcc.user.accountNumber}`);

  // Step 4: Test Admin User Search by Email & Account Number
  console.log('\n4. Testing Admin Search Functionality...');
  
  // 4a. Search by Email
  const searchByEmail = await dbManager.searchUsersAsync(testEmail);
  const foundByEmail = searchByEmail.some(u => u.email.toLowerCase() === testEmail.toLowerCase());
  if (!foundByEmail) {
    throw new Error(`Admin search by email failed to find ${testEmail}`);
  }
  console.log(`   ✓ Admin search by email found ${testEmail}`);

  // 4b. Search by Account Number
  const searchByAcc = await dbManager.searchUsersAsync(user.accountNumber);
  const foundByAcc = searchByAcc.some(u => u.accountNumber === user.accountNumber);
  if (!foundByAcc) {
    throw new Error(`Admin search by account number failed to find ${user.accountNumber}`);
  }
  console.log(`   ✓ Admin search by account number found ${user.accountNumber}`);

  console.log('\n=== ALL MANDATORY TESTS PASSED SUCCESSFULLY! ===\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
