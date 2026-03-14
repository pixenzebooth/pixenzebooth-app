import React, { useEffect, useRef, memo } from 'react';

const ANIMATION_CONFIG = {
    confetti: {
        count: 60,
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA'],
        emoji: null,
        size: { min: 5, max: 12 },
        speed: { min: 2, max: 5 },
        rotate: true,
        shapes: ['square', 'circle', 'strip']
    },
    hearts: {
        count: 25,
        colors: ['#FF69B4', '#FF1493', '#DB7093', '#FFB6C1', '#FFC0CB', '#DC143C', '#FF6EB4'],
        emoji: '❤️',
        size: { min: 12, max: 28 },
        speed: { min: 1.5, max: 3.5 },
        rotate: false,
        shapes: ['emoji']
    },
    sparkles: {
        count: 35,
        colors: ['#FFD700', '#FFF8DC', '#FFFACD', '#FAFAD2', '#FFFFE0', '#F0E68C', '#EEE8AA', '#FFD700', '#FFC107'],
        emoji: '✨',
        size: { min: 10, max: 22 },
        speed: { min: 1, max: 2.5 },
        rotate: true,
        shapes: ['emoji']
    },
    snow: {
        count: 50,
        colors: ['#FFFFFF', '#F0F8FF', '#E8F4FD', '#D6EAF8', '#EBF5FB'],
        emoji: '❄️',
        size: { min: 8, max: 18 },
        speed: { min: 0.8, max: 2 },
        rotate: true,
        shapes: ['emoji', 'circle']
    },
    stars: {
        count: 30,
        colors: ['#FFD700', '#FFA500', '#FF6347', '#FFD700', '#FFFACD', '#F0E68C'],
        emoji: '⭐',
        size: { min: 10, max: 24 },
        speed: { min: 2, max: 4 },
        rotate: true,
        shapes: ['emoji']
    },
    fireworks: {
        count: 40,
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF6600', '#9900FF'],
        emoji: null,
        size: { min: 3, max: 8 },
        speed: { min: 3, max: 6 },
        rotate: false,
        shapes: ['circle']
    }
};

const AnimationOverlay = memo(({ type }) => {
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const particlesRef = useRef([]);

    useEffect(() => {
        if (!type || type === 'none') return;

        const config = ANIMATION_CONFIG[type];
        if (!config) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
            canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initialize particles
        const createParticle = () => {
            const size = config.size.min + Math.random() * (config.size.max - config.size.min);
            return {
                x: Math.random() * canvas.width,
                y: -size - Math.random() * canvas.height * 0.5,
                size,
                color: config.colors[Math.floor(Math.random() * config.colors.length)],
                speed: config.speed.min + Math.random() * (config.speed.max - config.speed.min),
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.02 + Math.random() * 0.03,
                wobbleAmplitude: 20 + Math.random() * 40,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 4,
                opacity: 0.6 + Math.random() * 0.4,
                shape: config.shapes[Math.floor(Math.random() * config.shapes.length)],
                scaleY: 0.5 + Math.random() * 0.5, // For confetti strip effect
            };
        };

        particlesRef.current = Array.from({ length: config.count }, createParticle);

        // Spread initial particles across the screen
        particlesRef.current.forEach((p, i) => {
            p.y = -p.size + (Math.random() * canvas.height * 1.2);
        });

        const drawParticle = (p) => {
            ctx.save();
            ctx.globalAlpha = p.opacity;

            if (p.shape === 'emoji' && config.emoji) {
                ctx.font = `${p.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (config.rotate) {
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.fillText(config.emoji, 0, 0);
                } else {
                    ctx.fillText(config.emoji, p.x, p.y);
                }
            } else if (p.shape === 'circle') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'square') {
                ctx.fillStyle = p.color;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else if (p.shape === 'strip') {
                ctx.fillStyle = p.color;
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.scale(1, p.scaleY);
                ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2.5);
            }

            ctx.restore();
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particlesRef.current.forEach(p => {
                // Update position
                p.wobble += p.wobbleSpeed;
                p.x += Math.sin(p.wobble) * (p.wobbleAmplitude * 0.02);
                p.y += p.speed;

                if (config.rotate) {
                    p.rotation += p.rotationSpeed;
                }

                // Recycle particles that fall below screen
                if (p.y > canvas.height + p.size) {
                    p.y = -p.size - Math.random() * 30;
                    p.x = Math.random() * canvas.width;
                }

                drawParticle(p);
            });

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [type]);

    if (!type || type === 'none') return null;

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
            style={{ mixBlendMode: 'screen' }}
        />
    );
});

AnimationOverlay.displayName = 'AnimationOverlay';

export default AnimationOverlay;
