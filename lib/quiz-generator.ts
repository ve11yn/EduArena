import { generateGeminiQuizQuestions } from './gemini-service';

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export const generateQuizQuestions = async (
  subject: string,
  difficulty?: string,
  count = 5,
): Promise<QuizQuestion[]> => {
  // For PvP, use intermediate difficulty if no difficulty specified
  const actualDifficulty = difficulty || "intermediate"

  // Try Gemini AI first, fallback to static if it fails
  try {
    console.log(`🤖 Attempting Gemini AI generation: ${count} questions for ${subject} (${actualDifficulty})`);
    const aiQuestions = await generateGeminiQuizQuestions(subject, actualDifficulty, count);
    console.log(`✅ GEMINI SUCCESS: Generated ${aiQuestions.length} questions`);
    return aiQuestions;
  } catch (error) {
    console.warn('❌ Gemini AI generation failed:', error instanceof Error ? error.message : error);
    
    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('API key')) {
      console.warn('� Gemini API key not configured - using static questions as fallback');
    }
    
    // Fallback to static questions
    console.log(`📚 Falling back to static questions: ${count} for ${subject} (${actualDifficulty})`);
    return generateStaticQuestions(subject, actualDifficulty, count);
  }
}

const generateStaticQuestions = (
  subject: string,
  difficulty: string,
  count: number
): QuizQuestion[] => {
  // Mock quiz questions for different subjects and difficulties
  const quizBank = {
    math: {
      beginner: [
        {
          question: "What is 15 + 27?",
          options: ["40", "42", "44", "46"],
          correct_answer: 1,
          explanation: "15 + 27 = 42",
        },
        {
          question: "What is 8 × 7?",
          options: ["54", "56", "58", "60"],
          correct_answer: 1,
          explanation: "8 × 7 = 56",
        },
        {
          question: "What is 100 - 37?",
          options: ["63", "67", "73", "77"],
          correct_answer: 0,
          explanation: "100 - 37 = 63",
        },
        {
          question: "What is 12 ÷ 3?",
          options: ["3", "4", "5", "6"],
          correct_answer: 1,
          explanation: "12 ÷ 3 = 4",
        },
        {
          question: "What is 9 × 6?",
          options: ["52", "54", "56", "58"],
          correct_answer: 1,
          explanation: "9 × 6 = 54",
        },
      ],
      intermediate: [
        {
          question: "What is the square root of 144?",
          options: ["10", "11", "12", "13"],
          correct_answer: 2,
          explanation: "√144 = 12 because 12² = 144",
        },
        {
          question: "If x + 5 = 12, what is x?",
          options: ["5", "6", "7", "8"],
          correct_answer: 2,
          explanation: "x + 5 = 12, so x = 12 - 5 = 7",
        },
        {
          question: "What is 25% of 80?",
          options: ["15", "20", "25", "30"],
          correct_answer: 1,
          explanation: "25% of 80 = 0.25 × 80 = 20",
        },
        {
          question: "What is 3² + 4²?",
          options: ["25", "24", "23", "26"],
          correct_answer: 0,
          explanation: "3² + 4² = 9 + 16 = 25",
        },
        {
          question: "If 2x = 16, what is x?",
          options: ["6", "7", "8", "9"],
          correct_answer: 2,
          explanation: "2x = 16, so x = 16 ÷ 2 = 8",
        },
      ],
      advanced: [
        {
          question: "What is the derivative of x³?",
          options: ["2x²", "3x²", "x²", "3x³"],
          correct_answer: 1,
          explanation: "The derivative of x³ is 3x² using the power rule",
        },
        {
          question: "Solve: 2x² - 8x + 6 = 0",
          options: ["x = 1, 3", "x = 2, 4", "x = 1, 6", "x = 3, 2"],
          correct_answer: 0,
          explanation: "Using the quadratic formula: x = 1 and x = 3",
        },
        {
          question: "What is the integral of 2x?",
          options: ["x²", "x² + C", "2x²", "x² + 2C"],
          correct_answer: 1,
          explanation: "The integral of 2x is x² + C",
        },
        {
          question: "What is log₂(8)?",
          options: ["2", "3", "4", "5"],
          correct_answer: 1,
          explanation: "log₂(8) = 3 because 2³ = 8",
        },
        {
          question: "What is the limit of (x² - 1)/(x - 1) as x approaches 1?",
          options: ["0", "1", "2", "undefined"],
          correct_answer: 2,
          explanation: "Using L'Hôpital's rule or factoring: limit = 2",
        },
      ],
    },
    english: {
      beginner: [
        {
          question: "Which word is a noun?",
          options: ["Run", "Beautiful", "House", "Quickly"],
          correct_answer: 2,
          explanation: "House is a noun - it names a thing",
        },
        {
          question: "Choose the correct sentence:",
          options: ["I are happy", "I is happy", "I am happy", "I be happy"],
          correct_answer: 2,
          explanation: "'I am happy' uses the correct form of the verb 'to be'",
        },
        {
          question: "What is the plural of 'child'?",
          options: ["childs", "children", "childes", "child"],
          correct_answer: 1,
          explanation: "The plural of 'child' is 'children'",
        },
        {
          question: "Which word is an adjective?",
          options: ["Run", "Beautiful", "Quickly", "Jump"],
          correct_answer: 1,
          explanation: "Beautiful is an adjective - it describes something",
        },
        {
          question: "Choose the correct article:",
          options: ["a apple", "an apple", "the apples", "a apples"],
          correct_answer: 1,
          explanation: "Use 'an' before words starting with vowel sounds",
        },
      ],
      intermediate: [
        {
          question: "What is the past tense of 'go'?",
          options: ["Goes", "Gone", "Went", "Going"],
          correct_answer: 2,
          explanation: "The past tense of 'go' is 'went'",
        },
        {
          question: "Which sentence is in passive voice?",
          options: ["John wrote the letter", "The letter was written by John", "John is writing", "John will write"],
          correct_answer: 1,
          explanation: "Passive voice: 'The letter was written by John'",
        },
        {
          question: "What type of word is 'quickly'?",
          options: ["Noun", "Verb", "Adjective", "Adverb"],
          correct_answer: 3,
          explanation: "'Quickly' is an adverb - it describes how something is done",
        },
        {
          question: "Choose the correct conditional:",
          options: ["If I was rich", "If I were rich", "If I am rich", "If I be rich"],
          correct_answer: 1,
          explanation: "Use 'were' in hypothetical conditionals",
        },
        {
          question: "What is the comparative form of 'good'?",
          options: ["gooder", "more good", "better", "best"],
          correct_answer: 2,
          explanation: "The comparative form of 'good' is 'better'",
        },
      ],
      advanced: [
        {
          question: "Which sentence uses correct subject-verb agreement?",
          options: [
            "The team are playing well",
            "The team is playing well",
            "The teams is playing well",
            "The teams are play well",
          ],
          correct_answer: 1,
          explanation: "Team is a collective noun that takes a singular verb: 'The team is playing well'",
        },
        {
          question: "Identify the literary device: 'The wind whispered through the trees'",
          options: ["Metaphor", "Simile", "Personification", "Alliteration"],
          correct_answer: 2,
          explanation: "Personification gives human qualities (whispering) to non-human things (wind)",
        },
        {
          question: "What is the function of 'whom' in: 'The person whom I met'?",
          options: ["Subject", "Object", "Possessive", "Predicate"],
          correct_answer: 1,
          explanation: "'Whom' functions as the object of the verb 'met'",
        },
        {
          question: "Which sentence uses the subjunctive mood?",
          options: ["I wish I was there", "I wish I were there", "I wish I am there", "I wish I will be there"],
          correct_answer: 1,
          explanation: "The subjunctive mood uses 'were' for hypothetical situations",
        },
        {
          question: "What type of clause is 'because it was raining'?",
          options: ["Independent", "Dependent", "Relative", "Noun"],
          correct_answer: 1,
          explanation: "It's a dependent clause because it cannot stand alone",
        },
      ],
    },
    bahasa: {
      beginner: [
        {
          question: "Apa arti kata 'rumah' dalam bahasa Indonesia?",
          options: ["Car", "House", "School", "Book"],
          correct_answer: 1,
          explanation: "Rumah artinya house dalam bahasa Inggris",
        },
        {
          question: "Pilih kalimat yang benar:",
          options: [
            "Saya pergi ke sekolah",
            "Saya pergi pada sekolah",
            "Saya pergi di sekolah",
            "Saya pergi dari sekolah",
          ],
          correct_answer: 0,
          explanation: "'Saya pergi ke sekolah' menggunakan preposisi yang tepat",
        },
        {
          question: "Apa bentuk jamak dari 'buku'?",
          options: ["buku-buku", "bukus", "buku-bukuan", "para buku"],
          correct_answer: 0,
          explanation: "Bentuk jamak 'buku' adalah 'buku-buku'",
        },
        {
          question: "Manakah kata kerja?",
          options: ["Meja", "Biru", "Berlari", "Besar"],
          correct_answer: 2,
          explanation: "Berlari adalah kata kerja yang menunjukkan tindakan",
        },
        {
          question: "Pilih kata ganti yang tepat: '... sedang makan'",
          options: ["Dia", "Mereka", "Kami", "Semua benar"],
          correct_answer: 3,
          explanation: "Semua kata ganti tersebut dapat digunakan",
        },
      ],
      intermediate: [
        {
          question: "Manakah yang merupakan kata kerja?",
          options: ["Meja", "Berlari", "Biru", "Besar"],
          correct_answer: 1,
          explanation: "Berlari adalah kata kerja yang menunjukkan tindakan",
        },
        {
          question: "Apa bentuk jamak dari 'anak'?",
          options: ["Anak-anak", "Anaks", "Anak-anakan", "Para anak"],
          correct_answer: 0,
          explanation: "Bentuk jamak 'anak' adalah 'anak-anak'",
        },
        {
          question: "Pilih awalan yang tepat: '...tulis surat'",
          options: ["me-", "ber-", "ter-", "pe-"],
          correct_answer: 0,
          explanation: "Awalan 'me-' membentuk kata 'menulis'",
        },
        {
          question: "Manakah kata sifat?",
          options: ["Berlari", "Cantik", "Menulis", "Bermain"],
          correct_answer: 1,
          explanation: "Cantik adalah kata sifat yang menggambarkan keadaan",
        },
        {
          question: "Apa sinonim dari 'besar'?",
          options: ["Kecil", "Luas", "Sempit", "Pendek"],
          correct_answer: 1,
          explanation: "Luas adalah sinonim dari besar",
        },
      ],
      advanced: [
        {
          question: "Apa bentuk pasif dari kalimat 'Saya membaca buku'?",
          options: ["Buku saya baca", "Buku dibaca oleh saya", "Saya baca buku", "Membaca buku saya"],
          correct_answer: 1,
          explanation: "Bentuk pasif yang benar adalah 'Buku dibaca oleh saya'",
        },
        {
          question: "Manakah majas personifikasi?",
          options: [
            "Cantik seperti bunga",
            "Angin berbisik lembut",
            "Dia singa di medan perang",
            "Hujan turun dengan deras",
          ],
          correct_answer: 1,
          explanation: "Personifikasi memberikan sifat manusia pada benda mati: 'Angin berbisik'",
        },
        {
          question: "Apa fungsi imbuhan 'ke-an' dalam kata 'kebahagiaan'?",
          options: [
            "Membentuk kata kerja",
            "Membentuk kata benda",
            "Membentuk kata sifat",
            "Membentuk kata keterangan",
          ],
          correct_answer: 1,
          explanation: "Imbuhan 'ke-an' membentuk kata benda abstrak",
        },
        {
          question: "Manakah kalimat majemuk setara?",
          options: [
            "Dia pergi karena sakit",
            "Ani membaca dan Budi menulis",
            "Ketika hujan, kami pulang",
            "Rumah yang besar itu",
          ],
          correct_answer: 1,
          explanation: "Kalimat majemuk setara menggabungkan dua klausa yang setara",
        },
        {
          question: "Apa jenis kata 'dengan cepat'?",
          options: ["Kata benda", "Kata kerja", "Kata sifat", "Kata keterangan"],
          correct_answer: 3,
          explanation: "'Dengan cepat' adalah kata keterangan cara",
        },
      ],
    },
  }

  const subjectQuestions = quizBank[subject as keyof typeof quizBank]
  if (!subjectQuestions) {
    throw new Error(`Subject ${subject} not supported`)
  }

  const difficultyQuestions = subjectQuestions[difficulty as keyof typeof subjectQuestions]
  if (!difficultyQuestions) {
    throw new Error(`Difficulty ${difficulty} not supported for subject ${subject}`)
  }

  // Return random questions from the available ones
  const shuffled = [...difficultyQuestions].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

// Keep the old function for backward compatibility
export const generateQuizQuestion = async (subject: string, difficulty?: string): Promise<QuizQuestion> => {
  const questions = await generateQuizQuestions(subject, difficulty, 1)
  return questions[0]
}
