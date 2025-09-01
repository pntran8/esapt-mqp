import {useNavigate} from "react-router-dom";

export default function Footer() {
    const navigate = useNavigate();
    const goToTut = () => {
        navigate("/tutorial");
    }
    return (
        <>
            <div className={"h-[8vh] m-[1vh] mt-[4vh]"} style={{textAlign: "left"}}>
                <button
                    className={'circle-button'}
                    style={{width: "3vh", height: "3vh"}}
                    onClick={() => {
                        goToTut()
                    }}>
                    <h2 style={{color: "white", fontSize: "2vh"}}>i</h2>
                </button>
            </div>
            <footer
                className="sticky top-[100vh] bottom-0 w-full mx-auto p-1 mt-1 bg-[#E7E7E7] flex items-center justify-center h-20">
                <h2 className={"text-black"}>This website was created as an MQP advised by professors Rodica Neamtu and
                    Wilson Wong. Any inquiries can be directed to gr-esapt-mqp-2025@wpi.edu</h2>
            </footer>
        </>
    );
}