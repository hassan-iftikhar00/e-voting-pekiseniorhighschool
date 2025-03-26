import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { School, User, LogOut } from 'lucide-react'
import { useUser } from '../context/UserContext'

const Header: React.FC = () => {
  const { user, logout } = useUser()
  const location = useLocation()

  // Only hide header on login page
  if (['/login'].includes(location.pathname)) {
    return null
  }

  return (
    <header className="bg-indigo-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <School className="h-8 w-8 mr-2" />
            <Link to="/" className="text-xl font-bold">Peki Senior High School</Link>
          </div>
          {user ? (
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center">
                <User className="h-5 w-5 mr-1" />
                <span>{user.username}</span>
              </div>
              <button 
                onClick={() => logout()}
                className="flex items-center bg-indigo-700 hover:bg-indigo-600 px-3 py-1 rounded transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login" className="hover:text-indigo-200 transition-colors">Admin Login</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header