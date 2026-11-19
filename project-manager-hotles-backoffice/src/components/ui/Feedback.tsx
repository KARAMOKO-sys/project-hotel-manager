// src/components/ui/Feedback.tsx
// Notifications (Toast PrimeReact) et confirmations (ConfirmDialog) partagées
// par les pages du back-office.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Toast } from "primereact/toast";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";

type Severity = "success" | "info" | "warn" | "error";

export interface FeedbackContextValue {
  notify: (severity: Severity, summary: string, detail?: string) => void;
  /** Demande une confirmation ; résout `true` si l'utilisateur accepte. */
  confirm: (message: string, header?: string, danger?: boolean) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const toast = useRef<Toast>(null);

  const notify = useCallback(
    (severity: Severity, summary: string, detail?: string) => {
      toast.current?.show({
        severity,
        summary,
        detail,
        life: severity === "error" ? 7000 : 4000,
      });
    },
    [],
  );

  const confirm = useCallback(
    (message: string, header = "Confirmation", danger = false) =>
      new Promise<boolean>((resolve) => {
        confirmDialog({
          message,
          header,
          icon: danger ? "pi pi-exclamation-triangle" : "pi pi-question-circle",
          acceptLabel: "Confirmer",
          rejectLabel: "Annuler",
          acceptClassName: danger ? "p-button-danger" : undefined,
          defaultFocus: "reject",
          accept: () => resolve(true),
          reject: () => resolve(false),
          onHide: () => resolve(false),
        });
      }),
    [],
  );

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog style={{ width: "min(92vw, 460px)" }} />
    </FeedbackContext.Provider>
  );
}

const FALLBACK: FeedbackContextValue = {
  notify: (_severity, summary, detail) => {
    if (typeof window !== "undefined") {
      window.alert(detail ? `${summary}\n${detail}` : summary);
    }
  },
  confirm: async (message) =>
    typeof window !== "undefined" ? window.confirm(message) : false,
};

export function useFeedback(): FeedbackContextValue {
  return useContext(FeedbackContext) ?? FALLBACK;
}

/** Message d'erreur lisible (le backend renvoie des messages en français). */
export function errorMessage(error: unknown, fallback = "L’opération a échoué"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
