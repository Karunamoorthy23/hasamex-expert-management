import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

/**
 * Header component with Hasamex logo and navigation.
 * Maps from: <header class="header"> in index.html
 */
export default function Header() {
    return (
        <header className="header">
            <div className="header__inner">
                <Link to="/" className="logo">
                    <span className="logo__icon">H</span>
                    <span className="logo__text">Hasamex</span>
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
