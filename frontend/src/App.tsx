import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadImg from '../routes/UploadImg.tsx';
import SendToGem from "../components/SendToGem.tsx"
import SendXMLToGem from "../components/SendXMLToGem.tsx"
import SendImgToGem from "../components/SendImgToGem.tsx"
import {Auth0Provider} from '@auth0/auth0-react';
import { useAuth0 } from '@auth0/auth0-react';
import {useEffect} from 'react';

const App = () => {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const clientID = import.meta.env.VITE_AUTH0_CLIENT_ID;
    const { isAuthenticated, isLoading, user } = useAuth0();

    useEffect(() => {
        if (isLoading) return;

        if (isAuthenticated) {
            console.log("am logged in -- app.tsx");
        } else {
            console.log("not logged in.");
        }
    }, [isLoading, isAuthenticated, user]);

    return(
        <Auth0Provider
            domain={domain}
            clientId={clientID}
            authorizationParams={{
                redirect_uri: window.location.origin + '/',
            }}
        >
            <Router>
                <Routes>
                    <Route path="/" element={<UploadImg />} />
                    <Route path="/gem" element={<SendToGem />} />
                    <Route path="/XMLgem" element={<SendXMLToGem />} />
                    <Route path="/imggem" element={<SendImgToGem />} />
                </Routes>
            </Router>
        </Auth0Provider>
    );
}

export default App;