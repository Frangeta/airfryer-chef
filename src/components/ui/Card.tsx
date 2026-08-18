export function Card({
  children,
  className = '',
  as: As = 'div'
}: {
  children: React.ReactNode;
  className?: string;
  as?: any;
}) {
  return <As className={`bg-paper rounded-2xl shadow-card ${className}`}>{children}</As>;
}
