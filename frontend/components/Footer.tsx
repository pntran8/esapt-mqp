import {useNavigate} from "react-router-dom";

import HomePage from "../src/images/HomePage.png"
import GenChooseFile from "../src/images/GenChooseFile.png"
import GenERDPreview from "../src/images/GenERDPreview.png"
import HomeSQLGen from "../src/images/HomeSQLGen.png"
import GenGeneratedCode from "../src/images/GenGeneratedCode.png"
import HomeComp from "../src/images/HomeComp.png"
import CompChooseFile from "../src/images/CompChooseFile.png"
import CompWithGenCode from "../src/images/CompWithGenCode.png"
import CompPressComp from "../src/images/CompPressComp.png"
import CompCompleteComparison from "../src/images/CompCompleteComparison.png"



export default function Footer() {
    const navigate = useNavigate();
    const goToTut = () => {
        navigate("/tutorial");
    }
    function getUrl () {
        const pathname: string = window.location.pathname;
        console.log(pathname)
        const pathsplit = pathname.split("/")
        return pathsplit[pathsplit.length - 1]
    }
    function myFunction() {
        var popup = document.getElementById("homepopup");
        popup.classList.toggle("show");
    }
    function myFunction2() {
        var popup = document.getElementById("genpopup");
        popup.classList.toggle("show");
    }
    function myFunction3() {
        var popup = document.getElementById("evalpopup");
        popup.classList.toggle("show");
    }

    return (
        <>


            <footer
                className="sticky top-[100vh] bottom-0 w-full mx-auto p-1 mt-[5vh] bg-[#E7E7E7] flex items-center justify-center h-20">

                <button
                    className={'circle-button popup'}
                    style={{width: "3vh", height: "3vh"}}
                    onClick={() => {
                        console.log(getUrl())
                        if (getUrl() == "esapt2025.vercel.app" || getUrl() == "") {
                            myFunction()
                        } else if (getUrl() == "imggem") {
                            myFunction2()
                        } else if (getUrl() == "evaluation") {
                            myFunction3()
                        }
                    }}>
                    <h2 style={{color: "white", fontSize: "2vh"}}>i</h2>

                    <div className="popuptext" id="homepopup">
                        <h1 className={"h1-tut"}>Home Page</h1>
                        <h3 className={"h3-tut"}>This page has buttons that will take you to any page of the
                            application. </h3>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={HomeSQLGen}
                             alt={"Generate SQL Page Button"}/>
                        <h3 className={"h3-tut"} style={{marginBottom: "2vh"}}> This button will take you to the page that generates SQL with an explanation.</h3>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={HomeComp}
                             alt={"Code Comparison Page Button"}/>
                        <h3 className={"h3-tut"} style={{marginBottom: "2vh"}}> This button will take you to the page that allows you to compare your own code against generated code.</h3>
                    </div>
                    <div className="popuptext" id="genpopup">
                        <h1 className={"h1-tut"}>Generating SQL from an ERD with explanation</h1>
                        <h3 className={"h3-tut"}>(Note: if you uploaded an ERD to the other page and did not clear it,
                            it will automatically load that data here)<br/>Now that you are on the page, click the bar
                            that says "Choose File No File Chosen." It will open your files folder. Select and open the
                            ERD you wish to generate code for. It will appear in the preview box below the button to the
                            left as well as loading animations on the code and explanation boxes to the right of the
                            preview box.</h3>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={GenChooseFile}
                             alt={"Page with choose file circled"}/>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={GenERDPreview}
                             alt={"Box with ERD preview"}/>
                        <h3 className={"h3-tut"}>Give the LLM some time to think, and once it is done, you will have
                            both code and an explanation for why that code was generated the way it was!</h3>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={GenGeneratedCode}
                             alt={"Picture of all three boxes filled"}/>
                    </div>
                    <div className="popuptext" id="evalpopup">
                        <h1 className={"h1-tut"}>Compare your SQL code to the LLM’s generated code</h1>
                        <h3 className={"h3-tut"}> (Note: if you uploaded an ERD to the other page and did not clear it,
                            it will automatically load that data here)<br/> Now that you are on the page, click the bar
                            that says "Choose File No File Chosen." It will open your files folder. Select and open the
                            ERD you wish to generate code for.</h3>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={CompChooseFile}
                             alt={"Page with choose file circled"}/>
                        <h3 className={"h3-tut"}>The LLM will think and generate code from the ERD in the far left box
                            below.</h3>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={CompWithGenCode}
                             alt={"Page with code generated in leftmost box"}/>
                        <h3 className={"h3-tut"}> Type or paste your code into the middle box, then press the compare
                            button next to the button you pressed to upload the ERD.</h3>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={CompPressComp}
                             alt={"Page with compare button circles"}/>
                        <h3 className={"h3-tut"}>The results of the comparison will appear in the rightmost box</h3>
                        <img style={{border: "solid black 1px", justifySelf: "center"}} src={CompCompleteComparison}
                             alt={"Full page with all three boxes having content"}/>
                    </div>
                </button>
                <h2 className={"text-black"}>This website was created as an MQP advised by professors Rodica Neamtu and
                    Wilson Wong. Any inquiries can be directed to gr-esapt-mqp-2025@wpi.edu</h2>
            </footer>
        </>
    );
}