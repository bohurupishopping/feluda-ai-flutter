import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Send, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface StoryRewriterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

export const StoryRewriterPopup: React.FC<StoryRewriterPopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [scriptContext, setScriptContext] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const prompt = `Here is the old script that needs refinement:

${scriptContext}

Make minor improvements to the story while keeping the storyline, structure, and word count intact. Focus on:

- Enhancing punctuation and spacing for readability
- Clarifying sentence structures for smoother flow
- Choosing more precise and effective words where needed
- Maintaining consistent formatting throughout
- Adding any missing words where necessary
- Adopting a modern, professional Bengali storytelling style

Avoid major rewrites, deletions, or significant alterations. The goal is to subtly elevate the story without altering its core elements or style.`;

    onSubmit(prompt);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
            className="bg-gradient-to-br from-white to-purple-50/90 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/50"
          >
            <div className="p-6 border-b border-purple-100/50 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-purple-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-200"></div>
                    <div className="relative bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Story Rewriter
                    </h2>
                    <p className="text-sm text-gray-500">Refine and polish your story</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Script Context
                  <span className="text-purple-500"><Sparkles className="w-4 h-4" /></span>
                </label>
                <Textarea
                  placeholder="Paste your story text here for refinement..."
                  value={scriptContext}
                  onChange={(e) => setScriptContext(e.target.value)}
                  rows={10}
                  className="rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm hover:border-purple-300 transition-colors duration-200 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!scriptContext}
                  className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Rewrite Story
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StoryRewriterPopup; 