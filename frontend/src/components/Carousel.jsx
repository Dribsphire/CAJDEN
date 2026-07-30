import { useCallback, useEffect, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './Carousel.css';

/**
 * Simple, dependency-free image carousel.
 * Props:
 *  - images: array of { src, alt } (src should be an imported image)
 *  - interval: autoplay delay in ms (default 5000). Pass 0 to disable autoplay.
 */
export default function Carousel({ images = [], interval = 5000 }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  const goTo = useCallback((index) => {
    setActive(((index % images.length) + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Autoplay
  useEffect(() => {
    if (!interval || images.length <= 1) return;
    timerRef.current = setInterval(next, interval);
    return () => clearInterval(timerRef.current);
  }, [next, interval, images.length]);

  if (!images.length) return null;

  return (
    <div
      className="carousel"
      role="region"
      aria-label="Image carousel"
      onMouseEnter={() => clearInterval(timerRef.current)}
      onMouseLeave={() => { if (interval) timerRef.current = setInterval(next, interval); }}
    >
      <div className="carousel-track">
        {images.map((img, i) => (
          <img
            key={i}
            src={img.src}
            alt={img.alt || ''}
            className={`carousel-slide ${i === active ? 'is-active' : ''}`}
            aria-hidden={i !== active}
          />
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button className="carousel-arrow carousel-arrow-left" onClick={prev} aria-label="Previous slide">
            <FaChevronLeft />
          </button>
          <button className="carousel-arrow carousel-arrow-right" onClick={next} aria-label="Next slide">
            <FaChevronRight />
          </button>

          <div className="carousel-dots" role="tablist" aria-label="Slide navigation">
            {images.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot ${i === active ? 'is-active' : ''}`}
                onClick={() => goTo(i)}
                role="tab"
                aria-selected={i === active}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
