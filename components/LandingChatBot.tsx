"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, X, Send, Bot, User, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
};

export default function LandingChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      content: "Hi there! 👋 I'm the VidCognify Assistant. How can I help you understand our features today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Optionally only show on certain pages or everywhere. User asked for *all* pages.
  // const pathname = usePathname();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/bot-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          history: newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })) 
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "bot", content: data.answer },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { 
          id: (Date.now() + 1).toString(), 
          role: "bot", 
          content: "Oops! I encountered an error answering that. Please try again later." 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-xl shadow-purple-500/30 flex items-center justify-center text-white border-2 border-white/10 dark:border-white/5"
            aria-label="Open support chat"
          >
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <GraduationCap className="w-7 h-7" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">VidCognify Assistant</h3>
                  <p className="text-[10px] text-white/80 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI Powered
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-[#0a0a0f]/50">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-auto ${
                    msg.role === "user" 
                      ? "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300" 
                      : "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
                  }`}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user" 
                      ? "bg-violet-600 text-white rounded-br-sm" 
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0 text-violet-600 dark:text-violet-400">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about VidCognify..."
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full pl-4 pr-12 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 border border-transparent focus:border-violet-500/50 transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white flex items-center justify-center transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
