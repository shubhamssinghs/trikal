import { CreateCompanyForm } from "@/components/create-company-form";
import Link from "next/link";
import { Shell } from "@/components/shell";

export default function NewCompanyPage() {
  return (
    <Shell active="/companies" width="sm">
        <Link href="/companies" className="text-xs text-muted hover:text-foreground">← Companies</Link>
        <h1 className="text-xl font-semibold mt-2 mb-6">New Company</h1>
        <CreateCompanyForm />
      </Shell>
  );
}
