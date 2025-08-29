"use client";

import type React from "react";
import { useState, Suspense } from "react";
import {
  DocumentsCard,
  DocumentsCardLoading,
} from "./components/documents-card";
import {
  CollectionsCard,
  CollectionsCardLoading,
} from "./components/collections-card";
import { useRagContext } from "./providers/RAG";
import EmptyCollectionsState from "./components/empty-collections";

function RAGInterfaceInner() {
  const {
    selectedCollection,
    setSelectedCollection,
    collections,
    initialSearchExecuted,
  } = useRagContext();
  const [currentPage, setCurrentPage] = useState(1);

  if (initialSearchExecuted && !collections.length) {
    return <EmptyCollectionsState />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Collections Section */}
        <div className="md:col-span-1">
          {initialSearchExecuted ? (
            <CollectionsCard
              collections={collections}
              selectedCollection={selectedCollection}
              setSelectedCollection={setSelectedCollection}
              setCurrentPage={setCurrentPage}
            />
          ) : (
            <CollectionsCardLoading />
          )}
        </div>

        {/* Documents Section */}
        <div className="md:col-span-2">
          {initialSearchExecuted ? (
            <DocumentsCard
              selectedCollection={selectedCollection}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          ) : (
            <DocumentsCardLoading />
          )}
        </div>
      </div>
    </div>
  );
}

export default function RAGInterface() {
  return (
    <Suspense fallback={<div className="flex h-full w-full flex-col items-center justify-center"><div className="text-lg">Loading knowledge base...</div></div>}>
      <RAGInterfaceInner />
    </Suspense>
  );
}
