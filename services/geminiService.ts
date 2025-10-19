import { GoogleGenAI, Type } from "@google/genai";

// Check if API key is available
const API_KEY = (import.meta.env as any).VITE_GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

// Only initialize AI client if API key is available
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

// Offline mode flag
const isOfflineMode = !ai;

/**
 * Translates a batch of Chinese sentences to English using the Gemini API.
 * @param sentences - An array of Chinese sentences.
 * @returns A promise that resolves to an array of English translations.
 */
export const translateSentences = async (sentences: string[]): Promise<string[]> => {
  if (sentences.length === 0) {
    return [];
  }

  // Offline mode - return placeholder translations
  if (isOfflineMode) {
    console.log("Offline mode: Using placeholder translations");
    return sentences.map((sentence, index) => 
      `[Offline Mode] Translation for sentence ${index + 1}: "${sentence}"`
    );
  }

  try {
    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following Chinese sentences to English. Provide only the English translations as a JSON array of strings.
Chinese Sentences:
${sentences.map(s => `- ${s}`).join('\n')}
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "The English translation of a Chinese sentence."
          }
        }
      }
    });

    const jsonStr = response.text.trim();
    const translations = JSON.parse(jsonStr);
    
    if (Array.isArray(translations) && translations.every(t => typeof t === 'string')) {
      return translations;
    }
    
    throw new Error("AI response was not a valid array of strings.");

  } catch (e) {
    console.error("Error translating sentences with AI:", e);
    // Fallback behavior: return placeholder translations
    return sentences.map((sentence, index) => 
      `[AI Error] Translation for sentence ${index + 1}: "${sentence}"`
    );
  }
};

/**
 * Judges if a user's English translation of a Chinese sentence is correct.
 * @param {object} params - The parameters for judging.
 * @param {string} params.chinese - The original Chinese sentence.
 * @param {string} params.referenceEnglish - The reference correct English translation.
 * @param {string} params.userInput - The user's translation.
 * @returns A promise resolving to an object with `isCorrect` (boolean) and `reason` (string).
 */
export const judgeTranslation = async (
    { chinese, referenceEnglish, userInput }: { chinese: string; referenceEnglish: string; userInput: string; }
): Promise<{ isCorrect: boolean; reason: string }> => {
    // Offline mode - use simple string matching
    if (isOfflineMode) {
        console.log("Offline mode: Using simple string matching for translation judgment");
        const isCorrect = userInput.trim().toLowerCase() === referenceEnglish.trim().toLowerCase();
        return {
            isCorrect,
            reason: isCorrect 
                ? 'Correct! (Offline mode: Exact match)' 
                : `Incorrect. The expected answer was: "${referenceEnglish}" (Offline mode: Exact match required)`
        };
    }

    const prompt = `
You are an expert Chinese-to-English translation judge. A user is learning Chinese and has provided a translation for a given sentence. Your task is to determine if their translation is correct. Minor grammatical errors or alternative phrasings are acceptable as long as the core meaning is preserved.

- Chinese Sentence: "${chinese}"
- Reference English Translation: "${referenceEnglish}"
- User's English Translation: "${userInput}"

Analyze the user's translation.
If it is correct (preserving the meaning of the Chinese sentence), respond with isCorrect: true. Provide a short, encouraging reason.
If it is incorrect, respond with isCorrect: false. Provide a concise explanation of what is wrong and why. The reason should be helpful for a language learner.

Return a JSON object with two keys: "isCorrect" (boolean) and "reason" (string).
`;

  try {
    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isCorrect: {
                        type: Type.BOOLEAN,
                        description: "Whether the user's translation is correct."
                    },
                    reason: {
                        type: Type.STRING,
                        description: "Explanation for why the translation is correct or incorrect."
                    }
                },
                required: ["isCorrect", "reason"]
            }
        }
    });

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    return result;
  } catch (e) {
      console.error("Error parsing AI judge response:", e);
      // Fallback in case of AI error.
      const isCorrect = userInput.trim().toLowerCase() === referenceEnglish.trim().toLowerCase();
      return {
          isCorrect,
          reason: isCorrect ? 'Correct!' : `AI judge failed. The expected answer was: ${referenceEnglish}`
      };
  }
};

/**
 * Extracts key vocabulary words from a sentence to help a learner study.
 * @param userInput - The user's (incorrect) translation.
 * @param referenceEnglish - The correct English translation.
 * @returns A promise resolving to an array of {word, chinese} objects.
 */
export const extractWords = async (userInput: string, referenceEnglish: string): Promise<{ word: string, chinese:string }[]> => {
    // Offline mode - return empty array
    if (isOfflineMode) {
        console.log("Offline mode: No word extraction available");
        return [];
    }

    const prompt = `
Given a correct English sentence, identify up to 5 key vocabulary words (nouns, verbs, adjectives, important adverbs) that a language learner should study. For each key word, provide its Chinese translation in the context of the sentence.

Correct English Sentence: "${referenceEnglish}"

Return a JSON array of objects, where each object has a "word" key (the English word) and a "chinese" key (the Chinese translation).
For example, for the sentence "The quick brown fox jumps over the lazy dog", you might return:
[
  {"word": "quick", "chinese": "快的"},
  {"word": "fox", "chinese": "狐狸"},
  {"word": "jumps", "chinese": "跳"},
  {"word": "lazy", "chinese": "懒惰的"}
]
Do not include common words like "the", "a", "is", "over", etc. unless they are part of a key phrase.
`;
    
    try {
        const response = await ai!.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: {
                                type: Type.STRING,
                                description: "The key English vocabulary word."
                            },
                            chinese: {
                                type: Type.STRING,
                                description: "The Chinese translation of the word."
                            }
                        },
                        required: ["word", "chinese"]
                    }
                }
            }
        });

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return Array.isArray(result) ? result : [];
    } catch (e) {
        console.error("Error parsing AI extract words response:", e);
        // Return empty array on failure to avoid breaking the app.
        return [];
    }
};
