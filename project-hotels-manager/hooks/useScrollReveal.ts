// =============================================================================
// Hook : animation d'apparition au défilement (IntersectionObserver)
// =============================================================================

"use client";

import { useEffect, useRef } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  animationClass?: string;
}

/**
 * Observe tous les éléments `[data-reveal]` contenus dans le composant
 * et leur applique `animationClass` lorsqu'ils entrent dans le viewport.
 *
 * @returns une ref à attacher à l'élément conteneur.
 *
 * @example
 * const ref = useScrollReveal();
 * return <div ref={ref}><div data-reveal>Contenu</div></div>;
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
) {
  const { threshold = 0.1, animationClass = "is-visible" } = options;
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(animationClass);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold },
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [threshold, animationClass]);

  return containerRef;
}
