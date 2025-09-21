# APK Crash Debug Guide for Realme 6i

## Complete Step-by-Step Debugging Process

### Step 1: Enable Developer Options on Realme 6i
1. **Go to Settings** → **About Phone** (or **About Device**)
2. **Find "Build Number"** and **tap it 7 times** rapidly
3. You'll see "You are now a developer!" message
4. **Go back** to main Settings
5. **Find "Developer Options"** (usually under System or Additional Settings)
6. **Enable "USB Debugging"**
7. **Also enable "Install via USB"** (if available)

### Step 2: Install ADB on Your Computer

**Option A: Easy Method (Recommended)**
```powershell
# If you have Chocolatey package manager installed:
choco install adb
```

**Option B: Manual Download**
**Step 2a: Download ADB Tools**
1. **Go to this Google page:** https://developer.android.com/studio/releases/platform-tools
2. **Click "Download SDK Platform-Tools for Windows"**
3. **Download the ZIP file** (about 5MB) - it will be named something like `platform-tools_r34.0.5-windows.zip`

**Step 2b: Extract and Setup**
1. **Create a folder:** `C:\adb\` on your computer
2. **Extract the downloaded ZIP file** to `C:\adb\`
3. **You should now have:** `C:\adb\platform-tools\` with files like `adb.exe`

**Step 2c: Add to PATH (Important!)**
1. **Press Win+R**, type `sysdm.cpl`, press Enter
2. **Click "Environment Variables"**
3. **Under "System Variables"**, find and select "Path", click "Edit"
4. **Click "New"** and add: `C:\adb\platform-tools`
5. **Click OK** on all windows
6. **Restart PowerShell**

### Step 2d: Test ADB Installation
```bash
# Open VS Code terminal (Ctrl + ` ) and test:
adb version

# You should see something like:
# Android Debug Bridge version 1.0.41
# Version 34.0.5-10900879
```

**If you get "adb is not recognized":**
- Make sure you restarted VS Code after adding to PATH
- Check that `C:\adb\platform-tools\adb.exe` exists
- Try opening a new VS Code terminal (`Ctrl + Shift + ``) 

### Step 3: Connect and Setup Device
```bash
# In VS Code terminal (Ctrl + `):
# Connect your Realme 6i via USB cable
adb devices
# You should see your device listed

# If device shows as "unauthorized", check your phone for USB debugging prompt and tap "Allow"
```

### Step 4: Get Your APK Ready
```bash
# In VS Code terminal:
# First, check the current build status
eas build:list --limit=1

# Download the latest APK (use the artifact URL from build list)
# Or build a new one if needed:
# eas build --platform android --profile preview
```

### Step 5: Install and Test APK
```powershell
# Clear any previous installation
adb uninstall com.invictus28.safireapp

# Install the new APK (replace with your actual APK path)
adb install "path\to\your\downloaded.apk"
# Example: adb install "C:\Users\evelyn\Downloads\safire-app.apk"
```

### Step 6: Start Real-Time Crash Monitoring in VS Code
**Perfect debugging workflow using VS Code's integrated terminal:**

1. **Open VS Code** with your Safire project
2. **Open integrated terminal** (`Ctrl + `` ` or View → Terminal)
3. **Create multiple terminal panes** for comprehensive monitoring:
   - **Click the split terminal icon** (⊞) in the terminal toolbar, OR
   - **Use keyboard shortcut** `Ctrl + Shift + 5`

**🔧 Terminal Pane Setup:**

**Pane 1 - Crash Monitor:**
```powershell
# Clear old logs first
adb logcat -c

