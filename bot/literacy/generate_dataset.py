import pandas as pd
import random

def generate_wrong_answers(correct_summary, level):
    """Generate 3 wrong answers based on common patterns"""
    wrong_answers = []
    
    # Pattern 1: Negation
    if "suka" in correct_summary:
        wrong_answers.append(correct_summary.replace("suka", "tidak suka"))
    elif "berhasil" in correct_summary:
        wrong_answers.append(correct_summary.replace("berhasil", "gagal"))
    elif "baik" in correct_summary:
        wrong_answers.append(correct_summary.replace("baik", "buruk"))
    else:
        wrong_answers.append(f"Tidak ada {correct_summary.split()[-1]} dalam cerita")
    
    # Pattern 2: Wrong details
    words = correct_summary.split()
    if len(words) > 3:
        # Change one key word
        modified = words.copy()
        if "sekolah" in modified:
            modified[modified.index("sekolah")] = "rumah"
        elif "membaca" in modified:
            modified[modified.index("membaca")] = "menulis"
        elif "pagi" in modified:
            modified[modified.index("pagi")] = "malam"
        else:
            modified[-1] = "berbeda"
        wrong_answers.append(" ".join(modified))
    else:
        wrong_answers.append(f"Cerita tentang hal yang berbeda")
    
    # Pattern 3: Overgeneralization or incomplete
    if level <= 2:
        wrong_answers.append("Cerita tentang kehidupan sehari-hari")
    else:
        wrong_answers.append("Informasi dalam teks tidak lengkap")
    
    # Ensure we have exactly 3 unique wrong answers
    wrong_answers = list(set(wrong_answers))[:3]
    while len(wrong_answers) < 3:
        wrong_answers.append(f"Jawaban salah {len(wrong_answers) + 1}")
    
    return wrong_answers[:3]

