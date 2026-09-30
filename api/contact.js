export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const {
            firstName = '',
            lastName = '',
            email = '',
            phone = '',
            message = '',
            website = ''
        } = req.body || {};

        if (website) {
            return res.status(200).json({ success: true });
        }

        const cleanFirstName = String(firstName).trim();
        const cleanLastName = String(lastName).trim();
        const cleanEmail = String(email).trim();
        const cleanPhone = String(phone).trim();
        const cleanMessage = String(message).trim();

        if (!cleanFirstName || !cleanLastName || !cleanEmail || !cleanMessage) {
            return res.status(400).json({ error: 'Please complete all required fields.' });
        }

        const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailPattern.test(cleanEmail)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        if (cleanFirstName.length > 80 || cleanLastName.length > 80 ||
            cleanEmail.length > 160 || cleanPhone.length > 40 ||
            cleanMessage.length > 5000) {
            return res.status(400).json({ error: 'One or more fields are too long.' });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('RESEND_API_KEY is not configured.');
            return res.status(500).json({ error: 'Email service is not configured yet.' });
        }

        const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));

        const html = `
            <h2>New StandardWise Website Inquiry</h2>
            <p><strong>Name:</strong> ${escapeHtml(cleanFirstName)} ${escapeHtml(cleanLastName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(cleanPhone || 'Not provided')}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(cleanMessage).replace(/\\n/g, '<br>')}</p>
        `;

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: 'StandardWise Website <website@standardwise-cpa.com>',
                to: ['info@standardwise-cpa.com'],
                reply_to: cleanEmail,
                subject: `New Website Inquiry from ${cleanFirstName} ${cleanLastName}`,
                html
            })
        });

        const result = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error('Resend error:', result);
            return res.status(502).json({
                error: 'We could not send your message right now. Please try again later.'
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Contact form error:', error);
        return res.status(500).json({
            error: 'Something went wrong. Please try again later.'
        });
    }
}
