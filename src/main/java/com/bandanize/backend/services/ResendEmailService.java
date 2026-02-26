package com.bandanize.backend.services;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ResendEmailService implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(ResendEmailService.class);

    private final Resend resend;

    @Value("${resend.from.email}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    public ResendEmailService(@Value("${resend.api.key}") String apiKey) {
        if (apiKey == null || apiKey.isEmpty()) {
            logger.warn("Resend API key is missing. Email sending will fail.");
            this.resend = null;
        } else {
            this.resend = new Resend(apiKey);
        }
    }

    private String getEmailTemplate(String content) {
        String logoUrl = frontendUrl + "/apple-touch-icon.png";
        return "<div style=\"font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; color: #333;\">"
                +
                "  <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e0e0e0;\">"
                +
                "    <img src=\"" + logoUrl
                + "\" alt=\"Bandanize Logo\" style=\"width: 64px; height: 64px; border-radius: 12px; margin-bottom: 10px;\">"
                +
                "    <h1 style=\"margin: 0; font-size: 24px; color: #1a1a1a;\">Bandanize</h1>" +
                "  </div>" +
                "  <div style=\"padding: 30px; line-height: 1.6; font-size: 16px;\">" +
                content +
                "  </div>" +
                "  <div style=\"background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0;\">"
                +
                "    <p style=\"margin: 0;\">&copy; 2026 Bandanize. Todos los derechos reservados.</p>" +
                "  </div>" +
                "</div>";
    }

    @Override
    public void sendPasswordReset(String to, String token) {
        if (resend == null) {
            logger.warn("Skipping email send: Resend client not initialized.");
            return;
        }

        String resetLink = frontendUrl + "/reset-password?token=" + token;

        String content = "<h3>Restablecer Contraseña</h3>" +
                "<p>Has solicitado restablecer tu contraseña en Bandanize.</p>" +
                "<p>Haz clic en el botón de abajo para elegir una nueva contraseña:</p>" +
                "<p style=\"margin: 30px 0;\">" +
                "  <a href=\"" + resetLink
                + "\" style=\"background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;\">Restablecer Contraseña</a>"
                +
                "</p>" +
                "<p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>";

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from(fromEmail)
                .to(to)
                .subject("Restablecer contraseña - Bandanize")
                .html(getEmailTemplate(content))
                .build();

        try {
            CreateEmailResponse data = resend.emails().send(params);
            logger.info("Password reset email sent. ID: " + data.getId());
        } catch (Exception e) {
            logger.error("Failed to send password reset email", e);
        }
    }

    @Override
    public void sendBandInvitation(String to, String bandName, String inviterName, String inviteLink) {
        if (resend == null) {
            logger.warn("Skipping email send: Resend client not initialized.");
            return;
        }

        String content = "<h3>¡Te han invitado a unirte!</h3>" +
                "<p>Hola,</p>" +
                "<p><strong>" + inviterName + "</strong> te ha invitado a unirte a la banda <strong>" + bandName
                + "</strong> en Bandanize.</p>" +
                "<p>Haz clic en el botón de abajo para ver tus invitaciones y aceptar:</p>" +
                "<p style=\"margin: 30px 0;\">" +
                "  <a href=\"" + frontendUrl
                + "/invitations\" style=\"background-color: #ca3e3e; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;\">Ver Invitaciones</a>"
                +
                "</p>" +
                "<p>Si aún no tienes cuenta, regístrate con este email para acceder.</p>";

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from(fromEmail)
                .to(to)
                .subject("Invitación a unirte a " + bandName)
                .html(getEmailTemplate(content))
                .build();

        try {
            CreateEmailResponse data = resend.emails().send(params);
            logger.info("Band invitation email sent. ID: " + data.getId());
        } catch (Exception e) {
            logger.error("Failed to send band invitation email", e);
        }
    }

    @Override
    public void sendVerificationEmail(String to, String token) {
        if (resend == null) {
            logger.warn("Skipping email send: Resend client not initialized.");
            return;
        }

        String verifyLink = frontendUrl + "/verify-email?token=" + token;

        String content = "<h3>Bienvenido a Bandanize</h3>" +
                "<p>Gracias por registrarte. Por favor, verifica tu dirección de correo electrónico para activar tu cuenta:</p>"
                +
                "<p style=\"margin: 30px 0;\">" +
                "  <a href=\"" + verifyLink
                + "\" style=\"background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;\">Verificar Email</a>"
                +
                "</p>" +
                "<p>Este enlace expirará en 24 horas.</p>";

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from(fromEmail)
                .to(to)
                .subject("Verifica tu cuenta de Bandanize")
                .html(getEmailTemplate(content))
                .build();

        try {
            CreateEmailResponse data = resend.emails().send(params);
            logger.info("Verification email sent. ID: " + data.getId());
        } catch (Exception e) {
            logger.error("Failed to send verification email", e);
        }
    }
}
