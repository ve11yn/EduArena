import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AIQuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

// Function to attempt auto-fixing wrong answers
function attemptAutoFix(question: AIQuizQuestion): AIQuizQuestion | null {
  try {
    const q = question.question.toLowerCase();
    
    // Extract the expected answer using same logic as validation
    const addMatch = q.match(/(\d+)\s*\+\s*(\d+)/);
    const subMatch = q.match(/(\d+)\s*-\s*(\d+)/);
    const mulMatch = q.match(/(\d+)\s*[×*x]\s*(\d+)/);
    const divMatch = q.match(/(\d+)\s*[÷/]\s*(\d+)/);
    
    let expectedAnswer: number | null = null;
    
    if (addMatch) {
      expectedAnswer = parseInt(addMatch[1]) + parseInt(addMatch[2]);
    } else if (subMatch) {
      expectedAnswer = parseInt(subMatch[1]) - parseInt(subMatch[2]);
    } else if (mulMatch) {
      expectedAnswer = parseInt(mulMatch[1]) * parseInt(mulMatch[2]);
    } else if (divMatch) {
      expectedAnswer = parseInt(divMatch[1]) / parseInt(divMatch[2]);
    }
    
    if (expectedAnswer !== null) {
      // Look for the correct answer in the options
      for (let i = 0; i < question.options.length; i++) {
        const optionValue = parseFloat(question.options[i].replace(/[^\d.-]/g, ''));
        if (Math.abs(expectedAnswer - optionValue) < 0.001) {
          console.log(`🔧 Found correct answer "${question.options[i]}" at index ${i}`);
          return {
            ...question,
            correct_answer: i
          };
        }
      }
      
      // If correct answer not found in options, we can't fix it
      console.log(`❌ Expected answer ${expectedAnswer} not found in options: ${question.options.join(', ')}`);
      return null;
    }
    
    return null;
  } catch (error) {
    console.log(`⚠️ Auto-fix error: ${error}`);
    return null;
  }
}

