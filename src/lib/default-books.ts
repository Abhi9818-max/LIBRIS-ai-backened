
import type { Book } from '@/types';

// A minimal, one-page PDF encoded as a data URI.
const tinyPdfDataUri = "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXQogIC9Db3VudCAxCiAgL0tpZHMgWyAzIDAgUiBdCj4+CmVuZG9iagoKMyAwIG9iago8PAogIC9UeXBlIC9QYWdlCiAgL1BhcmVudCAyIDAgUgogIC9SZXNvdXJjZXMgPDwKICAgIC9Gb250IDw8CiAgICAgIC9GMSAxMiAwIFIKICAgID4+CiAgPj4KICAvQ29udGVudHMgPDwKICAgIC9MZW5ndGggNTIKICA+PgpzdHJlYW0KICBCVAogICAvRjEgMTIgVGYKICAgMSA1IFRsCiAgIDUgODUgVGQKICAgKFRoaXMgaXMgYSBzYW1wbGUgUERGIGZpbGUuKSBUagogIEVUCmVuZHN0cmVhbQplbmRvYmoKCjEyIDAgb2JqICUgIHBhZ2UgY29udGVudAo8PAogIC9UeXBlIC9Gb250CiAgL1N1YnR5cGUgL1R5cGUxCiAgL0Jhc2VGb250IC9UaW1lcy1Sb21hbgogIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCj4+CmVuZG9iagoKeHJlZgowIDEzCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOCAwMDAwMCBuIAowMDAwMDAwMDc3IDAwMDAwIG4gCjAwMDAwMDAxNzQgMDAwMDAgbiAKMDAwMDAwMDQ1MCAwMDAwMCBuIAowMDAwMDAwMDAwICAwMDAwMCBuIAowMDAwMDAwMDAwICAwMDAwMCBuIAowMDAwMDAwMDAwICAwMDAwMCBuIAowMDAwMDAwMDAwICAwMDAwMCBuIAowMDAwMDAwMDAwICAwMDAwMCBuIAowMDAwMDAwMDAwICAwMDAwMCBuIAowMDAwMDAwMDAwICAwMDAwMCBuIAowMDAwMDAwMzI4IDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSAxMwogIC9Sb290IDEgMCBSCiAgL0luZm8gPDwKICAgIC9DcmVhdGlvbkRhdGUgKEQ6MjAyNDA2MjNUMTE0MjE5KzAwJzAwJykKICAgIC9Nb2REYXRlIChEOjIwMjQwNjIzMTE0MjE5KzAwJzAwJykKICA+Pgo+PgpzdGFydHhyZWYKNzQ0CiUlRU9GCg==";

export const defaultBooks: Omit<Book, 'id'>[] = [
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    summary: "The story of the mysteriously wealthy Jay Gatsby and his passion and obsession for the beautiful Daisy Buchanan. A quintessential novel of the Jazz Age.",
    category: "Novel",
    coverImageUrl: "https://placehold.co/200x300.png",
    pdfFileName: "the-great-gatsby-sample.pdf",
    pdfDataUri: tinyPdfDataUri,
    totalPages: 1,
    currentPage: 1,
  },
  {
    title: "Moby Dick",
    author: "Herman Melville",
    summary: "The saga of Captain Ahab and his relentless pursuit of Moby Dick, the great white whale that crippled him. A story of obsession, revenge, and the conflict between man and nature.",
    category: "Novel",
    coverImageUrl: "https://placehold.co/200x300.png",
    pdfFileName: "moby-dick-sample.pdf",
    pdfDataUri: tinyPdfDataUri,
    totalPages: 1,
    currentPage: 1,
  },
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    summary: "A romantic novel that charts the emotional development of the protagonist Elizabeth Bennet, who learns the error of making hasty judgments and comes to appreciate the difference between the superficial and the essential.",
    category: "Novel",
    coverImageUrl: "https://placehold.co/200x300.png",
    pdfFileName: "pride-and-prejudice-sample.pdf",
    pdfDataUri: tinyPdfDataUri,
    totalPages: 1,
    currentPage: 1,
  },
];
