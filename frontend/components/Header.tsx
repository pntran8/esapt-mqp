import wpiLogo from "../src/images/wpiLogo.png";
import Profile from "./Profile.tsx";
import {useNavigate} from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();
    const handleClick = () => {
        navigate("/");
    }
    return (
        <>
            <div className="relative mx-auto p-1 bg-[#BD0A0A] flex items-center justify-between h-20" style={{border:"2px solid black"}}>
                <div className="cursor-pointer flex items-center z-10" onClick={handleClick}>
                    <img
                        className="h-12 mx-1 object-scale-down"
                        src={wpiLogo}
                        alt="WPI Logo"
                    />
                    <div className="text-5xl font-bold text-white font-serif">
                        WPI
                    </div>
                </div>
                <h1 className="mt-0 left-1/2 transform -translate-x-1/2 text-5xl font-bold text-white font-serif tracking-wide">
                    ESAPT
                </h1>
                <Profile />
            </div>
        </>
    );

}