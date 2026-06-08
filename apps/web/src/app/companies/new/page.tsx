import { CreateCompanyForm } from "@/components/create-company-form";
import { Shell } from "@/components/shell";
import { PageHeader } from "@/components/ui";

export default function NewCompanyPage() {
  return (
    <Shell active="/companies" width="xl">
      <PageHeader
        title="New Company"
        subtitle="Add a client or account to manage projects under."
        backHref="/companies"
        backLabel="Companies"
      />
      <CreateCompanyForm />
    </Shell>
  );
}
