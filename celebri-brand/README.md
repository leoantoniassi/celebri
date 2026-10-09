# Celebri — Marca

Conjunto de logos para o projeto **Celebri**, no estilo **flat**, com as cores
`#1CEAFF` (ciano) e `#FF45FF` (magenta).

> Abra **`preview.html`** no navegador para ver todas as opções lado a lado,
> em fundo claro e escuro, e testar os tamanhos pequenos.

## Arquivos

| Arquivo | O que é | Quando usar |
| :--- | :--- | :--- |
| `logo-badge.svg` | Badge navy + "C" em gradiente + ponto de confete | **Logo principal** |
| `logo-spark.svg` | "C" em gradiente + estrela, sem fundo | Cabeçalhos sobre fundo escuro |
| `logo-spark-solid.svg` | "C" ciano + estrela magenta, sem gradiente | Versão de cor sólida |
| `logo-tile.svg` | Tile em gradiente + "C" vazado | Ícone de app |
| `logo-tile-star.svg` | Tile em gradiente + "C" e estrela vazados | Ícone de app (variação) |
| `logo-confetti.svg` | Badge navy + "C" + confetes | Uso festivo / marketing |
| `logo-badge-star.svg` | Badge + "C" + estrela | Variação do principal |
| `logo-duo.svg` | Dois traços sobrepostos formando o "C" | Alternativa moderna |
| `logo-mono-dark.svg` | Uma cor (navy), sem fundo | Fundos claros |
| `logo-mono-light.svg` | Uma cor (branco), sem fundo | Fundos escuros |
| `favicon.svg` | Badge simplificado | Favicon / 16–32px |

## Cores

| Token | HEX | Uso |
| :--- | :--- | :--- |
| Ciano | `#1CEAFF` | Destaque principal / início do gradiente |
| Magenta | `#FF45FF` | Destaque secundário / fim do gradiente |
| Navy | `#0E1A3A` | Fundo do badge e traço vazado |
| Azul-marinho | `#16254F` | Fundo institucional |

Gradiente padrão: `#1CEAFF → #FF45FF` (diagonal, 45°).

## Especificação técnica

- Formato **SVG vetorial**, `viewBox="0 0 64 64"` (o `preview.html` e o
  `favicon.svg` usam `width`/`height` quando necessário).
- Cantos do badge: `rx 16`.
- Traço do "C": `stroke-linecap="round"`.
- Escala sem perda de qualidade em qualquer tamanho.

## Como usar

```html
<img src="logo-badge.svg" alt="Celebri" width="48" height="48" />
```

Ou a versão monocromática quando o fundo for claro/escuro e não houver cor.

## Próximos passos (quando aprovada)

Aplicar a versão escolhida em:
- `celebri-landing/assets/logo.svg`
- `celebri/frontend/public/favicon.svg`
- `celebri-staff/CelebriStaff/Resources/AppIcon/`
