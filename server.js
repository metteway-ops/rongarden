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

app.post('/api/order', async (req, res) => {
    const { name, phone, email, cart, total } = req.body;
    try {
        const { data: existingOrder, error: findError } = await supabase
            .from('orders')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (findError) throw findError;

        if (existingOrder) {
            const currentItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];
            const finalItems = [...currentItems, ...cart];
            const finalTotal = Number(existingOrder.total_price || 0) + Number(total);
            
            await supabase
                .from('orders')
                .update({ items: finalItems, total_price: finalTotal, customer_name: name, phone: phone })
                .eq('id', existingOrder.id);
        } else {
            await supabase
                .from('orders')
                .insert([{ customer_name: name, phone, email, items: cart, total_price: total }]);
        }

        return res.json({ success: true, message: "Reservation modtaget!" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// --- FRONTEND VIEWS (Det nye, flotte design) ---

app.get('/', (req, res) => {
    res.redirect('/produkter');
});

app.get('/produkter', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gårdbutik | RønGården</title>
        <style>
            :root { --primary: #2d5a27; --primary-hover: #1e3d1a; --bg: #fdfbf7; --card-bg: #ffffff; --text: #2c3e50; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: var(--bg); margin: 0; padding: 0; color: var(--text); }
            
            /* Header / Banner */
            .header { background: linear-gradient(rgba(45, 90, 39, 0.85), rgba(45, 90, 39, 0.95)), url('https://unsplash.com') center/cover; color: white; padding: 60px 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .header h1 { margin: 0; font-size: 2.8em; font-weight: 700; letter-spacing: 1px; text-shadow: 1px 1px 3px rgba(0,0,0,0.2); }
            .header p { margin: 10px 0 0 0; font-size: 1.2em; opacity: 0.9; font-style: italic; }

            .container { max-width: 1100px; margin: 40px auto; padding: 0 20px; }
            
            /* Navigations-underfaner */
            .tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 40px; flex-wrap: wrap; }
            .tab-btn { background: var(--card-bg); border: 2px solid var(--primary); color: var(--primary); padding: 12px 28px; border-radius: 30px; cursor: pointer; font-size: 1em; font-weight: 600; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
            .tab-btn.active, .tab-btn:hover { background: var(--primary); color: white; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(45,90,39,0.2); }
            
            /* Produkt-grid */
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 30px; }
            .product-card { background: var(--card-bg); padding: 25px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); text-align: center; border: 1px solid #f0ede6; transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column; justify-content: space-between; }
            .product-card:hover { transform: translateY(-5px); box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
            .product-card h3 { margin: 0 0 10px 0; color: var(--primary); font-size: 1.4em; }
            .weight { color: #888; font-size: 0.9em; margin-bottom: 15px; display: inline-block; background: #f3f0e9; padding: 4px 12px; border-radius: 12px; }
            .price { font-size: 1.4em; font-weight: 700; color: var(--text); margin: 15px 0; }
            
            /* Flot knap til kurv */
            .buy-btn { background: var(--primary); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; transition: background 0.2s; font-size: 0.95em; }
            .buy-btn:hover { background: var(--primary-hover); }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>RønGården Gårdbutik</h1>
            <p>Friske råvarer direkte fra gården til dit køkken</p>
        </div>

        <div class="container">
            <!-- Flotte underfaner under "Produkter" -->
            <div class="tabs">
                <button class="tab-btn active" onclick="loadProducts('', event)">Vis alle råvarer</button>
                <button class="tab-btn" onclick="loadProducts('aeg', event)">Æg</button>
                <button class="tab-btn" onclick="loadProducts('frugt_groent', event)">Frugt & Grønt</button>
                <button class="tab-btn" onclick="loadProducts('koed', event)">Kød</button>
            </div>

            <div class="grid" id="product-container">
                <!-- Varer indlæses dynamisk her -->
            </div>
        </div>

        <script>
            async function loadProducts(category, event) {
                if(event) {
                    const buttons = document.querySelectorAll('.tab-btn');
                    buttons.forEach(btn => btn.classList.remove('active'));
                    event.target.classList.add('active');
                }

                try {
                    const url = category ? '/api/products?category=' + category : '/api/products';
                    const response = await fetch(url);
                    const products = await response.json();
                    
                    const container = document.getElementById('product-container');
                    container.innerHTML = '';

                    if(products.length === 0) {
                        container.innerHTML = '<div style="text-align:center; grid-column: 1/-1; padding: 40px; color:#888;">🌿 Udsolgt i denne kategori lige nu. Vi pakker snart friske varer igen!</div>';
                        return;
                    }

                    products.forEach(p => {
                        // Dynamisk enhed baseret på kategori
                        const priceUnit = p.category === 'aeg' ? 'kr/bakke' : 'kr.';
                        
                        const card = document.createElement('div');
                        card.className = 'product-card';
                        card.innerHTML = \`
                            <div>
                                <h3>\${p.name}</h3>
                                <span class="weight">Est. vægt: \${p.estimated_weight || 0} kg</span>
                            </div>
                            <div>
                                <p class="price">\${p.price} \${priceUnit}</p>
                                <button class="buy-btn">Reserver vare</button>
                            </div>
                        \`;
                        container.appendChild(card);
                    });
                } catch (err) {
                    console.error("Fejl ved indlæsning:", err);
                }
            }

            window.onload = () => loadProducts('');
        </script>
    </body>
    </html>
    `);
});

// --- START SERVEREN ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`RønGården online på port ${PORT}`);
});
