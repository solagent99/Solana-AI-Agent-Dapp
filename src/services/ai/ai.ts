/**
 * AI Service Implementation
 * 
 * This module provides AI capabilities through multiple LLM providers (Groq and DeepSeek).
 * It handles various AI tasks including content generation, sentiment analysis, and market analysis.
 * 
 * Features:
 * - Multiple LLM provider support (Groq, DeepSeek)
 * - Context-aware response generation
 * - Market analysis and trading signals
 * - Meme content generation with sentiment analysis
 * 
 * @module AIService
 */

import { Groq } from 'groq-sdk';
import { randomBytes } from 'crypto';
import { MarketAction } from '../../config/constants.js';
import { LLMProvider, ChatRequest, ChatResponse, Tweet,  MarketAnalysis, IAIService } from './types';

class DeepSeekProvider implements LLMProvider {
  constructor(private apiKey: string) {}

  async chatCompletion(request: ChatRequest): Promise<ChatResponse> {
    // Implement DeepSeek API call here
    throw new Error('DeepSeek provider not implemented');
  }
}
import CONFIG from '../../config/settings.js';
import personalityConfig from '../../config/personality.js';
import { Character } from '../../personality/types.js';
import { MarketData } from '@/types/market';

interface AIServiceConfig {
  groqApiKey?: string;
  deepSeekApiKey?: string;
  useDeepSeek?: boolean;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

// Internal types
type MessageRole = "system" | "user" | "assistant";

interface Message {
  role: MessageRole;
  content: string;
}

interface ResponseContext {
  content: string;
  platform: string;
  parentCast?: string;
  author?: string;
  channel?: string;
  marketCondition?: string;
}

interface MemeResponse {
  text: string;
  hashtags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface GenerateResponseInput {
  content: string;
  author: string;
  platform: string;
  messageId?: string;  // Add this
  channel?: string;
  contentType?: 'community' | 'market' | 'meme' | 'general';
  context?: {
    [key: string]: any;
    traits?: string[];
    metrics?: any;
    marketCondition?: string;
  };
}

interface MarketTweetData {
  topic: string;
  price: string;
  volume: string;
  priceChange: string;
}

export interface AIService {
  generateMarketTweet(data: MarketTweetData): Promise<string | null>;
}

export class AIService implements IAIService {
  async generateMarketTweet(data: MarketTweetData): Promise<string | null> {
      throw new Error('Method not implemented.');
  }
  
  private characterConfig?: Character;

  async setCharacterConfig(config: Character): Promise<void> {
    this.characterConfig = config;
  }
  private provider: LLMProvider;
  private personality: typeof personalityConfig;
  private config: AIServiceConfig;
  private contextMemory: Map<string, string[]> = new Map();
  private maxMemoryItems: number = 10;

  readonly sentimentPrompts = {
    positive: [
      'bullish',
      'growth',
      'adoption',
      'partnership',
      'success',
      'upgrade',
      'innovation',
      'launch',
      'breakthrough'
    ],
    negative: [
      'bearish',
      'decline',
      'risk',
      'concern',
      'failure',
      'hack',
      'crash',
      'scam',
      'delay'
    ]
  };

  async generateName(): Promise<string> {
    try {
      const prompt = `
        Generate a creative and memorable name for a new cryptocurrency token.
        The name should be:
        - Unique and catchy
        - Easy to remember
        - Not similar to existing major tokens
        - Maximum 15 characters
        
        Provide just the name, no explanation.
      `;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0.9,
      });

      return completion.choices[0]?.message?.content?.trim() || "TokenName";
    } catch (error) {
      console.error('Error generating name:', error);
      return "TokenName";
    }
  }

  async generateNarrative(template: any): Promise<string> {
    try {
      const prompt = `
        Create a compelling narrative for a cryptocurrency token with the following attributes:
        Name: ${template.name || 'Unknown'}
        Type: ${template.type || 'Token'}
        Key Features: ${template.features?.join(', ') || 'Standard features'}
        
        Generate a concise, engaging description that:
        - Highlights unique value propositions
        - Explains key use cases
        - Emphasizes competitive advantages
        - Maintains professional tone
        - Keeps it under 280 characters for Twitter
      `;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content?.trim() || 
        "A revolutionary digital asset designed for the future of finance.";
    } catch (error) {
      console.error('Error generating narrative:', error);
      return "A revolutionary digital asset designed for the future of finance.";
    }
  }

