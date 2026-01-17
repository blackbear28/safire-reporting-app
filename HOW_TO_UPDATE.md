# How to Update Safire App - For Team Members

## If You Downloaded the Project as ZIP Before

Follow these steps to switch to Git so you can get updates easily without re-downloading everything.

---

## Step 1: Backup Your Work (Important!)

Before doing anything, backup any changes you made:
- Copy your modified files to a safe location
- Or take note of what you changed

---

## Step 2: Open Terminal in Your Project Folder

1. Open your project folder in File Explorer
2. Click on the address bar and type `cmd` or `powershell`
3. Press Enter

---

## Step 3: Initialize Git and Connect to GitHub

Copy and paste these commands one by one:

```powershell
# Initialize Git in your folder
git init

# Add the GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/safire-app.git

# Fetch all updates from GitHub
git fetch origin

# Reset to match the latest version (⚠️ This will overwrite your local files)
git reset --hard origin/main

# Install any new dependencies
npm install
```

**⚠️ Important:** The `git reset --hard` command will overwrite your local files with the GitHub version. Make sure you backed up your changes first!

---

## Step 4: Restore Your Changes (If You Had Any)

If you made any custom changes:
1. Copy back your modified files from your backup
2. Or re-apply your changes manually

---

## Step 5: You're Done! 🎉

From now on, whenever there are updates, just run:

```powershell
git pull origin main
npm install
```

That's it! No need to download ZIP files anymore.

---

## Quick Reference

### Get Latest Updates
```powershell
git pull origin main
npm install  # Only if package.json changed
```

### Check What Changed
```powershell
git log --oneline -10  # See last 10 commits
```

### See Your Current Status
```powershell
git status
```

### Discard Your Local Changes (Start Fresh)
```powershell
git reset --hard origin/main
```

---

## Common Issues

### "fatal: not a git repository"
You're not in the project folder. Navigate to the correct folder first.

### "error: remote origin already exists"
Skip the `git remote add` command and continue with the next steps.

### "Your local changes would be overwritten"
Either:
- Backup and discard: `git reset --hard origin/main`
- Or commit your changes first: `git add . && git commit -m "my changes"`

### "npm install" is slow
This is normal on first install. Subsequent updates are much faster.

---

## Need Help?

Contact Evelyn or check the other setup guides in the project folder:
- `SETUP_FOR_COLLEAGUES.md` - Initial setup
- `FIREBASE_CONSOLE_SETUP.md` - Firebase configuration
- `TROUBLESHOOTING_SETUP.md` - Common problems

---

## Benefits of Using Git

✅ **Fast Updates** - Only download what changed (KB instead of MB)  
✅ **No Re-setup** - Keep your node_modules and configurations  
✅ **Track Changes** - See exactly what was updated  
✅ **Collaborate Better** - Everyone stays in sync  
✅ **Easy Rollback** - Undo updates if something breaks  

---

**Last Updated:** January 14, 2026
