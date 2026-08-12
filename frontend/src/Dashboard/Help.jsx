import { Search, Mail, Phone, MessageCircle } from 'lucide-react'

export default function HelpSupportPage() {
    return (
        <div className="bg-white text-black items-center pt-28 min-h-screen lg:ml-64  gap-4 justify-center p-8 max-h-screen overflow-hidden h-screen" style={{ height: '500px', width: "83%" }} >
      




                <h2 className="text-2xl font-semibold text-blue-800 mb-4">How can we help you?</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search for help..."
                        className="w-full pl-10 pr-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-blue-400" />
                </div>
     

            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-blue-800 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqData.map((faq, index) => (
                        <details key={index} className="bg-white rounded-lg shadow-md p-4">
                            <summary className="font-medium text-blue-700 cursor-pointer">{faq.question}</summary>
                            <p className="mt-2 text-gray-600">{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </section>


        </div>



    )
}

const faqData = [
    {
        question: "How do I register to vote?",
        answer: "To register, click on the 'SignUp' button on the homepage and complete the form with your personal details."
    },
    {
        question: "How do I cast my vote?",
        answer: "Log in to your account during the voting period, go to the 'Vote Now' section, and follow the on-screen instructions."
    },
    {
        question: "How do I know my vote was successfully cast?",
        answer: "You will receive a confirmation message on your screen upon successful vote submission."
    },
    {
        question: "Is my vote secure?",
        answer: "Yes, we implement state-of-the-art encryption and privacy measures to ensure the security and confidentiality of your vote."
    },
    {
        question: "Can I view the results after voting?",
        answer: "Yes, results will be available in the 'Results' section after the voting period ends."
    },
];