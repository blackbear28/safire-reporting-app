# Safire Admin Web Panel

A comprehensive web-based admin panel for managing the Safire school reporting mobile app. Built with React and Material-UI, connected to the same Firebase backend as your mobile app.

## 🌟 Features

### 📊 **Dashboard**
- Real-time statistics and metrics
- Quick overview of system status
- Recent reports summary
- Key performance indicators

### 📋 **Reports Management**
- View all submitted reports
- Filter by status, priority, and category
- Update report status (pending → in progress → resolved)
- Detailed report information
- Bulk operations support

### 👥 **User Management** 
- View all registered users
- Edit user profiles and roles
- Suspend/activate user accounts
- Role-based access control
- User activity tracking

### 📈 **Analytics**
- Interactive charts and graphs
- Reports by category, status, priority
- Monthly trends and patterns
- User statistics
- Resolution rate analysis

### ⚙️ **Settings**
- Notification preferences
- System configuration
- Email SMTP setup (Super Admin only)
- Security settings

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager
- Access to the same Firebase project as your mobile app

### Installation

1. **Navigate to the admin-web directory:**
   ```bash
   cd admin-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**
   ```bash
   npm start
   # or
   yarn start
   ```

4. **Open your browser:**
   The admin panel will open at `http://localhost:3000`

## 🔐 User Roles & Access

### **Super Admin**
- Full system access
- Can manage all users and admins
- Access to system settings
- Email configuration access
- Can delete users and critical data

### **Admin**
- Can manage reports and users
- Cannot edit other admins or super admins
- Limited settings access
- Cannot delete critical data

### **Access Requirements**
- Users must have `role: 'admin'` or `role: 'super_admin'` in their Firestore user document
- Only authenticated admin users can access the web panel

## 🗃️ Firebase Setup

The admin web panel connects to the same Firebase project as your mobile app. Ensure your Firestore has the following collections:

### **Required Collections:**

1. **`reports`** - All submitted reports
   ```javascript
   {
     title: string,
     description: string,
     category: string,
     priority: string,
     status: string, // 'pending', 'in_progress', 'resolved', 'rejected'
     location: {
       building: string,
       room: string
     },
     reporterName: string,
     anonymous: boolean,
     createdAt: timestamp,
     updatedAt: timestamp
   }
   ```

2. **`users`** - User profiles with roles
   ```javascript
   {
     name: string,
     email: string,
     role: string, // 'user', 'admin', 'super_admin'
     status: string, // 'active', 'suspended'
     createdAt: timestamp,
     updatedAt: timestamp
   }
   ```

3. **`admin_settings`** - System configuration
   ```javascript
   {
     notifications: {
       emailNotifications: boolean,
       newReportAlerts: boolean,
       criticalReportAlerts: boolean,
       dailyDigest: boolean
     },
     system: {
       autoAssignReports: boolean,
       requireApproval: boolean,
       allowAnonymous: boolean,
       maxReportsPerUser: number
     }
   }
   ```

## 🛠️ Build for Production

1. **Create production build:**
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Deploy to hosting service:**
   
   **Firebase Hosting:**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

   **Netlify:**
   ```bash
   # Drag and drop the build folder to netlify.com
   # Or connect your GitHub repository
   ```

   **Vercel:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

## 📱 Integration with Mobile App

The admin web panel automatically syncs with your mobile app through Firebase real-time listeners:

### **Real-time Features:**
- ✅ Status changes reflect immediately in mobile app
- ✅ New reports appear instantly in admin panel
- ✅ User management changes sync automatically
- ✅ Statistics update in real-time

### **Mobile App Integration:**
To ensure mobile app users see status updates, make sure your mobile app listens for changes:

```javascript
// In your mobile app's report service
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'reports', reportId),
    (doc) => {
      if (doc.exists()) {
        const updatedReport = doc.data();
        // Update local state with new status
        setReportStatus(updatedReport.status);
      }
    }
  );
  return () => unsubscribe();
}, [reportId]);
```

## 🔧 Configuration

### **Firebase Configuration**
The admin panel uses the same Firebase configuration as your mobile app. The config is located in `src/firebase.js`:

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

### **Admin User Setup**
To create admin users, update their role in Firestore:

```javascript
// In Firebase Console or through code
await updateDoc(doc(db, 'users', userId), {
  role: 'admin' // or 'super_admin'
});
```

## 🎨 Customization

### **Theming**
Modify the Material-UI theme in `src/App.js`:

```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: '#your-primary-color',
    },
    secondary: {
      main: '#your-secondary-color',
    },
  },
});
```

### **Adding New Features**
1. Create new components in `src/components/`
2. Add routes in `src/App.js`
3. Update sidebar navigation in `src/components/Sidebar.js`

## 🐛 Troubleshooting

### **Common Issues:**

1. **"Permission denied" errors**
   - Check Firebase security rules
   - Ensure user has admin role in Firestore
   - Verify Firebase configuration

2. **Charts not displaying**
   - Install chart dependencies: `npm install recharts`
   - Check console for JavaScript errors

3. **Real-time updates not working**
   - Verify Firestore security rules allow reads/writes
   - Check browser network tab for WebSocket connections

4. **Build errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Update dependencies: `npm update`

### **Performance Optimization:**
- Use React.memo for expensive components
- Implement virtualization for large lists
- Add pagination for reports and users
- Use Firestore query limits

## 📊 Analytics Setup

The analytics page uses Recharts for visualizations. To add custom analytics:

1. **Create new chart components**
2. **Process Firestore data accordingly**
3. **Add to Analytics.js component**

Example custom metric:
```javascript
const getCustomMetric = () => {
  return reports.reduce((acc, report) => {
    // Your custom logic here
    return acc;
  }, {});
};
```

## 🔒 Security Considerations

1. **Firebase Security Rules:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && 
           (request.auth.uid == userId || 
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin']);
       }
       match /reports/{reportId} {
         allow read, write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
       }
     }
   }
   ```

2. **Environment Variables:**
   Create `.env` file for sensitive data:
   ```
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
   ```

3. **HTTPS Deployment:**
   Always deploy admin panels over HTTPS in production.

## 📞 Support

For issues and questions:
1. Check this documentation
2. Review Firebase console for errors
3. Check browser developer tools
4. Contact the development team

---

**Admin Web Panel Version:** 1.0.0  
**Last Updated:** August 2025  
**Compatible with:** Safire Mobile App v1.0.0
