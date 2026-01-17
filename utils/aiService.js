// AI Service utilities for intelligent feedback processing

// Simple keyword-based categorization (can be enhanced with ML)
export const smartCategorization = (text) => {
  const keywords = {
    academic: [
      'class', 'professor', 'teacher', 'exam', 'test', 'grade', 'course', 
      'lecture', 'assignment', 'homework', 'student', 'education', 'learning',
      'curriculum', 'semester', 'credit', 'tuition', 'enrollment'
    ],
    infrastructure: [
      'building', 'elevator', 'stairs', 'lights', 'broken', 'damaged', 'repair',
      'maintenance', 'construction', 'ventilation', 'heating', 'cooling', 'hvac',
      'plumbing', 'electrical', 'door', 'window', 'roof', 'wall'
    ],
    food: [
      'cafeteria', 'dining', 'food', 'meal', 'kitchen', 'restaurant', 'menu',
      'lunch', 'dinner', 'breakfast', 'quality', 'taste', 'hygiene', 'service',
      'price', 'portion', 'vegetarian', 'allergic', 'nutrition'
    ],
    it: [
      'wifi', 'internet', 'computer', 'network', 'password', 'login', 'system',
      'website', 'app', 'software', 'hardware', 'server', 'email', 'portal',
      'database', 'backup', 'security', 'virus', 'update', 'technical'
    ],
    facilities: [
      'restroom', 'parking', 'security', 'cleaning', 'library', 'gym',
      'sports', 'recreation', 'dormitory', 'hostel', 'laundry', 'transport',
      'bus', 'accessibility', 'disability', 'safety', 'emergency'
    ],
    administrative: [
      'office', 'staff', 'service', 'procedure', 'process', 'form', 'document',
      'certificate', 'registration', 'admission', 'fee', 'payment', 'billing',
      'refund', 'policy', 'rule', 'regulation', 'deadline'
    ]
  };

  const lowerText = text.toLowerCase();
  let scores = {};
  
  // Calculate score for each category
  Object.entries(keywords).forEach(([category, words]) => {
    scores[category] = words.filter(word => lowerText.includes(word)).length;
  });

  // Find category with highest score
  const maxCategory = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );

  return scores[maxCategory] > 0 ? maxCategory : 'other';
};

// Priority detection based on keywords and sentiment
export const detectPriority = (text) => {
  const urgencyKeywords = {
    critical: [
      'emergency', 'urgent', 'critical', 'dangerous', 'safety', 'hazard',
      'fire', 'flood', 'broken', 'not working', 'completely down', 'severe',
      'immediate', 'asap', 'help', 'serious', 'major', 'crisis'
    ],
    high: [
      'important', 'soon', 'quickly', 'problem', 'issue', 'concern',
      'trouble', 'difficulty', 'unable', 'cannot', 'failed', 'error',
      'bug', 'fault', 'malfunction', 'significant'
    ],
    medium: [
      'improvement', 'suggestion', 'enhancement', 'better', 'could',
      'would like', 'recommend', 'propose', 'consider', 'minor'
    ],
    low: [
      'eventually', 'when possible', 'future', 'someday', 'maybe',
      'optional', 'nice to have', 'cosmetic', 'feedback', 'comment'
    ]
  };

  const lowerText = text.toLowerCase();
  
  // Check for critical keywords first
  for (const [priority, keywords] of Object.entries(urgencyKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return priority;
    }
  }

  return 'medium'; // default priority
};

// Enhanced sentiment analysis
export const analyzeSentiment = (text) => {
  const sentimentWords = {
    positive: [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'satisfied', 'happy', 'pleased', 'love', 'like', 'appreciate',
      'helpful', 'friendly', 'efficient', 'quick', 'fast', 'easy',
      'clean', 'comfortable', 'professional', 'quality', 'perfect'
    ],
    negative: [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike',
      'frustrated', 'angry', 'annoyed', 'disappointed', 'unhappy',
      'slow', 'difficult', 'hard', 'complicated', 'confusing', 'dirty',
      'uncomfortable', 'unprofessional', 'poor', 'broken', 'wrong'
    ],
    neutral: [
      'okay', 'fine', 'normal', 'average', 'standard', 'regular',
      'typical', 'usual', 'moderate', 'fair', 'adequate'
    ]
  };

  const emotions = {
    frustrated: ['frustrated', 'annoyed', 'irritated', 'fed up', 'angry'],
    urgent: ['urgent', 'emergency', 'immediate', 'asap', 'quickly'],
    satisfied: ['satisfied', 'happy', 'pleased', 'content', 'glad'],
    confused: ['confused', 'unclear', 'don\'t understand', 'complicated'],
    disappointed: ['disappointed', 'let down', 'expected better', 'hoped']
  };

  const lowerText = text.toLowerCase();
  
  // Calculate sentiment scores
  const positiveScore = sentimentWords.positive.filter(word => 
    lowerText.includes(word)).length;
  const negativeScore = sentimentWords.negative.filter(word => 
    lowerText.includes(word)).length;

  // Determine overall sentiment
  let sentiment = 'neutral';
  let score = 0;
  
  if (negativeScore > positiveScore) {
    sentiment = 'negative';
    score = -Math.min(negativeScore / 10, 1); // Normalize to -1 to 0
  } else if (positiveScore > negativeScore) {
    sentiment = 'positive';
    score = Math.min(positiveScore / 10, 1); // Normalize to 0 to 1
  }

  // Detect specific emotions
  let emotion = 'neutral';
  for (const [emotionType, keywords] of Object.entries(emotions)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      emotion = emotionType;
      break;
    }
  }

  return {
    sentiment,
    score,
    emotion,
    confidence: Math.abs(score)
  };
};

