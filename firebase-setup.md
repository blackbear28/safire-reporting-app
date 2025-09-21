# Firebase Setup Guide

## 1. Firestore Collections Setup

### Go to Firebase Console > Firestore Database and create these collections:

#### Collection: `reports`
```javascript
// Sample document structure
{
  id: "auto-generated",
  userId: "user123",
  title: "Wi-Fi issues in library",
  description: "Internet connection is very slow during peak hours",
  category: "it",
  priority: "medium",
  status: "submitted",
  department: "IT Department",
  location: {
    building: "Main Library",
    room: "Study Hall A",
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  media: ["url1", "url2"],
  isAnonymous: false,
  sentimentScore: 0.2,
  emotion: "frustrated",
  tags: ["wifi", "slow", "library"],
  assignedTo: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  resolvedAt: null,
  slaDeadline: futureTimestamp()
}
```

#### Collection: `users`
```javascript
// Sample document structure
{
  id: "auto-generated",
  name: "John Doe",
  email: "john@university.edu",
  username: "johndoe",
  mobile: "+1234567890",
  studentId: "STU2024001",
  role: "student", // student, staff, admin
  department: "Computer Science",
  createdAt: serverTimestamp(),
  profilePic: "url",
  isActive: true
}
```

#### Collection: `departments`
```javascript
// Sample document structure
{
  id: "auto-generated",
  name: "IT Department",
  email: "it@university.edu",
  staffMembers: ["userId1", "userId2"],
  categories: ["it", "network", "software"],
  slaHours: { critical: 2, high: 24, medium: 72, low: 168 },
  isActive: true
}
```

## 2. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reports collection
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         hasRole('admin') || hasRole('staff'));
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
      allow read: if request.auth != null && hasRole('admin');
    }
    
    // Departments collection
    match /departments/{deptId} {
      allow read: if request.auth != null;
      allow write: if hasRole('admin');
    }
    
    // Helper function to check user roles
    function hasRole(role) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
  }
}
```

## 3. Environment Variables (.env)
Create a `.env` file in your project root:
```
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
OPENAI_API_KEY=your-openai-api-key  # For chatbot
SENTIMENT_API_KEY=your-sentiment-api-key  # Optional
```
