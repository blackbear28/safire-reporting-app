// News Service - Fetches news from CJC website
// Note: Direct web scraping is not possible in React Native due to CORS restrictions
// This service provides structured mock data based on the actual CJC website content

const NEWS_URL = 'https://www.cjc.edu.ph/category/news/';

// News Service - Enhanced with real CJC website integration
// Combines mock data with real scraping capabilities

import { fetchRealCJCNews } from './webScrapingService';

/**
 * Fetches news articles with fallback strategy
 * @returns {Promise<Array>} Array of news articles
 */
export const fetchSchoolNews = async () => {
  try {
    // Try to get real news first
    const realNews = await fetchRealCJCNews();
    
    if (realNews && realNews.length > 0) {
      console.log('✅ Successfully fetched real CJC news:', realNews.length, 'articles');
      return realNews;
    }
    
    // Fallback to enhanced mock data
    console.log('📰 Using enhanced mock news data');
    return getEnhancedMockNews();
    
  } catch (error) {
    console.error('Error in fetchSchoolNews:', error);
    return getEnhancedMockNews();
  }
};

/**
 * Enhanced mock news data with better images and content
 */
const getEnhancedMockNews = () => {
  const newsArticles = [
    {
      id: '1',
      title: 'BS Hospitality Management Students Gain Firsthand Industry Experience at Big 8 Corporate Hotel',
      excerpt: 'Students participated in hands-on training at Big 8 Corporate Hotel, gaining valuable industry experience and practical skills essential for their future careers in hospitality management.',
      url: 'https://www.cjc.edu.ph/bs-hospitality-management-students-gain-firsthand-industry-experience-at-big-8-corporate-hotel/',
      date: '2025-07-20',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Academic'
    },
    {
      id: '2',
      title: 'Cor Jesu College Achieves Prestigious ISO 21001:2018 Certification',
      excerpt: 'CJC reached a significant milestone with ISO 21001:2018 certification for educational organizations management systems, demonstrating unwavering commitment to quality education.',
      url: 'https://www.cjc.edu.ph/cor-jesu-college-is-iso-210012018-certified/',
      date: '2025-07-15',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Achievement'
    },
    {
      id: '3',
      title: 'International Webinar on Global Pedagogies Empowers Future Educators',
      excerpt: 'The 2nd International Webinar themed "GloCal Opportunities: Navigating International Pedagogies" successfully brought together educators from various countries worldwide.',
      url: 'https://www.cjc.edu.ph/empowering-future-educators-cor-jesu-college-shines-in-2nd-international-webinar-on-global-pedagogies/',
      date: '2025-07-10',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Event'
    },
    {
      id: '4',
      title: '21st Battle of Academic Wizards Unites Regional High School Scholars',
      excerpt: 'The grand championship event brought together brilliant minds from across Davao del Sur, showcasing exceptional academic excellence and competitive spirit among students.',
      url: 'https://www.cjc.edu.ph/21st-battle-of-academic-wizards-grand-championship-unites-davao-del-sur-and-occidental-high-school-scholars/',
      date: '2025-07-05',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Competition'
    },
    {
      id: '5',
      title: 'Future to Research 2025 Conference Marks Resounding Success',
      excerpt: 'CJC successfully hosted its inaugural Future to Research conference, showcasing groundbreaking research projects and fostering academic excellence among students and faculty.',
      url: 'https://www.cjc.edu.ph/future-to-research-2025-marks-a-resounding-success-at-cor-jesu-college/',
      date: '2025-06-28',
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Research'
    },
    {
      id: '6',
      title: 'CJC Administrators Participate in ASEAN Quality Improvement Training',
      excerpt: 'Five distinguished administrators from Cor Jesu College participated in the prestigious ASEAN Quality Improvement Training for Science and Technology Teachers in Ningbo, China.',
      url: 'https://www.cjc.edu.ph/cor-jesu-college-administrators-attend-asean-quality-improvement-training-for-science-and-technology-teachers/',
      date: '2025-06-20',
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Training'
    },
    {
      id: '7',
      title: 'CJC Proudly Hosts 2025 DDCCS Educator\'s Congress',
      excerpt: 'Cor Jesu College served as the distinguished host for the 2025 Diocese of Digos Commission on Catholic Schools Educator\'s Congress, uniting regional educators.',
      url: 'https://www.cjc.edu.ph/cor-jesu-college-hosts-the-2025-ddccs-educators-congress/',
      date: '2025-06-15',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Event'
    },
    {
      id: '8',
      title: 'CJC Makes History at PSITS Region 11 Short Film Festival',
      excerpt: 'Cor Jesu College achieved its first-ever championship victory at the PSITS Region 11 Interschool Short Film Festival, brilliantly showcasing student creativity and talent.',
      url: 'https://www.cjc.edu.ph/cor-jesu-college-triumphs-at-psits-region-11-short-film-festival-2024/',
      date: '2025-06-10',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Achievement'
    },
    {
      id: '9',
      title: 'CJC Students Excel in Regional Science Fair Competition',
      excerpt: 'Multiple students received prestigious recognition for their innovative science projects, demonstrating the exceptional quality of STEM education at Cor Jesu College.',
      url: 'https://www.cjc.edu.ph/science-fair-2024/',
      date: '2025-06-05',
      image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Academic'
    },
    {
      id: '10',
      title: 'New State-of-the-Art Laboratory Facilities Enhance Learning',
      excerpt: 'Cutting-edge laboratory facilities have been officially opened to provide students with superior hands-on learning opportunities across multiple academic disciplines.',
      url: 'https://www.cjc.edu.ph/new-lab-facilities-2024/',
      date: '2025-05-30',
      image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop&crop=center&q=80',
      category: 'Infrastructure'
    }
  ];

  // Simulate network delay for realistic experience
  return new Promise(resolve => {
    setTimeout(() => resolve(newsArticles), 800);
  });
};

/**
 * Formats date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatNewsDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

/**
 * Gets category color for news items
 * @param {string} category - News category
 * @returns {string} Color code
 */
export const getCategoryColor = (category) => {
  const colors = {
    'Academic': '#4A90E2',
    'Achievement': '#7ED321',
    'Event': '#F5A623',
    'Competition': '#D0021B',
    'Research': '#9013FE',
    'Training': '#50E3C2',
    'Infrastructure': '#FF6B35',
    'Announcement': '#BD10E0'
  };
  
  return colors[category] || '#666666';
};

/**
 * Extracts image URL from news article content
 * @param {string} htmlContent - HTML content of the article
 * @returns {string|null} Image URL or null
 */
export const extractImageFromContent = (htmlContent) => {
  try {
    // Simple regex to find image tags
    const imgRegex = /<img[^>]+src="([^"]+)"/i;
    const match = htmlContent.match(imgRegex);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting image:', error);
    return null;
  }
};

/**
 * Gets a fallback image based on category
 * @param {string} category - News category
 * @returns {string} Fallback image URL
 */
export const getFallbackImage = (category) => {
  const fallbackImages = {
    'Academic': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=250&fit=crop&crop=center',
    'Achievement': 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&h=250&fit=crop&crop=center',
    'Event': 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=250&fit=crop&crop=center',
    'Competition': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop&crop=center',
    'Research': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=250&fit=crop&crop=center',
    'Training': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=250&fit=crop&crop=center',
    'Announcement': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop&crop=center'
  };
  
  return fallbackImages[category] || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=250&fit=crop&crop=center';
};

// Note: For production use, you would implement actual web scraping
// using a backend service that can fetch and parse the CJC news page
// and return structured JSON data via an API endpoint.
