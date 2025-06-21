import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadImg from '../routes/UploadImg.tsx';
import SendToGem from "../components/SendToGem.tsx"

const App = () => {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<UploadImg />} />
                <Route path="/gem" element={<SendToGem />} />
            </Routes>
        </Router>
    );
}

export default App;