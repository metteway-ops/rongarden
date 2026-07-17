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

// --- FÆLLES VINTAGE DESIGN SKABELON (MED PRODUKTBILLEDER) ---
function getVintageLayout(title, subtitle, categoryKey) {
    // Vælg et unikt, flot herobillede baseret på kategorien
    let heroImg = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1600&q=80"; // Standard
    if (categoryKey === 'koed') heroImg = "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=1600&q=80";
    if (categoryKey === 'aeg') heroImg = "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=1600&q=80";
    if (categoryKey === 'frugt_groent') heroImg = "https://images.unsplash.com/photo-1566385208903-f3c2e645a54e?auto=format&fit=crop&w=1600&q=80";

    return `<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RønGården | ${title}</title>
    <style>
        :root { 
            --vintage-green: #29402e; 
            --sage-green: #485c4d; 
            --gold: #aa8e50; 
            --cream-bg: #fdfaf2; 
            --paper-white: #ffffff; 
            --text-dark: #2c352d; 
        } 
        * { box-sizing: border-box; } 
        body { 
            font-family: "Georgia", "Times New Roman", serif; 
            background-color: var(--cream-bg); 
            margin: 0; color: var(--text-dark); 
            line-height: 1.7; padding-top: 80px; 
        } 
        h1, h2, h3 { font-weight: normal; margin: 0; color: var(--vintage-green); font-style: italic; } 
        
        .navbar { 
            position: fixed; top: 0; left: 0; right: 0; 
            background-color: var(--paper-white); padding: 15px 50px; 
            display: flex; justify-content: space-between; align-items: center; 
            box-shadow: 0 4px 20px rgba(41,64,46,0.05); z-index: 1000; 
            border-bottom: 3px double var(--gold); 
        } 
        .nav-logo { font-size: 1.8em; color: var(--vintage-green); text-decoration: none; letter-spacing: 2px; font-style: italic; font-weight: bold; } 
        .nav-links { display: flex; gap: 35px; } 
        .nav-links a { 
            color: var(--text-dark); text-decoration: none; font-size: 0.85em; font-weight: bold; 
            text-transform: uppercase; letter-spacing: 1.5px; font-family: "Courier New", Courier, monospace; 
        } 
        .nav-links a:hover, .nav-links a.active { color: var(--gold); } 
        
        .hero { 
            height: 40vh; 
            background: linear-gradient(rgba(41,64,46, 0.55), rgba(41,64,46, 0.55)), url("${heroImg}") center/cover no-repeat; 
            display: flex; flex-direction: column; justify-content: center; align-items: center; 
            color: var(--paper-white); text-align: center; padding: 20px; 
            border-bottom: 4px solid var(--vintage-green); 
        } 
        .hero h1 { font-size: 3.8em; color: var(--paper-white); text-shadow: 2px 2px 10px rgba(0,0,0,0.3); } 
        .hero p { font-size: 1.2em; opacity: 0.9; margin-top: 10px; font-style: italic; } 
        
        .section { padding: 60px 20px; max-width: 1100px; margin: 0 auto; } 
        
        /* Flottere Produktkort Grid */
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
            gap: 40px; margin-top: 40px; 
        } 
        .product-card { 
            background: var(--paper-white); 
            border: 1px solid #e3dac9; 
            padding: 25px; text-align: center; 
            display: flex; flex-direction: column; justify-content: space-between; 
            min-height: 460px; 
            box-shadow: 0 5px 15px rgba(0,0,0,0.02);
            transition: transform 0.2s, box-shadow 0.2s;
        } 
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(41,64,46,0.08);
        }
        .product-img { 
            width: 100%; height: 200px; object-fit: cover; 
            border: 1px solid #e3dac9; margin-bottom: 15px; 
        } 
        .product-card h3 { font-size: 1.5em; margin-bottom: 8px; }
        .weight { 
            font-family: "Courier New", Courier, monospace; font-size: 0.8em; 
            color: #666; background: #fdfaf2; padding: 4px 12px; 
            display: inline-block; margin-bottom: 15px; border: 1px solid #e3dac9; 
        } 
        .price { font-size: 1.8em; color: var(--vintage-green); margin: 15px 0; font-weight: bold; } 
        
        .buy-btn { 
            background: var(--vintage-green); color: var(--paper-white); 
            border: none; padding: 15px; cursor: pointer; 
            font-family: "Courier New", Courier, monospace; font-weight: bold; 
            text-transform: uppercase; letter-spacing: 1.5px; width: 100%; 
            transition: background 0.2s; 
            border: 1px solid var(--vintage-green);
        } 
        .buy-btn:hover { background: var(--sage-green); } 
        
        .footer { 
            background: var(--vintage-green); color: rgba(255,255,255,0.5); 
            text-align: center; padding: 40px 20px; font-size: 0.9em; 
            border-top: 4px solid var(--gold); font-family: "Courier New", Courier, monospace; 
            margin-top: 60px; 
        }

.product-description { 
    font-size: 0.9em; 
    color: #555; 
    margin: 10px 0; 
    font-style: italic; 
}
.preparation-info { 
    font-size: 0.85em; 
    color: var(--vintage-green); 
    background: #fdfaf2; 
    padding: 8px; 
    border: 1px dashed var(--gold); 
    margin: 10px 0; 
}

    </style>
</head>
<body>
    <nav class="navbar">
        <a href="/" class="nav-logo">RønGården</a>
        <div class="nav-links">
            <a href="/">Om Os</a>
            <a href="/koed" class="${categoryKey === 'koed' ? 'active' : ''}">Kød</a>
            <a href="/aeg" class="${categoryKey === 'aeg' ? 'active' : ''}">Æg</a>
            <a href="/frugt-og-groent" class="${categoryKey === 'frugt_groent' ? 'active' : ''}">Frugt & Grønt</a>
        </div>
    </nav>
    <header class="hero">
        <h1>${title}</h1>
        <p>${subtitle}</p>
    </header>
    <main class="section">
        <div class="grid" id="product-container"></div>
    </main>
    <footer class="footer">
        <p>&copy; 2026 RønGården Gårdbutik.</p>
    </footer>

<script>
    async function loadProducts(){
        try {
            const response = await fetch("/api/products?category=${categoryKey}");
            const products = await response.json();
            const container = document.getElementById("product-container");
            container.innerHTML = "";
            
            if(products.length === 0){
                container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:50px; font-style:italic; color:#777;">🌿 Alt udsolgt i denne kategori i dag. Vi pakker snart friske varer igen!</div>';
                return;
            }
            
            products.forEach(p => {
    const unit = p.category === "aeg" ? "kr/bakke" : "kr/kg";
    const enhedTekst = p.category === "aeg" ? "12 stk" : "~" + (p.estimated_weight || 0) + " kg";
    
    let fallbackImg = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80";
    if(p.category === 'koed') fallbackImg = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80";
    if(p.category === 'aeg') fallbackImg = "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=500&q=80";
    
    const imgSrc = p.image_url || fallbackImg;
    
    // Håndtering af felter hvis de er tomme i databasen
    const descHtml = p.description ? `<p class='product-description'>${p.description}</p>` : "";
    const prepHtml = p.preparation_info ? `<div class='preparation-info'><strong>Tilberedning:</strong><br>${p.preparation_info}</div>` : "";

    const card = document.createElement("div");
    card.className = "product-card";
    
    // Opdateret HTML struktur med de nye felter
    card.innerHTML = `
        <div>
            <img class='product-img' src='${imgSrc}' alt='${p.name}'>
            <h3>${p.name}</h3>
            <span class='weight'>Enhed: ${enhedTekst}</span>
            ${descHtml}${prepHtml}
        </div>
        <div>
            <p class='price'>${p.price}${unit}</p>
            <button class='buy-btn'>Reserver råvare</button>
        </div>`;
    
    container.appendChild(card);
});
        } catch(err) {
            console.error(err);
        }
    }
    window.onload = loadProducts;
</script>
</body>
</html>`;
}







