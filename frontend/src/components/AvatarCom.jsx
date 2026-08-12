import React, { useState } from 'react';
import Avatar from 'react-avatar';
import { useUser, SignOutButton } from "@clerk/clerk-react";
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOut, faGraduationCap } from '@fortawesome/free-solid-svg-icons';

const AvatarCom = () => {
    const { isLoaded, user } = useUser();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (!isLoaded || !user) {
        return <p>Loading...</p>;
    }

    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    return (
        <div className="relative">
            <div onClick={toggleDropdown} role="button" className="cursor-pointer">
                <Avatar size="40" round={true} src={user.imageUrl || ''} />
            </div>
            {isDropdownOpen && (
                <ul className="absolute right-0 mt-1 p-3 bg-white border rounded shadow-lg w-64 z-30">
                    <li className="flex items-center mb-2 gap-2">
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">{user.fullName}</span>
                            <span className="text-gray-500 text-xs">{user.primaryEmailAddress?.emailAddress || 'No email address'}</span>
                        </div>
                    </li>
                    <hr className="my-1" />
                    <li className="flex items-center gap-2 py-1">
                        <FontAwesomeIcon icon={faGraduationCap} className="text-primary h-4 w-4" />
                        <Link to="/dashboard" className="font-semibold text-primary text-sm">Dashboard</Link>
                    </li>
                    <hr className="my-1" />
                    <li className="flex justify-center items-center mt-2 bg-blue-700 rounded-md">
                        <SignOutButton>
                            <button className="bg-primary text-white  px-3 py-1 rounded flex items-center gap-1 text-sm">
                                Log out <FontAwesomeIcon icon={faSignOut} className="h-4 w-4" />
                            </button>
                        </SignOutButton>
                    </li>
                </ul>

            )}
        </div>
    );
};

export default AvatarCom;
