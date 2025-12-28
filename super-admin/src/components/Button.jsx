export default function Button({
  children,
  type = "button",
  variant = "primary",
  onClick,
  className,
  load = false
}) {
  const baseClasses = "px-4 py-2 rounded-md font-medium duration-300 ease-in-out";

  const variants = {
    primary: "bg-(--clr-primary) text-(--clr-text-secondary) hover:opacity-98 hover:scale-95 ease-in-out duration-500",
    disable: "bg-gray-500"
  };

  const appliedClasses = `${baseClasses} ${variants[variant]} ${className}`;
  return (
    <button 
      disabled={load} 
      type={type} 
      className={`${appliedClasses}`} onClick={onClick}
    >
      {load ? (
        'Loading...'
      ): (
        children
      )}
    </button>
  );
}
