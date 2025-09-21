# 🔥 Safire - Complete School Reporting System

A comprehensive school incident reporting system with **React Native mobile app** and **React web admin panel**. Built with Expo, Firebase, and Material-UI for modern school administration.

## 📱 **Mobile App Features**

- **User Authentication** - Secure login/register with Firebase Auth
- **Incident Reporting** - Submit detailed reports with categories, priorities, and locations
- **Real-time Feed** - View and interact with recent reports and updates
- **School News** - Latest news and announcements
- **Trending Topics** - Interactive word cloud of trending report topics
- **AI Chat System** - Intelligent chatbot assistance for reporting
- **Dashboard** - Personal dashboard with user statistics
- **Real-time Notifications** - Instant updates on report status changes

## 💻 **Admin Web Panel Features**

- **📊 Analytics Dashboard** - Comprehensive statistics and insights
- **📋 Reports Management** - Review, approve, and manage all submitted reports
- **👥 User Management** - Manage student and staff accounts
- **📈 Interactive Charts** - Visual analytics with trends and patterns
- **⚙️ System Settings** - Configure notifications and system behavior
- **🔐 Role-based Access** - Admin and Super Admin permission levels
- **📱 Real-time Sync** - Instant synchronization with mobile app

## 🛠️ Technologies Used

