import { Anchor, Settings2 } from 'lucide-react';

export default function ConfigScreen() {
  return (
    <main className="auth-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900/80 p-7 shadow-2xl shadow-black/40">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><Settings2 size={22} /></span>
          <div>
            <strong className="block text-base font-extrabold text-white">Configuração pendente</strong>
            <small className="flex items-center gap-1 text-xs text-slate-400"><Anchor size={12} /> Porto do Pecém · Gestão operacional</small>
          </div>
        </div>
        <p className="text-sm text-slate-300">O app não encontrou as variáveis do Supabase. Crie o arquivo <code className="code">.env</code> na raiz do projeto (ou configure-as no Cloudflare Pages) com:</p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-cyan-200">{`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable`}</pre>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-400">
          <li>Pegue os valores em Supabase → Settings → API.</li>
          <li>Use a chave pública <b>anon/publishable</b>, nunca a <b>service_role</b>.</li>
          <li>Depois de salvar, reinicie o <code className="code">npm run dev</code> (ou refaça o deploy).</li>
        </ul>
      </section>
    </main>
  );
}
