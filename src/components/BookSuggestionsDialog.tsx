
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { suggestBooks, SuggestBooksOutput } from "@/ai/flows/suggest-books-flow";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BookSuggestionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookSuggestionsDialog({ isOpen, onOpenChange }: BookSuggestionsDialogProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestBooksOutput["suggestions"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGetSuggestions = async () => {
    if (!query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter what kind of book you're looking for.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSuggestions([]); // Clear previous suggestions
    try {
      const result = await suggestBooks({ query });
      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      } else {
        setSuggestions([{ title: "No Specific Suggestions", author: "AI Assistant", reason: "The AI couldn't find specific matches. Try a different query!" }]);
      }
    } catch (error: any) {
      console.error("Error getting book suggestions:", error);
      toast({
        title: "AI Error",
        description: `Could not get suggestions: ${error.message || "Unknown error"}.`,
        variant: "destructive",
      });
      setSuggestions([{ title: "Error", author: "System", reason: "Failed to fetch suggestions." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-primary" />
            AI Book Recommendations
          </DialogTitle>
          <DialogDescription>
            Tell us what you're in the mood to read (e.g., "science fiction with strong female lead", "lighthearted fantasy novels", "books about ancient Rome").
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="suggestion-query">Your Query:</Label>
            <div className="flex space-x-2">
              <Input
                id="suggestion-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., epic fantasy with dragons"
                disabled={isLoading}
              />
              <Button onClick={handleGetSuggestions} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Get Suggestions"
                )}
              </Button>
            </div>
          </div>

          { (isLoading || suggestions.length > 0) && (
             <div className="flex-grow overflow-y-auto pr-2 space-y-3 max-h-[50vh]">
                {isLoading && suggestions.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-10">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p>Asking the AI librarian...</p>
                    </div>
                )}
                {suggestions.map((book, index) => (
                <Card key={index} className="shadow-sm">
                    <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-md font-headline">{book.title}</CardTitle>
                    <CardDescription className="text-xs">By: {book.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm px-4 pb-4">
                    <p className="text-muted-foreground text-xs italic mb-1">AI Recommendation:</p>
                    <p>{book.reason}</p>
                    </CardContent>
                </Card>
                ))}
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
