# Plano de Implementação — Autenticação Firebase no Android e Restrição de Login Google

> **Para executores agenticos:** SUB-SKILL OBRIGATÓRIA: Utilize `superpowers:executing-plans` para implementar este plano tarefa por tarefa. As etapas utilizam a sintaxe de caixas de seleção (`- [ ]`) para rastreamento.

**Objetivo:** Integrar a autenticação nativa do Firebase/Google no Android (via Capacitor) eliminando bloqueios de WebView e restringir o login via Google para permitir acesso exclusivamente a usuários previamente cadastrados no sistema.

**Arquitetura:**
1. No Backend Express, refatorar `authService.loginComGoogle` para eliminar o auto-provisionamento e validar a existência prévia do usuário por e-mail, devolvendo erro 404 semântico e claro quando inexistente.
2. No Frontend React / Capacitor Android, integrar a biblioteca oficial `@capacitor-firebase/authentication` com verificação de plataforma via `Capacitor.isNativePlatform()`. Em navegadores web, mantém-se o fluxo com `signInWithPopup`; no Android nativo, invoca-se `FirebaseAuthentication.signInWithGoogle()`, contornando a restrição de WebView do Google (`disallowed_useragent`) e apresentando o seletor nativo do Android.
3. No ecossistema Android, configurar `frontend/capacitor.config.json`, `variables.gradle` e gerar a base de configuração `google-services.json` com o ID de aplicação `com.arandue.app`.

**Tech Stack:** Node.js, Express, Jest, Supertest, React 19, Vitest, Testing Library, Capacitor 8, `@capacitor-firebase/authentication`, Android Gradle.

## Restrições Globais
- **Paridade REST ↔ MCP**: As rotas de autenticação residem no gateway REST do backend (`/api/auth/google`). Não há parâmetros de tenant vazados nas requisições.
- **Isolamento de Tema no Login**: A tela de login permanece estritamente isolada e com tema light, sem quebras de layout.
- **Preservação de Integridade**: Nenhum teste regressivo existente pode falhar.

## Foco de Revisão
1. Tentativa de login Google com e-mail inexistente: Devolver 404 com mensagem orientando cadastro prévio.
2. Tentativa de login Google com e-mail existente: Devolver 200 com token JWT e dados do usuário.
3. Login Google no Android nativo: Utilizar `FirebaseAuthentication.signInWithGoogle()` sem disparar popups em WebView.
4. Login Google na Web (browser): Utilizar `signInWithPopup(auth, googleProvider)` com fallback seguro.
5. Cancelamento pelo usuário no seletor nativo ou popup: Capturar o evento sem quebrar a UI nem exibir mensagens de erro genéricas e ruidosas.

---

### Tarefa 1: Backend — Restrição de Login Google para Usuários Pré-cadastrados (TDD)

**Arquivos:**
- Modificar: `backend/src/services/authService.js`
- Testes: `backend/tests/auth.test.js`

- [ ] **Etapa 1.1: Atualizar testes em `backend/tests/auth.test.js` (Red)**
  - Alterar o teste do cenário de usuário novo em `POST /api/auth/google` para esperar status 404 e mensagem `"Nenhum cadastro encontrado para este e-mail. Por favor, crie sua conta antes de acessar via Google."`.
  - Garantir que o teste com usuário existente continue validando status 200 e emissão do JWT.
  - Executar os testes para confirmar a falha esperada (Red).

- [ ] **Etapa 1.2: Implementar validação em `backend/src/services/authService.js` (Green)**
  - Em `loginComGoogle({ email, nome })`, remover a criação automática (`usuarioRepository.criar`) quando `!usuario`.
  - Lançar erro com `statusCode = 404` e mensagem explicativa.
  - Reexecutar os testes do backend para verificar a aprovação (Green).

---

### Tarefa 2: Android & Capacitor — Suporte Nativo com `@capacitor-firebase/authentication`

**Arquivos:**
- Modificar: `frontend/package.json`
- Modificar: `frontend/capacitor.config.json`
- Modificar: `frontend/android/variables.gradle`
- Criar: `frontend/android/app/google-services.json`
- Modificar: `frontend/src/services/firebase.js`
- Modificar: `frontend/src/pages/Login.jsx`
- Testes: `frontend/src/pages/Login.test.jsx`

- [ ] **Etapa 2.1: Instalar dependência `@capacitor-firebase/authentication` no frontend**
  - Adicionar `@capacitor-firebase/authentication` ao `frontend/package.json`.
  - Configurar `frontend/capacitor.config.json` incluindo a chave de plugins para `FirebaseAuthentication`.

- [ ] **Etapa 2.2: Configurar variáveis Gradle e arquivo `google-services.json`**
  - Em `frontend/android/variables.gradle`, habilitar `rgcfaIncludeGoogle = true` e `androidxCredentialsVersion = '1.3.0'`.
  - Criar `frontend/android/app/google-services.json` contendo a estrutura oficial para o app `com.arandue.app` com os identificadores do projeto Firebase `projeto-final-arandue`.

- [ ] **Etapa 2.3: Atualizar `frontend/src/pages/Login.jsx` com suporte híbrido (Nativo vs Web)**
  - Importar `Capacitor` de `@capacitor/core` e `FirebaseAuthentication` de `@capacitor-firebase/authentication`.
  - Em `handleGoogleLogin`:
    - Se `Capacitor.isNativePlatform()`, invocar `FirebaseAuthentication.signInWithGoogle()`.
    - Se web, invocar `signInWithPopup(auth, googleProvider)`.
    - Tratar cancelamento de login nativo e exibir a mensagem de erro do backend caso o e-mail não possua cadastro prévio.

- [ ] **Etapa 2.4: Atualizar suíte de testes em `frontend/src/pages/Login.test.jsx`**
  - Adicionar mocks para `@capacitor-firebase/authentication` e `@capacitor/core`.
  - Cobrir cenários de login Google na Web e login Google no ambiente nativo.
  - Cobrir cenário onde o backend retorna 404 (usuário inexistente) e a UI exibe o aviso solicitando cadastro.
  - Executar `npm run test:frontend`.

---

### Tarefa 3: Sincronização Capacitor & Validação Global

- [ ] **Etapa 3.1: Executar `npx cap sync android`**
  - Sincronizar os assets e plugins nativos para a pasta `frontend/android`.
  - Verificar se o build gradle do Android reconhece o plugin sem erros.

- [ ] **Etapa 3.2: Executar testes de ponta a ponta e verificação de regressão**
  - Executar `npm run test:backend` e `npm run test:frontend`.
  - Garantir que todos os testes passem com 100% de sucesso.
