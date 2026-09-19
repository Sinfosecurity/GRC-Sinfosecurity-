import { Navigate, useLocation, useParams } from 'react-router-dom';
import { legacyEngagementRedirect } from '../engagement/engagementPaths';

export default function LegacyEngagementRedirect() {
    const { id = '' } = useParams();
    const location = useLocation();
    return <Navigate to={legacyEngagementRedirect(location.pathname) || `/engagements/${id}`} replace />;
}
