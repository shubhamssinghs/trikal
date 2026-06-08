import { CreateCompanyForm } from "@/components/create-company-form";
import Link from "next/link";
import { Nav } from "@/components/nav";

export default function NewCompanyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Nav active="/companies" />
      <main className="max-w-lg mx-auto px-6 py-10">
        <Link href="/companies" className="text-xs text-gray-500 hover:text-gray-300">← Companies</Link>
        <h1 className="text-xl font-semibold mt-2 mb-6">New Company</h1>
        <CreateCompanyForm />
      </main>
    </div>
  );
}
