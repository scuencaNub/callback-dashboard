import { useAuth } from "../components/auth/AuthProvider"

export default function LoggedOut() {
    const { signIn } = useAuth()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="max-w-md w-full bg-white border rounded-lg p-6">
                <h1 className="text-xl font-semibold text-gray-900">Sesión cerrada</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Cerraste sesión en esta aplicación. Para volver a ingresar, hacé clic en “Login”.
                </p>
                <button
                    type="button"
                    onClick={() => signIn()}
                    className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Login
                </button>
            </div>
        </div>
    )
}


