import type { Conversation } from '@/types/conversation.types'

// Helper to create timestamps relative to now
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString()

// Conversation for Lead #1: Andrei Popescu (exploring, P4)
const conversation1: Conversation = {
  id: 'conv_1',
  lead_id: '1',
  bot_active: true,
  human_taken_over: false,
  created_at: hoursAgo(2),
  updated_at: minutesAgo(5),
  messages: [
    {
      id: 'msg_1_1',
      conversation_id: 'conv_1',
      sender_type: 'bot',
      content: 'Hi Andrei! 👋 I noticed you run an ecommerce business. I\'d love to learn more about what you do!',
      timestamp: hoursAgo(2),
      status: 'read',
    },
    {
      id: 'msg_1_2',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      content: 'Hi! Yes, I run an online store selling handmade jewelry.',
      timestamp: hoursAgo(1.95),
      status: 'read',
    },
    {
      id: 'msg_1_3',
      conversation_id: 'conv_1',
      sender_type: 'bot',
      content: 'That sounds amazing! Handmade jewelry is so special. How long have you been running your store?',
      timestamp: hoursAgo(1.93),
      status: 'read',
    },
    {
      id: 'msg_1_4',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      content: 'About 3 years now. It started as a hobby and grew into a full business!',
      timestamp: hoursAgo(1.90),
      status: 'read',
      metadata: {
        phase: 'P1',
      },
    },
    {
      id: 'msg_1_5',
      conversation_id: 'conv_1',
      sender_type: 'bot',
      content: 'I love that journey! 🎉 Can I ask - what\'s your biggest challenge right now with growing the business?',
      timestamp: hoursAgo(1.88),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P1',
          to: 'P2',
        },
      },
    },
    {
      id: 'msg_1_6',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      content: 'Getting more consistent sales. Some months are great, others are really slow. I need more predictable revenue.',
      timestamp: hoursAgo(1.85),
      status: 'read',
    },
    {
      id: 'msg_1_7',
      conversation_id: 'conv_1',
      sender_type: 'bot',
      content: 'That\'s a common challenge, and I totally understand the stress of inconsistent revenue. Have you tried automating your customer engagement or follow-ups?',
      timestamp: hoursAgo(1.83),
      status: 'read',
      metadata: {
        phase: 'P2',
      },
    },
    {
      id: 'msg_1_8',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      content: 'Not really. I mostly rely on Instagram and email, but I don\'t have time to keep up with everyone.',
      timestamp: hoursAgo(1.80),
      status: 'read',
    },
    {
      id: 'msg_1_9',
      conversation_id: 'conv_1',
      sender_type: 'bot',
      content: 'That makes total sense! What if you could have a system that automatically qualifies leads, answers common questions, and books sales calls while you focus on creating? Would that help?',
      timestamp: hoursAgo(1.78),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P2',
          to: 'P3',
        },
      },
    },
    {
      id: 'msg_1_10',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      content: 'Yes, absolutely! That would save me so much time. How does it work?',
      timestamp: hoursAgo(1.75),
      status: 'read',
    },
    {
      id: 'msg_1_11',
      conversation_id: 'conv_1',
      sender_type: 'bot',
      content: 'Great question! We build AI-powered appointment setters that work 24/7 on Instagram, Facebook, and your website. They chat with potential customers, understand their needs, and book qualified calls directly to your calendar. Sound interesting?',
      timestamp: hoursAgo(1.73),
      status: 'read',
      metadata: {
        phase: 'P3',
      },
    },
    {
      id: 'msg_1_12',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      content: 'Very interesting! What kind of results do your clients see?',
      timestamp: hoursAgo(1.70),
      status: 'read',
    },
    {
      id: 'msg_1_13',
      conversation_id: 'conv_1',
      sender_type: 'bot',
      content: 'Our ecommerce clients typically see 3-5x more qualified sales calls booked per month, with 60-80% of the qualification process automated. This means you spend time only with serious buyers. Plus, the bot works while you sleep! 😊',
      timestamp: hoursAgo(1.68),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P3',
          to: 'P4',
        },
      },
    },
    {
      id: 'msg_1_14',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      content: 'Wow, that sounds exactly what I need! What\'s the investment for something like this?',
      timestamp: minutesAgo(10),
      status: 'read',
    },
    {
      id: 'msg_1_15',
      conversation_id: 'conv_1',
      sender_type: 'bot',
      content: 'I\'d love to give you exact pricing, but it really depends on your specific needs and volume. Would you be open to a quick 15-minute call where we can understand your business better and show you exactly how this would work for your jewelry store?',
      timestamp: minutesAgo(8),
      status: 'read',
      metadata: {
        phase: 'P4',
      },
    },
    {
      id: 'msg_1_16',
      conversation_id: 'conv_1',
      sender_type: 'lead',
      content: 'Sure, I\'d be interested in learning more!',
      timestamp: minutesAgo(5),
      status: 'read',
    },
  ],
}

