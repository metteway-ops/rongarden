require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

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
        const { data, error } = await supabase.from('products').select('*').order('name');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/order', async (req, res) => {
    const { name, phone, email, cart, total } = req.body;
    
    try {
        // 1. Tjek om der findes en eksisterende ordre med denne mail
        const { data: existingOrder, error: findError } = await supabase
            .from('orders')
            .select('*')
            .eq('email', email)
            .maybeSingle(); // Returnerer null hvis ingen findes, i stedet for fejl

        if (findError) throw findError;

        let finalItems;
        let finalTotal;

        if (existingOrder) {
            // --- OPDATER EKSISTERENDE ORDRE ---
            finalItems = [...existingOrder.items, ...cart];
            finalTotal = Number(existingOrder.total_price) + Number(total);

            const { error: updateError } = await supabase
                .from('orders')
                .update({ 
                    items: finalItems, 
                    total_price: finalTotal,
                    customer_name: name, // Opdater evt. navn/tlf hvis de har ændret sig
                    phone: phone 
                })
                .eq('id', existingOrder.id);
            
            if (updateError) throw updateError;
        } else {
            // --- OPRET NY ORDRE ---
            finalItems = cart;
            finalTotal = total;

            const { error: insertError } = await supabase
                .from('orders')
                .insert([{ 
                    customer_name: name, 
                    phone, 
                    email, // HUSK: Tilføj email kolonnen i din tabel!
                    items: cart, 
                    total_price: total 
                }]);
            
            if (insertError) throw insertError;
        }

        // 2. Opdater lagerbeholdning (Logikken er den samme som før)
        for (const item of cart) {
            if (item.parent_stock_group === 'hoejreb') {
                const weight = item.stock_weight || 1; 
                await supabase.rpc('decrement_hoejreb_stock', { amount_to_subtract: weight });
            } else {
                await supabase.rpc('decrement_stock', { row_id: item.id, amount: 1 });
            }
        }

        // 3. Beregn total indtjening til ejer-mail
        const { data: allOrders } = await supabase.from('orders').select('total_price');
        const totalIndtjeningAltid = allOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

        // 4. Generer PDF (Vi bruger finalItems, så kunden ser den SAMLEDE ordre)
        const groupedForPdf = groupCartForEmail(finalItems);
        const pdfBuffer = await new Promise((resolve) => {
            const doc = new PDFDocument();
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            
            doc.fontSize(22).text('Opdateret Reservation - RønGården', { align: 'center' });
            doc.moveDown().fontSize(12).text(`Kunde: ${name}`).text(`Tlf: ${phone}`).text(`Dato: ${new Date().toLocaleDateString('da-DK')}`);
            doc.moveDown().text('Din samlede reservation:', { underline: true });
            
            Object.keys(groupedForPdf).forEach(itemName => {
                const item = groupedForPdf[itemName];
                doc.text(`${item.count} x ${itemName} (á ca. ${item.estWeight} kg): ${item.totalPrice.toFixed(0)} kr.`);
            });
            
            doc.moveDown().fontSize(14).text(`Samlet estimeret pris: ${finalTotal} kr.`, { bold: true });
            doc.moveDown(2).fontSize(10).fillColor('#666').text('Denne PDF indeholder din fulde ordre inklusiv seneste tilføjelser.', { align: 'center' });
            doc.end();
        });

        // 5. Send mails
        const mailSubject = existingOrder ? `Reservation opdateret - ${name}` : `Reservation bekræftet - ${name}`;
        const mailText = existingOrder 
            ? `<h3>Vi har tilføjet de nye varer til din eksisterende reservation, ${name}!</h3><p>Se din opdaterede oversigt i den vedhæftede PDF.</p>`
            : `<h3>Tak for din reservation, ${name}</h3><p>Se vedhæftede PDF for detaljer.</p>`;

        await transporter.sendMail({
            from: `"RønGården" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: mailSubject,
            html: mailText,
            attachments: [{ filename: 'Din_Reservation_RoenGaarden.pdf', content: pdfBuffer }]
        });

        // Ejer-mail
        await transporter.sendMail({
            from: `"RønGården System" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `💰 Ny/Opdateret ordre! Status: ${totalIndtjeningAltid} kr.`,
            html: `<h2>Ordre fra ${name}</h2><p><strong>Status:</strong> ${existingOrder ? 'Tilføjet til eksisterende' : 'Helt ny kunde'}</p><p><strong>Total for denne kunde nu:</strong> ${finalTotal} kr.</p>`,
            attachments: [{ filename: 'reservation.pdf', content: pdfBuffer }]
        });

        res.json({ success: true, message: existingOrder ? "Varer tilføjet til din eksisterende ordre!" : "Reservation modtaget!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ... her slutter din app.post('/api/order')

// >>> INDSÆT DETTE HER (API TIL AT SENDE MAILS) <<<
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


// --- FRONTEND ---

app.get('/admin-gaarden', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="UTF-8">
        <title>Admin | RønGården</title>
        <style>
            body { font-family: sans-serif; background: #f9f7f2; display: flex; align-items: center; justify-content: center; height: 100vh; }
            .box { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
            input { width: 100%; padding: 10px; margin: 15px 0; border-radius: 8px; border: 1px solid #ccc; }
            button { background: #2d5a27; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>Gård-Kontrol 🚜</h2>
            <p>Send "snart klar" mail til alle kunder</p>
            <input type="password" id="pw" placeholder="Admin kodeord">
            <button onclick="go()">Send mails nu</button>
            <p id="msg"></p>
        </div>
        <script>
            async function go() {
                const password = document.getElementById('pw').value;
                if(!confirm("Vil du sende mails til alle?")) return;
                const res = await fetch('/api/admin/notify-ready', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ password })
                });
                const data = await res.json();
                document.getElementById('msg').innerText = data.success ? "✅ " + data.message : "❌ " + data.error;
            }
        </script>
    </body>
    </html>`);
});



app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RønGården | Gårdkød & Bæredygtighed</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style>
            :root { --green: #2d5a27; --clay: #a67c52; --cream: #f9f7f2; --white: #ffffff; --text: #34495e; }
            body { font-family: 'Inter', sans-serif; background: var(--cream); margin: 0; color: var(--text); line-height: 1.6; }

.footer-logo {
    display: block;
    margin: 4rem auto 2rem; /* Skaber luft over logoet */
    max-width: 150px;       /* Juster størrelsen her */
    opacity: 0.8;           /* Gør det lidt diskret */
}
            
            header { background: var(--white); padding: 1rem 5%; border-bottom: 1px solid rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 1000; display: flex; justify-content: space-between; align-items: center; }
            .logo-text { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; color: var(--green); text-decoration: none; cursor:pointer; }
            nav a { margin-left: 20px; text-decoration: none; color: var(--text); font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: color 0.2s; }
            nav a:hover, nav a.active { color: var(--green); }

            .container { width: 90%; max-width: 1200px; margin: 3rem auto 6rem; }
            .section { display: none; }
            .section.active { display: block; }

            .practical-info { background: var(--white); padding: 1.5rem 2rem; border-radius: 24px; margin-bottom: 2.5rem; border-left: 6px solid var(--green); box-shadow: 0 4px 20px rgba(0,0,0,0.03); display: flex; gap: 2rem; flex-wrap: wrap; }
            .info-item h4 { margin: 0 0 5px 0; color: var(--green); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
            .info-item p { margin: 0; font-size: 0.95rem; color: #666; }

            .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px; }
            .product-card { background: var(--white); border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid rgba(0,0,0,0.03); transition: transform 0.3s; }
            .product-card:hover { transform: translateY(-5px); }
            .product-img { width: 100%; height: 220px; object-fit: cover; background: #eee; }
            .product-info { padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column; }
            
            .prep-badge { background: #f0f4f0; color: var(--green); padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; margin-bottom: 12px; font-weight: 600; width: fit-content; }
            .product-price { font-weight: 700; color: var(--clay); font-size: 1.2rem; margin-bottom: 15px; margin-top: auto; }
            .price-label { font-size: 0.8rem; display: block; color: #666; font-weight: 400; margin-bottom: 2px; }
            
            .btn { background: var(--green); color: white; border: none; padding: 14px; border-radius: 12px; cursor: pointer; font-weight: 600; width: 100%; }
            .btn:disabled { background: #ccc; cursor: not-allowed; }
            .btn-secondary { background: #f0f0f0; color: #666; border: none; padding: 10px 20px; border-radius: 50px; cursor: pointer; font-weight: 600; }

            .about-content { max-width: 800px; margin: 0 auto; background: var(--white); padding: 3rem; border-radius: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
            .about-content h2 { font-family: 'Playfair Display', serif; color: var(--green); font-size: 2.2rem; margin-bottom: 1.5rem; text-align: center; }
            .about-content p { margin-bottom: 1.5rem; font-size: 1.1rem; color: #555; }

            #cart-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 3000; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
            .modal-content { background: white; padding: 2.5rem; border-radius: 32px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
            .cart-item-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            #cart-float { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 500px; background: var(--green); color: white; padding: 1rem 2rem; border-radius: 100px; display: none; justify-content: space-between; align-items: center; z-index: 2000; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        </style>
    </head>
    <body>
        <header>
            <div class="logo-text" onclick="showSection('shop')">RønGården</div>
            <nav>
                <a onclick="showSection('shop')" id="nav-shop">Produkter</a>
                <a onclick="showSection('coming')" id="nav-coming">Kommer snart</a>
                <a onclick="showSection('about')" id="nav-about">Om os</a>
                <a onclick="toggleCart()" style="color: var(--clay); font-weight:700;">🛒 (<span id="cart-count">0</span>)</a>
            </nav>
        </header>

        <div class="container">
            <section id="shop" class="section active">
                <div class="practical-info">
                    <div class="info-item">
                        <h4>💳 Betaling</h4>
                        <p>Betaling sker via MobilePay eller kontant ved afhentning på gården. OBS: Priserne er vejledende ud fra forventede mængder.</p>
                    </div>
                    <div class="info-item">
                        <h4>🚜 Afhentning</h4>
                        <p>Varerne afhentes direkte på RønGården efter aftale. Du modtager en bekræftelse pr. mail.</p>
                    </div>
                </div>
                <div id="product-list-inner" class="product-grid">Henter varer...</div>
<img src="/Røn_LOGO.jpg" alt="RønGården Logo" class="footer-logo">
            </section>

           <section id="coming" class="section">
                <h2 style="font-family:'Playfair Display', serif; text-align:center; margin-bottom:2rem; color:var(--green);">Fremtiden på RønGården</h2>
                <div class="product-grid">
                    <div class="product-card" style="border: 1px dashed var(--clay);">
                        <img src="/jordbaer.jpg" class="product-img" style="filter: grayscale(20%);">
                        <div class="product-info">
                            <div class="prep-badge" style="background: #ff4d4d; color: white;">SOMMER 2027</div>
                            <h3>Søde Gårdjordbær</h3>
                            <p>Glæd dig til smagen af dansk sommer. Vi planter flere sorter for en lang og smagfuld sæson.</p>
                            <div class="product-price">Juni 2027</div>
                            <button class="btn" disabled style="background: #eee; color:#999;">Afventer sæson</button>
                        </div>
                    </div>

                    <div class="product-card" style="border: 1px dashed var(--clay);">
                        <img src="/kartofler.jpg" class="product-img" style="filter: grayscale(20%);">
                        <div class="product-info">
                            <div class="prep-badge" style="background: var(--clay); color: white;">NYHED</div>
                            <h3>Nye Kartofler</h3>
                            <p>Direkte fra mulden på RønGården. De klassiske faste sorter, der smager allerbedst med en klat smør.</p>
                            <div class="product-price">Forår 2027</div>
                            <button class="btn" disabled style="background: #eee; color:#999;">Afventer høst</button>
                        </div>
                    </div>

                    <div class="product-card" style="border: 1px dashed var(--clay);">
                        <img src="/aeg.jpg" class="product-img" style="filter: grayscale(20%);">
                        <div class="product-info">
                            <div class="prep-badge" style="background: var(--clay); color: white;">VEJBOD</div>
                            <h3>Friske Gårdæg</h3>
                            <p>Vores høns flytter ind snart! Glæd dig til store, blommegule æg fra fritgående høns.</p>
                            <div class="product-price">Ultimo 2026</div>
                            <button class="btn" disabled style="background: #eee; color:#999;">Afventer indflytning</button>
                        </div>
                    </div>
                </div>
<img src="/Røn_LOGO.jpg" alt="RønGården Logo" class="footer-logo">
            </section>

            <section id="about" class="section">
                <div class="about-content">
                    <h2>Vores Filosofi</h2>
                    <p>På RønGården lever vi i harmoni med naturens egne cyklusser. Vores køer, heste og høns afgræsser markerne og engene, og som tak leverer de naturlig gødning, der giver næring til vores jordbær, kartofler, kål og havre. For at passe ekstra godt på jorden planter vi også honningurt som efterafgrøder. De smukke blomster fungerer som naturens egne depoter, der holder på næringsstofferne i jorden og mindsker behovet for yderligere gødning. Samtidig skaber de et fristed og en vigtig fødekilde for bierne, som summer af liv på vores marker.</p>
                    <p>Kredsløbet fuldendes, når kålen og havren høstes som næringsrigt foder til hønsene, mens havrehalmen genanvendes som lunt og blødt underlag hos både heste, køer og i hønsenes redekasser.</p>
                    <p>Vores tilgang til landbrug handler ikke kun om vækst, men også om ansvarlighed. Da vi sælger vores fødevarer direkte til dig som forbruger, undgår vi de lange logistikkæder og overfyldte kølediske. Det betyder, at intet kød går til spilde eller ender som madspild i en butik – alt bliver udnyttet og lander direkte på dit middagsbord.</p>
                    <p>Dette lukkede kredsløb er din garanti for høj dyrevelfærd, minimalt spild og en bæredygtig vej fra jord til bord.</p>
                    <img src="/Økosystem.jpg" alt="Visuel præsentation" style="width:100%; border-radius:24px; margin-top:2rem; border: 1px solid rgba(0,0,0,0.03);" />
                </div>
<img src="/Røn_LOGO.jpg" alt="RønGården Logo" class="footer-logo">
            </section>
        </div>

<div id="cart-modal" onclick="if(event.target==this) toggleCart()">
    <div class="modal-content">
        <h2 style="font-family:'Playfair Display'">Din Reservation</h2>
        <div id="cart-items-list"></div>
        <div style="margin-top:20px; font-size:1.2rem; font-weight:700; display:flex; justify-content:space-between;">
            <span>Total (Estimeret):</span>
            <span id="modal-total">0</span> kr.
        </div>

        <div id="checkout-form" style="display:none; margin-top:20px; border-top:1px solid #eee; padding-top:20px;">
            <input type="text" id="cust-name" placeholder="Dit navn" style="width:100%; padding:12px; margin-bottom:10px; border-radius:12px; border:1px solid #ddd; box-sizing: border-box;">
            <input type="email" id="cust-email" placeholder="Din e-mail" style="width:100%; padding:12px; margin-bottom:10px; border-radius:12px; border:1px solid #ddd; box-sizing: border-box;">
            <input type="tel" id="cust-phone" placeholder="Dit telefonnummer" style="width:100%; padding:12px; margin-bottom:15px; border-radius:12px; border:1px solid #ddd; box-sizing: border-box;">
            <button class="btn" onclick="submitOrder()">Send reservation</button>
        </div>
        <div id="modal-buttons" style="display:flex; gap:10px; margin-top:25px;">
            <button class="btn-secondary" onclick="clearCart()">Tøm kurv</button>
            <button class="btn" onclick="showCheckoutForm()">Gå til bestilling</button>
        </div>
    </div>
</div>

        <div id="cart-float">
            <span>Total: <strong id="total-price">0</strong> kr.</span>
            <button class="btn" style="background:white; color:var(--green); width:auto; padding:10px 25px; border-radius:50px;" onclick="toggleCart()">Se kurv</button>
        </div>

        <script>
            let cart = []; let products = [];
            
            function showSection(id) {
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
                document.getElementById(id).classList.add('active');
                if(document.getElementById('nav-' + id)) document.getElementById('nav-' + id).classList.add('active');
                window.scrollTo(0,0);
            }

            fetch('/api/products').then(res => res.json()).then(data => { products = data; render(); });

            function render() {
                const container = document.getElementById('product-list-inner');
                container.innerHTML = products.map(p => {
                    const weight = p.stock_weight || 1;
                    const displayStock = p.parent_stock_group === 'hoejreb' ? Math.floor(p.stock / weight) : p.stock;
                    const estPrice = (p.price * (p.estimated_weight || 1)).toFixed(0);

                    return \`
                    <div class="product-card">
                        <img src="\${p.image_url || '/placeholder.jpg'}" class="product-img">
                        <div class="product-info">
                            <h3>\${p.name}</h3>
                            <p style="font-size:0.85rem; color:#666; margin-bottom:10px;">\${p.description || ''}</p>
                            \${p.preparation_info ? \`<div class="prep-badge">⏱ \${p.preparation_info}</div>\` : ''}
                            <p style="font-size:0.8rem; color:var(--green); font-weight:600; margin-bottom:15px;">Ca. \${p.estimated_weight} kg pr. stk.</p>
                            
                            <div class="product-price">
                                <span class="price-label">Estimeret pris pr. udskæring:</span>
                                ~\${estPrice} kr. <small style="font-size:0.7rem; color:#999; font-weight:400;">(\${p.price} kr/kg)</small>
                            </div>
                            
                            <button class="btn" \${displayStock <= 0 ? 'disabled' : ''} onclick="addToCart(\${p.id})">
                                \${displayStock <= 0 ? 'Udsolgt' : 'Læg i kurv'}
                            </button>
                            <p style="font-size: 0.7rem; color:#999; text-align:center; margin-top:8px;">\${displayStock} stk. på lager</p>
                        </div>
                    </div>\`;
                }).join('');
            }

            function addToCart(id) {
                const p = products.find(x => x.id === id);
                const weightRequired = p.parent_stock_group === 'hoejreb' ? (p.stock_weight || 1) : 1;
                
                if(p.stock >= weightRequired) { 
                    cart.push({...p});
                    if(p.parent_stock_group) {
                        products.forEach(prod => { if(prod.parent_stock_group === p.parent_stock_group) prod.stock -= weightRequired; });
                    } else { p.stock -= 1; }
                    updateUI();
                }
            }

            function updateUI() {
                const total = cart.reduce((s, i) => s + (i.price * (i.estimated_weight || 1)), 0).toFixed(0);
                document.getElementById('total-price').innerText = total;
                document.getElementById('modal-total').innerText = total;
                document.getElementById('cart-count').innerText = cart.length;
                document.getElementById('cart-float').style.display = cart.length > 0 ? 'flex' : 'none';
                
                // Gruppering til frontend visning
                const groups = cart.reduce((acc, item) => {
                    acc[item.name] = (acc[item.name] || 0) + 1;
                    return acc;
                }, {});

                document.getElementById('cart-items-list').innerHTML = Object.keys(groups).map(name => {
                    const count = groups[name];
                    const itemData = cart.find(i => i.name === name);
                    const groupTotal = (itemData.price * itemData.estimated_weight * count).toFixed(0);
                    return \`
                        <div class="cart-item-row">
                            <span>\${count} x \${name} (~\${itemData.estimated_weight}kg pr. stk)</span>
                            <strong>\${groupTotal} kr.</strong>
                        </div>\`;
                }).join('');
                render();
            }

            function toggleCart() {
                const m = document.getElementById('cart-modal');
                m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
            }

            function clearCart() { location.reload(); }

// Viser formularen og skjuler "Gå til bestilling"-knappen
function showCheckoutForm() {
    document.getElementById('checkout-form').style.display = 'block';
    document.getElementById('modal-buttons').style.display = 'none';
}

// Den funktion der faktisk sender ordren til din server
async function submitOrder() {
    const name = document.getElementById('cust-name').value;
    const email = document.getElementById('cust-email').value;
    const phone = document.getElementById('cust-phone').value;

    if(!name || !email || !phone) {
        alert("Udfyld venligst alle felter, så vi kan bekræfte din reservation.");
        return;
    }
    
    // Deaktiver knappen så kunden ikke trykker 10 gange
    event.target.disabled = true;
    event.target.innerText = "Sender...";

    const total = document.getElementById('total-price').innerText;
    
    try {
        const res = await fetch('/api/order', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, email, phone, cart, total})
        });
        const data = await res.json(); 
        alert(data.message); 
        location.reload();
    } catch (err) {
        alert("Der skete en fejl. Prøv venligst igen.");
        event.target.disabled = false;
        event.target.innerText = "Send reservation";
    }
}

        </script>
    </body>
    </html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log('RønGården online på port ' + PORT); });