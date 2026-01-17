# 🔐 Cor Jesu College Email Authentication System

## Overview

The Safire app now uses **Email Link Authentication** (passwordless sign-in) specifically for Cor Jesu College students. This ensures only verified students with school email addresses can access the app.

## How It Works

### For Students:

1. **Open the Safire app**
2. **Enter your Cor Jesu College email address** (e.g., `student@corjesu.edu.ph`)
3. **Tap "Send Verification Link"**
4. **Check your email inbox**
5. **Click the verification link** in the email
6. **Automatically signed in** and redirected to the app

### For New Users:

- First-time users will be automatically redirected to **Account Setup** after verification
- Complete your profile with name, student ID, and other details
- Start using the app immediately

### For Returning Users:

- Existing users will be automatically logged in after clicking the verification link
- No need to set up profile again

## Key Features

✅ **Passwordless** - No need to remember passwords  
✅ **School Email Only** - Only `@corjesu.edu.ph` emails accepted  
✅ **Secure** - Firebase handles all security and verification  
✅ **Easy** - One-click sign-in from email  
✅ **Automatic Account Creation** - Accounts created on first sign-in  

## Technical Details

### Email Domain Validation

```javascript
const SCHOOL_EMAIL_DOMAIN = '@corjesu.edu.ph';
```

Only emails ending with `@corjesu.edu.ph` are accepted.

### Authentication Flow

```
1. User enters email → Validation check
2. Send magic link → Firebase sends verification email
3. User clicks link → Email verified
4. Check account status:
   - New user → Create account → Account Setup
   - Existing user → Check suspension → Home Screen
```

### Firebase Configuration

Email link authentication is automatically enabled with your Firebase project. The app uses:

- `sendSignInLinkToEmail()` - Sends the verification link
- `isSignInWithEmailLink()` - Checks if URL is a sign-in link
- `signInWithEmailLink()` - Completes the sign-in process

## Firebase Console Setup

To enable email link sign-in in your Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `campulse-8c50e`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Email/Password** provider
5. **Important**: Enable "Email link (passwordless sign-in)"

### Add Authorized Domain

1. In Authentication settings, go to **Authorized domains**
2. Add your app's domain (if using custom domain)
3. For development: `localhost` is already authorized

## Testing the Authentication

### Testing Locally:

1. **Start the app:**
   ```bash
   npx expo start
   ```

2. **Enter a test email:**
   - Use format: `teststudent@corjesu.edu.ph`
   - Make sure you have access to this email

3. **Check email:**
   - Look for email from Firebase
   - Subject: "Sign in to [Your App Name]"

4. **Click the link:**
   - Opens the app automatically
   - Completes sign-in

### Testing on Different Devices:

- Email link works across devices
- If opened on different device, user will be prompted to re-enter email
- Verification still works

## Troubleshooting

### Issue: "Invalid email domain"

**Solution:** Make sure the email ends with `@corjesu.edu.ph`

### Issue: "Failed to send verification link"

**Possible causes:**
- Email provider not enabled in Firebase Console
- Network connectivity issues
- Invalid email address

**Solution:**
1. Check Firebase Console → Authentication → Sign-in method
2. Ensure Email/Password is enabled
3. Verify internet connection

### Issue: "Email link expired"

**Solution:**
- Email links expire after a certain time
- Request a new verification link
- Click "Use different email" and re-enter your email

### Issue: "Account suspended"

**Solution:**
- Contact school administrator
- Check with IT support
- Admin can reactivate account from web panel

## Security Features

### Account Suspension Check

The app automatically checks if a user's account is suspended:

```javascript
if (userData.accountStatus === 'suspended' || userData.status === 'suspended') {
  await signOut(auth);
  alert('Account suspended...');
  return;
}
```

Suspended users cannot sign in even with valid email links.

### Email Verification

- Only verified email addresses can sign in
- Clicking the email link verifies ownership
- No fake or unverified accounts possible

## Admin Web Panel Integration

Admins can:
- View all registered users
- See email addresses
- Suspend accounts
- Reactivate suspended accounts
- Track false reports

## Customization

### Change Email Domain

To use a different school domain:

1. Open [`App.js`](App.js )
2. Find this line:
   ```javascript
   const SCHOOL_EMAIL_DOMAIN = '@corjesu.edu.ph';
   ```
3. Change to your school's domain:
   ```javascript
   const SCHOOL_EMAIL_DOMAIN = '@yourschool.edu.ph';
   ```

### Customize Email Template

To customize the verification email:

1. Go to Firebase Console
2. Authentication → Templates
3. Select "Email link sign-in"
4. Edit subject and body
5. Add your school branding

## Migration from Old System

If you had users with the old email/password system:

### Option 1: Manual Migration

Users need to sign in again with their school email:
1. Remove old auth data
2. Sign in with email link
3. Profile data preserved (same email)

### Option 2: Keep Both Methods

You can keep both authentication methods:
- Email/password for admins
- Email link for students

## Best Practices

✅ **Use school email only** - Ensures verified students  
✅ **Check suspension status** - Prevent banned users from accessing  
✅ **Auto-create profiles** - Smooth onboarding experience  
✅ **Clear instructions** - Guide users through the process  
✅ **Test thoroughly** - Verify email delivery and link functionality  

## Support

For issues or questions:
- Check Firebase Console logs
- Review authentication errors in app logs
- Contact Firebase support for email delivery issues
- Check spam folder if email not received

---

**Note**: This authentication system requires internet connectivity and access to the email inbox. Make sure students can access their school email accounts!