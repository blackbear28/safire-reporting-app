# 🚀 Safire App - Setup Guide for Team Members

Welcome to the Safire School Reporting System! This guide will help you get the project running on your computer.

## 📱 What You're Getting

- **Mobile App**: React Native + Expo (for students/staff to submit reports)
- **Admin Web Panel**: React web app (for administrators to manage reports)
- **Firebase Backend**: Real-time database and authentication

## 🛠️ Prerequisites

Before you start, install these on your computer:

### Required Software:
1. **Node.js** (version 16+) - [Download here](https://nodejs.org/)
2. **Git** - [Download here](https://git-scm.com/)
3. **Expo CLI** - Install with: `npm install -g @expo/cli`

### For Mobile Development:
4. **Expo Go App** on your phone:
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)

## 📥 Download & Setup

### Step 1: Get the Code
**Option A: Download ZIP**
1. Go to: https://github.com/blackbear28/safire-reporting-app
2. Click green "Code" button → "Download ZIP"
3. Extract to your desired folder

**Option B: Git Clone**
```bash
git clone https://github.com/blackbear28/safire-reporting-app.git
cd safire-reporting-app
```

### Step 2: Install Dependencies
```bash
# Install mobile app dependencies
npm install

# Install admin web panel dependencies
cd admin-web
npm install
cd ..
```

## 🚀 Running the Apps

### 📱 Mobile App (React Native + Expo)
```bash
# From the main project directory
npm start
# OR
npx expo start
```
- Scan the QR code with Expo Go app on your phone
- The mobile app will load on your device

### 💻 Admin Web Panel
```bash
# Open a new terminal/command prompt
cd admin-web
npx react-scripts start
```
- Opens automatically at `http://localhost:3000`
- Use this to manage reports and users

## 🔥 Firebase Setup

The app uses Firebase for backend services. You'll need to:

1. **Get Firebase Config**: Ask the project owner for Firebase configuration
2. **Update firebase.js**: Replace the config in both:
   - `firebase.js` (mobile app)
   - `admin-web/src/firebase.js` (web panel)

## 🔐 Admin Access

To access the admin web panel:
1. Create a user account in the mobile app
2. Ask the project owner to make your account an admin in Firebase
3. Login to the web panel with your credentials

## 📁 Project Structure

```
safire-reporting-app/
├── 📱 Mobile App Files (React Native + Expo)
│   ├── App.js                 # Main app component
│   ├── HomeScreen.js          # Home screen with news/reports
│   ├── services/              # API services
│   └── firebase.js            # Firebase config
│
├── 💻 admin-web/              # Web Admin Panel (React)
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── firebase.js        # Firebase config for web
│   │   └── App.js             # Main web app
│   └── public/                # Static files
│
├── 📄 README.md               # Main documentation
└── 🔧 Setup files & configs
```

## 🆘 Troubleshooting

### Common Issues:

1. **"npm install" fails**
   ```bash
   # Clear cache and try again
   npm cache clean --force
   npm install
   ```

2. **Expo app won't connect**
   - Make sure your phone and computer are on the same WiFi network
   - Try using tunnel mode: `npx expo start --tunnel`

3. **Admin web panel won't start**
   ```bash
   cd admin-web
   npx react-scripts start
   ```

4. **Firebase errors**
   - Make sure you have the correct Firebase configuration
   - Check that Firebase services are enabled in the console

### Need Help?
- Check the main README.md file for detailed documentation
- Ask the project owner for Firebase access
- Review the troubleshooting sections in the documentation

## 🎯 Quick Start Checklist

- [ ] Install Node.js and Git
- [ ] Download/clone the project
- [ ] Run `npm install` in main directory
- [ ] Run `npm install` in admin-web directory
- [ ] Get Firebase configuration from project owner
- [ ] Test mobile app: `npm start`
- [ ] Test admin panel: `cd admin-web && npx react-scripts start`
- [ ] Request admin access for web panel

## 📞 Contact

For questions or issues:
- Project Owner: [Your Name]
- GitHub Repository: https://github.com/blackbear28/safire-reporting-app
- Email: [Your Email]

---

**Happy Coding! 🚀**