- **React Native** with Expo
- **Firebase** (Authentication, Firestore, Storage)
- **React Navigation** for navigation
- **Expo Vector Icons** for icons
- **React Native Tab View** for tab navigation

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (version 16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** or **yarn** (comes with Node.js)
   - Verify npm: `npm --version`
   - Or install yarn: `npm install -g yarn`

3. **Expo CLI**
   ```bash
   npm install -g @expo/cli
   ```

4. **Git** (for version control)
   - Download from: https://git-scm.com/

5. **Expo Go App** on your mobile device
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

## 🎯 Quick Start Checklist

For new team members, follow this checklist:

### ✅ Before You Start
- [ ] Install Node.js (version 18+)
- [ ] Install Git
- [ ] Install Expo Go app on your phone
- [ ] Have Firebase project credentials ready

### ✅ Setup Process
- [ ] Clone the repository: `git clone <repo-url>`
- [ ] Navigate to project: `cd safire-app`
- [ ] Install dependencies: `npm install`
- [ ] Fix Expo dependencies: `npx expo install --fix`
- [ ] Configure Firebase in `firebase.js`
- [ ] Test connection: `npx expo doctor`

### ✅ First Run
- [ ] Start development server: `npx expo start`
- [ ] Scan QR code with Expo Go app
- [ ] Verify app loads without errors
- [ ] Test basic navigation (Home, Chat, Reports)

### ✅ Development Workflow
- [ ] Always pull latest changes: `git pull origin main`
- [ ] Create feature branch: `git checkout -b feature-name`
- [ ] Make changes and test thoroughly
- [ ] Commit changes: `git commit -m "Description"`
- [ ] Push and create pull request

### 🆘 If Something Goes Wrong
1. Clear cache: `npx expo start --clear`
2. Reinstall modules: `rm -rf node_modules && npm install`
3. Check dependencies: `npx expo doctor`
4. Check this README's troubleshooting section
5. Contact team for help

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd safire-app
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Firebase Configuration
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Get your Firebase config keys
5. Update `firebase.js` with your configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 4. Start the Development Server
```bash
npx expo start
# or
yarn expo start
```

## 📱 Running the App

### Option 1: Expo Go (Recommended for Development)
1. Start the development server: `npx expo start`
2. Open Expo Go on your mobile device
3. Scan the QR code from the terminal/browser
4. The app will load on your device

### Option 2: Android Emulator
1. Install Android Studio and set up an emulator
2. Start the emulator
3. Run: `npx expo start --android`

### Option 3: iOS Simulator (Mac only)
1. Install Xcode
2. Run: `npx expo start --ios`

## 🔧 Available Scripts

```bash
# Start development server
npm start
# or
npx expo start

# Start with specific platform
npx expo start --android
npx expo start --ios
npx expo start --web

# Clear cache and start
npx expo start --clear

# Install dependencies
npm install

# Fix dependencies (recommended after cloning)
npx expo install --fix

# Check for common issues
npx expo doctor

# Run on connected Android device/emulator
npm run android
# or
npx expo run:android

# Run on iOS simulator (macOS only)
npm run ios
# or
npx expo run:ios

# Build for production (requires EAS CLI)
eas build --platform android
eas build --platform ios
```

## 🏗️ Building for Production

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure EAS Build
```bash
eas build:configure
```

### 4. Build APK/AAB for Android
```bash
# Build APK (for testing)
eas build --platform android --profile preview

# Build AAB (for Play Store)
eas build --platform android --profile production
```

### 5. Build for iOS
```bash
eas build --platform ios --profile production
```

## 📁 Project Structure

```
safire-app/
├── App.js                      # Main app component and navigation setup
├── app.json                    # Expo app configuration
├── package.json                # Dependencies and scripts
├── firebase.js                 # Firebase configuration and initialization
├── styles.js                   # Global styles and theme
├── index.js                    # App entry point
├── metro.config.js             # Metro bundler configuration
├── react-native.config.js      # React Native configuration
├── eas.json                    # EAS Build configuration
│
├── screens/                    # All screen components
│   ├── HomeScreen.js           # Home/Dashboard with news and activity
│   ├── ChatScreen.js           # AI chatbot interface
│   ├── DashboardScreen.js      # Main dashboard view
│   ├── DashboardScreen_new.js  # Alternative dashboard layout
│   ├── PostDetailScreen.js     # Individual report details
│   ├── ReportScreen.js         # Report submission form
│   └── EditProfile.js          # User profile editing
│
├── contexts/                   # React Context providers
│   ├── UserContext.js          # User authentication and state
│   └── UserContext.js.bak      # Backup of user context
│
├── services/                   # External service integrations
│   ├── chatbotService.js       # AI chatbot API integration
│   └── reportService.js        # Report management services
│
├── utils/                      # Utility functions and helpers
│   └── aiService.js            # AI-related utility functions
│
├── assets/                     # Static assets
│   ├── fonts/                  # Custom font files (Outfit, SF Pro)
│   │   ├── Outfit-*.ttf        # Outfit font family
│   │   └── SFProText-*.ttf     # SF Pro Text font family
│   ├── icon.png                # App icon
│   ├── splash-icon.png         # Splash screen image
│   ├── logo.png                # App logo
│   ├── favicon.png             # Web favicon
│   └── adaptive-icon.png       # Android adaptive icon
│
├── android/                    # Android-specific configuration
│   ├── build.gradle            # Android build configuration
│   ├── app/build.gradle        # App-level build settings
│   └── app/src/main/           # Android source files
│
├── docs/                       # Documentation files
│   ├── firebase-setup.md       # Detailed Firebase setup guide
│   ├── database-schema.md      # Database structure documentation
│   └── setup-requirements.md   # System requirements and setup
│
└── build/                      # Build artifacts (generated)
```

## 📦 Project Size & Optimization

### Current Project Analysis
Based on folder size analysis:

```
Total project size: ~350MB (including node_modules)
├── node_modules/     ~349MB  (⚠️ DO NOT upload to GitHub/Drive)
├── assets/fonts/     ~0.5MB  (Custom fonts - necessary)
├── android/          ~0.1MB  (Android config - necessary)
├── All other files   <0.1MB  (Source code - necessary)
```

### For GitHub/Drive Upload
**✅ Safe to upload:**
- All source code files (*.js, *.json, *.md)
- Assets folder (fonts, images)
- Android configuration files
- Documentation files

**❌ DO NOT upload:**
- `node_modules/` folder (always excluded via `.gitignore`)
- `build/` folder (generated during builds)
- `.expo/` folder (Expo cache)
- Any `.env` files with sensitive data

### Storage Recommendations
1. **GitHub**: Project without `node_modules` is <1MB - perfect for version control
2. **Google Drive**: Share the project folder excluding `node_modules`
3. **Team Sharing**: Always include this README and run `npm install` after cloning

### Reducing Project Size
The project is already optimized. Main size contributors:
- **node_modules**: Required dependencies (~349MB) - excluded from uploads
- **Custom fonts**: Essential for app branding (~0.5MB)
- **No unnecessary large files detected**

## 🔥 Firebase Setup Details

### 1. Authentication
- Go to Firebase Console → Authentication → Sign-in method
- Enable "Email/Password" provider

### 2. Firestore Database
- Go to Firebase Console → Firestore Database
- Create database in production mode
- Set up security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Storage (if using file uploads)
- Go to Firebase Console → Storage
- Set up storage bucket
- Configure storage rules

## 🐛 Troubleshooting

### Common Issues:

1. **Metro bundler issues:**
   ```bash
   npx expo start --clear
   # OR reset cache completely
   npm start -- --reset-cache
   ```

2. **Node modules issues:**
   ```bash
   # Delete node_modules and reinstall (Windows)
   rmdir node_modules /s
   npm install
   
   # On macOS/Linux
   rm -rf node_modules
   npm install
   ```

3. **Dependency issues after cloning:**
   ```bash
   # Fix Expo dependencies automatically
   npx expo install --fix
   ```

4. **Expo Go connection issues:**
   - Make sure both devices are on the same network
   - Try using tunnel mode: `npx expo start --tunnel`
   - Restart the Metro bundler: `npx expo start --clear`

5. **Firebase connection issues:**
   - Check your Firebase configuration in `firebase.js`
   - Ensure Firebase services are enabled in console
   - Check internet connection
   - Verify Firestore security rules

6. **Font loading issues:**
   - Fonts are loaded asynchronously using `expo-font`
   - App shows loading screen until fonts are ready
   - Check that font files exist in `assets/fonts/`

7. **Android build issues:**
   ```bash
   # Clear Android cache
   npx expo run:android --clear
   
   # If using development build
   cd android
   ./gradlew clean
   cd ..
   ```

8. **iOS build issues (macOS only):**
   ```bash
   # Clear iOS cache
   npx expo run:ios --clear
   
   # Clean iOS build folder
   cd ios
   rm -rf build
   cd ..
   ```

9. **Expo CLI version issues:**
   ```bash
   # Update Expo CLI globally
   npm install -g @expo/cli@latest
   
   # Or use npx (recommended)
   npx expo start
   ```

10. **Package version conflicts:**
    ```bash
    # Check for issues
    npx expo doctor
    
    # Clear npm cache
    npm cache clean --force
    
    # Reinstall everything
    rm -rf node_modules package-lock.json
    npm install
    ```

## 📚 Key Dependencies

Current project dependencies (from package.json):

### Core Framework
```json
{
  "expo": "~53.0.0",
  "react": "19.0.0",
  "react-native": "0.79.5"
}
```

### Navigation & UI
```json
{
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/stack": "^6.3.20",
  "react-native-tab-view": "3.5.2",
  "react-native-pager-view": "6.7.1",
  "react-native-gesture-handler": "~2.24.0",
  "react-native-reanimated": "~3.17.4",
  "react-native-screens": "~4.11.1",
  "react-native-safe-area-context": "^5.4.0"
}
```

### Firebase & Storage
```json
{
  "firebase": "^11.10.0",
  "@react-native-async-storage/async-storage": "^2.1.2"
}
```

### Expo Modules
```json
{
  "expo-auth-session": "~6.2.1",
  "expo-blur": "~14.1.5",
  "expo-constants": "~17.1.7",
  "expo-font": "~13.3.2",
  "expo-haptics": "~14.1.4",
  "expo-image-picker": "~16.1.4",
  "expo-linking": "~7.1.7",
  "expo-local-authentication": "~16.0.5",
  "expo-location": "~18.1.6",
  "expo-splash-screen": "~0.30.10",
  "expo-status-bar": "~2.2.3",
  "expo-updates": "~0.28.17"
}
```

### Utilities
```json
{
  "date-fns": "^4.1.0",
  "@react-native-community/netinfo": "~11.4.0"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature-name`
6. Create a Pull Request

## 📝 Development Guidelines

1. **Code Style**: Follow React Native best practices
2. **Naming**: Use camelCase for variables, PascalCase for components
3. **Components**: Keep components small and reusable
4. **State Management**: Use React Context for global state
5. **Error Handling**: Always handle errors gracefully

## 🔐 Environment Variables

Create a `.env` file (not included in git) for sensitive data:
```
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-auth-domain
FIREBASE_PROJECT_ID=your-project-id
```

## 📱 Testing on Devices

### Physical Device Testing:
1. Install Expo Go app
2. Connect to same WiFi network
3. Scan QR code from terminal

### Simulator Testing:
1. **Android**: Install Android Studio, create AVD
2. **iOS**: Install Xcode (Mac only)

## ⚡ Performance Tips

1. **Images**: Optimize image sizes before adding to assets
2. **Fonts**: Only load fonts that are actually used
3. **Navigation**: Use lazy loading for screens
4. **Firebase**: Implement proper query limits
5. **Memory**: Use FlatList for large lists

## 🚨 Important Notes

- **Firebase Quotas**: Be aware of Firebase free tier limits
- **Expo Go Limitations**: Some native modules may not work in Expo Go
- **Network Requirements**: App requires internet connection for Firebase
- **Platform Differences**: Test on both Android and iOS
- **Node Modules**: Never upload `node_modules` to GitHub/Drive - always run `npm install` after cloning
- **File Size**: Project without `node_modules` is <1MB, making it perfect for version control
- **First Run**: Always run `npx expo install --fix` after cloning to ensure dependencies are compatible

## 📞 Support & Help

- **Expo Documentation**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Firebase Docs**: https://firebase.google.com/docs

## 🌐 Admin Web Panel

### Overview
Safire includes a comprehensive web-based admin panel for managing reports, users, and system analytics. The admin panel provides real-time synchronization with your mobile app.

### Features
- **📊 Real-time Dashboard** - Live statistics and system overview
- **📋 Reports Management** - Approve, reject, and track report status
- **👥 User Management** - Manage user accounts and roles
- **📈 Analytics** - Interactive charts and performance metrics
- **⚙️ System Settings** - Configure notifications and system behavior

### Quick Setup
1. **Navigate to admin panel:**
   ```bash
   cd admin-web
   npm install
   npm start
   ```

2. **Access at:** `http://localhost:3000`

3. **Admin Access Required:** Users need `role: 'admin'` or `role: 'super_admin'` in Firestore

### Status Synchronization
The admin web panel automatically syncs with your mobile app:
- ✅ Status changes (pending → in progress → resolved) reflect instantly
- ✅ New reports appear in real-time
- ✅ User management changes sync automatically
- ✅ Push notifications for status updates

See `admin-web/README.md` for detailed setup instructions.

## 🚀 **For Team Members - Quick Start**

### **🔽 Download & Setup**
```bash
# Clone this repository
git clone https://github.com/YOUR_USERNAME/safire-app.git
cd safire-app

# Install mobile app dependencies
npm install

# Install admin web panel dependencies
cd admin-web
npm install
cd ..
```

### **📱 Run Mobile App**
```bash
# Start the mobile app (React Native + Expo)
npm start
# OR
npx expo start

# Scan QR code with Expo Go app on your phone
```

### **💻 Run Admin Web Panel**
```bash
# Navigate to admin-web directory
cd admin-web

# Start the web admin panel
npx react-scripts start

# Open http://localhost:3000 in your browser
```

## 🤝 **Team Collaboration Guide**

### **📋 Development Workflow**
1. **Pull latest changes**: `git pull origin main`
2. **Create feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and test thoroughly
4. **Commit changes**: `git add . && git commit -m "Add your feature"`
5. **Push branch**: `git push origin feature/your-feature-name`
6. **Create Pull Request** on GitHub

### **🔧 Branch Structure**
- **`main`** - Production ready code
- **`develop`** - Development branch for testing
- **`feature/*`** - Individual feature branches
- **`hotfix/*`** - Quick fixes for production issues

### **📝 Commit Message Format**
```
feat: add new report category filter
fix: resolve login authentication issue
docs: update installation instructions
style: improve UI for admin dashboard
```

## 🌐 **Deployment Options**

### **📱 Mobile App Deployment**
```bash
# Build for Android
npx expo build:android

# Build for iOS (macOS only)
npx expo build:ios

# Using EAS Build (recommended)
npm install -g @expo/eas-cli
eas build --platform all
```

### **💻 Admin Panel Deployment**
```bash
# Build for production
cd admin-web
npm run build

# Deploy to Firebase Hosting
npm install -g firebase-tools
firebase init hosting
firebase deploy

# Deploy to Netlify (drag & drop build folder)
# Deploy to Vercel: vercel --prod
```

## 📊 **Project Statistics**

- **📱 Mobile App**: React Native 0.79.5 + Expo 53.0.0
- **💻 Admin Panel**: React 18.2.0 + Material-UI 5.15.4
- **🔥 Backend**: Firebase (Firestore + Auth + Functions)
- **📈 Analytics**: Real-time charts with Recharts
- **🎨 UI/UX**: Modern, responsive design
- **📱 Platform Support**: iOS, Android, Web

## 🛡️ **Security & Privacy**

- **🔐 Authentication**: Firebase Auth with role-based access
- **🛡️ Data Protection**: Firestore security rules
- **🔒 HTTPS**: All communications encrypted
- **👤 Privacy**: Anonymous reporting option available
- **📊 GDPR Compliant**: User data protection measures

## 🌟 **Key Benefits**

### **For Schools:**
- **📈 Improved Response Time**: Instant notifications and routing
- **📊 Data-Driven Decisions**: Analytics and reporting insights
- **🎯 Better Resource Allocation**: Priority-based issue handling
- **📱 Modern Interface**: User-friendly for all age groups

### **For Students/Staff:**
- **📱 Easy Reporting**: Quick mobile app submission
- **👁️ Transparency**: Track report status in real-time
- **🔐 Privacy Options**: Anonymous reporting available
- **📢 Stay Informed**: Real-time updates and school news

### **For Administrators:**
- **💻 Centralized Management**: All reports in one dashboard
- **📊 Performance Metrics**: Track resolution rates and trends
- **👥 User Management**: Complete control over accounts and roles
- **⚙️ System Control**: Configurable settings and notifications

---

**🎓 Developed for modern educational institutions**  
**🚀 Ready for production deployment**  
**👥 Team collaboration ready**
