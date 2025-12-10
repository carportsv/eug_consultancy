# 🔐 Configurar Secrets en Supabase para FCM API v1

## Valores del JSON de Service Account

Del JSON que recibiste, estos son los valores que necesitas:

### 1. FIREBASE_PROJECT_ID
```
consultancy-ee352
```

### 2. FIREBASE_PRIVATE_KEY
```
-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCUAawuCiHdnD+y
eFTg3gHqD3LTUT0YgIMe3hQB0ig95VG1J3AE67tFbtoA2bv5EWk4PsFLtERcuPqo
ezZLTGpjvlK6cacZzEaKPztURXrq6hXAedSCB+BOxDOZ+7nGI25Ko6Kg7mZyT2u8
0vvnaMRrRLL51dheotBd4d+jYqQpmy+zKTV/MfM/szVdvbOHn5HDvuQwpnU7kNAA
jf5Jb1XHXE1e1gGbWRquVONB9FSXMtYtB1GHx3oghZojjodj0spzevGdhU34u7Mf
Nwjl1d2Qh0XgZWmu7HddO/kiDezoygVkeAaL+G1JDd6JM9SpiLrQzb4AprmUVVX8
YDkrGS6xAgMBAAECgf90D9u1PrzPy3cnvLTSoUVfBj5E96+xRxWLXxrRUru7zdgE
9qghM7nm+MZ7ZELDTaP1N0Dc3L++9k+ZTwWEhqfnD5hQHE+tK0MlpfAgZVu+W1Iz
XVYHoaWEHtdYKM3FUoNqhGdDS6+KdD1IFSr0jHN6qqSuxcKmc4ZyGG4G8ZNKC/Y3
+lUnXkg4usZ3YlQAjKUwPMtXEC0OEKnjlTrfxIEKjecriIngVfu9FIPk1+9aPWQV
zVko48DTOgs6sqY12FD+AgeFMxssbWqld/95W8eegvs/lLGRRhNsllduAnk5Hnfg
0HCLbx8raB7fHj7oQlzErWKUPHrP8bry0lXWt5UCgYEAx8/1BZE2ixFPNhfdL+eE
ErGGU+dkzCTcFIbAXh9KzwH8k7EF+IRlOvsj37tKSSGPzFiP5wgvo8+7GMRHsZXO
g5xnL+s0WHFie7Nz6ROHjUXFFt8Hs4DHROwJmEOB6+CXqnoebHuwwED//QMPAkPZ
ZDbN7OWNVCItSB0bkyRgs1UCgYEAvaBU9WunUwaGbprLapW+N6yr/iy+7h5eYFsz
z2cJlVxprep3derMhWIiWArUWFw6epdUHRPaQm9r/M47MbzPAJeKUwkOziie63OP
S0B5/Cf0vsX9MBfe4JNrbKS22OJ1spcZwSNAIZTt8wWuE7g/u08Hl2ToObUzy7KR
wY7Ihe0CgYBmLqAkH7Xf+pMim6Oeuuvcz3JdeCkhCPyPdrXrrF8Ka/6p3M6r37ER
L5uR7+q2aXZrTyMQSCxsvm/043OyimTZA2P1qnfTfvCZSBVPrZAVnAeFgbsjfgjp
4zeo6WUIpouJP/hNDBhAyTzgO+8x/lavHCPFMUNMMkor5c7TObhGHQKBgQCiYb7/
Hr39ihPqeSICVtK6KGJsWXLyxAy7ZL48OBbr0WQp6yN7VaLoAb45OKTYObpWKmp8
L/jydSm7Jftovy9gaWSpcJM+FWjpZV7q6P7M4IZkK3WCDp7sHzGZqn9twJdbZKtI
SeBsIXWWa2HDPz9MLgPpMB7w8+uz3mmUn6m1jQKBgFgsfrFXvjDI5gtIt2+apH7l
eYcYEY7yw53w2LjP/eAP9NIyOWV/agYhbJbxpPHRJ1zkPK2XyzVUsQKEt9WIcCji
bFztMnh7DDBIDmMlxNEhyRsaIfI88KGTHwqvvN1D8WwuShyaDdg0Wj7bBWg5mcXI
oOea/cIrH5xRxS5YEHwh
-----END PRIVATE KEY-----
```

**⚠️ IMPORTANTE:** Copia el private_key COMPLETO, incluyendo las líneas `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`, y mantén los `\n` (no los reemplaces).

### 3. FIREBASE_CLIENT_EMAIL
```
firebase-adminsdk-fbsvc@consultancy-ee352.iam.gserviceaccount.com
```

---

## Pasos para Configurar en Supabase

### Paso 1: Ir a Edge Functions Secrets

1. Ve a **Supabase Dashboard**
2. **Project Settings** (icono de engranaje en la parte inferior izquierda)
3. **Edge Functions** (en el menú lateral)
4. Haz clic en la pestaña **"Secrets"**

### Paso 2: Agregar los 3 Secrets

Para cada secret, haz clic en **"Add new secret"** y completa:

#### Secret 1: FIREBASE_PROJECT_ID
- **Name:** `FIREBASE_PROJECT_ID`
- **Value:** `consultancy-ee352`
- Haz clic en **"Add secret"**

#### Secret 2: FIREBASE_PRIVATE_KEY
- **Name:** `FIREBASE_PRIVATE_KEY`
- **Value:** Pega el private_key completo (desde `-----BEGIN PRIVATE KEY-----` hasta `-----END PRIVATE KEY-----`)
- **⚠️ IMPORTANTE:** Mantén los `\n` en el texto (no los reemplaces por saltos de línea reales)
- Haz clic en **"Add secret"**

#### Secret 3: FIREBASE_CLIENT_EMAIL
- **Name:** `FIREBASE_CLIENT_EMAIL`
- **Value:** `firebase-adminsdk-fbsvc@consultancy-ee352.iam.gserviceaccount.com`
- Haz clic en **"Add secret"**

### Paso 3: Verificar

Después de agregar los 3 secrets, deberías ver:
- ✅ FIREBASE_PROJECT_ID
- ✅ FIREBASE_PRIVATE_KEY
- ✅ FIREBASE_CLIENT_EMAIL

---

## Siguiente Paso

Una vez configurados los secrets:

1. **Actualiza la Edge Function** con el código de `database/edge-function-index.ts`
2. **Despliega** la función
3. **Prueba** insertando un mensaje de prueba desde SQL Editor

---

## Nota de Seguridad

⚠️ **NUNCA** compartas este JSON ni los secrets públicamente. Estos valores dan acceso completo a tu proyecto de Firebase.

