import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, Mail, Heart, Image as ImageIcon } from 'lucide-react';
import { getEmbedData } from '../utils/mediaUtils';

const HEART_EMOJIS = ['❤️', '💕', '💖', '💗', '💘', '💝', '🩷', '🌹'];

const FloatingHearts = () => {
    const hearts = Array.from({ length: 18 }, (_, i) => ({
        id: i,
        emoji: HEART_EMOJIS[i % HEART_EMOJIS.length],
        left: `${Math.random() * 100}%`,
        size: 14 + Math.random() * 18,
        duration: 6 + Math.random() * 8,
        delay: Math.random() * 10,
    }));

    return (
        <div className="valentine-hearts pointer-events-none">
            {hearts.map(h => (
                <span
                    key={h.id}
                    className="valentine-heart"
                    style={{
                        left: h.left,
                        fontSize: `${h.size}px`,
                        animationDuration: `${h.duration}s`,
                        animationDelay: `${h.delay}s`,
                        position: 'absolute',
                        bottom: '-50px',
                        animation: `floatUp ${h.duration}s linear infinite`,
                        color: ['#FF69B4', '#FF1493', '#FFB6C1', '#DC143C'][Math.floor(Math.random() * 4)]
                    }}
                >
                    {h.emoji}
                </span>
            ))}
        </div>
    );
};

// --- INTERACTIVE ROSE PETALS ---
const InteractivePetals = () => {
    const canvasRef = useRef(null);
    const petalsRef = useRef([]);
    const mouseRef = useRef({ x: -1000, y: -1000, vx: 0, vy: 0 });
    const lastMouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Initialize petals if empty
            if (petalsRef.current.length === 0) {
                const petalCount = window.innerWidth < 768 ? 15 : 30; // Fewer on mobile
                for (let i = 0; i < petalCount; i++) {
                    petalsRef.current.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height - canvas.height, // Start above screen
                        size: Math.random() * 8 + 8, // 8px to 16px
                        speedY: Math.random() * 1.5 + 0.5,
                        speedX: Math.random() * 2 - 1,
                        rotation: Math.random() * 360,
                        rotationSpeed: Math.random() * 2 - 1,
                        hue: Math.random() * 20 - 10 // Variation around red/pink
                    });
                }
            }
        };

        window.addEventListener('resize', resize);
        resize();

        const handleMouseMove = (e) => {
            lastMouseRef.current = { x: mouseRef.current.x, y: mouseRef.current.y };
            mouseRef.current.x = e.clientX || (e.touches && e.touches[0].clientX);
            mouseRef.current.y = e.clientY || (e.touches && e.touches[0].clientY);

            // Calculate velocity
            mouseRef.current.vx = mouseRef.current.x - lastMouseRef.current.x;
            mouseRef.current.vy = mouseRef.current.y - lastMouseRef.current.y;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleMouseMove);

        const drawPetal = (x, y, size, rotation, hueOffset) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((rotation * Math.PI) / 180);

            // Draw a heart/petal shape
            ctx.beginPath();
            const topCurveHeight = size * 0.3;
            ctx.moveTo(0, topCurveHeight);
            ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
            ctx.bezierCurveTo(-size / 2, size, 0, size * 1.2, 0, size * 1.5);
            ctx.bezierCurveTo(0, size * 1.2, size / 2, size, size / 2, topCurveHeight);
            ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
            ctx.closePath();

            ctx.fillStyle = `hsl(${340 + hueOffset}, 80%, 60%)`; // Red/Pink hue
            ctx.fill();
            ctx.restore();
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Mouse decay
            mouseRef.current.vx *= 0.9;
            mouseRef.current.vy *= 0.9;

            petalsRef.current.forEach(petal => {
                // Interactive physics
                const dx = petal.x - mouseRef.current.x;
                const dy = petal.y - mouseRef.current.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    const force = (100 - distance) / 100;
                    // Push away from mouse
                    petal.x += (dx / distance) * force * 5 + (mouseRef.current.vx * 0.1);
                    petal.y += (dy / distance) * force * 5 + (mouseRef.current.vy * 0.1);
                    petal.rotationSpeed += (Math.random() - 0.5) * 5; // Spin when touched
                }

                // Normal falling
                petal.y += petal.speedY;
                petal.x += Math.sin(petal.y / 100) * 0.5 + petal.speedX; // Gentle sway
                petal.rotation += petal.rotationSpeed;

                // Reset at bottom
                if (petal.y > canvas.height + 50) {
                    petal.y = -50;
                    petal.x = Math.random() * canvas.width;
                    petal.speedY = Math.random() * 1.5 + 0.5;
                }

                // Wrap horizontally
                if (petal.x > canvas.width + 50) petal.x = -50;
                if (petal.x < -50) petal.x = canvas.width + 50;

                drawPetal(petal.x, petal.y, petal.size, petal.rotation, petal.hue);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-60" />;
};

