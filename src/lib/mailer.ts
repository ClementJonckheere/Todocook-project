/**
 * Envoi d'e-mails transactionnels via l'API de Brevo (https://developers.brevo.com).
 *
 * Configuration (variables d'environnement) :
 * - BREVO_API_KEY : clé API Brevo (obligatoire en production pour envoyer des e-mails) ;
 * - MAIL_FROM_EMAIL / MAIL_FROM_NAME : expéditeur, qui doit être validé dans Brevo ;
 * - APP_URL : adresse publique de l'application, utilisée dans les liens envoyés.
 *
 * Sans clé, en développement, le message est affiché dans la console du serveur
 * (le lien de réinitialisation peut ainsi être testé en local).
 */
export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type MailSender = (mail: Mail) => Promise<void>;

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

async function sendWithBrevo(mail: Mail, apiKey: string) {
  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || "TodoCook" },
      to: [{ email: mail.to }],
      subject: mail.subject,
      textContent: mail.text,
      htmlContent: mail.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Brevo a refusé l'envoi (${response.status}) : ${(await response.text()).slice(0, 200)}`);
  }
}

let testSender: MailSender | null = null;

/** Tests : remplace l'envoi réel (null pour revenir au comportement normal). */
export function setMailSenderForTests(sender: MailSender | null) {
  testSender = sender;
}

export async function sendMail(mail: Mail): Promise<void> {
  if (testSender) return testSender(mail);
  const apiKey = process.env.BREVO_API_KEY;
  if (apiKey) {
    if (!process.env.MAIL_FROM_EMAIL) throw new Error("MAIL_FROM_EMAIL doit être défini pour envoyer des e-mails.");
    return sendWithBrevo(mail, apiKey);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Envoi d'e-mails non configuré : définissez BREVO_API_KEY et MAIL_FROM_EMAIL.");
  }
  console.info(`[e-mail non envoyé : BREVO_API_KEY absent]\nÀ : ${mail.to}\nObjet : ${mail.subject}\n\n${mail.text}`);
}

/**
 * Adresse publique de l'application pour les liens envoyés par e-mail.
 * En production, APP_URL est obligatoire : déduire l'adresse de la requête (en-tête Host)
 * permettrait à un attaquant de faire envoyer un lien vers son propre site.
 */
export function appUrl(request: Request): string {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL doit être défini en production.");
  return new URL(request.url).origin;
}
