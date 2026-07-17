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
});app.post('/api/reserve', async (req, res) => {
    const { produkt, kunde } = req.body;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Sender til dig selv
            subject: 'Ny reservation: ' + produkt,
            text: `Kunden ${kunde} ønsker at reservere: ${produkt}`
        });
        res.json({ message: "Tak! Din reservation er modtaget." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Der skete en fejl. Prøv igen senere." });
    }
});





// --- FÆLLES VINTAGE DESIGN SKABELON (MED PRODUKTBILLEDER) ---
function getVintageLayout(title, subtitle, categoryKey) {
    // Standard hero-billede (hvis ingen kategori matcher)
    let heroImg = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1600&q=80"; 
    
    // Specifikke billeder for hver kategori
    if (categoryKey === 'koed') {
        // Røde Galloway køer
        heroImg = "https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=1600&q=80";
    }
    if (categoryKey === 'aeg') {
        // Sorte høns i det fri
        heroImg = "https://images.unsplash.com/photo-1524293581917-878a6d060c6a?auto=format&fit=crop&w=1600&q=80";
    }
    if (categoryKey === 'frugt_groent') {
        // Jordbær og kartofler
        heroImg = "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=1600&q=80";
    }
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
        
 /* Hero-sektion med stemningsbillede */
.hero { 
    height: 60vh; 
    /* Her ændres URL'en til dit lokale billede i public-mappen */
    background: linear-gradient(rgba(41,64,46, 0.45), rgba(41,64,46, 0.45)), 
                url("/Okosystem.jpg") center/cover no-repeat; 
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
    text-align: left;
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
        <p>&copy; 2026 RønGården.</p>
    </footer>

<script>

    async function reserverProdukt(produktNavn) {
        const navn = prompt("Indtast dit navn:");
        if (!navn) return;

        alert("Sender reservation for: " + produktNavn);
        
        // Her sender vi data til din server (som vi skal lave nu)
        const response = await fetch('/api/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produkt: produktNavn, kunde: navn })
        });

        const result = await response.json();
        alert(result.message);
    }
        
async function loadProducts(){
    try {
        // Vi bruger '+' i stedet for ${} for at undgå at serveren forvirres
        const response = await fetch("/api/products?category=" + "${categoryKey}");
        
        const products = await response.json();
        const container = document.getElementById("product-container");
        container.innerHTML = "";
        
        products.forEach(function(p) {
            var unit = (p.category === "aeg") ? "kr/bakke" : "kr/kg";
            var enhedTekst = (p.category === "aeg") ? "12 stk" : "~" + (p.estimated_weight || 0) + " kg";
            
            var fallbackImg = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80";
            if(p.category === 'koed') fallbackImg = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80";
            if(p.category === 'aeg') fallbackImg = "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=500&q=80";
            
            var imgSrc = p.image_url || fallbackImg;
            
            var descHtml = p.description ? "<p class='product-description'>" + p.description + "</p>" : "";
            var prepHtml = p.preparation_info ? "<div class='preparation-info'><strong>Tilberedning:</strong><br>" + p.preparation_info + "</div>" : "";

            var card = document.createElement("div");
            card.className = "product-card";
            // Din knap-linje her ser fin ud nu!
            card.innerHTML = "<div><img class='product-img' src='" + imgSrc + "' alt='" + p.name + "'><h3>" + p.name + "</h3><span class='weight'>Enhed: " + enhedTekst + "</span>" + descHtml + prepHtml + "</div><div><p class='price'>" + p.price + " " + unit + "</p><button class='buy-btn' onclick='reserverProdukt(\"" + p.name + "\")'>Reserver råvare</button></div>";
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
    // HER ER BACKTICK (`) SLUT.
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
        

/* Hero-sektion - Her er det gamle Unsplash-billede fjernet */
        .hero { 
            height: 60vh; 
            background: linear-gradient(rgba(41,64,46, 0.45), rgba(41,64,46, 0.45)), 
                        url("/oekosystem.jpg") center/cover no-repeat; 
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
                <p>På RønGården drives landbruget som et tæt, naturligt kredsløb, hvor jorden, dyrene og familien spiller sammen. Vi er en familie på tre – mor, far og vores datter på 1 år – der værner om de gamle traditioner og respekten for naturen.

Vores marker afgræsses af gallowaykøer, får, shetlandsponyer og høns. Det er deres naturlige tilstedeværelse, der giver næring til jorden, så vi hvert år kan høste jordbær, kartofler, ærter, korn og grønkål helt uden brug af kunstgødning. For at styrke biodiversiteten planter vi honningurt som efterafgrøde, hvilket er til stor gavn for de lokale bier.

Hver del af gården tjener et formål: Grønkålen, ærterne og kornet bliver brugt som næringsrigt foder til vores høns, mens halmen fra kornet bliver til blød strøelse til dyrene. Hvert år udruger vi nye kyllinger; her sikrer vi en god dyrevelfærd og smag ved at lade hanerne vokse op over fire måneder, mens hønekyllingerne bliver en fast del af vores ægproduktion. I vores gårdbutik kan du købe årstidens friskeste jordbær, kartofler og frisklagte æg – alt sammen skabt med kærlighed til det ægte, bæredygtige landliv.</p>
                <p>Vi har indrettet vores lille gårdbutik som en moderne tidslomme, hvor du let kan reservere dine råvarer online på forhånd. På den måde sikrer du dig altid ugentlige frisklagte æg, sæsonens sprødeste grønt og de fineste udskæringer.</p>
                
                <div class="about-meta">
                    <div class="meta-box">
                        <h4>Gårdbutikkens timer</h4>
                        <p>Tirsdag kl. 14:00 - 19:00<br>Torsdag kl. 14:00 - 19:00<br>Lørdag kl. 10:00 - 16:00</p>
                    </div>
                    <div class="meta-box">
                        <h4>Her findes vi</h4>
                        <p>RønGården<br>Trehøjevej 79, 6973 Ørnhøj</p>
                    </div>
                </div>
            </div>
            <div class="about-image">
    <img src="/Okosystem.jpg" alt="Gårdliv på RønGården">
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
    res.send(getVintageLayout('Kødråvarer', 'Eksklusive udskæringer fra vores fritgående besætninger', 'koed'));
});

// 3. Unik side for Æg
app.get('/aeg', (req, res) => {
    res.send(getVintageLayout('Frisklagte Græsæg', 'Morgenfriske æg sorteret direkte i bakker', 'aeg'));
});

// 4. Unik side for Frugt & Grønt
app.get('/frugt-og-groent', (req, res) => {
    res.send(getVintageLayout('Sæsonens Frugt & Grønt', 'Høstet sprødt og friskt fra egne marker i morges', 'frugt_groent'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("RønGården online på port " + PORT);
});



