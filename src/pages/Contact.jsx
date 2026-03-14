import React, { useState } from 'react';
import { useAlert } from '../context/AlertContext';
import { motion } from 'framer-motion';
import { Mail, Github, Instagram, Globe, MessageCircle, Zap, Send, Check } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

import { supabase } from '../lib/supabase';

const Contact = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const { showAlert } = useAlert();

    const contactMethods = [
        {
            icon: Mail,
            label: "Email",
            value: "support@pixenzebooth.com",
            link: "mailto:support@pixenzebooth.com",
            color: "text-game-primary",
            bg: "from-game-primary/20 to-game-primary/5"
        },
        {
            icon: Github,
            label: "GitHub",
            value: "NandaAddi",
            link: "https://github.com/NandaAddi",
            color: "text-white",
            bg: "from-white/20 to-white/5"
        },
        {
            icon: Instagram,
            label: "Instagram",
            value: "@pixenzebooth",
            link: "https://instagram.com/pixenzebooth",
            color: "text-game-accent",
            bg: "from-game-accent/20 to-game-accent/5"
        },
        {
            icon: Globe,
            label: "Website",
            value: "www.pixenzebooth.com",
            link: "https://www.pixenzebooth.com",
            color: "text-game-success",
            bg: "from-game-success/20 to-game-success/5"
        }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        setIsSubmitting(true);

        try {
            const { error } = await supabase.from('messages').insert([{
                name: formData.name,
                email: formData.email,
                message: formData.message,
                created_at: new Date() // Explicitly set created_at for clarity
            }]);

            if (error) throw error;

            setSubmitStatus('success');
            setFormData({ name: '', email: '', message: '' });
            showAlert("Message sent successfully!", "success");

        } catch (error) {
            showAlert("Failed to send message. Please try again later.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen font-nunito text-game-accent p-4 md:p-8 relative overflow-hidden">
            <Helmet>
                <title>Contact Us - PixenzeBooth</title>
                <meta name="description" content="Get in touch with the PixenzeBooth team for collaborations, support, or just to say hi!" />
            </Helmet>

            {/* Background Blobs */}
            <motion.div
                animate={{ scale: [1, 1.3, 1], x: [0, 40, 0] }}
                transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
                className="hidden md:block absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-game-secondary/15 blob-optimized rounded-full pointer-events-none"
            ></motion.div>

            <motion.div
                animate={{ scale: [1.2, 1, 1.2], rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                className="hidden md:block absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-game-primary/10 blob-optimized rounded-full pointer-events-none"
            ></motion.div>

            {/* Floating Elements */}
            <motion.div
                animate={{ y: [0, -20, 0], rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                className="absolute top-20 right-16 md:right-24"
            >
                <Zap className="w-8 h-8 md:w-10 md:h-10 text-game-accent" fill="currentColor" />
            </motion.div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center mb-8 md:mb-12"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <MessageCircle className="w-10 h-10 md:w-12 md:h-12 text-game-accent" />
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-titan text-game-accent">
                            CONTACT US
                        </h1>
                    </div>
                </motion.div>

                {/* Introduction */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 mb-8 shadow-game text-center"
                >
                    <h2 className="text-xl md:text-2xl font-bold text-game-accent mb-4">
                        Punya pertanyaan, saran, atau ingin kolaborasi?
                    </h2>
                    <p className="text-base md:text-lg text-gray-800">
                        Kami senang mendengarnya!
                    </p>
                    <p className="text-sm md:text-base text-gray-600 mt-2">
                        Silakan hubungi kami melalui sosial media di bawah atau kirim pesan langsung:
                    </p>
                </motion.div>

                {/* Contact Functions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {/* Left Column: Social Links */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xl font-titan text-game-accent mb-2 text-center md:text-left">SOCIALS</h3>
                        {contactMethods.map((method, index) => (
                            <motion.a
                                key={index}
                                href={method.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 + (index * 0.1) }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`bg-gradient-to-r ${method.bg} backdrop-blur-sm border-2 border-black rounded-xl p-4 shadow-game cursor-pointer group`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`${method.color}`}>
                                        <method.icon size={24} />
                                    </div>
                                    <span className="font-bold text-game-accent group-hover:text-game-accent transition">
                                        {method.label}
                                    </span>
                                </div>
                            </motion.a>
                        ))}
                    </div>

                    {/* Right Column: Contact Form */}
                    <div className="flex flex-col">
                        <h3 className="text-xl font-titan text-game-accent mb-4 text-center md:text-left">SEND MESSAGE</h3>
                        <motion.form
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            onSubmit={handleSubmit}
                            className="bg-black/30 backdrop-blur-md border-4 border-black rounded-2xl p-6 shadow-game flex flex-col gap-4"
                        >
                            {submitStatus === 'success' ? (
                                <div className="text-center py-10">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-16 h-16 bg-game-success rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black"
                                    >
                                        <Check className="text-black" size={32} />
                                    </motion.div>
                                    <h3 className="text-2xl font-titan text-game-success mb-2">MESSAGE SENT!</h3>
                                    <p className="text-game-accent/80">Terima kasih sudah menghubungi kami.</p>
                                    <button
                                        onClick={() => setSubmitStatus(null)}
                                        className="mt-6 text-sm underline text-game-accent hover:text-game-accent"
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block font-bold text-sm mb-1 ml-1 text-game-secondary">NAMA</label>
                                        <input
                                            type="text"
                                            placeholder="Your Name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="w-full bg-white text-black font-bold p-3 rounded-xl border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_#00F0FF] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-sm mb-1 ml-1 text-game-primary">EMAIL</label>
                                        <input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="w-full bg-white text-black font-bold p-3 rounded-xl border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_#FF005C] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-sm mb-1 ml-1 text-game-accent">PESAN</label>
                                        <textarea
                                            rows="4"
                                            placeholder="Write your message here..."
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            required
                                            className="w-full bg-white text-black font-bold p-3 rounded-xl border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_#FFDE00] transition-all resize-none"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full py-4 rounded-xl border-4 border-black font-titan text-xl shadow-game transition-all flex items-center justify-center gap-2
                                        ${isSubmitting
                                                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                                                : 'bg-game-success hover:-translate-y-1 hover:shadow-game-hover active:translate-y-0 active:shadow-game'
                                            } text-black`}
                                    >
                                        {isSubmitting ? 'SENDING...' : (
                                            <>
                                                SEND MESSAGE <Send size={20} />
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </motion.form>
                    </div>
                </div>

                {/* Collaboration Note */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="bg-gradient-to-br from-game-accent/20 to-game-primary/20 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 shadow-game"
                >
                    <div className="flex items-start gap-4">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        >
                            <Zap className="w-8 h-8 md:w-10 md:h-10 text-game-accent flex-shrink-0" fill="currentColor" />
                        </motion.div>
                        <div>
                            <h3 className="text-lg md:text-xl font-titan text-game-accent mb-3">
                                KOLABORASI KHUSUS
                            </h3>
                            <p className="text-sm md:text-base text-gray-800 leading-relaxed">
                                Untuk kerja sama ilustrator, event, atau kebutuhan khusus, jangan ragu untuk menghubungi kami melalui email dengan subjek:
                            </p>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="mt-4 bg-black/50 border-2 border-game-accent rounded-lg p-4 font-mono text-sm md:text-base"
                            >
                                <p className="text-game-accent font-bold">
                                    Subject: "Collaboration – PixenzeBooth"
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* Back Button */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-center mt-8"
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

export default Contact;
