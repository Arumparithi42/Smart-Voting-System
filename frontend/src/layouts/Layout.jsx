import { useUser } from '@clerk/clerk-react'
import Routers from '../routes/Routers'
import Chatbot from '../components/Chatbot'

const Layout = () => {
  const { isSignedIn, user } = useUser()
  return (
    <div>
      <main>
        <Routers />
      </main>
      {/* Floating assistant for signed-in users; keyed so switching
          accounts starts a fresh conversation. */}
      {isSignedIn && user && <Chatbot key={user.id} userId={user.id} />}
    </div>
  )
}

export default Layout