def create_indonesian_literacy_dataset():
    """Generate complete dataset for levels 1-5"""
    
    # Define templates for each level
    templates = {
        1: {
            "topics": ["keluarga", "sekolah", "makanan", "hewan", "permainan"],
            "templates": [
                {
                    "text": "{nama} adalah {sifat} yang {aktivitas1}. Setiap {waktu} {nama} {aktivitas2} di {tempat}. {nama} merasa {perasaan} ketika {aktivitas3}. {keluarga} sangat {reaksi} dengan {nama}.",
                    "summary": "{nama} adalah {sifat} yang {aktivitas1} dan {aktivitas2}",
                    "variables": {
                        "nama": ["Ani", "Budi", "Citra", "Doni", "Eka", "Fira", "Gita", "Hadi", "Ina", "Joko"],
                        "sifat": ["anak rajin", "anak pintar", "anak baik", "siswa teladan", "anak ceria"],
                        "aktivitas1": ["suka belajar", "gemar membaca", "rajin berolahraga", "senang membantu", "hobi menggambar"],
                        "aktivitas2": ["bermain", "belajar", "membaca", "berolahraga", "membantu"],
                        "aktivitas3": ["belajar", "bermain", "membantu orang lain", "membaca buku", "menggambar"],
                        "waktu": ["pagi hari", "sore hari", "sepulang sekolah", "hari minggu", "waktu luang"],
                        "tempat": ["rumah", "sekolah", "taman", "perpustakaan", "lapangan"],
                        "perasaan": ["senang", "bahagia", "bangga", "gembira", "puas"],
                        "keluarga": ["Keluarga", "Orang tua", "Ayah dan ibu", "Kakak dan adik"],
                        "reaksi": ["bangga", "senang", "bahagia", "puas", "mendukung"]
                    }
                },
                {
                    "text": "Di {tempat} ada {objek} yang {sifat}. Setiap hari {pelaku} datang untuk {aktivitas}. {objek} sangat {manfaat} untuk {pelaku}. Semua orang {reaksi} dengan {objek} tersebut.",
                    "summary": "{tempat} memiliki {objek} yang {manfaat} untuk {pelaku}",
                    "variables": {
                        "tempat": ["sekolah", "rumah", "taman", "desa", "kota"],
                        "objek": ["perpustakaan", "taman", "lapangan", "kolam", "kebun"],
                        "sifat": ["indah", "bersih", "luas", "nyaman", "asri"],
                        "pelaku": ["anak-anak", "siswa", "warga", "keluarga", "masyarakat"],
                        "aktivitas": ["bermain", "belajar", "membaca", "berolahraga", "bersantai"],
                        "manfaat": ["bermanfaat", "berguna", "membantu", "menyenangkan", "penting"],
                        "reaksi": ["senang", "puas", "bangga", "bahagia", "antusias"]
                    }
                }
            ]
        },
        2: {
            "topics": ["pendidikan", "lingkungan", "kesehatan", "ekonomi", "teknologi"],
            "templates": [
                {
                    "text": "{institusi} mengadakan {program} untuk {target}. Program ini bertujuan {tujuan} dan {manfaat}. Para {pelaku} {partisipasi} dengan {cara}. Hasil dari program ini {hasil} bagi {penerima}. {otoritas} {dukungan} terhadap program tersebut.",
                    "summary": "{institusi} mengadakan {program} yang {hasil} bagi {target}",
                    "variables": {
                        "institusi": ["Sekolah", "Puskesmas", "Kelurahan", "Koperasi", "Dinas Pendidikan"],
                        "program": ["program kebersihan", "program kesehatan", "pelatihan komputer", "bank sampah", "lomba literasi"],
                        "target": ["siswa", "warga", "petani", "ibu-ibu", "anak-anak"],
                        "tujuan": ["meningkatkan kesadaran", "memberikan pendidikan", "mengembangkan keterampilan", "memperbaiki kondisi"],
                        "manfaat": ["meningkatkan kualitas hidup", "memberikan penghasilan tambahan", "menjaga lingkungan", "mengembangkan potensi"],
                        "pelaku": ["peserta", "warga", "siswa", "masyarakat", "relawan"],
                        "partisipasi": ["berpartisipasi aktif", "antusias mengikuti", "bergotong royong", "bekerja sama"],
                        "cara": ["penuh semangat", "secara teratur", "dengan giat", "bersama-sama"],
                        "hasil": ["memberikan dampak positif", "sangat bermanfaat", "berhasil meningkatkan", "efektif membantu"],
                        "penerima": ["masyarakat", "lingkungan", "peserta", "warga sekitar"],
                        "otoritas": ["Kepala desa", "Pemerintah daerah", "Dinas terkait", "Tokoh masyarakat"],
                        "dukungan": ["memberikan dukungan penuh", "sangat mendukung", "mengapresiasi", "bangga dengan"]
                    }
                }
            ]
        },
        3: {
            "topics": ["sosial", "budaya", "pembangunan", "pertanian", "kewirausahaan"],
            "templates": [
                {
                    "text": "{masalah} menjadi perhatian utama di {lokasi} dalam beberapa tahun terakhir. {penyebab1} dan {penyebab2} menjadi faktor utama yang memperburuk kondisi tersebut. {pihak1} bekerja sama dengan {pihak2} untuk {solusi}. Melalui pendekatan {metode}, mereka berhasil {pencapaian}. {dampak} terhadap {penerima_manfaat} sangat signifikan. Program ini diharapkan dapat {harapan} di masa mendatang.",
                    "summary": "{pihak1} dan {pihak2} berhasil mengatasi {masalah} melalui {solusi}",
                    "variables": {
                        "masalah": ["masalah sampah", "kurangnya akses pendidikan", "kemiskinan petani", "pengangguran pemuda", "kerusakan lingkungan"],
                        "lokasi": ["desa terpencil", "kawasan perkotaan", "daerah pesisir", "wilayah pegunungan", "area perdesaan"],
                        "penyebab1": ["kurangnya kesadaran masyarakat", "terbatasnya infrastruktur", "minimnya modal usaha", "rendahnya pendidikan"],
                        "penyebab2": ["tidak adanya program pemerintah", "sulitnya akses transportasi", "kurangnya teknologi", "lemahnya koordinasi"],
                        "pihak1": ["Pemerintah daerah", "Organisasi masyarakat", "Lembaga swadaya", "Kelompok tani"],
                        "pihak2": ["masyarakat setempat", "sektor swasta", "universitas", "LSM lingkungan"],
                        "solusi": ["mengembangkan program pemberdayaan", "membangun infrastruktur", "memberikan pelatihan", "menciptakan lapangan kerja"],
                        "metode": ["partisipatif", "berkelanjutan", "terintegrasi", "inovatif"],
                        "pencapaian": ["meningkatkan kesejahteraan", "mengurangi masalah", "mengembangkan potensi lokal", "memperbaiki kondisi"],
                        "dampak": ["Perubahan positif", "Peningkatan kualitas hidup", "Kemajuan ekonomi", "Perbaikan lingkungan"],
                        "penerima_manfaat": ["masyarakat lokal", "generasi muda", "keluarga petani", "lingkungan sekitar"],
                        "harapan": ["diperluas ke daerah lain", "berkelanjutan jangka panjang", "menjadi model percontohan", "terus berkembang"]
                    }
                }
            ]
        },
        4: {
            "topics": ["politik", "ekonomi_makro", "teknologi_informasi", "globalisasi", "demografi"],
            "templates": [
                {
                    "text": "{fenomena} telah mengubah {aspek} di Indonesia secara fundamental dalam dekade terakhir. {faktor1}, {faktor2}, dan {faktor3} menjadi pendorong utama transformasi ini. {dampak_positif} terlihat jelas dalam {sektor1} dan {sektor2}, namun {tantangan} juga muncul bersamaan. {stakeholder1} dan {stakeholder2} harus {strategi} untuk {tujuan}. {kebijakan} yang tepat diperlukan untuk {hasil_diharapkan}. Tanpa {syarat}, {risiko} dapat mengancam {target_perlindungan}.",
                    "summary": "{fenomena} mengubah {aspek} Indonesia dengan {dampak_positif} namun memerlukan {strategi}",
                    "variables": {
                        "fenomena": ["Revolusi digital", "Urbanisasi masif", "Perubahan iklim", "Globalisasi ekonomi", "Transisi demografi"],
                        "aspek": ["struktur ekonomi", "pola konsumsi masyarakat", "sistem pendidikan", "tata kelola pemerintahan", "interaksi sosial"],
                        "faktor1": ["kemajuan teknologi", "pertumbuhan populasi", "perubahan kebijakan", "integrasi global"],
                        "faktor2": ["peningkatan konektivitas", "mobilitas sosial", "inovasi berkelanjutan", "diversifikasi ekonomi"],
                        "faktor3": ["kesadaran lingkungan", "dinamika politik", "kompetisi internasional", "evolusi budaya"],
                        "dampak_positif": ["peningkatan efisiensi", "demokratisasi akses", "akselerasi pertumbuhan", "diversifikasi peluang"],
                        "sektor1": ["sektor pendidikan", "industri kreatif", "layanan kesehatan", "perdagangan digital"],
                        "sektor2": ["transportasi publik", "sistem perbankan", "media komunikasi", "energi terbarukan"],
                        "tantangan": ["kesenjangan digital", "disparitas regional", "degradasi lingkungan", "ketimpangan sosial"],
                        "stakeholder1": ["Pemerintah pusat", "Sektor swasta", "Institusi pendidikan", "Organisasi masyarakat"],
                        "stakeholder2": ["pemerintah daerah", "komunitas lokal", "lembaga internasional", "generasi muda"],
                        "strategi": ["mengembangkan sinergi", "memperkuat regulasi", "meningkatkan kapasitas", "membangun kolaborasi"],
                        "tujuan": ["mencapai pembangunan berkelanjutan", "menjamin keadilan sosial", "mempertahankan daya saing", "melestarikan identitas budaya"],
                        "kebijakan": ["Regulasi yang adaptif", "Investasi strategis", "Program pemberdayaan", "Reformasi struktural"],
                        "hasil_diharapkan": ["mengoptimalkan manfaat", "meminimalkan risiko", "mempercepat adaptasi", "menjamin inklusivitas"],
                        "syarat": ["koordinasi yang efektif", "komitmen jangka panjang", "partisipasi aktif masyarakat", "alokasi sumber daya yang memadai"],
                        "risiko": ["disintegrasi sosial", "ketimpangan yang makin lebar", "degradasi kualitas hidup", "kehilangan identitas nasional"],
                        "target_perlindungan": ["kohesi sosial", "keseimbangan ekosistem", "kedaulatan bangsa", "kesejahteraan generasi mendatang"]
                    }
                }
            ]
        },
        5: {
            "topics": ["filsafat_sosial", "epistemologi", "kompleksitas_sistem", "paradigma_pembangunan", "transformasi_peradaban"],
            "templates": [
                {
                    "text": "{konsep_abstrak} dalam konteks {domain} Indonesia menuntut {pendekatan} yang {karakteristik_pendekatan}. {premis1} mendasari {asumsi} bahwa {proposisi}. Namun, {kontradiksi} menghasilkan {paradoks} yang {sifat_paradoks}. {metodologi} melalui {instrumen} dapat {kemampuan_metodologi} untuk {sasaran_analisis}. {sintesis} antara {elemen1} dan {elemen2} menghasilkan {output_sintesis} yang {kualitas_output}. {implikasi} terhadap {ranah_dampak} memerlukan {respons_strategis} yang {karakteristik_respons}.",
                    "summary": "{konsep_abstrak} memerlukan {pendekatan} untuk mengatasi {paradoks} dan menghasilkan {output_sintesis}",
                    "variables": {
                        "konsep_abstrak": ["Konstruksi identitas kolektif", "Dialektika modernitas-tradisi", "Epistemologi pengetahuan lokal", "Paradigma pembangunan berkelanjutan", "Transformasi kesadaran sosial"],
                        "domain": ["masyarakat multikultural", "ekonomi politik", "sistem pendidikan", "tata kelola publik", "ekosistem inovasi"],
                        "pendekatan": ["pendekatan hermeneutik", "analisis sistem kompleks", "metodologi partisipatif", "kerangka interdisipliner", "perspektif holistik"],
                        "karakteristik_pendekatan": ["kontekstual dan adaptif", "integratif dan komprehensif", "reflektif dan kritis", "dinamis dan responsif", "inklusif dan emansipatoris"],
                        "premis1": ["Asumsi epistemologis", "Paradigma positivistik", "Kerangka konstruktivis", "Perspektif fenomenologis"],
                        "asumsi": ["pemahaman linear", "kausalitas deterministik", "objektivitas mutlak", "universalitas nilai"],
                        "proposisi": ["realitas sosial dapat diprediksi", "perubahan mengikuti pola tertentu", "kemajuan bersifat unidireksional", "modernisasi adalah keniscayaan"],
                        "kontradiksi": ["kompleksitas empiris", "dinamika sosial-budaya", "heterogenitas kontekstual", "ambiguitas struktural"],
                        "paradoks": ["dikotomi yang saling bergantung", "kontinuitas dalam diskontinuitas", "stabilitas melalui perubahan", "unity dalam diversity"],
                        "sifat_paradoks": ["fundamentally irreducible", "inherently productive", "contextually situated", "dynamically evolving"],
                        "metodologi": ["Pendekatan transdisipliner", "Analisis multi-level", "Metode campuran", "Penelitian aksi partisipatif"],
                        "instrumen": ["triangulasi data", "refleksi kritis", "dialog intersubjektif", "sintesis dialektik"],
                        "kemampuan_metodologi": ["mengungkap kompleksitas laten", "memfasilitasi pemahaman mendalam", "mengintegrasikan perspektif beragam", "menghasilkan insight transformatif"],
                        "sasaran_analisis": ["struktur makna tersembunyi", "pola interaksi kompleks", "mekanisme perubahan sosial", "potensi transformatif"],
                        "sintesis": ["Integrasi dialektik", "Rekonsiliasi paradoks", "Konvergensi perspektif", "Hibridisasi konseptual"],
                        "elemen1": ["rasionalitas instrumental", "pengetahuan ilmiah", "efisiensi sistemik", "modernitas"],
                        "elemen2": ["kearifan tradisional", "intuisi kolektif", "nilai-nilai komunal", "lokalitas"],
                        "output_sintesis": ["hybrid epistemology", "wisdom-based innovation", "contextual universalism", "adaptive modernization"],
                        "kualitas_output": ["epistemologically robust", "culturally resonant", "practically viable", "ethically sustainable"],
                        "implikasi": ["Konsekuensi epistemologis", "Ramifikasi praktis", "Derivasi teoritis", "Implikasi normatif"],
                        "ranah_dampak": ["konstruksi kebijakan publik", "design sistem pendidikan", "reformasi institusional", "transformasi budaya"],
                        "respons_strategis": ["reorientasi paradigmatik", "rekonfigurasi struktural", "revitalisasi nilai", "reformasi sistemik"],
                        "karakteristik_respons": ["fundamentally transformative", "contextually grounded", "systemically coherent", "ethically committed"]
                    }
                }
            ]
        }
    }
    
    dataset = []
    
    # Generate data for each level
    for level in range(1, 6):
        level_config = templates[level]
        topics = level_config["topics"]
        level_templates = level_config["templates"]
        
        # Generate 50 questions per level (10 per topic)
        questions_per_topic = 50 // len(topics)
        
        for topic in topics:
            for i in range(questions_per_topic):
                # Select random template
                template = random.choice(level_templates)
                
                # Generate text and summary
                text = template["text"]
                summary_template = template["summary"]
                variables = template["variables"]
                
                # Replace variables with random choices
                chosen_vars = {}
                for var, options in variables.items():
                    chosen_vars[var] = random.choice(options)
                
                # Replace in text
                for var, value in chosen_vars.items():
                    text = text.replace(f"{{{var}}}", value)
                    summary_template = summary_template.replace(f"{{{var}}}", value)
                
                # Calculate text statistics
                word_count = len(text.split())
                sentence_count = text.count('.') + text.count('!') + text.count('?')
                
                # Generate wrong answers
                wrong_answers = generate_wrong_answers(summary_template, level)
                
                # Add to dataset
                dataset.append({
                    'id': f'L{level}_{topic}_{i+1:03d}',
                    'level': level,
                    'topic': topic,
                    'text': text,
                    'word_count': word_count,
                    'sentence_count': sentence_count,
                    'correct_summary': summary_template,
                    'wrong_answer_1': wrong_answers[0],
                    'wrong_answer_2': wrong_answers[1],
                    'wrong_answer_3': wrong_answers[2],
                    'difficulty_score': level * 2 + (word_count / 50),
                    'language': 'indonesian'
                })
    
    return dataset

