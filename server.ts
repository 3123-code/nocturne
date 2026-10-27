import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SMTP_CONFIG_FILE = path.resolve(__dirname, '.smtp-config.json');

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from?: string;
}

// In-memory SMTP state
let currentSmtpConfig: SmtpConfig | null = null;
let transporter: Transporter | null = null;
let isRealSmtpActive = false;

// 1. Load config from .smtp-config.json if available
if (fs.existsSync(SMTP_CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(SMTP_CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.host && parsed.user && parsed.pass) {
      currentSmtpConfig = parsed;
    }
  } catch (err) {
    console.warn('[Nocturne Mailer] Error reading .smtp-config.json:', err);
  }
}

// 2. Fall back to process.env if not in file
if (!currentSmtpConfig && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  currentSmtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || `"Nocturne Security" <${process.env.SMTP_USER}>`,
  };
}

// 3. Built-in production default credentials
if (!currentSmtpConfig) {
  currentSmtpConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'Rumpabhowmik1992@gmail.com',
    pass: 'dxql fogi jrxo sthm',
    from: '"Nocturne Security" <Rumpabhowmik1992@gmail.com>',
  };
}

// Helper to initialize transporter from config
async function initTransporterFromConfig(config: SmtpConfig): Promise<boolean> {
  try {
    const t = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await t.verify();
    transporter = t;
    currentSmtpConfig = config;
    isRealSmtpActive = true;
    console.log(`[Nocturne Mailer] Real SMTP connected to ${config.host}:${config.port} as ${config.user}`);
    return true;
  } catch (err: any) {
    console.warn(`[Nocturne Mailer] SMTP verification failed for ${config.host}:`, err.message);
    return false;
  }
}

