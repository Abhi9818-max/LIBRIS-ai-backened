
"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { useState, ChangeEvent, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookCardProps {
  book: Book;
  onUpdateProgress: (bookId: string, currentPage: number) => void;
  onOpenDetailView: (book: Book) => void;
}

export default function BookCard({ book, onUpdateProgress, onOpenDetailView }: BookCardProps) {
  const { toast } = useToast();
  const [currentPageInput, setCurrentPageInput] = useState<string>((book.currentPage || 1).toString());
  const [progressColor, setProgressColor] = useState<string>('hsl(var(--primary))');

  useEffect(() => {
    setCurrentPageInput((book.currentPage || 1).toString());
  }, [book.currentPage]);

  useEffect(() => {
    // Generate random color on client mount to avoid hydration mismatch
    const randomHue = Math.floor(Math.random() * 360);
    const randomSaturation = Math.floor(Math.random() * 30) + 70; 
    const randomLightness = Math.floor(Math.random() * 20) + 50; 
    setProgressColor(`hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`);
  }, []); 

  const handleProgressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentPageInput(e.target.value);
  };

  const handleSaveProgress = () => {
    const newPage = parseInt(currentPageInput, 10);
    if (isNaN(newPage) || newPage < 1 || (book.totalPages && newPage > book.totalPages)) {
      toast({
        title: "Invalid Page Number",
        description: `Please enter a valid page number between 1 and ${book.totalPages || 'the total pages'}.`,
        variant: "destructive",
      });
      return;
    }
    onUpdateProgress(book.id, newPage);
    toast({
      title: "Progress Saved!",
      description: `Page ${newPage} saved for "${book.title}".`,
    });
  };
  
  const percentageRead = book.totalPages && book.currentPage && book.totalPages > 0
    ? Math.round((book.currentPage / book.totalPages) * 100)
    : 0;


  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out animate-fade-in">
      <CardHeader className="p-4">
        <div 
          className="aspect-[2/3] w-full relative mb-2 rounded-md overflow-hidden cursor-pointer"
          onDoubleClick={() => onOpenDetailView(book)}
          title="Double-click to read"
        >
          <Image
            src={book.coverImageUrl || "https://placehold.co/200x300.png"}
            alt={`Cover of ${book.title}`}
            layout="fill"
            objectFit="cover"
            data-ai-hint="book cover"
            className="transition-opacity opacity-0 duration-500"
            onLoadingComplete={(image) => image.classList.remove('opacity-0')}
          />
        </div>
        <CardTitle className="font-headline text-lg truncate" title={book.title}>{book.title || "Untitled Book"}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground truncate" title={book.author}>By: {book.author || "Unknown Author"}</CardDescription>
        {book.category && (
          <Badge variant="outline" className="w-fit mt-2">{book.category}</Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        {book.totalPages && book.totalPages > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center space-x-3">
              <div className="relative h-12 w-12 flex-shrink-0">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    className="stroke-current text-muted/20" 
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke={progressColor}
                    strokeWidth="3"
                    strokeDasharray={`${percentageRead}, 100`}
                    strokeDashoffset="25" 
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-in-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-foreground">
                    {percentageRead}%
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground">
                Reading Progress
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Input 
                type="number" 
                value={currentPageInput} 
                onChange={handleProgressChange} 
                min="1"
                max={book.totalPages}
                className="h-8 text-xs w-16"
                aria-label="Current page"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                / {book.totalPages} pages
              </span>
              <Button 
                size="xs" 
                variant="outline" 
                onClick={handleSaveProgress} 
                aria-label="Save progress"
                className="ml-auto"
              >
                <Save className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpenDetailView(book)}
          aria-label={`View details for ${book.title}`}
          className="w-full"
        >
          <Eye className="mr-2 h-4 w-4" /> View & Read
        </Button>
      </CardFooter>
    </Card>
  );
}
