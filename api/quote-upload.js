const sgMail = require('@sendgrid/mail');
const { IncomingForm } = require('formidable');
const fs = require('fs');

// Disable body parser for multipart form data
const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function flatten(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields: rawFields, files } = await parseForm(req);
    const fields = flatten(rawFields);

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const emailBody = `
New Quote Request from Optiv Health Benefits

Contact Information:
- Name: ${fields.contactName || 'N/A'}
- Email: ${fields.email || 'N/A'}
- Phone: ${fields.phone || 'N/A'}
- Title: ${fields.title || 'N/A'}

Company Information:
- Company: ${fields.companyName || 'N/A'}
- Location: ${fields.companyLocation || 'N/A'}
- Industry: ${fields.industry || 'N/A'}
- Employees: ${fields.employeeCount || 'N/A'}

Current Coverage:
- Carrier: ${fields.currentCarrier || 'N/A'}
- Monthly Premium: ${fields.monthlyPremium || 'N/A'}
- Challenges: ${fields.currentChallenges || 'N/A'}

Timeline: ${fields.timing || 'N/A'}
Additional Details: ${fields.description || 'N/A'}

${files.payrollFile ? `Payroll file attached: ${Array.isArray(files.payrollFile) ? files.payrollFile[0].originalFilename : files.payrollFile.originalFilename}` : 'No payroll file attached'}
    `.trim();

    const attachments = [];
    const payrollFile = files.payrollFile ? (Array.isArray(files.payrollFile) ? files.payrollFile[0] : files.payrollFile) : null;
    
    if (payrollFile && payrollFile.filepath) {
      const fileBuffer = fs.readFileSync(payrollFile.filepath);
      attachments.push({
        content: fileBuffer.toString('base64'),
        filename: payrollFile.originalFilename || 'payroll-data',
        type: payrollFile.mimetype || 'application/octet-stream',
        disposition: 'attachment',
      });
    }

    const msg = {
      to: 'brian@optivhealthbenefits.com',
      cc: 'bryce@gullstack.com',
      from: 'leads@gullstack.com',
      subject: `New Quote Request: ${fields.companyName || 'Unknown Company'} (${fields.employeeCount || '?'} employees)`,
      text: emailBody,
      ...(attachments.length > 0 && { attachments }),
    };

    await sgMail.send(msg);

    if (fields.email) {
      const autoReply = {
        to: fields.email,
        from: 'leads@gullstack.com',
        subject: 'Your Optiv Health Benefits Quote Request',
        text: `Hi ${fields.contactName || 'there'},\n\nThank you for requesting a quote from Optiv Health Benefits. We've received your information and our team will review it within 24 hours.\n\nWith payroll data, we'll provide exact savings numbers. Without it, we'll provide estimates based on your company size.\n\nWe'll be in touch soon!\n\nOptiv Health Benefits Team`,
      };
      await sgMail.send(autoReply);
    }

    return res.status(200).json({ message: 'Quote request submitted successfully!' });
  } catch (error) {
    console.error('Quote submission error:', error);
    return res.status(500).json({ 
      error: 'Failed to submit quote request', 
      details: error.message 
    });
  }
}

module.exports = handler;
module.exports.config = config;
