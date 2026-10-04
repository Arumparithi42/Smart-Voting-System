import React, { useState } from 'react';
import Avatar from 'react-avatar';
import { useUser, SignOutButton } from "@clerk/clerk-react";
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOut } from '@fortawesome/free-solid-svg-icons';

const AvatarCom = () => {
    const { isLoaded, user } = useUser();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (!isLoaded || !user) {
        return <span className="block h-10 w-10 animate-pulse rounded-full bg-slate-200" aria-label="Loading" />;
    }

    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    return (
        <div className="relative">
            <button onClick={toggleDropdown} className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Account menu" aria-expanded={isDropdownOpen}>
                <Avatar size="40" round={true} src={user.imageUrl || ''} />
            </button>
            {isDropdownOpen && (
                <ul className="absolute right-0 mt-1 p-3 bg-white border rounded shadow-lg w-64 z-30">
                    <li className="flex items-center mb-2 gap-2">
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">{user.fullName}</span>
                            <span className="text-gray-500 text-xs">{user.primaryEmailAddress?.emailAddress || 'No email address'}</span>
                        </div>
                    </li>
                    <hr className="my-1" />
                    <li><Link to="/dashboard" onClick={() => setIsDropdownOpen(false)} className="block rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100">Dashboard</Link></li>
                    <li><Link to="/dashboard/profile" onClick={() => setIsDropdownOpen(false)} className="block rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100">Profile</Link></li>
                    <li><Link to="/dashboard/notifications" onClick={() => setIsDropdownOpen(false)} className="block rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100">Notifications</Link></li>
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
