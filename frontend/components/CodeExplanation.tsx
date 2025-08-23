import Header from "./Header";
import Footer from "./Footer";
import "./gem.css";
import "../src/App.css"
import { useNavigate} from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import download from "../src/assets/download.png"
import * as React from "react";
import { useState } from "react";
import LineTypeRenderer from "../components/StepByStep.tsx"

interface lineType {
    line: string;
    title: string;
}

interface Props {
    code: string;
    explanation: lineType[];
    imageUrl: string | null;
}

const CodeExplanation: React.FC<Props> = ({imageUrl, code, explanation}) => {
    const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
    const navigate = useNavigate();

    const [expandedSections, setExpandedSections] = useState({
        erd: true,
        code: true,
        explanation: true
    });

    const handleAuthClick = async () => {
        if (isAuthenticated) {
            await logout({
                logoutParams: { returnTo: window.location.origin }
            });
            navigate('/');
        } else {
            await loginWithRedirect();
            console.log("homepage login button icon authenticated");
            navigate('/');
        }
    };

    const goToHistory = () => {
        navigate('/viewHistory');
    }

    const toggleSection = (section: 'erd' | 'code' | 'explanation') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // how many sections are expanded
    const expandedCount = Object.values(expandedSections).filter(Boolean).length;

    // layout style based on what's expanded
    const getLayoutStyles = () => {
        if (expandedCount === 0) {
            return { display: 'none' };
        } else if (expandedCount === 1) {
            return {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start'
            };
        } else {
            return {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                gap: '2vh'
            };
        }
    };

    const renderCollapsedHeaders = () => {
        const collapsedSections = [];
        if (!expandedSections.erd) collapsedSections.push({ key: 'erd', title: 'Your ERD' });
        if (!expandedSections.code) collapsedSections.push({ key: 'code', title: 'Code Output' });
        if (!expandedSections.explanation) collapsedSections.push({ key: 'explanation', title: 'AI Explanation' });

        if (collapsedSections.length === 0) return null;

        return (
            <div style={{
                display: 'flex',
                gap: '2vh',
                marginBottom: '2vh',
                paddingLeft: '5vw',
                paddingRight: '5vw'
            }}>
                {collapsedSections.map(section => (
                    <h1
                        key={section.key}
                        onClick={() => toggleSection(section.key as 'erd' | 'code' | 'explanation')}
                        style={{
                            cursor: 'pointer',
                            padding: '10px 20px',
                            border: '2px solid #BD0A0A',
                            borderRadius: '5px',
                            margin: 0
                        }}
                    >
                        {section.title}
                    </h1>
                ))}
            </div>
        );
    };

    return (
        <>
            <Header />
            <h1>SQL Explanation</h1>

            {/* collapsed headers */}
            {renderCollapsedHeaders()}

            <div style={{
                height: '75vh',
                marginTop: '3vh',
                marginBottom: '1vh',
                paddingLeft: '5vw',
                paddingRight: '5vw',
                ...getLayoutStyles()
            }}>
                {/* only one section (centered) */}
                {expandedCount === 1 && (
                    <>
                        {expandedSections.erd && (
                            <div style={{ width: '80vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h1 style={{marginBottom:'2vh', cursor: 'pointer'}} onClick={() => toggleSection('erd')}>
                                    Your ERD ▼
                                </h1>
                                <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }} className="border-2 border-[#BD0A0A]">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="ERD Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <p>No image available.</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {expandedSections.code && (
                            <div style={{ width: '80vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('code')}>
                                    Code Output ▼
                                </h1>
                                <div className={"inner-page-box"} style={{ height: '60vh', width: '100%', overflow: 'scroll' }}>
                                    <pre
                                        style={{
                                            margin: 0,
                                            fontSize: '20px',
                                            whiteSpace: 'pre-wrap',   // preserve newlines and wrap
                                            wordBreak: 'break-word',  // break long words/tokens
                                            overflowWrap: 'anywhere', // extra safety
                                        }}
                                    >
                                      {code}
                                    </pre>
                                </div>
                            </div>
                        )}
                        {expandedSections.explanation && (
                            <div style={{ width: '80vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('explanation')}>
                                    AI Explanation ▼
                                </h1>
                                <div className={"inner-page-box"} style={{ height: '60vh', width: '100%', overflow: 'scroll' }}>
                                    <LineTypeRenderer items={explanation} />
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* two sections side by side */}
                {expandedCount === 2 && (
                    <>
                        {expandedSections.erd && (
                            <div style={{ width: '45vw', display: 'flex', flexDirection: 'column' }}>
                                <h1 style={{marginBottom:'2vh', cursor: 'pointer'}} onClick={() => toggleSection('erd')}>
                                    Your ERD ▼
                                </h1>
                                <div style={{ height: '66vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="border-2 border-[#BD0A0A]">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="ERD Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <p>No image available.</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {expandedSections.code && (
                            <div style={{ width: '45vw', display: 'flex', flexDirection: 'column' }}>
                                <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('code')}>
                                    Code Output ▼
                                </h1>
                                <div className={"inner-page-box"} style={{ height: '66vh', overflow: 'scroll' }}>
                                    <pre
                                        style={{
                                            margin: 0,
                                            fontSize: '20px',
                                            whiteSpace: 'pre-wrap',   // preserve newlines and wrap
                                            wordBreak: 'break-word',  // break long words/tokens
                                            overflowWrap: 'anywhere', // extra safety
                                        }}
                                    >
                                      {code}
                                    </pre>
                                </div>
                            </div>
                        )}
                        {expandedSections.explanation && (
                            <div style={{ width: '45vw', display: 'flex', flexDirection: 'column' }}>
                                <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('explanation')}>
                                    AI Explanation ▼
                                </h1>
                                <div className={"inner-page-box"} style={{ height: '66vh', overflow: 'scroll' }}>
                                    <LineTypeRenderer items={explanation} />
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* all three sections (og layout) */}
                {expandedCount === 3 && (
                    <>
                        {/* erd */}
                        <div style={{ width: '45vw', display: 'flex', flexDirection: 'column' }}>
                            <h1 style={{marginBottom:'2vh', cursor: 'pointer'}} onClick={() => toggleSection('erd')}>
                                Your ERD ▼
                            </h1>
                            <div style={{ height: '66vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="border-2 border-[#BD0A0A]">
                                {imageUrl ? (
                                    <img src={imageUrl} alt="ERD Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <p>No image available.</p>
                                )}
                            </div>
                        </div>

                        {/* code and explanation stacked */}
                        <div style={{width: '45vw', display: 'flex', flexDirection: 'column', gap: '2vh'}}>
                            <div style={{ height: '32vh', display: 'flex', flexDirection: 'column' }}>
                                <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('code')}>
                                    Code Output ▼
                                </h1>
                                <div className={"inner-page-box"} style={{ flex: 1, overflow: 'scroll' }}>
                                    <pre
                                        style={{
                                            margin: 0,
                                            fontSize: '20px',
                                            whiteSpace: 'pre-wrap',   // preserve newlines and wrap
                                            wordBreak: 'break-word',  // break long words/tokens
                                            overflowWrap: 'anywhere', // extra safety
                                        }}
                                    >
                                      {code}
                                    </pre>
                                </div>
                            </div>

                            <div style={{ height: '32vh', display: 'flex', flexDirection: 'column' }}>
                                <h1 style={{cursor: 'pointer'}} onClick={() => toggleSection('explanation')}>
                                    AI Explanation ▼
                                </h1>
                                <div className={"inner-page-box"} style={{ flex: 1, overflow: 'scroll' }}>
                                    <LineTypeRenderer items={explanation} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div style={{height:'30vh', marginBottom:"10vh"}}>
                { isAuthenticated ?
                    <div className={"inner-page-box w-[35vw] h-[25vh] float-left"} style={{marginLeft:'10vw'}}>
                        <h2 style={{fontSize:'2vh', marginBottom:'30px'}}>Welcome, {user?.sub?.slice(-8).toUpperCase()}! Click here to view <br/> your saved work</h2>
                        <button className={'box-button'} onClick={goToHistory}>View History</button>
                    </div>
                    :
                    <div className={"inner-page-box w-[35vw] h-[25vh] float-left"} style={{marginLeft:'10vw'}}>
                        <h2 style={{fontSize:'2vh'}}>Log in to save your work</h2>
                        <button className={'box-button'} style={{marginTop:'40px'}} onClick={handleAuthClick}>Login</button>
                    </div>
                }
                <div className={"inner-page-box w-[35vw] h-[25vh] float-right"} style={{marginRight:'10vw'}}>
                    <div>
                        <h2 style={{fontSize:"2vh"}}>Download Output.txt</h2>
                        <button className={"box-button"} style={{marginTop:'40px'}}
                                onClick={() => {
                                    const blob = new Blob([code], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = 'Output.txt';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                }}>
                            <img src={download} alt="Download" style={{justifySelf:"center", width: '25%'}} />
                        </button>
                    </div>
                </div>
            </div>

            <Footer/>
        </>
    );
};

export default CodeExplanation;