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
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Bruger SSL/TLS på port 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000 // Giver serveren 10 sekunder til at oprette forbindelse
});



// Verificer mail-konfiguration
transporter.verify(function (error, success) {
    if (error) {
        console.log("❌ Mail-fejl: Forbindelsen til Gmail fejlede!");
        console.log(error);
    } else {
        console.log("✅ Mail-systemet er klar til at sende!");
    }
});

// Hjælpefunktion til at gruppere varer til PDF'en
function groupCartForEmail(cart) {
    return cart.reduce((acc, item) => {
        if (!acc[item.name]) {
            acc[item.name] = { 
                count: 0, 
                price: item.price, 
                estWeight: item.estimated_weight,
                totalPrice: 0 
            };
        }
        acc[item.name].count += 1;
        acc[item.name].totalPrice += (item.price * (item.estimated_weight || 1));
        return acc;
    }, {});
}

// --- API RUTER ---

app.get('/api/products', async (req, res) => {
    try {
        const { category } = req.query; // Henter f.eks. ?category=aeg fra hjemmesiden
        
        let query = supabase.from('products').select('*').order('name');
        
        // Hvis hjemmesiden beder om en specifik underfane, filtrerer vi i Supabase
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

// --- ORDRE RUTE ---
app.post('/api/order', async (req, res) => {
    const { name, phone, email, cart, total } = req.body;
    console.log("=== NY ORDRE MODTAGET ===");

    try {
        // 1. Gem i Supabase
        const { data: existingOrder, error: findError } = await supabase
            .from('orders')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (findError) throw new Error("Supabase søgefejl: " + findError.message);

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

        // 2. Lager-opdatering
        try {
            for (const item of cart) {
                if (item.parent_stock_group === 'hoejreb') {
                    await supabase.rpc('decrement_hoejreb_stock', { amount_to_subtract: item.stock_weight || 1 });
                } else {
                    await supabase.rpc('decrement_stock', { row_id: item.id, amount: 1 });
                }
            }
        } catch (stockErr) {
            console.error("Lager-opdatering fejlede, men fortsætter ordre:", stockErr.message);
        }

        // 3. Forbered og SEND mail
        const vareListeHtml = cart.map(item => `<li>${item.name} (~${item.estimated_weight} kg)</li>`).join('');
        
        console.log(`Sender bekræftelse til kunden: ${email}`);
        
        // Mail 1: Til Kunden
        await transporter.sendMail({
            from: `"RønGården" <${process.env.EMAIL_USER}>`,
            to: email, // KUN til kunden
            subject: `Bekræftelse: Reservation på RønGården - ${name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2d5a27;">Tak for din reservation, ${name}!</h2>
                    <p>Vi har modtaget din bestilling på følgende:</p>
                    <ul>${vareListeHtml}</ul>
                    <p><strong>Total (estimeret): ${total} kr.</strong></p>
                    <p>Betaling sker ved afhentning.</p>
                </div>`
        });

        console.log(`Sender kopi til admin: ${process.env.EMAIL_USER}`);

        // Mail 2: Til Dig Selv (Admin-notifikation)
        await transporter.sendMail({
            from: `"RønGården System" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // KUN til dig selv
            subject: `🚨 NY RESERVATION: ${name}`,
            html: `<h3>Ny reservation modtaget!</h3>
                   <p><b>Navn:</b> ${name}</p>
                   <p><b>E-mail:</b> ${email}</p>
                   <p><b>Telefon:</b> ${phone}</p>
                   <ul>${vareListeHtml}</ul>
                   <p><b>Total:</b> ${total} kr.</p>`
        });

        console.log("✅ Begge mails afsendt og godkendt af Gmail!");

        // 4. Send succes-svar til kunden
        return res.json({ 
            success: true, 
            message: "Reservation modtaget! Vi har sendt en bekræftelse til din mail." 
        });

    } catch (err) {
        console.error("🚨 FEJL UNDER ORDREBEHANDLING ELLER MAIL-AFSENDELSE:", err.message);
        
        if (!res.headersSent) {
            return res.json({ 
                success: true, 
                message: "Reservation modtaget! (Der opstod dog en fejl med bekræftelses-mailen, men din ordre er registreret i vores system)." 
            });
        }
    }
});

// --- ADMIN NOTIFIKATIONER ---
app.post('/api/admin/notify-ready', async (req, res) => {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Forkert kodeord!" });
    }

    try {
        const { data: customers, error } = await supabase.from('orders').select('email, customer_name');
        if (error) throw error;

        const uniqueCustomers = Array.from(new Map(customers.map(c => [c.email, c])).values());

        const emailPromises = uniqueCustomers.map(customer => {
            return transporter.sendMail({
                from: `"RønGården" <${process.env.EMAIL_USER}>`,
                to: customer.email,
                subject: "Opdatering: Kødet er snart klar på RønGården 🌿",
                html: `<h3>Hej ${customer.customer_name}</h3>
                       <p> Kødet er klar til afhentning <b> torsdag d. 14. maj </b>.</p>
                       <p>Venlig hilsen<br>RønGården</p>`
            });
        });

        await Promise.all(emailPromises);
        res.json({ success: true, message: `Sendt til ${uniqueCustomers.length} kunder!` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- FRONTEND VIEWS ---

// KUNDENS PRODUKTSIDE (MED UNDERFANER)
// KUNDENS PRODUKTSIDE (MED UNDERFANER)
app.get('/produkter', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="UTF-8">
        <title>Gårdbutik | RønGården</title>
        <style>
            body { font-family: sans-serif; background: #f9f7f2; margin: 0; padding: 20px; color: #333; }
            .container { max-width: 1000px; margin: 0 auto; }
            h1 { color: #2d5a27; text-align: center; }
            
            /* Underfaner / Kategori-knapper */
            .tabs { display: flex; justify-content: center; gap: 10px; margin-bottom: 30px; }
            .tab-btn { background: white; border: 2px solid #2d5a27; color: #2d5a27; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: bold; transition: 0.2s; }
            .tab-btn.active, .tab-btn:hover { background: #2d5a27; color: white; }
            
            /* Produkt-grid */
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
            .product-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); text-align: center; border: 1px solid #eee; }
            .product-card h3 { margin: 10px 0; color: #2d5a27; }
            .price { font-size: 1.2em; font-weight: bold; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Vores Råvarer på RønGården</h1>
            
            <!-- Underfaner under "Produkter" -->
            <div class="tabs">
                <button class="tab-btn active" onclick="loadProducts('')">Vis alle</button>
                <button class="tab-btn" onclick="loadProducts('aeg')">Æg</button>
                <button class="tab-btn" onclick="loadProducts('frugt_groent')">Frugt & Grønt</button>
                <button class="tab-btn" onclick="loadProducts('koed')">Kød</button>
            </div>

            <div class="grid" id="product-container">
                <!-- Varer indlæses dynamisk her via JavaScript -->
            </div>
        </div>

        <script>
            // Hent varer automatisk baseret på aktiv fane
            async function loadProducts(category) {
                // Opdater aktiv styling på knapperne
                const buttons = document.querySelectorAll('.tab-btn');
                buttons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');

                try {
                    // Kald den opdaterede backend API-rute
                    const url = category ? '/api/products?category=' + category : '/api/products';
                    const response = await fetch(url);
                    const products = await response.json();
                    
                    const container = document.getElementById('product-container');
                    container.innerHTML = '';

                    if(products.length === 0) {
                        container.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Udsolgt i denne kategori lige nu... 🌿</p>';
                        return;
                    }

                    products.forEach(p => {
                        // Tjek om varen tilhører kategorien 'aeg' for at ændre prisenheden
                        const priceUnit = p.category === 'aeg' ? 'kr/bakke' : 'kr.';
                        
                        const card = document.createElement('div');
                        card.className = 'product-card';
                        card.innerHTML = \`
                            <h3>\${p.name}</h3>
                            <p style="color: #666; font-size: 0.9em;">Est. vægt: \${p.estimated_weight || 0} kg</p>
                            <p class="price">\${p.price} \${priceUnit}</p>
                        \`;
                        container.appendChild(card);
                    });
                } catch (err) {
                    console.error("Fejl ved hentning af produkter:", err);
                }
            }

            // Indlæs alle varer når siden åbnes første gang
            window.onload = () => loadProducts('');
        </script>
    </body>
    </html>
    `);
});