const ENV = import.meta.env.VITE_ENVIRONMENT
const VITE_USER_POOL_ID = import.meta.env.VITE_USER_POOL_ID
const VITE_USER_POOL_CLIENT_ID = import.meta.env.VITE_USER_POOL_CLIENT_ID
const VITE_COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN
const VITE_REDIRECT_SIGNIN = import.meta.env.VITE_REDIRECT_SIGNIN
const VITE_REDIRECT_SIGNOUT = import.meta.env.VITE_REDIRECT_SIGNOUT

const parseRedirectList = (value, fallback) => {
    if (!value || typeof value !== "string") return fallback
    const parsed = value
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    return parsed.length > 0 ? parsed : fallback
}

const redirectSignInList = parseRedirectList(
    VITE_REDIRECT_SIGNIN,
    ["http://localhost:3000/auth/callback"]
)
const redirectSignOutList = parseRedirectList(
    VITE_REDIRECT_SIGNOUT,
    ["http://localhost:3000/"]
)

const awsconfig = {
    "Auth": {
        "Cognito": {
            "userPoolId": VITE_USER_POOL_ID,
            "userPoolClientId": VITE_USER_POOL_CLIENT_ID,
            "loginWith": {
                "oauth": {
                    "domain": VITE_COGNITO_DOMAIN,
                    "scopes": [
                        "openid",
                    ],
                    "redirectSignIn": redirectSignInList,
                    "redirectSignOut": redirectSignOutList,
                    "responseType": "code"
                },
                "email": "true"
            }
        }
    }
}

// const awsconfig_cert = {
//     "Auth": {
//         "Cognito": {
//             "userPoolId": "us-west-2_PYqrpEATu",
//             "userPoolClientId": "6pio00dd9ekgf0jdbcf2h7jqd1",
//             "loginWith": {
//                 "oauth": {
//                     "domain": "callback-user-pool-4.auth.us-west-2.amazoncognito.com",
//                     "scopes": [
//                         "openid",
//                     ],
//                     "redirectSignIn": ["http://localhost:3000/auth/callback", "https://d859kntxq6gml.cloudfront.net/auth/callback"],
//                     "redirectSignOut": ["http://localhost:3000/", "https://d859kntxq6gml.cloudfront.net/"],
//                     "responseType": "code"
//                 },
//                 "email": "true"
//             }
//         }
//     }
// };



// const awsconfig_prod = {
//     "Auth": {
//         "Cognito": {
//             "userPoolId": "us-east-1_tJImiT9rX",
//             "userPoolClientId": "3en1indhbehp5itrfa2m6kvi82",
//             "loginWith": {
//                 "oauth": {
//                     "domain": "callback-user-pool.auth.us-east-1.amazoncognito.com",
//                     "scopes": [
//                         "openid",
//                     ],
//                     "redirectSignIn": ["http://localhost:3000/auth/callback", "https://d1f2o9mv2do2d5.cloudfront.net/auth/callback"],
//                     "redirectSignOut": ["http://localhost:3000/", "https://d1f2o9mv2do2d5.cloudfront.net/"],
//                     "responseType": "code"
//                 },
//                 "email": "true"
//             }
//         }
//     }
// };


export default awsconfig;
