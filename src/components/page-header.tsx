type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="flex h-14 items-center border-b bg-white px-4 md:px-6">
      <div className="flex-1">
        <h1 className="font-semibold text-lg text-black">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
    </header>
  );
}
