# Database Connection Fix for Vemedia License Validation

## Problem
The Vemedia application was showing a connection error `connect ECONNREFUSED ::1:3306` when trying to validate licenses. This happened because:

1. The application was running in development mode
2. It was trying to connect to a local MySQL database (`localhost:3306`)
3. No local MySQL server was installed or running

## Solution
The application has been updated with a "smart database configuration" that automatically uses the production database when the local database is not available.

### What was changed:

1. **Updated `src/main/database/dbConfig.ts`**:
   - Added `getSmartDbConfig()` function that uses production database as fallback
   - Enhanced environment variable loading

2. **Updated `src/main/database/operations/licenseOperations.ts`**:
   - Created custom `withSmartTransaction()` function
   - License validation now uses production database automatically

3. **Created test scripts**:
   - `scripts/test-production-db.js` - Tests production database connection
   - `scripts/test-license-validation.js` - Tests license validation logic

## How to Use

### Option 1: Run in Production Mode (Recommended)
```bash
# Windows (PowerShell)
$env:NODE_ENV = "production"
npm run start:quiet

# Windows (Command Prompt)
set NODE_ENV=production
npm run start:quiet

# Or use the provided scripts:
# PowerShell
.\scripts\start-with-production-db.ps1

# Command Prompt
.\scripts\start-with-production-db.bat
```

### Option 2: Install Local MySQL (Alternative)
If you want to use a local database for development:

1. Install MySQL Server
2. Create database `vapebox`
3. Import the license table structure
4. Set environment variables in `.env` file

### Option 3: Use Environment Variables
Create a `.env` file in the root directory:
```
NODE_ENV=production
```

## Testing the Fix

### Test Database Connection
```bash
node scripts/test-production-db.js
```

### Test License Validation
```bash
node scripts/test-license-validation.js
```

## License Information
- **License Code**: VENDIMEDIA3
- **Machine Code**: 000003
- **Status**: Available for activation

## Database Details
- **Host**: entity.pe
- **Database**: entitype_RFEnterprises
- **Table**: TA_LICENCIA
- **License Field**: FS_LICENCIA
- **Activation Field**: FN_NUM_LIC

## Troubleshooting

### If you still get connection errors:
1. Check your internet connection
2. Verify the production database is accessible
3. Run the test scripts to verify connectivity

### If license validation fails:
1. Check if the license code is correct (case-sensitive)
2. Verify the license exists in the database
3. Check if the license has already been activated

## Files Modified
- `src/main/database/dbConfig.ts`
- `src/main/database/operations/licenseOperations.ts`
- `scripts/test-production-db.js` (new)
- `scripts/test-license-validation.js` (new)
- `scripts/start-with-production-db.bat` (new)
- `scripts/start-with-production-db.ps1` (new) 