# Monitor for crashes and errors (PowerShell compatible)
adb logcat -s "AndroidRuntime:E" "System.err:W" "*:E" | Select-String -Pattern "safireapp|crash|exception|error|fatal" -CaseSensitive:$false
```

**Pane 2 - App-Specific Logs:**
```powershell
# Monitor everything from your app (PowerShell compatible)
adb logcat | Select-String -Pattern "com.invictus28.safireapp" -CaseSensitive:$false
```

**Pane 3 - Commands (Optional):**
```powershell
# Keep this free for running other ADB commands
# Like installing APKs, checking devices, etc.
adb devices
```

**🎯 VS Code Terminal Advantages:**
- ✅ **No external windows** - everything in one place
- ✅ **Easy copy/paste** - right-click to copy error messages
- ✅ **Multiple panes** - monitor different log types simultaneously
- ✅ **Persistent history** - scroll back through all logs
- ✅ **Integrated with code** - click error file paths to open files
- ✅ **Better text selection** - drag to select multiple lines
- ✅ **Color coding** - easier to spot errors in red

### Step 7: Reproduce the Crash & Debug Tips

**🎯 VS Code Terminal Pro Tips:**
- **Copy multiple lines**: Hold `Shift` and click to select multiple lines, then `Ctrl+C`
- **Find in terminal**: `Ctrl+F` to search through terminal output
- **Clear terminal**: `Ctrl+K` to clear current pane
- **Switch between panes**: `Ctrl+Tab` or click on the pane
- **Full screen terminal**: `Ctrl+Shift+`` ` to maximize terminal panel
- **Copy file paths**: When logs show file paths, you can often `Ctrl+Click` to open them

**📋 Debugging Workflow:**
1. **Start all monitoring** (Panes 1 & 2 running the adb commands above)
2. **Launch the app** on your Realme 6i
3. **Navigate through the app** until it crashes
4. **Immediately check both terminal panes** for new error messages
5. **Copy the relevant errors** (right-click → copy)  
6. **Look for app-specific crashes** (containing `com.invictus28.safireapp`)

**🚨 Important: Ignore Non-App Errors**
The error you shared earlier is NOT from your app:
```
E DropBoxUtil: [AppErrors] null InputStream [CONTEXT service_id=254 ]
```
This is a **Google Play Services** error. Your actual app crashes will look like:
```
E AndroidRuntime: FATAL EXCEPTION: main
E AndroidRuntime: Process: com.invictus28.safireapp, PID: 12345
E AndroidRuntime: java.lang.RuntimeException: Something in your app crashed
```

### Step 8: Analyze Common Crash Patterns
### Step 8: Analyze Common Crash Patterns
**Look for these specific error types:**

- **`OutOfMemoryError`**: App using too much RAM
  ```
  java.lang.OutOfMemoryError: Failed to allocate
  ```
  
- **`UnsatisfiedLinkError`**: Native module problems
  ```
  java.lang.UnsatisfiedLinkError: dlopen failed
  ```
  
- **`SecurityException`**: Permission issues
  ```
  java.lang.SecurityException: Permission denied
  ```
  
- **`NetworkOnMainThreadException`**: Network calls on UI thread
  ```
  android.os.NetworkOnMainThreadException
  ```
  
- **`NullPointerException`**: Null reference errors
  ```
  java.lang.NullPointerException
  ```

- **`ActivityNotFoundException`**: Navigation issues
  ```
  android.content.ActivityNotFoundException
  ```

### Step 9: Additional Debugging Commands
```powershell
# Check device specifications
adb shell getprop ro.build.version.release  # Android version
adb shell getprop ro.product.model          # Device model
adb shell getprop ro.build.version.sdk      # SDK version

# Monitor memory usage while app runs
adb shell dumpsys meminfo com.invictus28.safireapp

# Check if app process is running
adb shell ps | findstr safireapp

# Force stop the app if needed
adb shell am force-stop com.invictus28.safireapp

# Check app permissions
adb shell dumpsys package com.invictus28.safireapp | findstr permission
```

### Step 10: What to Do With Crash Logs
1. **Copy the entire error stack trace**
2. **Note the exact line where crash occurs**
3. **Share the logs** so we can identify the root cause
4. **Try these immediate fixes based on error type:**

**If OutOfMemoryError:**
- Close other apps before testing
- Restart your phone
- Test on a device with more RAM if available

**If Permission Error:**
- Check app permissions in Settings
- Grant all requested permissions manually

**If Navigation Error:**
- Test only the home screen first
- Avoid navigation until fixed

---

## 🔧 **Additional Debugging Commands**
```powershell
# Check device info
adb shell getprop ro.build.version.release
adb shell getprop ro.product.model

# Monitor memory usage
adb shell dumpsys meminfo com.invictus28.safireapp

# Check if app is running
adb shell ps | findstr safireapp

# Force stop app
adb shell am force-stop com.invictus28.safireapp

# Check app permissions
adb shell dumpsys package com.invictus28.safireapp | findstr permission
```

## 📱 **Realme 6i Specific Issues**
- **ColorOS modifications** may block certain permissions
- **4GB RAM limitation** - close other apps before testing
- **Custom security features** may interfere with app startup
- **Battery optimization** may kill background processes

## 🏗️ **Build Status**
Current build in queue: https://expo.dev/accounts/invictus28/projects/safire-app-new/builds
Estimated completion: **~40-80 minutes**

**Changes in this build:**
- ✅ Removed problematic permissions
- ✅ Enabled Hermes & ProGuard
- ✅ Added error handling to image components
- ✅ Optimized for low-memory devices

## 🚀 **Quick Start Debugging Process**

### **For Your Specific Situation:**

**Your new optimized build is currently in the EAS queue. Once it's ready:**

1. **Download the new APK** from: https://expo.dev/accounts/invictus28/projects/safire-app-new/builds

2. **Follow these exact commands** in PowerShell:

```powershell
# Enable ADB (download Platform Tools first if needed)
adb devices

