# 🔥 Firebase Console Setup for Email Link Authentication

## IMPORTANT: You MUST complete these steps in Firebase Console!

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com/
2. Select your project: **campulse-8c50e**

### Step 2: Enable Email Link Sign-In

1. Click **Authentication** in the left sidebar
2. Click **Sign-in method** tab
3. Find **Email/Password** in the providers list
4. Click on it to open settings
5. ✅ **Enable** the toggle for "Email/Password"
6. ✅ **Enable** the toggle for "Email link (passwordless sign-in)"
7. Click **Save**

### Step 3: Configure Email Templates (Optional but Recommended)

1. In Authentication, click **Templates** tab
2. Select **Email link sign-in**
3. Customize the email template:
   - **From name**: Safire - Cor Jesu College
   - **Subject**: Sign in to Safire
   - **Body**: Customize with school branding

Example template:
```
Hello,

Someone requested to sign in to Safire (Cor Jesu College Reporting System) using this email address.

If you want to sign in with your Cor Jesu College account, click this link:

%LINK%

If you didn't request this link, you can safely ignore this email.

Thanks,
The Safire Team
Cor Jesu College
```

### Step 4: Add Authorized Domains

1. Still in Authentication, scroll down to **Authorized domains**
2. Verify these domains are listed:
   - `localhost` (for development)
   - `campulse-8c50e.firebaseapp.com` (your Firebase domain)
   - Any custom domains you're using

### Step 5: Configure Dynamic Links (Required for Mobile App)

1. Go to **Engage** → **Dynamic Links** in left sidebar
2. Click **Get Started** if not set up
3. Set up a domain:
   - Use Firebase-provided domain: `safire.page.link`
   - Or set up custom domain

4. Configure URL patterns:
   - Set up deep linking for your app
   - Pattern: `/finishSignUp`

### Step 6: Test Email Delivery

1. Make sure you have a valid sender email configured
2. Test by trying to sign in with your email
3. Check if emails are being delivered
4. Check spam folder if not received

## Verification Checklist

After completing setup, verify:

- [ ] Email/Password provider is enabled in Authentication
- [ ] Email link (passwordless) option is enabled
- [ ] Email template is customized (optional)
- [ ] Authorized domains are configured
- [ ] Dynamic Links are set up (for mobile)
- [ ] Test email received successfully

## Testing the Setup

1. Run the app: `npx expo start`
2. Enter a test email: `youremail@corjesu.edu.ph`
3. Click "Send Verification Link"
4. Check your email inbox
5. Click the verification link
6. Should automatically sign in to the app

## Troubleshooting Firebase Setup

### Issue: Emails not being sent

**Check:**
1. Email provider is enabled
2. Firebase project is on Blaze plan (pay-as-you-go) for production
3. Email quota not exceeded (Spark plan: 100/day)

**Solution:**
- Upgrade to Blaze plan for unlimited emails
- Check Firebase Console → Usage tab

### Issue: "Invalid action code"

**Cause:** Email link expired or already used

**Solution:**
- Request new verification link
- Email links expire after 3 days by default

### Issue: "Unauthorized domain"

**Cause:** Current domain not in authorized domains list

**Solution:**
- Add domain to Authentication → Authorized domains
- Include all domains where app is hosted

## Production Considerations

### For Production Deployment:

1. **Upgrade to Blaze Plan**
   - Spark (free) plan limits: 100 emails/day
   - Blaze plan: Unlimited emails, pay per use

2. **Set up custom email sender**
   - Use your school's domain
   - Looks more professional
   - Higher deliverability

3. **Monitor usage**
   - Check Authentication → Usage
   - Monitor email send rate
   - Watch for abuse

4. **Set up email templates properly**
   - Professional branding
   - Clear instructions
   - School logo/colors

## Additional Resources

- [Firebase Email Link Auth Docs](https://firebase.google.com/docs/auth/web/email-link-auth)
- [Dynamic Links Setup](https://firebase.google.com/docs/dynamic-links)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

**⚠️ IMPORTANT:** Without completing these Firebase Console steps, the email link authentication WILL NOT WORK. Make sure to enable email link sign-in before testing!