# Planning Poker

Ferramenta de estimativa colaborativa em tempo real, sem backend e sem registro.  
Comunicação P2P via **PeerJS** (WebRTC) — apenas o servidor de sinalização do PeerJS é usado.

---

## Como usar

### 1. Abrir localmente

Basta abrir `index.html` diretamente no browser. Por usar WebRTC, **não é necessário servidor HTTP** — o `file://` funciona para testes locais.

Para uma experiência completa (share por link), suba os arquivos em qualquer host estático:

- GitHub Pages
- Netlify / Vercel (arrastar a pasta)
- Qualquer nginx/apache servindo arquivos estáticos

### 2. Criar uma sala (host)

1. Digite seu nome e clique em **Criar Sala**
2. O link da sala aparece no topo — clique em **Copiar link** e mande pro time
3. Digite a tarefa no campo "Estimando"
4. Quando todos votarem, clique em **Revelar Cartas**
5. Para a próxima história, clique em **Nova Rodada**

### 3. Entrar numa sala (participante)

- Via link direto: acesse o link que o host enviou — o código já vem preenchido
- Via código: cole o código da sala no campo "Código da sala"

---

## Escala de cartas

Fibonacci estendida: `0 · 1 · 2 · 3 · 5 · 8 · 13 · 21 · 34 · 55 · 89 · ? · ☕`

---

## Atalhos de teclado (host)

| Tecla | Ação |
|-------|------|
| `r`   | Revelar cartas |
| `n`   | Nova rodada |

---

## Estrutura do projeto

```
planning-poker/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── state.js   — estado compartilhado (single source of truth)
│   ├── peer.js    — camada de rede PeerJS
│   ├── ui.js      — renderização e interação DOM
│   └── main.js    — orquestração e bindings de eventos
└── README.md
```

---

## Arquitetura P2P

```
Host  ←──────────────── PeerJS signaling ────────────────→  Guest A
  │                                                              │
  ├─ broadcastState()  ──────────────────────────────────────→  │
  │                                                              │
  │  ←─ { type: 'join' | 'vote' | 'issue' }  ─────────────────  │
  │
  └── Guest B, C, D... (mesmo padrão)
```

- O host mantém conexões com todos os guests via `DataConnection`
- Guests se comunicam **apenas** com o host — não entre si
- Sem persistência: ao fechar o browser, a sessão é encerrada

---

## Requisitos

- Browser moderno com suporte a WebRTC (Chrome, Firefox, Safari, Edge)
- Conexão com internet (para o servidor de sinalização PeerJS e STUN do Google)
- Sem instalação, sem backend, sem banco de dados
