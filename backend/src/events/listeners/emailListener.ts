import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { eventBus } from '../eventBus';
import { AppEvent } from '../eventTypes';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } else {
    // Non-blocking JSON transport in local/test environments without SMTP credentials
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return transporter;
}

async function sendSafeEmail(to: string, subject: string, text: string): Promise<void> {
  if (env.NODE_ENV === 'test') return;

  try {
    const mail = getTransporter();
    await mail.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
    });
    logger.debug({ to, subject }, 'Helpdesk email dispatched');
  } catch (error) {
    logger.warn({ err: error, to, subject }, 'Failed to dispatch email notification');
  }
}

export function registerEmailListener(): void {
  eventBus.onEvent(AppEvent.TICKET_RESOLVED, async (payload) => {
    const owner = await prisma.user.findUnique({
      where: { id: payload.ticketOwnerId },
      select: { email: true, name: true },
    });

    if (!owner) return;

    await sendSafeEmail(
      owner.email,
      `[Helpdesk] Ticket Resolved: ${payload.title}`,
      `Hello ${owner.name},\n\nYour support ticket "${payload.title}" has been resolved by ${payload.actorName}.\n\nThank you,\nHelpdesk Team`,
    );
  });
}
