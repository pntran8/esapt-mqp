import wpiLogo from "../src/images/wpiLogo.png";
import Profile from "./Profile.tsx";

export default function Header() {

    return (
        <>
            {/* Navbar */}
            <div className="relative mx-auto p-1 bg-[#c31432] flex items-center justify-between h-20">
                <div className="flex items-center z-10">
                    <img
                        className="h-12 mx-1 object-scale-down"
                        src={wpiLogo}
                        alt="WPI Logo"
                    />
                    <div className="text-5xl font-bold text-white font-serif">
                        WPI
                    </div>
                </div>
                <h1 className="absolute left-1/2 transform -translate-x-1/2 text-5xl font-bold text-white font-serif tracking-wide">
                    ESAPT
                </h1>
                <Profile />
            </div>
        </>
    );

}