// --- FLIPPABLE POLAROID ---
const FlippablePolaroid = ({ photo, idx, isValentine }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    // Generate varying scatter positions across the screen
    const rotateAngles = [-15, 12, -8, 20, -22, 10];
    const topPositions = ['15%', '20%', '55%', '65%', '75%', '10%'];
    const leftPositions = ['5%', '75%', '80%', '10%', '75%', '15%'];

    const top = topPositions[idx % topPositions.length];
    const left = leftPositions[idx % leftPositions.length];
    const rot = rotateAngles[idx % rotateAngles.length];

    // Some generic romantic phrases for the back
    const backMessages = [
        "A beautiful moment ❤️",
        "Forever yours ✨",
        "Timeless memory 🌸",
        "When time stood still 💫",
        "P.S. I love you 💌",
        "Remember this day? 🥰"
    ];
    const message = backMessages[idx % backMessages.length];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0, rotate: rot, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
            transition={{
                opacity: { delay: 1.2 + (idx * 0.2) }, // Slightly longer delay to let envelope open
                scale: { delay: 1.2 + (idx * 0.2), type: "spring", stiffness: 100 },
                y: { delay: 1.2 + (idx * 0.2), repeat: Infinity, duration: 4 + (idx % 3), ease: "easeInOut", repeatType: "mirror" }
            }}
            whileHover={{ scale: 1.3, zIndex: 60, transition: { duration: 0.2 } }}
            className="absolute rounded group pointer-events-auto cursor-pointer perspective-1000"
            style={{ width: 'clamp(120px, 15vw, 160px)', height: 'clamp(140px, 18vw, 200px)', top, left }}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                className="w-full h-full relative preserve-3d"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
            >
                {/* FRONT FACE */}
                <div className={`absolute inset-0 backface-hidden p-2 md:p-3 pb-8 md:pb-12 shadow-2xl border ${isValentine ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-200'} flex flex-col`}>
                    <div className="flex-1 bg-gray-100 overflow-hidden relative border border-gray-200/50">
                        <img src={photo} alt="Memory" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-2 md:bottom-3 left-0 w-full text-center">
                        <Heart size={14} className={`mx-auto transition-colors ${isValentine ? 'text-pink-500 group-hover:text-rose-600' : 'text-red-400 group-hover:text-red-500'}`} fill="currentColor" />
                    </div>
                </div>

                {/* BACK FACE */}
                <div className={`absolute inset-0 backface-hidden rotate-y-180 p-4 shadow-2xl border ${isValentine ? 'bg-pink-100 border-pink-300' : 'bg-[#fdfbf7] border-gray-300'} flex items-center justify-center text-center`}
                    style={{
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 19px, #00000010 20px)',
                        backgroundAttachment: 'local'
                    }}>
                    <p className={`font-caveat text-xl leading-tight transform -rotate-6 ${isValentine ? 'text-rose-700' : 'text-gray-800'}`}>
                        {message}<br />
                        <span className="text-sm text-gray-400 mt-2 block">{new Date().toLocaleDateString('en-GB')}</span>
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- TYPEWRITER COMPONENT ---
const TypewriterText = ({ text, isValentine, isParentVisible }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        if (!isParentVisible) return;

        // Wait a brief moment before starting to type
        const startDelay = setTimeout(() => {
            let i = 0;
            const intervalId = setInterval(() => {
                setDisplayedText(text.slice(0, i));
                i++;
                if (i > text.length) {
                    clearInterval(intervalId);
                }
            }, 30); // Typing speed

            return () => clearInterval(intervalId);
        }, 800);

        return () => clearTimeout(startDelay);
    }, [text, isParentVisible]);

    return (
        <div className={`font-handwriting text-lg md:text-xl leading-relaxed whitespace-pre-wrap flex-1 font-caveat ${isValentine ? 'text-rose-800' : 'text-gray-700'} min-h-[150px]`}>
            {displayedText}
            {displayedText.length < text.length && (
                <span className={`animate-pulse inline-block w-1.5 h-5 ml-1 align-middle ${isValentine ? 'bg-rose-400' : 'bg-gray-400'}`}></span>
            )}
        </div>
    );
};

