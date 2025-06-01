import React, { useEffect, useState, useCallback } from 'react';

const ScrollToTopButton: React.FC = () => {
  const [showScroll, setShowScroll] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setScrollPercent(percent);
      setShowScroll(scrollTop > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!showScroll) return null;

  return (
    <button
      className="scroll-to-top-btn"
      onClick={handleScrollTop}
      aria-label="Scroll to top"
      style={{position: 'fixed', right: 32, bottom: 32, zIndex: 9999, background: 'none', border: 'none', outline: 'none', cursor: 'pointer', padding: 0}}
    >
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" stroke="#222" strokeWidth="3" fill="none" opacity="0.18" />
        <circle
          cx="24" cy="24" r="20"
          stroke="#222" strokeWidth="3" fill="none"
          strokeDasharray={Math.PI * 2 * 20}
          strokeDashoffset={Math.PI * 2 * 20 * (1 - scrollPercent)}
          style={{ transition: 'stroke-dashoffset 0.25s' }}
        />
        <polyline points="24,14 24,30" stroke="#222" strokeWidth="3" fill="none" strokeLinecap="round" />
        <polyline points="18,20 24,14 30,20" stroke="#ff9800" strokeWidth="3" fill="none" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

export default ScrollToTopButton; 