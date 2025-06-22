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
