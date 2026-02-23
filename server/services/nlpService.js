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
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.');
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
    console.error('Error processing parent query:', error);
    return {
      success: false,
      error: error.message,
      fallbackAnswer: "I'm having trouble processing your request right now. Please contact our staff directly for assistance.",
      timestamp: new Date()
    };
  }
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
      // Fallback to simple rule-based analysis
      return fallbackSentimentAnalysis(feedback, rating);
    }

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
