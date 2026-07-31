import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

type EmailTransportOptions = SMTPTransport.Options;

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const transportOptions = this.createTransportOptions();
    this.transporter = nodemailer.createTransport(transportOptions);

    this.logger.info(
      `[EmailService] Initialized: host=${transportOptions.host}, port=${transportOptions.port}, secure=${transportOptions.secure}`,
    );
  }

  async sendMail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to.join(', ') : to;

    try {
      const emailFrom: string =
        process.env.EMAIL_FROM || process.env.EMAIL_USER || '';

      await this.transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html,
        text,
      });

      this.logger.info(
        `[SendMail] Sent email to ${recipients} with subject "${subject}"`,
      );
    } catch (error) {
      this.logger.error(
        `[SendMail] FAILED: Could not send email to ${recipients}`,
        error,
      );
      throw error;
    }
  }

  async sendNewUserNotification(
    adminEmails: string[],
    userName: string,
    userEmail: string,
    customText?: string,
  ): Promise<void> {
    const subject = `[Admin Notification] New User: ${userName}`;
    const text =
      customText ??
      `New registration on the platform.\nName: ${userName}\nEmail: ${userEmail}`;
    const html = `
    <div style="font-family: sans-serif; color: #333;">
      <h2>New User Registration</h2>
      <p>A new user has just registered on your platform.</p>
      <hr />
      <p><strong>Full Name:</strong> ${userName}</p>
      <p><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
      <hr />
      <footer style="font-size: 12px; color: #999;">
        This is an automated notification from your NestJS Server.
      </footer>
    </div>
  `;

    await this.sendMail(adminEmails, subject, html, text);
  }

  private createTransportOptions(): EmailTransportOptions {
    return {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    };
  }
}
