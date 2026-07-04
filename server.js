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

// --- FRONTEND DESIGN (VINTAGE LANDSTIL) ---
app.get('/', (req, res) => {
    res.send('<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RønGården | Gårdbutik & Råvarer</title><style>:root { --vintage-green: #29402e; --sage-green: #485c4d; --gold: #aa8e50; --cream-bg: #f8f5ee; --paper-white: #fdfcf7; --text-dark: #232b24; } * { box-sizing: border-box; scroll-behavior: smooth; } body { font-family: "Georgia", "Times New Roman", serif; background-color: var(--cream-bg); margin: 0; color: var(--text-dark); line-height: 1.7; padding-top: 90px; } h1, h2, h3, h4 { font-weight: normal; margin: 0; color: var(--vintage-green); letter-spacing: 0.5px; } .navbar { position: fixed; top: 0; left: 0; right: 0; background-color: var(--paper-white); padding: 20px 50px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 15px rgba(41,64,46,0.06); z-index: 1000; border-bottom: 3px double var(--gold); } .nav-logo { font-size: 1.6em; font-weight: normal; color: var(--vintage-green); text-decoration: none; letter-spacing: 3px; font-style: italic; } .nav-links { display: flex; gap: 35px; } .nav-links a { color: var(--text-dark); text-decoration: none; font-size: 0.85em; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; font-family: "Courier New", Courier, monospace; transition: color 0.3s; cursor: pointer; } .nav-links a:hover { color: var(--gold); } .hero { height: 55vh; background: linear-gradient(rgba(41,64,46, 0.5), rgba(41,64,46, 0.4)), url("https://unsplash.com") center/cover; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--paper-white); text-align: center; padding: 20px; border-bottom: 4px solid var(--vintage-green); } .hero h1 { font-size: 4.5em; text-shadow: 2px 2px 10px rgba(0,0,0,0.3); margin-bottom: 15px; color: var(--paper-white); font-style: italic; } .hero p { font-size: 1.4em; max-width: 700px; text-shadow: 1px 1px 5px rgba(0,0,0,0.3); margin: 0; font-style: italic; opacity: 0.95; } .section { padding: 90px 20px; max-width: 1100px; margin: 0 auto; } .section-title { text-align: center; font-size: 3em; color: var(--vintage-green); margin-bottom: 10px; font-style: italic; position: relative; } .section-title::after { content: "❦"; display: block; font-size: 0.4em; color: var(--gold); margin-top: 5px; } .section-subtitle { text-align: center; font-style: italic; color: #666; margin-bottom: 60px; font-size: 1.1em; } .about-container { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; } .about-text h3 { font-size: 2.2em; color: var(--vintage-green); font-style: italic; margin-bottom: 25px; border-bottom: 1px dashed var(--gold); padding-bottom: 10px; } .about-text p { font-size: 1.1em; color: #333; margin-bottom: 25px; text-align: justify; } .about-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; border-top: 1px solid #dcd5c5; padding-top: 30px; } .meta-box h4 { margin: 0 0 8px 0; color: var(--gold); text-transform: uppercase; font-size: 0.85em; letter-spacing: 1.5px; font-family: "Courier New", Courier, monospace; font-weight: bold; } .meta-box p { margin: 0; font-size: 1.05em; font-style: italic; color: var(--text-dark); } .about-image img { width: 100%; border-radius: 2px; box-shadow: 0 8px 25px rgba(0,0,0,0.05); border: 6px solid var(--paper-white); outline: 1px solid #dcd5c5; } .shop-section { background-color: var(--paper-white); border-top: 1px solid #dcd5c5; border-bottom: 1px solid #dcd5c5; } .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; margin-top: 20px; } .product-card { background: var(--cream-bg); border: 1px solid #dcd5c5; border-radius: 2px; padding: 35px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; min-height: 360px; outline: 4px solid var(--paper-white); transition: all 0.3s ease; } .product-card:hover { transform: translateY(-3px); border-color: var(--gold); box-shadow: 0 10px 25px rgba(41,64,46,0.08); } .product-card h3 { font-size: 1.8em; color: var(--vintage-green); font-style: italic; margin-bottom: 8px; } .weight { font-family: "Courier New", Courier, monospace; font-size: 0.8em; color: #666; text-transform: uppercase; letter-spacing: 1px; background: rgba(0,0,0,0.03); padding: 4px 12px; display: inline-block; margin-bottom: 25px; border: 1px solid rgba(0,0,0,0.05); } .price { font-size: 1.8em; color: var(--vintage-green); margin: 20px 0; font-style: italic; font-weight: bold; } .buy-btn { background: var(--vintage-green); color: var(--paper-white); border: none; padding: 15px; border-radius: 0; cursor: pointer; font-family: "Courier New", Courier, monospace; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; width: 100%; transition: background 0.2s; border: 1px solid var(--vintage-green); } .buy-btn:hover { background: var(--sage-green); border-color: var(--sage-green); } .footer { background: var(--vintage-green); color: rgba(255,255,255,0.5); text-align: center; padding: 50px 20px; font-size: 0.9em; border-top: 4px solid var(--gold); letter-spacing: 1px; font-family: "Courier New", Courier, monospace; }</style></head><body><nav class="navbar"><a href="#" class="nav-logo">RønGården</a><div class="nav-links"><a href="#om-os">Om Os</a><a href="#raavarer" onclick="loadProducts(\'koed\')">Kød</a><a href="#raavarer" onclick="loadProducts(\'aeg\')">Æg</a><a href="#raavarer" onclick="loadProducts(\'frugt_groent\')">Frugt & Grønt</a></div></nav><header class="hero"><h1>RønGården</h1><p>Landlige råvarer & kompromisløs kvalitet fra eget landbrug</p></header><section class="section" id="om-os"><h2 class="section-title">Vores Historie</h2><p class="section-subtitle">Om passionen for jorden og respekten for de rene, gamle smagstraditioner</p><div class="about-container"><div class="about-text"><h3>Smagen af det ægte landliv</h3><p>Her på RønGården drives jorden og gårdbutikken ud fra stolte, traditionelle principper. Vi tror på, at ægte kvalitet kræver tid, omsorg og stor respekt for naturen. Vores dyr lever et sundt og frit liv på friske græsmarker under åben himmel, og vores afgrøder høstes nænsomt i hånden, når smagen er helt i top.</p><p>Vi har indrettet vores lille gårdbutik som en moderne tidslomme, hvor du let kan reservere dine råvarer online på forhånd. På den måde sikrer du dig altid ugentlige frisklagte æg, sæsonens sprødeste grønt og de fineste udskæringer.</p><div class="about-meta"><div class="meta-box"><h4>Gårdbutikkens timer</h4><p>Torsdage kl. 14:00 - 18:00<br>Lørdage kl. 09:00 - 13:00</p></div><div class="meta-box"><h4>Her findes vi</h4><p>RønGården Gårdbutik<br>Vores Gade 12, 1234 Gårdby</p></div></div></div><div class="about-image"><img src="https://unsplash.com" alt="Det autentiske gårdliv"></div></div></section><section class="section shop-section" id="raavarer"><h2 class="section-title" id="shop-title">Gårdens Råvarer</h2><p class="section-subtitle" id="shop-subtitle">Vælg en kategori i menuen øverst til højre for at se udvalget</p><div class="grid" id="product-container"></div></section><footer class="footer"><p>&copy; 2026 RønGården Gårdbutik. Alle rettigheder forbeholdes.</p></footer><script>async function loadProducts(category){const shopSection=document.getElementById("raavarer");if(category){shopSection.scrollIntoView({behavior:"smooth"});}try{const url=category?"/api/products?category="+category:"/api/products";const response=await fetch(url);const products=await response.json();const container=document.getElementById("product-container");container.innerHTML="";if(products.length===0){container.innerHTML=\'<div style="text-align:center; grid-column:1/-1; padding:50px; font-style:italic; color:#777;">🌿 Alt udsolgt i denne kategori i dag. Vi opdaterer udvalget så snart vi høster eller pakker friske varer igen.</div>\';return;}products.forEach(p=>{const unit=p.category==="aeg"?"kr/bakke":"kr.";const card=document.createElement("div");card.className="product-card";card.innerHTML="<div><h3>"+p.name+"</h3><span class=\"weight\">Enhed: ~"+(p.estimated_weight||0)+" kg</span></div><div><p class=\"price\">"+p.price+" "+unit+"</p><button class=\"buy-btn\">Reserver råvare</button></div>";container.appendChild(card);});}catch(err){console.error(err);}}window.onload=()=>loadProducts("");</script></body></html>');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("RønGården online på port " + PORT);
});
