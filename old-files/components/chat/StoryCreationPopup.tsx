import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Send, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StoryCreationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

export const StoryCreationPopup: React.FC<StoryCreationPopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [genre, setGenre] = useState('');
  const [wordCount, setWordCount] = useState('');
  const [chapterSummary, setChapterSummary] = useState('');
  const [referenceText, setReferenceText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const prompt = `We're creating a story in the ${genre} genre. This story will unfold across multiple chapters, each with vivid descriptions, dynamic character development, and a Bengali literary style with cinematic, immersive elements.

Let's begin by creating Chapter 1 with approximately ${wordCount} words.

Chapter Summary: ${chapterSummary}

${referenceText ? `Reference for tone and style: ${referenceText}\n\n` : ''}Please rewrite the chapter with a polished, captivating literary style, expanding upon the storyline, enhancing the atmosphere, and adding depth to the characters. Use more descriptive language and dialogue to bring the story to life in a visually immersive, cinematic way, while preserving the main events and themes of the original summary. Ensure the writing is authentic to Bengali literature, with refined language, emotional depth, and cultural richness.`;

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
            className="bg-gradient-to-br from-white to-blue-50/90 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/50"
          >
            <div className="p-6 border-b border-blue-100/50 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-blue-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-200"></div>
                    <div className="relative bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-lg">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Create Story
                    </h2>
                    <p className="text-sm text-gray-500">Craft your narrative masterpiece</p>
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
                  Genre
                  <span className="text-blue-500"><Sparkles className="w-4 h-4" /></span>
                </label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm hover:border-blue-300 transition-colors duration-200">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 bg-white/90 backdrop-blur-md">
                    <SelectItem value="thriller">Thriller</SelectItem>
                    <SelectItem value="romance">Romance</SelectItem>
                    <SelectItem value="horror">Horror</SelectItem>
                    <SelectItem value="drama">Drama</SelectItem>
                    <SelectItem value="mystery">Mystery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Approximate Word Count
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 1000"
                  value={wordCount}
                  onChange={(e) => setWordCount(e.target.value)}
                  className="rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm hover:border-blue-300 transition-colors duration-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Chapter Summary
                </label>
                <Textarea
                  placeholder="Write a brief summary of your chapter..."
                  value={chapterSummary}
                  onChange={(e) => setChapterSummary(e.target.value)}
                  rows={4}
                  className="rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm hover:border-blue-300 transition-colors duration-200 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Reference Text (Optional)
                </label>
                <Textarea
                  placeholder="Add any reference text or style notes..."
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  rows={3}
                  className="rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm hover:border-blue-300 transition-colors duration-200 resize-none"
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
                  disabled={!genre || !wordCount || !chapterSummary}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Generate Story
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StoryCreationPopup; 