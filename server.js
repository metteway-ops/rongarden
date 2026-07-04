require('dotenv').config();

console.log("Tjekker miljø-variabler:");
console.log("EMAIL_USER er:", process.env.EMAIL_USER);
console.log("EMAIL_PASS er:", process.env.EMAIL_PASS ? "Fundet (skjult)" : "IKKE FUNDET ❌");

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const app = express();

// --- KONFIGURATION ---
app.use(express.json()); 
app.use(express.static('public')); 

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// --- API RUTER ---
app.get('/api/products', async (req, res) => {
    try {
        const { category } = req.query;
        let query = supabase.from('products').select('*').order('name');
        
        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FRONTEND VIEWS ---

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RønGården | Økologisk Gårdbutik</title>
        <style>
            :root { 
                --primary: #1e3f20; 
                --accent: #bfa15f; 
                --text-dark: #2b3a2c; 
                --bg-light: #fbf9f4; 
                --white: #ffffff; 
            }
            
            * { box-sizing: border-box; scroll-behavior: smooth; }
            body { font-family: 'Georgia', serif; background-color: var(--bg-light); margin: 0; color: var(--text-dark); line-height: 1.6; padding-top: 80px; }
            h1, h2, h3 { font-family: 'Playfair Display', serif; font-weight: 400; margin: 0; }

            /* Fast Topmenu placeret øverst til højre */
            .navbar { position: fixed; top: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.98); padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 20px rgba(0,0,0,0.03); z-index: 1000; border-bottom: 1px solid rgba(0,0,0,0.05); }
            .nav-logo { font-size: 1.5em; font-weight: bold; color: var(--primary); text-decoration: none; letter-spacing: 2px; }
            .nav-links { display: flex; gap: 30px; }
            .nav-links a { color: var(--text-dark); text-decoration: none; font-size: 0.9em; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: sans-serif; transition: color 0.3s; cursor: pointer; }
            .nav-links a:hover { color: var(--accent); }

            /* Stor Eksklusiv Hero / Velkomst */
            .hero { height: 70vh; background: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.25)), url('https://unsplash.com') center/cover; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--white); text-align: center; padding: 20px; }
            .hero h1 { font-size: 4.5em; text-shadow: 2px 2px 15px rgba(0,0,0,0.4); margin-bottom: 15px; font-style: italic; }
            .hero p { font-size: 1.4em; max-width: 700px; text-shadow: 1px 1px 8px rgba(0,0,0,0.4); margin: 0; font-style: italic; opacity: 0.95; }

            /* Om Os Hovedsektion */
            .section { padding: 100px 20px; max-width: 1200px; margin: 0 auto; }
            .section-title { text-align: center; font-size: 3em; color: var(--primary); margin-bottom: 15px; font-style: italic; }
            .section-subtitle { text-align: center; font-style: italic; color: #6e6a61; margin-bottom: 70px; font-size: 1.15em; }

            .about-container { display: grid; grid-template-columns: 1fr 1fr; gap: 70px; align-items: center; }
            .about-text h3 { font-size: 2.2em; margin-bottom: 25px; color: var(--primary); font-style: italic; }
            .about-text p { font-size: 1.1em; color: #4a544b; margin-bottom: 25px; font-family: sans-serif; line-height: 1.7; }
            
            .about-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 50px; border-top: 1px solid #e6dfd3; padding-top: 35px; font-family: sans-serif; }
            .meta-box h4 { margin: 0 0 8px 0; color: var(--accent); text-transform: uppercase; font-size: 0.85em; letter-spacing: 1.5px; font-weight: bold; }
            .meta-box p { margin: 0; font-size: 1em; color: var(--text-dark); line-height: 1.5; }
            .about-image img { width: 100%; border-radius: 4px; box-shadow: 0 15px 40px rgba(0,0,0,0.06); border: 1px solid #e6dfd3; }

            /* Webshop Råvarer Sektion */
            .shop-section { background-color: var(--white); border-top: 1px solid #e8e4da; border-bottom: 1px solid #e8e4da; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 40px; margin-top: 20px; }
            
            .product-card { background: var(--bg-light); border: 1px solid #e8e4da; border-radius: 4px; padding: 35px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; min-height: 380px; transition: all 0.3s ease; }
            .product-card:hover { transform: translateY(-5px); box-shadow: 0 20px 45px rgba(30,63,32,0.08); border-color: var(--accent); }
            .product-card h3 { font-size: 1.8em; color: var(--primary); margin-bottom: 8px; font-style: italic; }
            
            .weight { font-family: sans-serif; font-size: 0.8em; color: #8a857a; text-transform: uppercase; letter-spacing: 1.5px; background: rgba(0,0,0,0.04); padding: 5px 14px; border-radius: 20px; display: inline-block; margin-bottom: 25px; font-weight: 600; }
            .price { font-size: 1.8em; color: var(--text-dark); margin: 25px 0; font-family: 'Playfair Display', serif; }
            
            .buy-btn { background: var(--primary); color: var(--white); border: none; padding: 16px; border-radius: 4px; cursor: pointer; font-family: sans-serif; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; width: 100%; transition: background 0.2s; font-size: 0.85em; }
            .buy-btn:hover { background: #132814; }

            /* Footer */
            .footer { background: var(--primary); color: rgba(255,255,255,0.65); text-align: center; padding: 50px 20px; font-family: sans-serif; font-size: 0.9em; border-top: 5px solid var(--accent); letter-spacing: 0.5px; }
            .footer a { color: var(--white); text-decoration: none; font-weight: bold; }
        </style>
    </head>
    <body>

        <!-- Top Menu Linje (Øverst til højre) -->
        <nav class="navbar">
            <a href="#" class="nav-logo">RØNGÅRDEN</a>
            <div class="nav-links">
                <a href="#om-os">Om Os</a>
                <a href="#raavarer" onclick="loadProducts('koed')">Kød</a>
                <a href="#raavarer" onclick="loadProducts('aeg')">Æg</a>
                <a href="#raavarer" onclick="loadProducts('frugt_groent')">Frugt & Grønt</a>
            </div>
        </nav>

        <!-- Velkomst / Hero Banner -->
        <header class="hero">
            <h1>Velkommen til RønGården</h1>
            <p>Friske råvarer og kompromisløs kvalitet direkte fra vores eget landbrug</p>
        </header>

        <!-- "Om Os" Forside Sektion -->
        <section class="section" id="om-os">
            <h2 class="section-title">Vores Historie</h2>
            <p class="section-subtitle">Passion for jorden, respekten for dyrene og kærligheden til de rene smagsoplevelser</p>
            
            <div class="about-container">
                <div class="about-text">
                    <h3>Smagen af det ægte landliv</h3>
                    <p>På RønGården drives jorden og gårdbutikken ud fra en simpel filosofi: Kvalitet kræver tid, omsorg og respekt. Vores dyr lever et naturligt liv under åben himmel på friske græsmarker, og vores afgrøder høstes nænsomt, når smagen er helt i top.</p>
                    <p>Vi har indrettet vores gårdbutik, så du let kan bestille dine varer online på forhånd. På den måde sikrer du dig altid de bedste udskæringer, frisklagte æg og sæsonens fineste grønt, klar til afhentning på gården.</p>
                    
                    <div class="about-meta">
                        <div class="meta-box">
                            <h4>Åbningstider & Afhentning</h4>
                            <p>Torsdage kl. 14:00 - 18:00<br>Lørdage kl. 09:00 - 13:00</p>
                        </div>
                        <div class="meta-box">
                            <h4>Find Gårdbutikken</h4>
                            <p>RønGården Gårdbutik<br>Vores Gade 12, 1234 Gårdby</p>
                        </div>
                    </div>
                </div>
                <div class="about-image">
                    <img src="https://unsplash.com" alt="Det autentiske gårdliv på RønGården">
                </div>
            </div>
        </section>

        <!-- Webshop Råvarer Sektion -->
        <section class="section shop-section" id="raavarer">
            <h2 class="section-title" id="shop-title">Vores Gårdråvarer</h2>
            <p class="section-subtitle" id="shop-subtitle">Vælg en kategori i menuen øverst til højre for at se udvalget</p>
            
            <div class="grid" id="product-container">
                <!-- Råvarer hentes automatisk herind via API -->
            </div>
        </section>

        <!-- Elegant Landlig Footer -->
        <footer class="footer">
            <p>&copy; 2026 RønGården Gårdbutik. Alle rettigheder forbeholdes.</p>
