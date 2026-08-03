import { fetchAuthSession } from 'aws-amplify/auth'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
    const navigate = useNavigate()
    const [_isProcessing, setIsProcessing] = useState(true)
    const ranRef = useRef(false)

    useEffect(() => {
        if (ranRef.current) return
        ranRef.current = true

        const processCallback = async () => {
            try {
                // Deja que Amplify procese el redirect y persista tokens
                const { tokens } = await fetchAuthSession()

                // Intentar obtener datos básicos del usuario
                try {

                    if (tokens?.idToken) {
                        const idTokenPayload = tokens.idToken.payload

                        // Detect identity provider
                        const identities = idTokenPayload['identities'] as any[] | undefined
                        const identityProvider = identities?.[0]?.providerType || 'COGNITO'

                        const cognitoGroups = idTokenPayload['cognito:groups'] as string[] | undefined

                        // For Azure AD / SAML users (groups may come in different claims):
                        const azureGroups = idTokenPayload['groups'] as string[] | undefined
                        const samlGroups = idTokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'] as string[] | undefined

                        // Combine all possible group sources
                        const allGroups = [
                            ...(cognitoGroups || []),
                            ...(azureGroups || []),
                            ...(samlGroups || [])
                        ]

                        const uniqueGroups = Array.from(new Set(allGroups))
                        console.log('Groups (all sources):', uniqueGroups.length > 0 ? uniqueGroups : 'No groups assigned')
                        if (cognitoGroups) console.log('  - Cognito groups:', cognitoGroups)
                        if (azureGroups) console.log('  - Azure groups claim:', azureGroups)
                        if (samlGroups) console.log('  - SAML groups claim:', samlGroups)


                        // Azure AD specific claims
                        if (identityProvider === 'SAML' || identityProvider === 'Azure') {
                            const azureObjectId = idTokenPayload['http://schemas.microsoft.com/identity/claims/objectidentifier']
                            const azureName = idTokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
                            if (azureObjectId) console.log('Azure AD Object ID:', azureObjectId)
                            if (azureName) console.log('Azure AD Name:', azureName)
                        }
                    }
                } catch { /* no-op */ }

                // Evitar que el callback quede en el history
                window.location.replace('/')
            } catch (error) {
                navigate('/')
            } finally {
                setIsProcessing(false)
            }
        }

        processCallback()
    }, [navigate])

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing authentication...</p>
            </div>
        </div>
    )
}
