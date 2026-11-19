"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { isTwoFactorChallenge, signIn, completeTwoFactorLogin } from "@/services/api/session";
import type { UserType } from "@/types/api";

const USER_TYPES: Array<{ value: UserType; label: string }> = [
  { value: "super_admin" as UserType, label: "Super administrateur" },
  { value: "owner" as UserType, label: "Propriétaire" },
  { value: "receptionist" as UserType, label: "Réceptionniste / Directeur" },
  { value: "housekeeping" as UserType, label: "Gouvernance" },
  { value: "accountant" as UserType, label: "Comptable" },
];

export default function BackofficeLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<UserType>("super_admin" as UserType);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (twoFactorToken) {
        await completeTwoFactorLogin(twoFactorToken, code);
        router.replace("/backoffice");
        return;
      }
      const response = await signIn({
        email,
        password,
        user_type: userType,
      });
      if (isTwoFactorChallenge(response)) {
        setTwoFactorToken(response.two_factor_token);
        return;
      }
      router.replace("/backoffice");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La connexion a échoué. Veuillez réessayer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bo-login-page">
      <section className="bo-login-card">
        <Link className="bo-brand bo-login-brand" href="/">
          <span className="bo-brand-mark">P</span>
          <span>
            <strong>PleasantStay</strong>
            <small>Gestion hôtelière</small>
          </span>
        </Link>
        <span className="bo-eyebrow">ESPACE ADMINISTRATEUR</span>
        <h1>{twoFactorToken ? "Vérification en deux étapes" : "Bon retour"}</h1>
        <p className="bo-login-description">
          {twoFactorToken
            ? "Saisissez le code à six chiffres de votre application d’authentification."
            : "Connectez-vous pour accéder à votre espace de gestion."}
        </p>
        <form className="bo-form" onSubmit={onSubmit}>
          {!twoFactorToken ? (
            <>
              <label>
                Type de compte
                <select
                  onChange={(event) => setUserType(event.target.value as UserType)}
                  value={userType}
                >
                  {USER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Adresse e-mail
                <input
                  autoComplete="username"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
                Mot de passe
                <span className="bo-password">
                  <input
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    aria-pressed={showPassword}
                    className="bo-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    title={showPassword ? "Masquer" : "Afficher"}
                    type="button"
                  >
                    <i aria-hidden="true" className={`pi ${showPassword ? "pi-eye-slash" : "pi-eye"}`} />
                  </button>
                </span>
              </label>
            </>
          ) : (
            <label>
              Code d’authentification
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                pattern="\d{6}"
                required
                value={code}
              />
            </label>
          )}
          {error && (
            <p className="bo-alert bo-alert-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="bo-button bo-button-primary bo-login-submit"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Connexion…" : twoFactorToken ? "Vérifier" : "Se connecter"}
          </button>
          {twoFactorToken && (
            <button
              className="bo-text-button"
              onClick={() => {
                setTwoFactorToken(null);
                setCode("");
              }}
              type="button"
            >
              Revenir à la connexion
            </button>
          )}
        </form>
        <Link className="bo-login-return" href="/">
          <i className="pi pi-arrow-left" aria-hidden="true" />
          Retour au site
        </Link>
      </section>
    </main>
  );
}
