"use client";

import { useState, useEffect } from "react";
import type { Book } from "@/types";
import BookCard from "@/components/BookCard";
import UploadBookForm from "@/components/UploadBookForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast"; // Import useToast

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast(); // Initialize useToast

  useEffect(() => {
    setIsClient(true);
    try {
      const storedBooks = localStorage.getItem("bookshelf_books");
      if (storedBooks) {
        const loadedBooks = JSON.parse(storedBooks) as Book[];
        // Ensure loaded books have appropriate fallbacks if data URIs were stripped
        setBooks(loadedBooks.map(book => ({
          ...book,
          pdfDataUri: book.pdfDataUri || "", 
          coverImageUrl: book.coverImageUrl || "", 
        })));
      }
    } catch (error) {
      console.error("Failed to load books from localStorage:", error);
      // Optionally inform user about loading error
      toast({
        title: "Loading Error",
        description: "Could not load all book data from previous session.",
        variant: "destructive",
      });
    }
  }, []); // Removed isClient from dependency to run only once on mount

  useEffect(() => {
    if (isClient) {
      try {
        const booksToStore = books.map(book => {
          // Create a "light" version of the book for localStorage
          // Exclude pdfDataUri and data-URI coverImageUrls
          const { pdfDataUri, coverImageUrl, ...restOfBook } = book;
          return {
            ...restOfBook,
            pdfDataUri: "", // Always strip PDF data for localStorage
            coverImageUrl: coverImageUrl?.startsWith('data:image') ? "" : coverImageUrl, // Keep placeholder URLs, strip data:image URLs
          };
        });
        localStorage.setItem("bookshelf_books", JSON.stringify(booksToStore));
      } catch (error: any) {
        console.error("Failed to save books to localStorage:", error);
        if (error.name === 'QuotaExceededError') {
          toast({
            title: "Storage Limit Reached",
            description: "Could not save all book details due to browser storage limits. PDFs and custom covers won't persist. Metadata is saved.",
            variant: "destructive",
            duration: 9000,
          });
        } else {
          toast({
            title: "Storage Error",
            description: "An error occurred while saving your books.",
            variant: "destructive",
          });
        }
      }
    }
  }, [books, isClient, toast]); // Added toast to dependency array

  const handleSaveBook = (savedBook: Book, isEditing: boolean) => {
    if (isEditing) {
      setBooks((prevBooks) =>
        prevBooks.map((book) => (book.id === savedBook.id ? savedBook : book))
      );
    } else {
      setBooks((prevBooks) => [...prevBooks, savedBook]);
    }
    setIsUploadModalOpen(false);
    setEditingBook(null); 
  };

  const handleOpenEditModal = (book: Book) => {
    setEditingBook(book);
    setIsUploadModalOpen(true);
  };

  const handleRemoveBook = (bookId: string) => {
    setBooks((prevBooks) => prevBooks.filter((book) => book.id !== bookId));
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };
  
  const handleModalOpenChange = (open: boolean) => {
    setIsUploadModalOpen(open);
    if (!open) {
      setEditingBook(null); 
    }
  };

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <BookOpen className="h-16 w-16 text-primary animate-pulse" />
        <p className="text-xl font-headline text-primary mt-4">Loading BookShelf...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="py-6 px-4 md:px-8 border-b border-border shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-headline text-primary flex items-center">
            <BookOpen className="h-8 w-8 mr-3 text-accent" />
            BookShelf
          </h1>
          <div className="flex items-center space-x-2">
            <Button onClick={() => { setEditingBook(null); setIsUploadModalOpen(true); }} aria-label="Add new book">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Book
            </Button>
            <Button onClick={toggleTheme} variant="outline" size="icon" aria-label="Toggle theme">
              {theme === "light" ? (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-[60vh]">
            <BookOpen className="h-24 w-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-headline text-foreground mb-2">Your bookshelf is empty.</h2>
            <p className="text-muted-foreground mb-6">Click "Add Book" to start building your collection.</p>
            <Button onClick={() => { setEditingBook(null); setIsUploadModalOpen(true);}} size="lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Book
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onRemove={handleRemoveBook} onEdit={handleOpenEditModal} />
            ))}
          </div>
        )}
      </main>

      <UploadBookForm
        isOpen={isUploadModalOpen}
        onOpenChange={handleModalOpenChange}
        onSaveBook={handleSaveBook}
        bookToEdit={editingBook}
      />

      <footer className="py-4 px-4 md:px-8 border-t border-border mt-auto">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} BookShelf App. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
