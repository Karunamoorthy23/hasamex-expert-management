import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import logo from '/src/assets/hasamex_logo.png';

/**
 * Header component with Hasamex logo and navigation.
 * Maps from: <header class="header"> in index.html
 */
export default function Header() {
    return (
        <header className="header">
            <div className="header__inner">
                <Link to="/" className="logo">
                    {/* <span className="logo__icon">H</span>
                    <span className="logo__text">Hasamex</span> */}
                    <img src={logo} alt="" style={{ width: 'auto', height: '1.75rem', border: '1px solid white' }} />
                </Link>
                <nav className="nav">
                    <Link to="/" className={cn('nav__link', 'nav__link--active')}>
                        Expert Management
                    </Link>
                </nav>
            </div>
        </header>
    );
}
