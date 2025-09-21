// services/chatbotService.js
import { ReportService } from './reportService';

export class ChatbotService {
  
  // Predefined responses for common questions
  static commonResponses = {
    greeting: [
      "Hello! I'm here to help you with your campus reports and questions. How can I assist you today?",
      "Hi there! Need help with submitting a report or have questions about campus services?",
      "Welcome! I can help you navigate the reporting system or answer questions about campus facilities."
    ],
    
    reporting: [
      "To submit a report, tap the '+' button in the bottom navigation or use the 'Submit Report' quick action on the home screen.",
      "You can report issues about academic matters, infrastructure, food services, IT problems, or general facilities.",
      "For urgent issues, please mark your report as 'Critical' priority. Emergency situations should be reported to campus security directly."
    ],
    
    status: [
      "You can check your report status in the Dashboard section. Reports go through: Pending → In Progress → Resolved.",
      "Most reports are reviewed within 24-48 hours. Critical issues are prioritized and handled within 2 hours.",
      "You'll receive updates when your report status changes or when staff respond to it."
    ],
    
    categories: [
      "We handle reports in these categories: Academic (classes, grades), Infrastructure (buildings, repairs), Food Services (cafeteria, dining), IT (wifi, computers), and General Facilities (parking, cleaning).",
      "Choose the category that best fits your issue. Our AI will help suggest the right category based on your description."
    ],
    
    anonymous: [
      "Yes, you can submit reports anonymously! Just check the 'Submit anonymously' option when creating your report.",
      "Anonymous reports are treated with the same priority as named reports. However, we won't be able to follow up with you directly."
    ],
    
    contact: [
      "For urgent matters, contact Campus Security at (555) 123-4567. For general inquiries, email support@campus.edu.",
      "You can also visit the Student Services office in the Administration Building, Room 101."
    ],
    
    fallback: [
      "I'm not sure I understood that. Can you try rephrasing your question?",
      "I can help you with reporting issues, checking status, or general campus questions. What would you like to know?",
      "That's a great question! For complex issues, I'd recommend contacting our support team directly."
    ]
  };

  // Keywords for intent recognition
  static intentKeywords = {
    greeting: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'],
    reporting: ['submit', 'report', 'create', 'new report', 'how to report', 'file complaint'],
    status: ['status', 'check', 'progress', 'update', 'when', 'how long'],
    categories: ['category', 'type', 'what can i report', 'options', 'kinds'],
    anonymous: ['anonymous', 'private', 'without name', 'confidential'],
    contact: ['contact', 'phone', 'email', 'support', 'help desk', 'emergency'],
    stats: ['statistics', 'numbers', 'how many', 'total reports', 'analytics']
  };

  // Process user message and return appropriate response
  static async processMessage(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Detect intent
    const intent = this.detectIntent(lowerMessage);
    
    // Get response based on intent
    let response = await this.getResponse(intent, lowerMessage);
    
    // Add contextual information if needed
    if (intent === 'stats') {
      const stats = await this.getQuickStats();
      response += `\n\n📊 Current Stats:\n${stats}`;
    }
    
    return {
      message: response,
      intent: intent,
      timestamp: new Date(),
      suggestions: this.getSuggestions(intent)
    };
  }

  // Detect user intent from message
  static detectIntent(message) {
    let bestMatch = 'fallback';
    let maxMatches = 0;
    
    Object.entries(this.intentKeywords).forEach(([intent, keywords]) => {
      const matches = keywords.filter(keyword => message.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = intent;
      }
    });
    
    return bestMatch;
  }

  // Get response for detected intent
  static async getResponse(intent, message) {
    const responses = this.commonResponses[intent] || this.commonResponses.fallback;
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Add specific handling for certain intents
    switch (intent) {
      case 'reporting':
        if (message.includes('urgent') || message.includes('emergency')) {
          return "For urgent issues, please mark your report as 'Critical' priority when submitting. " + randomResponse;
        }
        break;
      
      case 'status':
        if (message.includes('my report') || message.includes('my reports')) {
          return "To check your specific reports, go to the Dashboard and look at the 'Recent Reports' section. " + randomResponse;
        }
        break;
    }
    
    return randomResponse;
  }

  // Get conversation suggestions based on intent
  static getSuggestions(intent) {
    const suggestions = {
      greeting: [
        "How do I submit a report?",
        "Check report status",
        "What can I report?",
        "Contact information"
      ],
      reporting: [
        "What categories are available?",
        "Can I submit anonymously?",
        "How to add photos?",
        "Priority levels explained"
      ],
      status: [
        "How long does it take?",
        "Report categories",
        "Update notifications",
        "Contact support"
      ],
      categories: [
        "Submit new report",
        "Anonymous reporting",
        "Priority levels",
        "Contact support"
      ],
      anonymous: [
        "Submit anonymous report",
        "Privacy policy",
        "Other reporting options",
        "Contact support"
      ],
      contact: [
        "Submit new report",
        "Check report status",
        "FAQ",
        "Report categories"
      ],
      fallback: [
        "Submit a report",
        "Check report status",
        "Contact information",
        "Available categories"
      ]
    };
    
    return suggestions[intent] || suggestions.fallback;
  }

  // Get quick stats for chatbot responses
  static async getQuickStats() {
    try {
      const stats = await ReportService.getReportsStats();
      return `• Total Reports: ${stats.total}
• Pending: ${stats.pending}
• In Progress: ${stats.inProgress}
• Resolved: ${stats.resolved}`;
    } catch (error) {
      return "Stats temporarily unavailable.";
    }
  }

  // Handle specific report queries
  static async handleReportQuery(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('my reports') || lowerMessage.includes('my report')) {
      return {
        message: "I can't access your personal reports for privacy reasons. Please check the Dashboard tab to view your submitted reports and their current status.",
        intent: 'personal_reports',
        suggestions: ["Open Dashboard", "Submit new report", "Contact support", "Report categories"]
      };
    }
    
    if (lowerMessage.includes('latest') || lowerMessage.includes('recent')) {
      // This would require authentication to show user-specific data
      return {
        message: "To see the latest reports from the campus community, check the Home feed. To see your personal reports, visit the Dashboard.",
        intent: 'recent_reports',
        suggestions: ["View Home feed", "Open Dashboard", "Submit new report", "Contact support"]
      };
    }
    
    return null;
  }

  // Get FAQ responses
  static getFAQ() {
    return [
      {
        question: "How do I submit a report?",
        answer: "Tap the '+' button in the bottom navigation or use the 'Submit Report' button on the home screen. Fill in the details and tap 'Submit Report'."
      },
      {
        question: "Can I submit reports anonymously?",
        answer: "Yes! Just check the 'Submit anonymously' checkbox when creating your report. Your identity will be kept private."
      },
      {
        question: "How long does it take to get a response?",
        answer: "Most reports are reviewed within 24-48 hours. Critical issues are prioritized and handled within 2 hours."
      },
      {
        question: "What types of issues can I report?",
        answer: "You can report academic issues, infrastructure problems, food service concerns, IT problems, and general facility issues."
      },
      {
        question: "How do I check my report status?",
        answer: "Go to the Dashboard tab to view all your submitted reports and their current status."
      }
    ];
  }
}
