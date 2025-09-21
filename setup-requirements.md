# Required Dependencies for Intelligent Feedback System

## Install these packages:

```bash
# Core functionality
npm install expo-location expo-permissions

# AI/ML capabilities (optional - for advanced features)
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native

# Charts and visualization
npm install react-native-chart-kit react-native-svg

# Advanced date handling
npm install date-fns

# Push notifications
npm install expo-notifications

# Additional Firebase features
npm install firebase/storage  # For file uploads
```

## Firebase Setup Requirements:

1. **Enable Firestore Collections:**
   - reports
   - departments  
   - users
   - analytics
   - notifications

2. **Storage Rules for Media Uploads:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reports/{reportId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. **Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reports/{reportId} {
      allow read, write: if request.auth != null;
      allow read: if resource.data.isAnonymous == true;
    }
    
    match /departments/{deptId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.admin == true;
    }
  }
}
```

## Optional AI Services Integration:

### 1. Google Cloud Natural Language API
- For advanced sentiment analysis
- Text classification
- Entity extraction

### 2. OpenAI API
- For intelligent response suggestions
- Text summarization
- Smart categorization

### 3. Firebase ML Kit
- On-device text recognition
- Image labeling
- Language identification

## Environment Variables (.env):

```
OPENAI_API_KEY=your_openai_key_here
GOOGLE_CLOUD_API_KEY=your_google_cloud_key
GEMINI_API_KEY=your_gemini_key
```