# Clear old installation (use BOTH package names to be sure)
adb uninstall com.invictus28.safireapp
adb uninstall com.invictus28.campulseapp

# Install new APK (replace path with your download location)
adb install "C:\Users\evelyn\Downloads\your-app.apk"

# Start crash monitoring in separate windows:
# Window 1: General crash monitoring
adb logcat -c
adb logcat AndroidRuntime:E *:F | findstr -i "safireapp\|campulseapp"

# Window 2: App-specific logs  
adb logcat | findstr -i "com.invictus28.safireapp\|com.invictus28.campulseapp"
```

**⚠️ IMPORTANT: Filtering Out False Positives**

The logs will show MANY errors that are NOT from your app. **Ignore these:**
- `com.google.android.gms` (Google Play Services)
- `DropBoxUtil` errors
- `Parcel` errors  
- Any error that doesn't mention `safireapp` or `com.invictus28.safireapp`

**✅ ONLY focus on errors that contain:**
- `com.invictus28.safireapp` (NEW package name)
- `com.invictus28.campulseapp` (OLD package name - ignore this)
- `safireapp` 
- Your actual app package name
- `AndroidRuntime` with your app in the stack trace

**🚨 CRITICAL FIX APPLIED:**
The crash you found was caused by **AsyncStorage native module not being linked properly**:
```
E AndroidRuntime: [@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.
```

**Changes made to fix this:**
✅ Fixed app.json plugins configuration (removed invalid AsyncStorage plugin)
✅ Created custom AsyncStorage plugin for proper autolinking
✅ Added SafeAsyncStorage wrapper with error handling
✅ Updated all AsyncStorage calls to use safe wrapper
✅ Simplified Metro configuration
✅ Started new EAS build with `--clear-cache`

**New build in progress** - should eliminate the AsyncStorage crash completely!

3. **Launch the app** and note when/where it crashes
4. **Copy the error logs** and share them

---

## VS Code Terminal Troubleshooting

### Terminal Issues & Solutions

**🔧 "adb is not recognized" in VS Code Terminal:**
```powershell
# Check if ADB is in PATH
$env:PATH -split ";" | findstr -i "adb\|android"

# If not found, restart VS Code completely after adding ADB to PATH
# Or manually set in current session:
$env:PATH += ";C:\adb\platform-tools"
```

**🔧 Terminal Won't Split/Create Panes:**
- **Click the split icon** in terminal toolbar (⊞ symbol)
- **Or use keyboard**: `Ctrl + Shift + 5`
- **Or right-click** in terminal area → "Split Terminal"

**🔧 Can't Copy Text from Terminal:**
- **Right-click** on selected text → "Copy"
- **Or use keyboard**: Select text, then `Ctrl + C`
- **Select multiple lines**: Hold `Shift` and click

**🔧 Terminal Output Too Fast/Scrolling:**
```powershell
# Add | more to pause output
adb logcat -s "AndroidRuntime:E" | findstr -i "safireapp" | more

# Or save to file for later analysis
adb logcat -s "AndroidRuntime:E" | findstr -i "safireapp" > crash-log.txt
```

**🔧 Terminal Freezes/Hangs:**
- **Ctrl + C** to stop current command
- **Close pane**: Click the trash can icon
- **Create new pane**: Split terminal again

### VS Code Debugging Best Practices

**📱 Device Connection Tips:**
- Keep phone **unlocked** during debugging
- Check for **"USB Debugging" notification** on phone
- If connection lost, run `adb devices` to reconnect

**📋 Log Management:**
- **Clear logs frequently**: `adb logcat -c` before each test
- **Save important crashes**: Copy error messages to a file
- **Use multiple sessions**: One for monitoring, one for commands

**⚡ Quick Commands Reference:**
```powershell
# Essential debugging commands (keep this pane open)
adb devices                    # Check device connection
adb install app.apk           # Install new APK  
adb uninstall com.invictus28.safireapp  # Remove old version
adb logcat -c                 # Clear logs
adb shell am force-stop com.invictus28.safireapp  # Force close app
```

**💡 Pro Debugging Setup:**
1. **Pane 1**: Crash monitoring (keeps running)
2. **Pane 2**: App-specific logs (keeps running)  
3. **Pane 3**: Quick commands (for APK installs, etc.)
4. **Pane 4**: File operations (optional)

This VS Code setup gives you a **professional debugging environment** without leaving your coding workspace!