// Function to validate topic consistency
function validateTopicConsistency(question: AIQuizQuestion, expectedTopic: string): { isValid: boolean; reason?: string } {
  try {
    const q = question.question.toLowerCase();
    
    // Check for specific mathematical operations
    const hasAddition = /\+/.test(q);
    const hasSubtraction = /-/.test(q);
    const hasMultiplication = /[×*x]/.test(q);
    const hasDivision = /[÷/]/.test(q);
    
    if (expectedTopic.includes('Addition')) {
      if (!hasAddition) {
        return { isValid: false, reason: "Expected addition (+) but no addition found" };
      }
      if (hasSubtraction || hasMultiplication || hasDivision) {
        return { isValid: false, reason: "Found non-addition operations in addition topic" };
      }
    } else if (expectedTopic.includes('Subtraction')) {
      if (!hasSubtraction) {
        return { isValid: false, reason: "Expected subtraction (-) but no subtraction found" };
      }
      if (hasAddition || hasMultiplication || hasDivision) {
        return { isValid: false, reason: "Found non-subtraction operations in subtraction topic" };
      }
    } else if (expectedTopic.includes('Multiplication')) {
      if (!hasMultiplication) {
        return { isValid: false, reason: "Expected multiplication (×) but no multiplication found" };
      }
      if (hasAddition || hasSubtraction || hasDivision) {
        return { isValid: false, reason: "Found non-multiplication operations in multiplication topic" };
      }
    } else if (expectedTopic.includes('Division')) {
      if (!hasDivision) {
        return { isValid: false, reason: "Expected division (÷) but no division found" };
      }
      if (hasAddition || hasSubtraction || hasMultiplication) {
        return { isValid: false, reason: "Found non-division operations in division topic" };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: true }; // Don't fail on parsing errors
  }
}

// Enhanced math validation function
function validateMathQuestion(question: AIQuizQuestion): { isValid: boolean; reason?: string } {
  try {
    const q = question.question.toLowerCase();
    const correctOption = question.options[question.correct_answer];
    
    // Extract various types of mathematical operations
    const addMatch = q.match(/(\d+)\s*\+\s*(\d+)/);
    const subMatch = q.match(/(\d+)\s*-\s*(\d+)/);
    const mulMatch = q.match(/(\d+)\s*[×*x]\s*(\d+)/);
    const divMatch = q.match(/(\d+)\s*[÷/]\s*(\d+)/);
    const percentMatch = q.match(/(\d+)%\s*of\s*(\d+)/);
    const squareMatch = q.match(/(\d+)\s*squared|(\d+)²/);
    const sqrtMatch = q.match(/square root of\s*(\d+)|√(\d+)/);
    
    let expectedAnswer: number | null = null;
    let operation = '';
    
    if (addMatch) {
      expectedAnswer = parseInt(addMatch[1]) + parseInt(addMatch[2]);
      operation = `${addMatch[1]} + ${addMatch[2]}`;
    } else if (subMatch) {
      expectedAnswer = parseInt(subMatch[1]) - parseInt(subMatch[2]);
      operation = `${subMatch[1]} - ${subMatch[2]}`;
    } else if (mulMatch) {
      expectedAnswer = parseInt(mulMatch[1]) * parseInt(mulMatch[2]);
      operation = `${mulMatch[1]} × ${mulMatch[2]}`;
    } else if (divMatch) {
      expectedAnswer = parseInt(divMatch[1]) / parseInt(divMatch[2]);
      operation = `${divMatch[1]} ÷ ${divMatch[2]}`;
    } else if (percentMatch) {
      expectedAnswer = (parseInt(percentMatch[1]) / 100) * parseInt(percentMatch[2]);
      operation = `${percentMatch[1]}% of ${percentMatch[2]}`;
    } else if (squareMatch) {
      const num = parseInt(squareMatch[1] || squareMatch[2]);
      expectedAnswer = num * num;
      operation = `${num}²`;
    } else if (sqrtMatch) {
      const num = parseInt(sqrtMatch[1] || sqrtMatch[2]);
      expectedAnswer = Math.sqrt(num);
      operation = `√${num}`;
    }
    
    if (expectedAnswer !== null) {
      const selectedAnswer = parseFloat(correctOption.replace(/[^\d.-]/g, '')); // Remove non-numeric chars
      
      console.log(`🔍 Validating: ${operation} = ${expectedAnswer}`);
      console.log(`   Selected answer: "${correctOption}" (parsed as ${selectedAnswer})`);
      
      if (Math.abs(expectedAnswer - selectedAnswer) < 0.001) {
        console.log(`✅ Math validation PASSED`);
        return { isValid: true };
      } else {
        console.log(`❌ Math validation FAILED`);
        return { 
          isValid: false, 
          reason: `${operation} = ${expectedAnswer}, but correct_answer points to "${correctOption}" (${selectedAnswer})` 
        };
      }
    }
    
    // For complex questions we can't parse, assume valid
    console.log(`🤷 Cannot parse math question - assuming valid`);
    return { isValid: true };
  } catch (error) {
    console.log(`⚠️ Validation error - assuming valid: ${error}`);
    return { isValid: true }; // Don't fail validation due to parsing errors
  }
}

// Function to select a specific focused topic
function getSpecificTopic(subject: string, difficulty: string): string {
  const topics = {
    math: {
      beginner: [
        "Basic Addition (single digits)",
        "Basic Addition (double digits)", 
        "Basic Subtraction (single digits)",
        "Basic Subtraction (double digits)",
        "Simple Multiplication (times tables 1-5)",
        "Simple Division (basic facts)"
      ],
      intermediate: [
        "Multi-digit Addition",
        "Multi-digit Subtraction", 
        "Multiplication Tables (6-12)",
        "Division with Remainders",
        "Basic Fractions",
        "Percentages",
        "Simple Algebra Equations"
      ],
      advanced: [
        "Quadratic Equations",
        "Geometry - Areas and Perimeters",
        "Trigonometry Basics",
        "Statistics and Probability",
        "Advanced Algebra"
      ]
    },
    bahasa: {
      beginner: [
        "Basic Vocabulary",
        "Simple Grammar - Kata Benda",
        "Simple Grammar - Kata Kerja", 
        "Daily Expressions",
        "Basic Sentence Structure"
      ],
      intermediate: [
        "Imbuhan (Prefixes and Suffixes)",
        "Sentence Types",
        "Reading Comprehension",
        "Synonyms and Antonyms"
      ],
      advanced: [
        "Complex Grammar",
        "Literature Analysis",
        "Advanced Vocabulary",
        "Critical Reading"
      ]
    },
    english: {
      beginner: [
        "Basic Vocabulary",
        "Present Tense",
        "Simple Sentence Structure",
        "Common Verbs",
        "Basic Spelling"
      ],
      intermediate: [
        "Past and Future Tenses",
        "Conditional Sentences",
        "Vocabulary Building",
        "Reading Comprehension"
      ],
      advanced: [
        "Complex Grammar",
        "Academic Vocabulary",
        "Literature Analysis",
        "Advanced Writing"
      ]
    }
  };

  const subjectTopics = topics[subject as keyof typeof topics];
  if (!subjectTopics) return "General topics";
  
  const difficultyTopics = subjectTopics[difficulty as keyof typeof subjectTopics];
  if (!difficultyTopics || difficultyTopics.length === 0) return "General topics";
  
  // Randomly select one specific topic
  const randomIndex = Math.floor(Math.random() * difficultyTopics.length);
  return difficultyTopics[randomIndex];
}

export async function generateGeminiQuizQuestions(
  subject: string,
  difficulty: string,
  count: number = 5,
  overrideTopic?: string // Add optional parameter to override topic selection
): Promise<AIQuizQuestion[]> {
  console.log(`🤖 Gemini Service: Generating ${count} questions for ${subject} (${difficulty})`)
  
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured. Please add your API key to .env.local');
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

    // Select a specific focused topic for this question set
    const specificTopic = overrideTopic || getSpecificTopic(subject, difficulty);
    console.log(`🎯 Focusing on specific topic: ${specificTopic}${overrideTopic ? ' (override)' : ' (auto-selected)'}`);

    const subjectName = subjectMap[subject as keyof typeof subjectMap] || subject;
    const difficultyDesc = difficultyMap[difficulty as keyof typeof difficultyMap] || difficulty;

    const prompt = `You are creating quiz questions for: "${specificTopic}" ONLY.

Subject: ${subjectName} at ${difficultyDesc}
Specific Topic Focus: ${specificTopic}

ABSOLUTE REQUIREMENTS:
- Generate EXACTLY ${count} questions about "${specificTopic}" ONLY
- If the topic is "Basic Addition", use ONLY addition (+) problems
- If the topic is "Basic Subtraction", use ONLY subtraction (-) problems  
- If the topic is "Simple Multiplication", use ONLY multiplication (×) problems
- If the topic is "Simple Division", use ONLY division (÷) problems
- Do NOT mix different mathematical operations
- Each question must have exactly 4 options (A, B, C, D)
- Provide clear explanations for correct answers

${subject === 'math' && specificTopic.includes('Addition') ? `
ADDITION ONLY RULES:
- Every single question must be addition: "What is X + Y?"
- Use numbers appropriate for the level
- NO subtraction, multiplication, or division questions
- Example: "What is 5 + 3?", "What is 12 + 8?", etc.
` : ''}

${subject === 'math' && specificTopic.includes('Subtraction') ? `
SUBTRACTION ONLY RULES:
- Every single question must be subtraction: "What is X - Y?"
- Use numbers appropriate for the level (no negative results for beginners)
- NO addition, multiplication, or division questions
- Example: "What is 10 - 3?", "What is 15 - 7?", etc.
` : ''}

${subject === 'math' && specificTopic.includes('Multiplication') ? `
MULTIPLICATION ONLY RULES:
- Every single question must be multiplication: "What is X × Y?"
- Use numbers appropriate for the level
- NO addition, subtraction, or division questions
- Example: "What is 3 × 4?", "What is 6 × 7?", etc.
` : ''}

${subject === 'math' && specificTopic.includes('Division') ? `
DIVISION ONLY RULES:
- Every single question must be division: "What is X ÷ Y?"
- Use numbers that result in whole numbers for beginners
- NO addition, subtraction, or multiplication questions
- Example: "What is 12 ÷ 3?", "What is 20 ÷ 4?", etc.
` : ''}

${subject === 'math' ? `MATHEMATICAL ACCURACY WITH VALIDATION:
STEP-BY-STEP PROCESS FOR EACH QUESTION:
1. Create the mathematical question using ONLY the specified operation
2. Calculate the correct answer manually
3. Create 4 options including the correct answer
4. VALIDATION: Double-check which option index contains the correct answer
5. Set correct_answer to that index
6. FINAL CHECK: Verify options[correct_answer] equals your calculated result

COMMON MISTAKES TO AVOID:
- Using different mathematical operations than specified
- Setting correct_answer to the numerical result instead of the index
- Not checking if the option at that index actually contains the right answer` : ''}

${subject === 'bahasa' ? `ACCURACY FOR BAHASA:
- Double-check grammar rules and vocabulary definitions
- Verify that the correct_answer index points to the linguistically correct option
- Focus exclusively on "${specificTopic}" - do not mix with other topics` : ''}

${subject === 'english' ? `ACCURACY FOR ENGLISH:
- Double-check grammar rules and vocabulary definitions  
- Verify that the correct_answer index points to the linguistically correct option
- Focus exclusively on "${specificTopic}" - do not mix with other topics` : ''}

Format your response as a JSON array with this exact structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "explanation": "Explanation of why this is correct"
  }
]

${subject === 'math' ? `
EXAMPLE for "${specificTopic}":
${specificTopic.includes('Addition') ? `{
  "question": "What is 8 + 5?",
  "options": ["11", "13", "15", "17"],
  "correct_answer": 1,
  "explanation": "8 + 5 = 13"
}` : ''}
${specificTopic.includes('Subtraction') ? `{
  "question": "What is 15 - 7?",
  "options": ["6", "8", "9", "10"],
  "correct_answer": 1,
  "explanation": "15 - 7 = 8"
}` : ''}
${specificTopic.includes('Multiplication') ? `{
  "question": "What is 6 × 7?",
  "options": ["40", "42", "44", "46"],
  "correct_answer": 1,
  "explanation": "6 × 7 = 42"
}` : ''}
${specificTopic.includes('Division') ? `{
  "question": "What is 24 ÷ 6?",
  "options": ["3", "4", "5", "6"],
  "correct_answer": 1,
  "explanation": "24 ÷ 6 = 4"
}` : ''}
${!specificTopic.includes('Addition') && !specificTopic.includes('Subtraction') && !specificTopic.includes('Multiplication') && !specificTopic.includes('Division') ? `{
  "question": "Sample question for ${specificTopic}",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": 1,
  "explanation": "Explanation here"
}` : ''}
Note: correct_answer is the index where options[index] equals the mathematical result.
` : ''}

REMEMBER: Focus ONLY on "${specificTopic}" - do not mix different topics or operations!

Make sure correct_answer is the index (0-3) of the correct option in the options array.
IMPORTANT: Return ONLY the JSON array, no additional text or formatting.`;

    console.log(`🎯 Starting Gemini request for ${count} questions...`)

    // Get the model (try gemini-1.5-flash first, fallback to gemini-1.5-pro if needed)
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (error) {
      console.warn('Falling back to gemini-1.5-pro model');
      model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    console.log(`🎯 Gemini response received`)
    console.log(`🎯 Response length: ${content.length} characters`)

    if (!content) {
      throw new Error('No response from Gemini');
    }

    // Clean the response - remove any markdown formatting
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let questions: AIQuizQuestion[];
    try {
      questions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', cleanContent);
      throw new Error('Invalid response format from Gemini');
    }

    // Validate the response structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from Gemini');
    }

    console.log(`🎯 Parsed ${questions.length} questions from Gemini response`)

    // Validate each question
    const validatedQuestions = questions.map((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer > 3 ||
          !q.explanation) {
        throw new Error(`Invalid question format at index ${index}`);
      }

      // Log question for debugging
      console.log(`🔍 Validating question ${index + 1}:`);
      console.log(`   Q: ${q.question}`);
      console.log(`   Options: ${q.options.join(', ')}`);
      console.log(`   Correct index: ${q.correct_answer}`);
      console.log(`   Correct answer: "${q.options[q.correct_answer]}"`);

      // For math questions, validate topic consistency and accuracy
      if (subject === 'math' && q.question) {
        // Check if the question matches the requested topic
        const topicValidation = validateTopicConsistency(q, specificTopic);
        if (!topicValidation.isValid) {
          console.error(`❌ TOPIC VIOLATION in question ${index + 1}: ${topicValidation.reason}`);
          console.error(`   Expected: ${specificTopic}`);
          console.error(`   Got: ${q.question}`);
          throw new Error(`Question ${index + 1} violates topic requirement: ${topicValidation.reason}`);
        }
        
        // Validate mathematical accuracy
        const validationResult = validateMathQuestion(q);
        if (!validationResult.isValid) {
          console.warn(`⚠️  Math validation failed for question ${index + 1}: ${validationResult.reason}`);
          
          // Try to auto-fix by finding the correct answer in the options
          const fixedQuestion = attemptAutoFix(q);
          if (fixedQuestion) {
            console.log(`🔧 Auto-fixed question ${index + 1}`);
            return fixedQuestion;
          } else {
            console.warn(`❌ Could not auto-fix question ${index + 1} - keeping original but flagged`);
          }
        } else {
          console.log(`✅ Math validation passed for question ${index + 1}`);
        }
      }

      return q;
    });

    const finalQuestions = validatedQuestions.slice(0, count);
    
    // Final quality check - if too many math questions failed validation, retry
    if (subject === 'math') {
      const failedValidations = validatedQuestions.filter((_, index) => {
        const validation = validateMathQuestion(validatedQuestions[index]);
        return !validation.isValid;
      }).length;
      
      const failureRate = failedValidations / validatedQuestions.length;
      console.log(`📊 Math validation summary: ${failedValidations}/${validatedQuestions.length} failed (${(failureRate * 100).toFixed(1)}%)`);
      
      if (failureRate > 0.3) { // If more than 30% failed
        console.warn(`⚠️ High failure rate (${(failureRate * 100).toFixed(1)}%) - questions may be unreliable`);
        console.warn(`💡 Consider using static questions for this topic or retrying generation`);
      }
    }
    
    console.log(`🎯 Returning ${finalQuestions.length} validated questions (requested: ${count})`)
    
    return finalQuestions;

  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Gemini API key not configured. Please add your API key to .env.local');
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        throw new Error('Gemini model not available. Please check model name or try again later.');
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error('Gemini API quota exceeded. Please try again later.');
      }
    }
    
    throw new Error('Failed to generate questions with Gemini AI. Please try again.');
  }
}