  /**
   * Initializes the AI service with the specified configuration
   * Supports multiple LLM providers (DeepSeek and Groq)
   * 
   * @param config - Configuration object containing API keys and model settings
   * @throws Error if no valid AI provider configuration is found
   */
  constructor(config: AIServiceConfig) {
    if (config.useDeepSeek && config.deepSeekApiKey) {
      this.provider = new DeepSeekProvider(config.deepSeekApiKey);
    } else if (config.groqApiKey) {
      const groq = new Groq({ apiKey: config.groqApiKey });
      this.provider = {
        chatCompletion: async (request: ChatRequest): Promise<ChatResponse> => {
          const messages = request.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          const completion = await groq.chat.completions.create({
            messages,
            model: request.model,
            temperature: request.temperature || 0.7,
            max_tokens: request.max_tokens || 100
          });
          
          return {
            id: completion.id || randomBytes(16).toString('hex'),
            object: 'chat.completion',
            created: Date.now(),
            choices: [{
              message: {
                role: completion.choices[0].message.role as 'system' | 'user' | 'assistant',
                content: completion.choices[0].message.content || ''
              },
              finish_reason: completion.choices[0].finish_reason || 'stop'
            }]
          };
        }
      };
    } else {
      throw new Error('No valid AI provider configuration found');
    }
    this.config = config;
    this.personality = personalityConfig;
  }
  groq: any;
 

  /**
   * Generates an AI response based on the given context
   * Uses the configured LLM provider (DeepSeek or Groq)
   * 
   * @param context - Context for response generation
   * @param context.content - Input content to respond to
   * @param context.platform - Platform where the response will be posted
   * @param context.author - Original content author (optional)
   * @param context.channel - Channel/thread identifier (optional)
   * @returns Promise resolving to the generated response text
   */
  async generateResponse(params: {
    content: string;
    author: string;
    channel?: string;
    platform: string;
    contentType?: 'community' | 'market' | 'meme' | 'general';
    context?: {
      traits?: string[];
      metrics?: any;
      marketCondition?: string;
      [key: string]: any;
    };
  }): Promise<string> {
    try {
      // Handle community content type specifically
      if (params.contentType === 'community') {
        return this.generateCommunityContent({
          content: params.content,
          platform: params.platform,
          author: params.author,
          channel: params.channel,
          marketCondition: params.context?.marketCondition
        });
      }

      const prompt = this.buildResponsePrompt({
        content: params.content,
        platform: params.platform,
        author: params.author,
        channel: params.channel,
        marketCondition: params.context?.marketCondition
      });
      
      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system" as MessageRole, content: this.personality.core.voice.tone },
          { role: "user" as MessageRole, content: prompt }
        ],
        model: this.config.defaultModel,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new Error('Response content is null');
      }
      return content;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async analyzeSentiment(text: string): Promise<number> {
    // Returns a number between 0 and 1
    return 0.7;
  }

  async analyzeMarket(metrics: MarketData): Promise<MarketAnalysis> {
    let jsonString = '';
    
    try {
      const systemPrompt = `You are a market analysis AI. IMPORTANT:
1. Respond with ONLY valid JSON
2. No explanatory text or comments
3. Match the exact format provided
4. All fields are required`,
            formatExample: MarketAnalysis = {
              shouldTrade: false,
              confidence: 0.5,
              action: "HOLD",
              metrics: metrics,
              shouldUpdate: undefined,
              summary: '',
              sentiment: '',
              keyPoints: [],
              recommendation: null,
              reasons: [],
              riskLevel: ''
            },
            prompt = `Analyze this market data and respond with ONLY valid JSON matching this exact format: ${JSON.stringify(formatExample, null, 2)}

Market metrics:
- Price: ${metrics.price}
- 24h Volume: ${metrics.volume24h}
- Market Cap: ${metrics.marketCap}
- 24h Price Change: ${metrics.priceChange24h}`,
            messages: Message[] = [
              { 
                role: "system" as MessageRole, 
                content: systemPrompt,
              },
              { 
                role: "user" as MessageRole, 
                content: prompt,
              },
            ],
            response = await this.provider.chatCompletion({
              messages,
              model: this.config.defaultModel,
              temperature: 0.1, // Lower temperature for strict JSON
              max_tokens: 150,
            }),
            content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Response content is null');
      }

      // Extract JSON object using a more robust method
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      // Clean up the JSON string
      jsonString = jsonMatch[0]
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ');

      // Parse and validate JSON
      const analysis: MarketAnalysis = JSON.parse(jsonString);

      // Validate required fields and types
      if (typeof analysis.shouldTrade !== 'boolean') {
        throw new Error('Invalid shouldTrade type: must be boolean');
      }
      if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
        throw new Error('Invalid confidence: must be number between 0 and 1');
      }
      if (!['BUY', 'SELL', 'HOLD'].includes(analysis.action)) {
        throw new Error('Invalid action: must be BUY, SELL, or HOLD');
      }

