import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy = () => {
    const sections = [
        {
            icon: FileText,
            title: "1. Data yang Kami Kumpulkan",
            color: "text-game-secondary",
            content: [
                {
                    subtitle: "a. Data Pribadi",
                    items: [
                        "Alamat email (jika pengguna menggunakan fitur pengiriman atau akun)",
                        "Nama (jika diisi secara sukarela)",
                        "Informasi lain yang secara sadar diberikan oleh pengguna"
                    ]
                },
                {
                    subtitle: "b. Data Foto & Konten",
                    items: [
                        "Foto yang diambil atau diunggah melalui layanan PixenzeBooth",
                        "Frame, filter, dan hasil edit yang dipilih pengguna"
                    ]
                },
                {
                    subtitle: "c. Data Teknis",
                    items: [
                        "Alamat IP",
                        "Jenis perangkat & browser",
                        "Sistem operasi",
                        "Waktu akses dan aktivitas penggunaan"
                    ]
                }
            ]
        },
        {
            icon: Eye,
            title: "2. Tujuan Penggunaan Data",
            color: "text-game-secondary",
            items: [
                "Menyediakan dan mengoperasikan layanan photobooth online",
                "Memproses pengambilan, pengeditan, dan penyimpanan foto",
                "Mengirimkan hasil foto melalui email atau unduhan",
                "Meningkatkan kualitas, performa, dan keamanan layanan",
                "Keperluan administrasi dan dukungan teknis",
                "Memenuhi kewajiban hukum yang berlaku"
            ]
        },
        {
            icon: Lock,
            title: "3. Penyimpanan & Keamanan Data",
            color: "text-game-secondary",
            items: [
                "Data disimpan menggunakan sistem penyimpanan yang aman dan terbatas",
                "Kami menerapkan langkah teknis dan organisatoris yang wajar untuk melindungi data dari akses tidak sah, kebocoran, atau penyalahgunaan",
                "Foto dan data pengguna hanya disimpan selama diperlukan untuk tujuan layanan, kecuali diwajibkan lebih lama oleh hukum"
            ]
        },
        {
            icon: Shield,
            title: "4. Pembagian Data kepada Pihak Ketiga",
            color: "text-game-secondary",
            text: "PixenzeBooth tidak menjual atau menyewakan data pribadi pengguna kepada pihak ketiga.",
            items: [
                "Penyedia layanan teknologi (hosting, database, email delivery) yang membantu operasional PixenzeBooth",
                "Pihak berwenang jika diwajibkan oleh hukum atau perintah resmi"
            ],
            note: "Semua pihak ketiga tersebut terikat untuk menjaga kerahasiaan dan keamanan data."
        },
        {
            icon: FileText,
            title: "5. Hak Pengguna atas Data Pribadi",
            color: "text-game-secondary",
            text: "Sesuai dengan UU PDP, pengguna memiliki hak untuk:",
            items: [
                "Mengakses data pribadi miliknya",
                "Meminta perbaikan data yang tidak akurat",
                "Meminta penghapusan data pribadi",
                "Menarik persetujuan penggunaan data",
                "Mengajukan keberatan atas pemrosesan data tertentu"
            ],
            note: "Permintaan dapat diajukan melalui kontak resmi PixenzeBooth."
        }


    ];

    return (
        <div className="min-h-screen font-nunito text-game-accent p-4 md:p-8 relative overflow-hidden">
            <Helmet>
                <title>Privacy Policy | PixenzeBooth</title>
                <meta name="description" content="Kebijakan Privasi PixenzeBooth menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda sesuai UU PDP Indonesia." />
            </Helmet>

            {/* Background Blobs */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
                transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
                className="hidden md:block absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-game-primary/15 blur-[60px] rounded-full pointer-events-none"
            ></motion.div>

            <motion.div
                animate={{ scale: [1.2, 1, 1.2], y: [0, -20, 0] }}
                transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
                className="hidden md:block absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-game-accent/10 blur-[60px] rounded-full pointer-events-none"
            ></motion.div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center mb-8 md:mb-12"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Shield className="w-10 h-10 md:w-12 md:h-12 text-game-accent" />
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-titan text-game-accent">
                            PRIVACY POLICY
                        </h1>
                    </div>
                    <p className="text-sm md:text-base text-gray-600 font-mono">
                        PixenzeBooth
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 mt-2">
                        Terakhir diperbarui: 29/01/2026
                    </p>
                </motion.div>

                {/* Introduction */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 mb-6 shadow-game"
                >
                    <p className="text-sm md:text-base leading-relaxed text-gray-800">
                        PixenzeBooth menghargai dan melindungi privasi setiap pengguna. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi pengguna sesuai dengan peraturan perundang-undangan yang berlaku di Indonesia, termasuk <strong className="text-game-accent">Undang-Undang Nomor 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP)</strong>.
                    </p>
                    <p className="text-sm md:text-base leading-relaxed text-gray-800 mt-4">
                        Dengan mengakses dan menggunakan layanan PixenzeBooth, Anda menyetujui seluruh ketentuan dalam Kebijakan Privasi ini.
                    </p>
                </motion.div>

                {/* Sections */}
                {sections.map((section, index) => (
                    <motion.div
                        key={index}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 * (index + 3) }}
                        className="bg-white/80 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 mb-6 shadow-game"
                    >
                        <div className="mb-4">
                            <h2 className="text-xl md:text-2xl font-titan text-game-accent">
                                {section.title}
                            </h2>
                        </div>

                        {section.text && (
                            <p className="text-sm md:text-base text-gray-800 mb-3">
                                {section.text}
                            </p>
                        )}

                        {section.content ? (
                            <div className="space-y-4">
                                {section.content.map((item, idx) => (
                                    <div key={idx}>
                                        <h3 className="font-bold text-game-accent mb-2 text-sm md:text-base">
                                            {item.subtitle}
                                        </h3>
                                        <ul className="list-disc list-inside space-y-1 text-sm md:text-base text-gray-800 ml-2">
                                            {item.items.map((point, i) => (
                                                <li key={i}>{point}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-gray-800 ml-2">
                                {section.items?.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        )}

                        {section.note && (
                            <p className="text-sm md:text-base text-gray-600 mt-4 italic">
                                {section.note}
                            </p>
                        )}
                    </motion.div>
                ))}

                {/* Additional Sections */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="bg-white/80 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 mb-6 shadow-game"
                >
                    <h2 className="text-xl md:text-2xl font-titan text-game-accent mb-4">
                        6. Cookies & Teknologi Serupa
                    </h2>
                    <p className="text-sm md:text-base text-gray-800 mb-3">
                        PixenzeBooth dapat menggunakan cookies atau teknologi serupa untuk:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-gray-800 ml-2 mb-4">
                        <li>Menyimpan preferensi pengguna</li>
                        <li>Meningkatkan pengalaman penggunaan</li>
                        <li>Analisis performa website</li>
                    </ul>
                    <p className="text-sm md:text-base text-gray-600 italic">
                        Pengguna dapat mengatur browser untuk menolak cookies, namun beberapa fitur mungkin tidak berfungsi optimal.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="bg-white/80 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 mb-6 shadow-game"
                >
                    <h2 className="text-xl md:text-2xl font-titan text-game-accent mb-4">
                        7. Perlindungan Data Anak
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-gray-800 ml-2">
                        <li>Layanan PixenzeBooth tidak ditujukan secara khusus untuk anak di bawah usia 13 tahun.</li>
                        <li>Kami tidak secara sengaja mengumpulkan data pribadi anak tanpa persetujuan orang tua atau wali.</li>
                    </ul>
                </motion.div>

                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="bg-white/80 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 mb-6 shadow-game"
                >
                    <h2 className="text-xl md:text-2xl font-titan text-game-accent mb-4">
                        8. Perubahan Kebijakan Privasi
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-gray-800 ml-2">
                        <li>PixenzeBooth dapat memperbarui Kebijakan Privasi ini sewaktu-waktu.</li>
                        <li>Setiap perubahan akan ditampilkan pada halaman ini dengan tanggal pembaruan terbaru.</li>
                        <li>Penggunaan layanan secara berkelanjutan setelah perubahan dianggap sebagai persetujuan terhadap kebijakan yang diperbarui.</li>
                    </ul>
                </motion.div>

                {/* Contact Section */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="bg-gradient-to-br from-game-accent/20 to-game-primary/20 backdrop-blur-sm border-4 border-black rounded-2xl p-6 md:p-8 shadow-game"
                >
                    <h2 className="text-xl md:text-2xl font-titan text-game-accent mb-4">
                        9. Kontak Kami
                    </h2>
                    <p className="text-sm md:text-base text-gray-800 mb-4">
                        Jika Anda memiliki pertanyaan, permintaan, atau keluhan terkait Kebijakan Privasi ini, silakan hubungi:
                    </p>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm md:text-base">
                            <span className="text-game-accent font-bold">Email:</span>
                            <a href="mailto:support@pixenzebooth.com" className="text-game-accent hover:underline">
                                pixenzebooth@gmail.com
                            </a>
                        </div>
                        <div className="flex items-center gap-3 text-sm md:text-base">
                            <span className="text-game-accent font-bold">Website:</span>
                            <a href="https://www.pixenzebooth.com" target="_blank" rel="noopener noreferrer" className="text-game-accent hover:underline">
                                www.pixenzebooth.com
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* Back Button */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2 }}
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

export default PrivacyPolicy;