def save_dataset(dataset, separate_files=False):
    """Save dataset to CSV files"""
    
    if separate_files:
        # Save separate files for each level
        df_all = pd.DataFrame(dataset)
        
        for level in range(1, 6):
            level_data = df_all[df_all['level'] == level]
            filename = f'indonesian_literacy_level_{level}.csv'
            level_data.to_csv(filename, index=False, encoding='utf-8')
            print(f"Level {level}: {len(level_data)} entries saved to {filename}")
        
        # Also save combined file
        df_all.to_csv('indonesian_literacy_complete.csv', index=False, encoding='utf-8')
        print(f"Complete dataset: {len(df_all)} entries saved to indonesian_literacy_complete.csv")
        
    else:
        # Save single combined file
        df = pd.DataFrame(dataset)
        df.to_csv('indonesian_literacy_dataset.csv', index=False, encoding='utf-8')
        print(f"Dataset saved: {len(df)} total entries")
        
        # Show distribution
        print("\nLevel distribution:")
        print(df['level'].value_counts().sort_index())
        
        print("\nTopic distribution:")
        print(df['topic'].value_counts())
        
        return df

if __name__ == "__main__":
    print("Generating Indonesian Literacy Dataset...")
    dataset = create_indonesian_literacy_dataset()
    
    print(f"\nGenerated {len(dataset)} total entries")
    
    choice = input("Save as separate files per level? (y/n): ").lower().strip()
    separate = choice in ['y', 'yes', '1', 'true']
    
    df = save_dataset(dataset, separate_files=separate)
    
    if not separate:
        print(f"\nSample entries:")
        for level in [1, 3, 5]:
            sample = df[df['level'] == level].iloc[0]
            print(f"\n--- Level {level} Sample ---")
            print(f"Topic: {sample['topic']}")
            print(f"Text: {sample['text'][:100]}...")
            print(f"Summary: {sample['correct_summary']}")
            print(f"Word count: {sample['word_count']}")
    
    print("\nDataset generation complete!")