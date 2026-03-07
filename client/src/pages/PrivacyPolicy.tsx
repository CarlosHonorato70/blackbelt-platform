import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import privacyRaw from "../../../PRIVACY_POLICY.md?raw";

function renderMarkdown(md: string) {
  return md.split("\n").map((line, i) => {
    const trimmed = line.trimEnd();
    if (trimmed.startsWith("# "))
      return (
        <h1 key={i} className="text-3xl font-bold mt-8 mb-4">
          {trimmed.slice(2)}
        </h1>
      );
    if (trimmed.startsWith("## "))
      return (
        <h2 key={i} className="text-2xl font-bold mt-6 mb-3">
          {trimmed.slice(3)}
        </h2>
      );
    if (trimmed.startsWith("### "))
      return (
        <h3 key={i} className="text-xl font-semibold mt-4 mb-2">
          {trimmed.slice(4)}
        </h3>
      );
    if (trimmed.startsWith("#### "))
      return (
        <h4 key={i} className="text-lg font-semibold mt-3 mb-1">
          {trimmed.slice(5)}
        </h4>
      );
    if (trimmed.startsWith("- "))
      return (
        <li key={i} className="ml-6 list-disc text-gray-700">
          {trimmed.slice(2)}
        </li>
      );
    if (trimmed.startsWith("**") && trimmed.endsWith("**"))
      return (
        <p key={i} className="font-bold text-gray-800 mt-2">
          {trimmed.slice(2, -2)}
        </p>
      );
    if (trimmed === "") return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-gray-700 leading-relaxed">
        {trimmed}
      </p>
    );
  });
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="bg-white rounded-lg shadow-sm p-8">
          {renderMarkdown(privacyRaw)}
        </div>
      </div>
    </div>
  );
}
