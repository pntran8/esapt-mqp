import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useAuth0 } from "@auth0/auth0-react";

const StartSessionBtn = () => {
    const navigate = useNavigate();
    const { user } = useAuth0();

    const handleStartSession = () => {
        const sessionID = uuidv4().slice(0, 6);
        navigate(`/imggem/session/${sessionID}`, {
            state: { hostID: user?.sub },
        });
    };

    return (
        <button onClick={handleStartSession} className="start-btn">
            Start Remote Session
        </button>
    );
};

export default StartSessionBtn;