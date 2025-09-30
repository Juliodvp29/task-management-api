import { sendEmail } from '../config/email.js';

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getPasswordChangeTemplate = (userName: string, code: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de Verificación</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                    🔐 Cambio de Contraseña
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                    Hola <strong>${userName}</strong>,
                  </p>
                  
                  <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 0 0 30px;">
                    Hemos recibido una solicitud para cambiar la contraseña de tu cuenta. 
                    Para continuar, por favor usa el siguiente código de verificación:
                  </p>
                  
                  <!-- Verification Code Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px;">
                    <tr>
                      <td align="center" style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 30px;">
                        <p style="color: #999999; font-size: 12px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">
                          Código de Verificación
                        </p>
                        <p style="color: #667eea; font-size: 36px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                          ${code}
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 0 0 30px; border-radius: 4px;">
                    <p style="color: #856404; font-size: 13px; margin: 0; line-height: 20px;">
                      ⏱️ <strong>Este código expirará en 10 minutos.</strong><br>
                      Si no solicitaste este cambio, por favor ignora este correo.
                    </p>
                  </div>
                  
                  <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 0;">
                    Por tu seguridad, nunca compartas este código con nadie.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #999999; font-size: 12px; margin: 0 0 10px;">
                    Task Management API - Sistema de Gestión de Tareas
                  </p>
                  <p style="color: #cccccc; font-size: 11px; margin: 0;">
                    © ${new Date().getFullYear()} Todos los derechos reservados
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const sendPasswordChangeCode = async (
  email: string,
  userName: string,
  code: string
): Promise<void> => {
  const subject = '🔐 Código de Verificación para Cambio de Contraseña';
  const html = getPasswordChangeTemplate(userName, code);

  await sendEmail(email, subject, html);
};

const getPasswordChangedTemplate = (userName: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contraseña Cambiada</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                    ✅ Contraseña Actualizada
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                    Hola <strong>${userName}</strong>,
                  </p>
                  
                  <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 0 0 20px;">
                    Te confirmamos que la contraseña de tu cuenta ha sido cambiada exitosamente.
                  </p>
                  
                  <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 0 0 20px; border-radius: 4px;">
                    <p style="color: #065f46; font-size: 13px; margin: 0; line-height: 20px;">
                      ✓ Tu contraseña fue actualizada el ${new Date().toLocaleString('es-ES')}.
                    </p>
                  </div>
                  
                  <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 0 0 20px; border-radius: 4px;">
                    <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 20px;">
                      ⚠️ <strong>¿No fuiste tú?</strong><br>
                      Si no realizaste este cambio, por favor contacta inmediatamente con soporte.
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #999999; font-size: 12px; margin: 0 0 10px;">
                    Task Management API - Sistema de Gestión de Tareas
                  </p>
                  <p style="color: #cccccc; font-size: 11px; margin: 0;">
                    © ${new Date().getFullYear()} Todos los derechos reservados
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const sendPasswordChangedConfirmation = async (
  email: string,
  userName: string
): Promise<void> => {
  const subject = '✅ Contraseña Actualizada Exitosamente';
  const html = getPasswordChangedTemplate(userName);

  await sendEmail(email, subject, html);
};