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
        pass: process.env.EMAIL_PASS // Husk: App Password her!
    }
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
        const { data, error } = await supabase.from('products').select('*').order('name');
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
        // Hvis fejlen ligger i transporter.sendMail, fanger vi den her:
        console.error("🚨 FEJL UNDER ORDREBEHANDLING ELLER MAIL-AFSENDELSE:", err.message);
        
        // Selvom mailen fejler, gemmer vi ordren. Vi giver kunden besked om, at ordren er ok, men mailen driller
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