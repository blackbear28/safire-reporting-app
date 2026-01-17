# 🚨 COMMON SETUP ISSUES & SOLUTIONS

## Issue 1: "Package.json not found" Error

### Problem:
```
Configuration Error: The expected package.json path: C:\Users\[username]\Downloads\safire-reporting-app-main\package.json does not exist
```

### Cause:
You're running `expo start` from the wrong directory. The project files are inside a subfolder.

### Solution:

**For Windows:**
1. Open Command Prompt or PowerShell
2. Navigate to the downloaded project folder:
   ```bash
   cd Downloads\safire-reporting-app-main
   ```
3. Look for the actual project folder (usually named something like "safire-app - Copy"):
   ```bash
   dir
   ```
4. Navigate into the project folder:
   ```bash
   cd "safire-app - Copy"
   ```
5. Verify you're in the right place (should see App.js, package.json, etc.):
   ```bash
   dir
   ```
6. Install dependencies:
   ```bash
   npm install
   ```
7. Start the app:
   ```bash
   expo start
   ```

**Easy Method - Use the Batch File:**
1. Navigate to the project folder that contains `App.js` and `package.json`
2. Double-click on `start-mobile-app.bat`
3. Follow the on-screen instructions

## Issue 2: Expo CLI Not Found

### Problem:
```
'expo' is not recognized as an internal or external command
```

### Solution:
```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Or use npx (recommended)
npx expo start
```

## Issue 3: Node.js Not Installed

### Problem:
```
'npm' is not recognized as an internal or external command
```

### Solution:
1. Download and install Node.js from: https://nodejs.org/
2. Choose the LTS (Long Term Support) version
3. Restart your command prompt/terminal
4. Verify installation: `node --version` and `npm --version`

## Issue 4: Metro Bundler Port Conflict

### Problem:
```
Error: listen EADDRINUSE: address already in use :::8081
```

### Solution:
```bash
# Kill the process using port 8081
npx expo start --clear

# Or start on a different port
npx expo start --port 8082
```

## Issue 5: Expo Go App Not Connecting

### Problem:
QR code scanned but app doesn't load in Expo Go

### Solutions:
1. **Make sure both devices are on the same network**
2. **Try tunnel mode:**
   ```bash
   npx expo start --tunnel
   ```
3. **Manually enter the URL in Expo Go app**
4. **Restart the Metro bundler:**
   ```bash
   npx expo start --clear
   ```

## Quick Setup Checklist:

- [ ] Node.js installed (version 16 or higher)
- [ ] Expo Go app installed on mobile device
- [ ] Both computer and phone on same WiFi network
- [ ] Navigated to correct project directory (contains package.json and App.js)
- [ ] Dependencies installed (`npm install`)
- [ ] Can run `npx expo start` successfully

## Need Help?

If you're still having issues:
1. Take a screenshot of the error message
2. Share the exact command you ran
3. Mention your operating system (Windows/Mac/Linux)
4. Share the folder structure where you're trying to run the command

## Project Structure Reference:

```
safire-reporting-app-main/           ← DON'T RUN COMMANDS HERE
└── safire-app - Copy/               ← RUN COMMANDS FROM HERE
    ├── App.js                       ← Main app file
    ├── package.json                 ← Dependencies file
    ├── app.json                     ← Expo configuration
    ├── start-mobile-app.bat         ← Windows helper script
    ├── node_modules/                ← Dependencies folder
    └── ...other files
```

Remember: Always run `expo start` or `npm` commands from the directory that contains `package.json` and `App.js`!
