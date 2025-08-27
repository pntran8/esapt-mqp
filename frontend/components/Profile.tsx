import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth0 } from "@auth0/auth0-react";
import { User } from "lucide-react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {FaClock, FaUser} from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { FaIdCard } from "react-icons/fa";

const Profile: React.FC = () => {
    const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();

    const handleAuthClick = async () => {
        if (isAuthenticated) {
            await logout({
                logoutParams: { returnTo: window.location.origin }
            });
            navigate('/');
        } else {
            await loginWithRedirect();
            console.log("profile icon authenticated");
            setOpen(false);
            navigate('/');
        }
    };

    const handleHistory = () => {
        navigate('/viewHistory');
    }

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button className="cursor-pointer p-2 rounded-full bg-black transition hover:bg-neutral-800 duration-150">
                    <User className="w-5 h-5 text-[#6D9396]"/>
                </button>
            </Dialog.Trigger>

            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/20 z-40"/>
                <Dialog.Content
                    className="fixed top-0 right-0 w-80 h-full bg-[#FBF8F3] shadow-xl z-50 flex flex-col px-6 py-5 gap-4"
                >
                    <div className="flex justify-between items-center mb-1">
                        <Dialog.Title className="text-xl font-semibold">
                            {isAuthenticated ? "Profile" : "Welcome!"}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button aria-label="Close" className="cursor-pointer p-2 rounded-2xl hover:bg-[#9BB8B9] transition duration-150">
                                <X className="w-5 h-5"/>
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex flex-col gap-4">
                        {isAuthenticated && user && (
                            <div className="flex flex-col gap-2 text-sm text-gray-700">
                                <div className="flex flex-row gap-1 items-center">
                                    <FaUser className="text-sm"/>
                                    <p><strong>Name:</strong> {user?.name?.split('@')[0]}</p>
                                </div>
                                <div className="flex flex-row gap-1 items-center">
                                    <MdEmail className='text-m'/>
                                    <p><strong>Email:</strong> {user.email}</p>
                                </div>
                                <div className="flex flex-col gap-1 items-start">
                                    <div className="flex flex-row gap-1 items-center">
                                        {/*user id*/}
                                        <FaIdCard className="text-sm"/>
                                        <p><strong>User ID:</strong> {user.sub?.slice(-8).toUpperCase()}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isAuthenticated && (
                            <div>
                                <button
                                    onClick = {handleHistory}
                                    className="bg-[#981026] text-white p-3 hover:bg-[#c31431] rounded-xl cursor-pointer w-full flex justify-center"
                                >
                                    <div className="flex flex-row gap-1 items-center leading-none">
                                        <FaClock className="text-sm" />
                                        <span className="text-sm">View History</span>
                                    </div>
                                </button>
                            </div>
                        )}

                        <button
                            onClick={handleAuthClick}

                            className={`${
                                isAuthenticated ? "cursor-pointer bg-[#981026] text-white absolute bottom-0 right-0 m-4 w-1/3 hover:bg-[#c31431]" : "cursor-pointer bg-[#ec4863] text-[#EBF4F9] hover:bg-[#981026]"
                            } rounded-full px-6 py-2 transition duration-230 text-base font-bold font-istok-web`}
                        >
                            {isAuthenticated ? "Logout" : "Login"}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default Profile;