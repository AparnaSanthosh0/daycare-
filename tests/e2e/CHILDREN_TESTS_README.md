# Child Enrollment and Record Management Tests

## Overview
This test suite covers the Child Enrollment and Record Management module with 8 focused tests.

## Test File
- **File**: `tests/e2e/children-focused.spec.ts`
- **Total Tests**: 8

## Test Coverage

### 1. Parent Registration with Child Information
- Tests parent registration with child details
- Validates form submission
- Checks for success message or redirect

### 2. Admin View Pending Admissions
- Tests admin's ability to view pending admission requests
- Checks admissions tab visibility
- Validates admissions section display

### 3. Admin View Admission Request Details
- Tests viewing individual admission request details
- Checks for child and parent information display

### 4. Admin Create Child Profile
- Tests creating child profile from admin dashboard
- Validates create child dialog opens
- Checks form fields are accessible

### 5. Admin View Children Count
- Tests display of children count in dashboard
- Validates statistics display

### 6. Admin Assign Staff to Child
- Tests staff assignment functionality
- Validates assignment dialog
- Checks staff management tab

### 7. Parent View Child Information
- Tests parent's ability to view child information
- Validates child dashboard content

### 8. Parent View Child Attendance
- Tests parent's ability to view child attendance
- Validates attendance section navigation

## Running the Tests

### Run all 8 tests:
```bash
npx playwright test tests/e2e/children-focused.spec.ts
```

### Run with specific browser:
```bash
npx playwright test tests/e2e/children-focused.spec.ts --project=Chromium@3000
```

### Run with UI mode (for debugging):
```bash
npx playwright test tests/e2e/children-focused.spec.ts --ui
```

### Run a specific test:
```bash
npx playwright test tests/e2e/children-focused.spec.ts -g "1. Parent should be able to register"
```

## Test Credentials

The tests use the following credentials (defined in the test file):

### Admin
- Email: `admin@tinytots.com`
- Password: `Admin123!`
- Role: `admin`

### Parent
- Email: `shijinthomas2026@maca.ajce.in`
- Password: `Shijin14@`
- Role: `parent`

## Prerequisites

1. **Server Running**: The application server must be running on `http://localhost:3000`
   - Playwright config will attempt to start it automatically via `npm run dev:two`
   - Or start manually: `npm run dev`

2. **Database**: MongoDB should be running and accessible
   - Test accounts should exist in the database
   - Admin account should be active

3. **Dependencies**: All npm packages should be installed
   ```bash
   npm install
   ```

## Known Issues & Solutions

### Issue: Email field selector matches multiple elements
**Solution**: Use specific selector `input[name="email"][type="email"]` to avoid matching the "notifyByEmail" checkbox

### Issue: Admin login timeout
**Possible Causes**:
- Admin account doesn't exist in database
- Admin account is not active
- Role dropdown option text doesn't match

**Solution**: 
- Verify admin account exists and is active
- Check that role option text is exactly "Admin" (case-sensitive)

### Issue: Tests timing out
**Solution**: 
- Increase timeout: `--timeout=90000`
- Ensure server is running and responsive
- Check network connectivity

## Test Structure

```
tests/e2e/children-focused.spec.ts
├── Helper Functions
│   ├── loginAs() - Login helper for admin/parent
│   └── getValidChildDOB() - Generate valid child date of birth
├── Test 1: Parent Registration
├── Test 2: Admin View Admissions
├── Test 3: Admin View Admission Details
├── Test 4: Admin Create Child
├── Test 5: Admin View Children Count
├── Test 6: Admin Assign Staff
├── Test 7: Parent View Child Info
└── Test 8: Parent View Attendance
```

## Notes

- Tests use flexible selectors to handle UI variations
- Some tests may skip if elements are not found (e.g., no pending admissions)
- Tests are designed to be resilient to minor UI changes
- All tests include proper error handling and timeouts

## Full Test Suite

For comprehensive testing, see also:
- `tests/e2e/children.spec.ts` - Full test suite with all scenarios

