// False Report Detection System
// This module provides AI-like logic to detect potential false positive reports

/**
 * Analyzes a report to determine if it might be a false positive
 * @param {Object} report - The report object to analyze
 * @param {Array} userHistory - Previous reports by the same user
 * @returns {Object} - Analysis result with confidence score and reasons
 */
export const analyzePotentialFalseReport = (report, userHistory = []) => {
  const suspiciousFactors = [];
  let suspicionScore = 0;

  // Factor 1: Report content analysis
  const contentAnalysis = analyzeReportContent(report);
  suspicionScore += contentAnalysis.score;
  if (contentAnalysis.reasons.length > 0) {
    suspiciousFactors.push(...contentAnalysis.reasons);
  }

  // Factor 2: User behavior analysis
  const behaviorAnalysis = analyzeUserBehavior(report, userHistory);
  suspicionScore += behaviorAnalysis.score;
  if (behaviorAnalysis.reasons.length > 0) {
    suspiciousFactors.push(...behaviorAnalysis.reasons);
  }

  // Factor 3: Timing analysis
  const timingAnalysis = analyzeReportTiming(report, userHistory);
  suspicionScore += timingAnalysis.score;
  if (timingAnalysis.reasons.length > 0) {
    suspiciousFactors.push(...timingAnalysis.reasons);
  }

  // Factor 4: Location analysis
  const locationAnalysis = analyzeReportLocation(report, userHistory);
  suspicionScore += locationAnalysis.score;
  if (locationAnalysis.reasons.length > 0) {
    suspiciousFactors.push(...locationAnalysis.reasons);
  }

  // Calculate final confidence
  const maxPossibleScore = 100;
  const confidencePercentage = Math.min((suspicionScore / maxPossibleScore) * 100, 100);

  return {
    isSuspicious: suspicionScore >= 40, // Threshold for flagging
    confidencePercentage: Math.round(confidencePercentage),
    suspicionScore,
    suspiciousFactors,
    riskLevel: getRiskLevel(suspicionScore),
    recommendation: getRecommendation(suspicionScore, suspiciousFactors)
  };
};

/**
 * Analyzes the content of the report for suspicious patterns
 */
const analyzeReportContent = (report) => {
  const reasons = [];
  let score = 0;

  const description = (report.description || '').toLowerCase();
  const title = (report.title || '').toLowerCase();
  const combinedText = `${title} ${description}`;

  // Check for spam keywords
  const spamKeywords = [
    'test', 'testing', 'fake', 'joke', 'lol', 'haha', 'nothing', 'none',
    'asdf', 'qwerty', '123', 'abcd', 'xyz', 'random', 'spam'
  ];

  const foundSpamWords = spamKeywords.filter(keyword => 
    combinedText.includes(keyword)
  );

  if (foundSpamWords.length > 0) {
    score += 25;
    reasons.push(`Contains spam-like keywords: ${foundSpamWords.join(', ')}`);
  }

  // Check for very short descriptions
  if (description.length < 10 && description.length > 0) {
    score += 15;
    reasons.push('Report description is suspiciously short');
  }

  // Check for repetitive characters
  const repetitivePattern = /(.)\1{4,}/g;
  if (repetitivePattern.test(combinedText)) {
    score += 20;
    reasons.push('Contains repetitive character patterns');
  }

  // Check for all caps (angry/spam behavior)
  const capsRatio = (combinedText.match(/[A-Z]/g) || []).length / combinedText.length;
  if (capsRatio > 0.7 && combinedText.length > 10) {
    score += 10;
    reasons.push('Excessive use of capital letters');
  }

  // Check for nonsensical content
  const wordCount = combinedText.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount < 3) {
    score += 15;
    reasons.push('Very few words in report');
  }

  return { score, reasons };
};

/**
 * Analyzes user behavior patterns
 */