      return {
        shouldTrade: analysis.shouldTrade,
        confidence: analysis.confidence,
        action: analysis.action,
        metrics: metrics,
        shouldUpdate: analysis.shouldUpdate || false,
        summary: analysis.summary || '',
        sentiment: analysis.sentiment || '',
        keyPoints: analysis.keyPoints || [],
        recommendation: analysis.recommendation || null,
        reasons: analysis.reasons || [],
        riskLevel: analysis.riskLevel || ''
      };
    } catch (error) {
      console.error('Error analyzing market:', error);
      console.error('Original response:', jsonString);
      
      if (error instanceof SyntaxError) {
        console.error('Invalid JSON format received from AI');
      } else if (error instanceof Error) {
        console.error('Validation error:', error.message);
      }

      // Return safe default values
      return {
        shouldTrade: false,
        confidence: 0,
        action: 'HOLD',
        metrics: metrics,
        shouldUpdate: false,
        summary: '',
        sentiment: '',
        keyPoints: [],
        recommendation: null,
        reasons: [],
        riskLevel: 'low'
      };
    }
  }

  async generateMemeContent(prompt?: string): Promise<MemeResponse> {
    try {
      const sessionId = this.getSessionId(),
            context = this.getContext(sessionId),
            messages: Message[] = [
              {
                role: "system" as MessageRole,
                content: CONFIG.AI.GROQ.SYSTEM_PROMPTS.MEME_GENERATION,
              },
              ...context.map((msg) => ({ 
                role: "assistant" as MessageRole, 
                content: msg,
              })),
              {
                role: "user" as MessageRole,
                content: prompt || "Create a viral meme tweet about $MEME token",
              },
            ];

      const aiResponse = await this.provider.chatCompletion({
              messages,
              model: this.config.defaultModel,
              temperature: this.config.temperature,
              max_tokens: this.config.maxTokens,
            }),
            memeText = aiResponse.choices[0]?.message?.content || "",
            extractedHashtags = memeText.match(/#[a-zA-Z0-9_]+/g) || [],
            sentimentScore = await this.analyzeSentiment(memeText);

      this.updateContext(sessionId, memeText);

      return {
        text: memeText,
        hashtags: extractedHashtags,
        sentiment: sentimentScore > 0.6 ? 'positive' : sentimentScore < 0.4 ? 'negative' : 'neutral',
      };
    } catch (error) {
      console.error('Error generating meme content:', error);
      throw new Error('Failed to generate meme content');
    }
  }

  async generateSocialPost(context: {
    platform: string;
    marketCondition: string;
    metrics: any;
    recentEvents?: string[];
  }): Promise<string> {
    try {
      const template = this.personality.responses.marketAnalysis.find(
        t => t.conditions?.marketCondition === context.marketCondition
      )?.templates[0];

      const prompt = `Create a ${context.platform} post about current market conditions:
        Market Condition: ${context.marketCondition}
        Key Metrics: ${JSON.stringify(context.metrics)}
        Recent Events: ${context.recentEvents?.join(', ') || 'None'}
        
        Use this style: ${template || 'informative and engaging'}
        Maintain personality traits: ${this.personality.core.baseTraits.map(t => t.name).join(', ')}`;

      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system", content: this.personality.core.voice.tone },
          { role: "user", content: prompt }
        ],
        model: this.config.defaultModel,
        temperature: 0.7,
        max_tokens: 280 // Twitter limit
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new Error('Response content is null');
      }
      return content;
    } catch (error) {
      console.error('Error generating social post:', error);
      throw error;
    }
  }

  async shouldEngageWithContent(content: {
    text: string;
    author: string;
    engagement?: number;
    platform: string;
  }): Promise<boolean> {
    try {
      const prompt = `Should I engage with this content?
        Text: ${content.text}
        Author: ${content.author}
        Platform: ${content.platform}
        Current Engagement: ${content.engagement || 'Unknown'}
        
        Consider:
        1. Relevance to our community
        2. Sentiment and tone
        3. Author's credibility
        4. Potential impact
        
        Response format: { "shouldEngage": boolean, "reason": string }`;

      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system", content: this.personality.core.voice.tone },
          { role: "user", content: prompt }
        ],
        model: this.config.defaultModel,
        temperature: 0.3,
        max_tokens: 100
      });

      const responseContent = response.choices[0].message.content;
      if (responseContent === null) {
        throw new Error('Response content is null');
      }
      const decision = JSON.parse(responseContent);
      return decision.shouldEngage;
    } catch (error) {
      console.error('Error determining engagement:', error);
      return false;
    }
  }

  async determineTradeAction(analysis: MarketAnalysis): Promise<{
    action: 'BUY' | 'SELL' | 'HOLD';
    amount: number;
    confidence: number;
  }> {
    try {
      const prompt = `Based on this market analysis, determine the optimal trading action:
        ${JSON.stringify(analysis)}
        
        Consider: 
        1. Risk tolerance: ${this.personality.behavior.riskTolerance}
        2. Market conditions
        3. Confidence level
        4. Potential impact
        
        Response format: {
          "action": "BUY" | "SELL" | "HOLD",
          "amount": number,
          "confidence": number
        }`;

      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system", content: this.personality.core.voice.tone },
          { role: "user", content: prompt }
        ],
        model: this.config.defaultModel,
        temperature: 0.2,
        max_tokens: 100
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new Error('Response content is null');
      }
      return JSON.parse(content);
    } catch (error) {
      console.error('Error determining trade action:', error);
      throw error;
    }
  }

  async generateMarketUpdate(params: {
    action: MarketAction;
    data: MarketData;
    platform: string;
  }): Promise<string> {
    try {
      const prompt = `Generate a market update for ${params.platform}:
        Action: ${params.action}
        Data: ${JSON.stringify(params.data)}
        
        Ensure the update is informative and engaging.`;

      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system", content: this.personality.core.voice.tone },
          { role: "user", content: prompt }
        ],
        model: this.config.defaultModel,
        temperature: 0.7,
        max_tokens: 280 // Twitter limit
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new Error('Response content is null');
      }
      return content;
    } catch (error) {
      console.error('Error generating market update:', error);
      throw error;
    }
  }

  async determineEngagementAction(tweet: any): Promise<{
    type: 'reply' | 'retweet' | 'like' | 'ignore';
    content?: string;
    confidence?: number;
  }> {
    try {
      const prompt = `Determine the optimal engagement action for the following tweet:
        ${JSON.stringify(tweet)}
        
        Consider:
        1. Relevance to our community
        2. Sentiment and tone
        3. Author's credibility
        4. Potential impact
        
        Response format: { "type": "reply" | "retweet" | "like", "content"?: string }`;

      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system", content: this.personality.core.voice.tone },
          { role: "user", content: prompt }
        ],
        model: this.config.defaultModel,
        temperature: 0.3,
        max_tokens: 100
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new Error('Response content is null');
      }
      return JSON.parse(content);
    } catch (error) {
      console.error('Error determining engagement action:', error);
      throw error;
    }
  }

  async generateTokenMetricsUpdate(metrics: any): Promise<string> {
    try {
      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system", content: this.personality.core.voice.tone },
          { role: "user", content: JSON.stringify(metrics) }
        ],
        model: this.config.defaultModel,
        temperature: 0.3,
        max_tokens: 100
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new Error('Response content is null');
      }
      return content;
    } catch (error) {
      console.error('Error generating token metrics update:', error);
      throw error;
    }
  }

  async generateMarketAnalysis(): Promise<string> {
    try {
      const prompt = `Generate a market analysis based on the current market conditions.`;

      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system", content: this.personality.core.voice.tone },
          { role: "user", content: prompt }
        ],
        model: this.config.defaultModel,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new Error('Response content is null');
      }
      return content;
    } catch (error) {
      console.error('Error generating market analysis:', error);
      throw error;
    }
  }

  /**
   * Builds a prompt for response generation
   * Incorporates personality traits and context
   * 
   * @param context - Response context including platform and content
   * @returns Formatted prompt string for the LLM
   */
  private async generateCommunityContent(context: ResponseContext): Promise<string> {
    try {
      const template = this.personality.responses?.communityEngagement?.find(
        t => t.conditions?.marketCondition === context.marketCondition
      )?.templates[0] || 'Engage with our amazing community! 🚀';

      const prompt = `Generate a community engagement post that:
1. Addresses the community directly
2. Maintains our personality and voice
3. References current market conditions
4. Encourages positive engagement

Context:
Content: ${context.content || 'General community update'}
Market Condition: ${context.marketCondition || 'neutral'}
Platform: ${context.platform}
Channel: ${context.channel || 'general'}

Use this template style: ${template}`;

      const response = await this.provider.chatCompletion({
        messages: [
          { role: "system" as MessageRole, content: this.personality.core.voice.tone },
          { role: "user" as MessageRole, content: prompt }
        ],
        model: this.config.defaultModel,
        temperature: 0.7,
        max_tokens: 280
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Community content generation failed: null response');
      }

      return content;
    } catch (error) {
      console.error('Error generating community content:', error);
      throw new Error(`Failed to generate community content: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private buildResponsePrompt(context: ResponseContext): string {
    const basePrompt = `Generate a response considering:
      Content: ${context.content || ''}
      Author: ${context.author || 'Unknown'}
      Platform: ${context.platform || 'Unknown'}
      Channel: ${context.channel || 'Unknown'}
      Market Condition: ${context.marketCondition || 'Unknown'}`;

    return `${basePrompt}
      
      Ensure the response:
      1. Maintains our personality traits
      2. Is appropriate for the platform
      3. Adds value to the conversation
      4. Uses appropriate crypto terminology
      5. Maintains transparency about being an AI`;
  }

  // Private helper methods
  private getSessionId(): string {
    return randomBytes(16).toString('hex');
  }

  private getContext(sessionId: string): string[] {
    return this.contextMemory.get(sessionId) || [];
  }

  private updateContext(sessionId: string, message: string) {
    const context = this.getContext(sessionId);
    context.push(message);
    if (context.length > this.maxMemoryItems) {
      context.shift();
    }
    this.contextMemory.set(sessionId, context);
  }

  async getMarketMetrics(): Promise<MarketData> {
    // Implement the logic to fetch market metrics
    // This is a placeholder implementation
    return {
      price: 100,
      volume24h: 1000,
      priceChange24h: 5,
      marketCap: 1000000,
      lastUpdate: Date.now(),
      tokenAddress: "0x0000000000000000000000000000000000000000",
      topHolders: [],
      volatility: {
        currentVolatility: 0.1,
        averageVolatility: 0.2,
        adjustmentFactor: 0.05
      },
      holders: {
        total: 100,
        top: [
          { address: "0x0000000000000000000000000000000000000001", balance: 1000, percentage: 10 },
          { address: "0x0000000000000000000000000000000000000002", balance: 500, percentage: 5 }
        ]
      },
      onChainActivity: {
        transactions: 0,
        swaps: 0,
        uniqueTraders: 0
      }
    };
  }
}

// Export class and create default instance if config is available
export const createDefaultAIService = () => {
  if (!CONFIG.AI?.GROQ) {
    throw new Error('GROQ configuration is required but not found');
  }
  return new AIService({
    groqApiKey: CONFIG.AI.GROQ.API_KEY,
    defaultModel: CONFIG.AI.GROQ.MODEL,
    maxTokens: CONFIG.AI.GROQ.MAX_TOKENS,
    temperature: CONFIG.AI.GROQ.DEFAULT_TEMPERATURE
  });
};

// Only create singleton if config exists
let defaultInstance: AIService | undefined;
try {
  defaultInstance = createDefaultAIService();
} catch (error) {
  console.warn('Failed to create default AI service instance:', error);
}

export const aiService = defaultInstance;
export default AIService;