// Extract relevant tags from text
export const extractTags = (text) => {
  const commonTags = [
    'wifi', 'internet', 'computer', 'broken', 'maintenance', 'urgent',
    'food', 'cafeteria', 'parking', 'security', 'cleaning', 'library',
    'gym', 'restroom', 'elevator', 'hvac', 'lighting', 'professor',
    'class', 'exam', 'registration', 'payment', 'billing', 'website',
    'app', 'mobile', 'desktop', 'slow', 'fast', 'quality', 'service'
  ];

  const lowerText = text.toLowerCase();
  return commonTags.filter(tag => lowerText.includes(tag));
};

// Smart department routing
export const routeToDepartment = (category, priority, location) => {
  const departmentMapping = {
    academic: {
      name: 'Academic Affairs',
      email: 'academic@university.edu',
      sla: { critical: 4, high: 24, medium: 72, low: 168 }
    },
    infrastructure: {
      name: 'Facilities Management',
      email: 'facilities@university.edu',
      sla: { critical: 2, high: 8, medium: 48, low: 120 }
    },
    food: {
      name: 'Food Services',
      email: 'foodservices@university.edu',
      sla: { critical: 2, high: 12, medium: 48, low: 96 }
    },
    it: {
      name: 'IT Support',
      email: 'itsupport@university.edu',
      sla: { critical: 1, high: 4, medium: 24, low: 72 }
    },
    facilities: {
      name: 'Campus Facilities',
      email: 'campusfacilities@university.edu',
      sla: { critical: 2, high: 8, medium: 48, low: 120 }
    },
    administrative: {
      name: 'Administration',
      email: 'admin@university.edu',
      sla: { critical: 4, high: 24, medium: 72, low: 168 }
    }
  };

  const department = departmentMapping[category] || departmentMapping.administrative;
  const slaHours = department.sla[priority] || 72;
  
  return {
    ...department,
    slaDeadline: new Date(Date.now() + slaHours * 60 * 60 * 1000),
    estimatedResponse: `${slaHours} hours`
  };
};

// Generate automated response suggestions
export const generateResponseSuggestions = (category, sentiment) => {
  const suggestions = {
    academic: {
      positive: "Thank you for your positive feedback about our academic services!",
      negative: "We apologize for the academic service issues you've experienced. We'll review this with the relevant department.",
      neutral: "Thank you for bringing this academic matter to our attention."
    },
    infrastructure: {
      positive: "We're glad our facilities are meeting your needs!",
      negative: "We apologize for the infrastructure issues. Our maintenance team will investigate immediately.",
      neutral: "Thank you for reporting this infrastructure matter."
    },
    it: {
      positive: "Great to hear our IT services are working well for you!",
      negative: "We apologize for the technical difficulties. Our IT team will address this priority issue.",
      neutral: "Thanks for reporting this technical issue."
    }
  };

  return suggestions[category]?.[sentiment] || 
         "Thank you for your feedback. We'll review this matter promptly.";
};

// Duplicate report detection (simple implementation)
export const detectDuplicates = async (newReport, existingReports) => {
  const similarity = (str1, str2) => {
    const words1 = str1.toLowerCase().split(' ');
    const words2 = str2.toLowerCase().split(' ');
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    return intersection.length / union.length;
  };

  const potentialDuplicates = existingReports.filter(report => {
    const titleSimilarity = similarity(newReport.title, report.title);
    const descSimilarity = similarity(newReport.description, report.description);
    const categoryMatch = newReport.category === report.category;
    
    // Consider as potential duplicate if high similarity and same category
    return (titleSimilarity > 0.6 || descSimilarity > 0.4) && categoryMatch;
  });

  return potentialDuplicates;
};
