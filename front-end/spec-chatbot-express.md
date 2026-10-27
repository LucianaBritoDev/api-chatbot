# Spec — Frontend do Chatbot com IA

## 1. Objetivo

Criar a interface web do projeto `chatbot-api` e conectá-la à integração com o modelo de IA que já existe no backend.

**Importante:** a integração com o modelo já foi implementada. Não recriar, substituir ou migrar o cliente do modelo. Antes de implementar a interface, inspecionar o `index.js` e o `package.json` existentes para entender como a chamada atual é executada e como o backend pode ser chamado pelo frontend.

O foco deste trabalho é desenvolver o frontend e fazer a comunicação entre a interface e a chamada ao modelo existente.

## 2. Estrutura atual do projeto

Manter a estrutura existente e utilizar **Express.js** para disponibilizar a rota HTTP que conectará o frontend à chamada do modelo já implementada:

```text
chatbot-api/
├── front-end/
│   ├── design-system.md
│   ├── spec.md
│   ├── index.html
│   ├── style.css
│   └── script.js
├── node_modules/
├── .env
├── .gitignore
├── index.js
├── package-lock.json
└── package.json
```

Criar apenas os arquivos de frontend que ainda não existirem. Não mover nem renomear arquivos existentes.

## 3. Tecnologias e restrições

- HTML5 semântico.
- CSS3.
- JavaScript Vanilla (ES6+).
- Usar `fetch()` para enviar mensagens ao backend.
- Usar `localStorage` para manter o histórico no navegador.
- Não utilizar React, Vue, Angular, Tailwind, jQuery ou bibliotecas visuais externas.
- Seguir as orientações de `front-end/design-system.md`.
- Não colocar a chave da API em arquivos do frontend.
- Não recriar a integração com o modelo nem adicionar outro provedor de IA.

## 4. Antes de implementar

1. Inspecionar `index.js` para identificar como a chamada ao modelo é realizada.
2. Identificar se já existe uma rota HTTP que possa ser chamada pelo frontend.
3. Instalar Express caso ainda não esteja instalado: `npm install express`.
4. Configurar o Express em `index.js` para interpretar requisições JSON e servir os arquivos estáticos da pasta `front-end/`.
5. Criar ou adaptar uma rota `POST /api/chat` para receber a mensagem do frontend e invocar a função de integração com o modelo já existente.
6. Se já existir uma rota equivalente, reutilizá-la sem duplicar a lógica.
7. Manter o código existente de integração com o modelo. Não alterar o modelo, o provedor, as credenciais ou a lógica da chamada, salvo o necessário para expô-la por HTTP.

## 5. Interface do chat

A página deverá conter:

- Cabeçalho com o nome do chatbot.
- Área principal para exibição da conversa.
- Mensagens do usuário e do assistente com estilos distintos.
- Horário de cada mensagem no formato `HH:MM`.
- Campo de texto para escrever uma mensagem.
- Botão para enviar a mensagem.
- Botão para anexar uma imagem, se a chamada ao modelo existente aceitar imagens.
- Pré-visualização da imagem selecionada, quando aplicável.
- Indicador de carregamento enquanto aguarda a resposta do modelo.
- Botão para limpar o histórico da conversa.
- Área para apresentar erros de envio ou processamento.

A interface deverá ser limpa, intuitiva, responsiva e consistente com o `design-system.md`.

## 6. Comportamento das mensagens

### Envio

O usuário deverá conseguir enviar uma mensagem clicando no botão ou pressionando Enter.

- `Enter`: enviar a mensagem.
- `Shift + Enter`: inserir uma quebra de linha.
- Não enviar mensagens vazias ou compostas apenas por espaços.
- Limpar o campo após iniciar o envio e manter o foco nele quando apropriado.
- Exibir a mensagem do usuário na conversa antes da resposta do modelo.
- Impedir envios duplicados acidentais enquanto uma solicitação estiver em andamento.

### Resposta do assistente

- Enviar o conteúdo ao backend pela rota existente.
- Aguardar a resposta real do modelo.
- Exibir a resposta retornada na conversa sem recarregar a página.
- Não criar respostas simuladas nem utilizar `setTimeout` para fingir uma resposta de IA.
- Remover o indicador de carregamento tanto em caso de sucesso quanto em caso de erro.

### Rolagem

Quando uma nova mensagem for adicionada, manter a conversa posicionada perto da mensagem mais recente, sem impedir que o usuário consulte mensagens anteriores.

## 7. Comunicação com o backend usando Express

O Express deverá conectar a interface à integração com o modelo já existente. O servidor deverá:

