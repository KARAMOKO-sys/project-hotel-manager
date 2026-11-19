"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearAuthSession, saveAuthSession } from "@/lib/api";
import { useTheme } from "@/lib/theme";

interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: Record<string, unknown>;
}

interface TwoFactorChallengeResponse {
  requires_two_factor: true;
  two_factor_token: string;
  expires_in: number;
}

type LoginResponse = AuthTokensResponse | TwoFactorChallengeResponse;

function isTwoFactorChallenge(
  response: LoginResponse,
): response is TwoFactorChallengeResponse {
  return "requires_two_factor" in response && response.requires_two_factor;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useTheme();
  const [code, setCode] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const completeLogin = (session: AuthTokensResponse) => {
    if (!session.access_token || !session.refresh_token || !session.user) {
      throw new Error("La réponse du serveur ne contient pas les jetons attendus.");
    }
    saveAuthSession(session);
    router.replace("/admin/dashboard");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (twoFactorToken) {
        const session = await apiFetch<AuthTokensResponse>("/auth/2fa/verify", {
          method: "POST",
          body: JSON.stringify({
            two_factor_token: twoFactorToken,
            code,
          }),
        });
        completeLogin(session);
        return;
      }

      clearAuthSession();
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (isTwoFactorChallenge(response)) {
        setTwoFactorToken(response.two_factor_token);
        return;
      }
      completeLogin(response);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "La connexion a échoué",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />
      <section className="login-card" aria-labelledby="login-title">
        <Link className="login-brand" href="/login">
          <span className="login-brand-icon">
            {theme.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.logoUrl} alt="" />
            ) : (
              <i className="pi pi-building"></i>
            )}
          </span>
          <span>{theme.appName}</span>
        </Link>

        <div className="login-heading">
          <p className="login-eyebrow">ESPACE DE GESTION</p>
          <h1 id="login-title">
            {twoFactorToken ? "Vérification en deux étapes" : "Content de vous revoir"}
          </h1>
          <p>
            {twoFactorToken
              ? "Saisissez le code à 6 chiffres de votre application d’authentification."
              : "Connectez-vous pour piloter vos établissements."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!twoFactorToken ? (
            <>
              <label htmlFor="email">Adresse e-mail</label>
              <div className="login-input">
                <i className="pi pi-envelope" aria-hidden="true"></i>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nom@etablissement.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <label htmlFor="password">Mot de passe</label>
              <div className="login-input">
                <i className="pi pi-lock" aria-hidden="true"></i>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  aria-pressed={showPassword}
                  title={showPassword ? "Masquer" : "Afficher"}
                >
                  <i
                    className={`pi ${showPassword ? "pi-eye-slash" : "pi-eye"}`}
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="two-factor-code">Code de sécurité</label>
              <div className="login-input">
                <i className="pi pi-shield" aria-hidden="true"></i>
                <input
                  id="two-factor-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                />
              </div>
              <button
                type="button"
                className="login-back"
                onClick={() => {
                  setTwoFactorToken("");
                  setCode("");
                }}
              >
                <i className="pi pi-arrow-left"></i> Retour à la connexion
              </button>
            </>
          )}

          {error && (
            <div className="login-error" role="alert">
              <i className="pi pi-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? (
              <>
                <i className="pi pi-spin pi-spinner"></i> Vérification…
              </>
            ) : (
              <>
                {twoFactorToken ? "Vérifier le code" : "Se connecter"}
                <i className="pi pi-arrow-right"></i>
              </>
            )}
          </button>
        </form>
        <p className="login-footnote">
          Connexion sécurisée à l’API de gestion hôtelière
        </p>
      </section>

      <style jsx global>{`
        .login-page {
          position: relative;
          display: grid;
          min-height: 100vh;
          overflow: hidden;
          place-items: center;
          padding: 2rem 1rem;
          background:
            radial-gradient(circle at 20% 18%, rgb(255 255 255 / 0.13), transparent 27rem),
            linear-gradient(135deg, var(--ps-login-start), var(--ps-login-end));
        }

        .login-decoration {
          position: absolute;
          width: 22rem;
          height: 22rem;
          border: 1px solid rgb(255 255 255 / 0.12);
          border-radius: 40%;
          transform: rotate(35deg);
          pointer-events: none;
        }

        .login-decoration-one {
          top: -10rem;
          right: -7rem;
        }

        .login-decoration-two {
          bottom: -14rem;
          left: -8rem;
          width: 30rem;
          height: 30rem;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: min(100%, 440px);
          padding: clamp(1.5rem, 6vw, 2.5rem);
          border: 1px solid rgb(255 255 255 / 0.65);
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 28px 90px rgb(9 44 27 / 0.3);
        }

        .login-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          color: #173c28;
          font-size: 1.05rem;
          font-weight: 750;
          text-decoration: none;
        }

        .login-brand-icon {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 12px;
          background: #eaf6ed;
          color: var(--ps-primary-dark);
        }

        .login-heading {
          margin: 2.5rem 0 1.75rem;
        }

        .login-eyebrow {
          margin: 0 0 0.55rem;
          color: var(--ps-primary-dark);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .login-heading h1 {
          margin: 0;
          color: #18251d;
          font-size: clamp(1.55rem, 5vw, 1.85rem);
          font-weight: 750;
          letter-spacing: -0.04em;
        }

        .login-heading > p:last-child {
          margin: 0.5rem 0 0;
          color: #78837b;
          font-size: 0.9rem;
          line-height: 1.55;
        }

        .login-form {
          display: flex;
          flex-direction: column;
        }

        .login-form label {
          margin: 0 0 0.45rem;
          color: #344139;
          font-size: 0.8rem;
          font-weight: 650;
        }

        .login-input {
          display: flex;
          height: 50px;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.2rem;
          padding: 0 0.9rem;
          border: 1px solid #e1e7e2;
          border-radius: 12px;
          background: #fbfcfb;
          color: #869189;
        }

        .login-input:focus-within {
          border-color: var(--ps-primary-dark);
          box-shadow: 0 0 0 3px rgba(var(--ps-primary-rgb), 0.1);
        }

        .login-input input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1f2937;
          font: inherit;
          font-size: 0.9rem;
        }

        .login-eye {
          display: grid;
          flex: none;
          width: 34px;
          height: 34px;
          place-items: center;
          margin-right: -0.4rem;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #869189;
          cursor: pointer;
        }

        .login-eye:hover,
        .login-eye:focus-visible {
          background: rgba(var(--ps-primary-rgb), 0.1);
          color: var(--ps-primary-dark);
          outline: none;
        }

        .login-brand-icon img {
          width: 100%;
          height: 100%;
          border-radius: inherit;
          object-fit: cover;
        }

        .login-input input::placeholder {
          color: #a4ada6;
        }

        .login-submit {
          display: flex;
          min-height: 50px;
          align-items: center;
          justify-content: center;
          gap: 0.7rem;
          margin-top: 0.25rem;
          border: 0;
          border-radius: 12px;
          background: var(--ps-primary-dark);
          color: #fff;
          font: inherit;
          font-size: 0.9rem;
          font-weight: 700;
          transition: background 0.2s ease;
        }

        .login-submit:hover:not(:disabled) {
          background: var(--ps-primary-darker);
        }

        .login-submit:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.75rem;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fef2f2;
          color: #991b1b;
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .login-back {
          align-self: flex-start;
          margin: -0.7rem 0 1rem;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--ps-primary-dark);
          font-size: 0.82rem;
        }

        .login-footnote {
          margin: 1.5rem 0 0;
          color: #98a29b;
          font-size: 0.72rem;
          text-align: center;
        }
      `}</style>
    </main>
  );
}
