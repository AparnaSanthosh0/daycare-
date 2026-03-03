const OpenAI = require('openai');

// Initialize OpenAI client
let openai = null;

const initializeOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

/**
 * Process parent query using GPT API
 * @param {string} query - Parent's question or query
 * @param {Object} context - Additional context (child info, history, etc.)
 * @returns {Promise<Object>} - Response with answer and metadata
 */
const processParentQuery = async (query, context = {}) => {
  try {
    const client = initializeOpenAI();
    
    if (!client) {
      return buildFallbackResponse(query);
    }

    // Build context message
    let systemMessage = `You are a helpful assistant for TinyTots Daycare Center. 
You assist parents with questions about:
- Child care policies and procedures
- Daily activities and meal plans
- Appointment scheduling and billing
- Health and safety protocols
- Communication with staff
- Transport and pickup/drop-off arrangements

Be friendly, professional, and concise. If you don't know something specific to this daycare, 
suggest they contact the staff directly.`;

    if (context.childName) {
      systemMessage += `\n\nYou are currently helping a parent of ${context.childName}.`;
    }

    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: query }
    ];

    // Add conversation history if provided
    if (context.conversationHistory && Array.isArray(context.conversationHistory)) {
      const historyMessages = context.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      messages.splice(1, 0, ...historyMessages);
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    return {
      success: true,
      answer: completion.choices[0].message.content,
      usage: {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      },
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Error processing parent query:', error.message || error);
    return buildFallbackResponse(query);
  }
};

/**
 * Build a comprehensive 24/7 keyword-based fallback response (no OpenAI needed)
 * Provides helpful guidance on all parent needs
 */
