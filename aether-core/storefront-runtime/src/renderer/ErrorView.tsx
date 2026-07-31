export function ErrorView({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="sf-error">
      <h1>{title}</h1>
      <p className="sf-muted">{message}</p>
    </main>
  );
}
