import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadImg from '../routes/UploadImg.tsx';
import SendToGem from "../components/SendToGem.tsx"
import SendXMLToGem from "../components/SendXMLToGem.tsx"
import SendImgToGem from "../components/SendImgToGem.tsx"

const App = () => {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<UploadImg />} />
                <Route path="/gem" element={<SendToGem />} />
                <Route path="/XMLgem" element={<SendXMLToGem />} />
                <Route path="/imggem" element={<SendImgToGem />} />
            </Routes>
        </Router>
    );
}

export default App;