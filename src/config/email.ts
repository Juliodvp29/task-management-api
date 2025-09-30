import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

// Email configuration interface
export interface EmailConfig {
  host: string;       // SMTP server host (e.g., smtp.gmail.com)
  port: number;       // SMTP server port (e.g., 587 for TLS)
  secure: boolean;    // Whether to use SSL (true for port 465, false for others)
  auth: {
    user: string;     // SMTP username (usually the email address)
    pass: string;     // SMTP password or app-specific password
  };
  from: {
    name: string;     // Default "From" display name
    email: string;    // Default "From" email address
  };
}

// Load email configuration from environment variables or fallback defaults
const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || ''
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Task Management API',
    email: process.env.EMAIL_FROM_ADDRESS || 'noreply@taskmanagement.com'
  }
};

// Singleton transporter instance (created only once)
let transporter: Transporter | null = null;

// Lazily initialize and return a Nodemailer transporter
export const getEmailTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass
      }
    });
  }
  return transporter;
};

// Verify SMTP configuration (check if the transporter can connect)
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    const transporter = getEmailTransporter();
    await transporter.verify(); // Attempts connection with SMTP server
    return true;
  } catch (error) {
    return false;
  }
};

// Send an email with both HTML and plain-text fallback
export const sendEmail = async (
  to: string,          // Recipient email
  subject: string,     // Email subject
  html: string,        // Email body in HTML format
  text?: string        // Optional plain-text body
): Promise<void> => {
  try {
    const transporter = getEmailTransporter();

    await transporter.sendMail({
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`, // Custom sender
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Fallback: strip HTML tags if plain text not provided
    });

  } catch (error) {
    throw error;
  }
};

// Export configuration for external use
export { emailConfig };

