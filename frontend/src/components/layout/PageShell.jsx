/**
 * PageShell — wraps main content with container, spacing, and footer.
 * Maps from: <main class="main"> + <footer class="footer"> in index.html
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export default function PageShell({ children }) {
    return (
        <>
            <main className="main">
                <div className="container">{children}</div>
            </main>
            <footer className="footer">
                <div className="container">
                    <p className="footer__text">
                        Hasamex — Expert Insight Delivered with Speed &amp; Trust
                    </p>
                </div>
            </footer>
        </>
    );
}
