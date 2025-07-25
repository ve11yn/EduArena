import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AIQuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export async function generateAIQuizQuestions(
  subject: string,
  difficulty: string,
  count: number = 5
): Promise<AIQuizQuestion[]> {
  console.log(`🎯 OpenAI Service: Starting generation for ${subject} (${difficulty}) - ${count} questions`)
  console.log(`🔑 API Key available:`, !!process.env.OPENAI_API_KEY)
  console.log(`🔑 API Key starts with:`, process.env.OPENAI_API_KEY?.substring(0, 10) + '...')
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.error('❌ OpenAI API key not configured')
    throw new Error('OpenAI API key not configured. Please add your API key to .env.local');
  }

  try {
    const difficultyMap = {
      beginner: 'basic/elementary level',
      intermediate: 'intermediate/high school level', 
      advanced: 'advanced/university level'
    };

    const subjectMap = {
      math: 'Mathematics',
      bahasa: 'Bahasa Indonesia (Indonesian Language)',
      english: 'English Language'
    };

    const subjectName = subjectMap[subject as keyof typeof subjectMap] || subject;
    const difficultyDesc = difficultyMap[difficulty as keyof typeof difficultyMap] || difficulty;

    const prompt = `Generate ${count} multiple choice quiz questions for ${subjectName} at ${difficultyDesc}.

Requirements:
- Each question should have exactly 4 options (A, B, C, D)
- Questions should be appropriate for the difficulty level
- Include varied question types (calculation, concept, application)
- Provide clear explanations for correct answers
- Make questions engaging and educational

${subject === 'bahasa' ? 'For Bahasa Indonesia questions, focus on grammar, vocabulary, reading comprehension, and literature.' : ''}
${subject === 'english' ? 'For English questions, focus on grammar, vocabulary, reading comprehension, and writing skills.' : ''}
${subject === 'math' ? 'For Math questions, include arithmetic, algebra, geometry, or other relevant topics for the level.' : ''}

Format your response as a JSON array with this exact structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "Explanation of why this is correct"
  }
]

Make sure correct_answer is the index (0-3) of the correct option in the options array.`;

    console.log(`🎯 Starting OpenAI request for ${count} questions...`)
    
    // Calculate appropriate max_tokens based on question count
    // Roughly 150-200 tokens per question (including options and explanation)
    const tokensPerQuestion = 200
    const baseTokens = 500 // For system prompt and formatting
    const maxTokens = Math.min(4000, baseTokens + (count * tokensPerQuestion))
    
    console.log(`🎯 Using max_tokens: ${maxTokens} for ${count} questions`)

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: "You are an expert educator who creates high-quality educational quiz questions. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.8, // Some creativity but still consistent
    });

    console.log(`🎯 OpenAI response received, tokens used: ${completion.usage?.total_tokens || 'unknown'}`)

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log(`🎯 Response length: ${content.length} characters`)

    // Parse the JSON response
    let questions: AIQuizQuestion[];
    try {
      questions = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate the response structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from OpenAI');
    }

    console.log(`🎯 Parsed ${questions.length} questions from OpenAI response`)

    // Validate each question
    const validatedQuestions = questions.map((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer > 3 ||
          !q.explanation) {
        throw new Error(`Invalid question format at index ${index}`);
      }
      return q;
    });

    const finalQuestions = validatedQuestions.slice(0, count);
    console.log(`🎯 Returning ${finalQuestions.length} validated questions (requested: ${count})`)
    
    return finalQuestions; // Ensure we return exactly the requested count

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Return fallback to static questions if API fails
    if (error instanceof Error && error.message.includes('API key not configured')) {
      throw error; // Re-throw API key errors
    }
    
    throw new Error('Failed to generate questions with AI. Please try again.');
  }
}
