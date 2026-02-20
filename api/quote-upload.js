const sgMail = require('@sendgrid/mail');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form with file upload
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      keepExtensions: true,
      uploadDir: '/tmp',
    });

    const [fields, files] = await form.parse(req);
    
    // Extract form data (formidable returns arrays)
    const formData = {};
    Object.keys(fields).forEach(key => {
      formData[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
    });

    // Handle uploaded file
    let attachment = null;
    if (files.payrollFile && files.payrollFile[0]) {
      const file = files.payrollFile[0];
      
      // Read file and create attachment
      const fileContent = fs.readFileSync(file.filepath);
      const fileExtension = path.extname(file.originalFilename || file.newFilename);
      
      attachment = {
        content: fileContent.toString('base64'),
        filename: file.originalFilename || `payroll-report${fileExtension}`,
        type: file.mimetype || 'application/octet-stream',
        disposition: 'attachment',
      };
      
      // Clean up temp file
      fs.unlinkSync(file.filepath);
    }

    // Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1E3A5F; border-bottom: 3px solid #F5A623; padding-bottom: 10px;">
          🎯 New Self-Service Quote Request
        </h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1E3A5F; margin-top: 0;">Company Information</h3>
          <p><strong>Company:</strong> ${formData.companyName}</p>
          <p><strong>Industry:</strong> ${formData.industry}</p>
          <p><strong>Employee Count:</strong> ${formData.employeeCount}</p>
          <p><strong>Location:</strong> ${formData.companyLocation}</p>
        </div>

        <div style="background: #fff; padding: 20px; border-left: 4px solid #4A90A4; margin: 20px 0;">
          <h3 style="color: #1E3A5F; margin-top: 0;">Contact Details</h3>
          <p><strong>Name:</strong> ${formData.contactName}</p>
          <p><strong>Title:</strong> ${formData.title}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Phone:</strong> ${formData.phone || 'Not provided'}</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1E3A5F; margin-top: 0;">Current Benefits</h3>
          <p><strong>Current Carrier:</strong> ${formData.currentCarrier || 'Not specified'}</p>
          <p><strong>Monthly Premium Range:</strong> ${formData.monthlyPremium || 'Not specified'}</p>
          ${formData.currentChallenges ? `<p><strong>Current Challenges:</strong></p><p style="background: #fff; padding: 15px; border-radius: 4px; border-left: 3px solid #F5A623;">${formData.currentChallenges}</p>` : ''}
        </div>

        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #1E3A5F; margin-top: 0;">Urgency & Next Steps</h3>
          <p><strong>Timeline:</strong> ${formData.timing}</p>
          <p><strong>Payroll File:</strong> ${attachment ? `✅ Attached (${attachment.filename}) - Can provide exact calculations` : '📊 No file uploaded - Provide estimate based on employee count'}</p>
          
          <div style="background: #fff; padding: 15px; border-radius: 4px; margin-top: 15px;">
            <strong>Action Required:</strong>
            <ul style="margin: 10px 0;">
              <li>${attachment ? 'Review payroll data (see attachment) for exact calculations' : 'Use employee count (' + formData.employeeCount + ') for estimated calculations'}</li>
              <li>Calculate FICA savings and total ROI ${attachment ? 'with actual payroll numbers' : 'using industry averages'}</li>
              <li>Prepare custom quote with implementation timeline</li>
              <li><strong>Respond within 24 hours as promised</strong></li>
            </ul>
          </div>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p style="margin: 0;"><strong>⚡ Priority Level:</strong> ${formData.timing === 'asap' ? 'HIGH - They need info ASAP' : formData.timing === '1-month' ? 'MEDIUM - 1 month timeline' : 'STANDARD'}</p>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 2px solid #e9ecef;">
        
        <div style="background: #1E3A5F; color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0 0 10px 0;">Next Steps</h3>
          <p style="margin: 0;">Process this quote request and respond to <strong>${formData.email}</strong> within 24 hours with detailed savings analysis and implementation plan.</p>
        </div>

        <p style="font-size: 12px; color: #6c757d; margin-top: 30px; text-align: center;">
          Generated from OptivHealthBenefits.com self-service quote system<br>
          Timestamp: ${new Date().toLocaleString('en-US', { 
            timeZone: 'America/Boise',
            dateStyle: 'full',
            timeStyle: 'short'
          })}
        </p>
      </div>
    `;

    // Send email to Bryce with CC to Brian
    const msg = {
      to: 'bryce@gullstack.com',
      cc: 'brian@optivhealthbenefits.com',
      from: 'leads@gullstack.com',
      subject: `🎯 Quote Request: ${formData.companyName} (${formData.employeeCount} employees)`,
      html: emailHtml,
      attachments: attachment ? [attachment] : [],
    };

    await sgMail.send(msg);

    // Send confirmation email to customer
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1E3A5F; margin-bottom: 10px;">Quote Request Received ✅</h1>
          <p style="color: #4A90A4; font-size: 18px; margin: 0;">We're already working on your custom analysis</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1E3A5F; margin-top: 0;">What happens next:</h3>
          
          <div style="margin: 20px 0;">
            <div style="display: flex; align-items: center; margin: 15px 0;">
              <div style="background: #28a745; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">1</div>
              <div>
                <strong>Within 2 hours:</strong> Confirmation that we've received your payroll data
              </div>
            </div>
            
            <div style="display: flex; align-items: center; margin: 15px 0;">
              <div style="background: #F5A623; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">2</div>
              <div>
                <strong>Within 24 hours:</strong> Your detailed quote with exact savings amounts
              </div>
            </div>
            
            <div style="display: flex; align-items: center; margin: 15px 0;">
              <div style="background: #4A90A4; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">3</div>
              <div>
                <strong>Your choice:</strong> Schedule a call or proceed with implementation
              </div>
            </div>
          </div>
        </div>

        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h4 style="color: #28a745; margin: 0 0 15px 0;">Your Quote Will Include:</h4>
          <p style="margin: 5px 0;">💰 Exact FICA tax savings calculation</p>
          <p style="margin: 5px 0;">📊 Total ROI analysis for your specific payroll</p>
          <p style="margin: 5px 0;">📋 Implementation timeline and next steps</p>
          <p style="margin: 5px 0;">📞 Direct calendar link to schedule a discussion</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #6c757d;">While you wait, feel free to explore:</p>
          <div style="margin: 20px 0;">
            <a href="https://optivhealthbenefits.com/calculator/" style="display: inline-block; background: #4A90A4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px 10px 0;">Savings Calculator</a>
            <a href="https://optivhealthbenefits.com/blog/" style="display: inline-block; background: #1E3A5F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px 10px 0;">Benefits Research</a>
          </div>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e9ecef;">

        <div style="text-align: center; color: #6c757d; font-size: 14px;">
          <p><strong>Questions?</strong> Simply reply to this email.</p>
          <p style="margin-top: 20px;">
            Optiv Health Benefits<br>
            Supplemental Health Plans & Section 125 Solutions<br>
            <a href="https://optivhealthbenefits.com" style="color: #4A90A4;">OptivHealthBenefits.com</a>
          </p>
        </div>
      </div>
    `;

    const confirmationMsg = {
      to: formData.email,
      from: 'leads@gullstack.com',
      subject: 'Quote Request Received - Custom Analysis Coming Within 24 Hours',
      html: confirmationHtml,
    };

    try {
      await sgMail.send(confirmationMsg);
    } catch (confirmationError) {
      console.error('Failed to send confirmation email:', confirmationError);
      // Don't fail the main request if confirmation email fails
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Quote request submitted successfully',
      hasAttachment: !!attachment 
    });

  } catch (error) {
    console.error('Quote submission error:', error);
    return res.status(500).json({ 
      error: 'Failed to submit quote request',
      details: error.message 
    });
  }
}