const buildFallbackResponse = (query) => {
  const queryLower = (query || '').toLowerCase();
  let answer;

  // OPERATING HOURS & SCHEDULE
  if (queryLower.includes('hour') || queryLower.includes('time') || queryLower.includes('open') || queryLower.includes('close') || queryLower.includes('schedule') || queryLower.includes('when')) {
    answer = "🕐 **TinyTots Operating Hours:**\n\n" +
      "• Monday - Friday: 7:00 AM - 6:00 PM\n" +
      "• Weekends & Holidays: Closed\n" +
      "• Drop-off: 7:00 AM - 9:00 AM\n" +
      "• Pickup: 4:00 PM - 6:00 PM\n\n" +
      "For special schedule requests or early drop-off arrangements, please contact our administration team.";
  }
  
  // MEALS & NUTRITION
  else if (queryLower.includes('meal') || queryLower.includes('food') || queryLower.includes('lunch') || queryLower.includes('breakfast') || queryLower.includes('snack') || queryLower.includes('nutrition') || queryLower.includes('diet') || queryLower.includes('allerg')) {
    answer = "🍎 **Meals & Nutrition:**\n\n" +
      "• **Breakfast:** 8:00 AM (healthy grains, fruits, milk)\n" +
      "• **Lunch:** 12:00 PM (balanced protein, vegetables, grains)\n" +
      "• **Snacks:** 10:00 AM & 3:00 PM (fruits, healthy treats)\n\n" +
      "📋 View current meal plans in your dashboard → Meals tab\n" +
      "🔔 Meal plan approval required for special occasions\n" +
      "⚠️ For allergies or dietary restrictions, update your child's profile or contact our nutrition staff.";
  }
  
  // BILLING & PAYMENTS
  else if (queryLower.includes('fee') || queryLower.includes('payment') || queryLower.includes('billing') || queryLower.includes('invoice') || queryLower.includes('cost') || queryLower.includes('price') || queryLower.includes('charge') || queryLower.includes('pay')) {
    answer = "💳 **Billing & Payments:**\n\n" +
      "• View invoices: Dashboard → Billing tab\n" +
      "• Payment methods: Credit card, bank transfer\n" +
      "• Monthly fees are due by the 5th of each month\n" +
      "• Late payment fee: $25 after 10 days\n\n" +
      "📧 For payment questions or issues, contact billing@tinytots.com\n" +
      "💰 Discounts available for siblings and annual prepayment.";
  }
  
  // DOCTOR APPOINTMENTS & MEDICAL
  else if (queryLower.includes('appointment') || queryLower.includes('doctor') || queryLower.includes('medical') || queryLower.includes('health') || queryLower.includes('sick') || queryLower.includes('medicine') || queryLower.includes('checkup')) {
    answer = "🏥 **Medical Services & Appointments:**\n\n" +
      "• Schedule doctor appointments: Dashboard → Doctor Appointments\n" +
      "• On-site medical staff available daily\n" +
      "• Emergency medical contact: Call (555) 123-4567\n" +
      "• Vaccination records: Dashboard → Health tab\n\n" +
      "⚕️ If your child is sick, please keep them home and notify us.\n" +
      "📋 Regular health checkups are recommended every 3 months.";
  }
  
  // TRANSPORTATION
  else if (queryLower.includes('transport') || queryLower.includes('pickup') || queryLower.includes('drop') || queryLower.includes('bus') || queryLower.includes('ride') || queryLower.includes('car') || queryLower.includes('driver')) {
    answer = "🚌 **Transportation Services:**\n\n" +
      "• Door-to-door pickup & drop-off available\n" +
      "• Track bus location in real-time: Dashboard → Transport\n" +
      "• Morning pickup: 6:30 AM - 7:30 AM\n" +
      "• Evening drop-off: 5:30 PM - 6:30 PM\n\n" +
      "📍 Update pickup/drop-off addresses in your profile\n" +
      "🔔 Receive notifications when your child is picked up/dropped off\n" +
      "📞 Driver contact available in Transport section.";
  }
  
  // MILESTONES & DEVELOPMENT
  else if (queryLower.includes('milestone') || queryLower.includes('development') || queryLower.includes('growth') || queryLower.includes('progress') || queryLower.includes('skill') || queryLower.includes('learn')) {
    answer = "🎯 **Milestones & Development:**\n\n" +
      "• Track developmental milestones: Dashboard → Milestones\n" +
      "• Celebrate achievements with AR milestone cards!\n" +
      "• Monthly progress reports from caregivers\n" +
      "• Age-appropriate learning activities daily\n\n" +
      "📊 Key areas tracked: Physical, Cognitive, Social, Language\n" +
      "🎉 Special milestone celebrations for major achievements\n" +
      "👨‍🏫 Parent-teacher conferences available quarterly.";
  }
  
  // ACTIVITIES & CURRICULUM
  else if (queryLower.includes('activit') || queryLower.includes('class') || queryLower.includes('play') || queryLower.includes('learn') || queryLower.includes('curriculum') || queryLower.includes('program')) {
    answer = "🎨 **Daily Activities & Programs:**\n\n" +
      "• **8:00 - 9:00:** Free play & settling in\n" +
      "• **9:00 - 10:00:** Learning time (letters, numbers, shapes)\n" +
      "• **10:00 - 11:00:** Outdoor activities (weather permitting)\n" +
      "• **11:30 - 12:30:** Lunch & quiet time\n" +
      "• **1:00 - 2:30:** Nap time for younger children\n" +
      "• **2:30 - 4:00:** Arts, crafts, music, storytelling\n" +
      "• **4:00 - 6:00:** Supervised play & pickup\n\n" +
      "🎭 Special weekly programs: Music Monday, Art Thursday, Science Friday!";
  }
  
  // SAFETY & SECURITY
  else if (queryLower.includes('safe') || queryLower.includes('secur') || queryLower.includes('emergency') || queryLower.includes('protect') || queryLower.includes('camera')) {
    answer = "🔒 **Safety & Security:**\n\n" +
      "• 24/7 CCTV monitoring throughout facility\n" +
      "• Secure entry/exit with authorized personnel only\n" +
      "• Child-to-staff ratio maintained per regulations\n" +
      "• All staff are background-checked & certified\n" +
      "• Emergency evacuation plans & regular drills\n\n" +
      "🚨 **Emergency Contact:** (555) 911-TOTS\n" +
      "📹 Live camera feeds available (if enabled by admin)\n" +
      "🆔 ID verification required for pickup.";
  }
  
  // VACCINATIONS & HEALTH RECORDS
  else if (queryLower.includes('vaccin') || queryLower.includes('immun') || queryLower.includes('shot') || queryLower.includes('record')) {
    answer = "💉 **Vaccination & Health Records:**\n\n" +
      "• Vaccination records stored on blockchain (secure & tamper-proof)\n" +
      "• View records: Dashboard → Health → Vaccination tab\n" +
      "• Required vaccines: MMR, DTaP, Polio, Hepatitis\n" +
      "• Upload new vaccination records anytime\n\n" +
      "📋 Keep vaccination schedules up to date\n" +
      "🔐 Blockchain-verified records accepted by schools\n" +
      "⚕️ Consultation with our medical staff available.";
  }
  
  // NANNY SERVICES
  else if (queryLower.includes('nanny') || queryLower.includes('babysit') || queryLower.includes('caregiver') || queryLower.includes('babysitter')) {
    answer = "👶 **Nanny & Babysitting Services:**\n\n" +
      "• Professional nannies available for home care\n" +
      "• Book nanny services: Dashboard → Services → Nanny\n" +
      "• Hourly rate: $15/hour (certified nannies)\n" +
      "• Available evenings, weekends, and overnight\n\n" +
      "✅ All nannies are background-checked & trained\n" +
      "📅 Schedule in advance or request same-day (subject to availability)\n" +
      "⭐ Rate your nanny experience for quality assurance.";
  }
  
  // COMMUNICATION & MESSAGES
  else if (queryLower.includes('message') || queryLower.includes('contact') || queryLower.includes('talk') || queryLower.includes('speak') || queryLower.includes('email') || queryLower.includes('call') || queryLower.includes('communication')) {
    answer = "💬 **Communication with Staff:**\n\n" +
      "• **Messages:** Dashboard → Messages tab (instant messaging)\n" +
      "• **Email:** info@tinytots.com\n" +
      "• **Phone:** (555) 123-4567\n" +
      "• **Emergency:** (555) 911-TOTS\n\n" +
      "📱 Real-time notifications for important updates\n" +
      "👩‍🏫 Direct message your child's caregiver\n" +
      "📧 Daily activity reports sent via email\n" +
      "🔔 Enable push notifications for instant updates.";
  }
  
  // FEEDBACK & COMPLAINTS
  else if (queryLower.includes('feedback') || queryLower.includes('complain') || queryLower.includes('suggest') || queryLower.includes('problem') || queryLower.includes('issue') || queryLower.includes('concern')) {
    answer = "📝 **Feedback & Suggestions:**\n\n" +
      "• Submit feedback: Dashboard → AI Assistant → Feedback Form\n" +
      "• AI-powered sentiment analysis for quick response\n" +
      "• Admin reviews all feedback within 24 hours\n" +
      "• Check admin responses: Dashboard → AI Assistant → Admin Responses\n\n" +
      "💡 Your feedback helps us improve!\n" +
      "🎯 Categories: Meals, Activities, Staff, Safety, General\n" +
      "✉️ For urgent concerns, contact management directly.";
  }
  
  // AR/VR FEATURES
  else if (queryLower.includes('ar ') || queryLower.includes('vr') || queryLower.includes('augmented') || queryLower.includes('virtual') || queryLower.includes('3d') || queryLower.includes('reality')) {
    answer = "🥽 **AR/VR Features:**\n\n" +
      "• **AR Milestone Cards:** Celebrate achievements in 3D!\n" +
      "• **Virtual Facility Tours:** 360° VR classroom views\n" +
      "• **AR Face Filters:** Fun educational face AR experiences\n" +
      "• **3D Product Preview:** View baby products in AR before buying\n\n" +
      "📱 Access AR features in your dashboard\n" +
      "🎉 Scan QR codes to activate AR milestone celebrations\n" +
      "🏫 Take virtual tours before enrollment.";
  }
  
  // E-COMMERCE & PRODUCTS
  else if (queryLower.includes('shop') || queryLower.includes('buy') || queryLower.includes('product') || queryLower.includes('order') || queryLower.includes('store') || queryLower.includes('purchase') || queryLower.includes('cart')) {
    answer = "🛒 **TinyTots Shop:**\n\n" +
      "• Browse products: Dashboard → Shop (header navigation)\n" +
      "• Categories: Clothing, Toys, Diapers, Formula, Books\n" +
      "• Features: 3D product preview with AR\n" +
      "• Track orders: Dashboard → Orders\n\n" +
      "📦 Free delivery on orders over $50\n" +
      "💳 Secure payment options available\n" +
      "🎁 Special discounts for daycare parents!";
  }
  
  // DELIVERY TRACKING
  else if (queryLower.includes('deliver') || queryLower.includes('shipping') || queryLower.includes('track') && queryLower.includes('order')) {
    answer = "📦 **Order Delivery & Tracking:**\n\n" +
      "• Track orders: Dashboard → Orders tab\n" +
      "• Real-time delivery driver location\n" +
      "• Estimated delivery times shown\n" +
      "• Delivery drivers verified & background-checked\n\n" +
      "🚚 Standard delivery: 1-3 business days\n" +
      "⚡ Express delivery: Same-day (additional fee)\n" +
      "📍 Update delivery address in your profile.";
  }
  
  // ATTENDANCE & CHECK-IN/OUT
  else if (queryLower.includes('attendance') || queryLower.includes('check in') || queryLower.includes('check out') || queryLower.includes('sign in')) {
    answer = "✅ **Attendance & Check-in:**\n\n" +
      "• Blockchain-verified attendance records\n" +
      "• View attendance: Dashboard → Attendance tab\n" +
      "• Daily check-in/check-out times recorded\n" +
      "• Automatic notifications on arrival/departure\n\n" +
      "📱 Receive instant alerts when child arrives/leaves\n" +
      "🔐 Secure, tamper-proof attendance records\n" +
      "📊 Monthly attendance reports available.";
  }
  
  // GREETINGS & WELCOME
  else if (queryLower.includes('hello') || queryLower.includes('hi ') || queryLower.includes('hey') || queryLower.includes('help')) {
    answer = "👋 **Welcome to TinyTots 24/7 Assistant!**\n\n" +
      "I'm here to help you with:\n\n" +
      "🕐 Hours & Schedules\n" +
      "🍎 Meals & Nutrition\n" +
      "💳 Billing & Payments\n" +
      "🏥 Medical Services & Appointments\n" +
      "🚌 Transportation\n" +
      "🎯 Milestones & Development\n" +
      "🎨 Activities & Programs\n" +
      "🔒 Safety & Security\n" +
      "💬 Communication with Staff\n" +
      "🛒 Shopping & Orders\n" +
      "📝 Feedback & Suggestions\n" +
      "🥽 AR/VR Features\n\n" +
      "**Ask me anything about your child's care!** I'm available 24/7 to assist you. 😊";
  }
  
  // THANK YOU
  else if (queryLower.includes('thank') || queryLower.includes('thanks')) {
    answer = "You're very welcome! 😊\n\n" +
      "I'm here 24/7 whenever you need assistance. Feel free to ask me anything about your child's care at TinyTots!\n\n" +
      "Have a wonderful day! 🌟";
  }
  
  // DEFAULT COMPREHENSIVE RESPONSE
  else {
    answer = "I'm your 24/7 TinyTots Assistant! 🌟\n\n" +
      "While I couldn't find a specific answer to your question, here are some helpful resources:\n\n" +
      "**Quick Access:**\n" +
      "• 📊 Dashboard sections (Daycare, Services, Billing, etc.)\n" +
      "• 💬 Messages tab - Direct contact with staff\n" +
      "• 📧 Email: info@tinytots.com\n" +
      "• 📞 Phone: (555) 123-4567\n" +
      "• 🚨 Emergency: (555) 911-TOTS\n\n" +
      "**Popular Topics:**\n" +
      "Try asking about: hours, meals, billing, appointments, transport, milestones, activities, safety, or shopping!\n\n" +
      "**Operating Hours:** Mon-Fri, 7 AM - 6 PM\n\n" +
      "How else can I help you today?";
  }

  return {
    success: true,
    answer: answer,
    fallback: true,
    timestamp: new Date()
  };
};

