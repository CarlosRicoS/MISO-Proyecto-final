# Decisión de Autenticación — TravelHub

> Resumen de sesión de diseño arquitectónico · Proyecto MISW-4501/4502  
> Generado para continuar implementación en Claude Code

---

## Contexto del proyecto

**TravelHub** es una plataforma de reservas de viajes que cubre 6 países latinoamericanos. Consta de tres aplicaciones:

| Aplicación | Stack | Audiencia |
|---|---|---|
| Portal Web | Angular | Viajeros (ES / COP) |
| App Móvil | Ionic + Angular (iOS/Android) | Viajeros (EN / USD) |
| Portal de Hoteles | Angular | Administradores de hoteles |

**Stack backend:** Java (Spring Boot) + Python (FastAPI) como microservicios  
**Cloud:** AWS (ECS, SQS, ELB, RDS, API Gateway)  
**CI/CD:** GitHub Actions + Terraform + Docker

---

## Decisión: Proveedor de autenticación

### Opción elegida: **AWS Cognito**

Se evaluaron cuatro alternativas. AWS Cognito fue seleccionado por coherencia con la arquitectura existente del proyecto.

### Comparativa resumida

| Criterio | Firebase Auth | **AWS Cognito** | Auth0 | Keycloak |
|---|---|---|---|---|
| Capa gratuita | 10k MAU | **50k MAU** | 7.5k MAU | Open source (self-host) |
| JWT nativo | Sí | **Sí** | Sí | Sí |
| RBAC | Básico (custom claims) | **Nativo (grupos)** | Avanzado | Avanzado |
| MFA | Sí | **Sí** | Sí | Sí |
| Integración AWS | Manual | **Nativa** | Lambda authorizer | Compleja |
| SDK Angular/Ionic | @angular/fire | **Amplify JS** | auth0-angular | Manual |
| SDK Java | firebase-admin | **AWS SDK v2** | auth0-java | keycloak-admin |
| SDK Python | firebase-admin | **boto3** | python SDK | keycloak-admin |
| Complejidad setup | Baja | Media | Baja | Alta |

### Razones de descarte de alternativas

- **Firebase Auth:** Excelente SDK pero mezcla Google Cloud con AWS, sin integración nativa con API Gateway.
- **Auth0:** Mejor opción fuera de AWS; capa gratuita la más restrictiva (7.5k MAU).
- **Keycloak:** Muy poderoso pero requiere self-hosting y mantenimiento propio — costo en tiempo de equipo inaceptable para el sprint.

---

## Arquitectura de autenticación definida

### Estructura de User Pool en Cognito

```
AWS Cognito User Pool
├── Grupo: travelers          → sin MFA obligatorio
└── Grupo: hotel-admins       → MFA obligatorio (TOTP / SMS)
```

El JWT generado incluye el grupo como claim: `cognito:groups`.

### Flujo de autenticación (petición normal)

```
Frontend (Angular/Ionic)
    │
    │  Authorization: Bearer {JWT}
    ▼
API Gateway  ──── verifica JWT ────►  AWS Cognito
    │                                 (solo para validar firma)
    │  petición aprobada + headers extraídos:
    │  X-User-Id: abc-123
    │  X-User-Role: travelers
    │  X-User-Email: user@example.com
    ▼
Microservicio (Java / Python)
    │
    │  usa X-User-Id del header directamente
    ▼
Lógica de negocio
```

**Principio clave:** El backend NO valida tokens JWT. Confía en que si la petición llegó desde el API Gateway, ya fue autenticada. Solo lee los headers HTTP.

---

## Responsabilidades por capa

| Responsabilidad | Componente |
|---|---|
| Registro de usuario (UI) | Frontend → Cognito directamente via Amplify |
| Login / emisión de JWT | Cognito |
| Validación del JWT en cada request | API Gateway (Cognito Authorizer) |
| Extracción de `userId` y `role` | API Gateway → headers HTTP al microservicio |
| Uso del `userId` en lógica de negocio | Microservicio (Java/Python) — solo lee headers |
| Registro programático de usuario | Auth Service → Cognito via AWS SDK (operación admin) |
| Revocar tokens / suspender cuenta | Auth Service → Cognito via AWS SDK (operación admin) |
| Cambio de password por admin | Auth Service → Cognito via AWS SDK (operación admin) |

---

## Implementación en código

### Frontend — Angular con Amplify

```bash
npm install aws-amplify @aws-amplify/ui-angular
```

```typescript
// app.config.ts
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_XXXXXXXX',
      userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
      loginWith: { email: true }
    }
  }
});
```

```typescript
// auth.service.ts
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

async login(email: string, password: string) {
  return await signIn({ username: email, password });
}

async getToken(): Promise<string> {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString() ?? '';
}
```

```typescript
// http-auth.interceptor.ts — adjunta JWT a cada petición
intercept(req: HttpRequest<any>, next: HttpHandler) {
  return from(fetchAuthSession()).pipe(
    switchMap(session => {
      const token = session.tokens?.accessToken?.toString();
      const authReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;
      return next.handle(authReq);
    })
  );
}
```

### Backend Java — Spring Boot

