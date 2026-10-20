
import nodemailer from 'nodemailer';

const timeoutMs = 12000;

let transport;

function smtpSettings() {
    return {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        },
        connectionTimeout: timeoutMs,
        greetingTimeout: timeoutMs,
        socketTimeout: timeoutMs
    };
}

export function channelConfigured(channel) {
    if (channel === 'email') {
        return Boolean(
            process.env.SMTP_HOST &&
            process.env.SMTP_USER &&
            process.env.SMTP_PASSWORD &&
            process.env.NOTIFICATION_FROM_EMAIL
        );
    }

    if (channel === 'whatsapp') {
        return Boolean(
            process.env.WHATSAPP_ACCESS_TOKEN &&
            process.env.WHATSAPP_PHONE_NUMBER_ID &&
            process.env.WHATSAPP_TEMPLATE_NAME &&
            process.env.WHATSAPP_GRAPH_VERSION
        );
    }

    return false;
}

export function normalizeWhatsappPhone(value) {
    const phone = String(value ?? '')
        .replace(/[\s().-]/g, '');

    // No inventamos códigos de país.
    // El número debe estar en formato E.164.
    return /^\+[1-9]\d{7,14}$/.test(phone)
        ? phone.slice(1)
        : null;
}

async function sendEmail(job) {
    if (!transport) {
        transport = nodemailer.createTransport(
            smtpSettings()
        );
    }

    const {
        name,
        code,
        description
    } = job.payload;

    const result = await transport.sendMail({
        from: process.env.NOTIFICATION_FROM_EMAIL,
        to: job.recipient,
        subject: `DeliveryOps · ${description} · ${code}`,
        text: [
            `Hola ${name},`,
            '',
            `${description}.`,
            `Código: ${code}.`,
            '',
            'DeliveryOps'
        ].join('\n'),
        disableFileAccess: true,
        disableUrlAccess: true
    });

    return String(
        result.messageId || 'smtp-accepted'
    );
}

async function sendWhatsapp(job) {
    const {
        name,
        code,
        description
    } = job.payload;

    const version =
        process.env.WHATSAPP_GRAPH_VERSION;

    if (!/^v\d+\.\d+$/.test(version)) {
        throw new Error(
            'WHATSAPP_GRAPH_VERSION inválida'
        );
    }

    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    try {
        const response = await fetch(
            `https://graph.facebook.com/${version}/${encodeURIComponent(
                process.env.WHATSAPP_PHONE_NUMBER_ID
            )}/messages`,
            {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    Authorization:
                        `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: job.recipient,
                    type: 'template',
                    template: {
                        name: process.env.WHATSAPP_TEMPLATE_NAME,
                        language: {
                            code:
                                process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
                                'es_AR'
                        },
                        components: [
                            {
                                type: 'body',
                                parameters: [
                                    name,
                                    code,
                                    description
                                ].map(text => ({
                                    type: 'text',
                                    text
                                }))
                            }
                        ]
                    }
                })
            }
        );

        const data = await response.json()
            .catch(() => ({}));

        if (
            !response.ok ||
            !data.messages?.[0]?.id
        ) {
            const errorCode =
                data.error?.code || response.status;

            throw new Error(
                `WhatsApp rechazó la solicitud (código ${errorCode})`
            );
        }

        return data.messages[0].id;
    } finally {
        clearTimeout(timer);
    }
}

export const notificationProviderService = {
    async send(job) {
        if (!channelConfigured(job.channel)) {
            throw new Error(
                `Canal ${job.channel} sin configurar`
            );
        }

        return job.channel === 'email'
            ? sendEmail(job)
            : sendWhatsapp(job);
    }
};
