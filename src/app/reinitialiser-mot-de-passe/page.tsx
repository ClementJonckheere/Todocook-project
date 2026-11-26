import { AuthCard } from "@/components/AuthCard";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage(props: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await props.searchParams;
  return (
    <AuthCard title="Nouveau mot de passe">
      <ResetPasswordForm token={typeof token === "string" ? token : ""} />
    </AuthCard>
  );
}
