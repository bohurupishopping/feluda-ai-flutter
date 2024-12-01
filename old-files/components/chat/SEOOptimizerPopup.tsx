import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Send, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SEOOptimizerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

type ContentType = 'youtube' | 'webpage' | 'social' | 'product';

export const SEOOptimizerPopup: React.FC<SEOOptimizerPopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [keywords, setKeywords] = useState('');
  const [contentType, setContentType] = useState<ContentType>('webpage');
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const keywordsList = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    let prompt = '';

    switch (contentType) {
      case 'youtube':
        prompt = `As an expert YouTube SEO specialist, optimize this video content with these specific requirements:

Target Keywords: ${keywordsList.join(', ')}
Main Title Concept: ${title}

Please provide a comprehensive SEO optimization package:

1. Title Suggestions (70 chars max):
- Create 5 engaging titles that naturally incorporate the main keywords
- Each title should be optimized for CTR and search visibility
- Include at least one of these keywords: ${keywordsList.slice(0, 3).join(', ')}

2. Video Description:
- Write a 2-3 paragraph description (300-400 words)
- First paragraph must include primary keywords within first 150 characters
- Naturally weave in ALL provided keywords: ${keywordsList.join(', ')}
- Include relevant LSI (Latent Semantic Indexing) keywords
- Add strategic timestamps with keyword-rich descriptions

3. Tags & Hashtags:
- List 15-20 most relevant tags incorporating all keywords
- Prioritize long-tail keyword variations
- Include 5-7 trending hashtags related to: ${keywordsList.join(', ')}

4. Engagement Elements:
- 3 compelling call-to-action phrases
- 5 engaging questions for comments
- Timestamp template with keyword-rich section titles
- Card/end screen suggestions

5. Thumbnail Text Suggestions:
- 3-4 short, high-CTR text options incorporating main keywords
- Color and styling recommendations for maximum impact

Additional Requirements:
- Ensure ALL provided keywords (${keywordsList.join(', ')}) are naturally integrated
- Optimize for both search algorithms and user engagement
- Follow latest YouTube SEO best practices (2024)
- Include competitor analysis tips for these keywords

Format the response in clear sections with markdown formatting for better readability.`;
        break;

      case 'webpage':
        prompt = `As an advanced SEO specialist, create a comprehensive webpage optimization strategy:

Primary Keywords: ${keywordsList.join(', ')}
Page Topic: ${title}

Deliver a complete SEO package with these specific elements:

1. Title Tag & Meta Options:
- Create 3 SEO-optimized title tags (max 60 chars) using primary keywords
- Write 3 meta descriptions (max 160 chars) incorporating ALL keywords naturally
- Include click-worthy call-to-action elements

2. Content Structure:
- Full H1-H6 heading hierarchy incorporating keywords: ${keywordsList.join(', ')}
- Detailed content outline (2000 words) with keyword placement suggestions
- LSI keywords and semantic variations for each main keyword

3. Technical SEO Elements:
- Schema markup code (JSON-LD) optimized for this content type
- Canonical URL structure
- XML sitemap entry template
- Internal linking strategy with anchor text variations

4. On-Page SEO:
- Image alt text templates incorporating keywords
- URL slug suggestions with keyword optimization
- Meta robots directives
- Open Graph and Twitter Card meta tags

5. Content Optimization:
- Keyword density recommendations for each provided keyword
- Natural placement suggestions for: ${keywordsList.join(', ')}
- Related topics and semantic keywords to include
- Content readability guidelines

6. Rich Snippet Optimization:
- FAQ schema suggestions using keywords
- Featured snippet optimization tips
- Rich result opportunities for this content

Additional Requirements:
- Ensure ALL keywords (${keywordsList.join(', ')}) are strategically placed
- Follow latest Google guidelines (2024)
- Include mobile optimization suggestions
- Provide Core Web Vitals optimization tips

Format the response with clear markdown sections and code blocks where needed.`;
        break;

      case 'social':
        prompt = `As a social media optimization expert, create platform-specific content that maximizes engagement:

Target Keywords: ${keywordsList.join(', ')}
Content Topic: ${title}

Provide a multi-platform social media optimization package:

1. Platform-Specific Posts:
Instagram:
- 5 caption variations with strategic keyword placement
- Story sequence suggestions incorporating: ${keywordsList.join(', ')}
- Relevant emoji combinations for each post
- Hashtag groups (30 tags) including all keywords

Twitter/X:
- 5 tweet variations (280 chars) using keywords naturally
- Thread structure incorporating all keywords
- Viral tweet patterns using: ${keywordsList.join(', ')}
- Strategic hashtag combinations (5-7 per tweet)

LinkedIn:
- Professional post variation with all keywords
- Article outline incorporating: ${keywordsList.join(', ')}
- Engagement prompts for business audience
- Industry-specific hashtags (10-15)

2. Engagement Optimization:
- Time posting recommendations per platform
- Engagement-triggering questions using keywords
- Call-to-action variations for each platform
- Viral hooks incorporating: ${keywordsList.join(', ')}

3. Visual Content Suggestions:
- Image caption templates with keywords
- Carousel post structures
- Video content ideas incorporating keywords
- Design tips for each platform

4. Hashtag Strategy:
- Platform-specific hashtag groups
- Trending hashtags related to: ${keywordsList.join(', ')}
- Branded hashtag suggestions
- Hashtag performance tracking tips

Additional Requirements:
- Natural integration of ALL keywords: ${keywordsList.join(', ')}
- Platform-specific best practices (2024)
- Engagement metrics optimization
- Content calendar suggestions

Format response with clear sections for each platform and content type.`;
        break;

      case 'product':
        prompt = `As an e-commerce SEO specialist, optimize this product listing for maximum visibility and conversion:

Product Keywords: ${keywordsList.join(', ')}
Product Name: ${title}

Create a comprehensive e-commerce optimization package:

1. Product Title Optimization:
- 3 SEO-optimized product title variations
- Marketplace-specific title formats (Amazon, eBay, Shopify)
- Keyword-rich subtitle suggestions using: ${keywordsList.join(', ')}

2. Product Description:
- Short description (150-160 chars) with primary keywords
- Long description (500+ words) incorporating ALL keywords
- Bullet points highlighting key features with keyword integration
- Technical specifications with SEO optimization

3. Search Optimization:
- Category mapping recommendations
- Search terms/keywords priority list
- Backend search terms incorporating: ${keywordsList.join(', ')}
- Competitor keyword analysis

4. Rich Content Elements:
- Product image alt text templates
- A+ content outline (Amazon) or enhanced brand content
- Feature-benefit matrix with keyword integration
- Comparison chart optimization

5. Technical SEO:
- Product schema markup (JSON-LD)
- Canonical URL structure
- Breadcrumb optimization
- Internal linking strategy

6. Marketplace-Specific:
- Amazon search terms optimization
- eBay item specifics
- Google Shopping feed optimization
- Social commerce optimization

Additional Requirements:
- Natural integration of ALL keywords: ${keywordsList.join(', ')}
- Conversion rate optimization elements
- Mobile optimization guidelines
- Cross-marketplace optimization tips

Format the response with clear sections and include code blocks for technical elements.`;
        break;
    }

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
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      SEO Optimizer
                    </h2>
                    <p className="text-sm text-gray-500">Optimize your content for better visibility</p>
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
                  Content Type
                  <span className="text-purple-500"><Sparkles className="w-4 h-4" /></span>
                </label>
                <Select value={contentType} onValueChange={(value: ContentType) => setContentType(value)}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm hover:border-purple-300 transition-colors duration-200">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-200 bg-white/90 backdrop-blur-md">
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                    <SelectItem value="webpage">Webpage</SelectItem>
                    <SelectItem value="social">Social Media Post</SelectItem>
                    <SelectItem value="product">Product Listing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Target Keywords
                </label>
                <Input
                  placeholder="Enter keywords (comma separated)"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm hover:border-purple-300 transition-colors duration-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {contentType === 'youtube' ? 'Video Title' :
                   contentType === 'webpage' ? 'Page Title' :
                   contentType === 'social' ? 'Post Topic' :
                   'Product Name'}
                </label>
                <Input
                  placeholder="Enter title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl border-gray-200 bg-white/70 backdrop-blur-sm hover:border-purple-300 transition-colors duration-200"
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
                  disabled={!contentType || !keywords || !title}
                  className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Generate SEO Content
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SEOOptimizerPopup; 