const analyzeUserBehavior = (report, userHistory) => {
  const reasons = [];
  let score = 0;

  if (!userHistory || userHistory.length === 0) {
    return { score: 0, reasons: [] };
  }

  // Check for rapid consecutive reports
  const recentReports = userHistory.filter(r => {
    const reportTime = r.createdAt?.toDate?.() || new Date(r.createdAt);
    const currentTime = report.createdAt?.toDate?.() || new Date(report.createdAt);
    const timeDiff = Math.abs(currentTime - reportTime) / (1000 * 60); // minutes
    return timeDiff < 30; // Reports within 30 minutes
  });

  if (recentReports.length >= 3) {
    score += 30;
    reasons.push(`Multiple reports (${recentReports.length}) submitted within 30 minutes`);
  }

  // Check for duplicate or near-duplicate reports
  const similarReports = userHistory.filter(r => {
    const similarity = calculateTextSimilarity(
      (report.description || '').toLowerCase(),
      (r.description || '').toLowerCase()
    );
    return similarity > 0.8;
  });

  if (similarReports.length > 0) {
    score += 25;
    reasons.push('Similar or duplicate reports found in user history');
  }

  // Check if user has high false report rate
  const falseReports = userHistory.filter(r => r.isFalsePositive).length;
  const totalReports = userHistory.length;
  const falseReportRate = totalReports > 0 ? falseReports / totalReports : 0;

  if (falseReportRate > 0.5 && totalReports >= 3) {
    score += 35;
    reasons.push(`High false report rate: ${Math.round(falseReportRate * 100)}%`);
  }

  return { score, reasons };
};

/**
 * Analyzes timing patterns of reports
 */
const analyzeReportTiming = (report, userHistory) => {
  const reasons = [];
  let score = 0;

  const reportTime = report.createdAt?.toDate?.() || new Date(report.createdAt);
  const hour = reportTime.getHours();

  // Check for reports at unusual hours (very late night/early morning)
  if (hour >= 2 && hour <= 5) {
    score += 10;
    reasons.push('Report submitted at unusual hours (2-5 AM)');
  }

  // Check for weekend reports (might be less legitimate)
  const dayOfWeek = reportTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
    score += 5;
    reasons.push('Report submitted on weekend');
  }

  return { score, reasons };
};

/**
 * Analyzes location patterns
 */
const analyzeReportLocation = (report, userHistory) => {
  const reasons = [];
  let score = 0;

  if (!report.location) {
    score += 5;
    reasons.push('No location specified');
    return { score, reasons };
  }

  // Check for reports from same location repeatedly
  const sameLocationReports = userHistory.filter(r => {
    return r.location && 
           r.location.building === report.location.building &&
           r.location.room === report.location.room;
  });

  if (sameLocationReports.length >= 3) {
    score += 15;
    reasons.push(`Multiple reports from same location: ${report.location.building} - ${report.location.room}`);
  }

  return { score, reasons };
};

/**
 * Simple text similarity calculation
 */
const calculateTextSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;
  
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

/**
 * Determines risk level based on suspicion score
 */
const getRiskLevel = (score) => {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'NONE';
};

/**
 * Provides recommendation based on analysis
 */
const getRecommendation = (score, factors) => {
  if (score >= 70) {
    return {
      action: 'IMMEDIATE_REVIEW',
      message: 'This report shows high signs of being false. Immediate manual review recommended.',
      autoFlag: true
    };
  } else if (score >= 40) {
    return {
      action: 'CAREFUL_REVIEW',
      message: 'This report shows moderate signs of being false. Careful review recommended.',
      autoFlag: false
    };
  } else if (score >= 20) {
    return {
      action: 'MONITOR',
      message: 'Some suspicious factors detected. Monitor user behavior.',
      autoFlag: false
    };
  } else {
    return {
      action: 'NORMAL',
      message: 'Report appears legitimate.',
      autoFlag: false
    };
  }
};

/**
 * Auto-flag reports that meet certain criteria
 */
export const shouldAutoFlag = (analysisResult) => {
  return analysisResult.suspicionScore >= 80 || 
         analysisResult.recommendation.autoFlag;
};

/**
 * Generate a summary report for administrators
 */
export const generateAnalysisSummary = (analysisResult) => {
  return {
    verdict: analysisResult.isSuspicious ? 'SUSPICIOUS' : 'LEGITIMATE',
    confidence: `${analysisResult.confidencePercentage}%`,
    riskLevel: analysisResult.riskLevel,
    mainConcerns: analysisResult.suspiciousFactors.slice(0, 3), // Top 3 concerns
    recommendation: analysisResult.recommendation.message
  };
};
