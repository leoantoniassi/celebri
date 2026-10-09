import { Link } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { useTheme } from '../../contexts/ThemeContext';

// Contato do encarregado (DPO). Defina VITE_DPO_EMAIL no build; sem ela, fica o placeholder.
const EMAIL_ENCARREGADO = import.meta.env.VITE_DPO_EMAIL || '[E-MAIL DO ENCARREGADO]';

const DADOS_COLETADOS = [
  ['Clientes', 'nome, CPF/RG, e-mail e telefones, para elaborar orçamentos, contratos e executar o evento contratado.'],
  ['Funcionários', 'nome, e-mail, telefones e função, para escalas de trabalho e acesso ao aplicativo da equipe.'],
  ['Fornecedores', 'nome, CNPJ, e-mail e telefone, para contratação e pagamento.'],
  ['Convidados', 'nome, telefone (opcional) e quantidade de pessoas, apenas para a lista e a portaria do evento.'],
  ['Usuários do sistema', 'nome, e-mail, papel de acesso e registros de acesso (data, IP), para segurança e controle de permissões.'],
];

const DIREITOS = [
  'confirmação de que tratamos seus dados e acesso a eles;',
  'correção de dados incompletos ou desatualizados;',
  'anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;',
  'portabilidade e informação sobre com quem compartilhamos seus dados;',
  'revogação do consentimento, quando essa for a base legal.',
];

export default function PrivacidadePage() {
  const nomeFantasia = useTheme()?.config?.nomeFantasia || '[NOME DA EMPRESA]';

  return (
    <main className="min-h-screen bg-surface px-6 py-12">
      <article className="mx-auto max-w-3xl space-y-8 text-on-surface">
        <header className="flex items-center gap-3">
          <BrandLogo tamanho="lg" />
          <div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight">Política de Privacidade e Termos de Uso</h1>
            <p className="text-sm text-on-surface-variant">{nomeFantasia} — Lei Geral de Proteção de Dados (Lei 13.709/2018)</p>
          </div>
        </header>

        <p className="rounded-2xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Resumo da política. O texto completo, revisado juridicamente, é mantido pela empresa e disponibilizado no
          contato do encarregado abaixo.
        </p>

        <section aria-labelledby="privacidade-dados" className="space-y-3">
          <h2 id="privacidade-dados" className="font-headline text-xl font-bold">Quais dados tratamos</h2>
          <ul className="list-disc space-y-2 pl-6">
            {DADOS_COLETADOS.map(([quem, o_que]) => (
              <li key={quem}><strong>{quem}:</strong> {o_que}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="privacidade-uso" className="space-y-3">
          <h2 id="privacidade-uso" className="font-headline text-xl font-bold">Para que usamos e por quanto tempo</h2>
          <p>
            Usamos os dados para executar contratos e eventos, cumprir obrigações legais e fiscais, organizar a equipe e
            manter o sistema seguro. Não vendemos dados pessoais. Compartilhamos apenas o necessário com o serviço de
            e-mail (SMTP) e, quando você usa o botão de WhatsApp, com o próprio WhatsApp. Guardamos os dados pelo tempo
            necessário a essas finalidades e pelos prazos legais; depois disso, eles são anonimizados.
          </p>
        </section>

        <section aria-labelledby="privacidade-direitos" className="space-y-3">
          <h2 id="privacidade-direitos" className="font-headline text-xl font-bold">Seus direitos (art. 18 da LGPD)</h2>
          <p>Você pode solicitar, a qualquer momento:</p>
          <ul className="list-disc space-y-1 pl-6">
            {DIREITOS.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <p>
            Para exercer seus direitos, escreva ao encarregado de dados: <strong>{EMAIL_ENCARREGADO}</strong>.
          </p>
        </section>

        <section id="termos" aria-labelledby="privacidade-termos" className="space-y-3">
          <h2 id="privacidade-termos" className="font-headline text-xl font-bold">Termos de Uso</h2>
          <p>
            O acesso ao sistema é pessoal e intransferível. Você se compromete a manter sua senha em sigilo, a usar os
            dados de clientes, convidados e colegas somente para as finalidades do trabalho e a comunicar qualquer
            suspeita de acesso indevido ao responsável. Acessos e ações sensíveis ficam registrados para segurança e
            auditoria. Ao ativar sua conta você declara ter lido esta política e estes termos.
          </p>
        </section>

        <footer className="pt-4">
          <Link to="/login" className="text-sm font-semibold text-secondary hover:text-primary transition-colors">
            Voltar ao login
          </Link>
        </footer>
      </article>
    </main>
  );
}
