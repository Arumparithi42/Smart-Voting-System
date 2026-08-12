// import Image from "next/image"
import { Link } from "react-router-dom"
import { ArrowRight, Vote } from 'lucide-react'
import Header from "./Header/Header"

export default function Component() {
    return (
        <div className="min-h-screen h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white">
            {/* Navigation */}
            <Header />

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-12 md:py-24 max-h-screen">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-900 leading-tight">
                            Your Vote Matters in Shaping Our Future
                        </h1>
                        <p className="text-lg text-gray-600 max-w-md">
                            Participate in secure online voting from anywhere. Every vote counts in building a stronger democracy.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to='/elections' className="flex items-center justify-center space-x-2 bg-blue-900 text-white px-8 py-3 rounded-full hover:bg-blue-800 transition-colors">
                                <span>Vote Now</span>
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                            <button className="flex items-center justify-center space-x-2 border-2 border-blue-900 text-blue-900 px-8 py-3 rounded-full hover:bg-blue-50 transition-colors">
                                <span>Learn More</span>
                            </button>
                        </div>
                        <div className="flex items-center space-x-8 pt-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-amber-500">100%</p>
                                <p className="text-sm text-gray-600">Secure</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-amber-500">24/7</p>
                                <p className="text-sm text-gray-600">Available</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-amber-500">Easy</p>
                                <p className="text-sm text-gray-600">To Use</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-amber-300 rounded-full transform scale-110 translate-x-10 translate-y-10" />
                        {/* <Image
              src="/placeholder.svg"
              alt="Online Voting Illustration"
              width={600}
              height={600}
              className="relative z-10"
            /> */}
                        <img src="/hero.png " alt="" width={600}
                            height={600} className="relative z-10" />
                        <div className="absolute top-5 right-5 bg-white p-4 rounded-xl shadow-lg z-20">
                            <div className="flex items-center space-x-2">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Vote className="h-6 w-6 text-blue-900" />
                                </div>
                                <div>
                                    <p className="font-bold text-blue-900">Cast Your Vote</p>
                                    <p className="text-sm text-gray-500">Quick & Secure</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}