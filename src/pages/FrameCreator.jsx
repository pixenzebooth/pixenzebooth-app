import React, { useState, useRef, useEffect } from 'react';
import { useAlert } from '../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { Upload, Save, ArrowLeft, Image as ImageIcon, Type, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const FrameCreator = () => {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const canvasRef = useRef(null);
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [elements, setElements] = useState([]); // Array of { type: 'text' | 'image', content, x, y, color, size }
    const [selectedElementId, setSelectedElementId] = useState(null);

    // Canvas dimensions for strip (scaled down for editor)
    const CANVAS_WIDTH = 400;
    const CANVAS_HEIGHT = 1200; // 3-4 photos tall
    const SCALE = 0.4; // Scale for display

    useEffect(() => {
        drawCanvas();
    }, [backgroundImage, elements, selectedElementId]);

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Background
        if (backgroundImage) {
            const img = new Image();
            img.src = backgroundImage;
            // Draw background logic... for now simple fill
            ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // Draw Placeholders for transparency (holes)
        // This is tricky without a masking library, but for basic frames we can just draw on top.
        // Assuming this creator builds an *overlay* image (PNG).

        if (!backgroundImage) {
            ctx.fillStyle = '#ddd'; // Guide grey
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = '#ccc';
            ctx.font = '30px Arial';
            ctx.fillText("Frame Base Layer", 50, 50);
        }

        elements.forEach(el => {
            if (el.type === 'image') {
                const img = new Image();
                img.src = el.content;
                ctx.drawImage(img, el.x, el.y, el.width || 100, el.height || 100);
            } else if (el.type === 'text') {
                ctx.font = `${el.size}px ${el.font || 'Arial'}`;
                ctx.fillStyle = el.color;
                ctx.fillText(el.content, el.x, el.y);
            }

            // Highlight selected
            if (el.id === selectedElementId) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(el.x - 5, el.y - 20, 100, 50); // Rough box
            }
        });
    };

    const handleUploadBg = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (f) => setBackgroundImage(f.target.result);
            reader.readAsDataURL(file);
        }
    };

    const addText = () => {
        const newEl = {
            id: Date.now(),
            type: 'text',
            content: 'New Text',
            x: 50,
            y: 100,
            color: '#000000',
            size: 30,
            font: 'Arial'
        };
        setElements([...elements, newEl]);
        setSelectedElementId(newEl.id);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');

        // Save to local storage for now
        const existing = JSON.parse(localStorage.getItem('custom_frames') || '[]');
        existing.push({
            id: `custom_${Date.now()}`,
            name: `Custom Frame ${existing.length + 1}`,
            image: dataUrl,
            createdAt: new Date()
        });
        localStorage.setItem('custom_frames', JSON.stringify(existing));

        showAlert("Frame Saved! You can find it in the 'My Custom Frames' section.", "success");
        navigate('/select-frame');
    };

    return (
        <div className="min-h-screen bg-neutral-900 font-nunito flex flex-col items-center p-4 relative overflow-hidden">

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            <div className="w-full max-w-6xl z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white font-bold hover:text-yellow-400 transition">
                        <ArrowLeft /> BACK TO MENU
                    </button>
                    <h1 className="text-4xl font-titan text-yellow-400 stroke-black drop-shadow-[4px_4px_0_#000]" style={{ WebkitTextStroke: '2px black' }}>FRAME FORGE</h1>
                    <button onClick={handleSave} className="flex items-center gap-2 bg-mario-green text-white px-6 py-2 rounded-lg font-bold border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition hover:brightness-110">
                        <Save size={20} /> SAVE FRAME
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start h-[80vh]">

                    {/* Toolbar */}
                    <div className="w-full lg:w-1/3 bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-white flex flex-col gap-6 h-full">
                        <h2 className="text-xl font-titan text-green-400 border-b border-white/10 pb-2">TOOLS</h2>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase">Background</h3>
                                </div>

                                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-yellow-400 hover:bg-white/5 transition group">
                                    <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-yellow-400">
                                        <Upload size={32} />
                                        <span className="text-xs font-bold uppercase">Upload Base Image</span>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleUploadBg} />
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={addText} className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-yellow-400 transition">
                                    <Type />
                                    <span className="text-xs font-bold uppercase">Add Text</span>
                                </button>
                                <button className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-yellow-400 transition cursor-not-allowed opacity-50">
                                    <ImageIcon />
                                    <span className="text-xs font-bold uppercase">Stickers</span>
                                </button>
                            </div>
                        </div>

                        {/* Layer Properties */}
                        <div className="flex-1 bg-black/20 rounded-xl p-4 border border-white/5 mt-auto">
                            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase">Selected Layer</h3>
                            {selectedElementId ? (
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={elements.find(e => e.id === selectedElementId)?.content}
                                        onChange={(e) => {
                                            const newContent = e.target.value;
                                            setElements(elements.map(el => el.id === selectedElementId ? { ...el, content: newContent } : el));
                                        }}
                                        className="w-full bg-black border border-gray-600 text-white p-2 rounded text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={elements.find(e => e.id === selectedElementId)?.color}
                                            onChange={(e) => {
                                                setElements(elements.map(el => el.id === selectedElementId ? { ...el, color: e.target.value } : el));
                                            }}
                                            className="h-10 w-10 bg-transparent cursor-pointer rounded overflow-hidden"
                                        />
                                        <button
                                            onClick={() => {
                                                setElements(elements.filter(e => e.id !== selectedElementId));
                                                setSelectedElementId(null);
                                            }}
                                            className="ml-auto p-2 text-red-400 hover:bg-red-400/10 rounded transition"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600 italic">Select an element to edit properties.</p>
                            )}
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 bg-black/80 rounded-2xl border-4 border-gray-800 flex items-center justify-center p-8 overflow-auto h-full shadow-inner relative">
                        {/* Grid lines for precision feel */}
                        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                        <div className="relative shadow-2xl border border-white/10" style={{ width: CANVAS_WIDTH * SCALE, height: CANVAS_HEIGHT * SCALE }}>
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_WIDTH}
                                height={CANVAS_HEIGHT}
                                className="w-full h-full bg-white"
                                style={{ transformOrigin: 'top left' }}
                                onClick={(e) => {
                                    // Basic hit detection (very naive)
                                    // In a real app, use Konva or Fabric.js
                                    setSelectedElementId(null);
                                }}
                            />
                        </div>

                        <div className="absolute top-4 right-4 bg-black/60 px-2 py-1 rounded text-xs text-gray-400 font-mono pointer-events-none">
                            CANVAS: 400x1200
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FrameCreator;
