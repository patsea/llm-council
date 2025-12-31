import { Link, useLocation } from 'react-router-dom';
import './NavBar.css';

function NavBar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          LLM Council
        </Link>

        <div className="navbar-links">
          <Link to="/" className={`navbar-link ${isActive('/')}`}>
            Chat
          </Link>

          <Link to="/config" className={`navbar-link ${isActive('/config')}`}>
            Model Selection
          </Link>

          <Link to="/analytics" className={`navbar-link ${isActive('/analytics')}`}>
            Analytics
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