/**
 * Analyze sentiment of parent feedback using GPT
 * @param {string} feedback - Feedback text
 * @param {number} rating - Numeric rating (1-5)
 * @returns {Promise<Object>} - Sentiment analysis results
 */
const analyzeSentiment = async (feedback, rating = null) => {
  try {
    const client = initializeOpenAI();
    
    if (!client) {
      // No API key — use rule-based fallback
      return fallbackSentimentAnalysis(feedback, rating);
    }
    
    // Always try rule-based first without hitting OpenAI quota
    // (remove this line and uncomment the OpenAI block to re-enable AI sentiment)
    return fallbackSentimentAnalysis(feedback, rating);

    /* --- OpenAI sentiment (disabled when quota exceeded) ---

    const prompt = `Analyze the sentiment of this parent feedback from a daycare center. 
${rating ? `Rating: ${rating}/5` : ''}
Feedback: "${feedback}"

Provide a JSON response with:
1. sentiment: (positive, neutral, or negative)
2. confidence: (0-1)
3. key_topics: array of main topics mentioned
4. actionable_items: array of items requiring action/follow-up
5. summary: brief summary of the feedback

Response must be valid JSON only, no additional text.`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a sentiment analysis expert specializing in childcare feedback analysis. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const responseText = completion.choices[0].message.content.trim();
    const analysis = JSON.parse(responseText);

    return {
      success: true,
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      keyTopics: analysis.key_topics || [],
      actionableItems: analysis.actionable_items || [],
      summary: analysis.summary,
      rating: rating,
      timestamp: new Date()
    };
    --- end OpenAI sentiment block --- */

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return fallbackSentimentAnalysis(feedback, rating);
  }
};

