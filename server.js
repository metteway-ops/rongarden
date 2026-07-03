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

// --- FRONTEND VIEWS (Premium Gårdbutik Design) ---

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RønGården | Økologisk Gårdbutik & Råvarer</title>
        <style>
            :root { 
                --primary: #1e3f20; 
                --accent: #bfa15f; 
                --text-dark: #2b3a2c; 
                --bg-light: #fbf9f4; 
                --white: #ffffff; 
            }
            
            * { box-sizing: border-box; scroll-behavior: smooth; }
            body { font-family: 'Georgia', serif; background-color: var(--bg-light); margin: 0; color: var(--text-dark); line-height: 1.6; }
            h1, h2, h3 { font-family: 'Playfair Display', serif; font-weight: 400; margin: 0; }

            /* Elegant Menu / Navigation */
            .navbar { position: fixed; top: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.96); padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 20px rgba(0,0,0,0.03); z-index: 1000; border-bottom: 1px solid rgba(0,0,0,0.05); }
            .nav-logo { font-size: 1.5em; font-weight: bold; color: var(--primary); text-decoration: none; letter-spacing: 1px; }
            .nav-links { display: flex; gap: 30px; }
            .nav-links a { color: var(--text-dark); text-decoration: none; font-size: 0.95em; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: sans-serif; transition: color 0.3s; }
            .nav-links a:hover { color: var(--accent); }

            /* Hero / Forside Cover */
            .hero { position: relative; height: 90vh; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2)), url('https://unsplash.com') center/cover; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--white); text-align: center; padding: 20px; }
            .hero h1 { font-size: 4em; text-shadow: 2px 2px 10px rgba(0,0,0,0.3); margin-bottom: 10px; }
            .hero p { font-size: 1.5em; font-style: italic; max-width: 600px; text-shadow: 1px 1px 5px rgba(0,0,0,0.3); margin: 0; }
            .hero-btn { margin-top: 30px; background: var(--accent); color: var(--white); border: none; padding: 15px 35px; border-radius: 4px; font-size: 1em; cursor: pointer; text-transform: uppercase; font-family: sans-serif; font-weight: bold; letter-spacing: 1px; transition: background 0.3s; text-decoration: none; }
            .hero-btn:hover { background: #aa8e50; }

            /* Sektioner generelt */
            .section { padding: 90px 20px; max-width: 1200px; margin: 0 auto; }
            .section-title { text-align: center; font-size: 2.6em; color: var(--primary); margin-bottom: 15px; }
            .section-subtitle { text-align: center; font-style: italic; color: #777; margin-bottom: 60px; font-size: 1.1em; }

            /* Om Os Sektion */
            .about-container { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
            .about-text h3 { font-size: 1.8em; margin-bottom: 20px; color: var(--primary); }
            .about-text p { font-size: 1.1em; color: #555; margin-bottom: 20px; font-family: sans-serif; }
            .about-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; border-top: 1px solid #e0dbd1; padding-top: 30px; font-family: sans-serif; }
            .meta-box h4 { margin: 0 0 5px 0; color: var(--accent); text-transform: uppercase; font-size: 0.85em; letter-spacing: 1px; }
            .meta-box p { margin: 0; font-size: 1em; color: var(--text-dark); }
            .about-image img { width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }

            /* Webshop Råvarer Sektion */
            .shop-section { background-color: var(--white); border-top: 1px solid #e8e4da; border-bottom: 1px solid #e8e4da; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 40px; margin-top: 20px; }
            .product-card { background: var(--bg-light); border: 1px solid #e8e4da; border-radius: 4px; padding: 30px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; min-height: 380px; transition: transform 0.3s, box-shadow 0.3s; }
            .product-card:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(30,63,32,0.06); }
            .product-card h3 { font-size: 1.6em; color: var(--primary); margin-bottom: 5px; }
            .weight { font-family: sans-serif; font-size: 0.85em; color: #8a857a; text-transform: uppercase; letter-spacing: 1px; background: rgba(0,0,0,0.03); padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
            .price { font-size: 1.6em; font-weight: normal; color: var(--text-dark); margin: 20px 0; }
            .buy-btn { background: var(--primary); color: var(--white); border: none; padding: 14px; border-radius: 4px; cursor: pointer; font-family: sans-serif; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; width: 100%; transition: background 0.2s; }
            .buy-btn:hover { background: #132814; }

            /* Footer */
            .footer { background: var(--primary); color: rgba(255,255,255,0.7); text-align: center; padding: 40px 20px; font-family: sans-serif; font-size: 0.9em; border-top: 4px solid var(--accent); }
            .footer a { color: var(--white); text-decoration: none; }
        </style>
    </head>
    <body>

        <!-- Top Menu Linje -->
        <nav class="navbar">
            <a href="#" class="nav-logo">RØNGÅRDEN</a>
            <div class="nav-links">
                <a href="#om-os">Om Os</a>
                <a href="#koed" onclick="loadProducts('koed')">Kød</a>
                <a href="#aeg" onclick="loadProducts('aeg')">Æg</a>
                <a href="#frugt-groent" onclick="loadProducts('frugt_groent')">Frugt & Grønt</a>
            </div>
        </nav>

        <!-- Velkomst / Hero Banner -->
        <header class="hero">
            <h1>RønGården</h1>
            <p>Bæredygtigt landbrug og friske råvarer direkte fra gårdbutikken</p>
            <a href="#om-os" class="hero-btn">Læs vores historie</a>
        </header>

        <!-- "Om Os" Sektion -->
        <section class="section" id="om-os">
            <h2 class="section-title">Om RønGården</h2>
            <p class="section-subtitle">Historien om vores passion for jorden, dyrene og de rene smagsoplevelser</p>
            
            <div class="about-container">
                <div class="about-text">
                    <h3>Velkommen til vores gårdbutik</h3>
                    <p>På RønGården tror vi på, at de bedste råvarer skabes i pagt med naturen. Vores dyr lever et frit liv under åben himmel, og vores grøntsager dyrkes uden brug af unødvendig kemi. Det kan smages på kvaliteten.</p>
                    <p>Vi har indrettet vores gårdbutik, så du kan hente dine varer helt friske, præcis når det passer dig. Ved at bestille online her på siden sikrer du dig de fineste udskæringer og frisklagte æg før alle andre.</p>
                    
                    <div class="about-meta">
                        <div class="meta-box">
                            <h4>Afhentning</h4>
                            <p>Torsdage 14:00 - 18:00<br>Lørdage 09:00 - 13:00</p>
                        </div>
                        <div class="meta-box">
                            <h4>Lokation</h4>
                            <p>Gårdbutikken på RønGården<br>Vores Gade 12, Danmark</p>
                        </div>
                    </div>
                </div>
                <div class="about-image">
                    <img src="https://unsplash.com" alt="Gårdliv på RønGården">
                </div>
            </div>
        </section>

        <!-- Webshop Råvarer Sektion -->
        <section class="section shop-section" id="raavarer">
            <h2 class="section-title" id="shop-title">Vores Aktuelle Råvarer</h2>
            <p class="section-subtitle" id="shop-subtitle">Vælg en kategori i menuen øverst for at filtrere udvalget</p>
            
            <div class="grid" id="product-container">
                <!-- Råvarer hentes automatisk herind via API -->
            </div>
        </section>

        <!-- Elegant Landlig Footer -->
        <footer class="footer">
            <p>&copy; 2026 RønGården Gårdbutik. Alle rettigheder forbeholdes.</p>
