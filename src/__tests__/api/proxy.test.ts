import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const request = (path: string, init: { cookie?: string; bearer?: string } = {}) => {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", `todocook-session=${init.cookie}`);
  if (init.bearer) headers.set("authorization", `Bearer ${init.bearer}`);
  return new NextRequest(new URL(path, "http://localhost"), { headers });
};
const location = (res: Response) => res.headers.get("location")?.replace("http://localhost", "");

describe("proxy (contrôle d'accès des pages et de l'API)", () => {
  it("API : 401 sans session, sauf routes publiques", async () => {
    expect(proxy(request("/api/users")).status).toBe(401);
    expect(proxy(request("/api/users", { bearer: "x" })).status).toBe(200);
    expect(proxy(request("/api/users", { cookie: "x" })).status).toBe(200);
    for (const path of ["/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/nutrition/calculate"]) {
      expect(proxy(request(path)).status).toBe(200);
    }
  });

  it("pages : connexion requise, et /login toujours accessible (session éventuellement expirée)", () => {
    expect(location(proxy(request("/dashboard")))).toBe("/login");
    expect(location(proxy(request("/")))).toBe("/login");
    expect(location(proxy(request("/", { cookie: "x" })))).toBe("/dashboard");
    expect(proxy(request("/dashboard", { cookie: "x" })).headers.get("location")).toBeNull();
    expect(proxy(request("/login", { cookie: "cookie-perime" })).headers.get("location")).toBeNull();
    expect(proxy(request("/offline.html")).headers.get("location")).toBeNull();
    expect(proxy(request("/mot-de-passe-oublie")).headers.get("location")).toBeNull();
    expect(proxy(request("/reinitialiser-mot-de-passe")).headers.get("location")).toBeNull();
    expect(proxy(request("/api/account")).status).toBe(401);
  });
});
