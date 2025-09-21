# Database Schema for Intelligent Feedback System

## Firebase Collections

### 1. reports
```javascript
{
  id: "report_id",
  userId: "user_id",
  title: "Issue title",
  description: "Detailed description",
  category: "academic|infrastructure|food|it|facilities|other",
  priority: "low|medium|high|critical",
  status: "submitted|acknowledged|in_progress|resolved|closed",
  department: "IT|Facilities|Academic|Food Services|Admin",
  location: {
    building: "Building name",
    room: "Room number",
    coordinates: { lat: 0, lng: 0 }
  },
  media: ["image_urls", "video_urls", "document_urls"],
  isAnonymous: false,
  sentimentScore: 0.5, // -1 to 1
  emotion: "neutral|frustrated|satisfied|urgent",
  tags: ["wifi", "broken", "urgent"],
  assignedTo: "staff_user_id",
  createdAt: timestamp,
  updatedAt: timestamp,
  resolvedAt: timestamp,
  slaDeadline: timestamp
}
```

### 2. departments
```javascript
{
  id: "dept_id",
  name: "IT Department",
  email: "it@university.edu",
  staffMembers: ["user_id1", "user_id2"],
  categories: ["it", "network", "software"],
  slaHours: { critical: 2, high: 24, medium: 72, low: 168 },
  isActive: true
}
```

### 3. analytics
```javascript
{
  id: "analytics_id",
  date: "YYYY-MM-DD",
  totalReports: 45,
  byCategory: { it: 12, facilities: 8, academic: 25 },
  byPriority: { critical: 2, high: 8, medium: 20, low: 15 },
  avgResponseTime: 24.5, // hours
  satisfactionScore: 4.2,
  trends: ["wifi_issues_increasing", "food_complaints_decreasing"]
}
```