```java
// El microservicio solo lee headers — sin validación JWT propia
@GetMapping("/reservations")
public ResponseEntity<List<Reservation>> getMyReservations(
    @RequestHeader("X-User-Id") String userId,
    @RequestHeader("X-User-Role") String userRole) {

    List<Reservation> result = reservationService.findByUser(userId);
    return ResponseEntity.ok(result);
}
```

```java
// Para endpoints que requieren rol específico
@GetMapping("/admin/dashboard")
public ResponseEntity<Dashboard> getDashboard(
    @RequestHeader("X-User-Id") String userId,
    @RequestHeader("X-User-Role") String userRole) {

    if (!"hotel-admins".equals(userRole)) {
        return ResponseEntity.status(403).build();
    }
    return ResponseEntity.ok(dashboardService.get(userId));
}
```

### Backend Python — FastAPI

```python
from fastapi import FastAPI, Header, HTTPException

app = FastAPI()

@app.get("/reservations")
def get_reservations(
    x_user_id: str = Header(...),
    x_user_role: str = Header(...)
):
    return reservation_service.find_by_user(x_user_id)

@app.get("/admin/dashboard")
def get_dashboard(
    x_user_id: str = Header(...),
    x_user_role: str = Header(...)
):
    if x_user_role != "hotel-admins":
        raise HTTPException(status_code=403, detail="Forbidden")
    return dashboard_service.get(x_user_id)
```

### API Gateway — Cognito Authorizer (Terraform)

```hcl
resource "aws_api_gateway_authorizer" "cognito" {
  name          = "travelhub-cognito-authorizer"
  rest_api_id   = aws_api_gateway_rest_api.main.id
  type          = "COGNITO_USER_POOLS"
  provider_arns = [aws_cognito_user_pool.main.arn]
}
```

### Auth Service — operaciones administrativas (Python con boto3)

```python
import boto3

cognito = boto3.client('cognito-idp', region_name='us-east-1')

def create_user(email: str, temp_password: str, group: str):
    """Registra un usuario en Cognito desde el backend (ej. admin crea hotel manager)"""
    cognito.admin_create_user(
        UserPoolId='us-east-1_XXXXXXXX',
        Username=email,
        TemporaryPassword=temp_password,
    )
    cognito.admin_add_user_to_group(
        UserPoolId='us-east-1_XXXXXXXX',
        Username=email,
        GroupName=group  # 'travelers' o 'hotel-admins'
    )

def disable_user(email: str):
    """Suspende una cuenta — revoca acceso"""
    cognito.admin_disable_user(
        UserPoolId='us-east-1_XXXXXXXX',
        Username=email
    )
```

---

## Configuración de MFA por grupo

- Grupo `travelers`: MFA **opcional** (recomendado pero no forzado)
- Grupo `hotel-admins`: MFA **obligatorio** (TOTP via Google Authenticator o SMS)

```python
# Forzar MFA solo para hotel-admins al momento del login
cognito.admin_set_user_mfa_preference(
    UserPoolId='us-east-1_XXXXXXXX',
    Username=email,
    SoftwareTokenMfaSettings={'Enabled': True, 'PreferredMfa': True}
)
```

---

## Próximos pasos para Sprint 1 — Semana 1

Según la estrategia de pruebas del proyecto, la Semana 1 está dedicada al módulo de autenticación en los tres frentes:

- [ ] Crear User Pool en AWS Console con grupos `travelers` y `hotel-admins`
- [ ] Configurar MFA obligatorio para `hotel-admins`
- [ ] Configurar App Client (sin secret, para SPA Angular/Ionic)
- [ ] Instalar y configurar `aws-amplify` en Portal Web
- [ ] Instalar y configurar `aws-amplify` en App Móvil (Ionic)
- [ ] Crear `HttpInterceptor` en Angular que adjunte JWT a todas las peticiones
- [ ] Configurar Cognito Authorizer en API Gateway (Terraform)
- [ ] Configurar mapping de claims a headers HTTP en API Gateway
- [ ] Implementar lectura de headers en microservicios Java (Spring Boot)
- [ ] Implementar lectura de headers en microservicios Python (FastAPI)
- [ ] Implementar Auth Service con operaciones admin via boto3
- [ ] Pruebas unitarias del módulo de autenticación (cobertura ≥ 80%)

---

## Variables de entorno necesarias

```env
# Frontend (Angular environment.ts)
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
COGNITO_REGION=us-east-1

# Backend (Java / Python)
# No necesitan credenciales de Cognito para el flujo normal
# Solo el Auth Service necesita:
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX
# Las credenciales AWS vienen del IAM Role del contenedor ECS (no hardcodeadas)
```

---

## Notas para Claude Code

- El backend **nunca** debe validar el JWT directamente; esa responsabilidad es del API Gateway.
- Los headers `X-User-Id`, `X-User-Role`, `X-User-Email` son inyectados por el API Gateway — no por el cliente.
- Para pruebas locales sin API Gateway, usar un middleware que simule esos headers con un userId de prueba.
- El Auth Service es el único microservicio que usa `boto3` / `AWS SDK` para llamar a Cognito directamente, y solo para operaciones administrativas (crear, deshabilitar usuarios).
- Cognito User Pool ID y Client ID se configuran en Terraform junto con el resto de la infraestructura AWS del proyecto.
