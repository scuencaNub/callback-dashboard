declare const awsconfig: {
    Auth: {
        Cognito: {
            userPoolId: string;
            userPoolClientId: string;
            loginWith: {
                oauth: {
                    domain: string;
                    scopes: string[];
                    redirectSignIn: string[];
                    redirectSignOut: string[];
                    responseType: string;
                };
                email: string;
            };
        };
    };
};

export default awsconfig;
