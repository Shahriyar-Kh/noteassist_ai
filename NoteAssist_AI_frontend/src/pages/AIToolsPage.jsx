/**
 * AIToolsPage - AI Tools Hub & Dashboard
 * 
 * Features:
 * - Showcase of AI tools
 * - AI generation history
 * - Filter and search history
 * - Save to notes functionality
 * - Design system integration
 * - Responsive layout
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Helmet } from 'react-helmet-async';
import { 
  Sparkles, Wand2, FileText, Code, Trash2,
  Clock, ArrowRight, Zap, Loader2, AlertCircle,
  TrendingUp, Award, Brain, LogIn, Terminal, Edit3, Wrench
} from 'lucide-react';
import { Button, Card, PageContainer, FormInput } from '@/components/design-system';
import { noteService } from '@/services/note.service';
import dashboardService from '@/services/dashboard.service';
import toast from 'react-hot-toast';

/* ─── Injected styles ─────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');

  :root {
    --ai-void: #05050f;
    --ai-deep: #0d0d1a;
    --ai-surface: #12122a;
    --ai-border: rgba(120,80,255,0.18);
    --ai-violet: #7c4dff;
    --ai-purple: #a259ff;
    --ai-cyan: #00e5ff;
    --ai-blue: #2979ff;
    --ai-emerald: #00e096;
    --ai-orange: #ff6d00;
    --ai-glow: rgba(124,77,255,0.35);
    --ai-text: #e8e4ff;
    --ai-muted: rgba(232,228,255,0.5);
  }

  /* ── Keyframes ── */
  @keyframes ai-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%       { transform: translateY(-12px) rotate(1deg); }
    66%       { transform: translateY(-6px) rotate(-1deg); }
  }
  @keyframes ai-pulse-ring {
    0%   { transform: scale(0.9); opacity: 0.8; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes ai-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes ai-scan {
    0%   { top: 0%; }
    100% { top: 100%; }
  }
  @keyframes ai-grid-move {
    0%   { transform: translateY(0); }
    100% { transform: translateY(40px); }
  }
  @keyframes ai-fade-up {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ai-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes ai-orb-drift {
    0%, 100% { transform: translate(0,0) scale(1); }
    25%       { transform: translate(30px,-20px) scale(1.08); }
    50%       { transform: translate(-20px,15px) scale(0.95); }
    75%       { transform: translate(15px,25px) scale(1.03); }
  }
  @keyframes ai-line-grow {
    from { scaleX: 0; }
    to   { scaleX: 1; }
  }
  @keyframes ai-card-in {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes ai-rotate-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes ai-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes ai-counter {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Utility classes ── */
  .ai-font-display { font-family: 'Plus Jakarta Sans', sans-serif !important; }
  .ai-font-body    { font-family: 'Inter', sans-serif !important; }

  .ai-page {
    font-family: 'Inter', sans-serif;
    background: var(--ai-void);
    min-height: 100vh;
    color: var(--ai-text);
    position: relative;
    overflow-x: hidden;
  }

  /* ── Hero ── */
  .ai-hero {
    position: relative;
    min-height: 420px;
    display: flex;
    align-items: flex-end;
    padding: 0 0 48px;
    overflow: hidden;
    margin: -24px -24px 0;
  }
  @media (min-width: 640px) {
    .ai-hero { min-height: 500px; padding: 0 0 64px; }
  }
  @media (min-width: 768px) {
    .ai-hero { margin: -32px -32px 0; min-height: 580px; padding: 0 0 80px; }
  }

  /* Hero image layer */
  .ai-hero-bg {
    position: absolute;
    inset: 0;
    background-image: url('https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1600&q=80');
    background-size: cover;
    background-position: center 30%;
    filter: brightness(0.35) saturate(1.4);
  }

  /* Gradient overlay on top of image */
  .ai-hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      160deg,
      rgba(5,5,15,0.55) 0%,
      rgba(13,13,26,0.40) 40%,
      rgba(5,5,15,0.92) 100%
    );
  }

  .ai-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    will-change: transform;
  }
  .ai-orb-1 {
    width: 260px; height: 260px;
    top: -80px; right: -40px;
    background: radial-gradient(circle, rgba(124,77,255,0.45) 0%, transparent 70%);
    animation: ai-orb-drift 18s ease-in-out infinite;
  }
  .ai-orb-2 {
    width: 200px; height: 200px;
    bottom: -60px; left: 10%;
    background: radial-gradient(circle, rgba(0,229,255,0.25) 0%, transparent 70%);
    animation: ai-orb-drift 14s ease-in-out infinite reverse;
  }
  .ai-orb-3 {
    width: 160px; height: 160px;
    top: 40%; left: 40%;
    background: radial-gradient(circle, rgba(162,89,255,0.2) 0%, transparent 70%);
    animation: ai-orb-drift 22s ease-in-out infinite 4s;
  }
  @media (min-width: 768px) {
    .ai-orb-1 { width: 420px; height: 420px; }
    .ai-orb-2 { width: 300px; height: 300px; }
    .ai-orb-3 { width: 200px; height: 200px; }
  }

  /* Animated scan line */
  .ai-hero-scan {
    position: absolute;
    left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--ai-cyan), transparent);
    opacity: 0.4;
    animation: ai-scan 6s linear infinite;
  }

  /* Grid pattern overlay */
  .ai-grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(124,77,255,0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(124,77,255,0.07) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: ai-grid-move 8s linear infinite;
    opacity: 0.6;
  }

  .ai-hero-content {
    position: relative;
    z-index: 10;
    padding: 0 16px;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    animation: ai-fade-up 0.9s cubic-bezier(0.16,1,0.3,1) forwards;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  @media (min-width: 640px) { .ai-hero-content { padding: 0 24px; } }

  .ai-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 100px;
    border: 1px solid rgba(124,77,255,0.4);
    background: rgba(124,77,255,0.12);
    backdrop-filter: blur(8px);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ai-purple);
    margin-bottom: 20px;
  }

  .ai-hero-badge .ai-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--ai-cyan);
    animation: ai-blink 1.8s ease-in-out infinite;
  }

  .ai-hero-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: clamp(2rem, 6vw, 5.5rem);
    font-weight: 800;
    line-height: 1.05;
    color: #fff;
    margin-bottom: 16px;
    text-shadow: 0 0 60px rgba(124,77,255,0.4);
  }
  @media (min-width: 640px) { .ai-hero-title { margin-bottom: 20px; } }

  .ai-hero-title .ai-title-gradient {
    background: linear-gradient(135deg, #a259ff 0%, #00e5ff 60%, #7c4dff 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ai-shimmer 4s linear infinite;
  }

  .ai-hero-sub {
    font-size: clamp(0.9rem, 2.5vw, 1.1rem);
    color: rgba(232,228,255,0.65);
    max-width: 600px;
    line-height: 1.7;
    margin: 0 auto 32px;
    font-weight: 300;
    text-align: center;
  }
  @media (min-width: 640px) { .ai-hero-sub { margin-bottom: 40px; } }

  /* ── Guest banner ── */
  .ai-guest-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid rgba(251,191,36,0.3);
    background: rgba(251,191,36,0.07);
    backdrop-filter: blur(8px);
    margin-bottom: 32px;
    animation: ai-fade-in 0.6s ease forwards;
    flex-wrap: wrap;
  }
  @media (min-width: 480px) {
    .ai-guest-banner { align-items: center; flex-wrap: nowrap; gap: 14px; margin-bottom: 40px; }
  }

  .ai-guest-icon {
    flex-shrink: 0;
    width: 36px; height: 36px;
    border-radius: 10px;
    background: rgba(251,191,36,0.15);
    display: flex; align-items: center; justify-content: center;
    color: #fbbf24;
  }

  /* ── Stats ── */
  .ai-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 40px;
    animation: ai-fade-up 0.7s 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }
  @media (min-width: 480px) { .ai-stats-grid { gap: 14px; } }
  @media (min-width: 1024px) {
    .ai-stats-grid { grid-template-columns: repeat(4, 1fr); margin-bottom: 56px; }
  }

  .ai-stat-card {
    position: relative;
    padding: 16px;
    border-radius: 18px;
    border: 1px solid var(--ai-border);
    background: rgba(18,18,42,0.8);
    backdrop-filter: blur(16px);
    overflow: hidden;
    transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
  }
  @media (min-width: 480px) { .ai-stat-card { padding: 22px 20px; } }
  .ai-stat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(124,77,255,0.06), transparent);
    pointer-events: none;
  }
  .ai-stat-card:hover {
    border-color: rgba(124,77,255,0.4);
    transform: translateY(-3px);
    box-shadow: 0 16px 48px rgba(124,77,255,0.15);
  }

  .ai-stat-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }

  .ai-stat-value {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: clamp(1.5rem, 4vw, 2.2rem);
    font-weight: 800;
    color: #fff;
    line-height: 1;
    margin-bottom: 4px;
    animation: ai-counter 0.6s ease both;
  }

  .ai-stat-label {
    font-size: 0.8rem;
    color: var(--ai-muted);
    font-weight: 400;
    letter-spacing: 0.03em;
  }

  /* Corner glow accent */
  .ai-stat-glow {
    position: absolute;
    bottom: -20px; right: -20px;
    width: 80px; height: 80px;
    border-radius: 50%;
    filter: blur(30px);
    pointer-events: none;
  }

  /* ── Section heading ── */
  .ai-section-heading {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: clamp(1.3rem, 4vw, 1.8rem);
    font-weight: 800;
    color: #fff;
    margin-bottom: 6px;
  }
  .ai-section-sub {
    color: var(--ai-muted);
    font-size: 0.95rem;
    margin-bottom: 28px;
  }
  .ai-section-line {
    width: 48px; height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--ai-violet), var(--ai-cyan));
    margin-bottom: 28px;
    transform-origin: left;
    animation: ai-line-grow 0.8s ease both;
  }

  /* ── Tool cards grid ── */
  .ai-tools-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 40px;
  }
  @media (min-width: 640px) {
    .ai-tools-grid { gap: 20px; margin-bottom: 56px; }
  }
  @media (min-width: 768px) {
    .ai-tools-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .ai-tool-card {
    position: relative;
    padding: 20px;
    border-radius: 24px;
    border: 1px solid var(--ai-border);
    background: rgba(18,18,42,0.7);
    backdrop-filter: blur(20px);
    overflow: hidden;
    cursor: pointer;
    text-decoration: none;
    display: block;
    transition: border-color 0.35s, transform 0.35s, box-shadow 0.35s;
    animation: ai-card-in 0.7s cubic-bezier(0.16,1,0.3,1) both;
  }
  @media (min-width: 640px) { .ai-tool-card { padding: 28px; } }
  .ai-tool-card.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
  .ai-tool-card:not(.disabled):hover {
    border-color: rgba(124,77,255,0.5);
    transform: translateY(-6px);
    box-shadow: 0 24px 64px rgba(124,77,255,0.18);
  }

  /* Hover reveal shine */
  .ai-tool-card::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 60%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
    transition: left 0.5s ease;
    pointer-events: none;
  }
  .ai-tool-card:not(.disabled):hover::before { left: 150%; }

  /* Card top gradient bar */
  .ai-tool-card-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 24px 24px 0 0;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .ai-tool-card:not(.disabled):hover .ai-tool-card-bar { opacity: 1; }

  /* Ambient glow */
  .ai-tool-card-glow {
    position: absolute;
    top: -40px; right: -40px;
    width: 180px; height: 180px;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s;
  }
  .ai-tool-card:not(.disabled):hover .ai-tool-card-glow { opacity: 0.4; }

  .ai-tool-icon-wrap {
    width: 64px; height: 64px;
    border-radius: 18px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
    position: relative;
    overflow: visible;
  }

  /* Icon floating animation */
  .ai-tool-card:not(.disabled):hover .ai-tool-icon-wrap svg {
    animation: ai-float 3s ease-in-out infinite;
  }

  /* Pulse ring on hover */
  .ai-pulse-ring {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 1px solid currentColor;
    opacity: 0;
    pointer-events: none;
  }
  .ai-tool-card:not(.disabled):hover .ai-pulse-ring {
    animation: ai-pulse-ring 1.5s ease-out infinite;
  }

  .ai-tool-meta {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .ai-tool-stat {
    text-align: right;
  }
  .ai-tool-stat-value {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    color: #fff;
    line-height: 1;
  }
  .ai-tool-stat-label {
    font-size: 0.72rem;
    color: var(--ai-muted);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .ai-tool-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 10px;
    transition: color 0.2s;
  }
  .ai-tool-card:not(.disabled):hover .ai-tool-title {
    color: var(--ai-purple);
  }

  .ai-tool-desc {
    font-size: 0.9rem;
    line-height: 1.65;
    color: var(--ai-muted);
    margin-bottom: 20px;
  }

  .ai-tool-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--ai-purple);
    transition: gap 0.25s, color 0.25s;
  }
  .ai-tool-card:not(.disabled):hover .ai-tool-cta {
    gap: 14px;
    color: var(--ai-cyan);
  }

  /* ── Getting Started card ── */
  .ai-getstarted {
    position: relative;
    border-radius: 28px;
    overflow: hidden;
    margin-bottom: 56px;
    animation: ai-fade-up 0.7s 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }

  .ai-getstarted-bg {
    position: absolute;
    inset: 0;
    background-image: url('https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80');
    background-size: cover;
    background-position: center;
    filter: brightness(0.25) saturate(1.6);
  }

  .ai-getstarted-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(124,77,255,0.85) 0%, rgba(0,59,130,0.7) 60%, rgba(5,5,15,0.9) 100%);
  }

  .ai-getstarted-ring {
    position: absolute;
    top: -80px; right: -80px;
    width: 200px; height: 200px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.08);
    animation: ai-rotate-slow 30s linear infinite;
    pointer-events: none;
  }
  @media (min-width: 640px) { .ai-getstarted-ring { width: 320px; height: 320px; } }
  .ai-getstarted-ring::after {
    content: '';
    position: absolute;
    top: 20px; left: 20px; right: 20px; bottom: 20px;
    border-radius: 50%;
    border: 1px solid rgba(0,229,255,0.1);
  }

  .ai-getstarted-content {
    position: relative;
    z-index: 5;
    padding: 28px 20px;
  }
  @media (min-width: 640px) { .ai-getstarted-content { padding: 48px 40px; } }

  .ai-steps-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 32px;
  }
  @media (min-width: 640px) {
    .ai-steps-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .ai-step {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .ai-step-num {
    flex-shrink: 0;
    width: 34px; height: 34px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
    font-size: 0.85rem;
    color: #fff;
    backdrop-filter: blur(4px);
  }

  .ai-step-text {
    font-size: 0.92rem;
    color: rgba(255,255,255,0.85);
    font-weight: 400;
  }

  /* ── CTA Button variant ── */
  .ai-btn-start {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 13px 28px;
    border-radius: 100px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.25);
    color: #fff;
    font-weight: 600;
    font-size: 0.95rem;
    backdrop-filter: blur(10px);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.25s, transform 0.25s, box-shadow 0.25s;
  }
  .ai-btn-start:hover {
    background: rgba(255,255,255,0.2);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  }

  /* ── Delete modal ── */
  .ai-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(8px);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ai-fade-in 0.25s ease;
  }

  .ai-modal {
    width: 100%;
    max-width: 420px;
    margin: 16px;
    padding: 24px;
    border-radius: 24px;
    border: 1px solid var(--ai-border);
    background: rgba(18,18,42,0.95);
    backdrop-filter: blur(24px);
    animation: ai-card-in 0.35s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 60px rgba(124,77,255,0.1);
  }
  @media (min-width: 480px) { .ai-modal { padding: 32px; } }
  .ai-modal-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  @media (min-width: 360px) { .ai-modal-actions { flex-direction: row; gap: 12px; } }

  .ai-modal-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: clamp(1.1rem, 4vw, 1.4rem);
    font-weight: 800;
    color: #fff;
    margin-bottom: 12px;
  }

  .ai-modal-body {
    font-size: 0.9rem;
    color: var(--ai-muted);
    line-height: 1.65;
    margin-bottom: 24px;
  }

  .ai-btn-cancel {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--ai-border);
    background: transparent;
    color: var(--ai-text);
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }
  .ai-btn-cancel:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.2); }

  .ai-btn-delete {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.2s, transform 0.2s;
    box-shadow: 0 8px 24px rgba(220,38,38,0.3);
  }
  .ai-btn-delete:hover { opacity: 0.9; transform: translateY(-1px); }
  .ai-btn-delete:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* ── Container override for dark theme ── */
  .ai-main-container {
    padding: 20px 16px;
    max-width: 1200px;
    margin: 0 auto;
  }
  @media (min-width: 640px) { .ai-main-container { padding: 28px 24px; } }
  @media (min-width: 768px) { .ai-main-container { padding: 32px; } }

  /* Keep downstream PageContainer usage */
  .ai-page .ai-main-container > * { color: var(--ai-text); }
