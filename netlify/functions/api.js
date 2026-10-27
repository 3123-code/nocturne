import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export async function handler(event, context) {
  const pathSegments = event.path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  const method = event.httpMethod;

  let body = {};
  try {
    if (event.body) {
      body = JSON.parse(event.body);
    }
  } catch (e) {
    // ignore json parse error
  }

  // Load SMTP config
  let smtpConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'Rumpabhowmik1992@gmail.com',
    pass: 'dxql fogi jrxo sthm',
    from: '"Nocturne Security" <Rumpabhowmik1992@gmail.com>',
  };

  try {
    const configPath = path.resolve(process.cwd(), '.smtp-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.host && parsed.user && parsed.pass) {
        smtpConfig = parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading .smtp-config.json in Netlify function:', err);
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  // 1. GET /api/auth/smtp-status
  if (pathSegments.includes('auth/smtp-status') && method === 'GET') {
    const maskedUser = smtpConfig.user.replace(/^(.)(.*)(@.*)$/, (_, first, mid, domain) => {
      return `${first}${'*'.repeat(Math.max(1, mid.length))}${domain}`;
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isConfigured: true,
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: maskedUser,
        from: smtpConfig.from || smtpConfig.user,
      }),
    };
  }

  // 2. POST /api/auth/configure-smtp
  if (pathSegments.includes('auth/configure-smtp') && method === 'POST') {
    const { host, port, secure, user, pass, from } = body;
    if (!host || !user || !pass) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Host, Username (email), and Password/App Password are required.' }),
      };
    }

    const newConfig = {
      host: host.trim(),
      port: port ? parseInt(port, 10) : 587,
      secure: Boolean(secure),
      user: user.trim(),
      pass: pass.trim(),
      from: from?.trim() || `"Nocturne Security" <${user.trim()}>`,
    };

    try {
      const testTransporter = nodemailer.createTransport({
        host: newConfig.host,
        port: newConfig.port,
        secure: newConfig.secure,
        auth: { user: newConfig.user, pass: newConfig.pass },
      });
      await testTransporter.verify();

      try {
        fs.writeFileSync(path.resolve(process.cwd(), '.smtp-config.json'), JSON.stringify(newConfig, null, 2), 'utf8');
      } catch (e) {
        // ignore fs write error on read-only filesystems
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: `Successfully connected to ${newConfig.host} as ${newConfig.user}!`,
        }),
      };
    } catch (err) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Could not authenticate with SMTP server. Please verify your Gmail App Password.',
        }),
      };
    }
  }

  // 3. POST /api/auth/test-email
  if (pathSegments.includes('auth/test-email') && method === 'POST') {
    const { email } = body;
    if (!email) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Target email is required.' }),
      };
    }

    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const info = await transporter.sendMail({
        from: smtpConfig.from || `"Nocturne Security" <${smtpConfig.user}>`,
        to: email,
        subject: 'Nocturne Mailbox Verification Test',
        html: `
          <div style="font-family: Arial, sans-serif; background: #0a0a0f; color: #f5f5f5; padding: 32px 16px; text-align: center;">
            <div style="max-width: 440px; margin: 0 auto; background: #12121a; border: 1px solid #27273a; border-radius: 14px; padding: 24px;">
              <h2 style="color: #ffffff; margin-bottom: 8px;">Netlify Delivery Test Successful</h2>
              <p style="color: #a1a1aa; font-size: 14px;">Your Nocturne email system on Netlify is connected to your mailbox (${email}).</p>
              <div style="background: #181824; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 28px; font-weight: bold; color: #818cf8; letter-spacing: 6px;">
                ${testCode}
              </div>
            </div>
          </div>
        `,
        text: `Nocturne test verification code: ${testCode}`,
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: `Real test email successfully delivered to ${email}!`,
          messageId: info.messageId,
        }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Delivery failed: ${err.message}` }),
      };
    }
  }

  // 4. POST /api/auth/send-otp
  if (pathSegments.includes('auth/send-otp') && method === 'POST') {
    const { email, otp, purpose } = body;
    if (!email || !otp) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email and OTP are required' }),
      };
    }

    const isRegistration = purpose === 'register';
    const subject = isRegistration
      ? 'Verify your Nocturne Account (OTP)'
      : 'Reset your Nocturne Password (OTP)';

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f; color: #f5f5f5; padding: 40px 20px; text-align: center;">
        <div style="max-width: 480px; margin: 0 auto; background: #12121a; border: 1px solid #27273a; border-radius: 16px; padding: 32px 24px;">
          <h2 style="color: #ffffff; margin-bottom: 8px; font-size: 20px;">${subject}</h2>
          <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            ${isRegistration ? 'Thank you for joining Nocturne. Enter the 6-digit verification code below to complete your registration:' : 'We received a request to reset your password. Use the code below to verify your identity:'}
          </p>
          <div style="background: #181824; border: 1px solid #373752; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #818cf8;">${otp}</span>
          </div>
          <p style="color: #71717a; font-size: 12px; margin: 0;">
            This code expires in 10 minutes.
          </p>
        </div>
      </div>
    `;

    try {
      const info = await transporter.sendMail({
        from: smtpConfig.from || `"Nocturne Security" <${smtpConfig.user}>`,
        to: email,
        subject,
        html: htmlContent,
        text: `Your Nocturne OTP verification code is: ${otp}`,
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: `Verification code delivered directly to your mailbox (${email})`,
          deliveredOtp: otp,
          isRealMailboxDelivered: true,
          messageId: info.messageId,
        }),
      };
    } catch (err) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: `Verification code generated for ${email}`,
          deliveredOtp: otp,
          isRealMailboxDelivered: false,
          deliveryError: err.message,
        }),
      };
    }
  }

  // 5. GET /api/health
  if (pathSegments.includes('health')) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok', service: 'netflfy-serverless-mailer' }),
    };
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Endpoint not found' }),
  };
}
