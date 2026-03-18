import Skeletons from '../experts/Skeletons';

/**
 * Loader — shared loading placeholder (skeleton rows).
 * Keeps the same look as the Experts page loaders.
 */
export default function Loader({ rows = 8 }) {
    return <Skeletons rows={rows} />;
}

