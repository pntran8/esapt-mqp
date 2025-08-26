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
            <div className='relative mx-auto p-1 bg-[#BD0A0A] flex items-center justify-end' style={{border:'0.25vh solid black', height:'8vh', minHeight:'25px'}}>
                <div className="cursor-pointer flex items-center flex-1 justify-start z-10" onClick={handleClick}>
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

                    <div className={'cursor-pointer text-2xl text-white font-bold font-sans flex justify-self-end'} style={{fontSize:'max(5px, 3vh)'}} onClick={goToGem}>
                        SQL Generation
                    </div>

                    <div className={'cursor-pointer text-2xl text-white font-bold font-sans mx-8 flex justify-self-end'} style={{fontSize:'max(5px, 3vh)'}} onClick={goToEval}>
                        Code Comparison
                    </div>
                <div className={'flex justify-end'}>
                    <Profile />
                </div>

            </div>
        </>
    );

}