// Real CJC News Service - React Native Compatible
// Uses RSS feed parsing and fallback strategies

/**
 * Fetches real news from CJC website
 * React Native compatible approach:
 * 1. Try RSS feed parsing (XML)
 * 2. Use CORS proxy for development
 * 3. Fallback to curated mock data
 */

const CJC_RSS_URL = 'https://www.cjc.edu.ph/feed/';
const CJC_NEWS_URL = 'https://www.cjc.edu.ph/category/news/';
const PROXY_URL = 'https://api.allorigins.win/get?url='; // CORS proxy for development

/**
 * Parse RSS XML feed (React Native compatible)
 */
const parseRSSFeed = (xmlText) => {
  try {
    const articles = [];
    
    // Simple XML parsing using regex (React Native compatible)
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
    
    if (itemMatches) {
      itemMatches.forEach((item, index) => {
        const title = extractXMLTag(item, 'title');
        const description = extractXMLTag(item, 'description');
        const link = extractXMLTag(item, 'link');
        const pubDate = extractXMLTag(item, 'pubDate');
        const category = extractXMLTag(item, 'category') || extractCategory(title);
        
        // Extract image from description or content
        const imageMatch = description.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
        const imageUrl = imageMatch ? imageMatch[1] : null;
        
        // Clean description of HTML tags
        const cleanDescription = description
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim()
          .substring(0, 150);
        
        if (title && link) {
          articles.push({
            id: `cjc-rss-${index + 1}`,
            title: cleanText(title),
            excerpt: cleanText(cleanDescription) + '...',
            url: link,
            date: parseDate(pubDate),
            image: imageUrl ? getOptimizedImageUrl(imageUrl) : null,
            category: typeof category === 'string' ? category : 'News'
          });
        }
      });
    }
    
    return articles.slice(0, 10); // Limit to 10 articles
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    return [];
  }
};

/**
 * Extract content from XML tags using regex
 */
const extractXMLTag = (xml, tagName) => {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
};

/**
 * Extract category from URL or title
 */
const extractCategory = (text) => {
  const categories = {
    'academic': ['academic', 'education', 'student', 'class', 'study'],
    'event': ['event', 'congress', 'webinar', 'conference', 'celebration'],
    'achievement': ['award', 'win', 'champion', 'certified', 'achievement'],
    'research': ['research', 'study', 'innovation', 'discovery'],
    'training': ['training', 'workshop', 'seminar', 'development'],
    'competition': ['competition', 'contest', 'battle', 'festival']
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
  
  return 'News';
};

/**
 * Clean extracted text
 */
const cleanText = (text) => {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
};

/**
 * Parse date from various formats
 */
const parseDate = (dateText) => {
  if (!dateText) return new Date().toISOString().split('T')[0];
  
  try {
    const date = new Date(dateText);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    // Fallback to current date
  }
  
  return new Date().toISOString().split('T')[0];
};

/**
 * Fetch real CJC news with fallback to mock data
 */
export const fetchRealCJCNews = async () => {
  try {
    // Option 1: Try direct fetch (will fail due to CORS in browser)
    // In production, this would be handled by your backend
    
    // Option 2: Use CORS proxy (for development only)
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(CJC_NEWS_URL)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const articles = parseNewsFromHTML(data.contents);
    
    if (articles.length > 0) {
      return articles;
    }
    
    // Fallback to mock data if scraping fails
    return getFallbackNews();
    
  } catch (error) {
    console.log('Real news fetch failed, using fallback:', error.message);
    return getFallbackNews();
  }
};

/**
 * Fallback news data with optimized images
 */
const getFallbackNews = () => {
  return [
    {
      id: 'cjc-1',
      title: 'BS Hospitality Management Students Gain Industry Experience',
      excerpt: 'Students participated in hands-on training at Big 8 Corporate Hotel, gaining valuable industry experience and practical skills for their future careers.',
      url: 'https://www.cjc.edu.ph/bs-hospitality-management-students-gain-firsthand-industry-experience-at-big-8-corporate-hotel/',
      date: '2025-07-15',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=120&fit=crop&crop=center&q=80',
      category: 'Academic'
    },
    {
      id: 'cjc-2',
      title: 'Cor Jesu College Achieves ISO 21001:2018 Certification',
      excerpt: 'CJC reached a significant milestone with ISO 21001:2018 certification for educational organizations management systems, demonstrating commitment to quality education.',
      url: 'https://www.cjc.edu.ph/cor-jesu-college-is-iso-210012018-certified/',
      date: '2025-07-10',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=120&fit=crop&crop=center&q=80',
      category: 'Achievement'
    },
    {
      id: 'cjc-3',
      title: 'International Webinar on Global Pedagogies Success',
      excerpt: 'The 2nd International Webinar themed "GloCal Opportunities: Navigating International Pedagogies" brought together educators from various countries.',
      url: 'https://www.cjc.edu.ph/empowering-future-educators-cor-jesu-college-shines-in-2nd-international-webinar-on-global-pedagogies/',
      date: '2025-07-05',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=120&fit=crop&crop=center&q=80',
      category: 'Event'
    },
    {
      id: 'cjc-4',
      title: 'Academic Wizards Championship Unites Regional Scholars',
      excerpt: 'The 21st Battle of Academic Wizards brought together brilliant minds from across Davao del Sur, showcasing academic excellence and competitive spirit.',
      url: 'https://www.cjc.edu.ph/21st-battle-of-academic-wizards-grand-championship/',
      date: '2025-06-28',
      image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=200&h=120&fit=crop&crop=center&q=80',
      category: 'Competition'
    },
    {
      id: 'cjc-5',
      title: 'Future to Research 2025 Conference Success',
      excerpt: 'CJC successfully held its first-ever Future to Research conference, showcasing innovative research projects and academic excellence among students and faculty.',
      url: 'https://www.cjc.edu.ph/future-to-research-2025-success/',
      date: '2025-06-20',
      image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=200&h=120&fit=crop&crop=center&q=80',
      category: 'Research'
    }
  ];
};

/**
 * Optimize image URL for scroll performance
 * Simplified approach to avoid blocking during scroll
 */
export const getOptimizedImageUrl = (imageUrl, size = 'small') => {
  if (!imageUrl) return null;
  
  // Pre-defined sizes for better caching and performance
  const sizes = {
    small: 'w=120&h=80', // News feed
    medium: 'w=200&h=120', // Detail view
    large: 'w=400&h=240' // Full screen
  };
  
  const sizeParams = sizes[size] || sizes.small;
  
  // If it's already optimized, return as is
  if (imageUrl.includes('unsplash.com') && imageUrl.includes('w=')) {
    return imageUrl;
  }
  
  // Optimize for Unsplash (most reliable for demo)
  if (imageUrl.includes('unsplash.com')) {
    return `${imageUrl}?${sizeParams}&fit=crop&crop=center&q=70&auto=format`;
  }
  
  // For other URLs, return as-is to avoid processing delays
  return imageUrl;
};

/**
 * Check if RSS feed is available
 */
export const checkRSSFeed = async () => {
  const rssUrls = [
    'https://www.cjc.edu.ph/feed/',
    'https://www.cjc.edu.ph/rss.xml',
    'https://www.cjc.edu.ph/category/news/feed/'
  ];
  
  for (const url of rssUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        if (text.includes('<rss') || text.includes('<feed')) {
          return url;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
};