// Conversation for Lead #2: Maria Ionescu (exploring, P3, needs human)
const conversation2: Conversation = {
  id: 'conv_2',
  lead_id: '2',
  bot_active: false,
  human_taken_over: true,
  taken_over_by: 'user_maria',
  taken_over_by_name: 'Maria',
  taken_over_at: minutesAgo(15),
  created_at: hoursAgo(3),
  updated_at: minutesAgo(10),
  messages: [
    {
      id: 'msg_2_1',
      conversation_id: 'conv_2',
      sender_type: 'bot',
      content: 'Hi Maria! 👋 Thanks for reaching out. What brings you here today?',
      timestamp: hoursAgo(3),
      status: 'read',
    },
    {
      id: 'msg_2_2',
      conversation_id: 'conv_2',
      sender_type: 'lead',
      content: 'I saw your ad about appointment setting. I have a consulting business.',
      timestamp: hoursAgo(2.95),
      status: 'read',
    },
    {
      id: 'msg_2_3',
      conversation_id: 'conv_2',
      sender_type: 'bot',
      content: 'Awesome! What type of consulting do you do?',
      timestamp: hoursAgo(2.93),
      status: 'read',
    },
    {
      id: 'msg_2_4',
      conversation_id: 'conv_2',
      sender_type: 'lead',
      content: 'Business strategy consulting for mid-size companies. But I\'m struggling with lead gen.',
      timestamp: hoursAgo(2.90),
      status: 'read',
    },
    {
      id: 'msg_2_5',
      conversation_id: 'conv_2',
      sender_type: 'bot',
      content: 'Lead generation can definitely be challenging! What have you tried so far?',
      timestamp: hoursAgo(2.88),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P1',
          to: 'P2',
        },
      },
    },
    {
      id: 'msg_2_6',
      conversation_id: 'conv_2',
      sender_type: 'lead',
      content: 'LinkedIn mostly. But I need something more automated. Can your system integrate with LinkedIn?',
      timestamp: hoursAgo(2.85),
      status: 'read',
    },
    {
      id: 'msg_2_7',
      conversation_id: 'conv_2',
      sender_type: 'bot',
      content: 'Great question! We primarily focus on Instagram, Facebook Messenger, and website chat. LinkedIn integration is something we\'re exploring but don\'t officially support yet.',
      timestamp: hoursAgo(2.83),
      status: 'read',
    },
    {
      id: 'msg_2_8',
      conversation_id: 'conv_2',
      sender_type: 'lead',
      content: 'Hmm, LinkedIn is crucial for my B2B clients. Do you have any workarounds? Or can you build custom integrations?',
      timestamp: minutesAgo(20),
      status: 'read',
      metadata: {
        phase: 'P3',
      },
    },
    {
      id: 'msg_2_9',
      conversation_id: 'conv_2',
      sender_type: 'bot',
      content: 'That\'s a specialized request! Let me connect you with someone from our team who can discuss custom integration options.',
      timestamp: minutesAgo(18),
      status: 'read',
      metadata: {
        action: 'escalate_to_human',
      },
    },
    {
      id: 'msg_2_10',
      conversation_id: 'conv_2',
      sender_type: 'human',
      sender_name: 'Maria',
      content: 'Hi Maria! I\'m Maria from the team. I saw you\'re interested in LinkedIn integration. We can definitely explore custom solutions for your B2B consulting business. Would you be open to a call this week to discuss your specific needs?',
      timestamp: minutesAgo(15),
      status: 'read',
    },
    {
      id: 'msg_2_11',
      conversation_id: 'conv_2',
      sender_type: 'lead',
      content: 'Hi! Yes, I\'d love that. What times work for you?',
      timestamp: minutesAgo(10),
      status: 'read',
    },
  ],
}