- Interpretar requisições JSON com `express.json()`.
- Servir os arquivos estáticos de `front-end/` com `express.static()`.
- Disponibilizar a rota `POST /api/chat`.
- Validar a mensagem recebida antes de chamar o modelo.
- Invocar a função de integração já existente, sem duplicar a chamada ao provedor.
- Retornar a resposta do modelo em JSON com um status HTTP apropriado.
- Tratar erros sem enviar segredos ou stack traces ao navegador.

O frontend deverá usar `fetch('/api/chat', ...)` para enviar mensagens ao backend servido pela mesma origem. A rota e o formato definitivos devem respeitar a implementação atual do modelo. Se já existir uma rota equivalente, reutilizá-la ou adaptá-la.

Formato ilustrativo de requisição:

```json
{
  "message": "Explique o que é uma API."
}
```

Formato ilustrativo de resposta:

```json
{
  "reply": "Uma API é..."
}
```

Esses exemplos são referências de contrato, não uma exigência para duplicar ou reescrever a integração existente. Adaptar o frontend ao formato real ou definir um contrato simples no backend, mantendo a chamada ao modelo atual.

Se a integração existente aceitar imagens, conectar também o seletor de arquivos à chamada atual. Se ela não aceitar imagens, não simular esse recurso; deixar a funcionalidade fora da primeira versão ou indicar claramente que ainda não está disponível.

## 8. Histórico local

Usar `localStorage` para salvar e restaurar o histórico quando a página for recarregada.

Cada mensagem deverá conter, no mínimo:

```json
{
  "id": "identificador-unico",
  "sender": "user",
  "text": "Olá!",
  "timestamp": "2026-10-21T10:30:00-03:00"
}
```

Valores de `sender`:

- `user`: mensagem enviada pelo usuário.
- `assistant`: resposta retornada pelo modelo.

O botão de limpar conversa deverá remover as mensagens da interface e do `localStorage`. Não salvar chaves de API no histórico. O histórico local não implica que o modelo tenha memória da conversa; enviar mensagens anteriores ao modelo somente se o backend já oferecer suporte a contexto ou se isso for implementado explicitamente.

## 9. Estados de carregamento e erros

Exibir um indicador como “Gerando resposta…” enquanto a solicitação estiver em andamento.

Tratar, pelo menos:

- Falha de conexão com o backend.
- Resposta HTTP de erro.
- Resposta vazia ou em formato inesperado.
- Modelo indisponível ou limite de uso atingido, quando informado pelo backend.
- Arquivo inválido, caso o envio de imagens seja suportado.

As mensagens de erro devem ser compreensíveis. Não exibir chaves, variáveis de ambiente ou detalhes internos sensíveis.

## 10. Acessibilidade e responsividade

- Campo de texto com `aria-label="Digite sua mensagem"`.
- Botões com nomes acessíveis.
- Navegação por teclado e foco visível.
- Contraste adequado entre texto e fundo.
- Layout funcional em desktop, tablet e celular.
- Mensagens longas devem quebrar linha sem estourar o layout.
- Estados de carregamento e erro devem ser identificáveis sem depender apenas de cores.

## 11. Critérios de aceite

A implementação será considerada concluída quando:

1. A interface for exibida ao abrir a aplicação pelo servidor.
2. O usuário conseguir escrever e enviar uma mensagem.
3. O frontend chamar a rota do backend conectada à integração de modelo já existente.
4. A resposta real do modelo aparecer na conversa sem recarregar a página.
5. A interface exibir carregamento durante a solicitação.
6. Erros de comunicação forem tratados sem quebrar a página.
7. O histórico for restaurado após atualizar a página e puder ser apagado.
8. A interface funcionar em telas pequenas e grandes.
9. A chave de API permanecer somente no backend.
10. A implementação reutilizar a chamada ao modelo existente, sem criar uma segunda integração.
11. O visual seguir `front-end/design-system.md`.

## 12. Ordem recomendada de trabalho

1. Ler `index.js`, `package.json` e `front-end/design-system.md`.
2. Instalar Express, caso ainda não esteja instalado.
3. Configurar o Express para servir a pasta `front-end/` e interpretar JSON.
4. Criar ou adaptar `POST /api/chat` para chamar a integração de IA já existente.
5. Criar `front-end/index.html`.
6. Criar `front-end/style.css` conforme o design system.
7. Criar `front-end/script.js` para mensagens, eventos, histórico e `fetch('/api/chat')`.
8. Testar o envio de uma mensagem e a exibição da resposta real.
9. Testar erros, histórico, responsividade e acessibilidade.

**Prioridade:** criar o frontend e conectá-lo à chamada de IA já implementada. Não refatorar desnecessariamente o backend nem substituir o provedor ou o modelo atual.**