/**
 * Fallback sentiment analysis (rule-based)
 */
const fallbackSentimentAnalysis = (feedback, rating) => {
  const text = feedback.toLowerCase();
  
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 
    'amazing', 'wonderful', 'fantastic', 'perfect', 'best', 'helpful', 'caring'];
  
  const negativeWords = ['bad', 'poor', 'terrible', 'unhappy', 'disappointed', 'awful',
    'horrible', 'worst', 'needs improvement', 'concern', 'issue', 'problem'];

  const positiveCount = positiveWords.filter(word => text.includes(word)).length;
  const negativeCount = negativeWords.filter(word => text.includes(word)).length;

  let sentiment = 'neutral';
  let confidence = 0.6;

  if (rating) {
    if (rating >= 4) {
      sentiment = 'positive';
      confidence = 0.8;
    } else if (rating <= 2) {
      sentiment = 'negative';
      confidence = 0.8;
    }
  }

  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    confidence = Math.min(0.9, 0.6 + (positiveCount * 0.1));
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    confidence = Math.min(0.9, 0.6 + (negativeCount * 0.1));
  }

  return {
    success: true,
    sentiment: sentiment,
    confidence: confidence,
    keyTopics: [],
    actionableItems: [],
    summary: `Feedback classified as ${sentiment} based on keyword analysis${rating ? ` and rating of ${rating}/5` : ''}.`,
    rating: rating,
    fallback: true,
    timestamp: new Date()
  };
};