// Conversation for Lead #3: Elena Matei (booked, P7)
const conversation3: Conversation = {
  id: 'conv_3',
  lead_id: '3',
  bot_active: false,
  human_taken_over: true,
  taken_over_by: 'user_sergiu',
  taken_over_by_name: 'Sergiu',
  taken_over_at: hoursAgo(1),
  created_at: hoursAgo(5),
  updated_at: minutesAgo(30),
  messages: [
    {
      id: 'msg_3_1',
      conversation_id: 'conv_3',
      sender_type: 'bot',
      content: 'Hi Elena! 👋 Welcome! What\'s your business about?',
      timestamp: hoursAgo(5),
      status: 'read',
    },
    {
      id: 'msg_3_2',
      conversation_id: 'conv_3',
      sender_type: 'lead',
      content: 'I run a digital marketing agency. Saw your ad about AI appointment setters.',
      timestamp: hoursAgo(4.95),
      status: 'read',
    },
    {
      id: 'msg_3_3',
      conversation_id: 'conv_3',
      sender_type: 'bot',
      content: 'Perfect! As a marketing agency, you probably understand the value of automation. What\'s your biggest bottleneck right now?',
      timestamp: hoursAgo(4.93),
      status: 'read',
    },
    {
      id: 'msg_3_4',
      conversation_id: 'conv_3',
      sender_type: 'lead',
      content: 'Following up with leads. We generate lots of interest but struggle to convert them into paying clients.',
      timestamp: hoursAgo(4.90),
      status: 'read',
    },
    {
      id: 'msg_3_5',
      conversation_id: 'conv_3',
      sender_type: 'bot',
      content: 'That\'s exactly what we solve! Our AI handles the entire follow-up process, qualifies leads, and books calls with serious prospects. Would that help your agency?',
      timestamp: hoursAgo(4.88),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P2',
          to: 'P3',
        },
      },
    },
    {
      id: 'msg_3_6',
      conversation_id: 'conv_3',
      sender_type: 'lead',
      content: 'Definitely! We need that. How quickly can we get started?',
      timestamp: hoursAgo(4.85),
      status: 'read',
    },
    {
      id: 'msg_3_7',
      conversation_id: 'conv_3',
      sender_type: 'bot',
      content: 'Great enthusiasm! 🎉 Most clients are up and running within 2 weeks. But first, let\'s make sure we\'re a great fit. Can you tell me about your current lead volume?',
      timestamp: hoursAgo(4.83),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P3',
          to: 'P4',
        },
      },
    },
    {
      id: 'msg_3_8',
      conversation_id: 'conv_3',
      sender_type: 'lead',
      content: 'We get about 50-80 leads per month from Instagram and Facebook ads.',
      timestamp: hoursAgo(4.80),
      status: 'read',
    },
    {
      id: 'msg_3_9',
      conversation_id: 'conv_3',
      sender_type: 'bot',
      content: 'Perfect volume! With that many leads, automation would save you 20-30 hours per month. Would you like to see exactly how we\'d set this up for your agency? I can get you on a quick demo call.',
      timestamp: hoursAgo(4.78),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P4',
          to: 'P5',
        },
      },
    },
    {
      id: 'msg_3_10',
      conversation_id: 'conv_3',
      sender_type: 'lead',
      content: 'Yes! When can we do the demo?',
      timestamp: hoursAgo(4.75),
      status: 'read',
    },
    {
      id: 'msg_3_11',
      conversation_id: 'conv_3',
      sender_type: 'bot',
      content: 'I\'m connecting you with Sergiu from our team. He\'ll send you a calendar link with available times. Usually takes less than 24 hours!',
      timestamp: hoursAgo(4.73),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P5',
          to: 'P6',
        },
      },
    },
    {
      id: 'msg_3_12',
      conversation_id: 'conv_3',
      sender_type: 'human',
      sender_name: 'Sergiu',
      content: 'Hi Elena! Sergiu here. Really excited to show you what we can do for your agency. Here\'s my calendar link: calendly.com/sergiu/demo. Pick any time that works for you!',
      timestamp: hoursAgo(3),
      status: 'read',
    },
    {
      id: 'msg_3_13',
      conversation_id: 'conv_3',
      sender_type: 'lead',
      content: 'Just booked for tomorrow at 2 PM! Looking forward to it.',
      timestamp: hoursAgo(2.5),
      status: 'read',
      metadata: {
        phase_transition: {
          from: 'P6',
          to: 'P7',
        },
        action: 'booked_call',
      },
    },
    {
      id: 'msg_3_14',
      conversation_id: 'conv_3',
      sender_type: 'human',
      sender_name: 'Sergiu',
      content: 'Perfect! See you tomorrow at 2 PM. I\'ll send you a prep email shortly with what to expect. 🎉',
      timestamp: hoursAgo(2.4),
      status: 'read',
    },
    {
      id: 'msg_3_15',
      conversation_id: 'conv_3',
      sender_type: 'lead',
      content: 'Thanks! Got the email. See you tomorrow!',
      timestamp: minutesAgo(30),
      status: 'read',
    },
  ],
}

// Conversation for Lead #5: Ion Radu (new, P1) - Very short, just started
const conversation5: Conversation = {
  id: 'conv_5',
  lead_id: '5',
  bot_active: true,
  human_taken_over: false,
  created_at: minutesAgo(15),
  updated_at: minutesAgo(2),
  messages: [
    {
      id: 'msg_5_1',
      conversation_id: 'conv_5',
      sender_type: 'bot',
      content: 'Hi Ion! 👋 Thanks for connecting. What brings you here today?',
      timestamp: minutesAgo(15),
      status: 'read',
    },
    {
      id: 'msg_5_2',
      conversation_id: 'conv_5',
      sender_type: 'lead',
      content: 'Hi! I saw your post about AI automation.',
      timestamp: minutesAgo(10),
      status: 'read',
    },
    {
      id: 'msg_5_3',
      conversation_id: 'conv_5',
      sender_type: 'bot',
      content: 'Great! What kind of business do you run?',
      timestamp: minutesAgo(8),
      status: 'delivered',
    },
    {
      id: 'msg_5_4',
      conversation_id: 'conv_5',
      sender_type: 'lead',
      content: 'I\'m just starting a coaching business.',
      timestamp: minutesAgo(2),
      status: 'read',
    },
  ],
}

// Mock conversations map
export const mockConversations: Record<string, Conversation> = {
  '1': conversation1,
  '2': conversation2,
  '3': conversation3,
  '5': conversation5,
}

// Helper to get conversation by lead ID
export function getConversationByLeadId(leadId: string): Conversation | null {
  return mockConversations[leadId] || null
}