// Initialize on startup if config is present
if (currentSmtpConfig) {
  initTransporterFromConfig(currentSmtpConfig);
} else {
  // Use Ethereal test transporter for fallback
  nodemailer
    .createTestAccount()
    .then((account) => {
      if (!isRealSmtpActive) {
        transporter = nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: {
            user: account.user,
            pass: account.pass,
          },
        });
        console.log(`[Nocturne Mailer] Sandbox mailbox ready: ${account.user}`);
      }
    })
    .catch((err) => {
      console.warn('[Nocturne Mailer] Sandbox mailer init note:', err.message);
    });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: Check SMTP configuration status
  app.get('/api/auth/smtp-status', (_req, res) => {
    if (isRealSmtpActive && currentSmtpConfig) {
      const maskedUser = currentSmtpConfig.user.replace(/^(.)(.*)(@.*)$/, (_, first, mid, domain) => {
        return `${first}${'*'.repeat(Math.max(1, mid.length))}${domain}`;
      });

      return res.json({
        isConfigured: true,
        host: currentSmtpConfig.host,
        port: currentSmtpConfig.port,
        user: maskedUser,
        from: currentSmtpConfig.from || currentSmtpConfig.user,
      });
    }

    return res.json({
      isConfigured: false,
      message: 'No external SMTP relay configured. Operating in Instant Sandbox mode.',
    });
  });

  // API Route: Configure real SMTP in real-time
  app.post('/api/auth/configure-smtp', async (req, res) => {
    const { host, port, secure, user, pass, from } = req.body;

    if (!host || !user || !pass) {
      return res.status(400).json({ error: 'Host, Username (email), and Password/App Password are required.' });
    }

    const config: SmtpConfig = {
      host: host.trim(),
      port: port ? parseInt(port, 10) : 587,
      secure: Boolean(secure),
      user: user.trim(),
      pass: pass.trim(),
      from: from?.trim() || `"Nocturne Security" <${user.trim()}>`,
    };

    const success = await initTransporterFromConfig(config);
    if (!success) {
      return res.status(400).json({
        error:
          'Could not authenticate with SMTP server. For Gmail, please make sure you are using a 16-character Google App Password (not your normal Gmail password), with 2-Step Verification enabled.',
      });
    }

    // Persist to .smtp-config.json
    try {
      fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (err) {
      console.warn('Could not write .smtp-config.json:', err);
    }

    return res.json({
      success: true,
      message: `Successfully connected to ${config.host} as ${config.user}! Emails will now be delivered directly to real mailboxes.`,
    });
  });

  // API Route: Test email delivery to specified address
  app.post('/api/auth/test-email', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Target email is required.' });
    }

    if (!isRealSmtpActive || !transporter || !currentSmtpConfig) {
      return res.status(400).json({
        error: 'Real SMTP is not configured yet. Please configure your Gmail or SMTP credentials first.',
      });
    }

    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const sender = currentSmtpConfig.from || `"Nocturne Security" <${currentSmtpConfig.user}>`;
      const info = await transporter.sendMail({
        from: sender,
        to: email,
        subject: 'Nocturne Mailbox Verification Test',
        html: `
          <div style="font-family: Arial, sans-serif; background: #0a0a0f; color: #f5f5f5; padding: 32px 16px; text-align: center;">
            <div style="max-width: 440px; margin: 0 auto; background: #12121a; border: 1px solid #27273a; border-radius: 14px; padding: 24px;">
              <h2 style="color: #ffffff; margin-bottom: 8px;">Delivery Test Successful</h2>
              <p style="color: #a1a1aa; font-size: 14px;">Your Nocturne email system is connected to your mailbox (${email}).</p>
              <div style="background: #181824; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 28px; font-weight: bold; color: #818cf8; letter-spacing: 6px;">
                ${testCode}
              </div>
              <p style="color: #71717a; font-size: 12px;">This confirms that verification emails will arrive directly in your inbox.</p>
            </div>
          </div>
        `,
        text: `Nocturne test verification code: ${testCode}`,
      });

      console.log(`[Nocturne Mailer] Test email delivered to ${email}: ${info.messageId}`);
      return res.json({
        success: true,
        message: `Real test email successfully delivered to ${email}! Please check your Inbox and Spam folders.`,
        messageId: info.messageId,
      });
    } catch (err: any) {
      console.error('[Nocturne Mailer] Test email failed:', err);
      return res.status(500).json({
        error: `Delivery failed: ${err.message}`,
      });
    }
  });

  // API Route: Send OTP email for registration or password reset
  app.post('/api/auth/send-otp', async (req, res) => {
    const { email, otp, purpose } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const isRegistration = purpose === 'register';
    const subject = isRegistration
      ? 'Verify your Nocturne Account (OTP)'
      : 'Reset your Nocturne Password (OTP)';

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f; color: #f5f5f5; padding: 40px 20px; text-align: center;">
        <div style="max-width: 480px; margin: 0 auto; background: #12121a; border: 1px solid #27273a; border-radius: 16px; padding: 32px 24px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #ffffff; font-weight: bold; font-size: 20px; line-height: 48px;">N</span>
          </div>
          <h2 style="color: #ffffff; margin-bottom: 8px; font-size: 20px;">${subject}</h2>
          <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            ${isRegistration ? 'Thank you for joining Nocturne. Enter the 6-digit verification code below to complete your registration:' : 'We received a request to reset your password. Use the code below to verify your identity:'}
          </p>
          <div style="background: #181824; border: 1px solid #373752; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #818cf8;">${otp}</span>
          </div>
          <p style="color: #71717a; font-size: 12px; margin: 0;">
            This code expires in 10 minutes. If you did not request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    try {
      let previewUrl: string | undefined;
      let deliveredToRealInbox = false;

      if (transporter) {
        const sender = isRealSmtpActive && currentSmtpConfig?.from
          ? currentSmtpConfig.from
          : (isRealSmtpActive && currentSmtpConfig?.user)
          ? `"Nocturne Security" <${currentSmtpConfig.user}>`
          : '"Nocturne Security" <security@nocturne.network>';

        const info = await transporter.sendMail({
          from: sender,
          to: email,
          subject,
          html: htmlContent,
          text: `Your Nocturne OTP verification code is: ${otp}. It expires in 10 minutes.`,
        });

        if (isRealSmtpActive) {
          deliveredToRealInbox = true;
          console.log(`[Nocturne Mailer] REAL MAILBOX DELIVERY to ${email}. ID: ${info.messageId}`);
        } else {
          previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
          console.log(`[Nocturne Mailer] Sandbox preview created for ${email}: ${previewUrl}`);
        }
      }

      return res.json({
        success: true,
        message: deliveredToRealInbox
          ? `Verification code delivered directly to your mailbox (${email})`
          : `Verification code generated for ${email}`,
        previewUrl,
        deliveredOtp: otp,
        isRealMailboxDelivered: deliveredToRealInbox,
      });
    } catch (err: any) {
      console.error('[Nocturne Mailer] Error sending mail:', err);
      return res.json({
        success: true,
        message: `Verification code generated for ${email}`,
        deliveredOtp: otp,
        isRealMailboxDelivered: false,
        deliveryError: err.message,
      });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'nocturne-backend',
      smtpActive: isRealSmtpActive,
    });
  });

  // Vite middleware in dev or static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nocturne server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

