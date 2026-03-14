import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Heart, Users, Palette } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const About = () => {
    const contributors = [
        {
            name: "Nanda Addi Wijaya",
            role: "Office Boy",
            instagram: "@nandaaddiwijaya",
            link: "https://instagram.com/nandaaddiwijaya",
            color: "from-game-primary to-game-accent",
            image: "/4.jpg"
        },
        {
            name: "King Naufal Igall",
            role: "Dish Washer",
            instagram: "@naufal.igall",
            link: "https://instagram.com/naufal.igall",
            color: "from-purple-500 to-pink-500",
            image: "/1.jpg"
        },
        {
            name: "Tuanku Imam Puki",
            role: "Server",
            instagram: "@kitoohhh",
            link: "https://instagram.com/kitoohhh",
            color: "from-blue-500 to-cyan-500",
            image: "/2.jpg"
        },
        {
            name: "Mas Okim Tukang Timpa",
            role: "Tukang Pukul",
            instagram: "@faiz.jatmiko",
            link: "https://instagram.com/faiz.jatmiko",
            color: "from-orange-500 to-red-500",
            image: "/3.jpg"
        },
    ];

    return (
        <div className="min-h-screen font-nunito text-game-accent p-4 md:p-8 relative overflow-hidden">
            <Helmet>
                <title>About | PixenzeBooth</title>
                <meta name="description" content="Kebijakan Privasi PixenzeBooth menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda sesuai UU PDP Indonesia." />
            </Helmet>
            {/* Background Blobs */}
            <motion.div
                animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="hidden md:block absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-game-primary/15 blob-optimized rounded-full pointer-events-none"
            ></motion.div>

            <motion.div
                animate={{ scale: [1.2, 1, 1.2], x: [0, 30, 0] }}
                transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
                className="hidden md:block absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-game-accent/10 blob-optimized rounded-full pointer-events-none"
            ></motion.div>

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center mb-8 md:mb-12"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-titan text-game-accent">
                            ABOUT PIXENZEBOOTH
                        </h1>
                    </div>
                </motion.div>

                {/* Main Description */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 mb-8 shadow-game"
                >
                    <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-4">
                        <strong className="text-game-accent text-xl md:text-2xl">PixenzeBooth</strong> adalah platform photobooth online yang memungkinkan siapa saja membuat foto seru, estetik, dan siap dibagikan langsung dari browser, tanpa ribet dan tanpa perlu alat khusus.
                    </p>
                    <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-4">
                        Kami percaya bahwa momen kecil layak dirayakan. Dengan berbagai pilihan frame kreatif, filter menarik, dan sistem yang cepat serta responsif, PixenzeBooth cocok untuk teman-teman yang terbatas dalam penggunaan akses photobooth.
                    </p>
                    <p className="text-base md:text-lg leading-relaxed text-gray-800 mb-4">
                        Cukup buka website, ambil foto, pilih gaya favoritmu, lalu download atau bagikan hasilnya dalam hitungan detik.
                    </p>
                    <p className="text-base md:text-lg leading-relaxed text-gray-800">
                        PixenzeBooth terus dikembangkan dengan fokus pada <strong className="text-game-success">kemudahan</strong>, <strong className="text-game-success">kecepatan</strong> <strong className="text-game-success">, dan kreativitas</strong>, agar pengalaman photobooth online terasa menyenangkan untuk semua orang.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12"
                >
                    <motion.div
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="bg-gradient-to-br from-game-primary/20 to-game-primary/5 backdrop-blur-sm border-4 border-black rounded-xl p-6 shadow-game"
                    >
                        <Zap className="w-10 h-10 md:w-12 md:h-12 text-game-success mb-3" fill="currentColor" />
                        <h3 className="text-lg md:text-xl font-titan text-game-accent mb-2">CEPAT</h3>
                        <p className="text-sm md:text-base text-gray-600">
                            Ambil foto dan download hasilnya dalam hitungan detik
                        </p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="bg-gradient-to-br from-game-success/20 to-game-success/5 backdrop-blur-sm border-4 border-black rounded-xl p-6 shadow-game"
                    >
                        <Heart className="w-10 h-10 md:w-12 md:h-12 text-game-success mb-3" fill="currentColor" />
                        <h3 className="text-lg md:text-xl font-titan text-game-accent mb-2">MUDAH</h3>
                        <p className="text-sm md:text-base text-gray-600">
                            Langsung dari browser, tanpa install aplikasi
                        </p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="bg-gradient-to-br from-game-accent/20 to-game-accent/5 backdrop-blur-sm border-4 border-black rounded-xl p-6 shadow-game"
                    >
                        <Palette className="w-10 h-10 md:w-12 md:h-12 text-game-success mb-3" />
                        <h3 className="text-lg md:text-xl font-titan text-game-accent mb-2">KREATIF</h3>
                        <p className="text-sm md:text-base text-gray-600">
                            Berbagai frame & filter untuk gaya unikmu
                        </p>
                    </motion.div>
                </motion.div>

                {/* Contributors Section */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mb-8"
                >
                    <div className="bg-white/80 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 shadow-game">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <Users className="w-8 h-8 md:w-10 md:h-10 text-game-secondary" />
                            <h2 className="text-2xl md:text-3xl font-titan text-center text-game-secondary">
                                CONTRIBUTORS
                            </h2>
                        </div>

                        <p className="text-sm md:text-base text-center text-gray-600 mb-8">
                            PixenzeBooth dikembangkan dengan semangat untuk menciptakan pengalaman photobooth online yang menyenangkan dan mudah digunakan.
                        </p>

                        <div className="flex flex-wrap justify-center gap-6">
                            {contributors.map((contributor, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ scale: 0, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.8 + (index * 0.2), type: "spring", bounce: 0.5 }}
                                    whileHover={{ y: -8, scale: 1.05 }}
                                    className={`bg-gradient-to-br ${contributor.color} p-1 rounded-2xl border-4 border-black shadow-game w-full sm:w-[calc(50%-1.5rem)] md:w-[calc(33.33%-1.5rem)] lg:w-[calc(20%-1.2rem)] min-w-[200px]`}
                                >
                                    <div className="bg-game-dark rounded-xl p-6 text-center h-full flex flex-col justify-between">
                                        <div>
                                            {/* Avatar */}
                                            <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                transition={{ duration: 0.3 }}
                                                className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-black overflow-hidden bg-white"
                                            >
                                                {contributor.image ? (
                                                    <img
                                                        src={contributor.image}
                                                        alt={contributor.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-3xl">
                                                        🎨
                                                    </div>
                                                )}
                                            </motion.div>



                                            <h2 className="text-lg font-titan text-game-accent mb-2 leading-tight">
                                                {contributor.name}
                                            </h2>
                                            <p className="text-xs text-game-accent font-bold mb-3 uppercase tracking-wider">
                                                {contributor.role}
                                            </p>
                                        </div>
                                        <a
                                            href={contributor.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block text-xs text-gray-600 hover:text-game-accent transition-colors truncate w-full"
                                        >
                                            📷 {contributor.instagram}
                                        </a>
                                    </div>
                                </motion.div>
                            ))}
                        </div>


                        {/* Collaboration CTA */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            className="mt-8 p-4 md:p-6 bg-gradient-to-r from-game-primary/20 to-game-accent/20 rounded-xl border-2 border-game-accent/50 text-center"
                        >
                            <p className="text-sm md:text-base text-gray-800 mb-3">
                                Tertarik untuk berkolaborasi atau berkontribusi? Hubungi Gwehh!
                            </p>
                            <a href="/contact">
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-game-accent text-black font-bold px-6 py-2 rounded-lg border-4 border-black shadow-game hover:brightness-110 transition text-sm md:text-base font-titan"
                                >
                                    HUBUNGI GWEHH
                                </motion.button>
                            </a>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Back Button */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.4 }}
                    className="text-center"
                >
                    <a href="/">
                        <button className="btn-game-primary px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-titan">
                            ← BACK TO HOME
                        </button>
                    </a>
                </motion.div>
            </div>
        </div>
    );
};

export default About;
