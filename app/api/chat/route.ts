import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in the .env.local file");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * @param {NextRequest} req 
 * @returns {NextResponse} 
 */

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      generationConfig: {
        maxOutputTokens: 1000,
      },
      history: [], 
      systemInstruction: {
        role: 'model', 
        parts: [
          {
            text: "You are an AI assistant specialized in academic and study-related topics. Your purpose is to provide helpful and accurate information, explanations, and resources for subjects like mathematics, science, literature, history, and other educational fields. If a user asks a question that is not related to studying, academics, or general knowledge that can be applied to learning, you must politely decline to answer by saying: 'I am designed to assist with study-related questions only. Please ask me something related to academics or learning.' Do not engage in discussions about entertainment, personal opinions, current events, or any non-academic subjects.",
          },
        ],
      },
    });

    const result = await chat.sendMessageStream(message);

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          try {
            const chunkText = chunk.text();
            const encodedText = new TextEncoder().encode(chunkText);
            controller.enqueue(encodedText);
          } catch (e) {
             console.error("Error processing stream chunk:", e);
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    console.error("Error in chat API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}