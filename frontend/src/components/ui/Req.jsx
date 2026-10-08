// Red asterisk for mandatory form fields. Pair with the input's `required`
// attribute so the browser blocks submitting an empty field.
export default function Req() {
  return (
    <>
      <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

export function RequiredNote({ className = '' }) {
  return <p className={`text-xs text-slate-500 ${className}`}>Fields marked <span className="text-red-600">*</span> are required.</p>;
}
