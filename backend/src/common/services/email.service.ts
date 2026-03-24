import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {
    // Configure transporter - adjust settings according to your email provider
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    this.logger.info('[EmailService] Initialized');
    this.logger.info(
      `[EmailService] SMTP Config: Host=${process.env.EMAIL_HOST || 'smtp.gmail.com'}, Port=${process.env.EMAIL_PORT || '587'}, User=${process.env.EMAIL_USER || 'NOT SET'}, Secure=${process.env.EMAIL_SECURE === 'true'}`,
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
      this.logger.info('[SendMail] Attempting to send email...');
      this.logger.info(`[SendMail] To: ${recipients}`);
      this.logger.info(`[SendMail] Subject: ${subject}`);
      this.logger.info(
        `[SendMail] SMTP Config - Host: ${process.env.EMAIL_HOST}, Port: ${process.env.EMAIL_PORT}, User: ${process.env.EMAIL_USER}`,
      );

      const emailFrom: string =
        process.env.EMAIL_FROM || process.env.EMAIL_USER || '';

      const result = (await this.transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html,
        text,
      })) as unknown;

      this.logger.info(
        `[SendMail] SUCCESS: Email sent to ${recipients} with subject "${subject}"`,
      );
      this.logger.info(`[SendMail] Response: ${JSON.stringify(result)}`);
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
    text?: string,
  ): Promise<void> {
    this.logger.info(
      `[NewUserNotification] Starting - Recipients: ${adminEmails.join(', ')}, New user: ${userName}`,
    );

    const subject = `[Admin Notification] New User: ${userName}`;
    text = `New registration on the platform.\nName: ${userName}\nEmail: ${userEmail}`;
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

    this.logger.info(`[NewUserNotification] About to call sendMail...`);
    await this.sendMail(adminEmails, subject, html, text);
    this.logger.info(`[NewUserNotification] Completed successfully`);
  }
}
