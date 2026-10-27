# Celebri — Marca

Conjunto de logos para o projeto **Celebri**, no estilo **flat**, com as cores
`#1CEAFF` (ciano) e `#FF45FF` (magenta).

> Abra **`preview.html`** no navegador para ver todas as opções lado a lado,
> em fundo claro e escuro, e testar os tamanhos pequenos.

## Logo oficial

A marca oficial do Celebri é o **`logo-confetti.svg`** — badge navy com o "C" em
gradiente ciano→magenta e os confetes. É esse arquivo que está aplicado no
painel web, na landing page e no aplicativo Staff.

## Arquivos

| Arquivo | O que é | Quando usar |
| :--- | :--- | :--- |
| `logo-confetti.svg` | Badge navy + "C" + confetes | **Logo principal / marca oficial** |
| `logo-badge.svg` | Badge navy + "C" em gradiente + ponto de confete | Alternativa |
| `logo-spark.svg` | "C" em gradiente + estrela, sem fundo | Cabeçalhos sobre fundo escuro |
| `logo-spark-solid.svg` | "C" ciano + estrela magenta, sem gradiente | Versão de cor sólida |
| `logo-tile.svg` | Tile em gradiente + "C" vazado | Ícone de app |
| `logo-tile-star.svg` | Tile em gradiente + "C" e estrela vazados | Ícone de app (variação) |
| `logo-badge-star.svg` | Badge + "C" + estrela | Variação do principal |
| `logo-duo.svg` | Dois traços sobrepostos formando o "C" | Alternativa moderna |
| `logo-mono-dark.svg` | Uma cor (navy), sem fundo | Fundos claros |
| `logo-mono-light.svg` | Uma cor (branco), sem fundo | Fundos escuros |
| `favicon.svg` | Badge simplificado | Alternativa para 16–32px; nos produtos o favicon usa a logo confete |

## Cores

| Token | HEX | Uso |
| :--- | :--- | :--- |
| Ciano | `#1CEAFF` | Destaque principal / início do gradiente |
| Magenta | `#FF45FF` | Destaque secundário / fim do gradiente |
| Navy | `#0E1A3A` | Fundo do badge e traço vazado |
| Azul-marinho | `#16254F` | Fundo institucional |

Gradiente padrão: `#1CEAFF → #FF45FF` (diagonal, 45°).

## Tipografia

A tipografia oficial do Celebri é a do painel web:

| Uso | Fonte | Pesos |
| :--- | :--- | :--- |
| Títulos / display | **Plus Jakarta Sans** | 600, 700, 800 |
| Corpo / interface | **Inter** | 400, 500, 600 |

> A landing page e o aplicativo Staff seguem a mesma dupla de fontes.

## Especificação técnica

- Formato **SVG vetorial**, `viewBox="0 0 64 64"` (o `preview.html` e o
  `favicon.svg` usam `width`/`height` quando necessário).
- Cantos do badge: `rx 16`.
- Traço do "C": `stroke-linecap="round"`.
- Escala sem perda de qualidade em qualquer tamanho.

## Como usar

```html
<img src="logo-confetti.svg" alt="Celebri" width="48" height="48" />
```

Ou a versão monocromática quando o fundo for claro/escuro e não houver cor.

## Aplicação atual

A logo oficial já está aplicada em:

- `celebri-landingpage/assets/logo.svg`
- `celebri/frontend/src/assets/logoCelebri.svg`
- `celebri/frontend/public/favicon.svg`
- `celebri-staff/CelebriStaff/Resources/Images/logo_celebri.svg`
- `celebri-staff/CelebriStaff/Resources/AppIcon/appicon.svg`
- `celebri-staff/CelebriStaff/Resources/Splash/splash.svg`

A tipografia oficial já está aplicada em:

- **Landing page:** Plus Jakarta Sans (títulos) + Inter (corpo), via Google Fonts.
- **Painel web:** Plus Jakarta Sans + Inter (padrão original).
- **Staff (MAUI):** Plus Jakarta Sans (títulos) + Inter (corpo), empacotadas em
  `Resources/Fonts/`; o antigo Open Sans foi removido.

Os ícones seguem o padrão de cada plataforma: **Material Symbols Outlined** na
landing e no painel web, **Material Icons** no aplicativo Staff.
