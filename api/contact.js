const sgMail = require('@sendgrid/mail');

function isGibberish(text) {
  if (!text || text.length < 2) return false;
  const cleaned = text.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length < 2) return false;
  const vowels = cleaned.match(/[aeiou]/g);
  if (!vowels || vowels.length < cleaned.length * 0.15) return true;
  if (/[^aeiou]{5,}/i.test(cleaned)) return true;
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, phone, company, employees, message } = req.body;

    // Honeypot check
    if (req.body.fax_number) {
      return res.status(200).json({ message: "Thank you! We'll be in touch within 24 hours." });
    }

    // Gibberish detection
    if (isGibberish(name)) {
      console.log('Gibberish name detected');
      return res.status(200).json({ message: 'Thank you!' });
    }
    if (name && name.trim().length < 2) {
      console.log('Suspiciously short name');
      return res.status(200).json({ message: 'Thank you!' });
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const emailBody = `
New Contact from Optiv Health Benefits

Name: ${name || 'N/A'}
Email: ${email || 'N/A'}
Phone: ${phone || 'N/A'}
Company: ${company || 'N/A'}
Employees: ${employees || 'N/A'}

Message:
${message || 'No message provided'}
    `.trim();

    // Notification to Brian + CC Bryce
    await sgMail.send({
      to: 'brian@optivhealthbenefits.com',
      cc: 'bryce@gullstack.com',
      from: 'leads@gullstack.com',
      subject: `New Contact: ${name || 'Unknown'} from ${company || 'Unknown Company'}`,
      text: emailBody,
      replyTo: email || undefined,
    });

    // Auto-reply
    if (email) {
      await sgMail.send({
        to: email,
        from: 'leads@gullstack.com',
        subject: 'Thanks for contacting Optiv Health Benefits',
        text: `Hi ${name || 'there'},\n\nThank you for reaching out to Optiv Health Benefits. We've received your message and will get back to you within 24 hours.\n\nBest regards,\nOptiv Health Benefits Team`,
      });
    }

    return res.status(200).json({ message: "Thank you! We'll be in touch within 24 hours." });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};
