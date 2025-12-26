import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendDownloadEmailParams {
  to: string;
  collectionTitle: string;
  totalPhotos: number;
  downloadToken: string;
  expiresAt: Date;
  urls: string[];
}

export async function sendDownloadReadyEmail({
  to,
  collectionTitle,
  totalPhotos,
  downloadToken,
  expiresAt,
  urls
}: SendDownloadEmailParams) {
  const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fotos.zeth.com.py'}/download/${downloadToken}`;
  
  const expiresInHours = Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@zeth.com.py',
      to: [to],
      subject: `✅ Tu descarga está lista: ${collectionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">📦 Tu Descarga está Lista</h1>
            <p style="color: #666; font-size: 14px;">RENÉ RIVAROLA PHOTOGRAPHY</p>
          </div>

          <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin-top: 0; color: #1f2937;">${collectionTitle}</h2>
            
            <div style="margin: 16px 0;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280;">Total de fotos:</span>
                <strong>${totalPhotos}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280;">Archivos ZIP:</span>
                <strong>${urls.length}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="color: #6b7280;">Expira en:</span>
                <strong>${expiresInHours} horas</strong>
              </div>
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${downloadUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Descargar Archivos
            </a>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 24px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⏱️ <strong>Importante:</strong> Este enlace expira en ${expiresInHours} horas. Descarga tus archivos antes de que expire.
            </p>
          </div>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
              💡 <strong>Tip:</strong> Los archivos ZIP son independientes. Cada uno se puede extraer por separado con la herramienta de compresión de tu sistema.
            </p>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              RENÉ RIVAROLA PHOTOGRAPHY<br>
              <a href="https://fotos.zeth.com.py" style="color: #2563eb; text-decoration: none;">fotos.zeth.com.py</a>
            </p>
          </div>

        </body>
        </html>
      `
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    console.log('✅ Email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email send exception:', error);
    return { success: false, error };
  }
}
