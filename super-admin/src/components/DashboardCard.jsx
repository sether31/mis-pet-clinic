export default function DashboardCard({
  title,
  data,
  icon: Icon,
  iconColor = '',
  iconSize = 12,
  className = '',
}) {
  return (
    <article
      className={`grid grid-cols-[1.5fr_.5fr] gap-4 p-4 rounded-xl w-full h-32 items-center bg-(--clr-bg-card) text-(--clr-text-primary) border-2 border-gray-300 ${className}`}
    >
      {/* data */}
      <div>
        <h3 className="mb-2 opacity-90">{title}</h3>
        <p className="text-2xl font-semibold">{data}</p>
      </div>
      {/* icon */}
      <div className="flex items-center justify-end">
        {Icon && <Icon className={`w-${iconSize} h-${iconSize} ${iconColor}`} />}
      </div>
    </article>
  );
}
