// Test AI Post Moderation
// Run this in your React Native app or Node.js environment

import PostModerationService from './services/postModerationService';

async function testModeration() {
  console.log('🧪 Testing AI Post Moderation System\n');
  
  const testCases = [
    {
      name: 'Valid School Post',
      post: {
        title: 'Midterm Schedule',
        description: 'Does anyone know when the midterm exam schedule will be released? I need to plan my study schedule.',
        media: []
      },
      expected: 'APPROVED'
    },
    {
      name: 'Explicit Keywords',
      post: {
        title: 'Angry Post',
        description: 'This is complete bullshit, the teacher is an idiot',
        media: []
      },
      expected: 'REJECTED'
    },
    {
      name: 'NSFW Content',
      post: {
        title: 'Looking for fun',
        description: 'Looking for hookups tonight, send me pics if interested',
        media: []
      },
      expected: 'REJECTED'
    },
    {
      name: 'Violence/Threats',
      post: {
        title: 'Warning',
        description: 'I am going to hurt someone tomorrow if they keep bothering me',
        media: []
      },
      expected: 'REJECTED'
    },
    {
      name: 'Spam with Links',
      post: {
        title: 'Check this out!!!',
        description: 'CLICK HERE NOW!!! http://bit.ly/abc http://tinyurl.com/xyz http://goo.gl/123 http://t.co/456 URGENT!!!',
        media: []
      },
      expected: 'REJECTED'
    },
    {
      name: 'Malicious Link',
      post: {
        title: 'Urgent',
        description: 'Your account has been suspended. Please verify immediately: http://bit.ly/verify-account',
        media: []
      },
      expected: 'REJECTED'
    },
    {
      name: 'Irrelevant Content',
      post: {
        title: 'Netflix',
        description: 'Just finished watching Stranger Things season 5, what are you guys watching this weekend?',
        media: []
      },
      expected: 'REJECTED'
    },
    {
      name: 'All Caps Spam',
      post: {
        title: 'ATTENTION!!!',
        description: 'EVERYONE LISTEN UP!!! THIS IS SUPER IMPORTANT!!! CLICK THE LINK NOW!!!',
        media: []
      },
      expected: 'REJECTED'
    },
    {
      name: 'Too Short',
      post: {
        title: 'Hi',
        description: 'Hey',
        media: []
      },
      expected: 'REJECTED'
    },
    {
      name: 'Harassment',
      post: {
        title: 'About John',
        description: 'John is such a loser, everyone should avoid him. He smells bad and nobody likes him.',
        media: []
      },
      expected: 'REJECTED'
    }
  ];

  console.log('─'.repeat(80));
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`Expected: ${testCase.expected}`);
    console.log(`Post: "${testCase.post.description.substring(0, 60)}..."`);
    
    try {
      // Quick pre-check
      const preCheck = PostModerationService.quickPreCheck(testCase.post.description);
      if (!preCheck.passed) {
        console.log(`❌ REJECTED (Pre-Check): ${preCheck.message}`);
        console.log(`Result: ${testCase.expected === 'REJECTED' ? '✅ PASS' : '❌ FAIL'}`);
        continue;
      }
      
      // Full moderation
      const result = await PostModerationService.moderatePost(testCase.post);
      
      if (result.allowed) {
        console.log(`✅ APPROVED`);
        console.log(`Result: ${testCase.expected === 'APPROVED' ? '✅ PASS' : '❌ FAIL'}`);
      } else {
        console.log(`❌ REJECTED: ${result.reason}`);
        console.log(`Violation: ${result.violationType}`);
        console.log(`Result: ${testCase.expected === 'REJECTED' ? '✅ PASS' : '❌ FAIL'}`);
      }
    } catch (error) {
      console.log(`⚠️ ERROR: ${error.message}`);
      console.log(`Result: ⚠️ ERROR`);
    }
    
    console.log('─'.repeat(80));
  }
  
  console.log('\n🎯 Test Summary:');
  console.log('If most tests show ✅ PASS, the moderation system is working correctly!');
  console.log('\nNote: Without API keys, only keyword-based checks will work.');
  console.log('Add Gemini API key for full AI-powered moderation.');
}

// Run tests
testModeration().catch(console.error);
