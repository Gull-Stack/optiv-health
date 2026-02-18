export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      name,
      email,
      phone,
      company,
      employees,
      role,
      message,
      fax_number,
      _timestamp
    } = req.body;

    // Honeypot check - if fax_number is filled, it's a bot
    if (fax_number) {
      console.log('Bot detected via honeypot');
      return res.status(200).json({ message: 'Thank you!' });
    }

    // Basic timestamp check (prevent very fast submissions)
    const submissionTime = Date.now();
    const formLoadTime = parseInt(_timestamp);
    if (submissionTime - formLoadTime < 3000) { // Less than 3 seconds
      console.log('Suspicious fast submission');
      return res.status(200).json({ message: 'Thank you!' });
    }

    // Basic validation
    if (!name || !email || !company || !employees) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    // Create the email body
    const emailBody = `
New Optiv Health Lead Submission

Contact Information:
• Name: ${name}
• Email: ${email}
• Phone: ${phone || 'Not provided'}
• Company: ${company}
• Role: ${role || 'Not specified'}

Company Details:
• Number of Employees: ${employees}
• Additional Message: ${message || 'None provided'}

Submitted: ${new Date().toLocaleString('en-US', { 
  timeZone: 'America/Denver',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short'
})}

Lead Source: Optiv Health Website (optiv-health.vercel.app)
`;

    // Send email using SendGrid (if API key is configured)
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const mailOptions = {
        to: 'bryce@gullstack.com',
        from: 'leads@gullstack.com', // Must be verified with SendGrid
        subject: `🏥 New Optiv Health Lead: ${company} (${employees} employees)`,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>').replace(/•/g, '&bull;'),
        replyTo: email
      };

      await sgMail.send(mailOptions);
      console.log('Email sent via SendGrid to bryce@gullstack.com');
    } else {
      // Log the submission if SendGrid isn't configured
      console.log('New Optiv Health lead submission (SendGrid not configured):');
      console.log(emailBody);
    }

    // Send success response
    res.status(200).json({ 
      message: 'Thank you for your interest! We\'ll be in touch within 24 hours.' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      message: 'Internal server error. Please try again or contact us directly.' 
    });
  }
}