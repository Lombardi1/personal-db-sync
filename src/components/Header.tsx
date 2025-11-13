interface HeaderProps {
  activeTab?: string;
}

export function Header({ activeTab = 'dashboard' }: HeaderProps) {
  const getHeaderColor = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'linear-gradient(135deg, hsl(var(--dashboard-color)), hsl(217, 91%, 45%))';
      case 'ordini':
        return 'linear-gradient(135deg, hsl(var(--ordini-color)), hsl(0, 72%, 40%))';
      case 'esauriti':
        return 'linear-gradient(135deg, hsl(var(--esauriti-color)), hsl(142, 71%, 30%))';
      case 'carico':
        return 'linear-gradient(135deg, hsl(var(--carico-color)), hsl(262, 66%, 42%))';
      case 'storico':
        return 'linear-gradient(135deg, hsl(var(--storico-color)), hsl(37, 93%, 35%))';
      default:
        return 'linear-gradient(135deg, hsl(var(--primary)), hsl(223 73% 27%))';
    }
  };

  return (
    <header className="app-header transition-all duration-300" style={{ background: getHeaderColor() }}>
      <div className="max-w-[1400px] mx-auto px-5">
        <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-3">
          <i className="fas fa-box-open"></i>
          Gestione Magazzino Cartoni
        </h1>
      </div>
    </header>
  );
}
