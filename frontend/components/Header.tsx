import wpiLogo from "../src/images/wpiLogo.png";
import Profile from "./Profile.tsx";
import {useNavigate} from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();
    const handleClick = () => {
        navigate("/");
    }
    const goToGem = () => {
        navigate("/imggem");
    }
    const goToEval = () => {
        navigate("/evaluation");
    }
    return (
        <>
            <div className='relative mx-auto p-1 bg-[#BD0A0A] flex items-center justify-between' style={{border:'0.25vh solid black', height:'8vh', minHeight:'25px'}}>
                <div className="cursor-pointer flex items-center z-10" onClick={handleClick}>
                    <img
                        className='mx-1 object-scale-down'
                        src={wpiLogo}
                        alt="WPI Logo"
                        style={{height:'6vh', minHeight:'20px'}}
                    />
                    <div className='text-5xl font-bold text-white font-serif' style={{fontSize:'max(15px, 5vh)'}}>
                        WPI
                    </div>
                </div>

                <div className={'text-2xl text-white font-bold font-sans'} style={{fontSize:'max(5px, 3vh)'}} onClick={goToGem}>
                    SQL Generation
                </div>

                <div className={'text-2xl text-white font-bold font-sans'} style={{fontSize:'max(5px, 3vh)'}} onClick={goToEval}>
                    Code Evaluation
                </div>


                <Profile />
            </div>
        </>
    );

}