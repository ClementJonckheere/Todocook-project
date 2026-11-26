import { appUrl, sendMail } from "@/lib/mailer";

const env = process.env as Record<string, string | undefined>;
const mail = { to: "a@test.local", subject: "Sujet", text: "Texte", html: "<p>Texte</p>" };

describe("mailer", () => {
  const saved = { ...env };
  const realFetch = global.fetch;
  afterEach(() => {
    for (const key of ["BREVO_API_KEY", "MAIL_FROM_EMAIL", "MAIL_FROM_NAME", "APP_URL", "NODE_ENV"]) env[key] = saved[key];
    global.fetch = realFetch;
  });

  it("envoie via l'API Brevo avec la clé, l'expéditeur et le destinataire", async () => {
    env.BREVO_API_KEY = "cle-test";
    env.MAIL_FROM_EMAIL = "no-reply@todocook.test";
    const fake = jest.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    global.fetch = fake as unknown as typeof fetch;
    await sendMail(mail);
    const [url, init] = fake.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("cle-test");
    expect(JSON.parse(init.body)).toMatchObject({ sender: { email: "no-reply@todocook.test", name: "TodoCook" }, to: [{ email: mail.to }], subject: "Sujet" });
  });

  it("signale un refus de Brevo", async () => {
    env.BREVO_API_KEY = "cle-test";
    env.MAIL_FROM_EMAIL = "no-reply@todocook.test";
    global.fetch = jest.fn().mockResolvedValue(new Response("expéditeur non validé", { status: 400 })) as unknown as typeof fetch;
    await expect(sendMail(mail)).rejects.toThrow(/refusé l'envoi \(400\)/);
  });

  it("en production, refuse d'envoyer sans configuration et exige APP_URL", async () => {
    delete env.BREVO_API_KEY;
    delete env.APP_URL;
    env.NODE_ENV = "production";
    await expect(sendMail(mail)).rejects.toThrow(/BREVO_API_KEY/);
    // Sans APP_URL, l'en-tête Host d'une requête forgée ne doit pas servir à construire le lien
    expect(() => appUrl(new Request("https://site-pirate.example/x"))).toThrow(/APP_URL/);
    env.APP_URL = "https://todocook.example.fr/";
    expect(appUrl(new Request("https://site-pirate.example/x"))).toBe("https://todocook.example.fr");
  });
});
