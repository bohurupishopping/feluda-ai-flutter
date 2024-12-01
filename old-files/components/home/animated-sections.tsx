"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Sparkles, Zap, Brain, Command, Shield, Magnet } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const features = [
  {
    icon: Brain,
    title: "Ultimate Magajastra",
    description: "Powered by advanced AI models, FeludaAI combines analytical thinking with vast knowledge to solve complex queries.",
    color: "blue"
  },
  {
    icon: Sparkles,
    title: "Context-Aware Intelligence",
    description: "Like a true detective, FeludaAI understands context deeply, providing responses tailored to your specific needs.",
    color: "purple"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience real-time responses with our optimized AI processing capabilities.",
    color: "yellow"
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description: "Bank-grade encryption and privacy measures to keep your conversations completely secure.",
    color: "green"
  },
  {
    icon: Command,
    title: "Multi-Model Support",
    description: "Access multiple state-of-the-art AI models through a single, unified interface.",
    color: "pink"
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your data belongs to you. We never store or share your sensitive information.",
    color: "orange"
  }
];

export function AnimatedSections() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <motion.div 
        className="text-center space-y-8"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <motion.div
          variants={fadeInUp}
          className="space-y-6"
        >
          <div className="inline-block">
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/20"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Magnet className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Created by Pritam
              </span>
            </motion.div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            FeludaAI
            <br />
            <span className="text-3xl sm:text-4xl md:text-5xl">Your Ultimate Magajastra</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Experience the power of analytical thinking combined with advanced AI capabilities. 
            Like the legendary detective Feluda's Magajastra (brain power), we help solve your queries 
            with precision and intelligence.
          </p>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Link href="/login">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 
              hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-8 py-6 text-lg
              shadow-lg hover:shadow-xl transition-all duration-300
              transform hover:scale-105 active:scale-95">
              Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group p-8 rounded-3xl border bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm 
              hover:shadow-xl hover:-translate-y-1 transition-all duration-300
              border-white/20 dark:border-white/10"
          >
            <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br from-${feature.color}-500/20 to-${feature.color}-500/10 
              flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300
              border border-${feature.color}-500/20`}>
              <feature.icon className={`h-7 w-7 text-${feature.color}-600 dark:text-${feature.color}-400`} />
            </div>
            <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {feature.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
} 