const LetterPopup = ({ letter, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);
    const [isBreakingSeal, setIsBreakingSeal] = useState(false);
    const themeAppliedRef = useRef(false);

    useEffect(() => {
        if (letter) {
            setIsOpen(true);
        }
    }, [letter]);

    // Valentine theme transition
    useEffect(() => {
        if (isEnvelopeOpen) {
            document.body.classList.add('theme-valentine');
            localStorage.setItem('pixenze_theme', 'valentine');
            themeAppliedRef.current = true;
        }
    }, [isEnvelopeOpen]);

    const handleClose = () => {
        // Theme stays! It does NOT revert on close.
        setIsOpen(false);
        setIsEnvelopeOpen(false);
        onClose();
    };

    const handleSealPressStart = () => {
        setIsBreakingSeal(true);
    };

    const handleSealPressEnd = () => {
        setIsBreakingSeal(false);
    };

    const handleOpenEnvelope = () => {
        setIsEnvelopeOpen(true);
        setIsBreakingSeal(false);

        const isValentine = letter?.theme_override === 'valentine';
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: isValentine
                    ? ['#FF69B4', '#FF1493', '#FFB6C1', '#FF007F', '#DC143C']
                    : ['#FFC0CB', '#FFD700', '#FF69B4']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: isValentine
                    ? ['#FF69B4', '#FF1493', '#FFB6C1', '#FF007F', '#DC143C']
                    : ['#FFC0CB', '#FFD700', '#FF69B4']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    };

    if (!letter) return null;

    // Force valentine theme for the cute transition
    const isValentine = true;

    // Determine initial for the wax seal
    let initial = 'V'; // Default for Valentine
    if (letter.allowed_emails && letter.allowed_emails.length > 0) {
        initial = letter.allowed_emails[0].charAt(0).toUpperCase();
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 font-nunito overflow-hidden">

                    {/* Cute Expanding Circle Transition to Valentine Theme */}
                    <AnimatePresence>
                        {isEnvelopeOpen && (
                            <motion.div
                                initial={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
                                animate={{ clipPath: 'circle(150% at 50% 50%)', opacity: 1 }}
                                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                                className="absolute inset-0 bg-gradient-to-br from-pink-200/95 to-rose-300/95 backdrop-blur-md z-0"
                            />
                        )}
                    </AnimatePresence>

                    {/* Interactive Background Petals */}
                    {isEnvelopeOpen && <InteractivePetals />}

                    {/* Valentine Floating Hearts */}
                    {isEnvelopeOpen && <FloatingHearts />}

                    {/* ENVELOPE STAGE */}
                    {!isEnvelopeOpen ? (
                        <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={handleOpenEnvelope}
                            className={`w-full max-w-sm aspect-[4/3] rounded-xl shadow-2xl cursor-pointer relative flex items-center justify-center overflow-hidden border-4 group ${isValentine ? 'bg-gradient-to-br from-pink-100 to-rose-200 border-pink-300' : 'bg-[#f8f5e6] border-[#e6e2d3]'}`}
                        >
                            <div className={`absolute top-0 left-0 w-full h-1/2 origin-top transform group-hover:scale-y-90 transition-transform duration-500 z-10 clip-path-triangle shadow-sm ${isValentine ? 'bg-gradient-to-b from-pink-200 to-rose-100' : 'bg-[#eae5cd]'}`}></div>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 z-40 p-1.5 bg-white/80 rounded-full shadow-sm"
                            >
                                <X size={18} />
                            </button>

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] z-30 flex flex-col items-center">
                                {/* WAX SEAL */}
                                <motion.div
                                    className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white border-[3px] cursor-pointer group-hover:scale-105 transition-transform ${isValentine ? 'bg-gradient-to-br from-rose-600 to-rose-800 border-rose-900 shadow-rose-900/50' : 'bg-red-700 border-red-900 shadow-red-900/50'}`}
                                    style={{
                                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 5px 15px rgba(0,0,0,0.4)',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                    }}
                                    whileTap={{ scale: 0.9, rotate: -15 }}
                                    onPointerDown={handleSealPressStart}
                                    onPointerUp={() => { handleSealPressEnd(); handleOpenEnvelope(); }}
                                >
                                    {/* Inner ring to look like stamped wax */}
                                    <div className="w-[85%] h-[85%] rounded-full border border-white/30 flex items-center justify-center relative overflow-hidden">
                                        <span className="font-titan text-3xl opacity-90">{initial}</span>
                                        {/* Subtle shine on wax */}
                                        <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent transform -skew-y-12 mb-4"></div>
                                    </div>
                                </motion.div>
                                <span className={`text-[10px] mt-2 font-mono ${isBreakingSeal ? 'text-transparent' : 'text-gray-400 animate-pulse'}`}>TAP SEAL TO BREAK</span>
                            </div>

                            <div className="absolute bottom-0 left-0 w-full h-1/2 flex flex-col items-center justify-center z-20 pb-4">
                                <div className={`text-center p-4 border-2 border-dashed w-[80%] rounded-lg ${isValentine ? 'border-pink-300/50 bg-pink-50/30' : 'border-red-300/30 bg-white/10'} backdrop-blur-[2px]`}>
                                    <h3 className={`font-titan text-lg md:text-xl leading-none mb-1 ${isValentine ? 'text-rose-700' : 'text-gray-700'}`}>A MESSAGE FOR YOU</h3>
                                    <p className={`text-[10px] md:text-xs font-mono flex items-center justify-center gap-1 ${isValentine ? 'text-rose-500' : 'text-gray-500'}`}>
                                        <Mail size={12} /> {letter.allowed_emails?.length > 0 ? letter.allowed_emails[0] : 'Special Delivery'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        // LETTER CONTENT STAGE
                        <>
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className={`w-full max-w-lg rounded-sm shadow-2xl relative overflow-hidden z-20 ${isValentine ? 'bg-gradient-to-b from-pink-50 to-rose-50' : 'bg-[#fff9f0]'}`}
                                style={isValentine ? {} : {
                                    backgroundImage: 'repeating-linear-gradient(#fff9f0, #fff9f0 24px, #e5e5e5 25px)',
                                    backgroundAttachment: 'local'
                                }}
                            >
                                {/* Paper Header */}
                                <div className="h-16 border-b flex items-center justify-between px-6 bg-gradient-to-r from-pink-200/60 to-rose-200/60 border-pink-300 relative z-30">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-rose-500">
                                            <Heart size={14} className="text-white" fill="white" />
                                        </div>
                                        <span className="font-titan text-lg text-rose-600">SEPUCUK SURAT</span>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="p-2 rounded-full transition-colors hover:bg-pink-200"
                                    >
                                        <X size={20} className="text-rose-500" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-8 md:p-10 min-h-[300px] flex flex-col pb-10 relative z-30">
                                    <h1 className={`font-titan text-2xl md:text-3xl mb-6 text-center ${isValentine ? 'text-rose-700' : 'text-gray-800'}`}>{letter.title}</h1>

                                    {/* TYPEWRITER TEXT */}
                                    <TypewriterText text={letter.content} isValentine={isValentine} isParentVisible={isEnvelopeOpen} />

                                    <div className={`mt-8 pt-4 border-t text-center mb-4 ${isValentine ? 'border-pink-200' : 'border-gray-200'}`}>
                                        <p className={`text-xs font-mono ${isValentine ? 'text-rose-400' : 'text-gray-400'}`}>
                                            {isValentine ? '💌 Sent with love via PixenzeBooth 💌' : 'Sent with love via PixenzeBooth'}
                                        </p>
                                    </div>

                                    {/* Music Player - Inline */}
                                    {letter.music_url && (() => {
                                        const embed = getEmbedData(letter.music_url);
                                        if (!embed) return null;

                                        return (
                                            <div className={`mt-6 w-full rounded-xl overflow-hidden shadow-lg border-2 bg-black/5 relative group ${isValentine ? 'border-pink-300' : 'border-red-200'}`}>
                                                <div className="aspect-video w-full">
                                                    <iframe
                                                        width="100%"
                                                        height="100%"
                                                        src={embed.src}
                                                        title="Music Player"
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        className="w-full h-full"
                                                    ></iframe>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                </div>
                            </motion.div>

                            {/* Floating Photo Gallery */}
                            {letter.photo_urls && letter.photo_urls.length > 0 && (
                                <div className="absolute inset-0 pointer-events-none z-40 overflow-visible">
                                    {letter.photo_urls.map((photo, idx) => {
                                        const customMessage = letter.photo_messages && letter.photo_messages.length > idx ? letter.photo_messages[idx] : null;
                                        return (
                                            <FlippablePolaroid key={idx} photo={photo} customMessage={customMessage} idx={idx} isValentine={isValentine} />
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                </div>
            )}
        </AnimatePresence>
    );
};

export default LetterPopup;

