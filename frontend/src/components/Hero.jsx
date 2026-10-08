// import Image from "next/image"
import { CheckCircle2, Vote } from 'lucide-react'

export default function Component() {
    return (
        <div className="overflow-hidden bg-gradient-to-r from-yellow-100 via-yellow-100 to-white">
            
            {/* Hero Section */}
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-900 leading-tight">
                            Your Vote Matters in Shaping Our Future
                        </h1>
                        <p className="text-lg text-gray-600 max-w-md">
                            eVote is a Smart Voting System for secure online elections - from proposal and approval to voting, live monitoring and officially published results.
                        </p>
                        <ul className="space-y-3">
                            {[
                                'Only verified voters can vote - one person, one vote.',
                                'Your choice stays secret; you get a receipt to confirm it was counted.',
                                'Officially published results for every election.',
                            ].map((text) => (
                                <li key={text} className="flex items-start gap-3 text-gray-700">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>
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
                        <img src="/hero.png" alt="" width={600}
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