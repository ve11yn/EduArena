'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [userInput, setUserInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Greetings, user. I am online and ready. Select a command or type your own.' }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);

    const userMessage: Message = { role: 'user', content: message };
    const assistantPlaceholder: Message = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Network response was not ok.');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          const updatedLastMessage = { ...lastMessage, content: lastMessage.content + chunk };
          return [...prev.slice(0, -1), updatedLastMessage];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          const updatedLastMessage = { ...lastMessage, content: 'SYSTEM ERROR. CONNECTION LOST. PLEASE TRY AGAIN.' };
          return [...prev.slice(0, -1), updatedLastMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(userInput);
    setUserInput('');
  };

  const handleSuggestedPromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-screen bg-retro-darker text-retro-cyan font-mono">
      <header className="bg-retro-dark p-4 border-b-2 border-retro-cyan shadow-lg shadow-retro-cyan/20">
        <h1 className="glitch text-center" data-text="AI CHATBOT v1.5">AI CHATBOT v1.5</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-xl lg:max-w-3xl px-5 py-3 border-2 ${msg.role === 'user' ? 'bg-retro-blue/20 border-retro-blue text-white' : 'bg-retro-dark/80 border-retro-cyan'}`}
              style={{
                clipPath: msg.role === 'user' 
                  ? 'polygon(0 0, 100% 0, 100% 100%, 15px 100%, 0 calc(100% - 15px))' 
                  : 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)'
              }}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1].role === 'assistant' && (
           <div className="flex justify-start">
             <div className="px-5 py-3 border-2 bg-retro-dark/80 border-retro-cyan" style={{clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)'}}>
                <div className="flex items-center space-x-2">
                    <span className="text-retro-green animate-pulse">[</span>
                    <span className="text-retro-yellow animate-pulse delay-150">■</span>
                    <span className="text-retro-pink animate-pulse delay-300">■</span>
                    <span className="text-retro-red animate-pulse delay-500">■</span>
                    <span className="text-retro-green animate-pulse delay-700">]</span>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-retro-dark border-t-2 border-retro-cyan shadow-lg shadow-retro-cyan/20">
        {!isLoading && (
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button onClick={() => handleSuggestedPromptClick("Tell me a fun fact about programming")} className="retro-button text-xs font-bold px-3 py-1">Fun Fact</button>
            <button onClick={() => handleSuggestedPromptClick("Explain quantum computing simply")} className="retro-button text-xs font-bold px-3 py-1">Quantum Computing</button>
            <button onClick={() => handleSuggestedPromptClick("Write a haiku about a computer virus")} className="retro-button text-xs font-bold px-3 py-1">Virus Haiku</button>
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="flex items-center space-x-4">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={isLoading ? "Awaiting response..." : "> Enter command..."}
            disabled={isLoading}
            className="flex-1 p-3 bg-retro-dark border-2 border-retro-cyan focus:outline-none focus:ring-2 focus:ring-retro-pink text-retro-green placeholder-retro-green/50 disabled:opacity-50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="retro-button font-bold px-6 py-3"
          >
            ASK
          </button>
        </form>
      </div>
    </div>
  );
}
