#!/usr/bin/env python3
"""Configure os segredos existentes de Web Push sem exibi-los no terminal.
Uso: python3 scripts/configure-push.py --subject mailto:voce@exemplo.com
Requer CLI autenticada, projeto vinculado e migration de push aplicada.
"""
import argparse
import json
import secrets
import subprocess
import tempfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--subject', required=True, help='mailto: de contato para VAPID')
args = parser.parse_args()
if not args.subject.startswith('mailto:') or '\n' in args.subject:
    raise SystemExit('Informe um contato mailto: válido.')
root = Path(__file__).resolve().parent.parent
keys = json.loads((root / '.vapid.local.json').read_text())
ref = (root / 'supabase/.temp/project-ref').read_text().strip()
if not ref.isalnum():
    raise SystemExit('Project ref inválido.')
secret = secrets.token_urlsafe(48)

def run(command):
    result = subprocess.run(command, cwd=root, capture_output=True, text=True)
    if result.returncode:
        # A mensagem remota pode reproduzir SQL/segredos. Não imprimir.
        raise SystemExit('Configuração não concluída. Confira a autenticação da CLI e a migration de push. Nenhum segredo foi impresso.')

with tempfile.TemporaryDirectory(prefix='despensa-push-') as folder:
    env = Path(folder) / 'secrets.env'
    env.write_text(f"VAPID_PUBLIC_KEY={keys['publicKey']}\nVAPID_PRIVATE_KEY={keys['privateKey']}\nVAPID_SUBJECT={args.subject}\nPUSH_DISPATCH_SECRET={secret}\n")
    env.chmod(0o600)
    run(['npx', 'supabase', 'secrets', 'set', '--env-file', str(env)])
    sql = Path(folder) / 'vault.sql'
    # URL e token são gerados aqui; escapar ainda assim para manter a escrita segura.
    literal = lambda value: "'" + value.replace("'", "''") + "'"
    statements = []
    for name, value in [('despensa_push_url', f'https://{ref}.supabase.co/functions/v1/notificar'), ('despensa_push_secret', secret)]:
        statements.append(f"""do $$ declare existing uuid; begin
          select id into existing from vault.secrets where name={literal(name)};
          if existing is null then perform vault.create_secret({literal(value)}, {literal(name)});
          else perform vault.update_secret(existing, {literal(value)}); end if;
        end $$;""")
    sql.write_text('begin;\n' + '\n'.join(statements) + '\ncommit;')
    sql.chmod(0o600)
    run(['npx', 'supabase', 'db', 'query', '--linked', '--file', str(sql)])
print('Chaves VAPID e autenticação do worker configuradas. Arquivos temporários removidos.')
