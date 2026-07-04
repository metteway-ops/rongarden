require('dotenv').config();

console.log("Tjekker miljø-variabler:");
console.log("EMAIL_USER er:", process.env.EMAIL_USER);
console.log("EMAIL_PASS er:", process.env.EMAIL_PASS ? "Fundet (skjult)" : "IKKE FUNDET ❌");

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const app = express();

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

// --- FRONTEND DESIGN (OM OS + NAVIGATION) ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RønGården | Økologisk Gårdbutik</title>
        <style>
            :root { --primary: #1e3f20; --accent: #bfa15f; --text-dark: #2b3a2c; --bg-light: #fbf9f4; --white: #ffffff; }
            * { box-sizing: border-box; scroll-behavior: smooth; }
            body { font-family: 'Georgia', serif; background-color: var(--bg-light); margin: 0; color: var(--text-dark); line-height: 1.6; padding-top: 80px; }
            .navbar { position: fixed; top: 0; left: 0; right: 0; background: rgba(255, 255, 255, 0.98); padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 20px rgba(0,0,0,0.03); z-index: 1000; border-bottom: 1px solid rgba(0,0,0,0.05); }
            .nav-logo { font-size: 1.5em; font-weight: bold; color: var(--primary); text-decoration: none; letter-spacing: 2px; }
            .nav-links { display: flex; gap: 30px; }
            .nav-links a { color: var(--text-dark); text-decoration: none; font-size: 0.9em; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-family: sans-serif; transition: color 0.3s; cursor: pointer; }
            .nav-links a:hover { color: var(--accent); }
            .hero { height: 60vh; background: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.25)), url('https://unsplash.com') center/cover; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--white); text-align: center; padding: 20px; }
            .hero h1 { font-size: 4em; text-shadow: 2px 2px 15px rgba(0,0,0,0.4); margin-bottom: 15px; font-style: italic; }
            .hero p { font-size: 1.3em; max-width: 700px; text-shadow: 1px 1px 8px rgba(0,0,0,0.4); margin: 0; font-style: italic; }
            .section { padding: 80px 20px; max-width: 1200px; margin: 0 auto; }
            .section-title { text-align: center; font-size: 2.8em; color: var(--primary); margin-bottom: 15px; font-style: italic; }
            .section-subtitle { text-align: center; font-style: italic; color: #6e6a61; margin-bottom: 60px; font-size: 1.1em; }
            .about-container { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
            .about-text h3 { font-size: 2em; color: var(--primary); font-style: italic; margin-bottom: 20px; }
            .about-text p { font-size: 1.1em; color: #4a544b; margin-bottom: 25px; font-family: sans-serif; }
            .about-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; border-top: 1px solid #e6dfd3; padding-top: 30px; font-family: sans-serif; }
            .meta-box h4 { margin: 0 0 5px 0; color: var(--accent); text-transform: uppercase; font-size: 0.85em; letter-spacing: 1px; }
            .about-image img { width: 100%; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            .shop-section { background-color: var(--white); border-top: 1px solid #e8e4da; border-bottom: 1px solid #e8e4da; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; margin-top: 20px; }
            .product-card { background: var(--bg-light); border: 1px solid #e8e4da; border-radius: 4px; padding: 30px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; min-height: 350px; }
            .product-card h3 { font-size: 1.6em; color: var(--primary); font-style: italic; margin-bottom: 5px; }
            .weight { font-family: sans-serif; font-size: 0.8em; color: #8a857a; background: rgba(0,0,0,0.04); padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
            .price { font-size: 1.6em; color: var(--text-dark); margin: 20px 0; font-family: 'Playfair Display', serif; }
            .buy-btn { background: var(--primary); color: var(--white); border: none; padding: 14px; border-radius: 4px; cursor: pointer; font-family: sans-serif; font-weight: bold; text-transform: uppercase; width: 100%; }
            .footer { background: var(--primary); color: rgba(255,255,255,0.65); text-align: center; padding: 40px 20px; font-family: sans-serif; font-size: 0.9em; border-top: 5px solid var(--accent); }
        </style>
    </head>
    <body>
        <nav class="navbar">
            <a href="#" class="nav-logo">RØNGÅRDEN</a>
            <div class="nav-links">
                <a href="#om-os">Om Os</a>
                <a href="#raavarer" onclick="loadProducts('koed')">Kød</a>
                <a href="#raavarer" onclick="loadProducts('aeg')">Æg</a>
                <a href="#raavarer" onclick="loadProducts('frugt_groent')">Frugt & Grønt</a>
            </div>
        </nav>

        <header class="hero">
            <h1>Velkommen til RønGården</h1>
            <p>Friske råvarer direkte fra vores eget landbrug til din gårdbutik</p>
        </header>

        <section class="section" id="om-os">
            <h2 class="section-title">Vores Historie</h2>
            <p class="section-subtitle">Passion for jorden og kærligheden til de rene smagsoplevelser</p>
            <div class="about-container">
                <div class="about-text">
                    <h3>Smagen af det ægte landliv</h3>
                    <p>På RønGården drives jorden og gårdbutikken ud fra a simpel filosofi: Kvalitet kræver tid, omsorg og respekt. Vores dyr lever et naturligt liv under åben himmel på friske græsmarker, og vores afgrøder høstes nænsomt, når smagen er helt i top.</p>
                    <p>Vi har indrettet vores gårdbutik, så du let kan bestille dine varer online på forhånd. På den måde sikrer du dig altid de bedste udskæringer og frisklagte æg, klar til afhentning på gården.</p>
                    <div class="about-meta">
                        <div class="meta-box">
                            <h4>Åbningstider</h4>
                            <p>Torsdage kl. 14:00 - 18:00<br>Lørdage kl. 09:00 - 13:00</p>
                        </div>
                        <div class="meta-box">
                            <h4>Find Os</h4>
                            <p>RønGården Gårdbutik<br>Vores Gade 12, 1234 Gårdby</p>
                        </div>
                    </div>
                </div>
                <div class="about-image">
                    <img src="https://unsplash.com" alt="Gårdliv">
                </div>
            </div>
        </section>

        <section class="section shop-section" id="raavarer">
            <h2 class="section-title" id="shop-title">Vores Gårdråvarer</h2>
            <p class="section-subtitle" id="shop-subtitle">Vælg en kategori i menuen øverst til højre for at se udvalget</p>
            <div class="grid" id="product-container"></div>
        </section>

        <footer class="footer">
            <p>&copy; 2026 RønGården Gårdbutik. Alle rettigheder forbeholdes.</p>
        </footer>

        <script>
            async function loadProducts(category) {
                const shopSection = document.getElementById('raavarer');
                if(category) { shopSection.scrollIntoView({ behavior: 'smooth' }); }
                try {
                    const url = category ? '/api/products?category=' + category : '/api/products';
                    const response = await fetch(url);
                    const products = await response.json();
                    const container = document.getElementById('product-container');
                    container.innerHTML = '';
                    
                    if(products.length === 0) {
                        container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:40px; font-style:italic;">🌿 Udsolgt i denne kategori lige nu.</div>';
                        return;
                    }
                    products.forEach(p => {
                        const unit = p.category === 'aeg' ? 'kr/bakke' : 'kr.';
                        const card = document.createElement('div');
                        card.className = 'product-card';
                        
                        card.innerHTML = '<div><h3>' + p.name + '</h3><span class="weight">Vægt: ~' + (p.estimated_weight || 0) + ' kg</span></div><div><p class="price">' + p.price + ' ' + unit + '</p><button class="buy-btn">Reserver</button></div>';
                        container.appendChild(card);
                    });
                } catch (err) { console.error(err); }
            }
