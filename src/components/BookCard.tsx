"use client";

import type { Book } from "@/types";
import Image from "next/image";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, BookOpen } from "lucide-react";

interface BookCardProps {
  book: Book;
  onOpenDetailView: (book: Book, tab: 'details' | 'read') => void;
}

export default function BookCard({ book, onOpenDetailView }: BookCardProps) {
  const percentageRead = book.totalPages && book.currentPage !== undefined && book.totalPages > 0
    ? Math.round((book.currentPage / book.totalPages) * 100)
    : 0;

  const isComplete = percentageRead >= 100;

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
        
        <div className="flex items-center justify-between mt-2 gap-2">
            {book.category && (
                <Badge variant="outline" className="truncate">{book.category}</Badge>
            )}
            {book.totalPages && book.totalPages > 0 && book.currentPage !== undefined ? (
                <div className="flex items-center gap-1.5 flex-shrink-0" title={`${percentageRead}% complete`}>
                    <div className="relative h-5 w-5">
                        <svg className="h-full w-full" viewBox="0 0 36 36">
                        <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            className="stroke-current text-muted/30"
                            strokeWidth="3.8"
                        />
                        <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="3.8"
                            strokeDasharray={isComplete ? "100, 100" : `${percentageRead}, 100`}
                            strokeLinecap="round"
                            className="origin-center -rotate-90 transition-all duration-300 ease-in-out"
                        />
                        </svg>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{percentageRead}%</span>
                </div>
            ) : null}
        </div>
      </CardHeader>
      
      <div className="flex-grow" /> 
      
      <CardFooter className="p-4 pt-2 flex flex-col gap-2">
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
