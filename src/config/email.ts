// src/config/email.ts
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || ''
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Task Management API',
    email: process.env.EMAIL_FROM_ADDRESS || 'noreply@taskmanagement.com'
  }
};

// Crear transporter
let transporter: Transporter | null = null;

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

// Verificar configuración de email
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    const transporter = getEmailTransporter();
    await transporter.verify();
    console.log('✅ Configuración de email verificada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error verificando configuración de email:', error);
    return false;
  }
};

// Función para enviar email genérico
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  try {
    const transporter = getEmailTransporter();

    await transporter.sendMail({
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Fallback a texto plano
    });

    console.log(`✅ Email enviado exitosamente a ${to}`);
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
};

export { emailConfig };

