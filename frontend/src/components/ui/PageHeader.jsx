// Consistent dashboard page header (keeps the existing blue -> teal identity).
export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-blue-600 to-teal-500 p-6 text-white shadow-md sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-blue-100 sm:text-base">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
