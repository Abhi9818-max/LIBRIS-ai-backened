
"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { suggestBooks, SuggestBooksOutput } from "@/ai/flows/suggest-books-flow";
import { Loader2, Sparkles, Send, User, Bot, BookOpen, ChevronLeft } from "lucide-react";
import { useTheme } from "@/components/theme-provider"; // For header consistency
import { Sun, Moon } from "lucide-react"; // For header consistency

interface Message {
  id: string;
  sender: "user" | "ai";
  text?: string;
  suggestions?: SuggestBooksOutput["suggestions"];
  isLoading?: boolean;
}

export default function AiRecommendationsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme(); // For header consistency

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [messages]);
  
  useEffect(() => {
    // Initial AI message
    setMessages([
      {
        id: Date.now().toString(),
        sender: "ai",
        text: "Hello! I'm your AI Librarian. What kind of books are you looking for today? (e.g., 'Sci-fi adventures', 'cozy mysteries', 'books about ancient civilizations')"
      }
    ]);
  }, []);

  const handleSubmitQuery = async (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    const userMessage: Message = { id: Date.now().toString(), sender: "user", text: query };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsAiLoading(true);
    
    const loadingAiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, {id: loadingAiMessageId, sender: "ai", isLoading: true}]);

    try {
      const result = await suggestBooks({ query });
      setMessages((prevMessages) => 
        prevMessages.map(msg => 
          msg.id === loadingAiMessageId 
          ? { id: loadingAiMessageId, sender: "ai", suggestions: result.suggestions }
          : msg
        )
      );
      if (!result.suggestions || result.suggestions.length === 0 || (result.suggestions.length === 1 && result.suggestions[0].title === "No suggestions available")) {
         toast({
          title: "AI Response",
          description: "The AI couldn't find specific matches. Try rephrasing or a different query!",
        });
      }
    } catch (error: any) {
      console.error("Error getting book suggestions:", error);
      const errorMessage = `Sorry, I encountered an error: ${error.message || "Unknown error"}. Please try again.`;
      setMessages((prevMessages) => 
         prevMessages.map(msg => 
          msg.id === loadingAiMessageId 
          ? { id: loadingAiMessageId, sender: "ai", text: errorMessage }
          : msg
        )
      );
      toast({
        title: "AI Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="py-6 px-4 md:px-8 border-b border-border shadow-sm sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-primary flex items-center hover:text-accent transition-colors">
            <ChevronLeft className="h-7 w-7 mr-1" />
            <BookOpen className="h-8 w-8 mr-2 text-accent" />
            <h1 className="text-2xl md:text-3xl font-headline">AI Book Recommendations</h1>
          </Link>
           <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
        </div>
      </header>

      <main className="flex-grow flex flex-col container mx-auto p-4 md:p-6 max-w-3xl">
        <ScrollArea ref={scrollAreaRef} className="flex-grow mb-4 pr-4 -mr-4">
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <Card
                  className={`max-w-[85%] sm:max-w-[75%] shadow-md ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-l-xl rounded-br-xl"
                      : "bg-card text-card-foreground rounded-r-xl rounded-bl-xl"
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-2">
                      {message.sender === "ai" && <Bot className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />}
                      {message.sender === "user" && <User className="h-5 w-5 text-primary-foreground flex-shrink-0 mt-0.5" />}
                      
                      <div className="flex-grow">
                        {message.isLoading && (
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        )}
                        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                        {message.suggestions && (
                          <div className="space-y-3 mt-2">
                            {message.suggestions.map((book, index) => (
                              <Card key={index} className="bg-background/70 dark:bg-muted/70 shadow-inner">
                                <CardHeader className="pb-1 pt-3 px-3">
                                  <CardTitle className="text-base font-headline">{book.title}</CardTitle>
                                  <CardDescription className="text-xs">By: {book.author}</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm px-3 pb-3">
                                  <p className="text-xs italic mb-1">AI Recommendation:</p>
                                  <p>{book.reason}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmitQuery} className="mt-auto flex items-center space-x-2 p-2 border-t border-border bg-background sticky bottom-0">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask for book recommendations..."
            className="flex-grow"
            disabled={isAiLoading}
            aria-label="Your book query"
          />
          <Button type="submit" disabled={isAiLoading || !inputValue.trim()} size="icon" aria-label="Send query">
            {isAiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </main>
    </div>
  );
}
