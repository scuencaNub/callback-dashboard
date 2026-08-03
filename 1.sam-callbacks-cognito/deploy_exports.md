# deploy exports

credenciales temporales STS generadas al momento del deploy de cognito.
no commitear valores reales. usar como referencia de formato:

```
export AWS_ACCESS_KEY_ID="<ASIA...>"
export AWS_SECRET_ACCESS_KEY="<secret>"
export AWS_SESSION_TOKEN="<token>"
```

obtener con:
```
aws sts assume-role --role-arn <role-arn> --role-session-name deploy
```
