// services/chatbotService.js
import { ReportService } from './reportService';

// AI Model Configuration - Using Google Gemini (Free tier available)
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Get free key from https://makersuite.google.com/app/apikey
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Alternative: OpenAI API (Paid)
// const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';
// const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export class ChatbotService {
  
  // System context for AI model
  static systemContext = `You are a helpful campus assistant chatbot for Cor Jesu College. 
Your role is to help students and staff with:
- Submitting incident reports (academic issues, infrastructure, food services, IT problems, facilities)
- Checking report status and progress
- Providing information about campus services
- Answering questions about the reporting system

Keep responses concise (2-3 sentences), friendly, and helpful. 
If you don't know something specific, direct users to contact support@campus.edu or call (555) 123-4567.

Available report categories: Academic, Infrastructure, Food Services, IT, Facilities
Report priorities: Critical (2hr response), High (24hr), Medium (48hr), Low (72hr)
Reports go through stages: Pending → In Progress → Resolved`;

  // Check if AI model is configured
  static isAIEnabled = () => {
    return GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY';
  };

  // Process message with AI model (Gemini)
  static async processWithGeminiAI(message, conversationHistory = []) {
    try {
      // Build conversation context
      const context = conversationHistory.length > 0 
        ? conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\n'
        : '';
      
      const prompt = `${this.systemContext}\n\n${context}User: ${message}\nAssistant:`;
      
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            topP: 0.9,
            topK: 40
          }
        })
      });

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      
      throw new Error('Invalid AI response');
    } catch (error) {
      console.error('AI processing error:', error);
      throw error;
    }
  }

  // Process message with OpenAI (Alternative)
  static async processWithOpenAI(message, conversationHistory = []) {
    try {
      const messages = [
        { role: 'system', content: this.systemContext },
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 200,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      
      throw new Error('Invalid AI response');
    } catch (error) {
      console.error('AI processing error:', error);
      throw error;
    }
  }
  
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
  static async processMessage(message, conversationHistory = []) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Try AI model first if configured
    if (this.isAIEnabled()) {
      try {
        const aiResponse = await this.processWithGeminiAI(message, conversationHistory);
        
        // Add stats if user asks about them
        let finalResponse = aiResponse;
        if (lowerMessage.includes('statistic') || lowerMessage.includes('how many') || lowerMessage.includes('total')) {
          const stats = await this.getQuickStats();
          finalResponse += `\n\n📊 Current Stats:\n${stats}`;
        }
        
        return {
          message: finalResponse,
          intent: 'ai_generated',
          timestamp: new Date(),
          suggestions: this.getSmartSuggestions(message),
          isAI: true
        };
      } catch (error) {
        console.log('AI failed, falling back to rule-based:', error);
        // Fall through to rule-based system
      }
    }
    
    // Fallback to rule-based system
    const intent = this.detectIntent(lowerMessage);
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
      suggestions: this.getSuggestions(intent),
      isAI: false
    };
  }

  // Generate smart suggestions based on message content
  static getSmartSuggestions(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('report') || lower.includes('submit')) {
      return ["Submit new report", "Report categories", "Anonymous reporting", "Priority levels"];
    }
    if (lower.includes('status') || lower.includes('check')) {
      return ["Open Dashboard", "Notification settings", "Report timeline", "Contact support"];
    }
    if (lower.includes('urgent') || lower.includes('emergency')) {
      return ["Submit critical report", "Campus security", "Emergency contacts", "Report status"];
    }
    
    return ["Submit a report", "Check report status", "Contact support", "View categories"];
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