// --- VISNINGER / PAGES ---

// 1. Forside (Om Os)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RønGården | Gårdbutik</title>
    <style>
        :root { 
            --vintage-green: #29402e; 
            --sage-green: #485c4d; 
            --gold: #aa8e50; 
            --cream-bg: #fdfaf2; 
            --paper-white: #ffffff; 
            --text-dark: #2c352d; 
        } 
        * { box-sizing: border-box; } 
        body { 
            font-family: "Georgia", "Times New Roman", serif; 
            background-color: var(--cream-bg); 
            margin: 0; 
            color: var(--text-dark); 
            line-height: 1.8; 
            padding-top: 80px; 
        } 
        h1, h2, h3, h4 { font-weight: normal; margin: 0; color: var(--vintage-green); } 
        
        /* Smuk vintage navigation */
        .navbar { 
            position: fixed; top: 0; left: 0; right: 0; 
            background-color: var(--paper-white); 
            padding: 15px 50px; 
            display: flex; justify-content: space-between; align-items: center; 
            box-shadow: 0 4px 20px rgba(41,64,46,0.05); 
            z-index: 1000; 
            border-bottom: 3px double var(--gold); 
        } 
        .nav-logo { font-size: 1.8em; color: var(--vintage-green); text-decoration: none; letter-spacing: 2px; font-style: italic; font-weight: bold; } 
        .nav-links { display: flex; gap: 35px; } 
        .nav-links a { 
            color: var(--text-dark); text-decoration: none; font-size: 0.85em; font-weight: bold; 
            text-transform: uppercase; letter-spacing: 1.5px; font-family: "Courier New", Courier, monospace; 
            transition: color 0.2s;
        } 
        .nav-links a:hover, .nav-links a.active { color: var(--gold); } 
        
        /* Hero-sektion med stemningsbillede */
        .hero { 
            height: 60vh; 
            background: linear-gradient(rgba(41,64,46, 0.45), rgba(41,64,46, 0.45)), 
                        url("https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1600&q=80") center/cover no-repeat; 
            display: flex; flex-direction: column; justify-content: center; align-items: center; 
            color: var(--paper-white); text-align: center; padding: 20px; 
            border-bottom: 4px solid var(--vintage-green); 
        } 
        .hero h1 { font-size: 5em; color: var(--paper-white); font-style: italic; text-shadow: 2px 2px 15px rgba(0,0,0,0.4); margin-bottom: 10px; } 
        .hero p { font-size: 1.4em; font-style: italic; opacity: 0.95; max-width: 600px; text-shadow: 1px 1px 5px rgba(0,0,0,0.4); } 
        
        /* Indhold */
        .section { padding: 80px 20px; max-width: 1100px; margin: 0 auto; } 
        .section-title { text-align: center; font-size: 3em; color: var(--vintage-green); margin-bottom: 5px; font-style: italic; } 
        .section-title::after { content: "❦"; display: block; font-size: 0.4em; color: var(--gold); margin-top: 5px; } 
        .section-subtitle { text-align: center; font-style: italic; color: #555; margin-bottom: 60px; font-size: 1.1em; } 
        
        .about-container { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 60px; align-items: center; } 
        .about-text h3 { font-size: 2.2em; font-style: italic; margin-bottom: 25px; border-bottom: 1px dashed var(--gold); padding-bottom: 10px; } 
        .about-text p { font-size: 1.1em; color: #3a423b; margin-bottom: 25px; text-align: justify; } 
        
        .about-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; border-top: 1px solid #e3dac9; padding-top: 30px; } 
        .meta-box h4 { margin: 0 0 8px 0; color: var(--gold); text-transform: uppercase; font-size: 0.85em; letter-spacing: 1.5px; font-family: "Courier New", Courier, monospace; font-weight: bold; } 
        .meta-box p { margin: 0; font-size: 1.05em; font-style: italic; color: var(--text-dark); line-height: 1.5; } 
        
        .about-image img { 
            width: 100%; height: 450px; object-fit: cover;
            border: 8px solid var(--paper-white); outline: 1px solid #dcd5c5; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.08); 
        } 
        
        .footer { 
            background: var(--vintage-green); color: rgba(255,255,255,0.6); 
            text-align: center; padding: 50px 20px; font-size: 0.9em; 
            border-top: 4px solid var(--gold); font-family: "Courier New", Courier, monospace; 
            margin-top: 80px;
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <a href="/" class="nav-logo">RønGården</a>
        <div class="nav-links">
            <a href="/" class="active">Om Os</a>
            <a href="/koed">Kød</a>
            <a href="/aeg">Æg</a>
            <a href="/frugt-og-groent">Frugt & Grønt</a>
        </div>
    </nav>

    <header class="hero">
        <h1>RønGården</h1>
        <p>Landlige råvarer & kompromisløs kvalitet fra eget landbrug</p>
    </header>

    <section class="section">
        <h2 class="section-title">Vores Historie</h2>
        <p class="section-subtitle">Om passionen for jorden og respekten for de rene, gamle smagstraditioner</p>
        
        <div class="about-container">
            <div class="about-text">
                <h3>Smagen af det ægte landliv</h3>
                <p>Her på RønGården drives jorden og gårdbutikken ud fra stolte, traditionelle principper. Vi tror på, at ægte kvalitet kræver tid, omsorg og stor respekt for naturen. Vores dyr lever et sundt og frit liv på friske græsmarker under åben himmel, og vores afgrøder høstes nænsomt i hånden, når smagen er helt i top.</p>
                <p>Vi har indrettet vores lille gårdbutik som en moderne tidslomme, hvor du let kan reservere dine råvarer online på forhånd. På den måde sikrer du dig altid ugentlige frisklagte æg, sæsonens sprødeste grønt og de fineste udskæringer.</p>
                
                <div class="about-meta">
                    <div class="meta-box">
                        <h4>Gårdbutikkens timer</h4>
                        <p>Torsdage kl. 14:00 - 18:00<br>Lørdage kl. 09:00 - 13:00</p>
                    </div>
                    <div class="meta-box">
                        <h4>Her findes vi</h4>
                        <p>RønGården Gårdbutik<br>Vores Gade 12, 1234 Gårdby</p>
                    </div>
                </div>
            </div>
            <div class="about-image">
                <img src="https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80" alt="Gårdliv på RønGården">
            </div>
        </div>
    </section>

    <footer class="footer">
        <p>&copy; 2026 RønGården Gårdbutik. Alle rettigheder forbeholdes.</p>
    </footer>
</body>
</html>`);
});


// 2. Unik side for Kød
app.get('/koed', (req, res) => {
    res.send(getVintageLayout('Friske Kødråvarer', 'Eksklusive udskæringer fra vores fritgående besætninger', 'koed'));
});

// 3. Unik side for Æg
app.get('/aeg', (req, res) => {
    res.send(getVintageLayout('Frisklagte Gårdeg', 'Morgenfriske æg sorteret direkte i bakker', 'aeg'));
});

// 4. Unik side for Frugt & Grønt
app.get('/frugt-og-groent', (req, res) => {
    res.send(getVintageLayout('Sæsonens Frugt & Grønt', 'Høstet sprødt og friskt fra egne marker i morges', 'frugt_groent'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("RønGården online på port " + PORT);
});



