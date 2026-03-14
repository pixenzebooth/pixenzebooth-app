import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Code, Terminal, Cpu, Globe, Database, Github, Linkedin, Mail, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const DeveloperProfile = () => {
    return (
        <div className="min-h-screen bg-game-bg font-nunito text-white overflow-hidden relative selection:bg-game-primary selection:text-white">
            <Helmet>
                <title>Nanda | Website Developer</title>
                <meta name="description" content="Portfolio and profile of Nanda, a passionate Full Stack Developer specializing in modern web technologies, React, Node.js, and interactive user experiences." />
                <meta name="keywords" content="Nanda Addi Wijaya, Nanda Addi, Nanda fotografi, Nanda Developer, React Nanda, Nanda Web Developer Indonesia" />
            </Helmet>

            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full opacity-10"
                    style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                />
                <motion.div
                    animate={{
                        opacity: [0.3, 0.5, 0.3],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full"
                />
                <motion.div
                    animate={{
                        opacity: [0.3, 0.5, 0.3],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full"
                />
            </div>

            <div className="relative z-10 container mx-auto px-6 py-20 md:py-32">
                <div className="flex flex-col md:flex-row gap-12 items-center justify-between mb-24">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="flex-1"
                    >
                        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2 rounded-full mb-6">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-mono text-green-400">OPEN TO WORK</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-titan mb-6 leading-tight">
                            Hi, I'm <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-game-primary to-purple-400">Nanda Addi Wijaya</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-white/70 mb-8 max-w-2xl leading-relaxed">
                            A creative <span className="text-white font-bold">Full Stack Developer</span> crafting digital experiences that live on the internet.
                            Specializing in building exceptional, high-quality websites and applications.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 bg-black/30 px-5 py-3 rounded-xl border border-white/10 hover:border-game-primary/50 transition cursor-default">
                                <Code className="text-game-primary" />
                                <span>Frontend Architecture</span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/30 px-5 py-3 rounded-xl border border-white/10 hover:border-game-primary/50 transition cursor-default">
                                <Database className="text-purple-400" />
                                <span>Backend Systems</span>
                            </div>
                            <div className="flex items-center gap-2 bg-black/30 px-5 py-3 rounded-xl border border-white/10 hover:border-game-primary/50 transition cursor-default">
                                <Zap className="text-yellow-400" />
                                <span>UI/UX Design</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="w-72 h-72 md:w-96 md:h-96 relative">
                            <div className="absolute inset-0 border-4 border-game-primary/30 rounded-2xl transform rotate-6 translate-x-4 translate-y-4"></div>
                            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-2xl transform -rotate-3 -translate-x-4 -translate-y-4"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-game-bg-dark to-black border border-white/20 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl">
                                <Terminal size={120} className="text-white/20" />
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm hover:backdrop-blur-none transition duration-500">
                                    <span className="text-6xl mb-4">🚀</span>
                                    <h3 className="text-2xl font-bold font-titan">BUILDING<br />THE FUTURE</h3>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-24"
                >
                    <h2 className="text-3xl font-titan mb-12 text-center text-game-secondary">TECHNICAL ARSENAL</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { icon: Globe, label: "Web Technologies", desc: "HTML5, CSS3, Modern JS" },
                            { icon: Cpu, label: "Frameworks", desc: "React, Vue, Next.js" },
                            { icon: Database, label: "Data Management", desc: "SQL, MongoDB, Supabase" },
                            { icon: Terminal, label: "DevOps", desc: "Git, Docker, CI/CD" }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition group">
                                <item.icon className="w-10 h-10 mb-4 text-gray-400 group-hover:text-game-primary transition-colors" />
                                <h3 className="font-bold text-xl mb-2">{item.label}</h3>
                                <p className="text-white/50 text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <div className="inline-block p-[1px] rounded-2xl bg-gradient-to-r from-game-primary via-purple-500 to-blue-500 mb-8">
                        <div className="bg-game-bg rounded-2xl p-8 md:p-12">
                            <h2 className="text-3xl md:text-5xl font-titan mb-6">Let's Create Something Amazing</h2>
                            <p className="text-white/60 mb-8 max-w-xl mx-auto">
                                Whether you have a project in mind or just want to say hi, I'm always open to discussing new ideas and opportunities.
                            </p>
                            <div className="flex justify-center gap-6">
                                <button className="p-4 bg-white/5 rounded-full hover:bg-white/10 hover:text-game-primary transition border border-white/10">
                                    <Github size={24} />
                                </button>
                                <button className="p-4 bg-white/5 rounded-full hover:bg-white/10 hover:text-blue-400 transition border border-white/10">
                                    <Linkedin size={24} />
                                </button>
                                <button className="p-4 bg-white/5 rounded-full hover:bg-white/10 hover:text-green-400 transition border border-white/10">
                                    <Mail size={24} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-white/30 text-sm">
                        <p>&copy; {new Date().getFullYear()} Nanda. All rights reserved.</p>
                        <p className="mt-2 text-xs font-mono">
                            <Link to="/" className="hover:text-white transition">PixenzeBooth</Link> • Lead Developer
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default DeveloperProfile;
