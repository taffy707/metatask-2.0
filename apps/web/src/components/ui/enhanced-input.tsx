"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

interface EnhancedInputProps {
  placeholders?: string[];
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  hasMessages?: boolean; // New prop to indicate if conversation has started
}

export function EnhancedInput({
  placeholders = ["Type your message...", "Ask me anything...", "What can I help you with?", "Start a conversation..."],
  className,
  value,
  onChange,
  onKeyDown,
  onPaste,
  placeholder,
  disabled = false,
  name,
  hasMessages = false,
  ...props
}: EnhancedInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const startAnimation = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 2000);
  }, [placeholders.length]);

  const stopAnimation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isActive && !value && !hasMessages) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => stopAnimation();
  }, [isActive, value, hasMessages, startAnimation, stopAnimation]);

  const handleFocus = () => {
    setIsActive(true);
    stopAnimation();
  };

  const handleBlur = () => {
    if (!value) {
      setIsActive(false);
    }
  };

  const currentPlaceholderText = placeholder || placeholders[currentPlaceholder];

  return (
    <div className="relative w-full">
      {/* Main Input Container */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200",
          isActive && "border-gray-300 shadow-sm",
          className
        )}
      >
        {/* Placeholder Animation */}
        <AnimatePresence mode="wait">
          {!isActive && !value && !hasMessages && (
            <motion.div
              key={currentPlaceholder}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 0.7, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute left-3.5 top-3.5 pointer-events-none text-gray-500 z-10"
            >
              {currentPlaceholderText}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The actual textarea */}
        <textarea
          ref={inputRef}
          name={name}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "field-sizing-content w-full resize-none border-none bg-transparent p-3.5 pb-3.5 text-gray-900 shadow-none ring-0 outline-none focus:ring-0 focus:outline-none",
            "relative z-20 min-h-[3.5rem] max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          )}
          rows={1}
          {...props}
        />
      </div>
    </div>
  );
}