/**
 * Generate automated report using GPT
 * @param {string} reportType - Type of report (daily, weekly, monthly)
 * @param {Object} data - Report data
 * @returns {Promise<Object>} - Generated report
 */
const generateReport = async (reportType, data) => {
  try {
    const client = initializeOpenAI();
    
    if (!client) {
      throw new Error('OpenAI API key not configured.');
    }

    const prompt = constructReportPrompt(reportType, data);

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional report writer for a daycare management system. Create clear, concise, and actionable reports in Markdown format.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    return {
      success: true,
      report: completion.choices[0].message.content,
      reportType: reportType,
      generatedAt: new Date(),
      usage: {
        totalTokens: completion.usage.total_tokens
      }
    };

  } catch (error) {
    console.error('Error generating report:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
};

/**
 * Construct prompt for report generation
 */
const constructReportPrompt = (reportType, data) => {
  let prompt = '';

  switch (reportType) {
    case 'daily':
      prompt = `Generate a Daily Activity Report for TinyTots Daycare Center.

Date: ${data.date || new Date().toDateString()}

Data:
- Total Children Present: ${data.childrenPresent || 0}
- Activities Completed: ${data.activitiesCompleted || 0}
- Meals Served: ${data.mealsServed || 0}
- Incidents: ${data.incidents || 0}
- Parent Communications: ${data.parentCommunications || 0}
${data.notes ? `- Additional Notes: ${data.notes}` : ''}

Create a professional daily report with:
1. Executive Summary
2. Attendance Overview
3. Activities Summary
4. Meal Services
5. Incidents/Issues (if any)
6. Parent Engagement
7. Recommendations for tomorrow`;
      break;

    case 'weekly':
      prompt = `Generate a Weekly Performance Report for TinyTots Daycare Center.

Week: ${data.weekStart || 'Current Week'}

Data:
- Average Daily Attendance: ${data.avgAttendance || 0}
- Total Activities: ${data.totalActivities || 0}
- Parent Satisfaction Score: ${data.satisfactionScore || 'N/A'}
- Feedback Received: ${data.feedbackCount || 0}
- Positive Feedback: ${data.positiveFeedback || 0}
- Negative Feedback: ${data.negativeFeedback || 0}
- Staff Performance Rating: ${data.staffRating || 'N/A'}
${data.topIssues ? `- Top Issues: ${data.topIssues.join(', ')}` : ''}

Create a comprehensive weekly report with:
1. Week Overview
2. Attendance Trends
3. Program Effectiveness
4. Parent Feedback Analysis
5. Staff Performance
6. Areas of Improvement
7. Action Items for Next Week`;
      break;

    case 'monthly':
      prompt = `Generate a Monthly Management Report for TinyTots Daycare Center.

Month: ${data.month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}

Data:
- Total Revenue: ${data.revenue || 0}
- Total Enrollments: ${data.enrollments || 0}
- Average Occupancy Rate: ${data.occupancyRate || 0}%
- Parent Retention: ${data.retentionRate || 0}%
- Feedback Score: ${data.feedbackScore || 0}/5
- Total Activities: ${data.totalActivities || 0}
- Safety Incidents: ${data.safetyIncidents || 0}
- Staff Turnover: ${data.staffTurnover || 0}%
${data.achievements ? `- Key Achievements: ${data.achievements}` : ''}

Create a detailed monthly report with:
1. Executive Summary
2. Financial Performance
3. Enrollment & Retention Analysis
4. Parent Satisfaction Metrics
5. Program Quality Assessment
6. Safety & Compliance
7. Staff Management
8. Strategic Recommendations`;
      break;

    case 'feedback':
      prompt = `Generate a Feedback Analysis Report for TinyTots Daycare Center.

Period: ${data.period || 'Recent'}

Data:
- Total Feedback Received: ${data.totalFeedback || 0}
- Positive: ${data.positive || 0}
- Neutral: ${data.neutral || 0}
- Negative: ${data.negative || 0}
- Response Rate: ${data.responseRate || 0}%
- Top Topics: ${data.topTopics ? data.topTopics.join(', ') : 'N/A'}
- Recurring Issues: ${data.recurringIssues ? data.recurringIssues.join(', ') : 'None'}

Create a feedback analysis report with:
1. Overview of Feedback
2. Sentiment Distribution
3. Key Topics Analysis
4. Positive Highlights
5. Areas Needing Attention
6. Actionable Recommendations
7. Follow-up Plan`;
      break;

    default:
      prompt = `Generate a general report for TinyTots Daycare Center based on the following data:

${JSON.stringify(data, null, 2)}

Create a well-structured report with appropriate sections and actionable insights.`;
  }

  return prompt;
};

/**
 * Summarize multiple feedback items
 */
const summarizeFeedback = async (feedbackList) => {
  try {
    const client = initializeOpenAI();
    
    if (!client || feedbackList.length === 0) {
      return {
        success: true,
        summary: 'No feedback to summarize.',
        totalCount: 0
      };
    }

    const feedbackText = feedbackList.map((fb, idx) => 
      `${idx + 1}. [Rating: ${fb.rating}/5] ${fb.text}`
    ).join('\n');

    const prompt = `Summarize the following parent feedback from a daycare center. Identify common themes, recurring issues, and overall sentiment.

Feedback:
${feedbackText}

Provide a concise summary with:
1. Overall sentiment
2. Common themes (3-5)
3. Priority issues to address
4. Positive highlights`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are analyzing feedback for a daycare management team.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 600,
    });

    return {
      success: true,
      summary: completion.choices[0].message.content,
      totalCount: feedbackList.length,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Error summarizing feedback:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
};

module.exports = {
  processParentQuery,
  analyzeSentiment,
  generateReport,
  summarizeFeedback,
  initializeOpenAI
};
