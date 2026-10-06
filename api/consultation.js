export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed.'
        });
    }

    try {
        const {
            fullName = '',
            companyName = '',
            email = '',
            phone = '',
            service = '',
            message = '',
            website = ''
        } = req.body || {};

        // Honeypot spam protection
        if (website) {
            return res.status(200).json({
                success: true
            });
        }

        const cleanFullName = String(fullName).trim();
        const cleanCompanyName = String(companyName).trim();
        const cleanEmail = String(email).trim();
        const cleanPhone = String(phone).trim();
        const cleanService = String(service).trim();
        const cleanMessage = String(message).trim();

        // Required fields
        if (
            !cleanFullName ||
            !cleanEmail ||
            !cleanService ||
            !cleanMessage
        ) {
            return res.status(400).json({
                error: 'Please complete all required fields.'
            });
        }

        // Length protection
        if (
            cleanFullName.length > 160 ||
            cleanCompanyName.length > 160 ||
            cleanEmail.length > 160 ||
            cleanPhone.length > 40 ||
            cleanService.length > 120 ||
            cleanMessage.length > 5000
        ) {
            return res.status(400).json({
                error: 'One or more fields are too long.'
            });
        }

        // Email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(cleanEmail)) {
            return res.status(400).json({
                error: 'Please enter a valid email address.'
            });
        }

        const apiKey = process.env.RESEND_API_KEY;

        if (!apiKey) {
            console.error('RESEND_API_KEY is not configured.');

            return res.status(500).json({
                error: 'Email service is not configured yet.'
            });
        }

        // Prevent HTML injection inside the email
        const escapeHtml = (value) => {
            return value.replace(
                /[&<>"']/g,
                (character) => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                }[character])
            );
        };

        const html = `
            <h2>New StandardWise Consultation Request</h2>

            <p>
                <strong>Full Name:</strong>
                ${escapeHtml(cleanFullName)}
            </p>

            <p>
                <strong>Company Name:</strong>
                ${escapeHtml(cleanCompanyName || 'Not provided')}
            </p>

            <p>
                <strong>Email:</strong>
                ${escapeHtml(cleanEmail)}
            </p>

            <p>
                <strong>Phone:</strong>
                ${escapeHtml(cleanPhone || 'Not provided')}
            </p>

            <p>
                <strong>Service Needed:</strong>
                ${escapeHtml(cleanService)}
            </p>

            <p>
                <strong>Message:</strong>
            </p>

            <p>
                ${escapeHtml(cleanMessage).replace(/\n/g, '<br>')}
            </p>
        `;

        const resendResponse = await fetch(
            'https://api.resend.com/emails',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },

                body: JSON.stringify({
                    from: 'StandardWise Website <website@standardwise-cpa.com>',

                    to: ['info@standardwise-cpa.com'],

                    reply_to: cleanEmail,

                    subject: `New Consultation Request from ${cleanFullName}`,

                    html: html
                })
            }
        );

        const result = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error('Resend error:', result);

            return res.status(502).json({
                error: 'We could not send your request right now. Please try again later.'
            });
        }

        return res.status(200).json({
            success: true
        });

    } catch (error) {
        console.error('Consultation form error:', error);

        return res.status(500).json({
            error: 'Something went wrong. Please try again later.'
        });
    }
}
