import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Camera, Home, ExternalLink, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const PhotoShare = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [imageUrl, setImageUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        // Fallback for React Router HashRouter swallowing query params on some mobile devices
        // We manually extract from window.location.href to be absolutely 100% safe
        let extractedUrl = '';
        try {
            const currentHref = window.location.href;
            console.log(`[PhotoShare] Full href: ${currentHref}`);
            
            if (currentHref.includes('?img=')) {
                // Extract everything after ?img=
                const rawParam = currentHref.split('?img=')[1];
                // In case there are other params after img, split by & only
                // But be careful not to split on & that's part of the encoded URL
                const beforeAmp = rawParam ? rawParam.split('&')[0] : '';
                extractedUrl = decodeURIComponent(beforeAmp);
                console.log(`[PhotoShare] Extracted URL: ${extractedUrl}`);
            }
            
            // Also try React Router's search params as fallback
            if (!extractedUrl) {
                const searchParams = new URLSearchParams(location.search);
                const imgParam = searchParams.get('img');
                if (imgParam) {
                    extractedUrl = imgParam;
                    console.log(`[PhotoShare] Extracted URL from searchParams: ${extractedUrl}`);
                }
            }
        } catch (e) {
            console.error('[PhotoShare] URL extraction error:', e);
        }

        // Validate URL looks like a proper image URL
        if (extractedUrl) {
            if (!extractedUrl.startsWith('http')) {
                console.error(`[PhotoShare] Invalid URL (not http): ${extractedUrl}`);
                setImageError(true);
            }
            setImageUrl(extractedUrl);
        } else {
            console.warn('[PhotoShare] No image URL found, redirecting to home');
            navigate('/');
        }
    }, [location, navigate]);

    const fetchWithRetry = async (url, retries = 3, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, {
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (res.ok) return res;
                
                // If 404, the file might not have propagated yet in R2
                if (res.status === 404 && i < retries - 1) {
                    console.log(`[PhotoShare] Got 404, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                
                throw new Error(`HTTP error! status: ${res.status}`);
            } catch (err) {
                if (i === retries - 1) throw err;
                console.log(`[PhotoShare] Fetch error, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    };

    const handleDownload = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        console.log(`[PhotoShare] Starting download for: ${imageUrl}`);
        
        try {
            const res = await fetchWithRetry(imageUrl);
            
            const blob = await res.blob();
            console.log(`[PhotoShare] Blob received: type=${blob.type}, size=${blob.size}`);
            
            // Verify it is actually an image before downloading
            if (!blob.type.includes('image')) {
                console.warn(`[PhotoShare] Warning: Downloaded blob is not an image (${blob.type})`);
                throw new Error('Not a valid image file');
            }
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pixenzebooth-moment-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('[PhotoShare] Download successful via blob method.');
        } catch (error) {
            console.error("[PhotoShare] Download error:", error);
            // Fallback: open in new tab (let the browser handle it directly)
            console.log('[PhotoShare] Falling back to new tab download.');
            window.open(imageUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    if (!imageUrl) return null;

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">

            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full flex flex-col items-center z-10"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Camera className="w-8 h-8 text-rose-500 animate-pulse" />
                    <h1 className="text-2xl font-titan tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">
                        PIXENZEBOOTH
                    </h1>
                </div>

                <div className="bg-gray-900 border-4 border-white/10 rounded-2xl p-4 shadow-xl mb-6 w-full flex flex-col items-center justify-center min-h-[200px]">
                    {!imageError ? (
                        <img
                            src={imageUrl}
                            alt="Your Photostrip"
                            onError={() => setImageError(true)}
                            loading="lazy"
                            className="w-full h-auto rounded-lg shadow-inner object-contain max-h-[60vh] mx-auto mix-blend-normal"
                        />
                    ) : (
                        <div className="flex flex-col items-center text-center p-4 text-white/70">
                            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                            <p className="font-bold text-white mb-2">Oops! Gambar gagal dimuat layar.</p>
                            <p className="text-xs mb-4">Hal ini bisa terjadi karena koneksi tidak stabil atau gambar masih diproses server.</p>

                            <a
                                href={imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg flex items-center gap-2 text-sm transition-colors"
                            >
                                <ExternalLink size={16} />
                                Buka Link Asli Gambar
                            </a>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 w-full">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={`w-full py-4 ${isDownloading ? 'bg-rose-400' : 'bg-rose-500 hover:bg-rose-600'} text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors`}
                    >
                        <Download size={20} />
                        {isDownloading ? 'MEMPROSES...' : 'SAVE TO GALLERY'}
                    </motion.button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <Home size={18} />
                        BACK TO HOME
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default PhotoShare;