`;

const AIToolsPage = () => {
  const navigate = useNavigate();
  // ✅ Check auth status
  const { isAuthenticated } = useSelector((state) => state.auth);

  // State management
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [loadingDeleteHistoryId, setLoadingDeleteHistoryId] = useState(null);
  const [loadingSaveHistoryId, setLoadingSaveHistoryId] = useState(null);

  useEffect(() => {
    // ✅ Skip loading stats if not authenticated
    if (!isAuthenticated) return;
    fetchStats();
  }, [isAuthenticated]);

  // Fetch AI generation history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await noteService.getAIHistory(filterType === 'all' ? null : filterType);
      setHistory(data || []);
    } catch (error) {
      console.error('History fetch error:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI usage statistics from API
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      
      // The overview endpoint returns all the data we need
      const overview = await dashboardService.getOverview();
      console.log('AIToolsPage - Overview response:', overview);
      
      // Extract stats from overview - use same field names as User Dashboard
      const totalGenerations = overview?.total_ai_requests ?? overview?.total_ai_generations ?? 0;
      const thisWeek = overview?.ai_requests_this_week ?? 0;
      const generateCount = overview?.ai_generations ?? 0;
      const improveCount = overview?.ai_improvements ?? 0;
      const summarizeCount = overview?.ai_summarizations ?? 0;
      const codeCount = overview?.ai_code_generations ?? 0;
      const savedToNotes = overview?.total_topics ?? 0;
      const streak = overview?.current_streak ?? overview?.streak_days ?? 0;
      
      console.log('AIToolsPage - Extracted stats:', {
        totalGenerations, thisWeek, generateCount, improveCount, summarizeCount, codeCount, savedToNotes, streak
      });
      
      setStats({
        totalGenerations,
        thisWeek,
        generateCount,
        improveCount,
        summarizeCount,
        codeCount,
        savedToNotes,
        streak
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
      // Set fallback values on error
      setStats({
        totalGenerations: 0,
        thisWeek: 0,
        generateCount: 0,
        improveCount: 0,
        summarizeCount: 0,
        codeCount: 0,
        savedToNotes: 0,
        streak: 0
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Delete AI generation history
  const handleDeleteHistory = async (historyId) => {
    try {
      setLoadingDeleteHistoryId(historyId);
      await noteService.deleteAIHistory(historyId);
      toast.success('✨ Deleted successfully');
      setDeleteConfirmId(null);
      fetchHistory();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('❌ Failed to delete');
    } finally {
      setLoadingDeleteHistoryId(null);
    }
  };

  // Save AI generation as new note
  const handleSaveAsNote = async (historyId) => {
    try {
      setLoadingSaveHistoryId(historyId);
      await noteService.saveAIHistoryAsNote(historyId);
      toast.success('✨ Saved as note!');
      fetchHistory();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('❌ Failed to save');
    } finally {
      setLoadingSaveHistoryId(null);
    }
  };

  // Get tool icon by feature type
  const getToolIcon = (type) => {
    const iconMap = {
      'generate': Sparkles,
      'improve': Wand2,
      'summarize': FileText,
      'code': Code
    };
    return iconMap[type] || Sparkles;
  };

  // Get tool color by feature type
  const getToolColor = (type) => {
    const colorMap = {
      'generate': 'bg-violet-100 text-violet-600',
      'improve': 'bg-blue-100 text-blue-600',
      'summarize': 'bg-emerald-100 text-emerald-600',
      'code': 'bg-orange-100 text-orange-600'
    };
    return colorMap[type] || 'bg-violet-100 text-violet-600';
  };

  // AI Tools configuration with dynamic stats
  const aiTools = [
    {
      id: 'generate',
      icon: Sparkles,
      title: 'Generate Topic',
      description: 'AI creates comprehensive explanations for any topic instantly',
      gradient: 'from-violet-500 to-purple-600',
      glowColor: 'rgba(124,77,255,0.6)',
      barGradient: 'linear-gradient(90deg, #7c4dff, #a259ff)',
      iconBg: 'linear-gradient(135deg, #7c4dff, #a259ff)',
      route: '/ai-tools/generate',
      stat: stats?.generateCount || 0,
      statLabel: 'Generated'
    },
    {
      id: 'improve',
      icon: Wand2,
      title: 'Improve Content',
      description: 'Enhance clarity, grammar, and structure of existing text',
      gradient: 'from-blue-500 to-cyan-600',
      glowColor: 'rgba(41,121,255,0.6)',
      barGradient: 'linear-gradient(90deg, #2979ff, #00e5ff)',
      iconBg: 'linear-gradient(135deg, #2979ff, #00e5ff)',
      route: '/ai-tools/improve',
      stat: stats?.improveCount || 0,
      statLabel: 'Improved'
    },
    {
      id: 'summarize',
      icon: FileText,
      title: 'Summarize Text',
      description: 'Condense lengthy content into digestible summaries',
      gradient: 'from-emerald-500 to-teal-600',
      glowColor: 'rgba(0,224,150,0.6)',
      barGradient: 'linear-gradient(90deg, #00c853, #00e096)',
      iconBg: 'linear-gradient(135deg, #00c853, #00e096)',
      route: '/ai-tools/summarize',
      stat: stats?.summarizeCount || 0,
      statLabel: 'Summarized'
    },
    {
      id: 'code',
      icon: Code,
      title: 'Generate Code',
      description: 'Create code snippets in multiple programming languages',
      gradient: 'from-orange-500 to-red-600',
      glowColor: 'rgba(255,109,0,0.6)',
      barGradient: 'linear-gradient(90deg, #ff6d00, #ff1744)',
      iconBg: 'linear-gradient(135deg, #ff6d00, #ff1744)',
      route: '/ai-tools/code',
      stat: stats?.codeCount || 0,
      statLabel: 'Code Generated'
    }
  ];

  // Manual Tools configuration (no auth required)
  const manualTools = [
    {
      id: 'note-editor',
      icon: Edit3,
      title: 'Note Editor',
      description: 'Create and format notes manually with markdown support',
      gradient: 'from-pink-500 to-rose-600',
      glowColor: 'rgba(236,72,153,0.6)',
      barGradient: 'linear-gradient(90deg, #ec4899, #f43f5e)',
      iconBg: 'linear-gradient(135deg, #ec4899, #f43f5e)',
      route: '/note-editor'
    },
    {
      id: 'code-runner',
      icon: Terminal,
      title: 'Online Code Runner',
      description: 'Execute code in 15+ programming languages instantly',
      gradient: 'from-slate-500 to-gray-600',
      glowColor: 'rgba(100,116,139,0.6)',
      barGradient: 'linear-gradient(90deg, #64748b, #475569)',
      iconBg: 'linear-gradient(135deg, #64748b, #475569)',
      route: '/code-runner'
    }
  ];

  // Filter history by search query and type
  const filteredHistory = history.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.title?.toLowerCase().includes(query) || 
             item.generated_content?.toLowerCase().includes(query);
    }
    return true;
  });

  // Helper functions for guest actions
  const handleGuestAction = (actionType) => {
    if (!isAuthenticated) {
      toast.promise(
        new Promise(resolve => setTimeout(resolve, 1500)),
        {
          loading: 'Please sign in to use AI tools',
          success: 'Redirecting to sign in...',
          error: 'Error'
        }
      );
      setTimeout(() => navigate('/login'), 1500);
      return false;
    }
    return true;
  };

  const statConfig = stats ? [
    { icon: Zap,        label: 'Total Generations', value: stats.totalGenerations, glow: 'rgba(124,77,255,0.5)', iconBg: 'rgba(124,77,255,0.15)', iconColor: '#a259ff' },
    { icon: TrendingUp, label: 'This Week',          value: stats.thisWeek,         glow: 'rgba(41,121,255,0.5)', iconBg: 'rgba(41,121,255,0.15)',  iconColor: '#00e5ff' },
    { icon: Award,      label: 'Topics Created',     value: stats.savedToNotes,     glow: 'rgba(0,224,150,0.5)', iconBg: 'rgba(0,224,150,0.12)',   iconColor: '#00e096' },
    { icon: Clock,      label: 'Current Streak',     value: `${stats.streak}d`,     glow: 'rgba(255,109,0,0.5)', iconBg: 'rgba(255,109,0,0.12)',   iconColor: '#ff6d00' }
  ] : [];

  return (
    <>
      <style>{styles}</style>

      <Helmet>
        <title>AI Tools - NoteAssist</title>
        <meta name="description" content="Explore AI-powered tools for content generation, summarization, improvement, and code generation" />
      </Helmet>

      <div className="ai-page">
        {/* ── HERO ──────────────────────────────────────────────── */}
        <div className="ai-hero">
          <div className="ai-hero-bg" />
          <div className="ai-hero-overlay" />
          <div className="ai-grid-overlay" />
          <div className="ai-orb ai-orb-1" />
          <div className="ai-orb ai-orb-2" />
          <div className="ai-orb ai-orb-3" />
          <div className="ai-hero-scan" />

          <div className="ai-hero-content">
            <div className="ai-hero-badge">
              <span className="ai-dot" />
              Powered by AI
            </div>
            <h1 className="ai-hero-title">
              Your intelligent<br />
              <span className="ai-title-gradient">creative hub.</span>
            </h1>
            <p className="ai-hero-sub">
              Generate, improve, summarize and code at the speed of thought.
              Let AI handle the heavy lifting so you can focus on ideas.
            </p>
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────── */}
        <div className="ai-main-container">

          {/* Guest Banner */}
          {!isAuthenticated && (
            <div className="ai-guest-banner">
              <div className="ai-guest-icon">
                <AlertCircle size={18} />
              </div>
              <p style={{ fontSize: '0.92rem', color: 'rgba(251,191,36,0.9)', flex: 1 }}>
                You're viewing as a guest.{' '}
                <strong style={{ color: '#fbbf24' }}>Sign in to save your AI generations.</strong>
              </p>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(251,191,36,0.15)',
                  border: '1px solid rgba(251,191,36,0.4)',
                  color: '#fbbf24',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                <LogIn size={14} />
                Sign In
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="ai-stats-grid">
            {statsLoading ? (
              // Loading skeleton for stats
              [...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="ai-stat-card"
                  style={{ animationDelay: `${0.3 + idx * 0.08}s` }}
                >
                  <div
                    className="ai-stat-icon animate-pulse"
                    style={{ background: 'rgba(124,77,255,0.15)' }}
                  >
                    <div className="w-5 h-5 rounded bg-gray-600/30" />
                  </div>
                  <div className="ai-stat-value">
                    <div className="h-8 w-12 bg-gray-600/30 rounded animate-pulse mx-auto" />
                  </div>
                  <div className="ai-stat-label">
                    <div className="h-3 w-20 bg-gray-600/30 rounded animate-pulse mx-auto" />
                  </div>
                </div>
              ))
            ) : stats ? (
              statConfig.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div
                    key={idx}
                    className="ai-stat-card"
                    style={{ animationDelay: `${0.3 + idx * 0.08}s` }}
                  >
                    <div
                      className="ai-stat-icon"
                      style={{ background: s.iconBg }}
                    >
                      <Icon size={20} style={{ color: s.iconColor }} />
                    </div>
                    <div className="ai-stat-value">{s.value}</div>
                    <div className="ai-stat-label">{s.label}</div>
                    <div className="ai-stat-glow" style={{ background: s.glow }} />
                  </div>
                );
              })
            ) : null}
          </div>

          {/* Tools section */}
          <div style={{ marginBottom: '56px' }}>
            <div className="ai-section-heading">Available AI Tools</div>
            <div className="ai-section-line" />
            <p className="ai-section-sub">Choose a tool to get started with AI-powered content generation</p>

            <div className="ai-tools-grid">
              {aiTools.map((tool, idx) => {
                const Icon = tool.icon;

                return (
                  <Link
                    key={tool.id}
                    to={tool.route}
                    className="ai-tool-card"
                    style={{ animationDelay: `${0.5 + idx * 0.1}s`, textDecoration: 'none' }}
                  >
                    {/* Top gradient bar */}
                    <div
                      className="ai-tool-card-bar"
                      style={{ background: tool.barGradient }}
                    />
                    {/* Ambient glow */}
                    <div
                      className="ai-tool-card-glow"
                      style={{ background: `radial-gradient(circle, ${tool.glowColor} 0%, transparent 70%)` }}
                    />

                    <div className="ai-tool-meta">
                      {/* Icon */}
                      <div
                        className="ai-tool-icon-wrap"
                        style={{ background: tool.iconBg, boxShadow: `0 8px 32px ${tool.glowColor}66` }}
                      >
                        <div className="ai-pulse-ring" style={{ color: tool.glowColor }} />
                        <Icon size={28} color="#fff" />
                      </div>
                      {/* Stat */}
                      <div className="ai-tool-stat">
                        <div className="ai-tool-stat-value">{tool.stat}</div>
                        <div className="ai-tool-stat-label">{tool.statLabel}</div>
                      </div>
                    </div>

                    <div className="ai-tool-title">{tool.title}</div>
                    <p className="ai-tool-desc">{tool.description}</p>

                    <div className="ai-tool-cta">
                      <span>Try Now</span>
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Manual Tools section */}
          <div style={{ marginBottom: '56px' }}>
            <div className="ai-section-heading" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Wrench size={24} style={{ color: 'var(--ai-cyan)' }} />
              Manual Tools
            </div>
            <div className="ai-section-line" style={{ background: 'linear-gradient(90deg, #64748b, #ec4899)' }} />
            <p className="ai-section-sub">Standalone tools available to everyone - no sign in required</p>

            <div className="ai-tools-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {manualTools.map((tool, idx) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    to={tool.route}
                    className="ai-tool-card"
                    style={{ animationDelay: `${0.7 + idx * 0.1}s`, textDecoration: 'none' }}
                  >
                    {/* Top gradient bar */}
                    <div
                      className="ai-tool-card-bar"
                      style={{ background: tool.barGradient }}
                    />
                    {/* Ambient glow */}
                    <div
                      className="ai-tool-card-glow"
                      style={{ background: `radial-gradient(circle, ${tool.glowColor} 0%, transparent 70%)` }}
                    />

                    <div className="ai-tool-meta">
                      {/* Icon */}
                      <div
                        className="ai-tool-icon-wrap"
                        style={{ background: tool.iconBg, boxShadow: `0 8px 32px ${tool.glowColor}66` }}
                      >
                        <div className="ai-pulse-ring" style={{ color: tool.glowColor }} />
                        <Icon size={28} color="#fff" />
                      </div>
                      {/* Free badge instead of stat */}
                      <div className="ai-tool-stat">
                        <div className="ai-tool-stat-value" style={{ fontSize: '0.9rem', color: 'var(--ai-emerald)' }}>FREE</div>
                        <div className="ai-tool-stat-label">No Sign In</div>
                      </div>
                    </div>

                    <div className="ai-tool-title">{tool.title}</div>
                    <p className="ai-tool-desc">{tool.description}</p>

                    <div className="ai-tool-cta">
                      <span>Open Tool</span>
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Getting Started */}
          <div className="ai-getstarted">
            <div className="ai-getstarted-bg" />
            <div className="ai-getstarted-overlay" />
            <div className="ai-getstarted-ring" />

            <div className="ai-getstarted-content">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 60, height: 60, borderRadius: 18, flexShrink: 0,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <Brain size={28} color="#fff" />
                </div>

                <div style={{ flex: 1, minWidth: 240 }}>
                  <h3
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      color: '#fff',
                      marginBottom: 6
                    }}
                  >
                    Getting Started with AI Tools
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: 24 }}>
                    Four simple steps to transform your workflow
                  </p>

                  <div className="ai-steps-grid">
                    {[
                      'Choose your desired AI tool',
                      'Enter your topic or content',
                      'Get instant AI-generated results',
                      'Save, export, or improve further'
                    ].map((step, idx) => (
                      <div key={idx} className="ai-step">
                        <div className="ai-step-num">{idx + 1}</div>
                        <span className="ai-step-text">{step}</span>
                      </div>
                    ))}
                  </div>

                  <Link to={aiTools[0].route} className="ai-btn-start">
                    <Sparkles size={16} />
                    <span>Start Generating</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      {deleteConfirmId && (
        <div className="ai-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="ai-modal-title">Delete Generation?</div>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(232,228,255,0.4)', cursor: 'pointer', padding: 4 }}
              >
                <AlertCircle size={20} />
              </button>
            </div>
            <p className="ai-modal-body">
              Are you sure you want to delete this AI generation? This action cannot be undone.
            </p>
            <div className="ai-modal-actions">
              <button
                className="ai-btn-cancel"
                onClick={() => setDeleteConfirmId(null)}
                disabled={loadingDeleteHistoryId !== null}
              >
                Cancel
              </button>
              <button
                className="ai-btn-delete"
                onClick={() => handleDeleteHistory(deleteConfirmId)}
                disabled={loadingDeleteHistoryId !== null}
              >
                {loadingDeleteHistoryId === deleteConfirmId ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIToolsPage;