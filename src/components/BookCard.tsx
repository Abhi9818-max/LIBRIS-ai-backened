
"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookCardProps {
  book: Book;
  onOpenDetailView: (book: Book, tab: 'details' | 'read') => void;
}

export default function BookCard({ book, onOpenDetailView }: BookCardProps) {
  const [progressColor, setProgressColor] = useState<string>('hsl(var(--primary))');

  useEffect(() => {
    // Generate random color on client mount to avoid hydration mismatch
    const randomHue = Math.floor(Math.random() * 360);
    const randomSaturation = Math.floor(Math.random() * 30) + 70; 
    const randomLightness = Math.floor(Math.random() * 20) + 50; 
    setProgressColor(`hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`);
  }, []); 

  const percentageRead = book.totalPages && book.currentPage && book.totalPages > 0
    ? Math.round((book.currentPage / book.totalPages) * 100)
    : 0;


  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out animate-fade-in">
      <CardHeader className="p-4 pb-2">
        <div 
          className="aspect-[2/3] w-full relative mb-2 rounded-md overflow-hidden cursor-pointer"
          onDoubleClick={() => onOpenDetailView(book, 'read')}
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
          <div className="mt-2 space-y-2">
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
               <div className="flex flex-col">
                <p className="text-sm font-medium text-foreground">
                  Reading Progress
                </p>
                <p className="text-xs text-muted-foreground">
                  Page {book.currentPage || 'N/A'} of {book.totalPages}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpenDetailView(book, 'read')}
          aria-label={`Read ${book.title}`}
          className="w-full"
        >
          <BookOpen className="mr-2 h-4 w-4" /> Read
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenDetailView(book, 'details')}
          aria-label={`View details for ${book.title}`}
          className="w-full"
        >
          <Info className="mr-2 h-4 w-4" /> Details
        </Button>
      </CardFooter>
    </Card>
  );
}
